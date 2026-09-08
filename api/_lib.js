import { createClient } from "@supabase/supabase-js";

// Service-role client - server-side only, never exposed to the browser.
// Bypasses RLS entirely, so every route using this must do its own
// authorization checks explicitly.
export function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Verifies the bearer token on an incoming request and returns the real
// authenticated user (or null + an error string). Every sensitive API
// route calls this first, mirroring the pattern proven working in PastQ.
export async function getAuthedUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { user: null, error: "No authorization token provided." };

  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { user: null, error: error?.message || "Invalid or expired session." };

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id, name, role, staff_verification_status")
    .eq("id", user.id)
    .single();
  if (profileErr || !profile) return { user: null, error: "No profile found for this account." };

  return { user: { ...user, ...profile }, error: null };
}
