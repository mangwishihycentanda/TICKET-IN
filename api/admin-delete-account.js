import { getAuthedUser, getSupabaseAdmin, sendAdminAlert } from "./_lib.js";

// POST /api/admin-delete-account
// body: { userId: string }
// Admin only. Permanently deletes a staff or hospital account (profile +
// auth user + their own dependent rows). Deliberately scoped narrower than
// "delete any user":
//
//   - Never deletes a client or another admin from this endpoint. Clients
//     have no account to delete (unauthenticated by design - see
//     submit-checkin.js); wiping an admin account is dangerous enough that
//     it should never be a single click, so it isn't offered here at all.
//   - Refuses to delete a staff/hospital account that has any real
//     activity attached (claimed tickets, clinical notes, payouts,
//     ratings, forum posts, or - for a hospital - tickets routed to it or
//     doctors on its roster). This is a hard delete with no undo, and
//     none of those tables cascade on profile/hospital deletion (checked
//     against supabase-schema.sql and every migration - no ON DELETE
//     CASCADE exists anywhere in this schema), so deleting a row with
//     real dependents would either fail loudly (foreign key violation) or,
//     worse, silently orphan real user data. A fresh test account with no
//     activity is exactly what this was built to clean up; an account
//     with real history should be deactivated, not deleted - deactivation
//     isn't built yet, so for now this endpoint just refuses and says why.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) return res.status(401).json({ error: authErr });
    if (user.role !== "admin") return res.status(403).json({ error: "Admin only." });

    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required." });
    if (userId === user.id) return res.status(400).json({ error: "You cannot delete your own account here." });

    const supabaseAdmin = getSupabaseAdmin();

    const { data: target, error: targetErr } = await supabaseAdmin
      .from("profiles").select("id, name, role").eq("id", userId).maybeSingle();
    if (targetErr || !target) return res.status(404).json({ error: "Account not found." });
    if (target.role !== "staff" && target.role !== "hospital") {
      return res.status(400).json({ error: "This endpoint can only delete staff or hospital accounts." });
    }

    if (target.role === "staff") {
      const checks = await Promise.all([
        supabaseAdmin.from("tickets").select("id", { count: "exact", head: true }).eq("claimed_by", userId),
        supabaseAdmin.from("ticket_clinical_notes").select("id", { count: "exact", head: true }).eq("staff_id", userId),
        supabaseAdmin.from("staff_payouts").select("id", { count: "exact", head: true }).eq("staff_id", userId),
        supabaseAdmin.from("ratings").select("id", { count: "exact", head: true }).eq("staff_id", userId),
        supabaseAdmin.from("forum_posts").select("id", { count: "exact", head: true }).eq("staff_id", userId),
      ]);
      const total = checks.reduce((sum, c) => sum + (c.count || 0), 0);
      if (total > 0) {
        return res.status(409).json({
          error: "This staff account has real activity (claimed tickets, notes, payouts, ratings, or forum posts) and cannot be deleted. Deactivation for accounts with history isn't built yet - ask to add it if you need to disable this account.",
        });
      }
      await supabaseAdmin.from("staff_credentials").delete().eq("staff_id", userId);
    } else {
      const { data: hospital } = await supabaseAdmin
        .from("hospitals").select("id").eq("created_by", userId).maybeSingle();
      if (hospital) {
        const checks = await Promise.all([
          supabaseAdmin.from("tickets").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        ]);
        const total = checks.reduce((sum, c) => sum + (c.count || 0), 0);
        if (total > 0) {
          return res.status(409).json({
            error: "This hospital has real activity (tickets routed to it or doctors on its roster) and cannot be deleted. Deactivation for accounts with history isn't built yet - ask to add it if you need to disable this account.",
          });
        }
        await supabaseAdmin.from("hospitals").delete().eq("id", hospital.id);
      }
    }

    const { error: profileDeleteErr } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
    if (profileDeleteErr) {
      await sendAdminAlert("admin-delete-account: profile delete failed", "userId=" + userId + " error=" + profileDeleteErr.message);
      return res.status(500).json({ error: "Could not delete the profile: " + profileDeleteErr.message });
    }

    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteErr) {
      // Profile row is already gone at this point - the account is
      // effectively disabled (no profile means no role, no access) but
      // the auth.users row itself is now orphaned and needs manual
      // cleanup in the Supabase dashboard. Same "alert immediately on
      // partial failure" discipline as confirm-payment.js.
      await sendAdminAlert(
        "admin-delete-account: profile deleted but auth user delete failed - needs manual cleanup",
        "userId=" + userId + " error=" + authDeleteErr.message
      );
      return res.status(500).json({
        error: "The profile was deleted but the login account itself could not be removed: " + authDeleteErr.message + ". This needs manual cleanup in Supabase.",
      });
    }

    return res.status(200).json({ ok: true, deletedName: target.name });
  } catch (e) {
    await sendAdminAlert("admin-delete-account crashed", e.message || String(e));
    return res.status(500).json({ error: "Unexpected server error: " + (e.message || String(e)) });
  }
}
