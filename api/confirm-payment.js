import { getAuthedUser, getSupabaseAdmin } from "./_lib.js";

// POST /api/confirm-payment
// body: { paymentId: string }
// Admin only. Deliberately a single server endpoint doing BOTH state
// transitions (payment -> completed, ticket -> open) rather than two
// separate client-side updates - PastQ had a real bug earlier this
// session where a payment got marked completed but the linked profile
// update silently failed, leaving an inconsistent state that only got
// caught by accident. Doing both steps here, checking each one
// explicitly, and reporting exactly which step failed if either does.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: authErr });
    if (user.role !== "admin") return res.status(403).json({ error: "Admin only." });

    const { paymentId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: "paymentId is required." });

    const supabaseAdmin = getSupabaseAdmin();

    const { data: payment, error: payErr } = await supabaseAdmin
      .from("ticket_payments")
      .update({ status: "completed" })
      .eq("id", paymentId)
      .eq("status", "pending")   // atomic guard against double-approval
      .select("id, ticket_id, staff_fee")
      .single();

    if (payErr || !payment) {
      return res.status(409).json({ error: "Payment could not be confirmed - it may already be processed." });
    }

    const { error: ticketErr } = await supabaseAdmin
      .from("tickets")
      .update({ status: "open" })
      .eq("id", payment.ticket_id)
      .eq("status", "form_submitted");   // atomic guard - only opens a ticket still awaiting payment

    if (ticketErr) {
      // Payment is already marked completed at this point - report this
      // clearly rather than silently leaving an inconsistent state, same
      // failure mode PastQ had.
      return res.status(500).json({
        error: "Payment confirmed, but the ticket could not be opened: " + ticketErr.message + ". This needs manual review.",
      });
    }

    return res.status(200).json({ ok: true, ticketId: payment.ticket_id });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
