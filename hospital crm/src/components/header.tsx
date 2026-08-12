"use client"

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Bell,
  Sun,
  Moon,
  Search,
  CalendarDays,
  UserPlus,
  CalendarPlus,
  Sparkles,
  Command
} from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select } from "./ui/select"
import { Textarea } from "./ui/textarea"
import {
  dbGetPatients,
  dbSavePatient,
  dbGetDoctors,
  dbSaveAppointment,
  dbGetWhatsAppTemplate,
  dbGetFollowUps,
  TRANSLATED_WELCOME,
  MULTILINGUAL_TEMPLATES,
  isDefaultEnglishMessage,
  Patient,
  Doctor,
  FollowUp
} from "@/lib/db"
import { useWhatsApp } from "@/lib/whatsapp-context"

export function Header() {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const { status: waStatus, scheduledMessages } = useWhatsApp()
  const router = {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true })
  }
  const [isDark, setIsDark] = React.useState(false)
  const [showNotifications, setShowNotifications] = React.useState(false)
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = React.useState("")

  // Search states
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<Patient[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false)

  // Quick action modal states
  const [showAddPatientModal, setShowAddPatientModal] = React.useState(false)
  const [showAddAptModal, setShowAddAptModal] = React.useState(false)

  // Quick Patient Form
  const [patName, setPatName] = React.useState("")
  const [patAge, setPatAge] = React.useState(30)
  const [patGender, setPatGender] = React.useState<'Male' | 'Female' | 'Other'>("Male")
  const [patPhone, setPatPhone] = React.useState("")
  const [patEmail, setPatEmail] = React.useState("")
  const [patLang, setPatLang] = React.useState<Patient['preferredLanguage']>("English")
  const [patEnableAutoFup, setPatEnableAutoFup] = React.useState(true)
  const [patFupDelayType, setPatFupDelayType] = React.useState("15")
  const [patFupCustomDays, setPatFupCustomDays] = React.useState(14)
  const [patFupMessage, setPatFupMessage] = React.useState("")

  const [quickWelcomeTemplate, setQuickWelcomeTemplate] = React.useState("")

  React.useEffect(() => {
    const loadQuickTemplates = async () => {
      try {
        const welcomeText = await dbGetWhatsAppTemplate("welcome", patLang)
        setQuickWelcomeTemplate(welcomeText || TRANSLATED_WELCOME[patLang] || TRANSLATED_WELCOME.English || "Hello {Patient Name}, welcome!")

        const fupText = await dbGetWhatsAppTemplate("follow_up_reminder", patLang)
        const fupTemplate = fupText || MULTILINGUAL_TEMPLATES.follow_up_reminder?.[patLang] || MULTILINGUAL_TEMPLATES.follow_up_reminder?.English || "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}.";

        setPatFupMessage(prev => {
          if (!prev || isDefaultEnglishMessage(prev)) {
            return fupTemplate;
          }
          return prev;
        });
      } catch (err) {
        console.warn("Failed to load quick templates:", err)
        setQuickWelcomeTemplate(TRANSLATED_WELCOME[patLang] || TRANSLATED_WELCOME.English || "Hello {Patient Name}, welcome!")

        const fupTemplate = MULTILINGUAL_TEMPLATES.follow_up_reminder?.[patLang] || MULTILINGUAL_TEMPLATES.follow_up_reminder?.English || "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}.";
        setPatFupMessage(prev => {
          if (!prev || isDefaultEnglishMessage(prev)) {
            return fupTemplate;
          }
          return prev;
        });
      }
    }
    loadQuickTemplates()
  }, [patLang])

  // Quick Appointment Form
  const [aptPatientId, setAptPatientId] = React.useState("")
  const [aptPatientName, setAptPatientName] = React.useState("")
  const [aptDept, setAptDept] = React.useState("Cardiology")
  const [aptDoctorId, setAptDoctorId] = React.useState("")
  const [aptDate, setAptDate] = React.useState("2026-06-08")
  const [aptTime, setAptTime] = React.useState("09:00 AM")
  const [aptCost, setAptCost] = React.useState(150)
  const [aptNotes, setAptNotes] = React.useState("")

  const [patientsList, setPatientsList] = React.useState<Patient[]>([])
  const [doctorsList, setDoctorsList] = React.useState<Doctor[]>([])

  const [session, setSession] = React.useState<{ name: string; role: string } | null>(null)

  const loadBaseLists = async () => {
    const [pats, docs] = await Promise.all([
      dbGetPatients(),
      dbGetDoctors()
    ])
    setPatientsList(pats)
    setDoctorsList(docs)
    
    if (pats.length > 0) {
      setAptPatientId(pats[0].id)
      setAptPatientName(pats[0].name)
    }
    if (docs.length > 0) {
      const match = docs.find(d => d.department === aptDept) || docs[0]
      setAptDoctorId(match.id)
    }
  }

  React.useEffect(() => {
    loadBaseLists()
    const isDarkClass = document.documentElement.classList.contains("dark")
    setIsDark(isDarkClass)
    
    const stored = localStorage.getItem("active_user_session")
    if (stored) {
      setSession(JSON.parse(stored))
    }
    
    const updateTime = () => {
      const d = new Date()
      setCurrentTime(d.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' }))
    }
    updateTime()
  }, [pathname])

  // Sync search query changes
  React.useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length > 1) {
        const pats = await dbGetPatients()
        const matches = pats.filter(
          p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
               p.phone.includes(searchQuery)
        )
        setSearchResults(matches)
        setShowSearchDropdown(true)
      } else {
        setSearchResults([])
        setShowSearchDropdown(false)
      }
    }
    performSearch()
  }, [searchQuery])

  // Sync real clinic alerts and WhatsApp background system status
  const loadNotifications = async () => {
    try {
      const activeAlerts: any[] = []

      // 1. WhatsApp Connection Status (from context)
      if (waStatus === "disconnected" || waStatus === "qr") {
        activeAlerts.push({
          id: "wa-status-disconnected",
          title: "WhatsApp Disconnected",
          desc: "WhatsApp link is active but disconnected. Scan the QR code to enable auto-messages.",
          time: "Attention",
          borderClass: "border-amber-500"
        })
      } else if (waStatus === "offline") {
        activeAlerts.push({
          id: "wa-status-offline",
          title: "WhatsApp Server Offline",
          desc: "WhatsApp gateway backend is offline. Run npm run dev:all in terminal.",
          time: "Offline",
          borderClass: "border-amber-500"
        })
      }

      // 2. Failed scheduled messages (from context)
      const failed = scheduledMessages.filter((m: any) => m.status === "failed")
      failed.forEach((m: any) => {
        activeAlerts.push({
          id: `failed-dispatch-${m.id}`,
          title: "Follow-up Send Failed",
          desc: `Failed to send follow-up reminder to ${m.patientName} (${m.phone}): ${m.error || "Connection timeout"}`,
          time: "Failed",
          borderClass: "border-rose-500"
        })
      })

      // 3. Fetch Overdue Follow-ups
      try {
        const followups = await dbGetFollowUps()
        const overdue = followups.filter(f => f.status === "Overdue" || (f.status === "Pending" && new Date(f.followUpDate) < new Date()))
        overdue.forEach(f => {
          activeAlerts.push({
            id: `overdue-fup-${f.id}`,
            title: "Follow-up Overdue",
            desc: `Care reminder follow-up is overdue for patient ${f.patientName} (assigned to ${f.doctorName}).`,
            time: "Overdue",
            borderClass: "border-rose-500"
          })
        })
      } catch (err) {
        // Silent catch
      }

      // 4. Fetch Recent Patients (Registered in last 4 hours)
      try {
        const patients = await dbGetPatients()
        const now = new Date().getTime()
        const recent = patients.filter(p => {
          if (!p.createdAt) return false
          const createdTime = new Date(p.createdAt).getTime()
          return now - createdTime < 4 * 60 * 60 * 1000 // 4 hours in ms
        })
        recent.forEach(p => {
          activeAlerts.push({
            id: `recent-pat-${p.id}`,
            title: "New Patient Registered",
            desc: `Patient ${p.name} registered (assigned to ${p.doctorAssignedName || "Unassigned"}).`,
            time: "New",
            borderClass: "border-emerald-500"
          })
        })
      } catch (err) {
        // Silent catch
      }

      setNotifications(activeAlerts)
    } catch (err) {
      console.error("Failed to build notifications:", err)
    }
  }

  React.useEffect(() => {
    loadNotifications()
  }, [pathname, waStatus, scheduledMessages])

  const handleClearAll = () => {
    const ids = notifications.map(n => n.id)
    setDismissedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id))

  // Sync doctor choice in quick appointment form when specialty changes
  React.useEffect(() => {
    const filtered = doctorsList.filter(d => d.department === aptDept)
    if (filtered.length > 0) {
      setAptDoctorId(filtered[0].id)
    }
  }, [aptDept, doctorsList])

  const toggleDarkMode = () => {
    const root = document.documentElement
    if (isDark) {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
      setIsDark(false)
    } else {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
      setIsDark(true)
    }
  }

  const handleSearchResultClick = (patId: string) => {
    setSearchQuery("")
    setShowSearchDropdown(false)
    router.push(`/patients?id=${patId}`)
  }

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const fupDays = patFupDelayType === "custom" ? Number(patFupCustomDays) : Number(patFupDelayType)

    const newPat = await dbSavePatient({
      name: patName,
      age: Number(patAge),
      gender: patGender,
      dob: '1990-01-01',
      phone: patPhone,
      alternatePhone: '',
      email: patEmail,
      addressInfo: { address: '', city: '', state: '', country: '', pincode: '' },
      bloodGroup: 'A+',
      existingConditions: '',
      allergies: '',
      doctorAssignedId: '',
      doctorAssignedName: '',
      preferredLanguage: patLang,
      preferredContactMethod: 'WhatsApp',
      whatsappOptIn: true,
      lastVisit: new Date().toISOString().split("T")[0],
      vitals: [],
      medicalHistory: [],
      prescriptions: [],
      communications: [],
      enableAutomatedFollowUp: patEnableAutoFup,
      customFollowUpDays: fupDays,
      customFollowUpMessage: patFupMessage
    })

    setPatName("")
    setPatPhone("")
    setPatEmail("")
    setPatEnableAutoFup(true)
    setPatFupDelayType("15")
    setPatFupCustomDays(14)
    setPatFupMessage("")
    setShowAddPatientModal(false)
    
    // Redirect straight to new patient profile folder
    router.push(`/patients?id=${newPat.id}`)
  }

  const handleQuickAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    let pName = aptPatientName
    let pId = aptPatientId
    if (pId) {
      const match = patientsList.find(p => p.id === pId)
      if (match) pName = match.name
    }

    const doc = doctorsList.find(d => d.id === aptDoctorId)
    const docName = doc ? doc.name : "Dr. Attending Staff"

    await dbSaveAppointment({
      patientId: pId || 'guest',
      patientName: pName,
      doctorId: aptDoctorId,
      doctorName: docName,
      date: aptDate,
      timeSlot: aptTime,
      department: aptDept,
      status: "Confirmed",
      notes: aptNotes,
      cost: Number(aptCost)
    })

    setAptNotes("")
    setShowAddAptModal(false)
    router.push('/appointments')
  }

  const getHeaderTitle = () => {
    switch (pathname) {
      case "/":
        return `Welcome Back, ${session ? session.name.split(" ")[0] || session.name : "Dr. Marcus"}`
      case "/patients":
        return "Patient Registry"
      case "/appointments":
        return "Clinical Appointments"
      case "/follow-ups":
        return "Follow-up Roster"
      case "/communication":
        return "Unified Inbox"
      case "/whatsapp-automation":
        return "WhatsApp Automations"
      case "/billing":
        return "Billing & Financials"
      case "/doctors":
        return "Medical Staff"
      case "/reports":
        return "Reports & Analytics"
      case "/automation-builder":
        return "Workflow Builder"
      case "/settings":
        return "System Settings"
      default:
        return "Aegis CRM Dashboard"
    }
  }


  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border/40 bg-card px-8 text-card-foreground relative z-30">
      {/* Title + Role Badge */}
      <div>
        <h2 className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5">
          {getHeaderTitle()}
        </h2>
        {session && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full leading-none ${
              session.role === 'Super Admin' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' :
              session.role === 'Clinic Admin' ? 'bg-primary/15 text-primary' :
              session.role === 'Doctor' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
              session.role === 'Receptionist' ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' :
              'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>{session.role}</span>
          </div>
        )}
      </div>

      {/* Center Search bar with Smart Dropdown */}
      {session && session.role !== "Patient" && (
        <div className="relative w-80 max-md:hidden">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Smart search (Name, ID, Phone)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background/50 pl-9 pr-8 text-xs placeholder:text-muted-foreground/80 focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <Command className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground/40" />

          {/* Floating search dropdown */}
          {showSearchDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSearchDropdown(false)} />
              <div className="absolute left-0 mt-2.5 w-full bg-card border border-border rounded-xl shadow-xl z-50 p-2 max-h-[300px] overflow-y-auto animate-in fade-in duration-100">
                <span className="text-[10px] text-muted-foreground uppercase font-bold px-2 py-1 block border-b border-border/40">Patient matches</span>
                {searchResults.length > 0 ? (
                  searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSearchResultClick(p.id)}
                      className="p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs mt-1"
                    >
                      <div>
                        <div className="font-bold text-foreground">{p.name}</div>
                        <span className="text-[10px] text-muted-foreground">ID: {p.id} | {p.phone}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{p.preferredLanguage}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">No matches found.</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Right side Actions */}
      <div className="flex items-center gap-3">
        {/* Quick buttons */}
        {session && session.role !== "Patient" && session.role !== "Doctor" && (
          <div className="flex items-center gap-1.5 border-r border-border/40 pr-3 mr-1">
            <Button
              onClick={() => {
                loadBaseLists()
                setShowAddPatientModal(true)
              }}
              size="sm"
              variant="ghost"
              className="h-8 text-xxs font-bold text-primary hover:bg-primary/10 cursor-pointer"
              title="Quick Register Patient"
            >
              <UserPlus className="h-4 w-4 mr-1" /> Register
            </Button>
            <Button
              onClick={() => {
                loadBaseLists()
                setShowAddAptModal(true)
              }}
              size="sm"
              variant="ghost"
              className="h-8 text-xxs font-bold text-secondary hover:bg-secondary/10 cursor-pointer"
              title="Quick Book Appointment"
            >
              <CalendarPlus className="h-4 w-4 mr-1" /> Schedule
            </Button>
          </div>
        )}

        {/* Date Display */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 text-[10px] font-bold text-foreground/80 border border-border/20 max-lg:hidden">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>{currentTime}</span>
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={toggleDarkMode}
          title="Toggle Dark Mode"
        >
          {isDark ? (
            <Sun className="h-4.5 w-4.5 text-amber-500 animate-spin-slow" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-slate-700" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4.5 w-4.5 text-muted-foreground" />
            {visibleNotifications.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white ring-2 ring-card animate-pulse">
                {visibleNotifications.length}
              </span>
            )}
          </Button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2.5 w-72 bg-card border border-border rounded-xl shadow-xl z-50 p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                  <h4 className="text-xs font-bold text-foreground">Clinic Alerts</h4>
                  {visibleNotifications.length > 0 && (
                    <button 
                      onClick={handleClearAll}
                      className="text-xxs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {visibleNotifications.length > 0 ? (
                    visibleNotifications.map(n => (
                      <div key={n.id} className={`p-2.5 rounded-lg bg-muted/40 border-l-2 text-xxs ${n.borderClass || "border-primary"}`}>
                        <div className="flex justify-between items-center font-bold text-foreground gap-1.5">
                          <span className="truncate">{n.title}</span>
                          <span className="text-[9px] font-semibold text-muted-foreground shrink-0">{n.time}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 leading-snug">{n.desc}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-[10px] text-muted-foreground font-semibold">
                      No active alerts requiring attention.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* QUICK ADD PATIENT DIALOG */}
      <Dialog open={showAddPatientModal} onOpenChange={setShowAddPatientModal}>
        <DialogHeader>
          <DialogTitle>Quick Register Patient</DialogTitle>
          <DialogClose onClick={() => setShowAddPatientModal(false)} />
        </DialogHeader>
        <form onSubmit={handleQuickRegister}>
          <DialogContent>
            <div className="space-y-1.5">
              <Label htmlFor="qpat-name">Full Patient Name</Label>
              <Input
                id="qpat-name"
                placeholder="e.g. Robert Smith"
                value={patName}
                onChange={(e) => setPatName(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="qpat-age">Age</Label>
                <Input
                  id="qpat-age"
                  type="number"
                  value={patAge}
                  onChange={(e) => setPatAge(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qpat-gender">Gender</Label>
                <Select
                  id="qpat-gender"
                  value={patGender}
                  onChange={(e) => setPatGender(e.target.value as any)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qpat-phone">Contact Number</Label>
              <Input
                id="qpat-phone"
                placeholder="+1 (555) 012-3456"
                value={patPhone}
                onChange={(e) => setPatPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qpat-email">Email Address</Label>
              <Input
                id="qpat-email"
                type="email"
                placeholder="email@address.com"
                value={patEmail}
                onChange={(e) => setPatEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qpat-lang">Preferred Communication Language</Label>
              <Select
                id="qpat-lang"
                value={patLang}
                onChange={(e) => setPatLang(e.target.value as any)}
              >
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

            {/* Welcome Message Live Preview */}
            <div className="space-y-1.5 p-3.5 bg-primary/5 border border-primary/20 rounded-xl mt-2 text-xxs">
              <div className="font-bold text-primary flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Welcome Message Live Preview
              </div>
              <div className="text-muted-foreground">
                Detected preferred language is <strong>{patLang}</strong>. Welcome message will translate to:
              </div>
              <div className="mt-1.5 p-2 bg-muted/40 rounded-lg italic text-foreground font-semibold">
                "{quickWelcomeTemplate.replace(/{Patient Name}/g, patName || "{Patient Name}")}"
              </div>
            </div>

            {/* Automated Follow-up Settings */}
            <div className="border-t border-border/40 pt-3.5 mt-3.5 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={patEnableAutoFup}
                  onChange={(e) => setPatEnableAutoFup(e.target.checked)}
                  className="rounded-xs border-input cursor-pointer"
                />
                <span>Schedule Automated Follow-up reminder</span>
              </label>

              {patEnableAutoFup && (
                <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border/30 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-xxs">
                      <Label htmlFor="qpat-fup-delay">Follow-up Delay</Label>
                      <Select
                        id="qpat-fup-delay"
                        value={patFupDelayType}
                        onChange={(e) => setPatFupDelayType(e.target.value)}
                      >
                        <option value="7">7 Days</option>
                        <option value="15">15 Days</option>
                        <option value="custom">Custom Days</option>
                      </Select>
                    </div>

                    {patFupDelayType === "custom" && (
                      <div className="space-y-1.5 text-xxs">
                        <Label htmlFor="qpat-fup-custom">Custom Days</Label>
                        <Input
                          id="qpat-fup-custom"
                          type="number"
                          min="1"
                          value={patFupCustomDays}
                          onChange={(e) => setPatFupCustomDays(Number(e.target.value))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xxs">
                    <Label htmlFor="qpat-fup-msg">Reminder Message Template</Label>
                    <Textarea
                      id="qpat-fup-msg"
                      rows={2}
                      placeholder="Follow-up message..."
                      value={patFupMessage}
                      onChange={(e) => setPatFupMessage(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddPatientModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Register Profile</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* QUICK BOOK APPOINTMENT DIALOG */}
      <Dialog open={showAddAptModal} onOpenChange={setShowAddAptModal}>
        <DialogHeader>
          <DialogTitle>Quick Schedule Consultation</DialogTitle>
          <DialogClose onClick={() => setShowAddAptModal(false)} />
        </DialogHeader>
        <form onSubmit={handleQuickAppointment}>
          <DialogContent>
            {/* Patient dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="qapt-pat">Select Patient</Label>
              {patientsList.length > 0 ? (
                <Select
                  id="qapt-pat"
                  value={aptPatientId}
                  onChange={(e) => {
                    setAptPatientId(e.target.value)
                    const match = patientsList.find(p => p.id === e.target.value)
                    if (match) setAptPatientName(match.name)
                  }}
                >
                  {patientsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="qapt-pat"
                  placeholder="Enter guest name..."
                  value={aptPatientName}
                  onChange={(e) => setAptPatientName(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Specialty */}
              <div className="space-y-1.5">
                <Label htmlFor="qapt-dept">Clinical Specialty</Label>
                <Select
                  id="qapt-dept"
                  value={aptDept}
                  onChange={(e) => setAptDept(e.target.value)}
                >
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                </Select>
              </div>

              {/* Doctor */}
              <div className="space-y-1.5">
                <Label htmlFor="qapt-doc">Attending Doctor</Label>
                <Select
                  id="qapt-doc"
                  value={aptDoctorId}
                  onChange={(e) => setAptDoctorId(e.target.value)}
                >
                  {doctorsList.filter(d => d.department === aptDept).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="qapt-date">Date</Label>
                <Input
                  id="qapt-date"
                  type="date"
                  value={aptDate}
                  onChange={(e) => setAptDate(e.target.value)}
                  required
                />
              </div>

              {/* Time slot */}
              <div className="space-y-1.5">
                <Label htmlFor="qapt-time">Time Slot</Label>
                <Select
                  id="qapt-time"
                  value={aptTime}
                  onChange={(e) => setAptTime(e.target.value)}
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="qapt-cost">Cost Tariff ($)</Label>
                <Input
                  id="qapt-cost"
                  type="number"
                  value={aptCost}
                  onChange={(e) => setAptCost(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qapt-notes">Notes</Label>
              <Textarea
                id="qapt-notes"
                placeholder="Reason for consultation..."
                value={aptNotes}
                onChange={(e) => setAptNotes(e.target.value)}
                rows={2}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddAptModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Confirm Booking</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </header>
  )
}
