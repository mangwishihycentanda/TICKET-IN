import { getSupabaseAdmin, getClientIp, checkRateLimit } from "./_lib.js";

// POST /api/lookup-ticket
// body: { phone, code } for a status lookup, or { action: "rate", phone,
// code, ticketId, rating, comment } to submit a rating.
//
// Combined with what used to be submit-rating.js into one file - Vercel's
// Hobby plan caps a project at 12 serverless functions, and adding a
// 13th (submit-rating.js) made every deployment since fail with
// exceeded_serverless_functions_per_deployment. Merging these two into
// one function (an internal switch on `action`) was the free fix, since
// they're both small, both unauthenticated, both gated by the same
// phone+code ownership check, and both about a client's own ticket.
//
// No auth on either branch - phone + client_code together act as the
// lookup credential, since clients never get a real account.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action } = req.body || {};
  if (action === "rate") return handleRate(req, res);
  return handleLookup(req, res);
}

// Deliberately never returns clinical notes (those stay in their own
// admin/staff-only table, untouched by this endpoint) - only the
// ticket's own status and the plain-language resolution_summary staff
// write specifically for the client to read.
//
// Rate limited tightly by IP - this is specifically the endpoint that
// matters most for brute-force resistance (guessing a code against a
// known/guessed phone number), so the limit here is stricter than the
// others.
async function handleLookup(req, res) {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: "Phone number and code are required." });

    const supabaseAdmin = getSupabaseAdmin();

    const ok = await checkRateLimit(supabaseAdmin, getClientIp(req), "lookup-ticket", 15, 15);
    if (!ok) return res.status(429).json({ error: "Too many attempts. Please wait a few minutes before trying again." });

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select("id, status, onset, created_at, resolution_summary, resolved_at")
      .eq("client_phone", phone.trim())
      .eq("client_code", code.trim().toUpperCase())
      .single();

    if (error || !data) return res.status(404).json({ error: "No ticket found for that phone number and code." });

    // Already-rated check, so the UI can hide the rating form instead of
    // letting a client try to submit a second one (the ratings table's
    // unique index would reject it anyway, but this avoids the round trip).
    let alreadyRated = false;
    if (data.status === "resolved") {
      const { count } = await supabaseAdmin
        .from("ratings").select("id", { count: "exact", head: true }).eq("ticket_id", data.id);
      alreadyRated = (count || 0) > 0;
    }

    return res.status(200).json({ ticket: { ...data, already_rated: alreadyRated } });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}

// Ownership is proven the same way as everywhere else: phone +
// client_code must match the ticket. Only a resolved ticket can be
// rated, and the ratings_ticket_id_unique_idx unique index (not just
// this check) is what actually stops a double-submit from creating two
// ratings for the same consultation - this check just gives a friendlier
// error first.
async function handleRate(req, res) {
  try {
    const { ticketId, phone, code, rating, comment } = req.body || {};
    if (!ticketId || !phone || !code) return res.status(400).json({ error: "Missing required fields." });
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "Rating must be a whole number from 1 to 5." });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const ok = await checkRateLimit(supabaseAdmin, getClientIp(req), "submit-rating", 10, 60);
    if (!ok) return res.status(429).json({ error: "Too many attempts. Please wait a while before trying again." });

    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from("tickets")
      .select("id, status, claimed_by")
      .eq("id", ticketId)
      .eq("client_phone", phone.trim())
      .eq("client_code", code.trim().toUpperCase())
      .single();

    if (ticketErr || !ticket) return res.status(404).json({ error: "Ticket not found for that phone number and code." });
    if (ticket.status !== "resolved") return res.status(400).json({ error: "This consultation isn't resolved yet." });
    if (!ticket.claimed_by) return res.status(400).json({ error: "This ticket has no staff member to rate." });

    const { error: insertErr } = await supabaseAdmin.from("ratings").insert({
      ticket_id: ticketId,
      staff_id: ticket.claimed_by,
      rating: ratingNum,
      comment: comment?.trim() || null,
    });

    if (insertErr) {
      if (insertErr.message?.includes("ratings_ticket_id_unique_idx")) {
        return res.status(409).json({ error: "You've already rated this consultation." });
      }
      return res.status(500).json({ error: "Could not submit rating: " + insertErr.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
