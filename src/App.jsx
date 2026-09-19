import { useState, useEffect, useRef } from "react";
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
  ["onset", "Onset", "When did this first begin? (e.g. 3 days ago, this morning)"],
  ["location", "Location", "Where on the body?"],
  ["duration", "Duration", "How long does it last each time? (e.g. a few minutes, all day, non-stop since it began)"],
  ["character", "Character", "What does it feel like?"],
  ["aggravating_factors", "Aggravating Factors", "What makes it worse?"],
  ["relieving_factors", "Relieving Factors", "What makes it better?"],
  ["timing", "Timing", "Constant, or does it come and go?"],
];

// ============================================================================
// PRIVACY POLICY / TERMS OF SERVICE - rendered in-app, mirrors
// PRIVACY_POLICY.md / TERMS_OF_SERVICE.md in the repo. Kept as plain
// components (not markdown-parsed from the .md files) so there's no
// build-time dependency on reading a file - if you edit the wording,
// update both this and the .md file to keep them in sync.
// ============================================================================
// Human-readable elapsed time since a ticket was submitted - lets staff
// see at a glance which tickets have been waiting longest, without
// having to read and mentally subtract a timestamp.
function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h " + (mins % 60) + "m ago";
  const days = Math.floor(hours / 24);
  return days + "d " + (hours % 24) + "h ago";
}

const Sec = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    {title && <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 6 }}>{title}</div>}
    <div style={{ fontSize: 13, color: C.body, lineHeight: 1.7 }}>{children}</div>
  </div>
);

function PrivacyPolicyContent() {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Privacy Policy</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>Last updated: September 2026</div>

      <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 12, color: C.body, lineHeight: 1.6 }}>
        This is a good-faith interim Privacy Policy, written to accurately describe what Ticket-In actually collects and does with your information today. It is <strong>not</strong> a substitute for formal authorization from Cameroon's Personal Data Protection Authority under Law No. 2024/017, which is required before this kind of processing can lawfully continue at any real scale. That authorization has not yet been obtained.
      </div>

      <Sec title="Who we are">Ticket-In is a freelance healthcare consultation platform connecting clients with independent, freelance healthcare professionals in Cameroon.</Sec>

      <Sec title="What we collect">
        <strong>If you check in as a client:</strong> your phone number; the health information you provide (onset, location, duration, character, aggravating/relieving factors, timing, severity, anything else you write); a system-generated code to look up your ticket later (no account, name, or email required); the mobile money transaction reference you submit when paying (we never see your mobile money account details themselves).<br /><br />
        <strong>If you register as staff:</strong> your name, email, password, professional license/registration number, issuing institution, and specialty, plus records of tickets you claim and the clinical notes you write.<br /><br />
        <strong>What we don't collect:</strong> we don't ask your name or any ID as a client. We do not currently verify age - if you're under 18, please involve a parent or guardian; we don't yet have a way to collect the parental consent Cameroonian law requires for a minor's data, and this is a real, acknowledged gap.
      </Sec>

      <Sec title="How we use your information">
        Your check-in is shown to the professional who claims your ticket. They write you a separate, plain-language summary - your full clinical notes stay internal to staff and admin, never shown to you in raw form. Your phone and code are used only for your own lookups and for admin follow-up on cases needing attention. Payment references are used only to confirm and activate your consultation.
      </Sec>

      <Sec title="Who can see your information">
        The staff member who claims your ticket, and platform admins. No other client and no unverified staff can see it. Clinical notes are restricted at the database level to the writing staff member and admins - enforced technically, not just promised. We do not sell your data or share it for advertising.
      </Sec>

      <Sec title="Where your information is stored">
        We use Supabase, a third-party database provider - your data is likely stored outside Cameroon. Cross-border transfer requires separate Data Protection Authority authorization, which has not yet been obtained. We're working to confirm and formalize this.
      </Sec>

      <Sec title="How long we keep it">We have not yet set a formal retention policy. Until we do, assume records are retained indefinitely - this is an open item toward full compliance.</Sec>

      <Sec title="Your rights">You have the right to know what we hold about you, request correction, and request deletion. Contact: mangwishihycentanda@gmail.com.</Sec>

      <Sec title="Payments">We don't process mobile money automatically. You send money directly via mobile money, then tell us the reference - we never have access to your mobile money account, PIN, or balance.</Sec>

      <Sec title="Changes">We'll update this as our practices change, especially once formal authorization is obtained.</Sec>
    </div>
  );
}

function TermsOfServiceContent() {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Terms of Service</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>Last updated: September 2026</div>

      <Sec title="What Ticket-In is - and isn't">
        Ticket-In connects clients with independent, freelance healthcare professionals. <strong>Ticket-In is not an emergency service and does not replace in-person or emergency medical care.</strong> If you're experiencing a life-threatening emergency, go to the nearest hospital or call emergency services immediately.<br /><br />
        Ticket-In is a platform, not a healthcare provider. Professionals using it operate independently, not as our employees or agents. Clinical judgment and treatment decisions are made independently by the professional handling your case.
      </Sec>

      <Sec title="Who can use Ticket-In">
        We don't currently verify client age. If you're under 18, please have a parent or guardian aware of or assisting with your use of this service.<br /><br />
        Staff must provide accurate license/registration information. Providing false credentials is a serious violation and may lead to suspension and reporting to the relevant licensing body (e.g. the Cameroon Medical Council or the Ordre National des Infirmiers, Infirmières et Sages-Femmes du Cameroun). Admin verification is a good-faith review of what you provide, not yet independent real-time confirmation against the issuing institution.
      </Sec>

      <Sec title="How the service works">
        1) Check in and receive a code. 2) Submit payment (1,600 XAF) via manual mobile money. 3) Once admin confirms payment, a verified staff member can claim your consultation. 4) They provide the consultation, then write you a plain-language summary and separate clinical notes for our records.
      </Sec>

      <Sec title="Payments">
        1,600 XAF per consultation, manual mobile money, confirmed by admin - there may be a delay while this happens. We don't currently offer refunds for claimed/completed consultations; contact us if a payment issue occurs before claiming.
      </Sec>

      <Sec title="Clinical safety and independence">
        Clinical decisions are made independently, never influenced by platform commercial interests. We don't incentivize unnecessary consultations, referrals, or purchases. High-severity check-ins are flagged internally for admin follow-up - this is a safety aid, not a guarantee of rapid response, and never a substitute for seeking emergency care directly.
      </Sec>

      <Sec title="Limitation of liability">
        Ticket-In is not a party to the clinical relationship between you and the professional you consult. To the fullest extent permitted by law, we are not liable for clinical decisions, advice, or outcomes - that responsibility rests with the professional providing care. This doesn't affect any rights you have under Cameroonian law that can't be excluded by these Terms.
      </Sec>

      <Sec title="Governing law">These Terms are governed by the laws of the Republic of Cameroon.</Sec>

      <Sec title="Contact">Questions: mangwishihycentanda@gmail.com.</Sec>
    </div>
  );
}


const EMPTY_TICKET_FORM = { onset: "", location: "", duration: "", character: "", aggravating_factors: "", relieving_factors: "", timing: "", severity_description: "", additional_notes: "" };
const EMERGENCY_THRESHOLD = 8; // severity_level at or above this triggers urgent flagging + emergency messaging

export default function App() {
  // screen: landing | checkin | checkin-code | lookup | auth | app
  // "checkin"/"checkin-code"/"lookup" are account-free, top-level, for clients.
  // "auth"/"app" are for staff/admin only - clients never log in at all.
  const [screen, setScreen] = useState("landing");
  const [isReg, setIsReg] = useState(true);
  const [authRole, setAuthRole] = useState("staff"); // "staff" | "hospital" - which kind of account is being registered
  const [authName, setAuthName] = useState(""), [authEmail, setAuthEmail] = useState(""), [authPass, setAuthPass] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issuingInstitution, setIssuingInstitution] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalTown, setHospitalTown] = useState("");
  const [hospitalPhone, setHospitalPhone] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("staffboard");
  const [toast, setToast] = useState({ show: false, msg: "", ok: true });

  function notify(msg, ok = true) {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }

  const isStaff = user && user.role === "staff";
  const isAdmin = user && user.role === "admin";
  const isHospital = user && user.role === "hospital";

  // -- HOSPITALS - shared list, used by the client check-in dropdown and
  // the staff sign-up's optional "affiliated hospital" picker. Public/
  // anon-readable (RLS only returns hospitals whose account is verified).
  const [hospitalsList, setHospitalsList] = useState([]);
  async function loadHospitals() {
    const { data } = await supabase.from("hospitals").select("id, name, town").order("town", { ascending: true });
    if (data) setHospitalsList(data);
  }

  // -- AUTH (staff/admin only) --
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (session?.user) { await loadProfileIntoUser(session.user); setScreen("app"); }
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
      .select("name, role, staff_verification_status, hospital_id").eq("id", authUser.id).single();
    if (error) {
      const name = authUser.email.split("@")[0];
      setUser({ id: authUser.id, name, role: "staff" });
      setPage("staffboard");
      return;
    }
    setUser({ id: authUser.id, name: profile.name || authUser.email.split("@")[0], role: profile.role, staff_verification_status: profile.staff_verification_status, hospital_id: profile.hospital_id });
    if (profile.role === "admin") setPage("admin");
    else if (profile.role === "hospital") setPage("hospital");
    else setPage("staffboard");
  }

  async function handleAuth() {
    if (!authEmail || !authPass) { notify("Email and password required.", false); return; }
    if (isReg && authPass.length < 8) { notify("Password must be at least 8 characters.", false); return; }
    if (isReg && authRole === "staff" && (!licenseNumber.trim() || !issuingInstitution.trim())) {
      notify("License number and issuing institution are required.", false); return;
    }
    if (isReg && authRole === "hospital" && (!hospitalName.trim() || !hospitalTown.trim())) {
      notify("Hospital name and town are required.", false); return;
    }
    setAuthBusy(true);
    if (isReg) {
      if (!authName.trim()) { setAuthBusy(false); notify("Name is required.", false); return; }
      const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPass, options: { data: { name: authName } } });
      if (error) { setAuthBusy(false); notify(error.message, false); return; }
      if (data.session) {
        // Finalization (setting role + saving credentials/hospital details)
        // has to happen server-side via service_role - a client-side
        // profiles.update({role}) looks like it succeeds but is silently
        // reverted by the self-elevation-prevention trigger, since the
        // caller here is the user themselves, not an admin or service_role.
        const res = await fetch("/api/finalize-registration", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token },
          body: JSON.stringify(
            authRole === "staff"
              ? { role: "staff", licenseNumber: licenseNumber.trim(), issuingInstitution: issuingInstitution.trim(), specialty: specialty.trim() || null }
              : { role: "hospital", hospitalName: hospitalName.trim(), hospitalTown: hospitalTown.trim(), hospitalPhone: hospitalPhone.trim() || null, hospitalAddress: hospitalAddress.trim() || null }
          ),
        });
        const body = await res.json();
        if (!res.ok) { setAuthBusy(false); notify(body.error || "Account created, but registration could not be finalized.", false); return; }
      } else {
        setAuthBusy(false);
        notify("Account created - please check your email to confirm, then sign in.");
        return;
      }
      setAuthBusy(false);
      notify("Account created!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
      setAuthBusy(false);
      if (error) { notify(error.message, false); return; }
    }
  }

  async function logout() { await supabase.auth.signOut(); }

  // ==========================================================================
  // CLIENT CHECK-IN - account-free. Identified by phone + a system-
  // generated client_code shown once on screen, not by login.
  // ==========================================================================
  const [ticketForm, setTicketForm] = useState(EMPTY_TICKET_FORM);
  const [checkinPhone, setCheckinPhone] = useState("");
  const [consultType, setConsultType] = useState("remote"); // "remote" | "in_person"
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [isAdult, setIsAdult] = useState(null); // null = not yet answered, true/false
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [severityLevel, setSeverityLevel] = useState(null);
  const [emergencyAck, setEmergencyAck] = useState(false);
  const [showEmergencyWarning, setShowEmergencyWarning] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [pendingTicketId, setPendingTicketId] = useState(null);
  const [clientCode, setClientCode] = useState(null);
  const [showPay, setShowPay] = useState(false);
  const [momoDetails, setMomoDetails] = useState(null);
  const [momoDetailsError, setMomoDetailsError] = useState("");
  const [momoCopied, setMomoCopied] = useState(false);
  const [momoRef, setMomoRef] = useState("");
  const [momoBusy, setMomoBusy] = useState(false);

  // Refs so a failed validation can scroll the user straight to the
  // actual unanswered field, instead of just showing a toast that gives
  // no indication of where on a long form the problem is.
  const emergencyAckRef = useRef(null);
  const phoneRef = useRef(null);
  const onsetSeverityRef = useRef(null);
  const ageRef = useRef(null);
  const guardianRef = useRef(null);
  const hospitalRef = useRef(null);

  function scrollToField(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submitCheckIn() {
    if (!emergencyAck) { notify("Please confirm you've read the emergency notice before continuing.", false); scrollToField(emergencyAckRef); return; }
    if (!checkinPhone.trim()) { notify("Please enter your phone number.", false); scrollToField(phoneRef); return; }
    if (!ticketForm.onset.trim() || !severityLevel) { notify("Please fill in at least Onset and Severity.", false); scrollToField(onsetSeverityRef); return; }
    if (isAdult === null) { notify("Please confirm whether you are 18 or older.", false); scrollToField(ageRef); return; }
    if (isAdult === false && (!guardianName.trim() || !guardianPhone.trim())) {
      notify("A parent or guardian's name and phone number are required.", false); scrollToField(guardianRef); return;
    }
    if (consultType === "in_person" && !selectedHospitalId) {
      notify("Please choose a hospital.", false); scrollToField(hospitalRef); return;
    }

    setTicketBusy(true);
    try {
      const res = await fetch("/api/submit-checkin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: checkinPhone.trim(), ...ticketForm, severity_level: severityLevel, emergency_disclaimer_acknowledged: true,
          is_adult: isAdult, guardian_name: isAdult ? null : guardianName.trim(), guardian_phone: isAdult ? null : guardianPhone.trim(),
          consult_type: consultType, hospital_id: consultType === "in_person" ? selectedHospitalId : null,
        }),
      });
      const body = await res.json();
      setTicketBusy(false);
      if (!res.ok) { notify(body.error || "Could not submit check-in.", false); return; }
      setPendingTicketId(body.ticketId);
      setClientCode(body.clientCode);
      if (severityLevel >= EMERGENCY_THRESHOLD) setShowEmergencyWarning(true);
      else setScreen("checkin-code");
    } catch (e) {
      setTicketBusy(false);
      notify("Could not submit check-in: " + e.message, false);
    }
  }

  async function openPayment() {
    setMomoDetailsError("");
    if (momoDetails) return;
    try {
      const res = await fetch("/api/get-momo-details", { method: "POST" });
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
  async function copyClientCode() {
    if (!clientCode) return;
    try { await navigator.clipboard.writeText(clientCode); notify("Code copied."); }
    catch { notify("Could not copy - please write it down.", false); }
  }

  async function submitPayment() {
    if (!momoRef.trim()) { notify("Please enter your transaction reference.", false); return; }
    setMomoBusy(true);
    try {
      const res = await fetch("/api/submit-checkin-payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: pendingTicketId, phone: checkinPhone.trim(), code: clientCode, referenceNote: momoRef.trim() }),
      });
      const body = await res.json();
      setMomoBusy(false);
      if (!res.ok) { notify(body.error || "Could not submit payment.", false); return; }
      notify("Payment submitted! We'll confirm shortly and your consultation will open.");
      setShowPay(false); setMomoRef(""); setMomoDetails(null);
      setScreen("landing");
      setTicketForm(EMPTY_TICKET_FORM); setSeverityLevel(null); setEmergencyAck(false);
      setIsAdult(null); setGuardianName(""); setGuardianPhone("");
      setConsultType("remote"); setSelectedHospitalId("");
      setPendingTicketId(null); setClientCode(null); setCheckinPhone("");
    } catch (e) {
      setMomoBusy(false);
      notify("Could not submit payment: " + e.message, false);
    }
  }

  // -- LOOKUP (account-free ticket status check) --
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);

  async function doLookup() {
    if (!lookupPhone.trim() || !lookupCode.trim()) { setLookupError("Please enter both your phone number and code."); return; }
    setLookupBusy(true); setLookupError(""); setLookupResult(null);
    try {
      const res = await fetch("/api/lookup-ticket", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: lookupPhone.trim(), code: lookupCode.trim() }),
      });
      const body = await res.json();
      setLookupBusy(false);
      if (!res.ok) { setLookupError(body.error || "Could not find that ticket."); return; }
      setLookupResult(body.ticket);
    } catch (e) {
      setLookupBusy(false);
      setLookupError("Could not check status: " + e.message);
    }
  }

  // ==========================================================================
  // STAFF: OPEN TICKETS + CLAIMED
  // ==========================================================================
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

  // -- STAFF FORUM --
  const [forumPosts, setForumPosts] = useState([]);
  const [forumLoading, setForumLoading] = useState(false);
  const [newThreadSubject, setNewThreadSubject] = useState("");
  const [newThreadBody, setNewThreadBody] = useState("");
  const [expandedThread, setExpandedThread] = useState(null);
  const [replyBody, setReplyBody] = useState("");

  async function loadForum() {
    setForumLoading(true);
    const { data, error } = await supabase.from("forum_posts").select("*").order("created_at", { ascending: false });
    if (!error && data) setForumPosts(data);
    setForumLoading(false);
  }
  async function submitThread() {
    if (!newThreadBody.trim()) { notify("Write something before posting.", false); return; }
    const { error } = await supabase.from("forum_posts").insert({
      staff_id: user.id, staff_name: user.name, subject: newThreadSubject.trim() || null, body: newThreadBody.trim(), parent_post_id: null,
    });
    if (error) { notify("Could not post: " + error.message, false); return; }
    setNewThreadSubject(""); setNewThreadBody("");
    loadForum();
  }
  async function submitReply(parentId) {
    if (!replyBody.trim()) return;
    const { error } = await supabase.from("forum_posts").insert({
      staff_id: user.id, staff_name: user.name, parent_post_id: parentId, body: replyBody.trim(),
    });
    if (error) { notify("Could not reply: " + error.message, false); return; }
    setReplyBody(""); setExpandedThread(null);
    loadForum();
  }
  async function deleteForumPost(id) {
    if (!confirm("Remove this post?")) return;
    const { error } = await supabase.from("forum_posts").update({ is_deleted: true }).eq("id", id);
    if (error) { notify("Could not remove: " + error.message, false); return; }
    loadForum();
  }

  // -- RESOURCES --
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [newResTitle, setNewResTitle] = useState("");
  const [newResCategory, setNewResCategory] = useState("");
  const [newResDesc, setNewResDesc] = useState("");
  const [newResLink, setNewResLink] = useState("");
  const [newResText, setNewResText] = useState("");
  const [showAddResource, setShowAddResource] = useState(false);

  async function loadResources() {
    setResourcesLoading(true);
    const { data, error } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    if (!error && data) setResources(data);
    setResourcesLoading(false);
  }
  async function submitResource() {
    if (!newResTitle.trim()) { notify("A title is required.", false); return; }
    if (!newResLink.trim() && !newResText.trim()) { notify("Add a link, written content, or both.", false); return; }
    const { error } = await supabase.from("resources").insert({
      title: newResTitle.trim(), category: newResCategory.trim() || null, description: newResDesc.trim() || null,
      link_url: newResLink.trim() || null, text_content: newResText.trim() || null, created_by: user.id,
    });
    if (error) { notify("Could not add resource: " + error.message, false); return; }
    setNewResTitle(""); setNewResCategory(""); setNewResDesc(""); setNewResLink(""); setNewResText(""); setShowAddResource(false);
    notify("Resource added.");
    loadResources();
  }
  async function deleteResource(id) {
    if (!confirm("Remove this resource?")) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) { notify("Could not remove: " + error.message, false); return; }
    loadResources();
  }

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

  // ==========================================================================
  // ADMIN
  // ==========================================================================
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [hospitalTicketIndex, setHospitalTicketIndex] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneSearchResults, setPhoneSearchResults] = useState(null);
  const [phoneSearchBusy, setPhoneSearchBusy] = useState(false);
  const [urgentTickets, setUrgentTickets] = useState([]);
  async function loadUrgentTickets() {
    // Every active (not resolved/expired) urgent ticket, regardless of
    // payment status - payment being unconfirmed should never be the
    // reason a potentially urgent case stays invisible to a human. This
    // is admin-only by design (staff only ever see "open" tickets via
    // the normal board, which already excludes unpaid ones on purpose).
    const { data, error } = await supabase.from("tickets").select("*")
      .gte("severity_level", EMERGENCY_THRESHOLD)
      .not("status", "in", "(resolved,expired)")
      .order("created_at", { ascending: true });
    if (!error && data) setUrgentTickets(data);
  }
  async function searchByPhone() {
    if (!phoneSearch.trim()) { notify("Enter a phone number to search.", false); return; }
    setPhoneSearchBusy(true);
    const { data, error } = await supabase.from("tickets").select("*")
      .ilike("client_phone", "%" + phoneSearch.trim() + "%")
      .order("created_at", { ascending: false });
    setPhoneSearchBusy(false);
    if (error) { notify("Search failed: " + error.message, false); return; }
    setPhoneSearchResults(data || []);
  }
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
    const [pays, staff, creds, hospitalAccounts, hospitalRows] = await Promise.all([
      supabase.from("ticket_payments").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "staff").eq("staff_verification_status", "pending"),
      supabase.from("staff_credentials").select("*"),
      supabase.from("profiles").select("*").eq("role", "hospital").eq("staff_verification_status", "pending"),
      supabase.from("hospitals").select("*"),
    ]);
    if (pays.data) setPendingPayments(pays.data);
    if (staff.data) {
      const credsById = Object.fromEntries((creds.data || []).map(c => [c.staff_id, c]));
      setPendingStaff(staff.data.map(s => ({ ...s, credentials: credsById[s.id] })));
    }
    if (hospitalAccounts.data) {
      const hospitalByOwner = Object.fromEntries((hospitalRows.data || []).map(h => [h.created_by, h]));
      setPendingHospitals(hospitalAccounts.data.map(h => ({ ...h, hospital: hospitalByOwner[h.id] })));
    }
  }
  // Cross-hospital oversight index for admin - every in-person ticket,
  // labeled with which hospital it was routed to. Complements each
  // hospital's own single-hospital dashboard index below.
  async function loadHospitalTicketIndex() {
    const { data, error } = await supabase.from("tickets")
      .select("*, hospitals(name, town)").eq("consult_type", "in_person").order("created_at", { ascending: false });
    if (!error && data) setHospitalTicketIndex(data);
  }
  async function loadAllUsers() {
    const [usersRes, credsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_credentials").select("*"),
    ]);
    if (usersRes.error) { notify("Could not load users: " + usersRes.error.message, false); return; }
    const credsById = Object.fromEntries((credsRes.data || []).map(c => [c.staff_id, c]));
    if (usersRes.data) setAllUsers(usersRes.data.map(u => ({ ...u, credentials: credsById[u.id] })));
  }
  async function changeUserRole(userId, newRole) {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) { notify("Could not update role: " + error.message, false); return; }
    notify("Role updated.");
    loadAllUsers();
  }
  async function changeUserVerification(userId, status) {
    const patch = { staff_verification_status: status };
    if (status === "verified") { patch.verified_by = user.id; patch.verified_at = new Date().toISOString(); }
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
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
    const patch = { staff_verification_status: status };
    if (status === "verified") { patch.verified_by = user.id; patch.verified_at = new Date().toISOString(); }
    const { error } = await supabase.from("profiles").update(patch).eq("id", staffId);
    if (error) { notify("Could not update: " + error.message, false); return; }
    notify(status === "verified" ? "Staff verified." : "Staff rejected.");
    loadAdmin();
  }

  // ==========================================================================
  // HOSPITAL DASHBOARD
  // ==========================================================================
  const [myHospital, setMyHospital] = useState(null);
  const [hospitalTickets, setHospitalTickets] = useState([]);
  const [hospitalDoctors, setHospitalDoctors] = useState([]);
  const [doctorEmailInput, setDoctorEmailInput] = useState("");
  const [doctorAddBusy, setDoctorAddBusy] = useState(false);

  async function loadHospitalBoard() {
    const { data: hosp } = await supabase.from("hospitals").select("*").eq("created_by", user.id).single();
    if (!hosp) return;
    setMyHospital(hosp);
    const [tix, docs] = await Promise.all([
      supabase.from("tickets").select("*").eq("hospital_id", hosp.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*, staff_credentials(*)").eq("hospital_id", hosp.id).eq("role", "staff"),
    ]);
    if (tix.data) setHospitalTickets(tix.data);
    if (docs.data) setHospitalDoctors(docs.data);
  }

  async function addDoctorByEmail() {
    if (!doctorEmailInput.trim()) { notify("Enter the doctor's registered email.", false); return; }
    setDoctorAddBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/manage-hospital-doctor", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ action: "link", doctorEmail: doctorEmailInput.trim() }),
    });
    const body = await res.json();
    setDoctorAddBusy(false);
    if (!res.ok) { notify(body.error || "Could not add doctor.", false); return; }
    notify(body.alreadyLinked ? "Already on your roster." : "Doctor added to your roster: " + body.name);
    setDoctorEmailInput("");
    loadHospitalBoard();
  }

  async function removeDoctor(doctorId) {
    if (!confirm("Remove this doctor from your roster?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/manage-hospital-doctor", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ action: "unlink", doctorId }),
    });
    const body = await res.json();
    if (!res.ok) { notify(body.error || "Could not remove doctor.", false); return; }
    notify("Doctor removed.");
    loadHospitalBoard();
  }

  useEffect(() => {
    if (!user) return;
    if (page === "staffboard" && isStaff) loadStaffBoard();
    if (page === "forum" && (isStaff || isAdmin)) loadForum();
    if (page === "resources" && (isStaff || isAdmin)) loadResources();
    if (page === "admin" && isAdmin) { loadAdmin(); loadTicketStats(); loadUrgentTickets(); loadHospitalTicketIndex(); }
    if (page === "users" && isAdmin) loadAllUsers();
    if (page === "hospital" && isHospital) loadHospitalBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user]);

  useEffect(() => {
    if (screen === "checkin" || (screen === "auth" && isReg)) loadHospitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, isReg]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (screen === "landing") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg }}>
      <div style={{ background: C.navy, padding: "80px 24px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>Ticket-In</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 14, fontFamily: "Georgia,serif" }}>Don't know where to start? Start here.</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.75)", maxWidth: 460, margin: "0 auto 30px" }}>Check in with just your phone number, describe how you're feeling, and get matched with a qualified freelance healthcare professional.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn label="Check In Now" primary onClick={() => setScreen("checkin")} />
          <Btn label="Check My Ticket Status" onClick={() => setScreen("lookup")} />
          <Btn label="I'm a Healthcare Professional" onClick={() => { setScreen("auth"); setIsReg(true); setAuthRole("staff"); }} />
          <Btn label="Register My Hospital" onClick={() => { setScreen("auth"); setIsReg(true); setAuthRole("hospital"); }} />
        </div>
      </div>
      <div style={{ padding: "18px 24px", textAlign: "center" }}>
        <span onClick={() => setScreen("privacy")} style={{ color: C.muted, fontSize: 12, cursor: "pointer", marginRight: 18 }}>Privacy Policy</span>
        <span onClick={() => setScreen("terms")} style={{ color: C.muted, fontSize: 12, cursor: "pointer" }}>Terms of Service</span>
      </div>
    </div>
  );

  if (screen === "privacy" || screen === "terms") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, padding: "24px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", background: C.white, borderRadius: 16, padding: 28 }}>
        <button onClick={() => setScreen(user ? "app" : "landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 18 }}>&larr; Back</button>
        {screen === "privacy" ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
      </div>
    </div>
  );

  if (screen === "lookup") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <button onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 14 }}>&larr; Back</button>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Check My Ticket</div>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Enter the phone number and code you were given at check-in.</p>
        <Field label="Phone Number" value={lookupPhone} onChange={e => setLookupPhone(e.target.value)} required />
        <Field label="Your Code" value={lookupCode} onChange={e => setLookupCode(e.target.value.toUpperCase())} placeholder="e.g. A7K92M" required />
        {lookupError && <div style={{ background: C.redL, border: "1px solid " + C.redB, borderRadius: 10, padding: 12, marginBottom: 14, color: C.red, fontSize: 13 }}>{lookupError}</div>}
        <Btn label={lookupBusy ? "Checking..." : "Check Status"} primary full loading={lookupBusy} onClick={doLookup} />

        {lookupResult && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid " + C.surf }}>
            <Tag kind={lookupResult.status}>{lookupResult.status.replace("_", " ")}</Tag>
            <div style={{ fontSize: 13, color: C.ink, marginTop: 8 }}>{lookupResult.onset}</div>
            {lookupResult.status === "resolved" && lookupResult.resolution_summary && (
              <div style={{ marginTop: 12, fontSize: 13, color: C.body, lineHeight: 1.6 }}>
                <strong>Summary from your professional:</strong><br />{lookupResult.resolution_summary}
              </div>
            )}
          </div>
        )}
      </div>
      <Toast {...toast} />
    </div>
  );

  if (screen === "checkin") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, padding: "24px 20px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <button onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 14 }}>&larr; Back</button>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Check In</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>No account needed. Tell us how you're feeling and how to reach you.</p>

        <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.red, marginBottom: 6 }}>Not for emergencies</div>
          <div style={{ fontSize: 12, color: C.body, lineHeight: 1.6 }}>
            Ticket-In is a consultation platform, not an emergency service. If you are experiencing a life-threatening emergency - severe difficulty breathing, chest pain, uncontrolled bleeding, loss of consciousness, or anything you believe could be life-threatening - go to the nearest hospital or call emergency services immediately. Do not wait for a Ticket-In consultation.
          </div>
        </div>

        <div ref={phoneRef}>
          <Field label="Phone Number" value={checkinPhone} onChange={e => setCheckinPhone(e.target.value)} placeholder="e.g. 6XX XXX XXX" required />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>How would you like to be seen?</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setConsultType("remote"); setSelectedHospitalId(""); }} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: consultType === "remote" ? C.tealL : C.white, border: "1.5px solid " + (consultType === "remote" ? C.tealB : C.border), color: consultType === "remote" ? C.teal : C.body,
            }}>Remote consultation</button>
            <button onClick={() => setConsultType("in_person")} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: consultType === "in_person" ? C.tealL : C.white, border: "1.5px solid " + (consultType === "in_person" ? C.tealB : C.border), color: consultType === "in_person" ? C.teal : C.body,
            }}>In-person at a hospital</button>
          </div>
        </div>

        {consultType === "in_person" && (
          <div ref={hospitalRef} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>
              Choose a hospital <span style={{ color: C.red }}>*</span>
            </label>
            <select value={selectedHospitalId} onChange={e => setSelectedHospitalId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 9, border: "1.5px solid " + C.border, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", background: C.white }}>
              <option value="">Select a hospital...</option>
              {hospitalsList.map(h => <option key={h.id} value={h.id}>{h.name} - {h.town}</option>)}
            </select>
            {hospitalsList.length === 0 && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>No hospitals are registered yet - please choose a remote consultation instead.</div>
            )}
          </div>
        )}

        <div ref={ageRef} style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>
            Are you 18 or older? <span style={{ color: C.red }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setIsAdult(true)} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: isAdult === true ? C.tealL : C.white, border: "1.5px solid " + (isAdult === true ? C.tealB : C.border), color: isAdult === true ? C.teal : C.body,
            }}>Yes, 18 or older</button>
            <button onClick={() => setIsAdult(false)} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: isAdult === false ? C.tealL : C.white, border: "1.5px solid " + (isAdult === false ? C.tealB : C.border), color: isAdult === false ? C.teal : C.body,
            }}>No, under 18</button>
          </div>
        </div>

        {isAdult === false && (
          <div ref={guardianRef} style={{ background: C.tealL, border: "1.5px solid " + C.tealB, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.body, lineHeight: 1.6, marginBottom: 12 }}>
              Ticket-In requires a parent or guardian's details for anyone under 18. Please have them check in with you, or provide their information below.
            </div>
            <Field label="Parent/Guardian Name" value={guardianName} onChange={e => setGuardianName(e.target.value)} required />
            <Field label="Parent/Guardian Phone" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} required />
          </div>
        )}

        <div ref={onsetSeverityRef}>
          {OLDCART_FIELDS.map(([key, label, placeholder]) => (
            <Field key={key} label={label} value={ticketForm[key]} onChange={e => setTicketForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} required={key === "onset"} />
          ))}
        </div>

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

        <label ref={emergencyAckRef} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, fontSize: 12, color: C.body, cursor: "pointer" }}>
          <input type="checkbox" checked={emergencyAck} onChange={e => setEmergencyAck(e.target.checked)} style={{ marginTop: 2 }} />
          I understand Ticket-In is not for medical emergencies, and I will seek emergency care directly if my situation is life-threatening.
        </label>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
          By continuing you agree to our <span onClick={() => setScreen("terms")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>Terms of Service</span> and <span onClick={() => setScreen("privacy")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>Privacy Policy</span>.
        </div>

        <Btn label={ticketBusy ? "Submitting..." : "Submit and Continue"} primary full loading={ticketBusy} disabled={!emergencyAck} onClick={submitCheckIn} />
      </div>
      <Toast {...toast} />

      <Modal open={showEmergencyWarning} onClose={() => {}} title="Please Read This First">
        <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.7 }}>
            You reported a severity of <strong>{severityLevel}/10</strong>. If what you're experiencing feels life-threatening - severe difficulty breathing, chest pain, uncontrolled bleeding, loss of consciousness, or anything similarly urgent - <strong>please go to the nearest hospital or call emergency services now</strong>, rather than waiting for a Ticket-In consultation.
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          Your ticket has been marked urgent and will be shown to staff as a priority. If you believe this can safely wait for a consultation, you can continue below.
        </p>
        <Btn label="I understand, continue" primary full onClick={() => { setShowEmergencyWarning(false); setScreen("checkin-code"); }} />
      </Modal>
    </div>
  );

  if (screen === "checkin-code") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Check-In Submitted</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Your code - save this, you'll need it to check your status:</div>
        <button onClick={copyClientCode} style={{
          fontSize: 32, fontWeight: 900, color: C.navy, letterSpacing: ".08em", background: C.tealL,
          border: "1.5px dashed " + C.tealB, borderRadius: 12, padding: "16px 20px", marginBottom: 6, cursor: "pointer", fontFamily: "system-ui", width: "100%",
        }}>{clientCode}</button>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 22 }}>Tap to copy - along with your phone number, this is how you'll check your ticket later.</div>
        <Btn label="Continue to Payment" primary full onClick={() => setShowPay(true)} />
      </div>
      <Toast {...toast} />

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
    </div>
  );

  if (screen === "auth") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <button onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 14 }}>&larr; Back</button>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          {isReg ? (authRole === "hospital" ? "Hospital Sign Up" : "Professional Sign Up") : "Sign In"}
        </div>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>
          {isReg ? (authRole === "hospital" ? "Register your hospital or clinic." : "For verified healthcare staff and admin only.") : "Sign in to your account."}
        </p>
        {isReg && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => setAuthRole("staff")} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: authRole === "staff" ? C.tealL : C.white, border: "1.5px solid " + (authRole === "staff" ? C.tealB : C.border), color: authRole === "staff" ? C.teal : C.body,
            }}>Healthcare Professional</button>
            <button onClick={() => setAuthRole("hospital")} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: authRole === "hospital" ? C.tealL : C.white, border: "1.5px solid " + (authRole === "hospital" ? C.tealB : C.border), color: authRole === "hospital" ? C.teal : C.body,
            }}>Hospital</button>
          </div>
        )}
        {isReg && <Field label={authRole === "hospital" ? "Your Name (hospital contact)" : "Full Name"} value={authName} onChange={e => setAuthName(e.target.value)} required />}
        {isReg && authRole === "staff" && (
          <>
            <Field label="License / Registration Number" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required />
            <Field label="Issuing Institution" value={issuingInstitution} onChange={e => setIssuingInstitution(e.target.value)} required />
            <Field label="Specialty (optional)" value={specialty} onChange={e => setSpecialty(e.target.value)} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
              An admin will review these before your account can claim tickets. If you're affiliated with a hospital already registered here, that hospital can add you to its roster from its dashboard using this email.
            </p>
          </>
        )}
        {isReg && authRole === "hospital" && (
          <>
            <Field label="Hospital / Clinic Name" value={hospitalName} onChange={e => setHospitalName(e.target.value)} required />
            <Field label="Town" value={hospitalTown} onChange={e => setHospitalTown(e.target.value)} required />
            <Field label="Address (optional)" value={hospitalAddress} onChange={e => setHospitalAddress(e.target.value)} />
            <Field label="Phone (optional)" value={hospitalPhone} onChange={e => setHospitalPhone(e.target.value)} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
              An admin will review and verify your hospital before it appears in the client check-in list. Once verified, you can add doctors to your roster from your dashboard.
            </p>
          </>
        )}
        <Field label="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} type="email" required />
        <Field label={isReg ? "Password (at least 8 characters)" : "Password"} value={authPass} onChange={e => setAuthPass(e.target.value)} type="password" required />
        {isReg && (
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
            By creating an account you agree to our <span onClick={() => setScreen("terms")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>Terms of Service</span> and <span onClick={() => setScreen("privacy")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>Privacy Policy</span>.
          </div>
        )}
        <Btn label={authBusy ? "Please wait..." : isReg ? "Create Account" : "Sign In"} primary full loading={authBusy} onClick={handleAuth} />
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>
          {isReg ? "Already have an account? " : "New here? "}
          <span onClick={() => setIsReg(!isReg)} style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}>{isReg ? "Sign in" : "Create one"}</span>
        </div>
      </div>
      <Toast {...toast} />
    </div>
  );

  // -- MAIN APP SHELL (staff/admin only) --
  if (!user) return null;

  return (
    <div className="ti-shell" style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex" }}>
      <style>{`
        @media (max-width: 768px) {
          .ti-shell { flex-direction: column; }
          .ti-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border};
            padding: 10px 14px !important; display: flex !important; align-items: center; flex-wrap: wrap; gap: 10px; }
          .ti-sidebar-title { margin-bottom: 0 !important; }
          .ti-nav { display: flex !important; flex: 1; overflow-x: auto; gap: 4px; margin: 0 !important; }
          .ti-nav button { width: auto !important; white-space: nowrap; margin-bottom: 0 !important; }
          .ti-account { margin-top: 0 !important; padding-top: 0 !important; border-top: none !important;
            display: flex !important; align-items: center; gap: 8px; white-space: nowrap; }
          .ti-account-name { display: none !important; }
          .ti-content { padding: 16px !important; }
        }
      `}</style>
      <div className="ti-sidebar" style={{ width: 168, background: C.white, borderRight: "1px solid " + C.border, padding: "16px 12px", flexShrink: 0 }}>
        <div className="ti-sidebar-title" style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 14, fontFamily: "Georgia,serif" }}>Ticket-In</div>
        <div className="ti-nav">
          {[
            ...(isStaff ? [{ id: "staffboard", label: "Ticket Board" }] : []),
            ...(isHospital ? [{ id: "hospital", label: "Hospital Dashboard" }] : []),
            ...(isStaff || isAdmin ? [{ id: "forum", label: "Forum" }] : []),
            ...(isStaff || isAdmin ? [{ id: "resources", label: "Resources" }] : []),
            ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
            ...(isAdmin ? [{ id: "users", label: "Manage Users" }] : []),
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setPage(id)} style={{
              width: "100%", padding: "6px 8px", background: page === id ? C.tealL : "transparent", border: "none", borderRadius: 7,
              color: page === id ? C.teal : C.body, display: "block", fontSize: 12, fontWeight: page === id ? 700 : 500, marginBottom: 1, cursor: "pointer", textAlign: "left", fontFamily: "system-ui",
            }}>{label}</button>
          ))}
        </div>
        <div className="ti-account" style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid " + C.surf }}>
          <div className="ti-account-name">
            <div style={{ fontSize: 11, fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>{user.role}</div>
          </div>
          <button onClick={logout} style={{ background: "none", border: "none", color: C.red, fontSize: 10, cursor: "pointer", padding: 0, marginTop: 4, fontFamily: "system-ui" }}>Sign Out</button>
          <div style={{ marginTop: 8, fontSize: 9, color: C.muted }}>
            <span onClick={() => setScreen("privacy")} style={{ cursor: "pointer" }}>Privacy</span>
            {" \u00b7 "}
            <span onClick={() => setScreen("terms")} style={{ cursor: "pointer" }}>Terms</span>
          </div>
        </div>
      </div>

      <div className="ti-content" style={{ flex: 1, padding: 32, maxWidth: 720 }}>

        {page === "staffboard" && isStaff && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Ticket Board</h1>
            {user.staff_verification_status !== "verified" && (
              <div style={{ background: "#FBF0D6", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: C.body }}>
                Your account is pending verification. You'll be able to claim tickets once an admin approves your account.
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 800, margin: "20px 0 10px" }}>Open Tickets ({openTickets.length})</div>
            {openTickets.slice().sort((a, b) => (b.severity_level || 0) - (a.severity_level || 0)).map(t => {
              const waitMins = (Date.now() - new Date(t.created_at).getTime()) / 60000;
              const waitColor = waitMins >= 240 ? C.red : waitMins >= 60 ? C.gold : C.muted;
              return (
              <div key={t.id} style={{
                background: C.white, borderRadius: 12, padding: 16, marginBottom: 10,
                border: t.severity_level >= EMERGENCY_THRESHOLD ? "2px solid " + C.redB : "1px solid " + C.border,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {t.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">Urgent</Tag>}
                    {t.is_minor && <Tag kind="pending">Minor - Guardian on File</Tag>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: waitColor }}>Waiting {timeAgo(t.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginTop: 6, marginBottom: 4 }}><strong>Onset:</strong> {t.onset}</div>
                <div style={{ fontSize: 13, color: C.body, marginBottom: 4 }}>
                  <strong>Severity:</strong> {t.severity_level}/10{t.severity_description ? " - " + t.severity_description : ""}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: t.is_minor ? 2 : 10 }}>Contact: {t.client_phone}</div>
                {t.is_minor && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Guardian: {t.guardian_name} - {t.guardian_phone}</div>}
                <Btn label="Claim Ticket" primary small onClick={() => claimTicket(t.id)} disabled={user.staff_verification_status !== "verified"} />
              </div>
              );
            })}
            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>My Claimed Tickets ({myClaimed.length})</div>
            {myClaimed.map(t => (
              <div key={t.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <Tag kind={t.status}>{t.status.replace("_", " ")}</Tag>
                    {t.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">Urgent</Tag>}
                    {t.is_minor && <Tag kind="pending">Minor</Tag>}
                  </div>
                  <span style={{ fontSize: 11, color: C.muted }}>Submitted {timeAgo(t.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginBottom: 4 }}>{t.onset}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: t.is_minor ? 2 : 10 }}>Contact: {t.client_phone}</div>
                {t.is_minor && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Guardian: {t.guardian_name} - {t.guardian_phone}</div>}
                {t.status === "claimed" && <Btn label="Start Consultation" primary small onClick={() => startConsultation(t.id)} />}
                {t.status === "in_progress" && <Btn label="Resolve & Add Notes" primary small onClick={() => setResolvingTicket(t.id)} />}
              </div>
            ))}
          </div>
        )}

        {page === "hospital" && isHospital && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{myHospital?.name || "Hospital Dashboard"}</h1>
            {user.staff_verification_status !== "verified" && (
              <div style={{ background: "#FBF0D6", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: C.body }}>
                Your hospital is pending admin verification. It won't appear in the client check-in list, and no tickets will be routed to it, until then.
              </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "20px 0 10px" }}>Doctor Roster ({hospitalDoctors.length})</div>
            <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Add a doctor by their registered email" value={doctorEmailInput} onChange={e => setDoctorEmailInput(e.target.value)} placeholder="doctor@email.com" />
                </div>
                <div style={{ paddingTop: 22 }}>
                  <Btn label={doctorAddBusy ? "Adding..." : "Add"} primary loading={doctorAddBusy} onClick={addDoctorByEmail} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: -8 }}>They must already have a Ticket-In healthcare-professional account.</div>
            </div>
            {hospitalDoctors.map(d => (
              <div key={d.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{d.staff_credentials?.specialty || d.staff_credentials?.issuing_institution || ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Tag kind={d.staff_verification_status === "verified" ? "verified" : "pending"}>{d.staff_verification_status}</Tag>
                  <button onClick={() => removeDoctor(d.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "system-ui" }}>Remove</button>
                </div>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>Tickets Sent to Your Hospital ({hospitalTickets.length})</div>
            {hospitalTickets.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>No in-person tickets yet.</div>}
            {hospitalTickets.map(t => (
              <div key={t.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <Tag kind={t.status}>{t.status.replace("_", " ")}</Tag>
                    {t.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">Urgent</Tag>}
                  </div>
                  <span style={{ fontSize: 11, color: C.muted }}>Submitted {timeAgo(t.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginBottom: 4 }}>{t.onset}</div>
                <div style={{ fontSize: 12, color: C.muted }}>Contact: {t.client_phone}</div>
              </div>
            ))}
          </div>
        )}

        {page === "forum" && (isStaff || isAdmin) && (
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Forum</h1>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
              Professional discussion between staff and admin. Not visible to clients.
            </p>

            {(isAdmin || user.staff_verification_status === "verified") ? (
              <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 13, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Start a Discussion</div>
                <Field label="Subject (optional)" value={newThreadSubject} onChange={e => setNewThreadSubject(e.target.value)} placeholder="e.g. Case management" />
                <Field label="What's on your mind?" value={newThreadBody} onChange={e => setNewThreadBody(e.target.value)} rows={3} placeholder="Ask a question or start a discussion..." />
                <Btn label="Post" primary full onClick={submitThread} />
              </div>
            ) : (
              <div style={{ background: C.surf, borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 12, color: C.muted, textAlign: "center" }}>
                You'll be able to post once your account is verified. You can still read the forum.
              </div>
            )}

            {forumLoading ? (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>Loading...</div>
            ) : (
              forumPosts.filter(p => !p.parent_post_id && !p.is_deleted).map(thread => {
                const replies = forumPosts.filter(p => p.parent_post_id === thread.id && !p.is_deleted);
                const canModerate = isAdmin || user.id === thread.staff_id;
                return (
                  <div key={thread.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 13, padding: 16, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        {thread.subject && <Tag kind="pending">{thread.subject}</Tag>}
                        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{thread.staff_name} <span style={{ fontWeight: 400, color: C.muted }}>&middot; {new Date(thread.created_at).toLocaleDateString()}</span></div>
                      </div>
                      {canModerate && <button onClick={() => deleteForumPost(thread.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>Remove</button>}
                    </div>
                    <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, marginBottom: 10 }}>{thread.body}</div>

                    {replies.length > 0 && (
                      <div style={{ borderLeft: "2px solid " + C.surf, paddingLeft: 12, marginBottom: 10 }}>
                        {replies.map(r => (
                          <div key={r.id} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{r.staff_name}
                              {(isAdmin || user.id === r.staff_id) && <button onClick={() => deleteForumPost(r.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 10, cursor: "pointer", marginLeft: 8, fontFamily: "system-ui" }}>Remove</button>}
                            </div>
                            <div style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>{r.body}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(isAdmin || user.staff_verification_status === "verified") && (
                      expandedThread === thread.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder="Write a reply..."
                            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 13, fontFamily: "system-ui", outline: "none" }} />
                          <Btn label="Reply" small onClick={() => submitReply(thread.id)} />
                        </div>
                      ) : (
                        <button onClick={() => setExpandedThread(thread.id)} style={{ background: "none", border: "none", color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "system-ui" }}>Reply</button>
                      )
                    )}
                  </div>
                );
              })
            )}
            {!forumLoading && forumPosts.filter(p => !p.parent_post_id && !p.is_deleted).length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>No discussions yet - be the first to post.</div>
            )}
          </div>
        )}

        {page === "resources" && (isStaff || isAdmin) && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>Resources</h1>
              {isAdmin && <Btn label={showAddResource ? "Cancel" : "Add Resource"} small onClick={() => setShowAddResource(s => !s)} />}
            </div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Reference guidelines, protocols, and notes for staff.</p>

            {showAddResource && isAdmin && (
              <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 13, padding: 16, marginBottom: 20 }}>
                <Field label="Title" value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder="e.g. WHO Triage Guidelines" />
                <Field label="Category (optional)" value={newResCategory} onChange={e => setNewResCategory(e.target.value)} placeholder="e.g. Triage, Referral" />
                <Field label="Description (optional)" value={newResDesc} onChange={e => setNewResDesc(e.target.value)} rows={2} />
                <Field label="Link (optional)" value={newResLink} onChange={e => setNewResLink(e.target.value)} placeholder="https://..." />
                <Field label="Written content (optional)" value={newResText} onChange={e => setNewResText(e.target.value)} rows={4} placeholder="Notes, a protocol, or guidance written directly here..." />
                <Btn label="Save Resource" primary full onClick={submitResource} />
              </div>
            )}

            {resourcesLoading ? (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>Loading...</div>
            ) : (
              resources.map(r => (
                <div key={r.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 13, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      {r.category && <Tag kind="pending">{r.category}</Tag>}
                      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{r.title}</div>
                    </div>
                    {isAdmin && <button onClick={() => deleteResource(r.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>Remove</button>}
                  </div>
                  {r.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{r.description}</div>}
                  {r.text_content && <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-wrap" }}>{r.text_content}</div>}
                  {r.link_url && <a href={r.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: C.teal, fontWeight: 700 }}>Open Link &rarr;</a>}
                </div>
              ))
            )}
            {!resourcesLoading && resources.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>No resources yet.</div>
            )}
          </div>
        )}

        {page === "admin" && isAdmin && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Admin</h1>

            {urgentTickets.length > 0 && (
              <div style={{ background: C.redL, border: "2px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 26 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.red, marginBottom: 4 }}>
                  Needs Attention - Urgent ({urgentTickets.length})
                </div>
                <div style={{ fontSize: 11, color: C.body, marginBottom: 12 }}>
                  Severity 8+ and not yet resolved, regardless of payment status - a payment problem should never be why a potentially urgent case goes unnoticed.
                </div>
                {urgentTickets.map(t => (
                  <div key={t.id} style={{ background: C.white, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Tag kind={t.status}>{t.status.replace("_", " ")}</Tag>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.red }}>{timeAgo(t.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.ink }}>{t.onset}{t.severity_description ? " - " + t.severity_description : ""}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginTop: 2 }}>Severity {t.severity_level}/10 - Contact: {t.client_phone}</div>
                  </div>
                ))}
              </div>
            )}

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

            <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 26 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Find a Ticket by Phone</div>
              <div style={{ display: "flex", gap: 8, marginBottom: phoneSearchResults ? 14 : 0 }}>
                <input value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} placeholder="e.g. 6XX XXX XXX"
                  onKeyDown={e => e.key === "Enter" && searchByPhone()}
                  style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1.5px solid " + C.border, fontSize: 13, fontFamily: "system-ui", outline: "none" }} />
                <Btn label={phoneSearchBusy ? "..." : "Search"} primary small onClick={searchByPhone} />
              </div>
              {phoneSearchResults && (
                phoneSearchResults.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted }}>No tickets found for that number.</div>
                ) : (
                  phoneSearchResults.map(t => (
                    <div key={t.id} style={{ borderTop: "1px solid " + C.surf, paddingTop: 10, marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <Tag kind={t.status}>{t.status.replace("_", " ")}</Tag>
                        <span style={{ fontSize: 11, color: C.muted }}>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink }}>{t.onset}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Severity {t.severity_level}/10 - Code: {t.client_code} - {t.client_phone}</div>
                    </div>
                  ))
                )
              )}
            </div>

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
              <div key={s.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.name}</div>
                {s.credentials ? (
                  <div style={{ fontSize: 12, color: C.body, marginBottom: 10, lineHeight: 1.7 }}>
                    <div><strong>License #:</strong> {s.credentials.license_number || "-"}</div>
                    <div><strong>Institution:</strong> {s.credentials.issuing_institution || "-"}</div>
                    {s.credentials.specialty && <div><strong>Specialty:</strong> {s.credentials.specialty}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>No credentials submitted - do not verify without checking why.</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn label="Verify" primary small onClick={() => verifyStaff(s.id, "verified")} />
                  <Btn label="Reject" small onClick={() => verifyStaff(s.id, "rejected")} />
                </div>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>Pending Hospital Verification ({pendingHospitals.length})</div>
            {pendingHospitals.map(h => (
              <div key={h.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{h.name}</div>
                {h.hospital ? (
                  <div style={{ fontSize: 12, color: C.body, marginBottom: 10, lineHeight: 1.7 }}>
                    <div><strong>Hospital:</strong> {h.hospital.name}</div>
                    <div><strong>Town:</strong> {h.hospital.town}</div>
                    {h.hospital.address && <div><strong>Address:</strong> {h.hospital.address}</div>}
                    {h.hospital.phone && <div><strong>Phone:</strong> {h.hospital.phone}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>No hospital record found - do not verify without checking why.</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn label="Verify" primary small onClick={() => verifyStaff(h.id, "verified")} />
                  <Btn label="Reject" small onClick={() => verifyStaff(h.id, "rejected")} />
                </div>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>In-Person Tickets by Hospital ({hospitalTicketIndex.length})</div>
            {hospitalTicketIndex.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>No in-person tickets yet.</div>}
            {hospitalTicketIndex.map(t => (
              <div key={t.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Tag kind={t.status}>{t.status.replace("_", " ")}</Tag>
                  <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(t.created_at)}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{t.hospitals?.name || "Unknown hospital"} - {t.hospitals?.town}</div>
                <div style={{ fontSize: 12, color: C.ink }}>{t.onset}</div>
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
                {u.role === "staff" && (
                  u.credentials ? (
                    <div style={{ fontSize: 12, color: C.body, marginBottom: 10, lineHeight: 1.7 }}>
                      <div><strong>License #:</strong> {u.credentials.license_number || "-"}</div>
                      <div><strong>Institution:</strong> {u.credentials.issuing_institution || "-"}</div>
                      {u.credentials.specialty && <div><strong>Specialty:</strong> {u.credentials.specialty}</div>}
                      {u.verified_at && <div style={{ color: C.muted, fontSize: 11 }}>Verified {new Date(u.verified_at).toLocaleDateString()}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>No credentials on file.</div>
                  )
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["staff", "admin"].map(r => r !== u.role && (
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
