// ============================================================================
// Edge Function: meta-oauth — Meta (Facebook) OAuth2 flow for MetaHub
// Routes: /start, /callback, /refresh, /disconnect
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ---------------------------------------------------------------------------
// Environment variables (set as Edge Function secrets in Supabase Dashboard)
// ---------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_ID = Deno.env.get("META_APP_ID")!;
const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
const APP_URL = Deno.env.get("APP_URL")!; // e.g. https://metahub.app

// Scopes requested from Meta
const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
  "ads_management",
  "ads_read",
  "leads_retrieval",
  "business_management",
].join(",");

// Callback URL registered in Meta App dashboard
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/meta-oauth/callback`;

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a Supabase admin client (service role) */
function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Extract and verify user from JWT using service role */
async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");

  const token = authHeader.replace("Bearer ", "");
  const admin = adminClient();

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error("Invalid token");
  return user;
}

/** JSON response helper */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Error response helper */
function errorResponse(message: string, status = 400) {
  return json({ error: message }, status);
}

// ---------------------------------------------------------------------------
// Route: POST /start — Generate Meta OAuth authorization URL
// ---------------------------------------------------------------------------
async function handleStart(req: Request): Promise<Response> {
  const user = await getUser(req);
  const { workspace_id } = await req.json();

  if (!workspace_id) return errorResponse("workspace_id is required");

  // Verify user belongs to workspace
  const admin = adminClient();
  const { data: member } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return errorResponse("Not a member of this workspace", 403);

  // Generate state token — encode workspace_id + user_id for callback
  const state = btoa(JSON.stringify({
    workspace_id,
    user_id: user.id,
    ts: Date.now(),
  }));

  // Build Meta OAuth URL
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: CALLBACK_URL,
    state,
    scope: META_SCOPES,
    response_type: "code",
    config_id: "", // leave empty unless using Login Configuration
  });

  // Remove empty params
  if (!params.get("config_id")) params.delete("config_id");

  const url = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;

  return json({ url, state });
}

// ---------------------------------------------------------------------------
// Route: GET /callback — Handle OAuth redirect from Meta
// ---------------------------------------------------------------------------
async function handleCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // Handle user denial or error
  if (errorParam || !code || !stateParam) {
    const errorDesc = url.searchParams.get("error_description") || "OAuth cancelled";
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/auth/login?error=${encodeURIComponent(errorDesc)}` },
    });
  }

  // Decode state
  let state: { workspace_id: string; user_id: string; ts: number };
  try {
    state = JSON.parse(atob(stateParam));
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/auth/login?error=invalid_state` },
    });
  }

  // Validate state age (max 10 minutes)
  if (Date.now() - state.ts > 10 * 60 * 1000) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/workspace/${state.workspace_id}/integrations?error=expired` },
    });
  }

  try {
    // Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("redirect_uri", CALLBACK_URL);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || "Token exchange failed");
    }

    // Exchange short-lived token for long-lived token
    const longTokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", META_APP_ID);
    longTokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    longTokenUrl.searchParams.set("fb_exchange_token", tokenData.access_token);

    const longTokenRes = await fetch(longTokenUrl.toString());
    const longTokenData = await longTokenRes.json();

    if (longTokenData.error) {
      throw new Error(longTokenData.error.message || "Long-lived token exchange failed");
    }

    const accessToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in || 5184000; // ~60 days

    // Fetch Meta user info
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`
    );
    const meData = await meRes.json();

    // Fetch granted scopes
    const scopesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}`
    );
    const scopesData = await scopesRes.json();
    const grantedScopes = (scopesData.data || [])
      .filter((p: { status: string }) => p.status === "granted")
      .map((p: { permission: string }) => p.permission);

    // Upsert integration record
    const admin = adminClient();

    // Check if integration already exists for this workspace + meta account
    const { data: existing } = await admin
      .from("integrations")
      .select("id")
      .eq("workspace_id", state.workspace_id)
      .eq("provider", "meta")
      .is("deleted_at", null)
      .single();

    const integrationPayload = {
      workspace_id: state.workspace_id,
      provider: "meta",
      display_name: meData.name || "Meta Account",
      status: "connected",
      connected_by: state.user_id,
      scopes_granted: grantedScopes,
      settings: {
        meta_user_id: meData.id,
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let integrationId: string;

    if (existing) {
      // Update existing
      await admin
        .from("integrations")
        .update(integrationPayload)
        .eq("id", existing.id);
      integrationId = existing.id;
    } else {
      // Insert new
      const { data: newIntegration, error: insertError } = await admin
        .from("integrations")
        .insert(integrationPayload)
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);
      integrationId = newIntegration.id;
    }

    // Sync Meta resources (WhatsApp numbers, Ad accounts, Forms)
    await syncMetaResources(admin, integrationId, accessToken);

    // Redirect back to app
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/workspace/${state.workspace_id}/integrations?connected=true`,
      },
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/workspace/${state.workspace_id}/integrations?error=${encodeURIComponent((err as Error).message)}`,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Route: POST /refresh — Refresh integration access token
// ---------------------------------------------------------------------------
async function handleRefresh(req: Request): Promise<Response> {
  const user = await getUser(req);
  const { integration_id } = await req.json();

  if (!integration_id) return errorResponse("integration_id is required");

  const admin = adminClient();

  // Get integration
  const { data: integration, error } = await admin
    .from("integrations")
    .select("*")
    .eq("id", integration_id)
    .is("deleted_at", null)
    .single();

  if (error || !integration) return errorResponse("Integration not found", 404);

  // Verify user belongs to workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", integration.workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return errorResponse("Not a member of this workspace", 403);

  const currentToken = integration.settings?.access_token;
  if (!currentToken) return errorResponse("No access token to refresh", 400);

  try {
    // Exchange for new long-lived token
    const longTokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", META_APP_ID);
    longTokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    longTokenUrl.searchParams.set("fb_exchange_token", currentToken);

    const tokenRes = await fetch(longTokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      // Token is invalid — mark integration as error
      await admin
        .from("integrations")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("id", integration_id);

      return errorResponse(`Meta API error: ${tokenData.error.message}`, 502);
    }

    const expiresIn = tokenData.expires_in || 5184000;

    // Update token in integration
    await admin
      .from("integrations")
      .update({
        settings: {
          ...integration.settings,
          access_token: tokenData.access_token,
          token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
        status: "connected",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration_id);

    // Re-sync resources
    await syncMetaResources(admin, integration_id, tokenData.access_token);

    return json({ success: true });
  } catch (err) {
    console.error("Refresh error:", err);
    return errorResponse((err as Error).message, 500);
  }
}

// ---------------------------------------------------------------------------
// Route: POST /disconnect — Soft-delete integration
// ---------------------------------------------------------------------------
async function handleDisconnect(req: Request): Promise<Response> {
  const user = await getUser(req);
  const { integration_id } = await req.json();

  if (!integration_id) return errorResponse("integration_id is required");

  const admin = adminClient();

  // Get integration
  const { data: integration, error } = await admin
    .from("integrations")
    .select("workspace_id")
    .eq("id", integration_id)
    .is("deleted_at", null)
    .single();

  if (error || !integration) return errorResponse("Integration not found", 404);

  // Verify user belongs to workspace
  const { data: member } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", integration.workspace_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (!member) return errorResponse("Not a member of this workspace", 403);

  const now = new Date().toISOString();

  // Soft-delete integration and related resources
  await Promise.all([
    admin
      .from("integrations")
      .update({ status: "disconnected", deleted_at: now, settings: {}, updated_at: now })
      .eq("id", integration_id),
    admin
      .from("meta_whatsapp_numbers")
      .update({ deleted_at: now })
      .eq("integration_id", integration_id)
      .is("deleted_at", null),
    admin
      .from("meta_ad_accounts")
      .update({ deleted_at: now })
      .eq("integration_id", integration_id)
      .is("deleted_at", null),
    admin
      .from("meta_forms")
      .update({ deleted_at: now })
      .eq("integration_id", integration_id)
      .is("deleted_at", null),
  ]);

  return json({ success: true });
}

// ---------------------------------------------------------------------------
// Sync Meta Resources — WhatsApp numbers, Ad Accounts, Forms
// ---------------------------------------------------------------------------
async function syncMetaResources(
  admin: ReturnType<typeof createClient>,
  integrationId: string,
  accessToken: string
) {
  try {
    // Fetch WhatsApp Business Accounts
    const wabaRes = await fetch(
      `https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}}&access_token=${accessToken}`
    );
    const wabaData = await wabaRes.json();

    if (wabaData.data) {
      for (const biz of wabaData.data) {
        const wabas = biz.owned_whatsapp_business_accounts?.data || [];
        for (const waba of wabas) {
          const phones = waba.phone_numbers?.data || [];
          for (const phone of phones) {
            await admin
              .from("meta_whatsapp_numbers")
              .upsert(
                {
                  integration_id: integrationId,
                  phone_number: phone.display_phone_number,
                  phone_number_id: phone.id,
                  whatsapp_business_id: waba.id,
                  display_name: phone.verified_name || waba.name,
                  quality_rating: phone.quality_rating || null,
                  status: "active",
                  deleted_at: null,
                },
                { onConflict: "integration_id,phone_number_id" }
              );
          }
        }
      }
    }

    // Fetch Ad Accounts
    const adRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=account_id,name,currency,timezone_name,account_status&access_token=${accessToken}`
    );
    const adData = await adRes.json();

    if (adData.data) {
      for (const account of adData.data) {
        const statusMap: Record<number, string> = {
          1: "active", 2: "disabled", 3: "unsettled",
          7: "pending_risk_review", 9: "in_grace_period",
          100: "pending_settlement", 101: "pending_closure",
        };

        await admin
          .from("meta_ad_accounts")
          .upsert(
            {
              integration_id: integrationId,
              ad_account_id: account.account_id,
              name: account.name,
              currency: account.currency || "USD",
              timezone: account.timezone_name || "UTC",
              status: statusMap[account.account_status] || "unknown",
              data: account,
              deleted_at: null,
            },
            { onConflict: "integration_id,ad_account_id" }
          );
      }
    }

    // Fetch Lead Forms (from pages)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,leadgen_forms{id,name,status}&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.data) {
      for (const page of pagesData.data) {
        const forms = page.leadgen_forms?.data || [];
        for (const form of forms) {
          await admin
            .from("meta_forms")
            .upsert(
              {
                integration_id: integrationId,
                form_id: form.id,
                page_id: page.id,
                name: form.name,
                status: form.status || "active",
                details: { page_name: page.name, ...form },
                deleted_at: null,
              },
              { onConflict: "integration_id,form_id" }
            );
        }
      }
    }
  } catch (err) {
    // Log but don't fail the main operation
    console.error("Resource sync error:", err);
  }
}

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    switch (path) {
      case "start":
        return await handleStart(req);
      case "callback":
        return await handleCallback(req);
      case "refresh":
        return await handleRefresh(req);
      case "disconnect":
        return await handleDisconnect(req);
      default:
        return errorResponse(`Unknown route: ${path}`, 404);
    }
  } catch (err) {
    const message = (err as Error).message || "Internal server error";
    console.error(`[meta-oauth] ${path}:`, message);

    // Return 401 for auth-related errors
    if (message.includes("Authorization") || message.includes("Invalid token")) {
      return errorResponse(message, 401);
    }
    return errorResponse(message, 500);
  }
});
