import { getSupabaseAdmin, sendAdminAlert } from "./_lib.js";

// GET/POST /api/expire-tickets
// Called on a schedule by Vercel Cron (see vercel.json's "crons" entry).
// Not meant to be called by end users or the frontend at all.
//
// submit-checkin.js sets payment_expires_at (3 hours out) on every new
// ticket, and the UI already has a full "expired" status/tag built - but
// nothing ever actually flips a ticket to that status once its payment
// window passes. This is the fix: sweep for tickets still waiting on
// payment (status='form_submitted') whose window has passed, and expire
// them. Deliberately narrow - only form_submitted tickets are touched.
// A ticket that's already open/claimed/in_progress/resolved has a real
// consultation in motion (or done) and must never be silently expired
// out from under a client or a doctor working it.
//
// Auth: Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>"
// automatically once CRON_SECRET is set as a project env var (Vercel's
// own documented mechanism - https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
// Until CRON_SECRET is configured in Vercel, this endpoint refuses every
// request rather than running unauthenticated - a public "expire stuff"
// endpoint with no check at all is not an acceptable interim state.
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: "CRON_SECRET is not configured - refusing to run unauthenticated." });
  }
  const authHeader = req.headers.authorization || "";
  if (authHeader !== "Bearer " + cronSecret) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .update({ status: "expired" })
      .eq("status", "form_submitted")
      .lt("payment_expires_at", nowIso)
      .select("id");

    if (error) {
      await sendAdminAlert("expire-tickets failed", error.message);
      return res.status(500).json({ error: "Could not expire tickets: " + error.message });
    }

    return res.status(200).json({ ok: true, expiredCount: data?.length || 0 });
  } catch (e) {
    await sendAdminAlert("expire-tickets crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
