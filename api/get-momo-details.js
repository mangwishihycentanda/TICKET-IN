import { getSupabaseAdmin, getClientIp, checkRateLimit } from "./_lib.js";

// POST /api/get-momo-details
// No auth required (as of the account-free client check-in change) -
// anonymous clients need this at the payment step now, and there's no
// real sensitivity difference in who sees this vs. who doesn't; it's
// shown to whoever is actively checking in regardless. Serves manual
// payment details from server-side env vars, never hardcoded in source -
// PastQ had a real personal-phone-number exposure bug from doing this
// the wrong way first; doing it right from the start here instead.
//
// Lightly rate limited - low stakes (the number itself isn't secret
// once a real client sees it), mostly just a basic deterrent against
// trivial scraping/abuse.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const ok = await checkRateLimit(supabaseAdmin, getClientIp(req), "get-momo-details", 30, 60);
    if (!ok) return res.status(429).json({ error: "Too many requests. Please wait a while before trying again." });

    const momoNumber = process.env.MOMO_NUMBER;
    const momoAccountName = process.env.MOMO_ACCOUNT_NAME;

    if (!momoNumber || !momoAccountName) {
      return res.status(500).json({
        error: "Manual payment is not configured yet. Set MOMO_NUMBER and MOMO_ACCOUNT_NAME in Vercel environment variables.",
      });
    }

    return res.status(200).json({ momoNumber, momoAccountName });
  } catch (e) {
    // Catches anything unexpected (bad env vars, network failure to
    // Supabase, etc.) and returns real JSON instead of letting the
    // function crash raw - a raw crash returns an HTML/plain-text page
    // that the frontend can't parse as JSON, which is exactly what was
    // happening before this fix.
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
