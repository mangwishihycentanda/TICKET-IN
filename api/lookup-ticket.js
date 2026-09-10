import { getSupabaseAdmin } from "./_lib.js";

// POST /api/lookup-ticket
// No auth - phone + client_code together act as the lookup credential.
// Deliberately never returns clinical notes (those stay in their own
// admin/staff-only table, untouched by this endpoint) - only the
// ticket's own status and the plain-language resolution_summary
// staff write specifically for the client to read.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ error: "Phone number and code are required." });

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select("id, status, onset, created_at, resolution_summary, resolved_at")
      .eq("client_phone", phone.trim())
      .eq("client_code", code.trim().toUpperCase())
      .single();

    if (error || !data) return res.status(404).json({ error: "No ticket found for that phone number and code." });

    return res.status(200).json({ ticket: data });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
