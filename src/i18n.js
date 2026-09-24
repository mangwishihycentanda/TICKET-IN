// ============================================================================
// i18n.js - all user-facing strings for Ticket-In, English + French.
// Organized to roughly mirror App.jsx's own section comments so it's easy
// to find the strings for a given screen. Keys are namespaced by screen/
// area (landing.*, checkin.*, auth.*, staff.*, admin.*, hospital.*, ...).
//
// Usage: const t = makeT(lang); t("landing.checkInNow")
// Templates: store "{placeholder}" tokens, pass vars: t("key", { level: 8 })
// ============================================================================

export const translations = {
  // --------------------------------------------------------------------
  // COMMON - shared across many screens (buttons, agree-to-terms, roles,
  // ticket/payment/verification status labels, generic error fallbacks)
  // --------------------------------------------------------------------
  "common.back": { en: "Back", fr: "Retour" },
  "common.privacyPolicy": { en: "Privacy Policy", fr: "Politique de confidentialité" },
  "common.termsOfService": { en: "Terms of Service", fr: "Conditions d'utilisation" },
  "common.agreeBefore": { en: "By continuing you agree to our ", fr: "En continuant, vous acceptez nos " },
  "common.agreeMiddle": { en: " and ", fr: " et notre " },
  "common.agreeAfter": { en: ".", fr: "." },
  "common.loading": { en: "Loading...", fr: "Chargement..." },
  "common.remove": { en: "Remove", fr: "Retirer" },
  "common.reply": { en: "Reply", fr: "Répondre" },
  "common.confirm": { en: "Confirm", fr: "Confirmer" },
  "common.verify": { en: "Verify", fr: "Vérifier" },
  "common.reject": { en: "Reject", fr: "Rejeter" },
  "common.save": { en: "Save", fr: "Enregistrer" },
  "common.cancel": { en: "Cancel", fr: "Annuler" },
  "common.contact": { en: "Contact:", fr: "Contact :" },
  "common.guardian": { en: "Guardian:", fr: "Tuteur :" },
  "common.couldNotUpdate": { en: "Could not update: {error}", fr: "Mise à jour impossible : {error}" },
  "common.couldNotRemove": { en: "Could not remove: {error}", fr: "Suppression impossible : {error}" },
  "common.updated": { en: "Updated.", fr: "Mis à jour." },
  "common.unknownHospital": { en: "Unknown hospital", fr: "Hôpital inconnu" },
  "common.noPhone": { en: "no phone", fr: "aucun téléphone" },
  "common.licenseNumberLabel": { en: "License #:", fr: "N° de licence :" },
  "common.institutionLabel": { en: "Institution:", fr: "Établissement :" },
  "common.specialtyLabel": { en: "Specialty:", fr: "Spécialité :" },
  "common.townLabel": { en: "Town:", fr: "Ville :" },
  "common.addressLabel": { en: "Address:", fr: "Adresse :" },
  "common.phoneLabel": { en: "Phone:", fr: "Téléphone :" },
  "common.noCredentialsWarning": { en: "No credentials submitted - do not verify without checking why.", fr: "Aucun justificatif soumis - ne pas vérifier sans en comprendre la raison." },
  "common.noHospitalRecordWarning": { en: "No hospital record found - do not verify without checking why.", fr: "Aucune fiche d'hôpital trouvée - ne pas vérifier sans en comprendre la raison." },
  "common.registeredBy": { en: "Registered by {name}", fr: "Enregistré par {name}" },

  // Ticket status / payment status / verification status / role display labels.
  // NOTE: these are DISPLAY-ONLY. The underlying DB values ("open",
  // "resolved", "staff", etc.) used in Supabase queries must never change.
  "status.open": { en: "Open", fr: "Ouvert" },
  "status.claimed": { en: "Claimed", fr: "Pris en charge" },
  "status.in_progress": { en: "In progress", fr: "En cours" },
  "status.resolved": { en: "Resolved", fr: "Résolu" },
  "status.form_submitted": { en: "Form submitted", fr: "Formulaire soumis" },
  "status.expired": { en: "Expired", fr: "Expiré" },
  "status.pending": { en: "Pending", fr: "En attente" },
  "status.paid": { en: "Paid", fr: "Payé" },
  "status.completed": { en: "Completed", fr: "Terminé" },
  "status.failed": { en: "Failed", fr: "Échoué" },
  "status.verified": { en: "Verified", fr: "Vérifié" },
  "status.rejected": { en: "Rejected", fr: "Rejeté" },
  "status.suspended": { en: "Suspended", fr: "Suspendu" },
  "status.staff": { en: "Staff", fr: "Personnel soignant" },
  "status.admin": { en: "Admin", fr: "Administrateur" },
  "status.hospital": { en: "Hospital", fr: "Hôpital" },
  "status.urgent": { en: "Urgent", fr: "Urgent" },
  "status.minor": { en: "Minor", fr: "Mineur" },
  "status.minorGuardianOnFile": { en: "Minor - Guardian on File", fr: "Mineur - Tuteur enregistré" },

  // --------------------------------------------------------------------
  // TIME - relative "time ago" phrasing (timeAgo helper)
  // --------------------------------------------------------------------
  "time.justNow": { en: "just now", fr: "à l'instant" },
  "time.minAgo": { en: "{m}m ago", fr: "il y a {m} min" },
  "time.hourMinAgo": { en: "{h}h {m}m ago", fr: "il y a {h} h {m} min" },
  "time.dayHourAgo": { en: "{d}d {h}h ago", fr: "il y a {d} j {h} h" },

  // --------------------------------------------------------------------
  // LANDING
  // --------------------------------------------------------------------
  "landing.headline": { en: "Don't know where to start? Start here.", fr: "Vous ne savez pas par où commencer ? Commencez ici." },
  "landing.subtext": { en: "Check in with just your phone number, describe how you're feeling, and get matched with a qualified freelance healthcare professional.", fr: "Enregistrez-vous avec simplement votre numéro de téléphone, décrivez comment vous vous sentez, et soyez mis en relation avec un professionnel de santé indépendant qualifié." },
  "landing.checkInNow": { en: "Consult Now", fr: "Consulter maintenant" },
  "landing.checkTicketStatus": { en: "Check My Ticket Status", fr: "Vérifier le statut de mon ticket" },
  "landing.imHealthcareProfessional": { en: "I'm a Healthcare Professional", fr: "Je suis un professionnel de santé" },
  "landing.registerMyHospital": { en: "Register My Hospital", fr: "Enregistrer mon hôpital" },

  // --------------------------------------------------------------------
  // LOOKUP (account-free ticket status check)
  // --------------------------------------------------------------------
  "lookup.title": { en: "Check My Ticket", fr: "Vérifier mon ticket" },
  "lookup.subtext": { en: "Enter the phone number and code you were given at check-in.", fr: "Entrez le numéro de téléphone et le code qui vous ont été donnés lors de l'enregistrement." },
  "lookup.phoneNumber": { en: "Phone Number", fr: "Numéro de téléphone" },
  "lookup.yourCode": { en: "Your Code", fr: "Votre code" },
  "lookup.codePlaceholder": { en: "e.g. A7K92M", fr: "ex. A7K92M" },
  "lookup.checking": { en: "Checking...", fr: "Vérification..." },
  "lookup.checkStatus": { en: "Check Status", fr: "Vérifier le statut" },
  "lookup.summaryFromProfessional": { en: "Summary from your professional:", fr: "Résumé de votre professionnel de santé :" },
  "lookup.enterBoth": { en: "Please enter both your phone number and code.", fr: "Veuillez entrer votre numéro de téléphone et votre code." },
  "lookup.notFound": { en: "Could not find that ticket.", fr: "Impossible de trouver ce ticket." },
  "lookup.checkFailed": { en: "Could not check status: {error}", fr: "Impossible de vérifier le statut : {error}" },

  // --------------------------------------------------------------------
  // CHECK-IN (account-free client flow)
  // --------------------------------------------------------------------
  "checkin.title": { en: "Check In", fr: "Enregistrement" },
  "checkin.subtext": { en: "No account needed. Tell us how you're feeling and how to reach you.", fr: "Aucun compte nécessaire. Dites-nous comment vous vous sentez et comment vous joindre." },
  "checkin.notEmergencyTitle": { en: "Not for emergencies", fr: "Ne convient pas aux urgences" },
  "checkin.notEmergencyBody": { en: "Ticket-In is a consultation platform, not an emergency service. If you are experiencing a life-threatening emergency - severe difficulty breathing, chest pain, uncontrolled bleeding, loss of consciousness, or anything you believe could be life-threatening - go to the nearest hospital or call emergency services immediately. Do not wait for a Ticket-In consultation.", fr: "Ticket-In est une plateforme de consultation, et non un service d'urgence. Si vous vivez une urgence pouvant mettre votre vie en danger — difficulté respiratoire sévère, douleur thoracique, saignement incontrôlé, perte de conscience, ou toute situation que vous jugez potentiellement mortelle — rendez-vous immédiatement à l'hôpital le plus proche ou appelez les services d'urgence. N'attendez pas une consultation Ticket-In." },
  "checkin.phoneNumber": { en: "Phone Number", fr: "Numéro de téléphone" },
  "checkin.phonePlaceholder": { en: "e.g. 6XX XXX XXX", fr: "ex. 6XX XXX XXX" },
  "checkin.howSeen": { en: "How would you like to be seen?", fr: "Comment souhaitez-vous être consulté(e) ?" },
  "checkin.remoteConsultation": { en: "Remote consultation", fr: "Consultation à distance" },
  "checkin.inPersonAtHospital": { en: "In-person at a hospital", fr: "En personne dans un hôpital" },
  "checkin.chooseHospital": { en: "Choose a hospital", fr: "Choisissez un hôpital" },
  "checkin.selectHospitalPlaceholder": { en: "Select a hospital...", fr: "Sélectionnez un hôpital..." },
  "checkin.noHospitalsRegistered": { en: "No hospitals are registered yet - please choose a remote consultation instead.", fr: "Aucun hôpital n'est encore enregistré - veuillez choisir une consultation à distance à la place." },
  "checkin.areYou18": { en: "Are you 18 or older?", fr: "Avez-vous 18 ans ou plus ?" },
  "checkin.yes18OrOlder": { en: "Yes, 18 or older", fr: "Oui, 18 ans ou plus" },
  "checkin.noUnder18": { en: "No, under 18", fr: "Non, moins de 18 ans" },
  "checkin.guardianRequiredNotice": { en: "Ticket-In requires a parent or guardian's details for anyone under 18. Please have them check in with you, or provide their information below.", fr: "Ticket-In exige les coordonnées d'un parent ou tuteur pour toute personne de moins de 18 ans. Demandez-leur de faire l'enregistrement avec vous, ou indiquez leurs informations ci-dessous." },
  "checkin.guardianName": { en: "Parent/Guardian Name", fr: "Nom du parent/tuteur" },
  "checkin.guardianPhone": { en: "Parent/Guardian Phone", fr: "Téléphone du parent/tuteur" },
  "checkin.severity": { en: "Severity", fr: "Gravité" },
  "checkin.severityScale": { en: "(1 = very mild, 10 = worst imaginable)", fr: "(1 = très légère, 10 = pire imaginable)" },
  "checkin.severityUrgentWarning": { en: "This severity level may need urgent or emergency care - please read the notice above carefully.", fr: "Ce niveau de gravité peut nécessiter des soins urgents - veuillez lire attentivement l'avis ci-dessus." },
  "checkin.describeSeverity": { en: "Describe the severity in your own words (optional)", fr: "Décrivez la gravité avec vos propres mots (facultatif)" },
  "checkin.describeSeverityPlaceholder": { en: "e.g. sharp pain, hard to walk", fr: "ex. douleur vive, difficulté à marcher" },
  "checkin.anythingElse": { en: "Anything else?", fr: "Autre chose à ajouter ?" },
  "checkin.emergencyAckLabel": { en: "I understand Ticket-In is not for medical emergencies, and I will seek emergency care directly if my situation is life-threatening.", fr: "Je comprends que Ticket-In n'est pas destiné aux urgences médicales, et je chercherai des soins d'urgence directement si ma situation met ma vie en danger." },
  "checkin.submitting": { en: "Submitting...", fr: "Envoi en cours..." },
  "checkin.submitAndContinue": { en: "Submit and Continue", fr: "Envoyer et continuer" },
  "checkin.pleaseReadFirst": { en: "Please Read This First", fr: "Veuillez lire ceci d'abord" },
  "checkin.severityWarningModalBody": { en: "You reported a severity of {level}/10. If what you're experiencing feels life-threatening - severe difficulty breathing, chest pain, uncontrolled bleeding, loss of consciousness, or anything similarly urgent - please go to the nearest hospital or call emergency services now, rather than waiting for a Ticket-In consultation.", fr: "Vous avez signalé une gravité de {level}/10. Si ce que vous ressentez semble mettre votre vie en danger — difficulté respiratoire sévère, douleur thoracique, saignement incontrôlé, perte de conscience, ou toute situation aussi urgente — rendez-vous immédiatement à l'hôpital le plus proche ou appelez les services d'urgence, plutôt que d'attendre une consultation Ticket-In." },
  "checkin.urgentTicketNotice": { en: "Your ticket has been marked urgent and will be shown to staff as a priority. If you believe this can safely wait for a consultation, you can continue below.", fr: "Votre ticket a été marqué comme urgent et sera présenté au personnel en priorité. Si vous pensez que cela peut attendre une consultation en toute sécurité, vous pouvez continuer ci-dessous." },
  "checkin.iUnderstandContinue": { en: "I understand, continue", fr: "J'ai compris, continuer" },

  // OLDCART fields (onset/location/duration/character/aggravating/relieving/timing)
  "checkin.field.onset.label": { en: "Onset", fr: "Début" },
  "checkin.field.onset.placeholder": { en: "When did this first begin? (e.g. 3 days ago, this morning)", fr: "Quand cela a-t-il commencé ? (ex. il y a 3 jours, ce matin)" },
  "checkin.field.location.label": { en: "Location", fr: "Localisation" },
  "checkin.field.location.placeholder": { en: "Where on the body?", fr: "À quel endroit du corps ?" },
  "checkin.field.duration.label": { en: "Duration", fr: "Durée" },
  "checkin.field.duration.placeholder": { en: "How long does it last each time? (e.g. a few minutes, all day, non-stop since it began)", fr: "Combien de temps cela dure-t-il à chaque fois ? (ex. quelques minutes, toute la journée, en continu depuis le début)" },
  "checkin.field.character.label": { en: "Character", fr: "Caractère" },
  "checkin.field.character.placeholder": { en: "What does it feel like?", fr: "Quelle sensation cela procure-t-il ?" },
  "checkin.field.aggravating_factors.label": { en: "Aggravating Factors", fr: "Facteurs aggravants" },
  "checkin.field.aggravating_factors.placeholder": { en: "What makes it worse?", fr: "Qu'est-ce qui l'aggrave ?" },
  "checkin.field.relieving_factors.label": { en: "Relieving Factors", fr: "Facteurs soulageants" },
  "checkin.field.relieving_factors.placeholder": { en: "What makes it better?", fr: "Qu'est-ce qui le soulage ?" },
  "checkin.field.timing.label": { en: "Timing", fr: "Fréquence" },
  "checkin.field.timing.placeholder": { en: "Constant, or does it come and go?", fr: "Est-ce constant, ou est-ce que cela va et vient ?" },

  // Check-in validation / submit errors
  "checkin.err.readEmergencyNotice": { en: "Please confirm you've read the emergency notice before continuing.", fr: "Veuillez confirmer avoir lu l'avis d'urgence avant de continuer." },
  "checkin.err.enterPhone": { en: "Please enter your phone number.", fr: "Veuillez entrer votre numéro de téléphone." },
  "checkin.err.onsetSeverityRequired": { en: "Please fill in at least Onset and Severity.", fr: "Veuillez au moins remplir les champs Début et Gravité." },
  "checkin.err.confirmAge": { en: "Please confirm whether you are 18 or older.", fr: "Veuillez confirmer si vous avez 18 ans ou plus." },
  "checkin.err.guardianRequired": { en: "A parent or guardian's name and phone number are required.", fr: "Le nom et le numéro de téléphone d'un parent ou tuteur sont requis." },
  "checkin.err.chooseHospital": { en: "Please choose a hospital.", fr: "Veuillez choisir un hôpital." },
  "checkin.err.submitFailed": { en: "Could not submit check-in.", fr: "Impossible d'envoyer l'enregistrement." },
  "checkin.err.submitFailedWithError": { en: "Could not submit check-in: {error}", fr: "Impossible d'envoyer l'enregistrement : {error}" },

  // --------------------------------------------------------------------
  // CHECK-IN CODE / PAYMENT
  // --------------------------------------------------------------------
  "checkincode.submitted": { en: "Check-In Submitted", fr: "Enregistrement envoyé" },
  "checkincode.saveCodeNotice": { en: "Your code - save this, you'll need it to check your status:", fr: "Votre code - conservez-le, vous en aurez besoin pour vérifier votre statut :" },
  "checkincode.tapToCopyNotice": { en: "Tap to copy - along with your phone number, this is how you'll check your ticket later.", fr: "Touchez pour copier - avec votre numéro de téléphone, c'est ainsi que vous vérifierez votre ticket plus tard." },
  "checkincode.continueToPayment": { en: "Continue to Payment", fr: "Continuer vers le paiement" },
  "checkincode.completePayment": { en: "Complete Payment", fr: "Finaliser le paiement" },
  "checkincode.sendExactly": { en: "SEND EXACTLY", fr: "ENVOYEZ EXACTEMENT" },
  "checkincode.loadingPaymentDetails": { en: "Loading payment details...", fr: "Chargement des informations de paiement..." },
  "checkincode.copiedSendViaMomo": { en: "Copied - now send via MoMo", fr: "Copié - envoyez maintenant via MoMo" },
  "checkincode.tapToCopyMomo": { en: "Tap to copy MoMo number", fr: "Touchez pour copier le numéro MoMo" },
  "checkincode.referenceLabel": { en: "Reference from confirmation SMS", fr: "Référence du SMS de confirmation" },
  "checkincode.referencePlaceholder": { en: "e.g. MP240905.1234.A56789", fr: "ex. MP240905.1234.A56789" },
  "checkincode.ivesSentPayment": { en: "I've Sent the Payment", fr: "J'ai envoyé le paiement" },
  "checkincode.err.copyLongPress": { en: "Could not copy - long-press to copy manually.", fr: "Copie impossible - appuyez longuement pour copier manuellement." },
  "checkincode.codeCopied": { en: "Code copied.", fr: "Code copié." },
  "checkincode.err.copyWriteDown": { en: "Could not copy - please write it down.", fr: "Copie impossible - veuillez le noter." },
  "checkincode.err.paymentDetailsFailed": { en: "Could not load payment details.", fr: "Impossible de charger les informations de paiement." },
  "checkincode.err.paymentDetailsFailedWithError": { en: "Could not load payment details: {error}", fr: "Impossible de charger les informations de paiement : {error}" },
  "checkincode.err.enterReference": { en: "Please enter your transaction reference.", fr: "Veuillez entrer votre référence de transaction." },
  "checkincode.err.submitPaymentFailed": { en: "Could not submit payment.", fr: "Impossible d'envoyer le paiement." },
  "checkincode.paymentSubmitted": { en: "Payment submitted! We'll confirm shortly and your consultation will open.", fr: "Paiement envoyé ! Nous le confirmerons sous peu et votre consultation s'ouvrira." },
  "checkincode.err.submitPaymentFailedWithError": { en: "Could not submit payment: {error}", fr: "Impossible d'envoyer le paiement : {error}" },

  // --------------------------------------------------------------------
  // AUTH (staff / admin / hospital sign in & sign up)
  // --------------------------------------------------------------------
  "auth.hospitalSignUp": { en: "Hospital Sign Up", fr: "Inscription hôpital" },
  "auth.professionalSignUp": { en: "Professional Sign Up", fr: "Inscription professionnel" },
  "auth.signIn": { en: "Sign In", fr: "Connexion" },
  "auth.registerHospitalSubtext": { en: "Register your hospital or clinic.", fr: "Enregistrez votre hôpital ou clinique." },
  "auth.forVerifiedStaffSubtext": { en: "For verified healthcare staff and admin only.", fr: "Réservé au personnel de santé et aux administrateurs vérifiés." },
  "auth.signInSubtext": { en: "Sign in to your account.", fr: "Connectez-vous à votre compte." },
  "auth.healthcareProfessional": { en: "Healthcare Professional", fr: "Professionnel de santé" },
  "auth.hospital": { en: "Hospital", fr: "Hôpital" },
  "auth.yourNameHospitalContact": { en: "Your Name (hospital contact)", fr: "Votre nom (contact de l'hôpital)" },
  "auth.fullName": { en: "Full Name", fr: "Nom complet" },
  "auth.licenseNumber": { en: "License / Registration Number", fr: "Numéro de licence / d'enregistrement" },
  "auth.issuingInstitution": { en: "Issuing Institution", fr: "Établissement émetteur" },
  "auth.specialtyOptional": { en: "Specialty (optional)", fr: "Spécialité (facultatif)" },
  "auth.staffReviewNotice": { en: "An admin will review these before your account can claim tickets. If you're affiliated with a hospital already registered here, that hospital can add you to its roster from its dashboard using this email.", fr: "Un administrateur examinera ces informations avant que votre compte puisse prendre en charge des tickets. Si vous êtes affilié à un hôpital déjà enregistré ici, cet hôpital peut vous ajouter à son équipe depuis son tableau de bord en utilisant cet e-mail." },
  "auth.hospitalClinicName": { en: "Hospital / Clinic Name", fr: "Nom de l'hôpital / de la clinique" },
  "auth.town": { en: "Town", fr: "Ville" },
  "auth.addressOptional": { en: "Address (optional)", fr: "Adresse (facultatif)" },
  "auth.phoneOptional": { en: "Phone (optional)", fr: "Téléphone (facultatif)" },
  "auth.hospitalReviewNotice": { en: "An admin will review and verify your hospital before it appears in the client check-in list. Once verified, you can add doctors to your roster from your dashboard.", fr: "Un administrateur examinera et vérifiera votre hôpital avant qu'il n'apparaisse dans la liste d'enregistrement des clients. Une fois vérifié, vous pourrez ajouter des médecins à votre équipe depuis votre tableau de bord." },
  "auth.email": { en: "Email", fr: "E-mail" },
  "auth.passwordMinChars": { en: "Password (at least 8 characters)", fr: "Mot de passe (au moins 8 caractères)" },
  "auth.password": { en: "Password", fr: "Mot de passe" },
  "auth.agreeBefore": { en: "By creating an account you agree to our ", fr: "En créant un compte, vous acceptez nos " },
  "auth.pleaseWait": { en: "Please wait...", fr: "Veuillez patienter..." },
  "auth.createAccount": { en: "Create Account", fr: "Créer un compte" },
  "auth.forgotPassword": { en: "Forgot password?", fr: "Mot de passe oublié ?" },
  "auth.alreadyHaveAccount": { en: "Already have an account? ", fr: "Vous avez déjà un compte ? " },
  "auth.newHere": { en: "New here? ", fr: "Nouveau ici ? " },
  "auth.signInLink": { en: "Sign in", fr: "Se connecter" },
  "auth.createOneLink": { en: "Create one", fr: "En créer un" },
  "auth.err.emailPasswordRequired": { en: "Email and password required.", fr: "L'e-mail et le mot de passe sont requis." },
  "auth.err.passwordMin8": { en: "Password must be at least 8 characters.", fr: "Le mot de passe doit contenir au moins 8 caractères." },
  "auth.err.licenseInstitutionRequired": { en: "License number and issuing institution are required.", fr: "Le numéro de licence et l'établissement émetteur sont requis." },
  "auth.err.hospitalNameTownRequired": { en: "Hospital name and town are required.", fr: "Le nom de l'hôpital et la ville sont requis." },
  "auth.err.nameRequired": { en: "Name is required.", fr: "Le nom est requis." },
  "auth.err.registrationNotFinalized": { en: "Account created, but registration could not be finalized.", fr: "Compte créé, mais l'inscription n'a pas pu être finalisée." },
  "auth.accountCreatedConfirmEmail": { en: "Account created - please check your email to confirm, then sign in.", fr: "Compte créé - veuillez vérifier votre e-mail pour confirmer, puis vous connecter." },
  "auth.accountCreated": { en: "Account created!", fr: "Compte créé !" },

  // --------------------------------------------------------------------
  // PASSWORD RESET
  // --------------------------------------------------------------------
  "reset.backToSignIn": { en: "Back to sign in", fr: "Retour à la connexion" },
  "reset.resetPassword": { en: "Reset Password", fr: "Réinitialiser le mot de passe" },
  "reset.linkSentNotice": { en: "If an account exists for that email, a password reset link has been sent. Check your inbox and follow the link to set a new password.", fr: "Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception et suivez le lien pour définir un nouveau mot de passe." },
  "reset.enterEmailNotice": { en: "Enter your account email and we'll send you a reset link.", fr: "Entrez l'e-mail de votre compte et nous vous enverrons un lien de réinitialisation." },
  "reset.sending": { en: "Sending...", fr: "Envoi en cours..." },
  "reset.sendResetLink": { en: "Send Reset Link", fr: "Envoyer le lien de réinitialisation" },
  "reset.err.enterEmailFirst": { en: "Enter your email first.", fr: "Veuillez d'abord entrer votre e-mail." },
  "reset.setNewPassword": { en: "Set a New Password", fr: "Définir un nouveau mot de passe" },
  "reset.chooseNewPasswordNotice": { en: "Choose a new password for your account.", fr: "Choisissez un nouveau mot de passe pour votre compte." },
  "reset.newPasswordMinChars": { en: "New Password (at least 8 characters)", fr: "Nouveau mot de passe (au moins 8 caractères)" },
  "reset.saving": { en: "Saving...", fr: "Enregistrement..." },
  "reset.savePassword": { en: "Save Password", fr: "Enregistrer le mot de passe" },
  "reset.passwordUpdated": { en: "Password updated.", fr: "Mot de passe mis à jour." },

  // --------------------------------------------------------------------
  // APP SHELL / SIDEBAR
  // --------------------------------------------------------------------
  "shell.ticketBoard": { en: "Ticket Board", fr: "Tableau des tickets" },
  "shell.hospitalDashboard": { en: "Hospital Dashboard", fr: "Tableau de bord hôpital" },
  "shell.forum": { en: "Forum", fr: "Forum" },
  "shell.resources": { en: "Resources", fr: "Ressources" },
  "shell.admin": { en: "Admin", fr: "Administration" },
  "shell.manageUsers": { en: "Manage Users", fr: "Gérer les utilisateurs" },
  "shell.signOut": { en: "Sign Out", fr: "Se déconnecter" },
  "shell.privacy": { en: "Privacy", fr: "Confidentialité" },
  "shell.terms": { en: "Terms", fr: "Conditions" },

  // --------------------------------------------------------------------
  // STAFF BOARD
  // --------------------------------------------------------------------
  "staff.ticketBoard": { en: "Ticket Board", fr: "Tableau des tickets" },
  "staff.pendingVerificationNotice": { en: "Your account is pending verification. You'll be able to claim tickets once an admin approves your account.", fr: "Votre compte est en attente de vérification. Vous pourrez prendre en charge des tickets une fois qu'un administrateur aura approuvé votre compte." },
  "staff.openTickets": { en: "Open Tickets ({count})", fr: "Tickets ouverts ({count})" },
  "staff.waitingSince": { en: "Waiting {time}", fr: "En attente {time}" },
  "staff.onsetLabel": { en: "Onset:", fr: "Début :" },
  "staff.severityLabel": { en: "Severity:", fr: "Gravité :" },
  "staff.claimTicket": { en: "Claim Ticket", fr: "Prendre en charge" },
  "staff.myClaimedTickets": { en: "My Claimed Tickets ({count})", fr: "Mes tickets pris en charge ({count})" },
  "staff.submittedTime": { en: "Submitted {time}", fr: "Envoyé {time}" },
  "staff.startConsultation": { en: "Start Consultation", fr: "Démarrer la consultation" },
  "staff.resolveAddNotes": { en: "Resolve & Add Notes", fr: "Résoudre et ajouter des notes" },
  "staff.myEarningsPending": { en: "My Earnings ({amount} XAF pending)", fr: "Mes gains ({amount} XAF en attente)" },
  "staff.resolveToEarnNotice": { en: "Resolve a consultation to start earning.", fr: "Résolvez une consultation pour commencer à gagner." },
  "staff.err.claimFailed": { en: "Could not claim ticket.", fr: "Impossible de prendre en charge le ticket." },
  "staff.ticketClaimed": { en: "Ticket claimed.", fr: "Ticket pris en charge." },
  "staff.consultationStarted": { en: "Consultation started.", fr: "Consultation démarrée." },

  // --------------------------------------------------------------------
  // FORUM
  // --------------------------------------------------------------------
  "forum.title": { en: "Forum", fr: "Forum" },
  "forum.subtext": { en: "Professional discussion between staff and admin. Not visible to clients.", fr: "Discussion professionnelle entre le personnel et les administrateurs. Non visible pour les clients." },
  "forum.startDiscussion": { en: "Start a Discussion", fr: "Démarrer une discussion" },
  "forum.subjectOptional": { en: "Subject (optional)", fr: "Sujet (facultatif)" },
  "forum.subjectPlaceholder": { en: "e.g. Case management", fr: "ex. gestion de cas" },
  "forum.whatsOnYourMind": { en: "What's on your mind?", fr: "Qu'avez-vous en tête ?" },
  "forum.bodyPlaceholder": { en: "Ask a question or start a discussion...", fr: "Posez une question ou lancez une discussion..." },
  "forum.post": { en: "Post", fr: "Publier" },
  "forum.notVerifiedNotice": { en: "You'll be able to post once your account is verified. You can still read the forum.", fr: "Vous pourrez publier une fois votre compte vérifié. Vous pouvez néanmoins lire le forum." },
  "forum.writeReplyPlaceholder": { en: "Write a reply...", fr: "Écrivez une réponse..." },
  "forum.noDiscussionsYet": { en: "No discussions yet - be the first to post.", fr: "Aucune discussion pour l'instant - soyez le premier à publier." },
  "forum.err.writeSomething": { en: "Write something before posting.", fr: "Écrivez quelque chose avant de publier." },
  "forum.err.postFailed": { en: "Could not post: {error}", fr: "Publication impossible : {error}" },
  "forum.err.replyFailed": { en: "Could not reply: {error}", fr: "Réponse impossible : {error}" },
  "forum.confirmRemovePost": { en: "Remove this post?", fr: "Retirer cette publication ?" },

  // --------------------------------------------------------------------
  // RESOURCES
  // --------------------------------------------------------------------
  "resources.title": { en: "Resources", fr: "Ressources" },
  "resources.addResource": { en: "Add Resource", fr: "Ajouter une ressource" },
  "resources.subtext": { en: "Reference guidelines, protocols, and notes for staff.", fr: "Directives de référence, protocoles et notes pour le personnel." },
  "resources.titleLabel": { en: "Title", fr: "Titre" },
  "resources.titlePlaceholder": { en: "e.g. WHO Triage Guidelines", fr: "ex. Directives de triage de l'OMS" },
  "resources.categoryOptional": { en: "Category (optional)", fr: "Catégorie (facultatif)" },
  "resources.categoryPlaceholder": { en: "e.g. Triage, Referral", fr: "ex. Triage, Orientation" },
  "resources.descriptionOptional": { en: "Description (optional)", fr: "Description (facultatif)" },
  "resources.linkOptional": { en: "Link (optional)", fr: "Lien (facultatif)" },
  "resources.linkPlaceholder": { en: "https://...", fr: "https://..." },
  "resources.writtenContentOptional": { en: "Written content (optional)", fr: "Contenu écrit (facultatif)" },
  "resources.writtenContentPlaceholder": { en: "Notes, a protocol, or guidance written directly here...", fr: "Notes, un protocole, ou des directives écrites directement ici..." },
  "resources.saveResource": { en: "Save Resource", fr: "Enregistrer la ressource" },
  "resources.openLink": { en: "Open Link →", fr: "Ouvrir le lien →" },
  "resources.noResourcesYet": { en: "No resources yet.", fr: "Aucune ressource pour l'instant." },
  "resources.err.titleRequired": { en: "A title is required.", fr: "Un titre est requis." },
  "resources.err.linkOrTextRequired": { en: "Add a link, written content, or both.", fr: "Ajoutez un lien, du contenu écrit, ou les deux." },
  "resources.err.addFailed": { en: "Could not add resource: {error}", fr: "Impossible d'ajouter la ressource : {error}" },
  "resources.added": { en: "Resource added.", fr: "Ressource ajoutée." },
  "resources.confirmRemove": { en: "Remove this resource?", fr: "Retirer cette ressource ?" },

  // --------------------------------------------------------------------
  // ADMIN
  // --------------------------------------------------------------------
  "admin.title": { en: "Admin", fr: "Administration" },
  "admin.needsAttentionUrgent": { en: "Needs Attention - Urgent ({count})", fr: "Nécessite une attention - Urgent ({count})" },
  "admin.urgentNotice": { en: "Severity 8+ and not yet resolved, regardless of payment status - a payment problem should never be why a potentially urgent case goes unnoticed.", fr: "Gravité 8 ou plus et non encore résolu, quel que soit le statut du paiement - un problème de paiement ne doit jamais être la raison pour laquelle un cas potentiellement urgent passe inaperçu." },
  "admin.severityContact": { en: "Severity {level}/10 - Contact: {phone}", fr: "Gravité {level}/10 - Contact : {phone}" },
  "admin.statTotal": { en: "Total", fr: "Total" },
  "admin.statUrgentActive": { en: "Urgent (active)", fr: "Urgent (actif)" },
  "admin.statOpen": { en: "Open", fr: "Ouverts" },
  "admin.statClaimed": { en: "Claimed", fr: "Pris en charge" },
  "admin.statInProgress": { en: "In Progress", fr: "En cours" },
  "admin.statResolved": { en: "Resolved", fr: "Résolus" },
  "admin.findTicketByPhone": { en: "Find a Ticket by Phone", fr: "Trouver un ticket par téléphone" },
  "admin.searchPhonePlaceholder": { en: "e.g. 6XX XXX XXX", fr: "ex. 6XX XXX XXX" },
  "admin.search": { en: "Search", fr: "Rechercher" },
  "admin.noTicketsFoundForNumber": { en: "No tickets found for that number.", fr: "Aucun ticket trouvé pour ce numéro." },
  "admin.severityCodePhone": { en: "Severity {level}/10 - Code: {code} - {phone}", fr: "Gravité {level}/10 - Code : {code} - {phone}" },
  "admin.pendingPayments": { en: "Pending Payments ({count})", fr: "Paiements en attente ({count})" },
  "admin.refLabel": { en: "Ref: {ref}", fr: "Réf. : {ref}" },
  "admin.pendingStaffPayouts": { en: "Pending Staff Payouts ({count})", fr: "Rémunérations du personnel en attente ({count})" },
  "admin.nothingOwedRightNow": { en: "Nothing owed right now.", fr: "Rien à payer pour le moment." },
  "admin.earnedTime": { en: "Earned {time}", fr: "Gagné {time}" },
  "admin.markPaid": { en: "Mark Paid", fr: "Marquer comme payé" },
  "admin.pendingStaffVerification": { en: "Pending Staff Verification ({count})", fr: "Vérification du personnel en attente ({count})" },
  "admin.pendingHospitalVerification": { en: "Pending Hospital Verification ({count})", fr: "Vérification des hôpitaux en attente ({count})" },
  "admin.hospitalNameMissing": { en: "(hospital name missing)", fr: "(nom de l'hôpital manquant)" },
  "admin.inPersonTicketsByHospital": { en: "In-Person Tickets by Hospital ({count})", fr: "Tickets en personne par hôpital ({count})" },
  "admin.viewHospitalDashboard": { en: "View Dashboard", fr: "Voir le tableau de bord" },
  "admin.noDoctorsOnRoster": { en: "No doctors on this hospital's roster yet.", fr: "Aucun médecin n'est encore inscrit sur la liste de cet hôpital." },
  "admin.noInPersonTicketsYet": { en: "No in-person tickets yet.", fr: "Aucun ticket en personne pour l'instant." },
  "admin.err.enterPhoneToSearch": { en: "Enter a phone number to search.", fr: "Entrez un numéro de téléphone pour rechercher." },
  "admin.err.searchFailed": { en: "Search failed: {error}", fr: "Échec de la recherche : {error}" },
  "admin.err.statsFailed": { en: "Could not load ticket stats: {error}", fr: "Impossible de charger les statistiques des tickets : {error}" },
  "admin.markedPaid": { en: "Marked as paid.", fr: "Marqué comme payé." },
  "admin.err.confirmPaymentFailed": { en: "Could not confirm payment.", fr: "Impossible de confirmer le paiement." },
  "admin.paymentConfirmed": { en: "Payment confirmed, ticket is now open.", fr: "Paiement confirmé, le ticket est maintenant ouvert." },
  "admin.staffVerified": { en: "Staff verified.", fr: "Personnel vérifié." },
  "admin.staffRejected": { en: "Staff rejected.", fr: "Personnel rejeté." },
  "admin.confirmDeleteAccount": { en: "Permanently delete {name}'s {role} account? This cannot be undone.\n\nThis will be refused if the account has any real activity (claimed tickets, notes, payouts, ratings, or - for a hospital - tickets/doctors on its roster).", fr: "Supprimer définitivement le compte {role} de {name} ? Cette action est irréversible.\n\nCela sera refusé si le compte a une activité réelle (tickets pris en charge, notes, rémunérations, évaluations, ou - pour un hôpital - des tickets/médecins sur son registre)." },
  "admin.err.deleteAccountFailed": { en: "Could not delete account.", fr: "Impossible de supprimer le compte." },
  "admin.accountDeleted": { en: "Account deleted.", fr: "Compte supprimé." },
  "admin.err.updateRoleFailed": { en: "Could not update role: {error}", fr: "Impossible de mettre à jour le rôle : {error}" },
  "admin.roleUpdated": { en: "Role updated.", fr: "Rôle mis à jour." },
  "admin.err.loadUsersFailed": { en: "Could not load users: {error}", fr: "Impossible de charger les utilisateurs : {error}" },
  "admin.setRolePrefix": { en: "Set ", fr: "Définir : " },

  // --------------------------------------------------------------------
  // MANAGE USERS
  // --------------------------------------------------------------------
  "users.title": { en: "Manage Users", fr: "Gérer les utilisateurs" },
  "users.registeredByWithPhone": { en: "Registered by {name} - {phone}", fr: "Enregistré par {name} - {phone}" },
  "users.verifiedOn": { en: "Verified {date}", fr: "Vérifié le {date}" },
  "users.noCredentialsOnFile": { en: "No credentials on file.", fr: "Aucun justificatif enregistré." },
  "users.suspend": { en: "Suspend", fr: "Suspendre" },
  "users.delete": { en: "Delete", fr: "Supprimer" },

  // --------------------------------------------------------------------
  // HOSPITAL DASHBOARD
  // --------------------------------------------------------------------
  "hospital.dashboardFallbackTitle": { en: "Hospital Dashboard", fr: "Tableau de bord hôpital" },
  "hospital.pendingVerificationNotice": { en: "Your hospital is pending admin verification. It won't appear in the client check-in list, and no tickets will be routed to it, until then.", fr: "Votre hôpital est en attente de vérification par un administrateur. Il n'apparaîtra pas dans la liste d'enregistrement des clients, et aucun ticket ne lui sera transmis, jusqu'à cette vérification." },
  "hospital.doctorRoster": { en: "Doctor Roster ({count})", fr: "Équipe médicale ({count})" },
  "hospital.addDoctorByEmail": { en: "Add a doctor by their registered email", fr: "Ajouter un médecin par son e-mail enregistré" },
  "hospital.doctorEmailPlaceholder": { en: "doctor@email.com", fr: "medecin@email.com" },
  "hospital.adding": { en: "Adding...", fr: "Ajout en cours..." },
  "hospital.add": { en: "Add", fr: "Ajouter" },
  "hospital.mustHaveAccountNotice": { en: "They must already have a Ticket-In healthcare-professional account.", fr: "Ils doivent déjà posséder un compte professionnel de santé Ticket-In." },
  "hospital.ticketsSentToYourHospital": { en: "Tickets Sent to Your Hospital ({count})", fr: "Tickets envoyés à votre hôpital ({count})" },
  "hospital.noInPersonTicketsYet": { en: "No in-person tickets yet.", fr: "Aucun ticket en personne pour l'instant." },
  "hospital.err.enterDoctorEmail": { en: "Enter the doctor's registered email.", fr: "Entrez l'e-mail enregistré du médecin." },
  "hospital.err.addDoctorFailed": { en: "Could not add doctor.", fr: "Impossible d'ajouter le médecin." },
  "hospital.alreadyOnRoster": { en: "Already on your roster.", fr: "Déjà présent dans votre équipe." },
  "hospital.doctorAddedToRoster": { en: "Doctor added to your roster: {name}", fr: "Médecin ajouté à votre équipe : {name}" },
  "hospital.confirmRemoveDoctor": { en: "Remove this doctor from your roster?", fr: "Retirer ce médecin de votre équipe ?" },
  "hospital.err.removeDoctorFailed": { en: "Could not remove doctor.", fr: "Impossible de retirer le médecin." },
  "hospital.doctorRemoved": { en: "Doctor removed.", fr: "Médecin retiré." },

  // --------------------------------------------------------------------
  // RESOLVE TICKET MODAL
  // --------------------------------------------------------------------
  "resolve.title": { en: "Resolve Ticket", fr: "Résoudre le ticket" },
  "resolve.objectiveAssessment": { en: "Objective Assessment", fr: "Évaluation objective" },
  "resolve.clinicalDiagnosis": { en: "Clinical Diagnosis", fr: "Diagnostic clinique" },
  "resolve.plan": { en: "Plan", fr: "Plan" },
  "resolve.implementation": { en: "Implementation", fr: "Mise en œuvre" },
  "resolve.evaluation": { en: "Evaluation", fr: "Évaluation" },
  "resolve.clientSummaryNotice": { en: "Summary shown to the client (plain language, not clinical jargon):", fr: "Résumé montré au client (langage simple, sans jargon clinique) :" },
  "resolve.clientSummary": { en: "Client Summary", fr: "Résumé pour le client" },
  "resolve.resolving": { en: "Resolving...", fr: "Résolution en cours..." },
  "resolve.resolveTicket": { en: "Resolve Ticket", fr: "Résoudre le ticket" },
  "resolve.err.summaryRequired": { en: "Please write a summary for the client.", fr: "Veuillez rédiger un résumé pour le client." },
  "resolve.err.resolveFailed": { en: "Could not resolve.", fr: "Impossible de résoudre." },
  "resolve.ticketResolved": { en: "Ticket resolved.", fr: "Ticket résolu." },
  "resolve.err.resolveFailedWithError": { en: "Could not resolve: {error}", fr: "Impossible de résoudre : {error}" },

  // --------------------------------------------------------------------
  // PRIVACY POLICY
  // --------------------------------------------------------------------
  "privacy.title": { en: "Privacy Policy", fr: "Politique de confidentialité" },
  "privacy.lastUpdated": { en: "Last updated: September 2026", fr: "Dernière mise à jour : septembre 2026" },
  "privacy.interimNotice": {
    en: "This is a good-faith interim Privacy Policy, written to accurately describe what Ticket-In actually collects and does with your information today. It is not a substitute for formal authorization from Cameroon's Personal Data Protection Authority under Law No. 2024/017, which is required before this kind of processing can lawfully continue at any real scale. That authorization has not yet been obtained.",
    fr: "Ceci est une politique de confidentialité provisoire, établie de bonne foi, rédigée pour décrire fidèlement ce que Ticket-In collecte réellement aujourd'hui et ce qu'il en fait. Elle ne remplace pas l'autorisation formelle de l'Autorité de Protection des Données Personnelles du Cameroun en vertu de la Loi n° 2024/017, laquelle est requise avant que ce type de traitement puisse légalement se poursuivre à une échelle réelle. Cette autorisation n'a pas encore été obtenue.",
  },
  "privacy.whoWeAreTitle": { en: "Who we are", fr: "Qui nous sommes" },
  "privacy.whoWeAreBody": { en: "Ticket-In is a freelance healthcare consultation platform connecting clients with independent, freelance healthcare professionals in Cameroon.", fr: "Ticket-In est une plateforme de consultation de santé indépendante mettant en relation des clients avec des professionnels de santé indépendants au Cameroun." },
  "privacy.whatWeCollectTitle": { en: "What we collect", fr: "Ce que nous collectons" },
  "privacy.whatWeCollectBody": {
    en: "<strong>If you check in as a client:</strong> your phone number; the health information you provide (onset, location, duration, character, aggravating/relieving factors, timing, severity, anything else you write); a system-generated code to look up your ticket later (no account, name, or email required); the mobile money transaction reference you submit when paying (we never see your mobile money account details themselves).<br /><br /><strong>If you register as staff:</strong> your name, email, password, professional license/registration number, issuing institution, and specialty, plus records of tickets you claim and the clinical notes you write.<br /><br /><strong>What we don't collect:</strong> we don't ask your name or any ID as a client. We do not currently verify age - if you're under 18, please involve a parent or guardian; we don't yet have a way to collect the parental consent Cameroonian law requires for a minor's data, and this is a real, acknowledged gap.",
    fr: "<strong>Si vous vous enregistrez en tant que client :</strong> votre numéro de téléphone ; les informations de santé que vous fournissez (début, localisation, durée, caractère, facteurs aggravants/soulageants, fréquence, gravité, et tout autre élément que vous écrivez) ; un code généré automatiquement pour retrouver votre ticket plus tard (aucun compte, nom ou e-mail requis) ; la référence de transaction mobile money que vous soumettez lors du paiement (nous n'avons jamais accès aux détails de votre compte mobile money lui-même).<br /><br /><strong>Si vous vous inscrivez en tant que membre du personnel :</strong> votre nom, e-mail, mot de passe, numéro de licence/d'enregistrement professionnel, établissement émetteur et spécialité, ainsi que les dossiers des tickets que vous prenez en charge et les notes cliniques que vous rédigez.<br /><br /><strong>Ce que nous ne collectons pas :</strong> nous ne demandons ni votre nom ni aucune pièce d'identité en tant que client. Nous ne vérifions pas actuellement l'âge - si vous avez moins de 18 ans, veuillez impliquer un parent ou tuteur ; nous n'avons pas encore de moyen de recueillir le consentement parental exigé par la loi camerounaise pour les données d'un mineur, et il s'agit d'une lacune réelle et reconnue.",
  },
  "privacy.howWeUseTitle": { en: "How we use your information", fr: "Comment nous utilisons vos informations" },
  "privacy.howWeUseBody": {
    en: "Your check-in is shown to the professional who claims your ticket. They write you a separate, plain-language summary - your full clinical notes stay internal to staff and admin, never shown to you in raw form. Your phone and code are used only for your own lookups and for admin follow-up on cases needing attention. Payment references are used only to confirm and activate your consultation.",
    fr: "Votre enregistrement est montré au professionnel qui prend en charge votre ticket. Il/elle vous rédige un résumé séparé, en langage simple - vos notes cliniques complètes restent internes au personnel et aux administrateurs, et ne vous sont jamais montrées telles quelles. Votre téléphone et votre code sont utilisés uniquement pour vos propres vérifications et pour le suivi administratif des cas nécessitant une attention particulière. Les références de paiement sont utilisées uniquement pour confirmer et activer votre consultation.",
  },
  "privacy.whoCanSeeTitle": { en: "Who can see your information", fr: "Qui peut voir vos informations" },
  "privacy.whoCanSeeBody": {
    en: "The staff member who claims your ticket, and platform admins. No other client and no unverified staff can see it. Clinical notes are restricted at the database level to the writing staff member and admins - enforced technically, not just promised. We do not sell your data or share it for advertising.",
    fr: "Le membre du personnel qui prend en charge votre ticket, ainsi que les administrateurs de la plateforme. Aucun autre client ni aucun membre du personnel non vérifié ne peut les voir. Les notes cliniques sont restreintes au niveau de la base de données au membre du personnel rédacteur et aux administrateurs - une restriction appliquée techniquement, pas seulement promise. Nous ne vendons pas vos données et ne les partageons pas à des fins publicitaires.",
  },
  "privacy.whereStoredTitle": { en: "Where your information is stored", fr: "Où vos informations sont stockées" },
  "privacy.whereStoredBody": {
    en: "We use Supabase, a third-party database provider - your data is likely stored outside Cameroon. Cross-border transfer requires separate Data Protection Authority authorization, which has not yet been obtained. We're working to confirm and formalize this.",
    fr: "Nous utilisons Supabase, un fournisseur tiers de base de données - vos données sont probablement stockées hors du Cameroun. Le transfert transfrontalier nécessite une autorisation distincte de l'Autorité de Protection des Données, qui n'a pas encore été obtenue. Nous travaillons à confirmer et formaliser cela.",
  },
  "privacy.howLongTitle": { en: "How long we keep it", fr: "Combien de temps nous les conservons" },
  "privacy.howLongBody": { en: "We have not yet set a formal retention policy. Until we do, assume records are retained indefinitely - this is an open item toward full compliance.", fr: "Nous n'avons pas encore établi de politique de conservation formelle. En attendant, considérez que les dossiers sont conservés indéfiniment - c'est un point en suspens vers une conformité complète." },
  "privacy.yourRightsTitle": { en: "Your rights", fr: "Vos droits" },
  "privacy.yourRightsBody": { en: "You have the right to know what we hold about you, request correction, and request deletion. Contact: mangwishihycentanda@gmail.com.", fr: "Vous avez le droit de savoir ce que nous détenons à votre sujet, de demander une correction, et de demander une suppression. Contact : mangwishihycentanda@gmail.com." },
  "privacy.paymentsTitle": { en: "Payments", fr: "Paiements" },
  "privacy.paymentsBody": { en: "We don't process mobile money automatically. You send money directly via mobile money, then tell us the reference - we never have access to your mobile money account, PIN, or balance.", fr: "Nous ne traitons pas automatiquement le mobile money. Vous envoyez l'argent directement via mobile money, puis vous nous communiquez la référence - nous n'avons jamais accès à votre compte mobile money, à votre code PIN, ou à votre solde." },
  "privacy.changesTitle": { en: "Changes", fr: "Modifications" },
  "privacy.changesBody": { en: "We'll update this as our practices change, especially once formal authorization is obtained.", fr: "Nous mettrons à jour ce document à mesure que nos pratiques évoluent, en particulier une fois l'autorisation formelle obtenue." },

  // --------------------------------------------------------------------
  // TERMS OF SERVICE
  // --------------------------------------------------------------------
  "terms.title": { en: "Terms of Service", fr: "Conditions d'utilisation" },
  "terms.lastUpdated": { en: "Last updated: September 2026", fr: "Dernière mise à jour : septembre 2026" },
  "terms.whatIsTitle": { en: "What Ticket-In is - and isn't", fr: "Ce qu'est Ticket-In - et ce qu'il n'est pas" },
  "terms.whatIsBody": {
    en: "Ticket-In connects clients with independent, freelance healthcare professionals. <strong>Ticket-In is not an emergency service and does not replace in-person or emergency medical care.</strong> If you're experiencing a life-threatening emergency, go to the nearest hospital or call emergency services immediately.<br /><br />Ticket-In is a platform, not a healthcare provider. Professionals using it operate independently, not as our employees or agents. Clinical judgment and treatment decisions are made independently by the professional handling your case.",
    fr: "Ticket-In met en relation des clients avec des professionnels de santé indépendants. <strong>Ticket-In n'est pas un service d'urgence et ne remplace pas les soins médicaux en personne ou d'urgence.</strong> Si vous vivez une urgence pouvant mettre votre vie en danger, rendez-vous immédiatement à l'hôpital le plus proche ou appelez les services d'urgence.<br /><br />Ticket-In est une plateforme, et non un prestataire de soins de santé. Les professionnels qui l'utilisent exercent de manière indépendante, et non en tant que nos employés ou agents. Le jugement clinique et les décisions de traitement sont pris de manière indépendante par le professionnel qui traite votre dossier.",
  },
  "terms.whoCanUseTitle": { en: "Who can use Ticket-In", fr: "Qui peut utiliser Ticket-In" },
  "terms.whoCanUseBody": {
    en: "We don't currently verify client age. If you're under 18, please have a parent or guardian aware of or assisting with your use of this service.<br /><br />Staff must provide accurate license/registration information. Providing false credentials is a serious violation and may lead to suspension and reporting to the relevant licensing body (e.g. the Cameroon Medical Council or the Ordre National des Infirmiers, Infirmières et Sages-Femmes du Cameroun). Admin verification is a good-faith review of what you provide, not yet independent real-time confirmation against the issuing institution.",
    fr: "Nous ne vérifions pas actuellement l'âge des clients. Si vous avez moins de 18 ans, veuillez faire en sorte qu'un parent ou tuteur soit informé de votre utilisation de ce service, ou vous y assiste.<br /><br />Le personnel doit fournir des informations de licence/d'enregistrement exactes. Fournir de faux justificatifs constitue une violation grave et peut entraîner une suspension ainsi qu'un signalement à l'organisme d'agrément compétent (par exemple, le Conseil National de l'Ordre des Médecins du Cameroun ou l'Ordre National des Infirmiers, Infirmières et Sages-Femmes du Cameroun). La vérification par l'administrateur est un examen de bonne foi des informations que vous fournissez, et ne constitue pas encore une confirmation indépendante en temps réel auprès de l'établissement émetteur.",
  },
  "terms.howServiceWorksTitle": { en: "How the service works", fr: "Comment fonctionne le service" },
  "terms.howServiceWorksBody": {
    en: "1) Check in and receive a code. 2) Submit payment (1,600 XAF) via manual mobile money. 3) Once admin confirms payment, a verified staff member can claim your consultation. 4) They provide the consultation, then write you a plain-language summary and separate clinical notes for our records.",
    fr: "1) Enregistrez-vous et recevez un code. 2) Envoyez le paiement (1 600 XAF) via mobile money manuel. 3) Une fois que l'administrateur confirme le paiement, un membre du personnel vérifié peut prendre en charge votre consultation. 4) Il/elle assure la consultation, puis vous rédige un résumé en langage simple ainsi que des notes cliniques distinctes pour nos dossiers.",
  },
  "terms.paymentsTitle": { en: "Payments", fr: "Paiements" },
  "terms.paymentsBody": {
    en: "1,600 XAF per consultation, manual mobile money, confirmed by admin - there may be a delay while this happens. We don't currently offer refunds for claimed/completed consultations; contact us if a payment issue occurs before claiming.",
    fr: "1 600 XAF par consultation, mobile money manuel, confirmé par un administrateur - un délai peut s'écouler pendant cette confirmation. Nous n'offrons pas actuellement de remboursement pour les consultations prises en charge/terminées ; contactez-nous si un problème de paiement survient avant la prise en charge.",
  },
  "terms.clinicalSafetyTitle": { en: "Clinical safety and independence", fr: "Sécurité clinique et indépendance" },
  "terms.clinicalSafetyBody": {
    en: "Clinical decisions are made independently, never influenced by platform commercial interests. We don't incentivize unnecessary consultations, referrals, or purchases. High-severity check-ins are flagged internally for admin follow-up - this is a safety aid, not a guarantee of rapid response, and never a substitute for seeking emergency care directly.",
    fr: "Les décisions cliniques sont prises de manière indépendante, jamais influencées par les intérêts commerciaux de la plateforme. Nous n'incitons pas à des consultations, orientations ou achats inutiles. Les enregistrements de forte gravité sont signalés en interne pour un suivi par un administrateur - il s'agit d'une aide à la sécurité, non d'une garantie de réponse rapide, et jamais d'un substitut à la recherche directe de soins d'urgence.",
  },
  "terms.liabilityTitle": { en: "Limitation of liability", fr: "Limitation de responsabilité" },
  "terms.liabilityBody": {
    en: "Ticket-In is not a party to the clinical relationship between you and the professional you consult. To the fullest extent permitted by law, we are not liable for clinical decisions, advice, or outcomes - that responsibility rests with the professional providing care. This doesn't affect any rights you have under Cameroonian law that can't be excluded by these Terms.",
    fr: "Ticket-In n'est pas partie à la relation clinique entre vous et le professionnel que vous consultez. Dans toute la mesure permise par la loi, nous ne sommes pas responsables des décisions cliniques, conseils ou résultats - cette responsabilité incombe au professionnel qui dispense les soins. Cela n'affecte aucun droit dont vous disposez en vertu du droit camerounais et qui ne peut être exclu par les présentes Conditions.",
  },
  "terms.governingLawTitle": { en: "Governing law", fr: "Droit applicable" },
  "terms.governingLawBody": { en: "These Terms are governed by the laws of the Republic of Cameroon.", fr: "Les présentes Conditions sont régies par les lois de la République du Cameroun." },
  "terms.contactTitle": { en: "Contact", fr: "Contact" },
  "terms.contactBody": { en: "Questions: mangwishihycentanda@gmail.com.", fr: "Questions : mangwishihycentanda@gmail.com." },
};

export function makeT(lang) {
  return (key, vars) => {
    let s = (translations[key] && translations[key][lang]) || (translations[key] && translations[key].en) || key;
    if (vars) for (const k in vars) s = s.replaceAll("{" + k + "}", vars[k]);
    return s;
  };
}
