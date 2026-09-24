import { getAuthedUser, getSupabaseAdmin, sendAdminAlert } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: authErr });
    if (user.role !== "staff") return res.status(403).json({ error: "Staff only." });

    const { ticketId } = req.body || {};
    if (!ticketId) return res.status(400).json({ error: "ticketId is required." });

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .update({ status: "in_progress" })
      .eq("id", ticketId)
      .eq("claimed_by", user.id)
      .eq("status", "claimed")
      .select("id")
      .single();

    if (error || !data) {
      return res.status(409).json({ error: "Could not start this consultation - it may already be started, or is no longer yours." });
    }

    return res.status(200).json({ ok: true, ticketId: data.id });
  } catch (e) {
    await sendAdminAlert("start-consultation crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
