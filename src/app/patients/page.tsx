"use client"

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { Suspense } from "react"
import {
  Users,
  Search,
  Plus,
  X,
  User,
  Activity,
  FileText,
  Pill,
  HeartPulse,
  TrendingUp,
  PlusCircle,
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CalendarCheck,
  AlertCircle,
  CheckCircle,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  dbGetPatients,
  dbSavePatient,
  dbGetDoctors,
  dbAddCommunicationLog,
  dbMarkFollowUpsAsContacted,
  dbGetAppointments,
  dbGetFollowUps,
  dbSaveFollowUp,
  dbCompleteFollowUp,
  dbAddAuditLog,
  dbFindDuplicatePatients,
  dbMergePatients,
  dbGetAutoReplies,
  dbCheckPatientDuplicate,
  getActiveRole,
  TRANSLATED_WELCOME,
  dbGetWhatsAppTemplate,
  MULTILINGUAL_TEMPLATES,
  isDefaultEnglishMessage,
  Patient,
  PatientVitals,
  MedicalRecord,
  Prescription,
  Doctor,
  Appointment,
  FollowUp,
  CommunicationLog,
  dbArchivePatient,
  dbRestorePatient,
  dbMovePatientToTrash,
  dbTriggerWorkflow,
  dbSaveWhatsAppTemplate,
  DuplicateMatch
} from "@/lib/db"
import { useToast } from "@/components/ui/toast"
import { useLiveQuery } from "dexie-react-hooks"
import { useWhatsApp } from "@/lib/whatsapp-context"
import { db } from "@/lib/database"

function PatientsRegistryContent() {
  const [searchParams] = useSearchParams()
  const patientIdQuery = searchParams.get("id")

  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [followups, setFollowups] = React.useState<FollowUp[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeRole, setActiveRole] = React.useState<string>("Anonymous")
  const [isEditingPatient, setIsEditingPatient] = React.useState(false)
  const [activeNotice, setActiveNotice] = React.useState("")
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
  // Duplicate detection
  const [duplicateMatches, setDuplicateMatches] = React.useState<DuplicateMatch[]>([])
  const [duplicateOverride, setDuplicateOverride] = React.useState(false)
  const toast = useToast()
  const { chats, setActiveJid, sendMessage, triggerDbSync } = useWhatsApp()

  const patients = useLiveQuery(async () => {
    let collection;
    if (searchTerm) {
      const cleanSearch = searchTerm.trim().toLowerCase();
      collection = db.patients.filter(p => 
        p.name.toLowerCase().includes(cleanSearch) ||
        p.id.toLowerCase().includes(cleanSearch) ||
        p.phone.includes(cleanSearch)
      );
    } else {
      collection = db.patients.toCollection();
    }

    const role = getActiveRole();
    const showArchived = role === 'Clinic Admin' || role === 'Super Admin';

    let list = await collection
      .filter(p => {
        if (!showArchived && p.archived) return false;

        if (role === 'Patient') {
          const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
          const patientId = session ? JSON.parse(session).username : "";
          if (p.id !== patientId) return false;
        }
        
        if (role === 'Doctor') {
          const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
          const docName = session ? JSON.parse(session).name : "";
          if (p.doctorAssignedName !== docName) return false;
        }

        return true;
      })
      .toArray();

    // Populate communications in parallel
    await Promise.all(
      list.map(async (p) => {
        try {
          const comms = await db.communications.where('patientId').equals(p.id).toArray();
          comms.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          p.communications = comms;
        } catch (err) {
          console.warn(`Failed to fetch communications for patient ${p.id}:`, err);
          p.communications = [];
        }
      })
    );

    return list;
  }, [searchTerm, activeRole]) || [];

  const clearErr = (f: string) => setFormErrors(p => { const n = { ...p }; delete n[f]; return n })

  const triggerNotice = (msg: string) => {
    setActiveNotice(msg)
    setTimeout(() => setActiveNotice(""), 3000)
  }

  React.useEffect(() => {
    setActiveRole(getActiveRole())
  }, [])
  
  // Drawer state
  const [activePatient, setActivePatient] = React.useState<Patient | null>(null)
  const [drawerTab, setDrawerTab] = React.useState("overview")

  // Modals state
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [showAddVitalsModal, setShowAddVitalsModal] = React.useState(false)
  const [showAddRecordModal, setShowAddRecordModal] = React.useState(false)
  const [showAddPrescriptionModal, setShowAddPrescriptionModal] = React.useState(false)
  
  // Duplicates & Merger states
  const [duplicates, setDuplicates] = React.useState<{ p1: Patient; p2: Patient }[]>([])
  const [mergingPair, setMergingPair] = React.useState<{ p1: Patient; p2: Patient } | null>(null)

  // Delete confirmation dialog
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = React.useState(false)
  const [isDeletingPatient, setIsDeletingPatient] = React.useState(false)

  // Registration Form states
  const [formName, setFormName] = React.useState("")
  const [formAge, setFormAge] = React.useState(30)
  const [formGender, setFormGender] = React.useState<'Male' | 'Female' | 'Other'>("Male")
  const [formDob, setFormDob] = React.useState("1996-01-01")
  const [formPhone, setFormPhone] = React.useState("")
  const [formAltPhone, setFormAltPhone] = React.useState("")
  const [formEmail, setFormEmail] = React.useState("")
  const [formAddress, setFormAddress] = React.useState("")
  const [formCity, setFormCity] = React.useState("")
  const [formState, setFormState] = React.useState("")
  const [formCountry, setFormCountry] = React.useState("")
  const [formPincode, setFormPincode] = React.useState("")
  const [formBloodGroup, setFormBloodGroup] = React.useState("O+")
  const [formConditions, setFormConditions] = React.useState("")
  const [formAllergies, setFormAllergies] = React.useState("")
  const [formDoctorId, setFormDoctorId] = React.useState("")
  const [formLang, setFormLang] = React.useState<Patient['preferredLanguage']>("English")
  const [formContactPref, setFormContactPref] = React.useState<Patient['preferredContactMethod']>("WhatsApp")
  const [formWaOptIn, setFormWaOptIn] = React.useState(true)
  const [formEnableAutoFup, setFormEnableAutoFup] = React.useState(true)
  const [formFupDelayType, setFormFupDelayType] = React.useState("15")
  const [formFupCustomDays, setFormFupCustomDays] = React.useState(14)
  const [formFupMessage, setFormFupMessage] = React.useState("")

  // Vitals Form
  const [vitalsBp, setVitalsBp] = React.useState("120/80")
  const [vitalsHr, setVitalsHr] = React.useState(72)
  const [vitalsTemp, setVitalsTemp] = React.useState(98.6)

  // Medical Record Form
  const [recordDiag, setRecordDiag] = React.useState("")
  const [recordDoc, setRecordDoc] = React.useState("")
  const [recordTreat, setRecordTreat] = React.useState("")
  const [recordNotes, setRecordNotes] = React.useState("")

  // Prescription Form
  const [presName, setPresName] = React.useState("")
  const [presDosage, setPresDosage] = React.useState("1 tablet")
  const [presFreq, setPresFreq] = React.useState("Once daily")

  // WhatsApp Chat Input
  const [chatMessage, setChatMessage] = React.useState("")

  // Welcome template states for live preview and active patient view
  const [regWelcomeTemplate, setRegWelcomeTemplate] = React.useState("")
  const [activeWelcomeTemplate, setActiveWelcomeTemplate] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const isSavingRef = React.useRef(false)

  React.useEffect(() => {
    const loadRegTemplates = async () => {
      try {
        // --- Welcome template ---
        let welcomeText = await dbGetWhatsAppTemplate("welcome", formLang)
        const hardcodedWelcomeForLang = TRANSLATED_WELCOME[formLang] || TRANSLATED_WELCOME.English || ""
        const isWelcomeDefault = !welcomeText || welcomeText === hardcodedWelcomeForLang

        // If the saved template for this language is just the default, try to use
        // the custom English template and auto-translate it
        if (isWelcomeDefault && formLang !== "English") {
          const englishText = await dbGetWhatsAppTemplate("welcome", "English")
          const hardcodedEnglish = TRANSLATED_WELCOME.English || ""
          const hasCustomEnglish = englishText && englishText !== hardcodedEnglish
          if (hasCustomEnglish) {
            const langCodeMap: Record<string, string> = {
              Telugu: "te", Hindi: "hi", Tamil: "ta",
              Kannada: "kn", Malayalam: "ml", Marathi: "mr",
              Bengali: "bn", Gujarati: "gu", Punjabi: "pa"
            }
            const targetCode = langCodeMap[formLang]
            if (targetCode) {
              try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(englishText)}`
                const res = await fetch(url)
                const data = await res.json()
                if (data && data[0]) {
                  const translated = data[0].map((x: any) => x[0]).join("")
                  await dbSaveWhatsAppTemplate("welcome", formLang, translated)
                  welcomeText = translated
                }
              } catch {
                // Fall through to default
              }
            }
          }
        }

        setRegWelcomeTemplate(welcomeText || hardcodedWelcomeForLang || "Hello {Patient Name}, welcome!")

        // --- Follow-up reminder template ---
        const fupText = await dbGetWhatsAppTemplate("follow_up_reminder", formLang)
        const fupTemplate = fupText || MULTILINGUAL_TEMPLATES.follow_up_reminder?.[formLang] || MULTILINGUAL_TEMPLATES.follow_up_reminder?.English || "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}."
        setFormFupMessage(prev => {
          if (!prev || isDefaultEnglishMessage(prev)) {
            return fupTemplate
          }
          return prev
        })
      } catch (err) {
        console.warn("Failed to load registration templates:", err)
        setRegWelcomeTemplate(TRANSLATED_WELCOME[formLang] || TRANSLATED_WELCOME.English || "Hello {Patient Name}, welcome!")
        const fupTemplate = MULTILINGUAL_TEMPLATES.follow_up_reminder?.[formLang] || MULTILINGUAL_TEMPLATES.follow_up_reminder?.English || "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}."
        setFormFupMessage(prev => {
          if (!prev || isDefaultEnglishMessage(prev)) {
            return fupTemplate
          }
          return prev
        })
      }
    }
    loadRegTemplates()
  }, [formLang])

  React.useEffect(() => {
    if (!activePatient) return
    const loadActiveWelcome = async () => {
      try {
        const text = await dbGetWhatsAppTemplate("welcome", activePatient.preferredLanguage)
        setActiveWelcomeTemplate(text || TRANSLATED_WELCOME[activePatient.preferredLanguage] || TRANSLATED_WELCOME.English || "Hello {Patient Name}, welcome!")
      } catch (err) {
        console.warn("Failed to load active welcome template:", err)
        setActiveWelcomeTemplate(TRANSLATED_WELCOME[activePatient.preferredLanguage] || TRANSLATED_WELCOME.English || "Hello {Patient Name}, welcome!")
      }
    }
    loadActiveWelcome()
  }, [activePatient?.preferredLanguage])

  const loadAllData = async () => {
    try {
      const docs = await dbGetDoctors()
      setDoctors(docs)
      setAppointments(await dbGetAppointments())
      setFollowups(await dbGetFollowUps())
      setDuplicates(await dbFindDuplicatePatients())

      if (docs.length > 0 && !formDoctorId) {
        setFormDoctorId(docs[0].id)
        setRecordDoc(docs[0].name)
      }

      // Sync active patient drawer — fetch fresh list directly from DB
      // so we never use the stale closure-captured patients array
      const freshPatients = await dbGetPatients()
      if (activePatient) {
        const match = freshPatients.find(p => p.id === activePatient.id)
        if (match) {
          // Patient still exists — refresh drawer data
          setActivePatient(match)
        } else {
          // Patient was deleted — close drawer immediately
          setActivePatient(null)
        }
      } else if (patientIdQuery) {
        // Auto open drawer from search parameter query
        const match = freshPatients.find(p => p.id === patientIdQuery)
        if (match) {
          setActivePatient(match)
          setDrawerTab("overview")
        }
      }
    } catch (err) {
      console.error("Failed to load clinical registries:", err)
    }
  }

  React.useEffect(() => {
    loadAllData()
  }, [patientIdQuery])

  React.useEffect(() => {
    const regPhone = searchParams?.get("registerPhone")
    if (regPhone) {
      setFormPhone(decodeURIComponent(regPhone))
      setShowAddModal(true)
      const newUrl = window.location.pathname + (patientIdQuery ? `?id=${patientIdQuery}` : "")
      window.history.replaceState({}, "", newUrl)
    }
  }, [searchParams])

  React.useEffect(() => {
    if (activePatient) {
      dbAddAuditLog({
        patientId: activePatient.id,
        patientName: activePatient.name,
        action: "Viewed Folder"
      }).catch(err => console.error(err))
    }
  }, [activePatient?.id])

  // ── Live duplicate check (debounced 400ms) ──────────────────────
  React.useEffect(() => {
    if (!showAddModal) { setDuplicateMatches([]); setDuplicateOverride(false); return }
    const timer = setTimeout(async () => {
      if (!formPhone && !formName && !formEmail) { setDuplicateMatches([]); return }
      try {
        const matches = await dbCheckPatientDuplicate(
          { name: formName, phone: formPhone, email: formEmail, dob: formDob },
          isEditingPatient && activePatient ? activePatient.id : undefined
        )
        setDuplicateMatches(matches)
        if (matches.length > 0) setDuplicateOverride(false)
      } catch (err) {
        console.error(err)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [formPhone, formName, formEmail, formDob, showAddModal, isEditingPatient, activePatient?.id])

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSavingRef.current) return;

    // ── Validation ───────────────────────────────────────────────
    const errors: Record<string, string> = {}
    if (!formName.trim()) errors.name = "Full name is required."
    if (!formPhone.trim()) {
      errors.phone = "Phone number is required."
    } else if (!/^\d{10}$/.test(formPhone.replace(/[\s\-()]/g, ""))) {
      errors.phone = "Enter a valid 10-digit phone number."
    }
    if (formEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
      errors.email = "Enter a valid email address."
    }
    if (!formDob) errors.dob = "Date of birth is required."
    if (!formBloodGroup) errors.bloodGroup = "Blood group is required."
    if (!formDoctorId) errors.doctorId = "Please assign a doctor."

    // ── Duplicate Guard ──────────────────────────────────────────
    const exactMatches = duplicateMatches.filter(m => m.severity === 'exact')
    const softMatches  = duplicateMatches.filter(m => m.severity !== 'exact')

    if (exactMatches.length > 0 && !isEditingPatient) {
      // Hard block — cannot register same phone number twice
      errors.phone = `A patient with this phone number already exists: ${exactMatches[0].patient.name} (${exactMatches[0].patient.id}). Please search and update the existing record.`
    } else if (softMatches.length > 0 && !duplicateOverride && !isEditingPatient) {
      // Soft block — require explicit override acknowledgement
      toast.warning("Similar patient records found. Please review the duplicates below and confirm to proceed.")
      setFormErrors(errors)
      return
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error("Please fix the highlighted fields before saving.")
      return
    }
    setFormErrors({})

    // Resolve doctor assignments
    const docSelected = doctors.find(d => d.id === formDoctorId)
    const docName = docSelected ? docSelected.name : "Unassigned"

    const fupDays = formFupDelayType === "custom" ? Number(formFupCustomDays) : Number(formFupDelayType)

    isSavingRef.current = true
    setIsSaving(true)
    dbSavePatient({
      id: isEditingPatient && activePatient ? activePatient.id : undefined,
      name: formName,
      age: Number(formAge),
      gender: formGender,
      dob: formDob,
      phone: formPhone,
      alternatePhone: formAltPhone,
      email: formEmail,
      addressInfo: {
        address: formAddress,
        city: formCity,
        state: formState,
        country: formCountry,
        pincode: formPincode
      },
      bloodGroup: formBloodGroup,
      existingConditions: formConditions,
      allergies: formAllergies,
      doctorAssignedId: formDoctorId,
      doctorAssignedName: docName,
      preferredLanguage: formLang,
      preferredContactMethod: formContactPref,
      whatsappOptIn: formWaOptIn,
      lastVisit: isEditingPatient && activePatient ? activePatient.lastVisit : new Date().toISOString().split("T")[0],
      vitals: isEditingPatient && activePatient ? activePatient.vitals : [],
      medicalHistory: isEditingPatient && activePatient ? activePatient.medicalHistory : [],
      prescriptions: isEditingPatient && activePatient ? activePatient.prescriptions : [],
      communications: isEditingPatient && activePatient ? activePatient.communications : [],
      enableAutomatedFollowUp: formEnableAutoFup,
      customFollowUpDays: fupDays,
      customFollowUpMessage: formFupMessage
    }).then(async (newPat) => {
      // Reset fields
      setFormName("")
      setFormPhone("")
      setFormAltPhone("")
      setFormEmail("")
      setFormAddress("")
      setFormCity("")
      setFormState("")
      setFormPincode("")
      setFormConditions("")
      setFormAllergies("")
      setFormEnableAutoFup(true)
      setFormFupDelayType("15")
      setFormFupCustomDays(14)
      setFormFupMessage("")
      setFormErrors({})
      setShowAddModal(false)
      setIsEditingPatient(false)
      loadAllData()
      setActivePatient(newPat)
      setDrawerTab("overview")
      toast.success(isEditingPatient ? "Patient profile updated successfully!" : "Patient file registered successfully!")
      triggerNotice(isEditingPatient ? "Patient profile updated successfully!" : "Patient file registered successfully!")

      // ── Fire "Patient Registered" workflow trigger for new patients ──────────
      // This sends the welcome WhatsApp message in the patient's preferred language
      if (!isEditingPatient && newPat) {
        try {
          const patLang = newPat.preferredLanguage || "English"

          // If the patient's language is not English, auto-translate and save the
          // welcome template for that language so they receive a personalised message
          if (patLang !== "English") {
            const englishTemplate = await dbGetWhatsAppTemplate("welcome", "English")
            const existingTranslation = await dbGetWhatsAppTemplate("welcome", patLang)

            // Only translate if no custom translation exists for this language yet
            if (!existingTranslation && englishTemplate) {
              const langCodeMap: Record<string, string> = {
                Telugu: "te", Hindi: "hi", Tamil: "ta",
                Kannada: "kn", Malayalam: "ml", Marathi: "mr",
                Bengali: "bn", Gujarati: "gu", Punjabi: "pa"
              }
              const targetCode = langCodeMap[patLang]
              if (targetCode) {
                try {
                  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(englishTemplate)}`
                  const res = await fetch(url)
                  const data = await res.json()
                  if (data && data[0]) {
                    const translated = data[0].map((x: any) => x[0]).join("")
                    await dbSaveWhatsAppTemplate("welcome", patLang, translated)
                  }
                } catch {
                  // Translation unavailable — will fall back to English template
                }
              }
            }
          }

          // Trigger the automation workflow (sends WhatsApp via scheduled message)
          await dbTriggerWorkflow("Patient Registered", { patient: newPat })
        } catch (err) {
          console.warn("Workflow trigger failed:", err)
        }
      }
    }).catch((err) => {
      toast.error("Failed to save patient record: " + err.message)
    }).finally(() => {
      isSavingRef.current = false
      setIsSaving(false)
    })
  }

  const handleAddVitals = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient) return

    const newVital: PatientVitals = {
      date: new Date().toISOString().split("T")[0],
      bp: vitalsBp,
      heartRate: Number(vitalsHr),
      temp: Number(vitalsTemp)
    }

    dbSavePatient({
      ...activePatient,
      vitals: [newVital, ...activePatient.vitals]
    }).then(async () => {
      await dbAddAuditLog({
        patientId: activePatient.id,
        patientName: activePatient.name,
        action: "Updated Vitals"
      })
      setShowAddVitalsModal(false)
      loadAllData()
    }).catch(err => toast.error(err.message))
  }

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient) return

    const newRecord: MedicalRecord = {
      date: new Date().toISOString().split("T")[0],
      diagnosis: recordDiag,
      doctor: recordDoc,
      treatment: recordTreat,
      notes: recordNotes
    }

    dbSavePatient({
      ...activePatient,
      medicalHistory: [newRecord, ...activePatient.medicalHistory]
    }).then(async () => {
      await dbAddAuditLog({
        patientId: activePatient.id,
        patientName: activePatient.name,
        action: `Logged Medical Consult Record: ${recordDiag}`
      })
      setRecordDiag("")
      setRecordTreat("")
      setRecordNotes("")
      setShowAddRecordModal(false)
      loadAllData()
    }).catch(err => toast.error(err.message))
  }

  const handleAddPrescription = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient) return

    const newPres: Prescription = {
      name: presName,
      dosage: presDosage,
      frequency: presFreq,
      status: 'Active'
    }

    dbSavePatient({
      ...activePatient,
      prescriptions: [newPres, ...activePatient.prescriptions]
    }).then(async () => {
      await dbAddAuditLog({
        patientId: activePatient.id,
        patientName: activePatient.name,
        action: `Added Prescription: ${presName}`
      })
      setPresName("")
      setPresDosage("1 tablet")
      setPresFreq("Once daily")
      setShowAddPrescriptionModal(false)
      loadAllData()
    }).catch(err => toast.error(err.message))
  }

  // Set the active JID so that the context polls and syncs messages for this patient
  React.useEffect(() => {
    if (!activePatient || drawerTab !== "whatsapp") {
      setActiveJid(null)
      return
    }

    // Suffix matching helper
    const matchPhoneToJid = (phone: string, jid: string): boolean => {
      const p = phone.replace(/[^0-9]/g, "")
      const j = jid.split("@")[0].replace(/[^0-9]/g, "")
      if (!p || p.length < 7 || !j || j.length < 7) return false
      const minLength = Math.min(p.length, j.length)
      return p.slice(-minLength) === j.slice(-minLength)
    }

    // Try to find the matching JID from the chats list
    const matched = chats.find(c => matchPhoneToJid(activePatient.phone, c.id))
    if (matched) {
      setActiveJid(matched.id)
    } else {
      // Fallback: construct JID from phone
      const cleanPhone = activePatient.phone.replace(/[^0-9]/g, "")
      const phoneJid = cleanPhone.length === 10 ? `1${cleanPhone}@s.whatsapp.net` : `${cleanPhone}@s.whatsapp.net`
      setActiveJid(phoneJid)
    }
  }, [activePatient?.id, drawerTab, chats, setActiveJid])

  // Watch for patient communications length to reload data when context writes new messages
  const currentCommCount = activePatient?.communications?.length || 0
  React.useEffect(() => {
    if (activePatient) {
      loadAllData()
    }
  }, [currentCommCount])

  // Live WhatsApp Messaging Client
  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePatient || !chatMessage.trim()) return

    const textToSend = chatMessage
    setChatMessage("")

    try {
      const success = await sendMessage(activePatient.phone, textToSend)
      if (success) {
        await dbAddCommunicationLog(activePatient.id, {
          type: "whatsapp", direction: "sent", content: textToSend, status: "sent"
        })
        await dbMarkFollowUpsAsContacted(activePatient.id)
        triggerDbSync()
        loadAllData()
      } else {
        console.warn("Failed to send WhatsApp message via API server")
      }
    } catch (err) {
      console.warn("Failed to send message via real WhatsApp API:", err)
    }
  }

  // AI Assistant clinical insights
  const getAiSummary = (pat: Patient) => {
    if (pat.medicalHistory.length === 0) {
      return "Patient registered with no historical clinical diagnoses. Recommend base screening consultation."
    }
    const diagnoses = pat.medicalHistory.map(m => m.diagnosis).join(", ")
    return `Patient is currently diagnosed with [${diagnoses}]. Active medications include: ${pat.prescriptions.map(p => p.name).join(", ") || "None"}. Vitals are stable with blood pressure trending normal.`
  }

  const getAiNoShowRisk = (pat: Patient) => {
    if (pat.preferredLanguage !== "English") return "Moderate Risk (28%) - Language barrier possibility"
    return "Low Risk (8%) - Excellent compliance logs"
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {activeNotice && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold text-primary animate-pulse">
          <CheckCircle className="h-4.5 w-4.5" /> {activeNotice}
        </div>
      )}

      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-xs">
        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patient registry by Name, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {activeRole !== "Doctor" && (
          <Button onClick={() => {
            setIsEditingPatient(false)
            setShowAddModal(true)
          }} size="sm" className="flex items-center gap-1.5 text-xs h-9 cursor-pointer">
            <Plus className="h-4.5 w-4.5" /> Register Patient File
          </Button>
        )}
      </div>

      {/* Duplicate Registry Alerts */}
      {duplicates.length > 0 && (activeRole === 'Clinic Admin' || activeRole === 'Super Admin') && (
        <Card className="border-amber-500/30 bg-amber-500/5 text-xxs p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <div className="font-bold text-foreground">Duplicate Patient Records Detected ({duplicates.length})</div>
              <p className="text-muted-foreground font-medium mt-0.5">We found active patient files sharing identical contact details (phone or email).</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px] font-bold border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
              onClick={() => setMergingPair(duplicates[0])}
            >
              Resolve Duplicate
            </Button>
          </div>
        </Card>
      )}

      {/* Patients Card Listing */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.map(p => (
          <Card
            key={p.id}
            onClick={() => {
              setActivePatient(p)
              setDrawerTab("overview")
            }}
            className="hover:border-primary/45 transition-all duration-300 cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <CardHeader className="pb-3 flex flex-row justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold text-sm">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground leading-tight">{p.name}</CardTitle>
                    <span className="text-[10px] text-muted-foreground block">ID: {p.id}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px]">{p.gender}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-xxs">
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground font-medium">Age & Blood</span>
                  <span className="font-semibold text-foreground/80">{p.age} yrs, Blood: {p.bloodGroup}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1">
                  <span className="text-muted-foreground font-medium">Preferred Contact</span>
                  <span className="font-semibold text-foreground/80">{p.preferredContactMethod} ({p.preferredLanguage})</span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-muted-foreground font-medium">Last Clinical Visit</span>
                  <span className="font-semibold text-primary">{p.lastVisit}</span>
                </div>
              </CardContent>
            </div>
            <div className="px-6 py-2.5 bg-muted/20 border-t border-border/40 text-[9px] font-bold text-muted-foreground uppercase tracking-wide flex justify-between">
              <span>Opt-in: {p.whatsappOptIn ? "WhatsApp ACTIVE" : "WhatsApp OFF"}</span>
              <span className="text-primary hover:underline">View Folder →</span>
            </div>
          </Card>
        ))}
      </div>

      {/* EXPANDED DETAILS DRAWER */}
      {activePatient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xxs" onClick={() => setActivePatient(null)} />
          
          {/* Drawer container */}
          <div className="relative z-50 w-full max-w-4xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header info */}
            <div className="p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-md shadow-sm">
                  {activePatient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{activePatient.name}</h3>
                  <span className="text-xxs text-muted-foreground font-semibold">Patient Registry Profile: {activePatient.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xxs">{activePatient.gender}, {activePatient.age} yrs</Badge>
                
                {/* Archive/Restore Button */}
                {(activeRole === 'Clinic Admin' || activeRole === 'Super Admin') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] cursor-pointer"
                    onClick={async () => {
                      if (activePatient.archived) {
                        await dbRestorePatient(activePatient.id)
                        triggerNotice(`Patient "${activePatient.name}" restored.`)
                      } else {
                        await dbArchivePatient(activePatient.id)
                        triggerNotice(`Patient "${activePatient.name}" archived.`)
                      }
                      loadAllData()
                    }}
                  >
                    {activePatient.archived ? "Restore File" : "Archive File"}
                  </Button>
                )}
                
                {/* Delete Record Button — Admin/Super Admin only */}
                {(activeRole === 'Clinic Admin' || activeRole === 'Super Admin') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                    onClick={() => setShowDeleteConfirmModal(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete Record
                  </Button>
                )}
                
                {/* Edit Profile Button */}
                {activeRole !== 'Patient' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] cursor-pointer"
                    onClick={() => {
                      // Pre-fill fields
                      setFormName(activePatient.name)
                      setFormAge(activePatient.age)
                      setFormGender(activePatient.gender)
                      setFormDob(activePatient.dob || "1996-01-01")
                      setFormPhone(activePatient.phone)
                      setFormAltPhone(activePatient.alternatePhone || "")
                      setFormEmail(activePatient.email)
                      setFormAddress(activePatient.addressInfo.address || "")
                      setFormCity(activePatient.addressInfo.city || "")
                      setFormState(activePatient.addressInfo.state || "")
                      setFormCountry(activePatient.addressInfo.country || "")
                      setFormPincode(activePatient.addressInfo.pincode || "")
                      setFormBloodGroup(activePatient.bloodGroup || "O+")
                      setFormConditions(activePatient.existingConditions || "")
                      setFormAllergies(activePatient.allergies || "")
                      setFormDoctorId(activePatient.doctorAssignedId || "")
                      setFormLang(activePatient.preferredLanguage || "English")
                      setFormContactPref(activePatient.preferredContactMethod || "WhatsApp")
                      setFormWaOptIn(activePatient.whatsappOptIn)
                      setFormEnableAutoFup(activePatient.enableAutomatedFollowUp || false)
                      setFormFupCustomDays(activePatient.customFollowUpDays || 14)
                      setFormFupDelayType(activePatient.customFollowUpDays ? "custom" : "15")
                      setFormFupMessage(activePatient.customFollowUpMessage || "")
                      
                      setIsEditingPatient(true)
                      setShowAddModal(true)
                    }}
                  >
                    Edit Profile
                  </Button>
                )}

                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setActivePatient(null)}>
                  <X className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>

            {/* Split layout inside Drawer: Tabs Left, AI insights Right */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left tabbed layout */}
              <div className="flex-1 overflow-y-auto p-6 border-r border-border/40">
                <Tabs value={drawerTab} onValueChange={setDrawerTab}>
                  <TabsList className="grid grid-cols-5 w-full bg-muted/60 text-xxs mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="medical">Visits</TabsTrigger>
                    <TabsTrigger value="prescriptions">Drugs</TabsTrigger>
                    <TabsTrigger value="billing">Invoices</TabsTrigger>
                    <TabsTrigger value="whatsapp">Chat Logs</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Profile Overview */}
                  <TabsContent value="overview" className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                        <User className="h-4.5 w-4.5 text-primary" /> Profile Registry Data
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xxs">
                        <div className="p-3 bg-muted/30 rounded-xl border border-border/20">
                          <span className="text-muted-foreground font-semibold block mb-0.5">Contact parameters</span>
                          <div className="font-bold text-foreground">Phone: {activePatient.phone}</div>
                          <div className="text-muted-foreground">Alternate: {activePatient.alternatePhone || 'None'}</div>
                          <div className="text-muted-foreground">Email: {activePatient.email}</div>
                        </div>

                        <div className="p-3 bg-muted/30 rounded-xl border border-border/20">
                          <span className="text-muted-foreground font-semibold block mb-0.5">Address</span>
                          <div className="font-bold text-foreground flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span>
                              {activePatient.addressInfo.address || 'No address logged'}
                              {activePatient.addressInfo.city && `, ${activePatient.addressInfo.city}`}
                              {activePatient.addressInfo.state && `, ${activePatient.addressInfo.state}`}
                              {activePatient.addressInfo.pincode && ` - ${activePatient.addressInfo.pincode}`}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-muted/30 rounded-xl border border-border/20">
                          <span className="text-muted-foreground font-semibold block mb-0.5">Health parameters</span>
                          <div className="font-bold text-foreground">Blood Type: {activePatient.bloodGroup}</div>
                          <div className="text-muted-foreground">Attending staff: {activePatient.doctorAssignedName || 'Unassigned'}</div>
                        </div>

                        <div className="p-3 bg-muted/30 rounded-xl border border-border/20">
                          <span className="text-muted-foreground font-semibold block mb-0.5">Alerts & Allergies</span>
                          <div className="font-bold text-rose-500">Allergies: {activePatient.allergies || 'None'}</div>
                          <div className="text-muted-foreground">Chronic Conditions: {activePatient.existingConditions || 'None'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Vitals summary */}
                    {/* Vitals summary */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Recent Vital Readings</h4>
                        <Button size="sm" variant="outline" onClick={() => setShowAddVitalsModal(true)} className="text-[10px] h-7 cursor-pointer">
                          Log Vitals
                        </Button>
                      </div>
                      {activePatient.vitals.length > 0 ? (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3.5 bg-blue-100/10 dark:bg-blue-900/10 border border-blue-100/30 dark:border-blue-900/30 rounded-xl text-center">
                              <span className="text-[10px] font-bold text-blue-600 block uppercase">Blood Pressure</span>
                              <div className="text-lg font-extrabold text-blue-900 dark:text-blue-200 mt-1">{activePatient.vitals[0].bp}</div>
                              <span className="text-[9px] text-muted-foreground block mt-0.5">mmHg ({activePatient.vitals[0].date})</span>
                            </div>
                            <div className="p-3.5 bg-emerald-100/10 dark:bg-emerald-900/10 border border-emerald-100/30 dark:border-emerald-900/30 rounded-xl text-center">
                              <span className="text-[10px] font-bold text-emerald-600 block uppercase">Pulse Rate</span>
                              <div className="text-lg font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">{activePatient.vitals[0].heartRate} bpm</div>
                              <span className="text-[9px] text-muted-foreground block mt-0.5">Resting ({activePatient.vitals[0].date})</span>
                            </div>
                            <div className="p-3.5 bg-amber-100/10 dark:bg-amber-900/10 border border-amber-100/30 dark:border-amber-900/30 rounded-xl text-center">
                              <span className="text-[10px] font-bold text-amber-600 block uppercase">Core Temperature</span>
                              <div className="text-lg font-extrabold text-amber-900 dark:text-amber-200 mt-1">{activePatient.vitals[0].temp} °F</div>
                              <span className="text-[9px] text-muted-foreground block mt-0.5">Reading ({activePatient.vitals[0].date})</span>
                            </div>
                          </div>

                          {activePatient.vitals.length > 1 && (
                            <div className="grid gap-4 md:grid-cols-2 mt-4">
                              <Card className="border border-border/40 p-4 shadow-none bg-muted/5">
                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
                                  <span>Blood Pressure History (mmHg)</span>
                                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                </h5>
                                <div className="h-44">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                      data={activePatient.vitals.slice().reverse().map(v => {
                                        let systolic = 120
                                        let diastolic = 80
                                        if (v.bp && v.bp.includes("/")) {
                                          const parts = v.bp.split("/")
                                          systolic = parseInt(parts[0]) || 120
                                          diastolic = parseInt(parts[1]) || 80
                                        }
                                        return {
                                          date: new Date(v.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                                          systolic,
                                          diastolic
                                        }
                                      })}
                                      margin={{ left: -25, right: 10, top: 10, bottom: 0 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                                      <XAxis dataKey="date" fontSize={9} tickLine={false} />
                                      <YAxis domain={[50, 190]} fontSize={9} tickLine={false} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: "var(--card)",
                                          borderColor: "var(--border)",
                                          borderRadius: "8px",
                                          fontSize: "10px",
                                          color: "var(--foreground)"
                                        }}
                                      />
                                      <Line type="monotone" dataKey="systolic" stroke="#3b82f6" name="Systolic" strokeWidth={2.5} dot={{ r: 3 }} />
                                      <Line type="monotone" dataKey="diastolic" stroke="#60a5fa" name="Diastolic" strokeWidth={2.5} dot={{ r: 3 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </Card>

                              <Card className="border border-border/40 p-4 shadow-none bg-muted/5">
                                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
                                  <span>Heart Rate & Temperature</span>
                                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                </h5>
                                <div className="h-44">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                      data={activePatient.vitals.slice().reverse().map(v => ({
                                        date: new Date(v.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                                        heartRate: v.heartRate,
                                        temp: v.temp
                                      }))}
                                      margin={{ left: -25, right: 10, top: 10, bottom: 0 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                                      <XAxis dataKey="date" fontSize={9} tickLine={false} />
                                      <YAxis yAxisId="left" domain={[40, 140]} fontSize={9} tickLine={false} />
                                      <YAxis yAxisId="right" orientation="right" domain={[95, 105]} fontSize={9} tickLine={false} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: "var(--card)",
                                          borderColor: "var(--border)",
                                          borderRadius: "8px",
                                          fontSize: "10px",
                                          color: "var(--foreground)"
                                        }}
                                      />
                                      <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#10b981" name="Pulse (bpm)" strokeWidth={2.5} dot={{ r: 3 }} />
                                      <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f59e0b" name="Temp (°F)" strokeWidth={2.5} dot={{ r: 3 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </Card>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 text-center text-xxs text-muted-foreground border border-dashed border-border rounded-xl">No recorded vitals.</div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab 2: Medical records / Visits */}
                  <TabsContent value="medical" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Diagnosis Visits Timeline</h4>
                      {activeRole !== 'Receptionist' && (
                        <Button size="sm" variant="outline" onClick={() => setShowAddRecordModal(true)} className="text-[10px] h-7 cursor-pointer">
                          Add Diagnosis Entry
                        </Button>
                      )}
                    </div>

                    <div className="relative border-l-2 border-border/60 ml-2 pl-4 space-y-5">
                      {activePatient.medicalHistory.length > 0 ? (
                        activePatient.medicalHistory.map((rec, index) => (
                          <div key={index} className="relative text-xxs">
                            <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-secondary ring-4 ring-card" />
                            <div className="flex justify-between text-primary font-bold">
                              <span>{rec.date}</span>
                              <span className="text-muted-foreground font-semibold">{rec.doctor}</span>
                            </div>
                            <h5 className="text-xs font-extrabold text-foreground mt-0.5">{rec.diagnosis}</h5>
                            <p className="text-muted-foreground mt-0.5 leading-relaxed">{rec.notes}</p>
                            {rec.treatment && (
                              <div className="bg-muted/30 p-2 border border-border/20 rounded-lg mt-1 text-foreground/80 leading-relaxed font-medium">
                                <strong className="text-muted-foreground">Plan:</strong> {rec.treatment}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xxs text-muted-foreground border border-dashed border-border rounded-xl -ml-4">No diagnosis logs.</div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab 3: Prescriptions */}
                  <TabsContent value="prescriptions" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Medication Roster</h4>
                      {activeRole !== 'Receptionist' && (
                        <Button size="sm" variant="outline" onClick={() => setShowAddPrescriptionModal(true)} className="text-[10px] h-7 cursor-pointer">
                          Add Prescription
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {activePatient.prescriptions.length > 0 ? (
                        activePatient.prescriptions.map((pres, index) => (
                          <div key={index} className="flex justify-between items-center p-3 border border-border/50 rounded-xl hover:bg-muted/10 transition-colors text-xxs">
                            <div>
                              <div className="font-extrabold text-foreground">{pres.name}</div>
                              <span className="text-muted-foreground">Dosage: {pres.dosage} | Frequency: {pres.frequency}</span>
                            </div>
                            <Badge variant="completed">{pres.status}</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xxs text-muted-foreground border border-dashed border-border rounded-xl">No active medications prescribed.</div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab 4: Invoices / Billing */}
                  <TabsContent value="billing" className="space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Invoices Receipt Log</h4>
                    <div className="space-y-2">
                      {appointments
                        .filter(a => a.patientId === activePatient.id)
                        .map((apt, index) => (
                          <div key={index} className="flex justify-between items-center p-3 border border-border/50 rounded-xl text-xxs">
                            <div>
                              <div className="font-bold text-foreground">Consultation - {apt.department}</div>
                              <span className="text-muted-foreground">Date: {apt.date} | Staff: {apt.doctorName}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-extrabold text-foreground/80">${apt.cost}</div>
                              <Badge variant={apt.status === "Cancelled" ? "cancelled" : "completed"} className="mt-1">
                                {apt.status === "Cancelled" ? "Cancelled" : "Billed"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  {/* Tab 5: WhatsApp Chat timeline */}
                  <TabsContent value="whatsapp" className="flex flex-col h-[400px]">
                    <div className="flex-1 overflow-y-auto p-3 bg-muted/20 border border-border/40 rounded-xl space-y-3 max-h-[300px]">
                      {activePatient.communications.length > 0 ? (
                        activePatient.communications.map(log => (
                          <div
                            key={log.id}
                            className={`flex flex-col w-fit max-w-[80%] p-2.5 rounded-lg text-xxs ${
                              log.direction === 'sent'
                                ? 'bg-primary text-primary-foreground ml-auto rounded-tr-none'
                                : 'bg-card text-foreground border border-border mr-auto rounded-tl-none'
                            }`}
                          >
                            {log.mediaUrl ? (
                              log.mediaType === "image" ? (
                                <div className="mb-1 rounded-md overflow-hidden max-w-[200px] border border-black/5">
                                  <img
                                    src={log.mediaUrl}
                                    alt="WhatsApp Image"
                                    className="w-full h-auto object-cover max-h-[160px] cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(log.mediaUrl, '_blank')}
                                  />
                                </div>
                              ) : log.mediaType === "video" ? (
                                <div className="mb-1 rounded-md overflow-hidden max-w-[200px] border border-black/5 bg-black/10">
                                  <video
                                    src={log.mediaUrl}
                                    controls
                                    className="w-full h-auto max-h-[160px]"
                                  />
                                </div>
                              ) : null
                            ) : null}
                            <p className="leading-relaxed whitespace-pre-wrap">{log.content}</p>
                            <span className={`text-[8px] mt-1 text-right block ${log.direction === 'sent' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {log.timestamp} • {log.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-[10px] text-muted-foreground p-8 font-medium">No messaging logs found. Opt-in status is active.</div>
                      )}
                      
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendWhatsApp} className="flex flex-col gap-2 mt-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Send WhatsApp message in ${activePatient.preferredLanguage}...`}
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          className="h-9 text-xs flex-1"
                          required
                        />
                        <Button type="submit" size="icon" className="h-9 w-9 cursor-pointer shrink-0" title="Send Message">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold px-1">
                        <span>Status: Connected to WhatsApp API</span>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right panel: AI assist */}
              <div className="w-80 bg-muted/10 p-6 space-y-6 shrink-0 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* AI assist panel header */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" /> Aegis AI Assistant
                    </h4>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Automated clinical analysis parameters.</span>
                  </div>

                  {/* AI Cards depending on Role */}
                  {activeRole === 'Receptionist' && (
                    <>
                      {/* AI Translation helper */}
                      <Card className="border-primary/20 bg-primary/5 shadow-2xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center gap-1.5">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wide">AI Auto-Translation</span>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1 text-[10px] text-foreground/80 leading-relaxed font-semibold">
                          Detected preferred language is <strong>{activePatient.preferredLanguage}</strong>. Welcome message will translate to:
                          <div className="mt-2 p-2 bg-muted/40 rounded-lg italic">
                            "{activeWelcomeTemplate.replace(/{Patient Name}/g, activePatient.name)}"
                          </div>
                        </CardContent>
                      </Card>

                      {/* AI Messaging templates */}
                      <Card className="border-secondary/20 bg-secondary/5 shadow-2xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center gap-1.5">
                          <CalendarCheck className="h-4 w-4 text-secondary" />
                          <span className="text-[10px] font-bold text-secondary-foreground uppercase tracking-wide">AI Outbound Reminder Template</span>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1 text-[10px] text-foreground/85 leading-relaxed font-semibold">
                          Follow-up message drafted:
                          <div className="mt-2 p-2 bg-muted/40 rounded-lg">
                            "Hello {activePatient.name}, this is a reminder for your scheduled follow-up checkup. Please confirm if you can make it."
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {activeRole === 'Doctor' && (
                    <>
                      {/* AI Summary */}
                      <Card className="border-primary/20 bg-primary/5 shadow-2xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center gap-1.5">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wide">AI Patient Visit Summary</span>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1 text-[10px] text-foreground/80 leading-relaxed font-semibold">
                          {getAiSummary(activePatient)}
                        </CardContent>
                      </Card>

                      {/* AI Clinical Notes suggestions */}
                      <Card className="border-secondary/20 bg-secondary/5 shadow-2xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center gap-1.5">
                          <CalendarCheck className="h-4 w-4 text-secondary" />
                          <span className="text-[10px] font-bold text-secondary-foreground uppercase tracking-wide">AI Clinical Recommendations</span>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1 text-[10px] text-foreground/85 leading-relaxed font-semibold">
                          Active conditions: {activePatient.existingConditions || "None recorded"}. 
                          {activePatient.existingConditions.toLowerCase().includes("hypertension") ? (
                            " Recommend listing regular blood pressure tracking metrics and scheduling a cardiology monitoring consult in 14-30 days."
                          ) : (
                            " Recommend routine checkup assessment on the assessment visit."
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {(activeRole === 'Clinic Admin' || activeRole === 'Super Admin') && (
                    <>
                      {/* AI No show risk */}
                      <Card className="border-amber-500/20 bg-amber-500/5 shadow-2xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center gap-1.5">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">AI No-Show Risk Predictor</span>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1 text-xs font-extrabold text-foreground/80">
                          {getAiNoShowRisk(activePatient)}
                        </CardContent>
                      </Card>

                      {/* AI Recommended Schedule */}
                      <Card className="border-secondary/20 bg-secondary/5 shadow-2xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center gap-1.5">
                          <CalendarCheck className="h-4 w-4 text-secondary" />
                          <span className="text-[10px] font-bold text-secondary-foreground uppercase tracking-wide">AI Recommended Schedule</span>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1 text-[10px] text-foreground/85 leading-relaxed font-semibold">
                          Recommend scheduling a cardiology follow-up visit in 14 days to monitor BP medication intake compliance.
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>

                {/* Preferred configs summary */}
                <div className="border-t border-border/40 pt-4 text-[10px] text-muted-foreground leading-relaxed">
                  Communication opt-in preference is locked to <strong>{activePatient.preferredContactMethod} ({activePatient.preferredLanguage})</strong>. Automatic WhatsApp reminders trigger 24h before visits.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER PATIENT DIALOG */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open)
        if (!open) setIsEditingPatient(false)
      }}>
        <DialogHeader>
          <DialogTitle>{isEditingPatient ? "Edit Patient Profile" : "Register Patient Folder"}</DialogTitle>
          <DialogClose onClick={() => {
            setShowAddModal(false)
            setIsEditingPatient(false)
          }} />
        </DialogHeader>
        <form onSubmit={handleRegisterPatient} className="text-xxs">
          <DialogContent>
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Full Patient Name <span className="text-destructive">*</span></Label>
              <Input id="reg-name" placeholder="e.g. Robert Smith" value={formName} onChange={(e) => { setFormName(e.target.value); clearErr("name") }} className={formErrors.name ? "border-destructive" : ""} />
              {formErrors.name && <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.name}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-age">Age (yrs)</Label>
                <Input id="reg-age" type="number" value={formAge} onChange={(e) => setFormAge(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-gender">Gender</Label>
                <Select id="reg-gender" value={formGender} onChange={(e) => setFormGender(e.target.value as any)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-dob">Date of Birth <span className="text-destructive">*</span></Label>
                <Input id="reg-dob" type="date" value={formDob} onChange={(e) => { setFormDob(e.target.value); clearErr("dob") }} className={formErrors.dob ? "border-destructive" : ""} />
                {formErrors.dob && <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.dob}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input id="reg-phone" placeholder="9876543210" value={formPhone} onChange={(e) => { setFormPhone(e.target.value); clearErr("phone") }} className={formErrors.phone ? "border-destructive" : ""} />
                {formErrors.phone && <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-altphone">Alternate Phone</Label>
                <Input id="reg-altphone" placeholder="+1 (555) 012-7777" value={formAltPhone} onChange={(e) => setFormAltPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email Address</Label>
              <Input id="reg-email" type="email" placeholder="patient.email@address.com" value={formEmail} onChange={(e) => { setFormEmail(e.target.value); clearErr("email") }} className={formErrors.email ? "border-destructive" : ""} />
              {formErrors.email && <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.email}</p>}
            </div>

            {/* Address fields */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-address">Street Address</Label>
              <Input id="reg-address" placeholder="123 Health Dr" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-city">City</Label>
                <Input id="reg-city" placeholder="City" value={formCity} onChange={(e) => setFormCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-state">State</Label>
                <Input id="reg-state" placeholder="State" value={formState} onChange={(e) => setFormState(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-pincode">Pincode</Label>
                <Input id="reg-pincode" placeholder="Pincode" value={formPincode} onChange={(e) => setFormPincode(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-blood">Blood Group <span className="text-destructive">*</span></Label>
                <Select id="reg-blood" value={formBloodGroup} onChange={(e) => { setFormBloodGroup(e.target.value); clearErr("bloodGroup") }} className={formErrors.bloodGroup ? "border-destructive" : ""}>
                  <option value="">-- Select --</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </Select>
                {formErrors.bloodGroup && <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.bloodGroup}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-lang">Language Preference</Label>
                <Select id="reg-lang" value={formLang} onChange={(e) => setFormLang(e.target.value as any)}>
                  <option value="English">English</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Punjabi">Punjabi</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-contactpref">Contact Preference</Label>
                <Select id="reg-contactpref" value={formContactPref} onChange={(e) => setFormContactPref(e.target.value as any)}>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                  <option value="Call">Call</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-doc">Assigned Doctor <span className="text-destructive">*</span></Label>
                <Select id="reg-doc" value={formDoctorId} onChange={(e) => { setFormDoctorId(e.target.value); clearErr("doctorId") }} className={formErrors.doctorId ? "border-destructive" : ""}>
                  <option value="">-- Select Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                  ))}
                </Select>
                {formErrors.doctorId && <p className="text-[10px] text-destructive font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.doctorId}</p>}
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-xs font-semibold py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formWaOptIn}
                    onChange={(e) => setFormWaOptIn(e.target.checked)}
                    className="rounded-xs border-input cursor-pointer"
                  />
                  <span>Opt-in for WhatsApp business alerts</span>
                </label>
              </div>
            </div>

            {/* Welcome Message Live Preview */}
            {formWaOptIn && (
              <div className="space-y-1.5 p-3.5 bg-primary/5 border border-primary/20 rounded-xl mt-2 text-xxs">
                <div className="font-bold text-primary flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Welcome Message Live Preview
                </div>
                <div className="text-muted-foreground">
                  Detected preferred language is <strong>{formLang}</strong>. Welcome message will translate to:
                </div>
                <div className="mt-1.5 p-2 bg-muted/40 rounded-lg italic text-foreground font-semibold">
                  "{regWelcomeTemplate.replace(/{Patient Name}/g, formName || "{Patient Name}")}"
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-conditions">Existing Conditions</Label>
                <Input id="reg-conditions" placeholder="e.g. Hypertension" value={formConditions} onChange={(e) => setFormConditions(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-allergies">Allergies</Label>
                <Input id="reg-allergies" placeholder="e.g. Penicillin" value={formAllergies} onChange={(e) => setFormAllergies(e.target.value)} />
              </div>
            </div>

            {/* Automated Follow-up Settings */}
            <div className="border-t border-border/40 pt-4 mt-4 space-y-4">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEnableAutoFup}
                  onChange={(e) => setFormEnableAutoFup(e.target.checked)}
                  className="rounded-xs border-input cursor-pointer"
                />
                <span>Schedule Automated Follow-up reminder</span>
              </label>

              {formEnableAutoFup && (
                <div className="space-y-4 p-4 bg-muted/40 rounded-xl border border-border/30 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-fup-delay">Follow-up Delay</Label>
                      <Select
                        id="reg-fup-delay"
                        value={formFupDelayType}
                        onChange={(e) => setFormFupDelayType(e.target.value)}
                      >
                        <option value="7">7 Days</option>
                        <option value="15">15 Days</option>
                        <option value="custom">Custom Days</option>
                      </Select>
                    </div>

                    {formFupDelayType === "custom" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-fup-custom">Custom Days</Label>
                        <Input
                          id="reg-fup-custom"
                          type="number"
                          min="1"
                          value={formFupCustomDays}
                          onChange={(e) => setFormFupCustomDays(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-fup-msg">Reminder Message Template</Label>
                    <Textarea
                      id="reg-fup-msg"
                      rows={2}
                      placeholder="Follow-up message..."
                      value={formFupMessage}
                      onChange={(e) => setFormFupMessage(e.target.value)}
                      className="text-xs font-medium font-sans leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Duplicate Detection Warning Banner ── */}
            {duplicateMatches.length > 0 && !isEditingPatient && (
              <div className={`rounded-xl border p-4 space-y-3 mt-2 animate-in slide-in-from-top-2 fade-in duration-300 ${
                duplicateMatches.some(m => m.severity === 'exact')
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${duplicateMatches.some(m => m.severity === 'exact') ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div>
                    <p className={`text-xs font-bold ${duplicateMatches.some(m => m.severity === 'exact') ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {duplicateMatches.some(m => m.severity === 'exact')
                        ? '🚫 Duplicate Record Detected — Registration Blocked'
                        : `⚠️ ${duplicateMatches.length} Similar Patient Record${duplicateMatches.length > 1 ? 's' : ''} Found`}
                    </p>
                    <p className={`text-[10px] mt-0.5 font-medium ${duplicateMatches.some(m => m.severity === 'exact') ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {duplicateMatches.some(m => m.severity === 'exact')
                        ? 'A patient with this phone number already exists. You cannot create a duplicate record. Please update the existing patient instead.'
                        : 'Review the existing records below. If this is truly a new patient, check the box below to proceed.'}
                    </p>
                  </div>
                </div>

                {/* Match cards */}
                <div className="space-y-2">
                  {duplicateMatches.slice(0, 3).map(match => (
                    <div key={match.patient.id} className="flex items-center justify-between bg-white dark:bg-card/60 rounded-lg px-3 py-2 border border-border/40 text-[10px]">
                      <div>
                        <div className="font-bold text-foreground">{match.patient.name}</div>
                        <div className="text-muted-foreground">
                          {match.patient.phone} • {match.patient.age} yrs • {match.patient.gender}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {match.matchReasons.map(r => (
                            <span key={r} className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold ${
                              match.severity === 'exact' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            }`}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ml-3 shrink-0 text-[10px] font-bold text-primary hover:underline whitespace-nowrap cursor-pointer"
                        onClick={() => {
                          setShowAddModal(false)
                          setActivePatient(match.patient)
                          setDrawerTab("overview")
                        }}
                      >
                        View Patient →
                      </button>
                    </div>
                  ))}
                </div>

                {/* Override checkbox — only for soft/weak matches */}
                {!duplicateMatches.some(m => m.severity === 'exact') && (
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={duplicateOverride}
                      onChange={e => setDuplicateOverride(e.target.checked)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                      I have reviewed the existing records above. This is a genuinely new patient — proceed with registration.
                    </span>
                  </label>
                )}
              </div>
            )}
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="cursor-pointer">Cancel</Button>
            <Button
              type="submit"
              disabled={(duplicateMatches.some(m => m.severity === 'exact') && !isEditingPatient) || isSaving}
              className="cursor-pointer"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-[2px] border-current border-t-transparent text-white rounded-full" />
                  Saving...
                </div>
              ) : (
                isEditingPatient ? "Save Changes" : "Register Profile"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* LOG VITALS DIALOG */}
      <Dialog open={showAddVitalsModal} onOpenChange={setShowAddVitalsModal}>
        <DialogHeader>
          <DialogTitle>Log Vital Signs</DialogTitle>
          <DialogClose onClick={() => setShowAddVitalsModal(false)} />
        </DialogHeader>
        <form onSubmit={handleAddVitals}>
          <DialogContent>
            <div className="space-y-1.5">
              <Label htmlFor="vit-bp">Blood Pressure (mmHg)</Label>
              <Input id="vit-bp" placeholder="e.g. 120/80" value={vitalsBp} onChange={(e) => setVitalsBp(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vit-hr">Heart Rate (bpm)</Label>
              <Input id="vit-hr" type="number" value={vitalsHr} onChange={(e) => setVitalsHr(Number(e.target.value))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vit-temp">Body Temp (°F)</Label>
              <Input id="vit-temp" type="number" step="0.1" value={vitalsTemp} onChange={(e) => setVitalsTemp(Number(e.target.value))} required />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddVitalsModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Save Vitals</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ADD DIAGNOSIS DIALOG */}
      <Dialog open={showAddRecordModal} onOpenChange={setShowAddRecordModal}>
        <DialogHeader>
          <DialogTitle>Add Diagnosis Entry</DialogTitle>
          <DialogClose onClick={() => setShowAddRecordModal(false)} />
        </DialogHeader>
        <form onSubmit={handleAddRecord}>
          <DialogContent>
            <div className="space-y-1.5">
              <Label htmlFor="rec-diag">Diagnosis Summary</Label>
              <Input id="rec-diag" placeholder="e.g. Essential Hypertension" value={recordDiag} onChange={(e) => setRecordDiag(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-doc">Consulting Doctor</Label>
              <Select id="rec-doc" value={recordDoc} onChange={(e) => setRecordDoc(e.target.value)}>
                {doctors.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-treat">Treatment Details</Label>
              <Input id="rec-treat" placeholder="e.g. Lisinopril 10mg daily + lifestyle" value={recordTreat} onChange={(e) => setRecordTreat(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-notes">Observation Notes</Label>
              <Textarea id="rec-notes" placeholder="Describe symptoms and follow-up plan..." value={recordNotes} onChange={(e) => setRecordNotes(e.target.value)} rows={3} required />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddRecordModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Log Record</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ADD PRESCRIPTION DIALOG */}
      <Dialog open={showAddPrescriptionModal} onOpenChange={setShowAddPrescriptionModal}>
        <DialogHeader>
          <DialogTitle>Add Prescription Entry</DialogTitle>
          <DialogClose onClick={() => setShowAddPrescriptionModal(false)} />
        </DialogHeader>
        <form onSubmit={handleAddPrescription}>
          <DialogContent>
            <div className="space-y-1.5">
              <Label htmlFor="pr-name">Drug Name</Label>
              <Input id="pr-name" placeholder="e.g. Lisinopril 10mg" value={presName} onChange={(e) => setPresName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-dosage">Dosage</Label>
              <Input id="pr-dosage" placeholder="e.g. 1 tablet" value={presDosage} onChange={(e) => setPresDosage(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-freq">Frequency</Label>
              <Select id="pr-freq" value={presFreq} onChange={(e) => setPresFreq(e.target.value)}>
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Every 12 hours">Every 12 hours</option>
                <option value="Every 6 hours as needed">Every 6 hours as needed</option>
              </Select>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddPrescriptionModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Add Prescription</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* PATIENT MERGER DIALOG */}
      <Dialog open={!!mergingPair} onOpenChange={(open) => !open && setMergingPair(null)}>
        <DialogHeader>
          <DialogTitle>Resolve Duplicate Patient Record</DialogTitle>
          <DialogClose onClick={() => setMergingPair(null)} />
        </DialogHeader>
        <DialogContent className="text-xxs">
          <div className="p-3 bg-muted/40 rounded-lg border border-border mb-4">
            <p className="text-muted-foreground leading-relaxed">
              Consolidate clinical histories, vitals, prescriptions, and communication logs from both records into a single master profile. This action cannot be undone.
            </p>
          </div>

          {mergingPair && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-2 relative">
                <Badge className="absolute top-2 right-2" variant="outline">KEEP PRIMARY</Badge>
                <div className="font-bold text-foreground text-xs">{mergingPair.p1.name}</div>
                <div className="text-muted-foreground font-semibold">ID: {mergingPair.p1.id}</div>
                <div className="space-y-1 mt-3">
                  <div><strong>Phone:</strong> {mergingPair.p1.phone}</div>
                  <div><strong>Email:</strong> {mergingPair.p1.email}</div>
                  <div><strong>Age:</strong> {mergingPair.p1.age} yrs</div>
                  <div><strong>Vitals Logs:</strong> {mergingPair.p1.vitals.length} logs</div>
                  <div><strong>Consults History:</strong> {mergingPair.p1.medicalHistory.length} visits</div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-2 relative">
                <Badge className="absolute top-2 right-2 bg-rose-500/10 border-rose-500/20 text-rose-500">WILL MERGE & DELETE</Badge>
                <div className="font-bold text-foreground text-xs">{mergingPair.p2.name}</div>
                <div className="text-muted-foreground font-semibold">ID: {mergingPair.p2.id}</div>
                <div className="space-y-1 mt-3">
                  <div><strong>Phone:</strong> {mergingPair.p2.phone}</div>
                  <div><strong>Email:</strong> {mergingPair.p2.email}</div>
                  <div><strong>Age:</strong> {mergingPair.p2.age} yrs</div>
                  <div><strong>Vitals Logs:</strong> {mergingPair.p2.vitals.length} logs</div>
                  <div><strong>Consults History:</strong> {mergingPair.p2.medicalHistory.length} visits</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMergingPair(null)} className="cursor-pointer">Cancel</Button>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-700 font-bold cursor-pointer text-white"
            onClick={async () => {
              if (mergingPair) {
                await dbMergePatients(mergingPair.p1.id, mergingPair.p2.id)
                setMergingPair(null)
                loadAllData()
              }
            }}
          >
            Confirm & Merge Records
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Delete Patient Confirmation Dialog ── */}
      {activePatient && (
        <Dialog open={showDeleteConfirmModal} onOpenChange={(open) => { if (!isDeletingPatient) setShowDeleteConfirmModal(open) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Move Patient to Trash?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                You are about to move <strong className="text-foreground">{activePatient.name}</strong> ({activePatient.id}) to the Trash Bin.
              </p>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-semibold">
                ⚠️ This patient record will be permanently deleted after <strong>30 days</strong> unless restored from the Trash Bin.
              </div>
              <p className="text-xs">All communications, medical records, and billing data remain intact in the trash.</p>
            </div>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" className="cursor-pointer" disabled={isDeletingPatient} onClick={() => setShowDeleteConfirmModal(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                disabled={isDeletingPatient}
                onClick={async () => {
                  if (!activePatient) return
                  const deletedName = activePatient.name
                  setIsDeletingPatient(true)
                  try {
                    // Close drawer FIRST before any async work
                    setShowDeleteConfirmModal(false)
                    setActivePatient(null)
                    await dbMovePatientToTrash(activePatient.id)
                    triggerNotice(`"${deletedName}" moved to Trash. Will be permanently deleted in 30 days.`)
                    loadAllData()
                  } catch (err: any) {
                    triggerNotice(`Error: ${err?.message || 'Failed to delete patient'}`)
                  } finally {
                    setIsDeletingPatient(false)
                  }
                }}
              >
                {isDeletingPatient ? 'Moving to Trash...' : 'Move to Trash'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground font-semibold">Loading Patient Registry...</div>}>
      <PatientsRegistryContent />
    </Suspense>
  )
}
