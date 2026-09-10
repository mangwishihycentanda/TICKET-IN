import { getSupabaseAdmin } from "./_lib.js";

// POST /api/submit-checkin
// Deliberately NO authentication - this is the whole point. A client
// checks in with just a phone number, no account. Generates a
// client_code (excludes visually ambiguous characters - no 0/O, 1/I/L)
// that, combined with the phone number, is how they look up their
// ticket later via /api/lookup-ticket. Not bank-grade security, but a
// reasonable level for this - matches an order-lookup code, not a
// password.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      phone, onset, location, duration, character, aggravating_factors,
      relieving_factors, timing, severity_level, severity_description,
      additional_notes, emergency_disclaimer_acknowledged,
    } = req.body || {};

    if (!phone || !phone.trim()) return res.status(400).json({ error: "Phone number is required." });
    if (!onset || !onset.trim()) return res.status(400).json({ error: "Onset is required." });
    if (!severity_level || severity_level < 1 || severity_level > 10) {
      return res.status(400).json({ error: "A severity level (1-10) is required." });
    }
    if (!emergency_disclaimer_acknowledged) {
      return res.status(400).json({ error: "Please confirm you've read the emergency notice." });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Retry a few times in the astronomically unlikely event of a code
    // collision (unique constraint would reject it) rather than failing
    // the whole check-in over it.
    let ticket, error;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const result = await supabaseAdmin.from("tickets").insert({
        client_phone: phone.trim(),
        client_code: code,
        onset: onset.trim(),
        location: location?.trim() || null,
        duration: duration?.trim() || null,
        character: character?.trim() || null,
        aggravating_factors: aggravating_factors?.trim() || null,
        relieving_factors: relieving_factors?.trim() || null,
        timing: timing?.trim() || null,
        severity_level,
        severity_description: severity_description?.trim() || null,
        additional_notes: additional_notes?.trim() || null,
        emergency_disclaimer_acknowledged: true,
        payment_expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      }).select("id, client_code").single();

      if (!result.error) { ticket = result.data; break; }
      if (!String(result.error.message || "").includes("client_code")) { error = result.error; break; }
      // else: code collision, loop and try a fresh one
    }

    if (!ticket) return res.status(500).json({ error: "Could not submit check-in: " + (error?.message || "please try again") });

    return res.status(200).json({ ticketId: ticket.id, clientCode: ticket.client_code });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
