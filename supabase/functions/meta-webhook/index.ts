// ============================================================================
// Edge Function: meta-webhook — Receive Meta webhooks (WhatsApp + LeadGen)
// and forward to configured destinations via routes
//
// Meta sends webhooks to:
//   GET  /meta-webhook  → verification challenge
//   POST /meta-webhook  → incoming events (messages, leadgen, etc.)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_WEBHOOK_VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "metahub_verify_token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Log helper — writes to event_logs table for visibility in the UI
// ---------------------------------------------------------------------------
async function writeLog(
  admin: ReturnType<typeof createClient>,
  workspaceId: string | null,
  level: string,
  category: string,
  action: string,
  message: string,
  metadata: Record<string, unknown> = {},
  durationMs?: number,
) {
  if (!workspaceId) return;
  try {
    await admin.from("event_logs").insert({
      workspace_id: workspaceId,
      level,
      category,
      action,
      message,
      metadata,
      duration_ms: durationMs,
    });
  } catch (err) {
    console.error("[webhook] Failed to write log:", err);
  }
}

// ---------------------------------------------------------------------------
// GET — Meta webhook verification (challenge-response)
// ---------------------------------------------------------------------------
function handleVerification(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log("[webhook] Verification request:", { mode, token: token?.slice(0, 8) + "...", challenge });

  if (mode === "subscribe" && token === META_WEBHOOK_VERIFY_TOKEN) {
    console.log("[webhook] Verification successful");
    return new Response(challenge, { status: 200, headers: corsHeaders });
  }

  console.error("[webhook] Verification failed — token mismatch");
  return new Response("Forbidden", { status: 403, headers: corsHeaders });
}

// ---------------------------------------------------------------------------
// Route matching — find active routes for a source type + optional source_id
// ---------------------------------------------------------------------------
interface MatchedRoute {
  route_id: string;
  destination_id: string;
  workspace_id: string;
  destination_url: string;
  destination_method: string;
  destination_headers: Record<string, string>;
  destination_auth_type: string;
  destination_auth_config: Record<string, string>;
  destination_timeout_ms: number;
}

async function findMatchingRoutes(
  admin: ReturnType<typeof createClient>,
  sourceType: string,
  sourceId: string | null,
): Promise<MatchedRoute[]> {
  // Find routes where source matches — either exact source_id match or null (catch-all)
  let query = admin
    .from("routes")
    .select(`
      id,
      workspace_id,
      source_id,
      destination_id,
      priority,
      destination:destinations(id, url, method, headers, auth_type, auth_config, timeout_ms, is_active)
    `)
    .eq("source_type", sourceType)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("priority", { ascending: false });

  const { data: routes, error } = await query;

  if (error) {
    console.error("[webhook] Route query error:", error.message);
    return [];
  }

  if (!routes || routes.length === 0) return [];

  const matched: MatchedRoute[] = [];

  for (const route of routes) {
    // Skip if route has a specific source_id that doesn't match
    if (route.source_id && sourceId && route.source_id !== sourceId) continue;

    const dest = route.destination as unknown as {
      id: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      auth_type: string;
      auth_config: Record<string, string>;
      timeout_ms: number;
      is_active: boolean;
    };

    if (!dest || !dest.is_active) continue;

    matched.push({
      route_id: route.id,
      destination_id: dest.id,
      workspace_id: route.workspace_id,
      destination_url: dest.url,
      destination_method: dest.method,
      destination_headers: dest.headers || {},
      destination_auth_type: dest.auth_type,
      destination_auth_config: dest.auth_config || {},
      destination_timeout_ms: dest.timeout_ms || 10000,
    });
  }

  return matched;
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
// Deliver payload to destination and record attempt
// ---------------------------------------------------------------------------
async function deliverToDestination(
  admin: ReturnType<typeof createClient>,
  eventId: string,
  route: MatchedRoute,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const startTime = Date.now();

  // Update event to processing
  await admin
    .from("delivery_events")
    .update({ status: "processing", attempts_count: 1 })
    .eq("id", eventId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "MetaHub-Webhook/1.0",
    "X-MetaHub-Event-Id": eventId,
    ...route.destination_headers,
    ...buildAuthHeaders(route.destination_auth_type, route.destination_auth_config),
  };

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), route.destination_timeout_ms);

    const res = await fetch(route.destination_url, {
      method: route.destination_method,
      headers,
      body: JSON.stringify(payload),
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
      errorMessage = `Timeout after ${route.destination_timeout_ms}ms`;
    }
  }

  const durationMs = Date.now() - startTime;

  // Record attempt
  await admin.from("delivery_attempts").insert({
    event_id: eventId,
    destination_id: route.destination_id,
    attempt_number: 1,
    request_url: route.destination_url,
    request_method: route.destination_method,
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
      })
      .eq("id", eventId);
  } else {
    // Mark as failed — delivery-worker can retry later
    await admin
      .from("delivery_events")
      .update({
        status: "failed",
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + 60000).toISOString(), // retry in 1 min
      })
      .eq("id", eventId);
  }

  return success;
}

// ---------------------------------------------------------------------------
// Process WhatsApp webhook entries
// ---------------------------------------------------------------------------
async function processWhatsAppEntries(
  admin: ReturnType<typeof createClient>,
  entries: Array<{
    id: string;
    changes: Array<{
      value: Record<string, unknown>;
      field: string;
    }>;
  }>,
) {
  let processed = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value as Record<string, unknown>;
      const metadata = value.metadata as { phone_number_id?: string } | undefined;
      const phoneNumberId = metadata?.phone_number_id || null;

      // Build the payload to forward
      const payload = {
        object: "whatsapp_business_account",
        entry_id: entry.id,
        field: change.field,
        value: value,
        received_at: new Date().toISOString(),
      };

      // Find matching routes
      const routes = await findMatchingRoutes(admin, "whatsapp", phoneNumberId);

      if (routes.length === 0) {
        console.log(`[webhook] No routes found for whatsapp source_id=${phoneNumberId}`);
        // Log to first workspace we can find (best effort)
        continue;
      }

      // Log webhook reception
      await writeLog(
        admin,
        routes[0]?.workspace_id || null,
        "info",
        "webhook",
        "webhook.received",
        `WhatsApp webhook recebido: ${change.field} de phone_number_id=${phoneNumberId}`,
        { waba_id: entry.id, field: change.field, phone_number_id: phoneNumberId, routes_matched: routes.length },
      );

      // Create delivery events and deliver
      for (const route of routes) {
        const { data: event, error } = await admin
          .from("delivery_events")
          .insert({
            workspace_id: route.workspace_id,
            route_id: route.route_id,
            destination_id: route.destination_id,
            source_type: "whatsapp",
            source_event_id: phoneNumberId,
            payload,
            status: "pending",
            next_retry_at: new Date().toISOString(),
            metadata: {
              waba_id: entry.id,
              field: change.field,
              phone_number_id: phoneNumberId,
            },
          })
          .select("id")
          .single();

        if (error) {
          console.error("[webhook] Failed to create delivery event:", error.message);
          await writeLog(admin, route.workspace_id, "error", "delivery", "delivery.create_failed", `Falha ao criar evento de delivery: ${error.message}`, { route_id: route.route_id });
          continue;
        }

        // Deliver immediately (fire-and-forget within this invocation)
        deliverToDestination(admin, event.id, route, payload)
          .then((success) => {
            writeLog(admin, route.workspace_id, success ? "info" : "warn", "delivery",
              success ? "delivery.success" : "delivery.failed",
              success
                ? `Entregue para ${route.destination_url}`
                : `Falha na entrega para ${route.destination_url}`,
              { event_id: event.id, destination_url: route.destination_url });
          })
          .catch((err) => {
            console.error("[webhook] Delivery error:", err);
            writeLog(admin, route.workspace_id, "error", "delivery", "delivery.error", `Erro de delivery: ${(err as Error).message}`, { event_id: event.id });
          });

        processed++;
      }
    }
  }

  return processed;
}

// ---------------------------------------------------------------------------
// Process LeadGen (forms) webhook entries
// ---------------------------------------------------------------------------
async function processLeadGenEntries(
  admin: ReturnType<typeof createClient>,
  entries: Array<{
    id: string;
    changes: Array<{
      value: Record<string, unknown>;
      field: string;
    }>;
  }>,
) {
  let processed = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;

      const value = change.value as {
        form_id?: string;
        leadgen_id?: string;
        page_id?: string;
        created_time?: number;
      };

      const formId = value.form_id || null;
      const pageId = value.page_id || entry.id || null;

      const payload = {
        object: "page",
        entry_id: entry.id,
        field: "leadgen",
        value: value,
        received_at: new Date().toISOString(),
      };

      // Find matching routes for forms
      const routes = await findMatchingRoutes(admin, "forms", formId);

      if (routes.length === 0) {
        console.log(`[webhook] No routes found for forms source_id=${formId}`);
        continue;
      }

      // Log webhook reception
      await writeLog(
        admin,
        routes[0]?.workspace_id || null,
        "info",
        "webhook",
        "webhook.received",
        `LeadGen webhook recebido: form_id=${formId}, page_id=${pageId}`,
        { page_id: pageId, form_id: formId, routes_matched: routes.length },
      );

      for (const route of routes) {
        // Optionally fetch full lead data using page access token
        let enrichedPayload = payload;

        if (value.leadgen_id) {
          try {
            const leadData = await fetchLeadData(admin, route.workspace_id, value.leadgen_id, pageId);
            if (leadData) {
              enrichedPayload = { ...payload, lead_data: leadData };
            }
          } catch (err) {
            console.error("[webhook] Failed to fetch lead data:", err);
          }
        }

        const { data: event, error } = await admin
          .from("delivery_events")
          .insert({
            workspace_id: route.workspace_id,
            route_id: route.route_id,
            destination_id: route.destination_id,
            source_type: "forms",
            source_event_id: formId,
            payload: enrichedPayload,
            status: "pending",
            next_retry_at: new Date().toISOString(),
            metadata: {
              page_id: pageId,
              form_id: formId,
              leadgen_id: value.leadgen_id,
            },
          })
          .select("id")
          .single();

        if (error) {
          console.error("[webhook] Failed to create delivery event:", error.message);
          continue;
        }

        deliverToDestination(admin, event.id, route, enrichedPayload).catch((err) => {
          console.error("[webhook] Delivery error:", err);
        });

        processed++;
      }
    }
  }

  return processed;
}

// ---------------------------------------------------------------------------
// Fetch full lead data from Meta Graph API (enrichment)
// ---------------------------------------------------------------------------
async function fetchLeadData(
  admin: ReturnType<typeof createClient>,
  workspaceId: string,
  leadgenId: string,
  pageId: string | null,
): Promise<Record<string, unknown> | null> {
  // Get the integration access token for this workspace
  const { data: integration } = await admin
    .from("integrations")
    .select("settings")
    .eq("workspace_id", workspaceId)
    .eq("provider", "meta")
    .eq("status", "connected")
    .is("deleted_at", null)
    .single();

  if (!integration?.settings?.access_token) return null;

  const accessToken = integration.settings.access_token as string;

  // If we have a page_id, try to get a page access token for better permissions
  let token = accessToken;
  if (pageId) {
    try {
      const pageRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${accessToken}`
      );
      const pageData = await pageRes.json();
      if (pageData.access_token) {
        token = pageData.access_token;
      }
    } catch {
      // Fall back to user token
    }
  }

  try {
    const leadRes = await fetch(
      `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${token}`
    );
    const leadData = await leadRes.json();

    if (leadData.error) {
      console.error("[webhook] Lead data fetch error:", leadData.error.message);
      return null;
    }

    return leadData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST — Handle incoming Meta webhook events
// ---------------------------------------------------------------------------
async function handleWebhookPost(req: Request): Promise<Response> {
  const startTime = Date.now();
  const body = await req.json();
  const admin = adminClient();

  console.log("[webhook] Received:", JSON.stringify(body).slice(0, 1000));

  const object = body.object;
  const entries = body.entry || [];

  if (!object || entries.length === 0) {
    console.log("[webhook] Ignored — no entries");
    return json({ status: "ignored", reason: "no entries" });
  }

  let processed = 0;

  if (object === "whatsapp_business_account") {
    processed = await processWhatsAppEntries(admin, entries);
  } else if (object === "page") {
    processed = await processLeadGenEntries(admin, entries);
  } else {
    console.log(`[webhook] Unsupported object type: ${object}`);
  }

  const durationMs = Date.now() - startTime;
  console.log(`[webhook] Processed ${processed} delivery events in ${durationMs}ms`);

  // Meta expects 200 response quickly — don't block on delivery
  return json({ status: "ok", processed });
}

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      return handleVerification(req);
    }

    if (req.method === "POST") {
      return await handleWebhookPost(req);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("[webhook] Unhandled error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
