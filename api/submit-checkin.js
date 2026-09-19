import { getSupabaseAdmin, getClientIp, checkRateLimit, sendAdminAlert } from "./_lib.js";

// POST /api/submit-checkin
// Deliberately NO authentication - this is the whole point. A client
// checks in with just a phone number, no account. Generates a
// client_code (excludes visually ambiguous characters - no 0/O, 1/I/L)
// that, combined with the phone number, is how they look up their
// ticket later via /api/lookup-ticket. Not bank-grade security, but a
// reasonable level for this - matches an order-lookup code, not a
// password.
//
// Rate limited two ways: per-phone (catches one number spamming
// check-ins) and per-IP (catches one source using many fake numbers).
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
      is_adult, guardian_name, guardian_phone,
      consult_type, hospital_id,
    } = req.body || {};

    const consultType = consult_type === "in_person" ? "in_person" : "remote";
    if (consult_type && !["remote", "in_person"].includes(consult_type)) {
      return res.status(400).json({ error: "consult_type must be 'remote' or 'in_person'." });
    }

    if (!phone || !phone.trim()) return res.status(400).json({ error: "Phone number is required." });
    if (!onset || !onset.trim()) return res.status(400).json({ error: "Onset is required." });
    if (!severity_level || severity_level < 1 || severity_level > 10) {
      return res.status(400).json({ error: "A severity level (1-10) is required." });
    }
    if (!emergency_disclaimer_acknowledged) {
      return res.status(400).json({ error: "Please confirm you've read the emergency notice." });
    }
    if (is_adult === undefined || is_adult === null) {
      return res.status(400).json({ error: "Please confirm whether you are 18 or older." });
    }
    const isMinor = is_adult !== true;
    if (isMinor && (!guardian_name?.trim() || !guardian_phone?.trim())) {
      return res.status(400).json({ error: "A parent or guardian's name and phone number are required for anyone under 18." });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // in_person requires a real, currently-verified hospital - checked
    // server-side against the DB, never trusted from the client. A stale
    // or fabricated hospital_id (hospital since un-verified, or just
    // made up) must not be able to create an orphaned ticket no doctor
    // will ever see.
    if (consultType === "in_person") {
      if (!hospital_id) return res.status(400).json({ error: "Please choose a hospital for an in-person visit." });
      const { data: hospital, error: hospErr } = await supabaseAdmin
        .from("hospitals").select("id, created_by").eq("id", hospital_id).maybeSingle();
      if (hospErr || !hospital) return res.status(400).json({ error: "That hospital could not be found. Please pick one from the list." });
      const { data: hospProfile } = await supabaseAdmin
        .from("profiles").select("staff_verification_status").eq("id", hospital.created_by).single();
      if (hospProfile?.staff_verification_status !== "verified") {
        return res.status(400).json({ error: "That hospital is not currently accepting check-ins. Please pick another." });
      }
    }

    const phoneOk = await checkRateLimit(supabaseAdmin, phone.trim(), "submit-checkin", 5, 60);
    if (!phoneOk) return res.status(429).json({ error: "Too many check-ins from this phone number. Please wait a while before trying again." });
    const ipOk = await checkRateLimit(supabaseAdmin, getClientIp(req), "submit-checkin", 10, 60);
    if (!ipOk) return res.status(429).json({ error: "Too many check-ins from this connection. Please wait a while before trying again." });

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
        is_minor: isMinor,
        guardian_name: isMinor ? guardian_name.trim() : null,
        guardian_phone: isMinor ? guardian_phone.trim() : null,
        consult_type: consultType,
        hospital_id: consultType === "in_person" ? hospital_id : null,
        payment_expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      }).select("id, client_code").single();

      if (!result.error) { ticket = result.data; break; }
      if (!String(result.error.message || "").includes("client_code")) { error = result.error; break; }
      // else: code collision, loop and try a fresh one
    }

    if (!ticket) {
      await sendAdminAlert("Check-in submission failed", "phone=" + phone.trim() + " error=" + (error?.message || "unknown"));
      return res.status(500).json({ error: "Could not submit check-in: " + (error?.message || "please try again") });
    }

    return res.status(200).json({ ticketId: ticket.id, clientCode: ticket.client_code });
  } catch (e) {
    await sendAdminAlert("submit-checkin crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
