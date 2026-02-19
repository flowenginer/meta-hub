// ============================================================================
// Supabase Client Configuration
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Helper to get Edge Function URL */
export function getEdgeFunctionUrl(functionName: string): string {
  return `${supabaseUrl}/functions/v1/${functionName}`;
}
