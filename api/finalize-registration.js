import { getAuthedUser, getSupabaseAdmin, sendAdminAlert } from "./_lib.js";

// POST /api/finalize-registration
// body: { role: "staff"|"hospital", ...role-specific fields }
//
// Replaces a client-side `profiles.update({ role: "staff" })` call that
// looked like it worked but didn't: protect_profile_privileged_fields()
// silently reverts any client-side change to `role` unless the caller is
// service_role, or is an admin acting on a DIFFERENT user's row. A
// freshly-signed-up user updating their OWN row matches neither
// exception, so every "Professional Sign Up" (and now hospital sign-up)
// needs to go through service_role instead - this endpoint is that path.
//
// Deliberately requires the caller's current role to still be "client" -
// this is a one-time finalization step right after signup, not a general
// role-change endpoint (that's Manage Users, admin-only, already built).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: authErr });
    if (user.role !== "client") {
      return res.status(409).json({ error: "This account has already been registered." });
    }

    const { role, licenseNumber, issuingInstitution, specialty, hospitalName, hospitalTown, hospitalPhone, hospitalAddress } = req.body || {};
    if (!["staff", "hospital"].includes(role)) {
      return res.status(400).json({ error: "role must be 'staff' or 'hospital'." });
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (role === "staff") {
      if (!licenseNumber?.trim() || !issuingInstitution?.trim()) {
        return res.status(400).json({ error: "License number and issuing institution are required." });
      }
      const { error: roleErr } = await supabaseAdmin.from("profiles").update({ role: "staff" }).eq("id", user.id);
      if (roleErr) return res.status(500).json({ error: "Could not finalize registration: " + roleErr.message });

      const { error: credErr } = await supabaseAdmin.from("staff_credentials").insert({
        staff_id: user.id, license_number: licenseNumber.trim(),
        issuing_institution: issuingInstitution.trim(), specialty: specialty?.trim() || null,
      });
      if (credErr) {
        await sendAdminAlert("finalize-registration: staff credentials insert failed", "staff_id=" + user.id + " error=" + credErr.message);
        return res.status(500).json({ error: "Account role set, but could not save credentials: " + credErr.message });
      }
    } else {
      if (!hospitalName?.trim() || !hospitalTown?.trim()) {
        return res.status(400).json({ error: "Hospital name and town are required." });
      }
      const { error: roleErr } = await supabaseAdmin.from("profiles").update({ role: "hospital" }).eq("id", user.id);
      if (roleErr) return res.status(500).json({ error: "Could not finalize registration: " + roleErr.message });

      const { error: hospErr } = await supabaseAdmin.from("hospitals").insert({
        created_by: user.id, name: hospitalName.trim(), town: hospitalTown.trim(),
        phone: hospitalPhone?.trim() || null, address: hospitalAddress?.trim() || null,
      });
      if (hospErr) {
        await sendAdminAlert("finalize-registration: hospital insert failed", "user_id=" + user.id + " error=" + hospErr.message);
        return res.status(500).json({ error: "Account role set, but could not save hospital details: " + hospErr.message });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    await sendAdminAlert("finalize-registration crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
