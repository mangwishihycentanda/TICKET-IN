import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabaseClient.js";
import { makeT } from "./i18n.js";

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

// Small EN/FR language toggle, reused on every screen (top-right of the
// account-free screens, and in the main app shell's sidebar).
export const LangToggle = ({ lang, setLang, style }) => (
  <div style={{ display: "inline-flex", border: "1.5px solid " + C.border, borderRadius: 8, overflow: "hidden", ...style }}>
    {["en", "fr"].map(code => (
      <button key={code} onClick={() => setLang(code)} style={{
        padding: "4px 9px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui", border: "none",
        background: lang === code ? C.teal : C.white, color: lang === code ? "#fff" : C.muted,
      }}>{code.toUpperCase()}</button>
    ))}
  </div>
);

// Field keys are looked up via t() at render time so labels/placeholders
// follow the active language; only the field key (used for form state and
// the underlying DB column) stays fixed here.
const OLDCART_FIELD_KEYS = ["onset", "location", "duration", "character", "aggravating_factors", "relieving_factors", "timing"];

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
function timeAgo(dateString, lang = "en") {
  const tr = makeT(lang);
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return tr("time.justNow");
  if (mins < 60) return tr("time.minAgo", { m: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tr("time.hourMinAgo", { h: hours, m: mins % 60 });
  const days = Math.floor(hours / 24);
  return tr("time.dayHourAgo", { d: days, h: hours % 24 });
}

const Sec = ({ title, children }) => (
  <div style={{ marginBottom: 18 }}>
    {title && <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginBottom: 6 }}>{title}</div>}
    <div style={{ fontSize: 13, color: C.body, lineHeight: 1.7 }}>{children}</div>
  </div>
);

function PrivacyPolicyContent({ lang }) {
  const t = makeT(lang);
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t("privacy.title")}</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>{t("privacy.lastUpdated")}</div>

      <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 12, color: C.body, lineHeight: 1.6 }}>
        {t("privacy.interimNotice")}
      </div>

      <Sec title={t("privacy.whoWeAreTitle")}>{t("privacy.whoWeAreBody")}</Sec>

      <Sec title={t("privacy.whatWeCollectTitle")}>
        <span dangerouslySetInnerHTML={{ __html: t("privacy.whatWeCollectBody") }} />
      </Sec>

      <Sec title={t("privacy.howWeUseTitle")}>{t("privacy.howWeUseBody")}</Sec>

      <Sec title={t("privacy.whoCanSeeTitle")}>{t("privacy.whoCanSeeBody")}</Sec>

      <Sec title={t("privacy.whereStoredTitle")}>{t("privacy.whereStoredBody")}</Sec>

      <Sec title={t("privacy.howLongTitle")}>{t("privacy.howLongBody")}</Sec>

      <Sec title={t("privacy.yourRightsTitle")}>{t("privacy.yourRightsBody")}</Sec>

      <Sec title={t("privacy.paymentsTitle")}>{t("privacy.paymentsBody")}</Sec>

      <Sec title={t("privacy.changesTitle")}>{t("privacy.changesBody")}</Sec>
    </div>
  );
}

function TermsOfServiceContent({ lang }) {
  const t = makeT(lang);
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t("terms.title")}</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 20 }}>{t("terms.lastUpdated")}</div>

      <Sec title={t("terms.whatIsTitle")}>
        <span dangerouslySetInnerHTML={{ __html: t("terms.whatIsBody") }} />
      </Sec>

      <Sec title={t("terms.whoCanUseTitle")}>
        <span dangerouslySetInnerHTML={{ __html: t("terms.whoCanUseBody") }} />
      </Sec>

      <Sec title={t("terms.howServiceWorksTitle")}>{t("terms.howServiceWorksBody")}</Sec>

      <Sec title={t("terms.paymentsTitle")}>{t("terms.paymentsBody")}</Sec>

      <Sec title={t("terms.clinicalSafetyTitle")}>{t("terms.clinicalSafetyBody")}</Sec>

      <Sec title={t("terms.liabilityTitle")}>{t("terms.liabilityBody")}</Sec>

      <Sec title={t("terms.governingLawTitle")}>{t("terms.governingLawBody")}</Sec>

      <Sec title={t("terms.contactTitle")}>{t("terms.contactBody")}</Sec>
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

  const [lang, setLang] = useState(() => { try { return localStorage.getItem("ti_lang") || "en"; } catch { return "en"; } });
  useEffect(() => { try { localStorage.setItem("ti_lang", lang); } catch {} }, [lang]);
  const t = makeT(lang);

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
      else if (event === "PASSWORD_RECOVERY") { setScreen("reset-password"); }
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
    if (!authEmail || !authPass) { notify(t("auth.err.emailPasswordRequired"), false); return; }
    if (isReg && authPass.length < 8) { notify(t("auth.err.passwordMin8"), false); return; }
    if (isReg && authRole === "staff" && (!licenseNumber.trim() || !issuingInstitution.trim())) {
      notify(t("auth.err.licenseInstitutionRequired"), false); return;
    }
    if (isReg && authRole === "hospital" && (!hospitalName.trim() || !hospitalTown.trim())) {
      notify(t("auth.err.hospitalNameTownRequired"), false); return;
    }
    setAuthBusy(true);
    if (isReg) {
      if (!authName.trim()) { setAuthBusy(false); notify(t("auth.err.nameRequired"), false); return; }
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
        if (!res.ok) { setAuthBusy(false); notify(body.error || t("auth.err.registrationNotFinalized"), false); return; }
      } else {
        setAuthBusy(false);
        notify(t("auth.accountCreatedConfirmEmail"));
        return;
      }
      setAuthBusy(false);
      notify(t("auth.accountCreated"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
      setAuthBusy(false);
      if (error) { notify(error.message, false); return; }
    }
  }

  async function logout() { await supabase.auth.signOut(); }

  // -- PASSWORD RESET --
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  async function requestPasswordReset() {
    if (!resetEmail.trim()) { notify(t("reset.err.enterEmailFirst"), false); return; }
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: window.location.origin });
    setResetBusy(false);
    // Deliberately the same message whether or not the email exists -
    // confirming/denying an account's existence to an unauthenticated
    // caller is an account-enumeration leak.
    if (error) notify(error.message, false);
    else setResetSent(true);
  }

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordBusy, setNewPasswordBusy] = useState(false);
  async function submitNewPassword() {
    if (newPassword.length < 8) { notify(t("auth.err.passwordMin8"), false); return; }
    setNewPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setNewPasswordBusy(false);
    if (error) { notify(error.message, false); return; }
    setNewPassword("");
    notify(t("reset.passwordUpdated"));
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) { await loadProfileIntoUser(session.user); setScreen("app"); }
    else setScreen("landing");
  }

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
    if (!emergencyAck) { notify(t("checkin.err.readEmergencyNotice"), false); scrollToField(emergencyAckRef); return; }
    if (!checkinPhone.trim()) { notify(t("checkin.err.enterPhone"), false); scrollToField(phoneRef); return; }
    if (!ticketForm.onset.trim() || !severityLevel) { notify(t("checkin.err.onsetSeverityRequired"), false); scrollToField(onsetSeverityRef); return; }
    if (isAdult === null) { notify(t("checkin.err.confirmAge"), false); scrollToField(ageRef); return; }
    if (isAdult === false && (!guardianName.trim() || !guardianPhone.trim())) {
      notify(t("checkin.err.guardianRequired"), false); scrollToField(guardianRef); return;
    }
    if (consultType === "in_person" && !selectedHospitalId) {
      notify(t("checkin.err.chooseHospital"), false); scrollToField(hospitalRef); return;
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
      if (!res.ok) { notify(body.error || t("checkin.err.submitFailed"), false); return; }
      setPendingTicketId(body.ticketId);
      setClientCode(body.clientCode);
      if (severityLevel >= EMERGENCY_THRESHOLD) setShowEmergencyWarning(true);
      else setScreen("checkin-code");
    } catch (e) {
      setTicketBusy(false);
      notify(t("checkin.err.submitFailedWithError", { error: e.message }), false);
    }
  }

  async function openPayment() {
    setMomoDetailsError("");
    if (momoDetails) return;
    try {
      const res = await fetch("/api/get-momo-details", { method: "POST" });
      const body = await res.json();
      if (!res.ok) { setMomoDetailsError(body.error || t("checkincode.err.paymentDetailsFailed")); return; }
      setMomoDetails(body);
    } catch (e) { setMomoDetailsError(t("checkincode.err.paymentDetailsFailedWithError", { error: e.message })); }
  }
  useEffect(() => { if (showPay) openPayment(); }, [showPay]);

  async function copyMomoNumber() {
    if (!momoDetails) return;
    try { await navigator.clipboard.writeText(momoDetails.momoNumber); setMomoCopied(true); setTimeout(() => setMomoCopied(false), 2000); }
    catch { notify(t("checkincode.err.copyLongPress"), false); }
  }
  async function copyClientCode() {
    if (!clientCode) return;
    try { await navigator.clipboard.writeText(clientCode); notify(t("checkincode.codeCopied")); }
    catch { notify(t("checkincode.err.copyWriteDown"), false); }
  }

  async function submitPayment() {
    if (!momoRef.trim()) { notify(t("checkincode.err.enterReference"), false); return; }
    setMomoBusy(true);
    try {
      const res = await fetch("/api/submit-checkin-payment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: pendingTicketId, phone: checkinPhone.trim(), code: clientCode, referenceNote: momoRef.trim() }),
      });
      const body = await res.json();
      setMomoBusy(false);
      if (!res.ok) { notify(body.error || t("checkincode.err.submitPaymentFailed"), false); return; }
      notify(t("checkincode.paymentSubmitted"));
      setShowPay(false); setMomoRef(""); setMomoDetails(null);
      setScreen("landing");
      setTicketForm(EMPTY_TICKET_FORM); setSeverityLevel(null); setEmergencyAck(false);
      setIsAdult(null); setGuardianName(""); setGuardianPhone("");
      setConsultType("remote"); setSelectedHospitalId("");
      setPendingTicketId(null); setClientCode(null); setCheckinPhone("");
    } catch (e) {
      setMomoBusy(false);
      notify(t("checkincode.err.submitPaymentFailedWithError", { error: e.message }), false);
    }
  }

  // -- LOOKUP (account-free ticket status check) --
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  async function submitRating() {
    if (ratingValue < 1) return;
    setRatingBusy(true);
    const res = await fetch("/api/lookup-ticket", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rate",
        ticketId: lookupResult.id, phone: lookupPhone.trim(), code: lookupCode.trim(),
        rating: ratingValue, comment: ratingComment,
      }),
    });
    const body = await res.json();
    setRatingBusy(false);
    if (!res.ok) { notify(body.error || t("lookup.err.ratingFailed"), false); return; }
    setRatingDone(true);
    notify(t("lookup.ratingThanks"));
  }

  async function doLookup() {
    if (!lookupPhone.trim() || !lookupCode.trim()) { setLookupError(t("lookup.enterBoth")); return; }
    setLookupBusy(true); setLookupError(""); setLookupResult(null);
    setRatingValue(0); setRatingComment(""); setRatingDone(false);
    try {
      const res = await fetch("/api/lookup-ticket", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: lookupPhone.trim(), code: lookupCode.trim() }),
      });
      const body = await res.json();
      setLookupBusy(false);
      if (!res.ok) { setLookupError(body.error || t("lookup.notFound")); return; }
      setLookupResult(body.ticket);
    } catch (e) {
      setLookupBusy(false);
      setLookupError(t("lookup.checkFailed", { error: e.message }));
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
    if (!res.ok) { notify(body.error || t("staff.err.claimFailed"), false); loadStaffBoard(); return; }
    notify(t("staff.ticketClaimed"));
    loadStaffBoard();
  }

  async function startConsultation(ticketId) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/start-consultation", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ ticketId }),
    });
    const body = await res.json();
    if (!res.ok) { notify(body.error || t("common.couldNotUpdate", { error: body.error || "" }), false); loadStaffBoard(); return; }
    notify(t("staff.consultationStarted"));
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
    if (!newThreadBody.trim()) { notify(t("forum.err.writeSomething"), false); return; }
    const { error } = await supabase.from("forum_posts").insert({
      staff_id: user.id, staff_name: user.name, subject: newThreadSubject.trim() || null, body: newThreadBody.trim(), parent_post_id: null,
    });
    if (error) { notify(t("forum.err.postFailed", { error: error.message }), false); return; }
    setNewThreadSubject(""); setNewThreadBody("");
    loadForum();
  }
  async function submitReply(parentId) {
    if (!replyBody.trim()) return;
    const { error } = await supabase.from("forum_posts").insert({
      staff_id: user.id, staff_name: user.name, parent_post_id: parentId, body: replyBody.trim(),
    });
    if (error) { notify(t("forum.err.replyFailed", { error: error.message }), false); return; }
    setReplyBody(""); setExpandedThread(null);
    loadForum();
  }
  async function deleteForumPost(id) {
    if (!confirm(t("forum.confirmRemovePost"))) return;
    const { error } = await supabase.from("forum_posts").update({ is_deleted: true }).eq("id", id);
    if (error) { notify(t("common.couldNotRemove", { error: error.message }), false); return; }
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
    if (!newResTitle.trim()) { notify(t("resources.err.titleRequired"), false); return; }
    if (!newResLink.trim() && !newResText.trim()) { notify(t("resources.err.linkOrTextRequired"), false); return; }
    const { error } = await supabase.from("resources").insert({
      title: newResTitle.trim(), category: newResCategory.trim() || null, description: newResDesc.trim() || null,
      link_url: newResLink.trim() || null, text_content: newResText.trim() || null, created_by: user.id,
    });
    if (error) { notify(t("resources.err.addFailed", { error: error.message }), false); return; }
    setNewResTitle(""); setNewResCategory(""); setNewResDesc(""); setNewResLink(""); setNewResText(""); setShowAddResource(false);
    notify(t("resources.added"));
    loadResources();
  }
  async function deleteResource(id) {
    if (!confirm(t("resources.confirmRemove"))) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) { notify(t("common.couldNotRemove", { error: error.message }), false); return; }
    loadResources();
  }

  const [resolveBusy, setResolveBusy] = useState(false);
  async function submitResolution() {
    if (!resolveSummary.trim()) { notify(t("resolve.err.summaryRequired"), false); return; }
    setResolveBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/resolve-ticket", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ ticketId: resolvingTicket, notes: resolveNotes, summary: resolveSummary.trim() }),
      });
      const body = await res.json();
      setResolveBusy(false);
      if (!res.ok) { notify(body.error || t("resolve.err.resolveFailed"), false); return; }
      notify(t("resolve.ticketResolved"));
      setResolvingTicket(null); setResolveSummary(""); setResolveNotes({ objective_assessment: "", clinical_diagnosis: "", plan: "", implementation: "", evaluation: "" });
      loadStaffBoard();
      loadMyPayouts();
    } catch (e) {
      setResolveBusy(false);
      notify(t("resolve.err.resolveFailedWithError", { error: e.message }), false);
    }
  }

  // -- STAFF: MY EARNINGS (staff_payouts, own rows only) --
  const [myPayouts, setMyPayouts] = useState([]);
  async function loadMyPayouts() {
    const { data, error } = await supabase.from("staff_payouts").select("*").eq("staff_id", user.id).order("created_at", { ascending: false });
    if (!error && data) setMyPayouts(data);
  }

  // ==========================================================================
  // ADMIN
  // ==========================================================================
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [hospitalTicketIndex, setHospitalTicketIndex] = useState([]);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  async function loadPendingPayouts() {
    const { data, error } = await supabase.from("staff_payouts").select("*").eq("status", "pending").order("created_at", { ascending: true });
    if (error || !data) return;
    const staffIds = [...new Set(data.map(p => p.staff_id))];
    const { data: staffRows } = staffIds.length
      ? await supabase.from("profiles").select("id, name").in("id", staffIds)
      : { data: [] };
    const nameById = Object.fromEntries((staffRows || []).map(s => [s.id, s.name]));
    setPendingPayouts(data.map(p => ({ ...p, staffName: nameById[p.staff_id] || "Unknown" })));
  }
  async function markPayoutPaid(payoutId) {
    const { error } = await supabase.from("staff_payouts").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payoutId).eq("status", "pending");
    if (error) { notify(t("common.couldNotUpdate", { error: error.message }), false); return; }
    notify(t("admin.markedPaid"));
    loadPendingPayouts();
  }
  const [allUsers, setAllUsers] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneSearchResults, setPhoneSearchResults] = useState(null);
  const [phoneSearchNotes, setPhoneSearchNotes] = useState({});
  const [phoneSearchRatings, setPhoneSearchRatings] = useState({});
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
    if (!phoneSearch.trim()) { notify(t("admin.err.enterPhoneToSearch"), false); return; }
    setPhoneSearchBusy(true);
    const { data, error } = await supabase.from("tickets").select("*")
      .ilike("client_phone", "%" + phoneSearch.trim() + "%")
      .order("created_at", { ascending: false });
    if (error) { setPhoneSearchBusy(false); notify(t("admin.err.searchFailed", { error: error.message }), false); return; }
    setPhoneSearchResults(data || []);
    // Admin oversight: pull the doctor's detailed clinical notes for any
    // resolved ticket in these results too - ticket_clinical_notes already
    // has a clinical_notes_select_admin RLS policy allowing this, the UI
    // just never surfaced it. resolution_summary (the client-facing plain
    // summary) is already a column on the ticket itself, no extra query
    // needed for that part.
    const resolvedIds = (data || []).filter(tk => tk.status === "resolved").map(tk => tk.id);
    if (resolvedIds.length > 0) {
      const { data: notes } = await supabase.from("ticket_clinical_notes").select("*").in("ticket_id", resolvedIds);
      setPhoneSearchNotes(Object.fromEntries((notes || []).map(n => [n.ticket_id, n])));
      // Client's own rating + comment of the staff who handled this ticket -
      // ratings_select_all already lets admin read this, the UI just never
      // surfaced it (same gap as the clinical notes above).
      const { data: ratings } = await supabase.from("ratings").select("*").in("ticket_id", resolvedIds);
      setPhoneSearchRatings(Object.fromEntries((ratings || []).map(r => [r.ticket_id, r])));
    } else {
      setPhoneSearchNotes({});
      setPhoneSearchRatings({});
    }
    setPhoneSearchBusy(false);
  }
  async function loadTicketStats() {
    const { data, error } = await supabase.from("tickets").select("status, severity_level");
    if (error) { notify(t("admin.err.statsFailed", { error: error.message }), false); return; }
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
    const [usersRes, credsRes, hospitalsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_credentials").select("*"),
      supabase.from("hospitals").select("*"),
    ]);
    if (usersRes.error) { notify(t("admin.err.loadUsersFailed", { error: usersRes.error.message }), false); return; }
    const credsById = Object.fromEntries((credsRes.data || []).map(c => [c.staff_id, c]));
    const hospitalByOwner = Object.fromEntries((hospitalsRes.data || []).map(h => [h.created_by, h]));
    if (usersRes.data) setAllUsers(usersRes.data.map(u => ({ ...u, credentials: credsById[u.id], hospital: hospitalByOwner[u.id] })));
  }
  async function changeUserRole(userId, newRole) {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) { notify(t("admin.err.updateRoleFailed", { error: error.message }), false); return; }
    notify(t("admin.roleUpdated"));
    loadAllUsers();
  }
  async function changeUserVerification(userId, status) {
    const patch = { staff_verification_status: status };
    if (status === "verified") { patch.verified_by = user.id; patch.verified_at = new Date().toISOString(); }
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) { notify(t("common.couldNotUpdate", { error: error.message }), false); return; }
    notify(t("common.updated"));
    loadAllUsers();
  }
  async function confirmPayment(paymentId) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/confirm-payment", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ paymentId }),
    });
    const body = await res.json();
    if (!res.ok) { notify(body.error || t("admin.err.confirmPaymentFailed"), false); return; }
    notify(t("admin.paymentConfirmed"));
    loadAdmin();
  }
  async function verifyStaff(staffId, status) {
    const patch = { staff_verification_status: status };
    if (status === "verified") { patch.verified_by = user.id; patch.verified_at = new Date().toISOString(); }
    const { error } = await supabase.from("profiles").update(patch).eq("id", staffId);
    if (error) { notify(t("common.couldNotUpdate", { error: error.message }), false); return; }
    notify(status === "verified" ? t("admin.staffVerified") : t("admin.staffRejected"));
    loadAdmin();
  }
  const [deletingUserId, setDeletingUserId] = useState(null);
  async function deleteAccount(u) {
    if (!confirm(t("admin.confirmDeleteAccount", { name: u.name, role: t("status." + u.role) }))) return;
    setDeletingUserId(u.id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin-delete-account", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ userId: u.id }),
    });
    const body = await res.json();
    setDeletingUserId(null);
    if (!res.ok) { notify(body.error || t("admin.err.deleteAccountFailed"), false); return; }
    notify(t("admin.accountDeleted"));
    loadAllUsers();
  }

  // -- ADMIN: READ-ONLY VIEW OF A SPECIFIC HOSPITAL'S DASHBOARD -- lets
  // admin see a facility's own roster/tickets for support and onboarding
  // (e.g. "why isn't this hospital seeing tickets") without needing that
  // hospital's own login. Same queries as the hospital's own dashboard,
  // just parameterized by hospitalId instead of created_by=own id - RLS
  // already grants admin full read access via ti_is_admin(), same as
  // every other admin query in this file. No write actions here on
  // purpose - roster/doctor changes stay the hospital's own responsibility.
  const [viewingHospital, setViewingHospital] = useState(null);
  const [viewingHospitalDoctors, setViewingHospitalDoctors] = useState([]);
  const [viewingHospitalTickets, setViewingHospitalTickets] = useState([]);
  const [viewingHospitalBusy, setViewingHospitalBusy] = useState(false);
  async function openHospitalView(hospital) {
    if (!hospital) return;
    setViewingHospital(hospital);
    setViewingHospitalBusy(true);
    const [docs, tix] = await Promise.all([
      supabase.from("profiles").select("*, staff_credentials(*)").eq("hospital_id", hospital.id).eq("role", "staff"),
      supabase.from("tickets").select("*").eq("hospital_id", hospital.id).order("created_at", { ascending: false }),
    ]);
    setViewingHospitalDoctors(docs.data || []);
    setViewingHospitalTickets(tix.data || []);
    setViewingHospitalBusy(false);
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
    if (!doctorEmailInput.trim()) { notify(t("hospital.err.enterDoctorEmail"), false); return; }
    setDoctorAddBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/manage-hospital-doctor", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ action: "link", doctorEmail: doctorEmailInput.trim() }),
    });
    const body = await res.json();
    setDoctorAddBusy(false);
    if (!res.ok) { notify(body.error || t("hospital.err.addDoctorFailed"), false); return; }
    notify(body.alreadyLinked ? t("hospital.alreadyOnRoster") : t("hospital.doctorAddedToRoster", { name: body.name }));
    setDoctorEmailInput("");
    loadHospitalBoard();
  }

  async function removeDoctor(doctorId) {
    if (!confirm(t("hospital.confirmRemoveDoctor"))) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/manage-hospital-doctor", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ action: "unlink", doctorId }),
    });
    const body = await res.json();
    if (!res.ok) { notify(body.error || t("hospital.err.removeDoctorFailed"), false); return; }
    notify(t("hospital.doctorRemoved"));
    loadHospitalBoard();
  }

  useEffect(() => {
    if (!user) return;
    if (page === "staffboard" && isStaff) { loadStaffBoard(); loadMyPayouts(); }
    if (page === "forum" && (isStaff || isAdmin)) loadForum();
    if (page === "resources" && (isStaff || isAdmin)) loadResources();
    if (page === "admin" && isAdmin) { loadAdmin(); loadTicketStats(); loadUrgentTickets(); loadHospitalTicketIndex(); loadPendingPayouts(); }
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
      <div style={{ background: C.navy, padding: "80px 24px", textAlign: "center", color: "#fff", position: "relative" }}>
        <LangToggle lang={lang} setLang={setLang} style={{ position: "absolute", top: 16, right: 16 }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>Ticket-In</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 14, fontFamily: "Georgia,serif" }}>{t("landing.headline")}</h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.75)", maxWidth: 460, margin: "0 auto 30px" }}>{t("landing.subtext")}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn label={t("landing.checkInNow")} primary onClick={() => setScreen("checkin")} />
          <Btn label={t("landing.checkTicketStatus")} onClick={() => setScreen("lookup")} />
          <Btn label={t("landing.imHealthcareProfessional")} onClick={() => { setScreen("auth"); setIsReg(true); setAuthRole("staff"); }} />
          <Btn label={t("landing.registerMyHospital")} onClick={() => { setScreen("auth"); setIsReg(true); setAuthRole("hospital"); }} />
        </div>
      </div>
      <div style={{ padding: "18px 24px", textAlign: "center" }}>
        <span onClick={() => setScreen("privacy")} style={{ color: C.muted, fontSize: 12, cursor: "pointer", marginRight: 18 }}>{t("common.privacyPolicy")}</span>
        <span onClick={() => setScreen("terms")} style={{ color: C.muted, fontSize: 12, cursor: "pointer" }}>{t("common.termsOfService")}</span>
      </div>
    </div>
  );

  if (screen === "privacy" || screen === "terms") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, padding: "24px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", background: C.white, borderRadius: 16, padding: 28, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <button onClick={() => setScreen(user ? "app" : "landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>&larr; {t("common.back")}</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        {screen === "privacy" ? <PrivacyPolicyContent lang={lang} /> : <TermsOfServiceContent lang={lang} />}
      </div>
    </div>
  );

  if (screen === "lookup") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>&larr; {t("common.back")}</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{t("lookup.title")}</div>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>{t("lookup.subtext")}</p>
        <Field label={t("lookup.phoneNumber")} value={lookupPhone} onChange={e => setLookupPhone(e.target.value)} required />
        <Field label={t("lookup.yourCode")} value={lookupCode} onChange={e => setLookupCode(e.target.value.toUpperCase())} placeholder={t("lookup.codePlaceholder")} required />
        {lookupError && <div style={{ background: C.redL, border: "1px solid " + C.redB, borderRadius: 10, padding: 12, marginBottom: 14, color: C.red, fontSize: 13 }}>{lookupError}</div>}
        <Btn label={lookupBusy ? t("lookup.checking") : t("lookup.checkStatus")} primary full loading={lookupBusy} onClick={doLookup} />

        {lookupResult && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid " + C.surf }}>
            <Tag kind={lookupResult.status}>{t("status." + lookupResult.status)}</Tag>
            <div style={{ fontSize: 13, color: C.ink, marginTop: 8 }}>{lookupResult.onset}</div>
            {lookupResult.status === "resolved" && lookupResult.resolution_summary && (
              <div style={{ marginTop: 12, fontSize: 13, color: C.body, lineHeight: 1.6 }}>
                <strong>{t("lookup.summaryFromProfessional")}</strong><br />{lookupResult.resolution_summary}
              </div>
            )}
            {lookupResult.status === "resolved" && !lookupResult.already_rated && !ratingDone && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid " + C.surf }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>{t("lookup.rateTitle")}</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatingValue(n)}
                      aria-label={t("lookup.starLabel", { n })}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: 2,
                        fontSize: 28, lineHeight: 1, color: n <= ratingValue ? C.gold : C.border,
                      }}>&#9733;</button>
                  ))}
                </div>
                <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
                  placeholder={t("lookup.commentPlaceholder")} rows={3}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid " + C.border, fontSize: 13, fontFamily: "system-ui", outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 10 }} />
                <Btn label={ratingBusy ? t("lookup.submittingRating") : t("lookup.submitRating")} primary full
                  loading={ratingBusy} disabled={ratingValue < 1} onClick={submitRating} />
              </div>
            )}
            {lookupResult.status === "resolved" && (lookupResult.already_rated || ratingDone) && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid " + C.surf, fontSize: 13, color: C.muted }}>
                {t("lookup.ratingThanks")}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>&larr; {t("common.back")}</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t("checkin.title")}</h1>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>{t("checkin.subtext")}</p>

        <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.red, marginBottom: 6 }}>{t("checkin.notEmergencyTitle")}</div>
          <div style={{ fontSize: 12, color: C.body, lineHeight: 1.6 }}>
            {t("checkin.notEmergencyBody")}
          </div>
        </div>

        <div ref={phoneRef}>
          <Field label={t("checkin.phoneNumber")} value={checkinPhone} onChange={e => setCheckinPhone(e.target.value)} placeholder={t("checkin.phonePlaceholder")} required />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>{t("checkin.howSeen")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setConsultType("remote"); setSelectedHospitalId(""); }} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: consultType === "remote" ? C.tealL : C.white, border: "1.5px solid " + (consultType === "remote" ? C.tealB : C.border), color: consultType === "remote" ? C.teal : C.body,
            }}>{t("checkin.remoteConsultation")}</button>
            <button onClick={() => setConsultType("in_person")} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: consultType === "in_person" ? C.tealL : C.white, border: "1.5px solid " + (consultType === "in_person" ? C.tealB : C.border), color: consultType === "in_person" ? C.teal : C.body,
            }}>{t("checkin.inPersonAtHospital")}</button>
          </div>
        </div>

        {consultType === "in_person" && (
          <div ref={hospitalRef} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>
              {t("checkin.chooseHospital")} <span style={{ color: C.red }}>*</span>
            </label>
            <select value={selectedHospitalId} onChange={e => setSelectedHospitalId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 9, border: "1.5px solid " + C.border, fontFamily: "system-ui", outline: "none", boxSizing: "border-box", background: C.white }}>
              <option value="">{t("checkin.selectHospitalPlaceholder")}</option>
              {hospitalsList.map(h => <option key={h.id} value={h.id}>{h.name} - {h.town}</option>)}
            </select>
            {hospitalsList.length === 0 && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{t("checkin.noHospitalsRegistered")}</div>
            )}
          </div>
        )}

        <div ref={ageRef} style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>
            {t("checkin.areYou18")} <span style={{ color: C.red }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setIsAdult(true)} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: isAdult === true ? C.tealL : C.white, border: "1.5px solid " + (isAdult === true ? C.tealB : C.border), color: isAdult === true ? C.teal : C.body,
            }}>{t("checkin.yes18OrOlder")}</button>
            <button onClick={() => setIsAdult(false)} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: isAdult === false ? C.tealL : C.white, border: "1.5px solid " + (isAdult === false ? C.tealB : C.border), color: isAdult === false ? C.teal : C.body,
            }}>{t("checkin.noUnder18")}</button>
          </div>
        </div>

        {isAdult === false && (
          <div ref={guardianRef} style={{ background: C.tealL, border: "1.5px solid " + C.tealB, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.body, lineHeight: 1.6, marginBottom: 12 }}>
              {t("checkin.guardianRequiredNotice")}
            </div>
            <Field label={t("checkin.guardianName")} value={guardianName} onChange={e => setGuardianName(e.target.value)} required />
            <Field label={t("checkin.guardianPhone")} value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} required />
          </div>
        )}

        <div ref={onsetSeverityRef}>
          {OLDCART_FIELD_KEYS.map(key => (
            <Field key={key} label={t("checkin.field." + key + ".label")} value={ticketForm[key]} onChange={e => setTicketForm(f => ({ ...f, [key]: e.target.value }))} placeholder={t("checkin.field." + key + ".placeholder")} required={key === "onset"} />
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.body, marginBottom: 6 }}>
            {t("checkin.severity")} <span style={{ color: C.red }}>*</span>
            <span style={{ fontWeight: 400, color: C.muted }}> {t("checkin.severityScale")}</span>
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
              {t("checkin.severityUrgentWarning")}
            </div>
          )}
        </div>
        <Field label={t("checkin.describeSeverity")} value={ticketForm.severity_description} onChange={e => setTicketForm(f => ({ ...f, severity_description: e.target.value }))} placeholder={t("checkin.describeSeverityPlaceholder")} />

        <Field label={t("checkin.anythingElse")} value={ticketForm.additional_notes} onChange={e => setTicketForm(f => ({ ...f, additional_notes: e.target.value }))} rows={3} />

        <label ref={emergencyAckRef} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, fontSize: 12, color: C.body, cursor: "pointer" }}>
          <input type="checkbox" checked={emergencyAck} onChange={e => setEmergencyAck(e.target.checked)} style={{ marginTop: 2 }} />
          {t("checkin.emergencyAckLabel")}
        </label>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
          {t("common.agreeBefore")}<span onClick={() => setScreen("terms")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>{t("common.termsOfService")}</span>{t("common.agreeMiddle")}<span onClick={() => setScreen("privacy")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>{t("common.privacyPolicy")}</span>{t("common.agreeAfter")}
        </div>

        <Btn label={ticketBusy ? t("checkin.submitting") : t("checkin.submitAndContinue")} primary full loading={ticketBusy} disabled={!emergencyAck} onClick={submitCheckIn} />
      </div>
      <Toast {...toast} />

      <Modal open={showEmergencyWarning} onClose={() => {}} title={t("checkin.pleaseReadFirst")}>
        <div style={{ background: C.redL, border: "1.5px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.7 }}>
            {t("checkin.severityWarningModalBody", { level: severityLevel })}
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          {t("checkin.urgentTicketNotice")}
        </p>
        <Btn label={t("checkin.iUnderstandContinue")} primary full onClick={() => { setShowEmergencyWarning(false); setScreen("checkin-code"); }} />
      </Modal>
    </div>
  );

  if (screen === "checkin-code") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 420, width: "100%", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 14, right: 14 }}><LangToggle lang={lang} setLang={setLang} /></div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>{t("checkincode.submitted")}</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{t("checkincode.saveCodeNotice")}</div>
        <button onClick={copyClientCode} style={{
          fontSize: 32, fontWeight: 900, color: C.navy, letterSpacing: ".08em", background: C.tealL,
          border: "1.5px dashed " + C.tealB, borderRadius: 12, padding: "16px 20px", marginBottom: 6, cursor: "pointer", fontFamily: "system-ui", width: "100%",
        }}>{clientCode}</button>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 22 }}>{t("checkincode.tapToCopyNotice")}</div>
        <Btn label={t("checkincode.continueToPayment")} primary full onClick={() => setShowPay(true)} />
      </div>
      <Toast {...toast} />

      <Modal open={showPay} onClose={() => setShowPay(false)} title={t("checkincode.completePayment")}>
        <div style={{ background: "#FBF0D6", borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.muted }}>{t("checkincode.sendExactly")}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.gold }}>{PLAN_AMOUNT.toLocaleString()} XAF</div>
        </div>
        {momoDetailsError ? (
          <div style={{ background: C.redL, border: "1px solid " + C.redB, borderRadius: 10, padding: 14, marginBottom: 16, color: C.red, fontSize: 13 }}>{momoDetailsError}</div>
        ) : !momoDetails ? (
          <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 13 }}>{t("checkincode.loadingPaymentDetails")}</div>
        ) : (
          <button onClick={copyMomoNumber} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: C.surf, border: "1.5px dashed " + C.border, borderRadius: 10, padding: 12, marginBottom: 12, cursor: "pointer", fontFamily: "system-ui" }}>
            <span style={{ fontSize: 11, color: C.muted }}>{momoCopied ? t("checkincode.copiedSendViaMomo") : t("checkincode.tapToCopyMomo")}</span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{momoDetails.momoNumber}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{momoDetails.momoAccountName}</span>
          </button>
        )}
        <Field label={t("checkincode.referenceLabel")} value={momoRef} onChange={e => setMomoRef(e.target.value)} placeholder={t("checkincode.referencePlaceholder")} required />
        <Btn label={momoBusy ? t("checkin.submitting") : t("checkincode.ivesSentPayment")} primary full loading={momoBusy} disabled={!momoDetails || !momoRef.trim()} onClick={submitPayment} />
      </Modal>
    </div>
  );

  if (screen === "auth") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>&larr; {t("common.back")}</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          {isReg ? (authRole === "hospital" ? t("auth.hospitalSignUp") : t("auth.professionalSignUp")) : t("auth.signIn")}
        </div>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>
          {isReg ? (authRole === "hospital" ? t("auth.registerHospitalSubtext") : t("auth.forVerifiedStaffSubtext")) : t("auth.signInSubtext")}
        </p>
        {isReg && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => setAuthRole("staff")} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: authRole === "staff" ? C.tealL : C.white, border: "1.5px solid " + (authRole === "staff" ? C.tealB : C.border), color: authRole === "staff" ? C.teal : C.body,
            }}>{t("auth.healthcareProfessional")}</button>
            <button onClick={() => setAuthRole("hospital")} style={{
              flex: 1, padding: "9px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
              background: authRole === "hospital" ? C.tealL : C.white, border: "1.5px solid " + (authRole === "hospital" ? C.tealB : C.border), color: authRole === "hospital" ? C.teal : C.body,
            }}>{t("auth.hospital")}</button>
          </div>
        )}
        {isReg && <Field label={authRole === "hospital" ? t("auth.yourNameHospitalContact") : t("auth.fullName")} value={authName} onChange={e => setAuthName(e.target.value)} required />}
        {isReg && authRole === "staff" && (
          <>
            <Field label={t("auth.licenseNumber")} value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} required />
            <Field label={t("auth.issuingInstitution")} value={issuingInstitution} onChange={e => setIssuingInstitution(e.target.value)} required />
            <Field label={t("auth.specialtyOptional")} value={specialty} onChange={e => setSpecialty(e.target.value)} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
              {t("auth.staffReviewNotice")}
            </p>
          </>
        )}
        {isReg && authRole === "hospital" && (
          <>
            <Field label={t("auth.hospitalClinicName")} value={hospitalName} onChange={e => setHospitalName(e.target.value)} required />
            <Field label={t("auth.town")} value={hospitalTown} onChange={e => setHospitalTown(e.target.value)} required />
            <Field label={t("auth.addressOptional")} value={hospitalAddress} onChange={e => setHospitalAddress(e.target.value)} />
            <Field label={t("auth.phoneOptional")} value={hospitalPhone} onChange={e => setHospitalPhone(e.target.value)} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
              {t("auth.hospitalReviewNotice")}
            </p>
          </>
        )}
        <Field label={t("auth.email")} value={authEmail} onChange={e => setAuthEmail(e.target.value)} type="email" required />
        <Field label={isReg ? t("auth.passwordMinChars") : t("auth.password")} value={authPass} onChange={e => setAuthPass(e.target.value)} type="password" required />
        {isReg && (
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
            {t("auth.agreeBefore")}<span onClick={() => setScreen("terms")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>{t("common.termsOfService")}</span>{t("common.agreeMiddle")}<span onClick={() => setScreen("privacy")} style={{ color: C.teal, cursor: "pointer", fontWeight: 700 }}>{t("common.privacyPolicy")}</span>{t("common.agreeAfter")}
          </div>
        )}
        <Btn label={authBusy ? t("auth.pleaseWait") : isReg ? t("auth.createAccount") : t("auth.signIn")} primary full loading={authBusy} onClick={handleAuth} />
        {!isReg && (
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12 }}>
            <span onClick={() => { setResetEmail(authEmail); setResetSent(false); setScreen("reset-request"); }} style={{ color: C.muted, cursor: "pointer" }}>{t("auth.forgotPassword")}</span>
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>
          {isReg ? t("auth.alreadyHaveAccount") : t("auth.newHere")}
          <span onClick={() => setIsReg(!isReg)} style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}>{isReg ? t("auth.signInLink") : t("auth.createOneLink")}</span>
        </div>
      </div>
      <Toast {...toast} />
    </div>
  );

  if (screen === "reset-request") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setScreen("auth")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>&larr; {t("reset.backToSignIn")}</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{t("reset.resetPassword")}</div>
        {resetSent ? (
          <p style={{ color: C.body, fontSize: 13, lineHeight: 1.6 }}>
            {t("reset.linkSentNotice")}
          </p>
        ) : (
          <>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>{t("reset.enterEmailNotice")}</p>
            <Field label={t("auth.email")} value={resetEmail} onChange={e => setResetEmail(e.target.value)} type="email" required />
            <Btn label={resetBusy ? t("reset.sending") : t("reset.sendResetLink")} primary full loading={resetBusy} onClick={requestPasswordReset} />
          </>
        )}
      </div>
      <Toast {...toast} />
    </div>
  );

  if (screen === "reset-password") return (
    <div style={{ fontFamily: "system-ui,sans-serif", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 380, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}><LangToggle lang={lang} setLang={setLang} /></div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{t("reset.setNewPassword")}</div>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>{t("reset.chooseNewPasswordNotice")}</p>
        <Field label={t("reset.newPasswordMinChars")} value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" required />
        <Btn label={newPasswordBusy ? t("reset.saving") : t("reset.savePassword")} primary full loading={newPasswordBusy} onClick={submitNewPassword} />
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
            ...(isStaff ? [{ id: "staffboard", label: t("shell.ticketBoard") }] : []),
            ...(isHospital ? [{ id: "hospital", label: t("shell.hospitalDashboard") }] : []),
            ...(isStaff || isAdmin ? [{ id: "forum", label: t("shell.forum") }] : []),
            ...(isStaff || isAdmin ? [{ id: "resources", label: t("shell.resources") }] : []),
            ...(isAdmin ? [{ id: "admin", label: t("shell.admin") }] : []),
            ...(isAdmin ? [{ id: "users", label: t("shell.manageUsers") }] : []),
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
            <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>{t("status." + user.role)}</div>
          </div>
          <LangToggle lang={lang} setLang={setLang} style={{ marginTop: 8 }} />
          <button onClick={logout} style={{ background: "none", border: "none", color: C.red, fontSize: 10, cursor: "pointer", padding: 0, marginTop: 8, fontFamily: "system-ui" }}>{t("shell.signOut")}</button>
          <div style={{ marginTop: 8, fontSize: 9, color: C.muted }}>
            <span onClick={() => setScreen("privacy")} style={{ cursor: "pointer" }}>{t("shell.privacy")}</span>
            {" \u00b7 "}
            <span onClick={() => setScreen("terms")} style={{ cursor: "pointer" }}>{t("shell.terms")}</span>
          </div>
        </div>
      </div>

      <div className="ti-content" style={{ flex: 1, padding: 32, maxWidth: 720 }}>

        {page === "staffboard" && isStaff && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t("staff.ticketBoard")}</h1>
            {user.staff_verification_status !== "verified" && (
              <div style={{ background: "#FBF0D6", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: C.body }}>
                {t("staff.pendingVerificationNotice")}
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 800, margin: "20px 0 10px" }}>{t("staff.openTickets", { count: openTickets.length })}</div>
            {openTickets.slice().sort((a, b) => (b.severity_level || 0) - (a.severity_level || 0)).map(tk => {
              const waitMins = (Date.now() - new Date(tk.created_at).getTime()) / 60000;
              const waitColor = waitMins >= 240 ? C.red : waitMins >= 60 ? C.gold : C.muted;
              return (
              <div key={tk.id} style={{
                background: C.white, borderRadius: 12, padding: 16, marginBottom: 10,
                border: tk.severity_level >= EMERGENCY_THRESHOLD ? "2px solid " + C.redB : "1px solid " + C.border,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    {tk.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">{t("status.urgent")}</Tag>}
                    {tk.is_minor && <Tag kind="pending">{t("status.minorGuardianOnFile")}</Tag>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: waitColor }}>{t("staff.waitingSince", { time: timeAgo(tk.created_at, lang) })}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginTop: 6, marginBottom: 4 }}><strong>{t("staff.onsetLabel")}</strong> {tk.onset}</div>
                <div style={{ fontSize: 13, color: C.body, marginBottom: 4 }}>
                  <strong>{t("staff.severityLabel")}</strong> {tk.severity_level}/10{tk.severity_description ? " - " + tk.severity_description : ""}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: tk.is_minor ? 2 : 10 }}>{t("common.contact")} {tk.client_phone}</div>
                {tk.is_minor && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{t("common.guardian")} {tk.guardian_name} - {tk.guardian_phone}</div>}
                <Btn label={t("staff.claimTicket")} primary small onClick={() => claimTicket(tk.id)} disabled={user.staff_verification_status !== "verified"} />
              </div>
              );
            })}
            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>{t("staff.myClaimedTickets", { count: myClaimed.length })}</div>
            {myClaimed.map(tk => (
              <div key={tk.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <Tag kind={tk.status}>{t("status." + tk.status)}</Tag>
                    {tk.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">{t("status.urgent")}</Tag>}
                    {tk.is_minor && <Tag kind="pending">{t("status.minor")}</Tag>}
                  </div>
                  <span style={{ fontSize: 11, color: C.muted }}>{t("staff.submittedTime", { time: timeAgo(tk.created_at, lang) })}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginBottom: 4 }}>{tk.onset}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: tk.is_minor ? 2 : 10 }}>{t("common.contact")} {tk.client_phone}</div>
                {tk.is_minor && <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{t("common.guardian")} {tk.guardian_name} - {tk.guardian_phone}</div>}
                {tk.status === "claimed" && <Btn label={t("staff.startConsultation")} primary small onClick={() => startConsultation(tk.id)} />}
                {tk.status === "in_progress" && <Btn label={t("staff.resolveAddNotes")} primary small onClick={() => setResolvingTicket(tk.id)} />}
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>
              {t("staff.myEarningsPending", { amount: myPayouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0) })}
            </div>
            {myPayouts.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>{t("staff.resolveToEarnNotice")}</div>}
            {myPayouts.map(p => (
              <div key={p.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{p.amount} XAF</span>
                <Tag kind={p.status === "paid" ? "verified" : "pending"}>{t("status." + p.status)}</Tag>
              </div>
            ))}
          </div>
        )}

        {page === "hospital" && isHospital && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{myHospital?.name || t("hospital.dashboardFallbackTitle")}</h1>
            {user.staff_verification_status !== "verified" && (
              <div style={{ background: "#FBF0D6", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: C.body }}>
                {t("hospital.pendingVerificationNotice")}
              </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "20px 0 10px" }}>{t("hospital.doctorRoster", { count: hospitalDoctors.length })}</div>
            <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Field label={t("hospital.addDoctorByEmail")} value={doctorEmailInput} onChange={e => setDoctorEmailInput(e.target.value)} placeholder={t("hospital.doctorEmailPlaceholder")} />
                </div>
                <div style={{ paddingTop: 22 }}>
                  <Btn label={doctorAddBusy ? t("hospital.adding") : t("hospital.add")} primary loading={doctorAddBusy} onClick={addDoctorByEmail} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: -8 }}>{t("hospital.mustHaveAccountNotice")}</div>
            </div>
            {hospitalDoctors.map(d => (
              <div key={d.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{d.staff_credentials?.specialty || d.staff_credentials?.issuing_institution || ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Tag kind={d.staff_verification_status === "verified" ? "verified" : "pending"}>{t("status." + d.staff_verification_status)}</Tag>
                  <button onClick={() => removeDoctor(d.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "system-ui" }}>{t("common.remove")}</button>
                </div>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>{t("hospital.ticketsSentToYourHospital", { count: hospitalTickets.length })}</div>
            {hospitalTickets.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>{t("hospital.noInPersonTicketsYet")}</div>}
            {hospitalTickets.map(tk => (
              <div key={tk.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <Tag kind={tk.status}>{t("status." + tk.status)}</Tag>
                    {tk.severity_level >= EMERGENCY_THRESHOLD && <Tag kind="expired">{t("status.urgent")}</Tag>}
                  </div>
                  <span style={{ fontSize: 11, color: C.muted }}>{t("staff.submittedTime", { time: timeAgo(tk.created_at, lang) })}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, marginBottom: 4 }}>{tk.onset}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{t("common.contact")} {tk.client_phone}</div>
              </div>
            ))}
          </div>
        )}

        {page === "forum" && (isStaff || isAdmin) && (
          <div style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t("forum.title")}</h1>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>
              {t("forum.subtext")}
            </p>

            {(isAdmin || user.staff_verification_status === "verified") ? (
              <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 13, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{t("forum.startDiscussion")}</div>
                <Field label={t("forum.subjectOptional")} value={newThreadSubject} onChange={e => setNewThreadSubject(e.target.value)} placeholder={t("forum.subjectPlaceholder")} />
                <Field label={t("forum.whatsOnYourMind")} value={newThreadBody} onChange={e => setNewThreadBody(e.target.value)} rows={3} placeholder={t("forum.bodyPlaceholder")} />
                <Btn label={t("forum.post")} primary full onClick={submitThread} />
              </div>
            ) : (
              <div style={{ background: C.surf, borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 12, color: C.muted, textAlign: "center" }}>
                {t("forum.notVerifiedNotice")}
              </div>
            )}

            {forumLoading ? (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>{t("common.loading")}</div>
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
                      {canModerate && <button onClick={() => deleteForumPost(thread.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>{t("common.remove")}</button>}
                    </div>
                    <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, marginBottom: 10 }}>{thread.body}</div>

                    {replies.length > 0 && (
                      <div style={{ borderLeft: "2px solid " + C.surf, paddingLeft: 12, marginBottom: 10 }}>
                        {replies.map(r => (
                          <div key={r.id} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{r.staff_name}
                              {(isAdmin || user.id === r.staff_id) && <button onClick={() => deleteForumPost(r.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 10, cursor: "pointer", marginLeft: 8, fontFamily: "system-ui" }}>{t("common.remove")}</button>}
                            </div>
                            <div style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>{r.body}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(isAdmin || user.staff_verification_status === "verified") && (
                      expandedThread === thread.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder={t("forum.writeReplyPlaceholder")}
                            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 13, fontFamily: "system-ui", outline: "none" }} />
                          <Btn label={t("common.reply")} small onClick={() => submitReply(thread.id)} />
                        </div>
                      ) : (
                        <button onClick={() => setExpandedThread(thread.id)} style={{ background: "none", border: "none", color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "system-ui" }}>{t("common.reply")}</button>
                      )
                    )}
                  </div>
                );
              })
            )}
            {!forumLoading && forumPosts.filter(p => !p.parent_post_id && !p.is_deleted).length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>{t("forum.noDiscussionsYet")}</div>
            )}
          </div>
        )}

        {page === "resources" && (isStaff || isAdmin) && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>{t("resources.title")}</h1>
              {isAdmin && <Btn label={showAddResource ? t("common.cancel") : t("resources.addResource")} small onClick={() => setShowAddResource(s => !s)} />}
            </div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>{t("resources.subtext")}</p>

            {showAddResource && isAdmin && (
              <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 13, padding: 16, marginBottom: 20 }}>
                <Field label={t("resources.titleLabel")} value={newResTitle} onChange={e => setNewResTitle(e.target.value)} placeholder={t("resources.titlePlaceholder")} />
                <Field label={t("resources.categoryOptional")} value={newResCategory} onChange={e => setNewResCategory(e.target.value)} placeholder={t("resources.categoryPlaceholder")} />
                <Field label={t("resources.descriptionOptional")} value={newResDesc} onChange={e => setNewResDesc(e.target.value)} rows={2} />
                <Field label={t("resources.linkOptional")} value={newResLink} onChange={e => setNewResLink(e.target.value)} placeholder={t("resources.linkPlaceholder")} />
                <Field label={t("resources.writtenContentOptional")} value={newResText} onChange={e => setNewResText(e.target.value)} rows={4} placeholder={t("resources.writtenContentPlaceholder")} />
                <Btn label={t("resources.saveResource")} primary full onClick={submitResource} />
              </div>
            )}

            {resourcesLoading ? (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>{t("common.loading")}</div>
            ) : (
              resources.map(r => (
                <div key={r.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 13, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      {r.category && <Tag kind="pending">{r.category}</Tag>}
                      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>{r.title}</div>
                    </div>
                    {isAdmin && <button onClick={() => deleteResource(r.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 11, cursor: "pointer", fontFamily: "system-ui" }}>{t("common.remove")}</button>}
                  </div>
                  {r.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{r.description}</div>}
                  {r.text_content && <div style={{ fontSize: 13, color: C.body, lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-wrap" }}>{r.text_content}</div>}
                  {r.link_url && <a href={r.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: C.teal, fontWeight: 700 }}>{t("resources.openLink")}</a>}
                </div>
              ))
            )}
            {!resourcesLoading && resources.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 13 }}>{t("resources.noResourcesYet")}</div>
            )}
          </div>
        )}

        {page === "admin" && isAdmin && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{t("admin.title")}</h1>

            {urgentTickets.length > 0 && (
              <div style={{ background: C.redL, border: "2px solid " + C.redB, borderRadius: 12, padding: 16, marginBottom: 26 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.red, marginBottom: 4 }}>
                  {t("admin.needsAttentionUrgent", { count: urgentTickets.length })}
                </div>
                <div style={{ fontSize: 11, color: C.body, marginBottom: 12 }}>
                  {t("admin.urgentNotice")}
                </div>
                {urgentTickets.map(tk => (
                  <div key={tk.id} style={{ background: C.white, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Tag kind={tk.status}>{t("status." + tk.status)}</Tag>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.red }}>{timeAgo(tk.created_at, lang)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.ink }}>{tk.onset}{tk.severity_description ? " - " + tk.severity_description : ""}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginTop: 2 }}>{t("admin.severityContact", { level: tk.severity_level, phone: tk.client_phone })}</div>
                  </div>
                ))}
              </div>
            )}

            {ticketStats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 26 }}>
                {[
                  [t("admin.statTotal"), ticketStats.total, C.navy],
                  [t("admin.statUrgentActive"), ticketStats.urgent_active, C.red],
                  [t("admin.statOpen"), ticketStats.open, C.teal],
                  [t("admin.statClaimed"), ticketStats.claimed, C.gold],
                  [t("admin.statInProgress"), ticketStats.in_progress, C.gold],
                  [t("admin.statResolved"), ticketStats.resolved, C.green],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 16, marginBottom: 26 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{t("admin.findTicketByPhone")}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: phoneSearchResults ? 14 : 0 }}>
                <input value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} placeholder={t("admin.searchPhonePlaceholder")}
                  onKeyDown={e => e.key === "Enter" && searchByPhone()}
                  style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1.5px solid " + C.border, fontSize: 13, fontFamily: "system-ui", outline: "none" }} />
                <Btn label={phoneSearchBusy ? "..." : t("admin.search")} primary small onClick={searchByPhone} />
              </div>
              {phoneSearchResults && (
                phoneSearchResults.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted }}>{t("admin.noTicketsFoundForNumber")}</div>
                ) : (
                  phoneSearchResults.map(tk => {
                    const notes = phoneSearchNotes[tk.id];
                    const rating = phoneSearchRatings[tk.id];
                    return (
                    <div key={tk.id} style={{ borderTop: "1px solid " + C.surf, paddingTop: 10, marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <Tag kind={tk.status}>{t("status." + tk.status)}</Tag>
                        <span style={{ fontSize: 11, color: C.muted }}>{new Date(tk.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink }}>{tk.onset}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{t("admin.severityCodePhone", { level: tk.severity_level, code: tk.client_code, phone: tk.client_phone })}</div>
                      {tk.status === "resolved" && tk.resolution_summary && (
                        <div style={{ fontSize: 12, color: C.ink, background: C.surf, borderRadius: 8, padding: 10, marginTop: 8 }}>
                          <strong>{t("admin.summaryFromProfessional")}</strong><br />{tk.resolution_summary}
                        </div>
                      )}
                      {notes && (
                        <div style={{ fontSize: 12, color: C.ink, background: C.surf, borderRadius: 8, padding: 10, marginTop: 8 }}>
                          <strong>{t("admin.clinicalNotes")}</strong>
                          {notes.objective_assessment && <div style={{ marginTop: 6 }}><em>{t("admin.notesObjective")}:</em> {notes.objective_assessment}</div>}
                          {notes.clinical_diagnosis && <div style={{ marginTop: 6 }}><em>{t("admin.notesDiagnosis")}:</em> {notes.clinical_diagnosis}</div>}
                          {notes.plan && <div style={{ marginTop: 6 }}><em>{t("admin.notesPlan")}:</em> {notes.plan}</div>}
                          {notes.implementation && <div style={{ marginTop: 6 }}><em>{t("admin.notesImplementation")}:</em> {notes.implementation}</div>}
                          {notes.evaluation && <div style={{ marginTop: 6 }}><em>{t("admin.notesEvaluation")}:</em> {notes.evaluation}</div>}
                        </div>
                      )}
                      {rating && (
                        <div style={{ fontSize: 12, color: C.ink, background: C.surf, borderRadius: 8, padding: 10, marginTop: 8 }}>
                          <strong>{t("admin.clientRating")}</strong><br />
                          <span style={{ color: C.gold, letterSpacing: 1 }}>{"★".repeat(rating.rating) + "☆".repeat(5 - rating.rating)}</span>
                          {rating.comment && <div style={{ marginTop: 4 }}>{rating.comment}</div>}
                        </div>
                      )}
                    </div>
                    );
                  })
                )
              )}
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{t("admin.pendingPayments", { count: pendingPayments.length })}</div>
            {pendingPayments.map(p => (
              <div key={p.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.amount} XAF</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{t("admin.refLabel", { ref: p.reference_note })}</div>
                </div>
                <Btn label={t("common.confirm")} primary small onClick={() => confirmPayment(p.id)} />
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>{t("admin.pendingStaffPayouts", { count: pendingPayouts.length })}</div>
            {pendingPayouts.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>{t("admin.nothingOwedRightNow")}</div>}
            {pendingPayouts.map(p => (
              <div key={p.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.staffName} - {p.amount} XAF</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{t("admin.earnedTime", { time: timeAgo(p.created_at, lang) })}</div>
                </div>
                <Btn label={t("admin.markPaid")} primary small onClick={() => markPayoutPaid(p.id)} />
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>{t("admin.pendingStaffVerification", { count: pendingStaff.length })}</div>
            {pendingStaff.map(s => (
              <div key={s.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{s.name}</div>
                {s.credentials ? (
                  <div style={{ fontSize: 12, color: C.body, marginBottom: 10, lineHeight: 1.7 }}>
                    <div><strong>{t("common.licenseNumberLabel")}</strong> {s.credentials.license_number || "-"}</div>
                    <div><strong>{t("common.institutionLabel")}</strong> {s.credentials.issuing_institution || "-"}</div>
                    {s.credentials.specialty && <div><strong>{t("common.specialtyLabel")}</strong> {s.credentials.specialty}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{t("common.noCredentialsWarning")}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn label={t("common.verify")} primary small onClick={() => verifyStaff(s.id, "verified")} />
                  <Btn label={t("common.reject")} small onClick={() => verifyStaff(s.id, "rejected")} />
                </div>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>{t("admin.pendingHospitalVerification", { count: pendingHospitals.length })}</div>
            {pendingHospitals.map(h => (
              <div key={h.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{h.hospital?.name || t("admin.hospitalNameMissing")}</div>
                {h.hospital ? (
                  <div style={{ fontSize: 12, color: C.body, marginBottom: 10, lineHeight: 1.7 }}>
                    <div style={{ color: C.muted, marginBottom: 4 }}>{t("common.registeredBy", { name: h.name })}</div>
                    <div><strong>{t("common.townLabel")}</strong> {h.hospital.town}</div>
                    {h.hospital.address && <div><strong>{t("common.addressLabel")}</strong> {h.hospital.address}</div>}
                    {h.hospital.phone && <div><strong>{t("common.phoneLabel")}</strong> {h.hospital.phone}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{t("common.noHospitalRecordWarning")}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn label={t("common.verify")} primary small onClick={() => verifyStaff(h.id, "verified")} />
                  <Btn label={t("common.reject")} small onClick={() => verifyStaff(h.id, "rejected")} />
                  {h.hospital && <Btn label={t("admin.viewHospitalDashboard")} small onClick={() => openHospitalView(h.hospital)} />}
                </div>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "24px 0 10px" }}>{t("admin.inPersonTicketsByHospital", { count: hospitalTicketIndex.length })}</div>
            {hospitalTicketIndex.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>{t("admin.noInPersonTicketsYet")}</div>}
            {hospitalTicketIndex.map(tk => (
              <div key={tk.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Tag kind={tk.status}>{t("status." + tk.status)}</Tag>
                  <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(tk.created_at, lang)}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{tk.hospitals?.name || t("common.unknownHospital")} - {tk.hospitals?.town}</div>
                <div style={{ fontSize: 12, color: C.ink }}>{tk.onset}</div>
              </div>
            ))}
          </div>
        )}

        {page === "users" && isAdmin && (
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{t("users.title")}</h1>
            {allUsers.map(u => (
              <div key={u.id} style={{ background: C.white, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{u.role === "hospital" ? (u.hospital?.name || t("admin.hospitalNameMissing")) : u.name}</div>
                    {u.role === "hospital" ? (
                      <div style={{ fontSize: 11, color: C.muted }}>{u.phone ? t("users.registeredByWithPhone", { name: u.name, phone: u.phone }) : t("common.registeredBy", { name: u.name })}</div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.muted }}>{u.phone || t("common.noPhone")}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Tag kind={u.role}>{t("status." + u.role)}</Tag>
                    {u.role === "staff" && <Tag kind={u.staff_verification_status}>{t("status." + u.staff_verification_status)}</Tag>}
                  </div>
                </div>
                {u.role === "staff" && (
                  u.credentials ? (
                    <div style={{ fontSize: 12, color: C.body, marginBottom: 10, lineHeight: 1.7 }}>
                      <div><strong>{t("common.licenseNumberLabel")}</strong> {u.credentials.license_number || "-"}</div>
                      <div><strong>{t("common.institutionLabel")}</strong> {u.credentials.issuing_institution || "-"}</div>
                      {u.credentials.specialty && <div><strong>{t("common.specialtyLabel")}</strong> {u.credentials.specialty}</div>}
                      {u.verified_at && <div style={{ color: C.muted, fontSize: 11 }}>{t("users.verifiedOn", { date: new Date(u.verified_at).toLocaleDateString() })}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{t("users.noCredentialsOnFile")}</div>
                  )
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {u.role === "hospital" && u.hospital && (
                    <Btn label={t("admin.viewHospitalDashboard")} small onClick={() => openHospitalView(u.hospital)} />
                  )}
                  {["staff", "admin"].map(r => r !== u.role && (
                    <Btn key={r} label={t("admin.setRolePrefix") + t("status." + r)} small onClick={() => changeUserRole(u.id, r)} />
                  ))}
                  {u.role === "staff" && u.staff_verification_status !== "verified" && (
                    <Btn label={t("common.verify")} small primary onClick={() => changeUserVerification(u.id, "verified")} />
                  )}
                  {u.role === "staff" && u.staff_verification_status === "verified" && (
                    <Btn label={t("users.suspend")} small onClick={() => changeUserVerification(u.id, "suspended")} />
                  )}
                  {(u.role === "staff" || u.role === "hospital") && (
                    <button onClick={() => deleteAccount(u)} disabled={deletingUserId === u.id} style={{
                      padding: "8px 14px", fontSize: 12, fontWeight: 700, borderRadius: 10,
                      cursor: deletingUserId === u.id ? "default" : "pointer",
                      border: "1.5px solid " + C.red, background: C.white, color: C.red,
                      fontFamily: "system-ui", opacity: deletingUserId === u.id ? 0.6 : 1,
                    }}>{deletingUserId === u.id ? "..." : t("users.delete")}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!resolvingTicket} onClose={() => setResolvingTicket(null)} title={t("resolve.title")}>
        <Field label={t("resolve.objectiveAssessment")} value={resolveNotes.objective_assessment} onChange={e => setResolveNotes(n => ({ ...n, objective_assessment: e.target.value }))} rows={2} />
        <Field label={t("resolve.clinicalDiagnosis")} value={resolveNotes.clinical_diagnosis} onChange={e => setResolveNotes(n => ({ ...n, clinical_diagnosis: e.target.value }))} rows={2} />
        <Field label={t("resolve.plan")} value={resolveNotes.plan} onChange={e => setResolveNotes(n => ({ ...n, plan: e.target.value }))} rows={2} />
        <Field label={t("resolve.implementation")} value={resolveNotes.implementation} onChange={e => setResolveNotes(n => ({ ...n, implementation: e.target.value }))} rows={2} />
        <Field label={t("resolve.evaluation")} value={resolveNotes.evaluation} onChange={e => setResolveNotes(n => ({ ...n, evaluation: e.target.value }))} rows={2} />
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, marginTop: 10 }}>{t("resolve.clientSummaryNotice")}</div>
        <Field label={t("resolve.clientSummary")} value={resolveSummary} onChange={e => setResolveSummary(e.target.value)} rows={3} required />
        <Btn label={resolveBusy ? t("resolve.resolving") : t("resolve.resolveTicket")} primary full loading={resolveBusy} onClick={submitResolution} />
      </Modal>

      <Modal open={!!viewingHospital} onClose={() => setViewingHospital(null)} title={viewingHospital?.name || t("hospital.dashboardFallbackTitle")}>
        {viewingHospitalBusy ? (
          <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 13 }}>{t("common.loading")}</div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
              <div>{viewingHospital?.town}</div>
              {viewingHospital?.address && <div>{viewingHospital.address}</div>}
              {viewingHospital?.phone && <div>{viewingHospital.phone}</div>}
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, margin: "10px 0" }}>{t("hospital.doctorRoster", { count: viewingHospitalDoctors.length })}</div>
            {viewingHospitalDoctors.length === 0 && <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{t("admin.noDoctorsOnRoster")}</div>}
            {viewingHospitalDoctors.map(d => (
              <div key={d.id} style={{ border: "1px solid " + C.border, borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{d.staff_credentials?.specialty || d.staff_credentials?.issuing_institution || ""}</div>
                </div>
                <Tag kind={d.staff_verification_status === "verified" ? "verified" : "pending"}>{t("status." + d.staff_verification_status)}</Tag>
              </div>
            ))}

            <div style={{ fontSize: 13, fontWeight: 800, margin: "20px 0 10px" }}>{t("hospital.ticketsSentToYourHospital", { count: viewingHospitalTickets.length })}</div>
            {viewingHospitalTickets.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>{t("hospital.noInPersonTicketsYet")}</div>}
            {viewingHospitalTickets.map(tk => (
              <div key={tk.id} style={{ border: "1px solid " + C.border, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Tag kind={tk.status}>{t("status." + tk.status)}</Tag>
                  <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(tk.created_at, lang)}</span>
                </div>
                <div style={{ fontSize: 12, color: C.ink }}>{tk.onset}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{t("common.contact")} {tk.client_phone}</div>
              </div>
            ))}
          </>
        )}
      </Modal>

      <Toast {...toast} />
    </div>
  );
}
