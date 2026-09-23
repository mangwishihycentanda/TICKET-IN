import { getAuthedUser, getSupabaseAdmin, sendAdminAlert } from "./_lib.js";

// POST /api/resolve-ticket
// body: { ticketId, notes: { objective_assessment, clinical_diagnosis, plan, implementation, evaluation }, summary }
//
// Replaces what used to be three separate client-side calls (insert
// clinical note, update ticket to resolved, and - missing entirely -
// create a payout record) with one server endpoint. staff_payouts has
// no client-side INSERT policy at all (checked supabase-schema.sql -
// only "select own or admin" and "update admin" exist), so a payout row
// could never have been created from the browser in the first place;
// doing the whole resolution here, service-role, is the only way a
// doctor's work actually earns a trackable payout.
//
// The ticket update's WHERE clause (status='in_progress' AND
// claimed_by=caller) is the same atomic-guard pattern as claim-ticket.js
// and confirm-payment.js: it's also what prevents a double-submit (e.g.
// a slow network + a second click) from creating two payout rows for
// the same consultation.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: authErr });
    if (user.role !== "staff") return res.status(403).json({ error: "Staff only." });

    const { ticketId, notes, summary } = req.body || {};
    if (!ticketId) return res.status(400).json({ error: "ticketId is required." });
    if (!summary || !String(summary).trim()) return res.status(400).json({ error: "A summary for the client is required." });

    const supabaseAdmin = getSupabaseAdmin();
    const n = notes || {};

    const { error: noteErr } = await supabaseAdmin.from("ticket_clinical_notes").insert({
      ticket_id: ticketId,
      staff_id: user.id,
      objective_assessment: n.objective_assessment || null,
      clinical_diagnosis: n.clinical_diagnosis || null,
      plan: n.plan || null,
      implementation: n.implementation || null,
      evaluation: n.evaluation || null,
    });
    if (noteErr) return res.status(500).json({ error: "Could not save notes: " + noteErr.message });

    const { data: ticket, error: tErr } = await supabaseAdmin
      .from("tickets")
      .update({ status: "resolved", resolution_summary: String(summary).trim(), resolved_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("claimed_by", user.id)
      .eq("status", "in_progress")   // atomic guard: only resolves a ticket the caller actually has in progress, and only once
      .select("id")
      .single();

    if (tErr || !ticket) {
      return res.status(409).json({ error: "Could not resolve - this ticket may already be resolved, or is no longer yours." });
    }

    const { error: payoutErr } = await supabaseAdmin.from("staff_payouts").insert({
      ticket_id: ticketId,
      staff_id: user.id,
    });
    if (payoutErr) {
      // The consultation itself is already resolved for the client at
      // this point - that must not be rolled back over a payout-tracking
      // failure. But a doctor whose work silently earns nothing is a
      // real problem, so alert immediately rather than let it go unnoticed.
      await sendAdminAlert(
        "Ticket resolved but payout record failed - needs manual creation",
        "ticketId=" + ticketId + " staffId=" + user.id + " error=" + payoutErr.message
      );
      return res.status(200).json({ ok: true, ticketId, payoutWarning: true });
    }

    return res.status(200).json({ ok: true, ticketId });
  } catch (e) {
    await sendAdminAlert("resolve-ticket crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
