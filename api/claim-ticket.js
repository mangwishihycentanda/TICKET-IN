import { getAuthedUser, getSupabaseAdmin } from "./_lib.js";

// POST /api/claim-ticket
// body: { ticketId: string }
//
// This is deliberately the ONE place ticket claiming happens - never a
// bare client-side update. The whole point of this endpoint is the single
// conditional UPDATE below: "SET status='claimed', claimed_by=X WHERE
// id=Y AND status='open'". Postgres executes that as one atomic
// operation - if two staff members click Claim on the same ticket at
// nearly the same instant, only the first UPDATE actually matches a row
// (status is still 'open' for it); by the time the second one runs,
// status is already 'claimed', so its WHERE clause matches zero rows.
// We can tell which happened just by checking how many rows came back -
// no separate locking, no race condition, no way for two staff to ever
// both "win" the same ticket.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { user, error: authErr } = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: authErr });

  if (user.role !== "staff") return res.status(403).json({ error: "Only staff accounts can claim tickets." });
  if (user.staff_verification_status !== "verified") {
    return res.status(403).json({ error: "Your staff account is not yet verified." });
  }

  const { ticketId } = req.body || {};
  if (!ticketId) return res.status(400).json({ error: "ticketId is required." });

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .update({ status: "claimed", claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("status", "open")   // <- the atomicity guarantee lives entirely in this line
    .select("id")
    .single();

  if (error || !data) {
    // Zero rows matched - someone else already claimed it, or it was
    // never open in the first place. Not a server error, a real outcome.
    return res.status(409).json({ error: "This ticket was already claimed by someone else, or is no longer open." });
  }

  return res.status(200).json({ ok: true, ticketId: data.id });
}
