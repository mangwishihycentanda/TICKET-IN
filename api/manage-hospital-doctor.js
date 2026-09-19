import { getAuthedUser, getSupabaseAdmin, sendAdminAlert } from "./_lib.js";

// POST /api/manage-hospital-doctor
// body: { action: "link", doctorEmail } | { action: "unlink", doctorId }
//
// hospital_id on a staff member's profile is a protected field (see the
// migration) - only service_role can set it, so this is the only way a
// hospital account can build its doctor roster. Deliberately identifies
// an existing staff account by email rather than creating a new one:
// doctors already register themselves through the normal staff sign-up
// (with their own credentials, verified independently by an admin) - a
// hospital is affiliating an existing professional, not vouching for or
// creating their account.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: authErr });
    if (user.role !== "hospital") return res.status(403).json({ error: "Only hospital accounts can manage a doctor roster." });

    const supabaseAdmin = getSupabaseAdmin();

    const { data: hospital, error: hospErr } = await supabaseAdmin
      .from("hospitals").select("id").eq("created_by", user.id).single();
    if (hospErr || !hospital) return res.status(404).json({ error: "No hospital record found for this account." });

    const { action } = req.body || {};

    if (action === "link") {
      const { doctorEmail } = req.body || {};
      if (!doctorEmail?.trim()) return res.status(400).json({ error: "doctorEmail is required." });

      const { data: doctor, error: docErr } = await supabaseAdmin
        .from("profiles").select("id, role, hospital_id, name")
        .eq("email", doctorEmail.trim().toLowerCase()).maybeSingle();
      if (docErr) return res.status(500).json({ error: "Lookup failed: " + docErr.message });
      if (!doctor || doctor.role !== "staff") {
        return res.status(404).json({ error: "No registered healthcare professional found with that email." });
      }
      if (doctor.hospital_id && doctor.hospital_id !== hospital.id) {
        return res.status(409).json({ error: "This professional is already affiliated with another hospital." });
      }
      if (doctor.hospital_id === hospital.id) {
        return res.status(200).json({ ok: true, alreadyLinked: true, name: doctor.name });
      }

      const { error: updErr } = await supabaseAdmin.from("profiles").update({ hospital_id: hospital.id }).eq("id", doctor.id);
      if (updErr) return res.status(500).json({ error: "Could not add doctor: " + updErr.message });
      return res.status(200).json({ ok: true, name: doctor.name });
    }

    if (action === "unlink") {
      const { doctorId } = req.body || {};
      if (!doctorId) return res.status(400).json({ error: "doctorId is required." });

      const { data: doctor, error: docErr } = await supabaseAdmin
        .from("profiles").select("id, hospital_id").eq("id", doctorId).single();
      if (docErr || !doctor) return res.status(404).json({ error: "Doctor not found." });
      if (doctor.hospital_id !== hospital.id) {
        return res.status(403).json({ error: "This professional is not on your roster." });
      }

      const { error: updErr } = await supabaseAdmin.from("profiles").update({ hospital_id: null }).eq("id", doctorId);
      if (updErr) return res.status(500).json({ error: "Could not remove doctor: " + updErr.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "action must be 'link' or 'unlink'." });
  } catch (e) {
    await sendAdminAlert("manage-hospital-doctor crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
