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

// Extracts a best-effort client IP from Vercel's forwarded-for header.
// Not foolproof (a determined attacker can rotate IPs), but a real,
// meaningful deterrent against casual spam/abuse at essentially zero cost.
export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

// Database-backed rate limiting. Returns true if the request is allowed,
// false if the caller has exceeded maxAttempts within windowMinutes for
// this rateKey+endpoint pair. Logs the attempt either way (an allowed
// request still counts toward the next check) except when already over
// the limit, so a blocked caller retrying rapidly doesn't push the
// window further out.
export async function checkRateLimit(supabaseAdmin, rateKey, endpoint, maxAttempts, windowMinutes) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("request_log")
    .select("*", { count: "exact", head: true })
    .eq("rate_key", rateKey).eq("endpoint", endpoint).gte("created_at", windowStart);

  if ((count || 0) >= maxAttempts) return false;

  await supabaseAdmin.from("request_log").insert({ rate_key: rateKey, endpoint });
  return true;
}

// Best-effort admin alert email via Resend. If RESEND_API_KEY or
// ADMIN_ALERT_EMAIL aren't set yet, falls back to a Vercel log line
// instead of failing - this ships today and becomes fully active once
// those env vars are added, same pattern as MOMO_NUMBER before it was
// configured. Never throws - a failed alert should never break the
// actual request that triggered it.
export async function sendAdminAlert(subject, message) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;

  if (!apiKey || !adminEmail) {
    console.error("[ADMIN ALERT - Resend not configured]", subject, "|", message);
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ticket-In Alerts <onboarding@resend.dev>", // switch to a verified domain address once one exists
        to: adminEmail,
        subject: "[Ticket-In Alert] " + subject,
        text: message,
      }),
    });
  } catch (e) {
    console.error("[ADMIN ALERT - failed to send]", subject, "|", message, "|", e.message);
  }
}
