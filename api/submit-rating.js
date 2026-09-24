import { getSupabaseAdmin, getClientIp, checkRateLimit } from "./_lib.js";

// POST /api/submit-rating
// body: { ticketId, phone, code, rating, comment }
//
// Deliberately unauthenticated, like lookup-ticket.js and
// submit-checkin-payment.js - clients have no account at all. Ownership
// is proven the same way as everywhere else: phone + client_code must
// match the ticket. Only a resolved ticket can be rated, and the
// ratings_ticket_id_unique_idx unique index (not just this check) is
// what actually stops a double-submit from creating two ratings for the
// same consultation - this check just gives a friendlier error first.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
