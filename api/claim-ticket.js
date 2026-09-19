import { getAuthedUser, getSupabaseAdmin, sendAdminAlert } from "./_lib.js";

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

  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: authErr });

    if (user.role !== "staff") return res.status(403).json({ error: "Only staff accounts can claim tickets." });
    if (user.staff_verification_status !== "verified") {
      return res.status(403).json({ error: "Your staff account is not yet verified." });
    }

    const { ticketId } = req.body || {};
    if (!ticketId) return res.status(400).json({ error: "ticketId is required." });

    const supabaseAdmin = getSupabaseAdmin();

    // Hospital-scoping check, ahead of the atomic claim below: an
    // in-person ticket only belongs to one hospital's queue - a doctor
    // not on that hospital's roster (including a freelance doctor with
    // no hospital_id at all) must never be able to claim it, even though
    // RLS already narrows what they can SEE. This is the same "check it
    // server-side too, don't rely on RLS alone" discipline the rest of
    // this file already follows for the claim itself.
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from("tickets").select("id, status, consult_type, hospital_id").eq("id", ticketId).single();
    if (ticketErr || !ticket) return res.status(404).json({ error: "Ticket not found." });
    if (ticket.consult_type === "in_person" && ticket.hospital_id !== user.hospital_id) {
      return res.status(403).json({ error: "This ticket belongs to a different hospital's queue." });
    }

    // Belt-and-braces: re-affirm hospital scope inside the same atomic
    // update, not just in the pre-check above. Postgres/PostgREST treat
    // NULL specially, so a remote ticket (hospital_id is null) needs
    // .is(), not .eq(null) - .eq() with a null value does not match rows.
    let updateQuery = supabaseAdmin
      .from("tickets")
      .update({ status: "claimed", claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("id", ticketId)
      .eq("status", "open");   // <- the atomicity guarantee lives entirely in this line
    updateQuery = ticket.hospital_id
      ? updateQuery.eq("hospital_id", ticket.hospital_id)
      : updateQuery.is("hospital_id", null);
    const { data, error } = await updateQuery.select("id").single();

    if (error || !data) {
      // Zero rows matched - someone else already claimed it, or it was
      // never open in the first place. Not a server error, a real outcome.
      return res.status(409).json({ error: "This ticket was already claimed by someone else, or is no longer open." });
    }

    return res.status(200).json({ ok: true, ticketId: data.id });
  } catch (e) {
    await sendAdminAlert("claim-ticket crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
