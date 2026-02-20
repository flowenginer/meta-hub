// ============================================================================
// Edge Function: meta-oauth — Meta OAuth flow (start, callback, refresh, disconnect)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Environment ──
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_ID = Deno.env.get("META_APP_ID")!;
const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
const APP_URL = Deno.env.get("APP_URL") || "";

const META_API_VERSION = "v21.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const META_OAUTH_URL = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;

const META_SCOPES = [
  "business_management",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
  "ads_read",
  "pages_read_engagement",
  "leads_retrieval",
  "pages_manage_metadata",
].join(",");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Helpers ──

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** Verify the Authorization header and return the user */
async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or invalid authorization header");
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "Invalid token");
  return user;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, error.status);
  }
  console.error("Unhandled error:", error);
  return jsonResponse({ error: "Internal server error" }, 500);
}

/** HMAC-sign a state payload */
async function signState(payload: Record<string, unknown>): Promise<string> {
  const data = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return btoa(data) + "." + sigHex;
}

/** Verify and decode a signed state */
async function verifyState(state: string): Promise<Record<string, unknown>> {
  const [dataB64, sigHex] = state.split(".");
  if (!dataB64 || !sigHex) throw new HttpError(400, "Invalid state parameter");

  const data = atob(dataB64);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = new Uint8Array(
    sigHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(data)
  );
  if (!valid) throw new HttpError(400, "Invalid state signature");

  const payload = JSON.parse(data);
  // Check expiry (10 minutes)
  if (Date.now() - payload.ts > 10 * 60 * 1000) {
    throw new HttpError(400, "State expired");
  }
  return payload;
}

function getCallbackUrl(): string {
  return `${SUPABASE_URL}/functions/v1/meta-oauth/callback`;
}

// ── Meta API helpers ──

/** Exchange auth code for short-lived token */
async function exchangeCodeForToken(code: string): Promise<{ access_token: string; expires_in?: number }> {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri: getCallbackUrl(),
    code,
  });
  const res = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params}`);
  const data = await res.json();
  if (data.error) throw new HttpError(400, data.error.message || "Token exchange failed");
  return data;
}

/** Exchange short-lived token for long-lived token (~60 days) */
async function getLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params}`);
  const data = await res.json();
  if (data.error) throw new HttpError(400, data.error.message || "Long-lived token exchange failed");
  return data;
}

/** Get Meta user profile */
async function getMetaProfile(token: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${META_GRAPH_URL}/me?fields=id,name&access_token=${token}`);
  const data = await res.json();
  if (data.error) throw new HttpError(400, data.error.message || "Failed to get profile");
  return data;
}

/** Get granted permissions/scopes */
async function getGrantedScopes(token: string): Promise<string[]> {
  const res = await fetch(`${META_GRAPH_URL}/me/permissions?access_token=${token}`);
  const data = await res.json();
  if (data.error) return [];
  return (data.data || [])
    .filter((p: { status: string }) => p.status === "granted")
    .map((p: { permission: string }) => p.permission);
}

/** Fetch WhatsApp Business info and phone numbers */
async function fetchWhatsAppResources(token: string) {
  const numbers: Array<{
    phone_number: string;
    phone_number_id: string;
    whatsapp_business_id: string;
    display_name: string | null;
    quality_rating: string | null;
  }> = [];

  try {
    // Get user's businesses
    const bizRes = await fetch(
      `${META_GRAPH_URL}/me/businesses?fields=id,name&access_token=${token}`
    );
    const bizData = await bizRes.json();
    if (bizData.error || !bizData.data) return numbers;

    for (const biz of bizData.data) {
      // Get WhatsApp Business Accounts per business
      const wabaRes = await fetch(
        `${META_GRAPH_URL}/${biz.id}/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}&access_token=${token}`
      );
      const wabaData = await wabaRes.json();
      if (wabaData.error || !wabaData.data) continue;

      for (const waba of wabaData.data) {
        const phoneNumbers = waba.phone_numbers?.data || [];
        for (const phone of phoneNumbers) {
          numbers.push({
            phone_number: phone.display_phone_number || "",
            phone_number_id: phone.id,
            whatsapp_business_id: waba.id,
            display_name: phone.verified_name || null,
            quality_rating: phone.quality_rating || null,
          });
        }
      }
    }
  } catch (err) {
    console.error("Error fetching WhatsApp resources:", err);
  }

  return numbers;
}

/** Fetch Ad Accounts */
async function fetchAdAccounts(token: string) {
  const accounts: Array<{
    ad_account_id: string;
    name: string | null;
    currency: string;
    timezone: string;
    status: string;
    data: Record<string, unknown>;
  }> = [];

  try {
    const res = await fetch(
      `${META_GRAPH_URL}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&access_token=${token}`
    );
    const data = await res.json();
    if (data.error || !data.data) return accounts;

    for (const acc of data.data) {
      accounts.push({
        ad_account_id: acc.id,
        name: acc.name || null,
        currency: acc.currency || "BRL",
        timezone: acc.timezone_name || "America/Sao_Paulo",
        status: acc.account_status === 1 ? "active" : "inactive",
        data: acc,
      });
    }
  } catch (err) {
    console.error("Error fetching ad accounts:", err);
  }

  return accounts;
}

/** Fetch Lead Forms from Pages */
async function fetchLeadForms(token: string) {
  const forms: Array<{
    form_id: string;
    page_id: string;
    name: string | null;
    status: string;
    details: Record<string, unknown>;
  }> = [];

  try {
    const res = await fetch(
      `${META_GRAPH_URL}/me/accounts?fields=id,name,leadgen_forms{id,name,status}&access_token=${token}`
    );
    const data = await res.json();
    if (data.error || !data.data) return forms;

    for (const page of data.data) {
      const pageForms = page.leadgen_forms?.data || [];
      for (const form of pageForms) {
        forms.push({
          form_id: form.id,
          page_id: page.id,
          name: form.name || null,
          status: form.status === "ACTIVE" ? "active" : form.status?.toLowerCase() || "unknown",
          details: { page_name: page.name, page_id: page.id },
        });
      }
    }
  } catch (err) {
    console.error("Error fetching lead forms:", err);
  }

  return forms;
}

// ── Route Handlers ──

async function handleStart(req: Request): Promise<Response> {
  const user = await getAuthUser(req);
  const { workspace_id } = await req.json();
  if (!workspace_id) throw new HttpError(400, "workspace_id is required");

  // Verify user is member of workspace
  const db = adminClient();
  const { data: membership } = await db
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!membership) throw new HttpError(403, "Not a member of this workspace");

  // Generate signed state
  const state = await signState({
    wid: workspace_id,
    uid: user.id,
    ts: Date.now(),
  });

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: getCallbackUrl(),
    state,
    scope: META_SCOPES,
    response_type: "code",
  });

  const url = `${META_OAUTH_URL}?${params}`;

  return jsonResponse({ url, state });
}

async function handleCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_reason");

  // Handle user denial
  if (errorParam) {
    return callbackHtml(false, errorReason || errorParam);
  }

  if (!code || !state) {
    return callbackHtml(false, "Parâmetros inválidos na resposta do Meta.");
  }

  try {
    // Verify state
    const payload = await verifyState(state);
    const workspaceId = payload.wid as string;
    const userId = payload.uid as string;

    // Exchange code for token
    const { access_token: shortToken } = await exchangeCodeForToken(code);

    // Get long-lived token
    const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken);
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Get Meta profile
    const profile = await getMetaProfile(longToken);

    // Get granted scopes
    const scopes = await getGrantedScopes(longToken);

    // Save integration
    const db = adminClient();

    const { data: integration, error: insertError } = await db
      .from("integrations")
      .insert({
        workspace_id: workspaceId,
        provider: "meta",
        display_name: profile.name,
        status: "connected",
        connected_by: userId,
        settings: {
          access_token: longToken,
          token_expires_at: tokenExpiresAt,
          meta_user_id: profile.id,
        },
        scopes_granted: scopes,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // Fetch and store Meta resources in parallel
    const [whatsappNumbers, adAccounts, leadForms] = await Promise.all([
      fetchWhatsAppResources(longToken),
      fetchAdAccounts(longToken),
      fetchLeadForms(longToken),
    ]);

    // Store WhatsApp numbers
    if (whatsappNumbers.length > 0) {
      await db.from("meta_whatsapp_numbers").insert(
        whatsappNumbers.map((n) => ({
          integration_id: integration.id,
          phone_number: n.phone_number,
          phone_number_id: n.phone_number_id,
          whatsapp_business_id: n.whatsapp_business_id,
          display_name: n.display_name,
          quality_rating: n.quality_rating,
          webhook_subscribed: false,
          status: "active",
        }))
      );
    }

    // Store Ad Accounts
    if (adAccounts.length > 0) {
      await db.from("meta_ad_accounts").insert(
        adAccounts.map((a) => ({
          integration_id: integration.id,
          ad_account_id: a.ad_account_id,
          name: a.name,
          currency: a.currency,
          timezone: a.timezone,
          status: a.status,
          data: a.data,
        }))
      );
    }

    // Store Lead Forms
    if (leadForms.length > 0) {
      await db.from("meta_forms").insert(
        leadForms.map((f) => ({
          integration_id: integration.id,
          form_id: f.form_id,
          page_id: f.page_id,
          name: f.name,
          status: f.status,
          details: f.details,
        }))
      );
    }

    return callbackHtml(true);
  } catch (err) {
    console.error("OAuth callback error:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return callbackHtml(false, message);
  }
}

async function handleRefresh(req: Request): Promise<Response> {
  const user = await getAuthUser(req);
  const { integration_id } = await req.json();
  if (!integration_id) throw new HttpError(400, "integration_id is required");

  const db = adminClient();

  // Fetch integration
  const { data: integration, error } = await db
    .from("integrations")
    .select("*")
    .eq("id", integration_id)
    .is("deleted_at", null)
    .single();

  if (error || !integration) throw new HttpError(404, "Integration not found");

  // Verify user is member of the workspace
  const { data: membership } = await db
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", integration.workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!membership) throw new HttpError(403, "Not authorized");

  const currentToken = integration.settings?.access_token;
  if (!currentToken) throw new HttpError(400, "No access token found");

  // Exchange for new long-lived token
  const { access_token: newToken, expires_in } = await getLongLivedToken(currentToken);
  const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  // Update integration
  await db
    .from("integrations")
    .update({
      settings: {
        ...integration.settings,
        access_token: newToken,
        token_expires_at: tokenExpiresAt,
      },
      status: "connected",
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", integration_id);

  // Re-sync resources: delete old, insert new
  const [whatsappNumbers, adAccounts, leadForms] = await Promise.all([
    fetchWhatsAppResources(newToken),
    fetchAdAccounts(newToken),
    fetchLeadForms(newToken),
  ]);

  // Soft-delete old resources
  const now = new Date().toISOString();
  await Promise.all([
    db.from("meta_whatsapp_numbers").update({ deleted_at: now }).eq("integration_id", integration_id).is("deleted_at", null),
    db.from("meta_ad_accounts").update({ deleted_at: now }).eq("integration_id", integration_id).is("deleted_at", null),
    db.from("meta_forms").update({ deleted_at: now }).eq("integration_id", integration_id).is("deleted_at", null),
  ]);

  // Insert new resources
  if (whatsappNumbers.length > 0) {
    await db.from("meta_whatsapp_numbers").insert(
      whatsappNumbers.map((n) => ({
        integration_id,
        phone_number: n.phone_number,
        phone_number_id: n.phone_number_id,
        whatsapp_business_id: n.whatsapp_business_id,
        display_name: n.display_name,
        quality_rating: n.quality_rating,
        webhook_subscribed: false,
        status: "active",
      }))
    );
  }
  if (adAccounts.length > 0) {
    await db.from("meta_ad_accounts").insert(
      adAccounts.map((a) => ({
        integration_id,
        ad_account_id: a.ad_account_id,
        name: a.name,
        currency: a.currency,
        timezone: a.timezone,
        status: a.status,
        data: a.data,
      }))
    );
  }
  if (leadForms.length > 0) {
    await db.from("meta_forms").insert(
      leadForms.map((f) => ({
        integration_id,
        form_id: f.form_id,
        page_id: f.page_id,
        name: f.name,
        status: f.status,
        details: f.details,
      }))
    );
  }

  return jsonResponse({ ok: true });
}

async function handleDisconnect(req: Request): Promise<Response> {
  const user = await getAuthUser(req);
  const { integration_id } = await req.json();
  if (!integration_id) throw new HttpError(400, "integration_id is required");

  const db = adminClient();

  // Verify user has access
  const { data: integration, error } = await db
    .from("integrations")
    .select("workspace_id")
    .eq("id", integration_id)
    .is("deleted_at", null)
    .single();

  if (error || !integration) throw new HttpError(404, "Integration not found");

  const { data: membership } = await db
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", integration.workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!membership) throw new HttpError(403, "Not authorized");

  // Soft-delete integration and resources
  const now = new Date().toISOString();
  await Promise.all([
    db.from("integrations").update({ deleted_at: now, status: "disconnected" }).eq("id", integration_id),
    db.from("meta_whatsapp_numbers").update({ deleted_at: now }).eq("integration_id", integration_id).is("deleted_at", null),
    db.from("meta_ad_accounts").update({ deleted_at: now }).eq("integration_id", integration_id).is("deleted_at", null),
    db.from("meta_forms").update({ deleted_at: now }).eq("integration_id", integration_id).is("deleted_at", null),
  ]);

  return jsonResponse({ ok: true });
}

/** Escape HTML to prevent XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Return HTML page that communicates with popup opener and closes */
function callbackHtml(success: boolean, errorMessage?: string): Response {
  const safeError = errorMessage ? escapeHtml(errorMessage) : "Erro desconhecido";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>MetaHub - ${success ? "Conectado" : "Erro"}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f9fafb;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h2 { color: #111827; margin: 0 0 0.5rem; }
    p { color: #6b7280; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "&#9989;" : "&#10060;"}</div>
    <h2>${success ? "Integra&#231;&#227;o conectada!" : "Falha na conex&#227;o"}</h2>
    <p>${success ? "Fechando esta janela..." : safeError}</p>
    ${!success ? '<p style="margin-top:1rem;"><a href="javascript:window.close()">Fechar janela</a></p>' : ""}
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage(
        { type: 'meta-oauth-complete', success: ${success} },
        '*'
      );
    }
    ${success ? "setTimeout(() => window.close(), 1500);" : ""}
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ── Main Router ──

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    // Extract the sub-path after /meta-oauth/
    const pathParts = url.pathname.split("/");
    const action = pathParts[pathParts.length - 1];

    switch (action) {
      case "start":
        if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
        return await handleStart(req);

      case "callback":
        if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
        return await handleCallback(req);

      case "refresh":
        if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
        return await handleRefresh(req);

      case "disconnect":
        if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
        return await handleDisconnect(req);

      default:
        throw new HttpError(404, `Unknown action: ${action}`);
    }
  } catch (error) {
    return errorResponse(error);
  }
});
