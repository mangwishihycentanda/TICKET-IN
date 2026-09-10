import { getSupabaseAdmin } from "./_lib.js";

// POST /api/submit-checkin-payment
// No auth - but re-verifies the ticket actually belongs to this
// phone+code before accepting a payment record, so knowing a ticketId
// alone isn't enough to submit a payment against someone else's ticket.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { ticketId, phone, code, referenceNote } = req.body || {};
    if (!ticketId || !phone || !code) return res.status(400).json({ error: "Missing required fields." });
    if (!referenceNote || !referenceNote.trim()) return res.status(400).json({ error: "Transaction reference is required." });

    const supabaseAdmin = getSupabaseAdmin();

    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from("tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("client_phone", phone.trim())
      .eq("client_code", code.trim().toUpperCase())
      .single();

    if (ticketErr || !ticket) return res.status(404).json({ error: "Ticket not found for that phone number and code." });

    const { error: payErr } = await supabaseAdmin.from("ticket_payments").insert({
      ticket_id: ticketId,
      amount: 1600,
      payment_method: "manual_momo",
      reference_note: referenceNote.trim(),
      status: "pending",
    });

    if (payErr) return res.status(500).json({ error: "Could not submit payment: " + payErr.message });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
