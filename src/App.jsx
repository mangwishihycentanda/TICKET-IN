import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient.js";

// ============================================================================
// THEME
// ============================================================================
const C = {
  navy: "#0D2B3E", teal: "#1E7A6F", tealL: "#E4F3F0", tealB: "#9CCFC5",
  gold: "#C9A34E",
  ink: "#1A1A1A", body: "#3A3A3A", muted: "#767676",
  bg: "#F7F9F9", surf: "#EFF3F3", white: "#FFFFFF", border: "#E1E6E6",
  green: "#1E6E42", greenL: "#EAF6EE", greenB: "#7EC8A0",
  red: "#B82818", redL: "#FDECEA", redB: "#E0907E",
};

const PLAN_AMOUNT = 1600;
const STAFF_SUB_AMOUNT = 5500;

// ============================================================================
// SHARED UI
// ============================================================================
export const Btn = ({ label, onClick, primary, small, full, disabled, loading }) => (
  <button onClick={onClick} disabled={disabled || loading} style={{
    padding: small ? "8px 14px" : "11px 18px",
    fontSize: small ? 12 : 14, fontWeight: 700, borderRadius: 10, cursor: disabled || loading ? "default" : "pointer",
    border: primary ? "none" : "1.5px solid " + C.border,
    background: disabled ? C.surf : primary ? C.teal : C.white,
    color: disabled ? C.muted : primary ? "#fff" : C.body,
    width: full ? "100%" : "auto", fontFamily: "system-ui", opacity: loading ? 0.7 : 1,
  }}>{loading ? "..." : label}</button>
);

export const Field = ({ label, value, onChange, type = "text", placeholder, rows, required }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>
      {label}{required && <span style={{ color: C.red }}> *</span>}
    </label>
    {rows ? (
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 9, border: "1.5px solid " + C.border, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
    ) : (
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 9, border: "1.5px solid " + C.border, fontFamily: "system-ui", outline: "none", boxSizing: "border-box" }} />
    )}
  </div>
);

export const Tag = ({ children, kind }) => {
  const kinds = {
    open: [C.teal, C.tealL], claimed: [C.gold, "#FBF0D6"], in_progress: [C.gold, "#FBF0D6"],
    resolved: [C.green, C.greenL], form_submitted: [C.muted, C.surf], expired: [C.red, C.redL],
    pending: [C.gold, "#FBF0D6"], completed: [C.green, C.greenL], failed: [C.red, C.redL],
    verified: [C.green, C.greenL],
  };
  const [fg, bg] = kinds[kind] || [C.muted, C.surf];
  return <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, color: fg, background: bg, textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</span>;
};

const Toast = ({ msg, ok, show }) => !show ? null : (
  <div style={{ position: "fixed", top: 14, right: 14, zIndex: 600, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,.12)", background: ok ? C.greenL : C.redL, border: "1px solid " + (ok ? C.greenB : C.redB), color: ok ? C.green : C.red }}>
    {msg}
  </div>
);

const Modal = ({ open, onClose, title, children }) => !open ? null : (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
    <div style={{ background: C.white, borderRadius: 16, padding: 22, maxWidth: 460, width: "100%", maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{title}</div>
        <button onClick={onClose} style={{ background: C.surf, border: "none", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>x</button>
      </div>
      {children}
    </div>
  </div>
);

const OLDCART_FIELDS = [
  ["onset", "Onset", "When did this start?"],
  ["location", "Location", "Where on the body?"],
  ["duration", "Duration", "How long has it lasted?"],
  ["character", "Character", "What does it feel like?"],
  ["aggravating_factors", "Aggravating Factors", "What makes it worse?"],
  ["relieving_factors", "Relieving Factors", "What makes it better?"],
  ["timing", "Timing", "Constant, or does it come and go?"],
];

const EMERGENCY_THRESHOLD = 8; // severity_level at or above this triggers urgent flagging + emergency messaging

export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | auth | app
  const [isReg, setIsReg] = useState(true);
  const [authName, setAuthName] = useState(""), [authEmail, setAuthEmail] = useState(""), [authPass, setAuthPass] = useState("");
  const [authRole, setAuthRole] = useState("client");
  const [authBusy, setAuthBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("checkin");
  const [toast, setToast] = useState({ show: false, msg: "", ok: true });

  function notify(msg, ok = true) {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }

  const isClient = user && user.role === "client";
  const isStaff = user && user.role === "staff";
  const isAdmin = user && user.role === "admin";

  // -- AUTH --
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (session?.user) { await loadProfileIntoUser(session.user); setScreen("app"); }
      else setScreen("landing");
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") { setUser(null); setScreen("landing"); }
      else if (session?.user) { await loadProfileIntoUser(session.user); setScreen("app"); }
    });
    return () => { active = false; listener?.subscription?.unsubscribe(); };
  }, []);

  async function loadProfileIntoUser(authUser) {
    const { data: profile, error } = await supabase.from("profiles")
      .select("name, role, staff_verification_status").eq("id", authUser.id).single();
    if (error) {
      const name = authUser.email.split("@")[0];
      setUser({ id: authUser.id, name, role: "client" });
      setPage("checkin");
      return;
    }
    setUser({ id: authUser.id, name: profile.name || authUser.email.split("@")[0], role: profile.role, staff_verification_status: profile.staff_verification_status });
    // Default to the first tab that role actually has access to - previously
    // always defaulted to "checkin", which is blank/inaccessible for a
    // staff or admin account, leaving them on an empty screen until they
    // manually clicked a nav item.
    if (profile.role === "admin") setPage("admin");
    else if (profile.role === "staff") setPage("staffboard");
    else setPage("checkin");
  }

  async function handleAuth() {
    if (!authEmail || !authPass) { notify("Email and password required.", false); return; }
    setAuthBusy(true);
    if (isReg) {
      if (!authName.trim()) { setAuthBusy(false); notify("Name is required.", false); return; }
      const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPass, options: { data: { name: authName, role: authRole } } });
      setAuthBusy(false);
      if (error) { notify(error.message, false); return; }
      if (data.user) {
        // Trigger always forces role='client' server-side regardless of what
        // was sent above - if this account should be staff, set that
        // explicitly as a one-time follow-up update.
        if (authRole === "staff") await supabase.from("profiles").update({ role: "staff" }).eq("id", data.user.id);
      }
      notify("Account created!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
      setAuthBusy(false);
      if (error) { notify(error.message, false); return; }
    }
  }

  async function logout() { await supabase.auth.signOut(); setPage("checkin"); }

  // -- CHECK-IN FORM --
  const [ticketForm, setTicketForm] = useState({ onset: "", location: "", duration: "", character: "", aggravating_factors: "", relieving_factors: "", timing: "", severity_description: "", additional_notes: "" });
  const [severityLevel, setSeverityLevel] = useState(null);
  const [emergencyAck, setEmergencyAck] = useState(false);
  const [showEmergencyWarning, setShowEmergencyWarning] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [pendingTicketId, setPendingTicketId] = useState(null);
  const [showPay, setShowPay] = useState(false);
  const [momoDetails, setMomoDetails] = useState(null);
  const [momoDetailsError, setMomoDetailsError] = useState("");
  const [momoCopied, setMomoCopied] = useState(false);
  const [momoRef, setMomoRef] = useState("");
  const [momoBusy, setMomoBusy] = useState(false);

  async function submitCheckIn() {
    if (!emergencyAck) {
      notify("Please confirm you've read the emergency notice before continuing.", false); return;
    }
    if (!ticketForm.onset.trim() || !severityLevel) {
      notify("Please fill in at least Onset and Severity.", false); return;
    }
    setTicketBusy(true);
    const { data, error } = await supabase.from("tickets").insert({
      client_id: user.id, ...ticketForm,
      severity_level: severityLevel,
      emergency_disclaimer_acknowledged: true,
      payment_expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    }).select("id").single();
    setTicketBusy(false);
    if (error) { notify("Could not submit: " + error.message, false); return; }
    setPendingTicketId(data.id);
    if (severityLevel >= EMERGENCY_THRESHOLD) {
      // Urgent case: show the emergency warning prominently before payment,
      // not just a quiet flag staff might not notice in time. This does not
      // block them from continuing with Ticket-In - it makes sure they've
      // also been told, clearly, that this may need emergency care now,
      // not a queued consultation.
      setShowEmergencyWarning(true);
    } else {
      setShowPay(true);
    }
  }

  async function openPayment() {
    setMomoDetailsError("");
    if (momoDetails) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMomoDetailsError("Please sign in."); return; }
    try {
      const res = await fetch("/api/get-momo-details", { method: "POST", headers: { Authorization: "Bearer " + session.access_token } });
      const body = await res.json();
      if (!res.ok) { setMomoDetailsError(body.error || "Could not load payment details."); return; }
      setMomoDetails(body);
    } catch (e) { setMomoDetailsError("Could not load payment details: " + e.message); }
  }
  useEffect(() => { if (showPay) openPayment(); }, [showPay]);

  async function copyMomoNumber() {
    if (!momoDetails) return;
    try { await navigator.clipboard.writeText(momoDetails.momoNumber); setMomoCopied(true); setTimeout(() => setMomoCopied(false), 2000); }
    catch { notify("Could not copy - long-press to copy manually.", false); }
  }

  async function submitPayment() {
    if (!momoRef.trim()) { notify("Please enter your transaction reference.", false); return; }
    setMomoBusy(true);
    const { error } = await supabase.from("ticket_payments").insert({
      ticket_id: pendingTicketId, client_id: user.id, amount: PLAN_AMOUNT,
      payment_method: "manual_momo", reference_note: momoRef.trim(),
    });
    setMomoBusy(false);
    if (error) { notify("Could not submit: " + error.message, false); return; }
    notify("Payment submitted! We'll confirm shortly and your consultation will open.");
    setShowPay(false); setMomoRef(""); setMomoDetails(null); setPendingTicketId(null);
    setTicketForm({ onset: "", location: "", duration: "", character: "", aggravating_factors: "", relieving_factors: "", timing: "", severity_description: "", additional_notes: "" });
    setSeverityLevel(null); setEmergencyAck(false);
    setPage("mytickets"); loadMyTickets();
  }

  // -- CLIENT: MY TICKETS --
  const [myTickets, setMyTickets] = useState([]);
  async function loadMyTickets() {
    const { data, error } = await supabase.from("tickets").select("*").eq("client_id", user.id).order("created_at", { ascending: false });
    if (!error && data) setMyTickets(data);
  }

  // -- STAFF: OPEN TICKETS + CLAIMED --
  const [openTickets, setOpenTickets] = useState([]);
  const [myClaimed, setMyClaimed] = useState([]);
  async function loadStaffBoard() {
    const [open, claimed] = await Promise.all([
      supabase.from("tickets").select("*").eq("status", "open").order("created_at", { ascending: true }),
      supabase.from("tickets").select("*").eq("claimed_by", user.id).order("claimed_at", { ascending: false }),
    ]);
    if (open.data) setOpenTickets(open.data);
    if (claimed.data) setMyClaimed(claimed.data);
  }

  async function claimTicket(ticketId) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/claim-ticket", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ ticketId }),
    });
    const body = await res.json();
    if (!res.ok) { notify(body.error || "Could not claim ticket.", false); loadStaffBoard(); return; }
    notify("Ticket claimed.");
    loadStaffBoard();
  }

  async function startConsultation(ticketId) {
    const { error } = await supabase.from("tickets").update({ status: "in_progress" }).eq("id", ticketId).eq("claimed_by", user.id);
    if (error) { notify("Could not update: " + error.message, false); return; }
    notify("Consultation started.");
    loadStaffBoard();
  }

  const [resolveNotes, setResolveNotes] = useState({ objective_assessment: "", clinical_diagnosis: "", plan: "", implementation: "", evaluation: "" });
  const [resolveSummary, setResolveSummary] = useState("");
  const [resolvingTicket, setResolvingTicket] = useState(null);

  async function submitResolution() {
    if (!resolveSummary.trim()) { notify("Please write a summary for the client.", false); return; }
    const { error: noteErr } = await supabase.from("ticket_clinical_notes").insert({ ticket_id: resolvingTicket, staff_id: user.id, ...resolveNotes });
    if (noteErr) { notify("Could not save notes: " + noteErr.message, false); return; }
    const { error: tErr } = await supabase.from("tickets").update({ status: "resolved", resolution_summary: resolveSummary.trim(), resolved_at: new Date().toISOString() }).eq("id", resolvingTicket).eq("claimed_by", user.id);
    if (tErr) { notify("Could not resolve: " + tErr.message, false); return; }
    notify("Ticket resolved.");
    setResolvingTicket(null); setResolveSummary(""); setResolveNotes({ objective_assessment: "", clinical_diagnosis: "", plan: "", implementation: "", evaluation: "" });
    loadStaffBoard();
  }

  // -- ADMIN --
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  async function loadTicketStats() {
    const { data, error } = await supabase.from("tickets").select("status, severity_level");
    if (error) { notify("Could not load ticket stats: " + error.message, false); return; }
    const counts = { total: data.length, form_submitted: 0, open: 0, claimed: 0, in_progress: 0, resolved: 0, expired: 0, urgent_active: 0 };
    data.forEach(t => {
      if (counts[t.status] !== undefined) counts[t.status]++;
      if (t.severity_level >= EMERGENCY_THRESHOLD && !["resolved", "expired"].includes(t.status)) counts.urgent_active++;
    });
    setTicketStats(counts);
  }
  async function loadAdmin() {
    const [pays, staff] = await Promise.all([
      supabase.from("ticket_payments").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "staff").eq("staff_verification_status", "pending"),
    ]);
    if (pays.data) setPendingPayments(pays.data);
    if (staff.data) setPendingStaff(staff.data);
  }
  async function loadAllUsers() {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) { notify("Could not load users: " + error.message, false); return; }
    if (data) setAllUsers(data);
  }
  async function changeUserRole(userId, newRole) {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) { notify("Could not update role: " + error.message, false); return; }
    notify("Role updated.");
    loadAllUsers();
  }
  async function changeUserVerification(userId, status) {
    const { error } = await supabase.from("profiles").update({ staff_verification_status: status }).eq("id", userId);
    if (error) { notify("Could not update: " + error.message, false); return; }
    notify("Updated.");
    loadAllUsers();
  }
  async function confirmPayment(paymentId) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/confirm-payment", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ paymentId }),
    });
    const body = await res.json();
    if (!res.ok) { notify(body.error || "Could not confirm payment.", false); return; }
    notify("Payment confirmed, ticket is now open.");
    loadAdmin();
  }
  async function verifyStaff(staffId, status) {
    const { error } = await supabase.from("profiles").update({ staff_verification_status: status }).eq("id", staffId);
    if (error) { notify("Could not update: " + error.message, false); return; }
    notify(status === "verified" ? "Staff verified." : "Staff rejected.");
    loadAdmin();
  }

  useEffect(() => {
    if (!user) return;
    if (page === "mytickets" && isClient) loadMyTickets();
    if (page === "staffboard" && isStaff) loadStaffBoard();
    if (page === "admin" && isAdmin) { loadAdmin(); loadTicketStats(); }
    if (page === "users" && isAdmin) loadAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (screen === "landing") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg }}>
      <div style={{ background: C.navy, padding: "80px 24px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>Ticket-In</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 14, fontFamily: "Georgia,serif" }}>Don't know where to start? Start here.</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.75)", maxWidth: 460, margin: "0 auto 30px" }}>Check in, describe how you're feeling, and get matched with a qualified freelance healthcare professional.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn label="Check In Now" primary onClick={() => { setScreen("auth"); setIsReg(true); setAuthRole("client"); }} />
          <Btn label="I'm a Healthcare Professional" onClick={() => { setScreen("auth"); setIsReg(true); setAuthRole("staff"); }} />
        </div>
      </div>
    </div>
  );

  if (screen === "auth") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{isReg ? "Create Account" : "Sign In"}</div>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>{isReg ? "Join Ticket-In." : "Sign in to your account."}</p>
        {isReg && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["client", "staff"].map(r => (
              <button key={r} onClick={() => setAuthRole(r)} style={{
                flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
                background: authRole === r ? C.tealL : C.surf, border: "1.5px solid " + (authRole === r ? C.tealB : C.border), color: authRole === r ? C.teal : C.body,
              }}>{r === "client" ? "I need care" : "I'm a professional"}</button>
            ))}
          </div>
        )}
        {isReg && <Field label="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required />}
        <Field label="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} type="email" required />
        <Field label="Password" value={authPass} onChange={e => setAuthPass(e.target.value)} type="password" required />
        <Btn label={authBusy ? "Please wait..." : isReg ? "Create Account" : "Sign In"} primary full loading={authBusy} onClick={handleAuth} />
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>
          {isReg ? "Already have an account? " : "New here? "}
          <span onClick={() => setIsReg(!isReg)} style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}>{isReg ? "Sign in" : "Create one"}</span>
        </div>
      </div>
      <Toast {...toast} />
    </div>
  );

  // -- MAIN APP SHELL --
  return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex" }}>
      <div style={{ width: 220, background: C.white, borderRight: "1px solid " + C.border, padding: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 24, fontFamily: "Georgia,serif" }}>Ticket-In</div>
        {[
          ...(isClient ? [{ id: "checkin", label: "Check In" }, { id: "mytickets", label: "My Tickets" }] : []),
          ...(isStaff ? [{ id: "staffboard", label: "Ticket Board" }] : []),
          ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
          ...(isAdmin ? [{ id: "users", label: "Manage Users" }] : []),
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setPage(id)} style={{
            width: "100%", padding: "9px 11px", background: page === id ? C.tealL : "transparent", border: "none", borderRadius: 9,
            color: page === id ? C.teal : C.body, display: "block", fontSize: 13, fontWeight: page === id ? 700 : 500, marginBottom: 3, cursor: "pointer", textAlign: "left", fontFamily: "system-ui",
          }}>{label}</button>
        ))}
        <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid " + C.surf }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>{user.role}</div>
          <button onClick={logout} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", padding: 0, marginTop: 6, fontFamily: "system-ui" }}>Sign Out</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 32, maxWidth: 720 }}>

        {page === "checkin" && isClient && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Check In</h1>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Tell us how you're feeling. This information goes to the professional who takes your case.</p>

            <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.red, marginBottom: 6 }}>Not for emergencies</div>
              <div style={{ fontSize: 12, color: C.body, lineHeight: 1.6 }}>
                Ticket-In is a consultation platform, not an emergency service. If you are experiencing a life-threatening emergency - severe difficulty breathing, chest pain, uncontrolled bleeding, loss of consciousness, or anything you believe could be life-threatening - go to the nearest hospital or call emergency services immediately. Do not wait for a Ticket-In consultation.
              </div>
            </div>

            {OLDCART_FIELDS.map(([key, label, placeholder]) => (
              <Field key={key} label={label} value={ticketForm[key]} onChange={e => setTicketForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} required={key === "onset"} />
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>
                Severity <span style={{ color: C.red }}>*</span>
                <span style={{ fontWeight: 400, color: C.muted }}> (1 = very mild, 10 = worst imaginable)</span>
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button key={n} onClick={() => setSeverityLevel(n)} style={{
                    width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontFamily: "system-ui", fontWeight: 700, fontSize: 13,
                    border: "1.5px solid " + (severityLevel === n ? (n >= EMERGENCY_THRESHOLD ? C.redB : C.tealB) : C.border),
                    background: severityLevel === n ? (n >= EMERGENCY_THRESHOLD ? C.redL : C.tealL) : C.white,
                    color: severityLevel === n ? (n >= EMERGENCY_THRESHOLD ? C.red : C.teal) : C.body,
                  }}>{n}</button>
                ))}
              </div>
              {severityLevel >= EMERGENCY_THRESHOLD && (
                <div style={{ fontSize: 11, color: C.red, marginTop: 6, fontWeight: 700 }}>
                  This severity level may need urgent or emergency care - please read the notice above carefully.
                </div>
              )}
            </div>
            <Field label="Describe the severity in your own words (optional)" value={ticketForm.severity_description} onChange={e => setTicketForm(f => ({ ...f, severity_description: e.target.value }))} placeholder="e.g. sharp pain, hard to walk" />

            <Field label="Anything else?" value={ticketForm.additional_notes} onChange={e => setTicketForm(f => ({ ...f, additional_notes: e.target.value }))} rows={3} />

            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16, fontSize: 12, color: C.body, cursor: "pointer" }}>
              <input type="checkbox" checked={emergencyAck} onChange={e => setEmergencyAck(e.target.checked)} style={{ marginTop: 2 }} />
              I understand Ticket-In is not for medical emergencies, and I will seek emergency care directly if my situation is life-threatening.
            </label>

            <Btn label={ticketBusy ? "Submitting..." : "Submit and Continue to Payment"} primary full loading={ticketBusy} disabled={!emergencyAck} onClick={submitCheckIn} />
          </div>
        )}

        {page === "mytickets" && isClient && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>My Tickets</h1>
            {myTickets.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>No tickets yet.</div>}
            {myTickets.map(t => (
              <div key={t.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Tag kind={t.status}>{t.status.replace("_", " ")}</Tag>
                  <span style={{ fontSize: 11, color: C.muted }}>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 13, color: C.body }}>{t.onset}</div>
                {t.status === "resolved" && t.resolution_summary && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid " + C.surf, fontSize: 13, color: C.ink }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Summary from your professional:</div>
                    {t.resolution_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {page === "staffboard" && isStaff && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Ticket Board</h1>
            {user.staff_verification_status !== "verified" && (
              <div style={{ background: "#FBF0D6", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: C.body }}>
                Your account is pending verification. You'll be able to claim tickets once an admin approves your account.
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 800, margin: "20px 0 10px" }}>Open Tickets ({openTickets.length})</div>
            {openTickets.slice().sort((a, b) => (b.severity_level || 0) - (a.severity_level || 0)).map(t => (
              <div key={t.id} style={{
                background: C.white, borderRadius: 12, padding: 16, marginBottom: 10,
                border: t.severity_level >= EMERGENCY_THRESHOLD ? "2px solid " + C.redB : "1px solid " + C.border,
              }}>
                {t.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">Urgent</Tag>}
                <div style={{ fontSize: 13, color: C.ink, marginTop: 6, marginBottom: 4 }}><strong>Onset:</strong> {t.onset}</div>
                <div style={{ fontSize: 13, color: C.body, marginBottom: 10 }}>
                  <strong>Severity:</strong> {t.severity_level}/10{t.severity_description ? " - " + t.severity_description : ""}
                </div>
                <Btn label="Claim Ticket" primary small onClick={() => claimTicket(t.id)} disabled={user.staff_verification_status !== "verified"} />
              </div>
            ))}
            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>My Claimed Tickets ({myClaimed.length})</div>
            {myClaimed.map(t => (
              <div key={t.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Tag kind={t.status}>{t.status.replace("_", " ")}</Tag>
                  {t.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">Urgent</Tag>}
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginBottom: 10 }}>{t.onset}</div>
                {t.status === "claimed" && <Btn label="Start Consultation" primary small onClick={() => startConsultation(t.id)} />}
                {t.status === "in_progress" && <Btn label="Resolve & Add Notes" primary small onClick={() => setResolvingTicket(t.id)} />}
              </div>
            ))}
          </div>
        )}

        {page === "admin" && isAdmin && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Admin</h1>

            {ticketStats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 26 }}>
                {[
                  ["Total", ticketStats.total, C.navy],
                  ["Urgent (active)", ticketStats.urgent_active, C.red],
                  ["Open", ticketStats.open, C.teal],
                  ["Claimed", ticketStats.claimed, C.gold],
                  ["In Progress", ticketStats.in_progress, C.gold],
                  ["Resolved", ticketStats.resolved, C.green],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Pending Payments ({pendingPayments.length})</div>
            {pendingPayments.map(p => (
              <div key={p.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.amount} XAF</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Ref: {p.reference_note}</div>
                </div>
                <Btn label="Confirm" primary small onClick={() => confirmPayment(p.id)} />
              </div>
            ))}
            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>Pending Staff Verification ({pendingStaff.length})</div>
            {pendingStaff.map(s => (
              <div key={s.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn label="Verify" primary small onClick={() => verifyStaff(s.id, "verified")} />
                  <Btn label="Reject" small onClick={() => verifyStaff(s.id, "rejected")} />
                </div>
              </div>
            ))}
          </div>
        )}

        {page === "users" && isAdmin && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Manage Users</h1>
            {allUsers.map(u => (
              <div key={u.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{u.phone || "no phone"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag kind={u.role}>{u.role}</Tag>
                    {u.role === "staff" && <Tag kind={u.staff_verification_status}>{u.staff_verification_status}</Tag>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["client", "staff", "admin"].map(r => r !== u.role && (
                    <Btn key={r} label={"Set " + r} small onClick={() => changeUserRole(u.id, r)} />
                  ))}
                  {u.role === "staff" && u.staff_verification_status !== "verified" && (
                    <Btn label="Verify" small primary onClick={() => changeUserVerification(u.id, "verified")} />
                  )}
                  {u.role === "staff" && u.staff_verification_status === "verified" && (
                    <Btn label="Suspend" small onClick={() => changeUserVerification(u.id, "suspended")} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showEmergencyWarning} onClose={() => {}} title="Please Read This First">
        <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.7 }}>
            You reported a severity of <strong>{severityLevel}/10</strong>. If what you're experiencing feels life-threatening - severe difficulty breathing, chest pain, uncontrolled bleeding, loss of consciousness, or anything similarly urgent - <strong>please go to the nearest hospital or call emergency services now</strong>, rather than waiting for a Ticket-In consultation.
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          Your ticket has been marked urgent and will be shown to staff as a priority. If you believe this can safely wait for a consultation, you can continue below.
        </p>
        <Btn label="I understand, continue to payment" primary full onClick={() => { setShowEmergencyWarning(false); setShowPay(true); }} />
      </Modal>

      <Modal open={showPay} onClose={() => setShowPay(false)} title="Complete Payment">
        <div style={{ background: "#FBF0D6", borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.muted }}>SEND EXACTLY</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.gold }}>{PLAN_AMOUNT.toLocaleString()} XAF</div>
        </div>
        {momoDetailsError ? (
          <div style={{ background: C.redL, border: "1px solid " + C.redB, borderRadius: 10, padding: 14, marginBottom: 16, color: C.red, fontSize: 13 }}>{momoDetailsError}</div>
        ) : !momoDetails ? (
          <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 13 }}>Loading payment details...</div>
        ) : (
          <button onClick={copyMomoNumber} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: C.surf, border: "1.5px dashed " + C.border, borderRadius: 10, padding: 12, marginBottom: 12, cursor: "pointer", fontFamily: "system-ui" }}>
            <span style={{ fontSize: 11, color: C.muted }}>{momoCopied ? "Copied - now send via MoMo" : "Tap to copy MoMo number"}</span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{momoDetails.momoNumber}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{momoDetails.momoAccountName}</span>
          </button>
        )}
        <Field label="Reference from confirmation SMS" value={momoRef} onChange={e => setMomoRef(e.target.value)} placeholder="e.g. MP240905.1234.A56789" required />
        <Btn label={momoBusy ? "Submitting..." : "I've Sent the Payment"} primary full loading={momoBusy} disabled={!momoDetails || !momoRef.trim()} onClick={submitPayment} />
      </Modal>

      <Modal open={!!resolvingTicket} onClose={() => setResolvingTicket(null)} title="Resolve Ticket">
        <Field label="Objective Assessment" value={resolveNotes.objective_assessment} onChange={e => setResolveNotes(n => ({ ...n, objective_assessment: e.target.value }))} rows={2} />
        <Field label="Clinical Diagnosis" value={resolveNotes.clinical_diagnosis} onChange={e => setResolveNotes(n => ({ ...n, clinical_diagnosis: e.target.value }))} rows={2} />
        <Field label="Plan" value={resolveNotes.plan} onChange={e => setResolveNotes(n => ({ ...n, plan: e.target.value }))} rows={2} />
        <Field label="Implementation" value={resolveNotes.implementation} onChange={e => setResolveNotes(n => ({ ...n, implementation: e.target.value }))} rows={2} />
        <Field label="Evaluation" value={resolveNotes.evaluation} onChange={e => setResolveNotes(n => ({ ...n, evaluation: e.target.value }))} rows={2} />
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, marginTop: 10 }}>Summary shown to the client (plain language, not clinical jargon):</div>
        <Field label="Client Summary" value={resolveSummary} onChange={e => setResolveSummary(e.target.value)} rows={3} required />
        <Btn label="Resolve Ticket" primary full onClick={submitResolution} />
      </Modal>

      <Toast {...toast} />
    </div>
  );
}
