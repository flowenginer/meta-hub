// ============================================================================
// Edge Function: delivery-worker — Process deliveries, retries, test webhook
// Routes: /process, /resend, /test, /health
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const token = authHeader.replace("Bearer ", "");
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error) throw new Error("Auth error: " + error.message);
  if (!user) throw new Error("User not found");
  return user;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return json({ error: message }, status);
}

// ---------------------------------------------------------------------------
// Build auth headers for destination
// ---------------------------------------------------------------------------
function buildAuthHeaders(
  authType: string,
  authConfig: Record<string, string>,
): Record<string, string> {
  switch (authType) {
    case "bearer":
      return authConfig.token ? { Authorization: `Bearer ${authConfig.token}` } : {};
    case "basic": {
      const encoded = btoa(`${authConfig.username || ""}:${authConfig.password || ""}`);
      return { Authorization: `Basic ${encoded}` };
    }
    case "api_key":
      return authConfig.header_name && authConfig.api_key
        ? { [authConfig.header_name]: authConfig.api_key }
        : {};
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Deliver a single event to its destination
// ---------------------------------------------------------------------------
async function deliverEvent(
  admin: ReturnType<typeof createClient>,
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  // Get event with destination info
  const { data: event, error: fetchError } = await admin
    .from("delivery_events")
    .select(`
      *,
      destination:destinations(id, url, method, headers, auth_type, auth_config, timeout_ms, is_active)
    `)
    .eq("id", eventId)
    .single();

  if (fetchError || !event) {
    return { success: false, error: "Event not found" };
  }

  const dest = event.destination as unknown as {
    id: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    auth_type: string;
    auth_config: Record<string, string>;
    timeout_ms: number;
    is_active: boolean;
  };

  if (!dest || !dest.is_active) {
    await admin
      .from("delivery_events")
      .update({ status: "cancelled", error_message: "Destination inactive" })
      .eq("id", eventId);
    return { success: false, error: "Destination inactive" };
  }

  const attemptNumber = (event.attempts_count || 0) + 1;

  // Update to processing
  await admin
    .from("delivery_events")
    .update({ status: "processing", attempts_count: attemptNumber })
    .eq("id", eventId);

  const startTime = Date.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "MetaHub-Webhook/1.0",
    "X-MetaHub-Event-Id": eventId,
    "X-MetaHub-Attempt": String(attemptNumber),
    ...(dest.headers || {}),
    ...buildAuthHeaders(dest.auth_type, dest.auth_config || {}),
  };

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), dest.timeout_ms || 10000);

    const res = await fetch(dest.url, {
      method: dest.method || "POST",
      headers,
      body: JSON.stringify(event.payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    statusCode = res.status;
    responseBody = await res.text().catch(() => null);

    if (res.ok) {
      success = true;
    } else {
      errorMessage = `HTTP ${statusCode}: ${responseBody?.slice(0, 500) || "No response body"}`;
    }
  } catch (err) {
    errorMessage = (err as Error).message;
    if (errorMessage.includes("abort")) {
      errorMessage = `Timeout after ${dest.timeout_ms || 10000}ms`;
    }
  }

  const durationMs = Date.now() - startTime;

  // Record attempt
  await admin.from("delivery_attempts").insert({
    event_id: eventId,
    destination_id: dest.id,
    attempt_number: attemptNumber,
    request_url: dest.url,
    request_method: dest.method || "POST",
    status_code: statusCode,
    response_body: responseBody?.slice(0, 2000),
    error_message: errorMessage,
    duration_ms: durationMs,
  });

  // Update event status
  if (success) {
    await admin
      .from("delivery_events")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        error_message: null,
        next_retry_at: null,
      })
      .eq("id", eventId);
  } else if (attemptNumber >= (event.max_attempts || 5)) {
    // Move to DLQ after max attempts
    await admin
      .from("delivery_events")
      .update({
        status: "dlq",
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        next_retry_at: null,
      })
      .eq("id", eventId);
  } else {
    // Schedule retry with exponential backoff
    const backoffMs = Math.min(60000 * Math.pow(2, attemptNumber - 1), 3600000); // max 1h
    await admin
      .from("delivery_events")
      .update({
        status: "failed",
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
      })
      .eq("id", eventId);
  }

  return { success, error: errorMessage || undefined };
}

// ---------------------------------------------------------------------------
// Route: POST /process — Process pending/failed events ready for retry
// ---------------------------------------------------------------------------
async function handleProcess(_req: Request): Promise<Response> {
  const admin = adminClient();

  // Find events ready for retry (includes events with next_retry_at <= now OR NULL)
  const now = new Date().toISOString();
  const { data: events, error } = await admin
    .from("delivery_events")
    .select("id")
    .in("status", ["pending", "failed"])
    .or(`next_retry_at.lte.${now},next_retry_at.is.null`)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return errorResponse(error.message, 500);
  if (!events || events.length === 0) return json({ processed: 0 });

  let delivered = 0;
  let failed = 0;

  for (const event of events) {
    const result = await deliverEvent(admin, event.id);
    if (result.success) delivered++;
    else failed++;
  }

  return json({ processed: events.length, delivered, failed });
}

// ---------------------------------------------------------------------------
// Route: POST /resend — Resend a specific event (from DLQ or failed)
// ---------------------------------------------------------------------------
async function handleResend(req: Request): Promise<Response> {
  const user = await getUser(req);
  const { event_id } = await req.json();

  if (!event_id) return errorResponse("event_id is required");

  const admin = adminClient();

  // Get event and verify access
  const { data: event, error } = await admin
    .from("delivery_events")
    .select("workspace_id, status")
    .eq("id", event_id)
    .single();

  if (error || !event) return errorResponse("Event not found", 404);

  // Verify user belongs to workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", event.workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return errorResponse("Not a member of this workspace", 403);

  if (!["failed", "dlq"].includes(event.status)) {
    return errorResponse("Can only resend failed or DLQ events");
  }

  // Reset for retry
  await admin
    .from("delivery_events")
    .update({
      status: "pending",
      next_retry_at: new Date().toISOString(),
      error_message: null,
      failed_at: null,
    })
    .eq("id", event_id);

  // Deliver immediately
  const result = await deliverEvent(admin, event_id);

  return json({ success: result.success, error: result.error });
}

// ---------------------------------------------------------------------------
// Route: POST /test — Send test webhook to a destination
// ---------------------------------------------------------------------------
async function handleTest(req: Request): Promise<Response> {
  const user = await getUser(req);
  const { destination_id } = await req.json();

  if (!destination_id) return errorResponse("destination_id is required");

  const admin = adminClient();

  // Get destination
  const { data: dest, error } = await admin
    .from("destinations")
    .select("*")
    .eq("id", destination_id)
    .is("deleted_at", null)
    .single();

  if (error || !dest) return errorResponse("Destination not found", 404);

  // Verify user belongs to workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", dest.workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return errorResponse("Not a member of this workspace", 403);

  // Build test payload
  const testPayload = {
    event: "test",
    source: "metahub",
    timestamp: new Date().toISOString(),
    destination_id: dest.id,
    destination_name: dest.name,
    message: "This is a test webhook from MetaHub. If you see this, your destination is configured correctly!",
    sample_data: {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: "PHONE_ID", display_phone_number: "+55..." },
                messages: [
                  {
                    from: "5511999999999",
                    id: "wamid.TEST",
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: "Hello from MetaHub test!" },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    },
  };

  const startTime = Date.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "MetaHub-Webhook/1.0",
    "X-MetaHub-Event-Id": "test",
    ...(dest.headers || {}),
    ...buildAuthHeaders(dest.auth_type, dest.auth_config || {}),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), dest.timeout_ms || 10000);

    const res = await fetch(dest.url, {
      method: dest.method || "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const statusCode = res.status;
    const responseBody = await res.text().catch(() => "");
    const durationMs = Date.now() - startTime;

    return json({
      success: res.ok,
      status_code: statusCode,
      response_body: responseBody.slice(0, 2000),
      duration_ms: durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    let errorMsg = (err as Error).message;
    if (errorMsg.includes("abort")) {
      errorMsg = `Timeout after ${dest.timeout_ms || 10000}ms`;
    }

    return json({
      success: false,
      error: errorMsg,
      duration_ms: durationMs,
    });
  }
}

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    switch (path) {
      case "process":
        return await handleProcess(req);
      case "resend":
        return await handleResend(req);
      case "test":
        return await handleTest(req);
      case "health":
        return json({ ok: true, version: "v1", timestamp: new Date().toISOString() });
      default:
        return errorResponse(`Unknown route: ${path}`, 404);
    }
  } catch (err) {
    const message = (err as Error).message || "Internal server error";
    console.error(`[delivery-worker] ${path}:`, message);
    return errorResponse(message, 401);
  }
});
