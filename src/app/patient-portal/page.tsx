"use client"

import * as React from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Suspense } from "react"
import {
  User,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Sparkles,
  HeartPulse,
  Activity,
  Pill,
  Send,
  CalendarDays,
  CreditCard as PayIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Languages,
  BadgeAlert,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import {
  dbGetPatients,
  dbSavePatient,
  dbGetAppointments,
  dbSaveAppointment,
  dbGetInvoices,
  dbPayInvoice,
  dbAddCommunicationLog,
  dbGetDoctors,
  Patient,
  Appointment,
  Invoice,
  Doctor
} from "@/lib/db"

function PatientPortalContent() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get("tab") || "overview"
  const navigate = useNavigate()
  const router = {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true })
  }

  const [activePatient, setActivePatient] = React.useState<Patient | null>(null)
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [doctors, setDoctors] = React.useState<Doctor[]>([])

  // Booking Form States
  const [showBookModal, setShowBookModal] = React.useState(false)
  const [bookDept, setBookDept] = React.useState("Cardiology")
  const [bookDocId, setBookDocId] = React.useState("")
  const [bookDate, setBookDate] = React.useState("2026-06-15")
  const [bookTime, setBookTime] = React.useState("10:00 AM")
  const [bookNotes, setBookNotes] = React.useState("")

  // Profile Form States
  const [profilePhone, setProfilePhone] = React.useState("")
  const [profileEmail, setProfileEmail] = React.useState("")
  const [profileLang, setProfileLang] = React.useState<Patient['preferredLanguage']>("English")
  const [profileContactPref, setProfileContactPref] = React.useState<Patient['preferredContactMethod']>("WhatsApp")

  // Chat Support States
  const [chatInput, setChatInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [successMsg, setSuccessMsg] = React.useState("")

  const loadPatientSession = async () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_user_session")
      if (stored) {
        const session = JSON.parse(stored)
        if (session.role === "Patient") {
          // Fetch real data from db scoped to this patient by RLS
          const pats = await dbGetPatients()
          if (pats.length > 0) {
            const current = pats[0] // dbGetPatients automatically returns only the logged-in patient
            setActivePatient(current)
            setProfilePhone(current.phone)
            setProfileEmail(current.email)
            setProfileLang(current.preferredLanguage)
            setProfileContactPref(current.preferredContactMethod)
          }
          
          const [apts, invs, docs] = await Promise.all([
            dbGetAppointments(),
            dbGetInvoices(),
            dbGetDoctors()
          ])
          setAppointments(apts)
          setInvoices(invs)
          setDoctors(docs)
        }
      }
    }
  }

  React.useEffect(() => {
    loadPatientSession()
  }, [tabParam])

  // Set default doctor when department changes
  React.useEffect(() => {
    const filtered = doctors.filter(d => d.department === bookDept)
    if (filtered.length > 0) {
      setBookDocId(filtered[0].id)
    }
  }, [bookDept, doctors])

  if (!activePatient) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <HeartPulse className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground font-semibold">Resolving Patient Session...</p>
        </div>
      </div>
    )
  }

  // Profile Save
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const updated = await dbSavePatient({
      ...activePatient,
      phone: profilePhone,
      email: profileEmail,
      preferredLanguage: profileLang,
      preferredContactMethod: profileContactPref
    })
    setActivePatient(updated)
    setSuccessMsg("Profile updated successfully in the registry.")
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  // Appointment Booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedDoc = doctors.find(d => d.id === bookDocId)
    const docName = selectedDoc ? selectedDoc.name : "Attending Physician"
    
    await dbSaveAppointment({
      patientId: activePatient.id,
      patientName: activePatient.name,
      doctorId: bookDocId,
      doctorName: docName,
      date: bookDate,
      timeSlot: bookTime,
      department: bookDept,
      status: "Scheduled",
      notes: bookNotes,
      cost: 150
    })

    setShowBookModal(false)
    setBookNotes("")
    setSuccessMsg("Appointment successfully scheduled!")
    setTimeout(() => setSuccessMsg(""), 3000)
    await loadPatientSession()
  }

  // Invoice Payment
  const handlePayInvoice = async (invId: string) => {
    await dbPayInvoice(invId)
    setSuccessMsg("Invoice successfully paid!")
    setTimeout(() => setSuccessMsg(""), 3000)
    await loadPatientSession()
  }

  // Send WhatsApp message to support
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userText = chatInput
    setChatInput("")

    // 1. Log user sent message
    await dbAddCommunicationLog(activePatient.id, {
      type: "whatsapp",
      direction: "received", // Received by the clinic from the patient
      content: userText,
      status: "read"
    })
    await loadPatientSession()

    // 2. Trigger AI Appointment / FAQ Assistant response simulation
    setIsTyping(true)
    setTimeout(async () => {
      let aiText = ""
      const lowercaseText = userText.toLowerCase()

      if (lowercaseText.includes("appointment") || lowercaseText.includes("book") || lowercaseText.includes("schedule") || lowercaseText.includes("reschedule")) {
        // AI Appointment Assistant responds
        aiText = "[AI Appointment Assistant]: Hello! I can help you manage your clinical visits. You can schedule new consultations in the 'My Appointments' tab, or let me know a preferred date/specialty here and I'll notify the reception desk!"
      } else {
        // AI FAQ Assistant responds
        aiText = `[AI FAQ Assistant]: Hello ${activePatient.name.split(" ")[0]}! I'm your clinic FAQ support. Our main branch is open Monday-Friday 8:00 AM - 6:00 PM. We accept cash, card, and major health insurances. Let me know if you need help with prescriptions or billing!`
      }

      await dbAddCommunicationLog(activePatient.id, {
        type: "whatsapp",
        direction: "sent", // Sent by clinic/AI to patient
        content: aiText,
        status: "read"
      })
      setIsTyping(false)
      await loadPatientSession()
    }, 1500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alert banner */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4.5 w-4.5" /> {successMsg}
        </div>
      )}

      {/* Overview Tab */}
      {tabParam === "overview" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Welcome Card & Vitals */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-primary/5 border-primary/15 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full -mr-10 -mt-10" />
              <CardHeader className="pb-3">
                <CardTitle className="text-md font-extrabold text-foreground flex items-center gap-2">
                  Welcome to Your Patient Portal, {activePatient.name}
                </CardTitle>
                <CardDescription className="text-xxs text-muted-foreground font-semibold">
                  OnlyClinic Patient ID: <strong className="font-mono text-primary">{activePatient.id}</strong> | Preferred Contact Method: {activePatient.preferredContactMethod}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xxs leading-relaxed font-semibold text-foreground/80 space-y-2">
                <p>Manage your health records, view consultant notes, schedule follow-ups, and download invoices directly from your portal dashboard.</p>
                <div className="flex gap-4 pt-2">
                  <div className="px-3 py-1.5 rounded-lg bg-card border border-border">
                    <span className="text-muted-foreground block text-[9px] uppercase">Age</span>
                    <strong className="text-foreground text-xs">{activePatient.age} yrs</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-card border border-border">
                    <span className="text-muted-foreground block text-[9px] uppercase">Gender</span>
                    <strong className="text-foreground text-xs">{activePatient.gender}</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-card border border-border">
                    <span className="text-muted-foreground block text-[9px] uppercase">Blood Group</span>
                    <strong className="text-foreground text-xs text-rose-500">{activePatient.bloodGroup}</strong>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vitals & History summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Activity className="h-4.5 w-4.5 text-primary" /> Recent Vitals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xxs font-semibold">
                  {activePatient.vitals.length > 0 ? (
                    <>
                      <div className="flex justify-between border-b border-border/20 pb-1.5">
                        <span className="text-muted-foreground">Blood Pressure</span>
                        <strong className="text-foreground">{activePatient.vitals[0].bp} mmHg</strong>
                      </div>
                      <div className="flex justify-between border-b border-border/20 pb-1.5">
                        <span className="text-muted-foreground">Pulse Rate</span>
                        <strong className="text-foreground">{activePatient.vitals[0].heartRate} bpm</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Body Temperature</span>
                        <strong className="text-foreground">{activePatient.vitals[0].temp} °F</strong>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">No vital logs recorded in registry.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Pill className="h-4.5 w-4.5 text-emerald-500" /> Active Medications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xxs font-semibold">
                  {activePatient.prescriptions.length > 0 ? (
                    activePatient.prescriptions.slice(0, 3).map((pr, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-lg border border-border/40 bg-muted/20">
                        <div>
                          <strong className="text-foreground">{pr.name}</strong>
                          <span className="text-muted-foreground block text-[9px] mt-0.5">{pr.dosage} • {pr.frequency}</span>
                        </div>
                        <Badge variant="outline" className="text-[8.5px]">{pr.status}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic">No active medications prescribed.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Profile Details Edit */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <User className="h-4.5 w-4.5 text-primary" /> Portal Account Details
              </CardTitle>
              <CardDescription className="text-[10px]">Update your primary contact data in the registry.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile} className="flex-1 flex flex-col justify-between p-6 pt-0">
              <CardContent className="p-0 space-y-4 text-xxs font-semibold">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-phone">Phone Number</Label>
                  <Input id="prof-phone" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} required className="h-8.5 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-email">Email Address</Label>
                  <Input id="prof-email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required className="h-8.5 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-lang">Preferred Language</Label>
                  <Select id="prof-lang" value={profileLang} onChange={(e) => setProfileLang(e.target.value as any)}>
                    <option value="English">English</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Malayalam">Malayalam</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof-pref">Contact Preference</Label>
                  <Select id="prof-pref" value={profileContactPref} onChange={(e) => setProfileContactPref(e.target.value as any)}>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="Email">Email</option>
                    <option value="Call">Call</option>
                  </Select>
                </div>
              </CardContent>
              <Button type="submit" size="sm" className="w-full mt-5 cursor-pointer h-8.5 font-bold text-xxs">Save Changes</Button>
            </form>
          </Card>
        </div>
      )}

      {/* Appointments Tab */}
      {tabParam === "appointments" && (
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row justify-between items-center border-b border-border/40 pb-3.5 bg-muted/10">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Consultation Schedule
              </CardTitle>
              <CardDescription className="text-xxs">Manage your appointments history and request bookings.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowBookModal(true)} className="flex items-center gap-1.5 text-xs h-9 cursor-pointer">
              <PlusCircle className="h-4.5 w-4.5" /> Book New Appointment
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="p-4">Clinic Department</th>
                    <th className="p-4">Physician Consultant</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Reason/Notes</th>
                    <th className="p-4 text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length > 0 ? (
                    appointments.map(apt => (
                      <tr key={apt.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-bold text-foreground">{apt.department}</td>
                        <td className="p-4 text-muted-foreground font-medium">{apt.doctorName}</td>
                        <td className="p-4">
                          <div className="font-bold">{apt.date}</div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">{apt.timeSlot}</span>
                        </td>
                        <td className="p-4 text-muted-foreground max-w-[200px] truncate" title={apt.notes}>{apt.notes || 'None'}</td>
                        <td className="p-4 text-right pr-6">
                          <Badge variant={apt.status.toLowerCase() as any}>{apt.status}</Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground font-medium">No appointments scheduled.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical History Tab */}
      {tabParam === "medical" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Timeline */}
          <div className="md:col-span-2 space-y-5">
            <Card className="shadow-xs">
              <CardHeader className="border-b border-border/40 pb-3 bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-primary" /> Consultant Visit Log
                </CardTitle>
                <CardDescription className="text-xxs font-semibold">Your chronological healthcare diagnosis records.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 relative border-l-2 border-border/60 ml-6 pl-6 space-y-6 mt-4">
                {activePatient.medicalHistory.length > 0 ? (
                  activePatient.medicalHistory.map((rec, idx) => (
                    <div key={idx} className="relative text-xxs font-medium">
                      <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-secondary ring-4 ring-card" />
                      <div className="flex justify-between text-primary font-bold">
                        <span>{rec.date}</span>
                        <span className="text-muted-foreground">{rec.doctor}</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-foreground mt-0.5">{rec.diagnosis}</h4>
                      <p className="text-muted-foreground mt-1 leading-relaxed">{rec.notes}</p>
                      {rec.treatment && (
                        <div className="bg-muted/30 p-2 border border-border/20 rounded-lg mt-1 text-foreground/80 leading-relaxed font-semibold">
                          <strong className="text-muted-foreground">Plan:</strong> {rec.treatment}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic -ml-6">No historical clinical diagnosis logs.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Prescriptions & Reports List */}
          <div className="space-y-6">
            {/* Prescriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Pill className="h-4.5 w-4.5 text-emerald-500" /> Prescriptions List
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xxs font-semibold">
                {activePatient.prescriptions.length > 0 ? (
                  activePatient.prescriptions.map((pr, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg border border-border/40 bg-muted/20">
                      <div>
                        <strong className="text-foreground">{pr.name}</strong>
                        <span className="text-muted-foreground block text-[9px] mt-0.5">Dosage: {pr.dosage} | Frequency: {pr.frequency}</span>
                      </div>
                      <Badge variant="completed">{pr.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No historical prescriptions found.</p>
                )}
              </CardContent>
            </Card>

            {/* Mock Lab Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <HeartPulse className="h-4.5 w-4.5 text-rose-500" /> Lab & Diagnostics Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xxs font-semibold">
                <div className="flex justify-between items-center p-2.5 border border-border/40 rounded-xl hover:bg-muted/20 transition-colors">
                  <div>
                    <strong className="text-foreground">Complete Blood Count (CBC)</strong>
                    <span className="text-muted-foreground block text-[9px] mt-0.5">Uploaded: 2026-06-08 • Verified</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] flex items-center gap-1 cursor-pointer">
                    View <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex justify-between items-center p-2.5 border border-border/40 rounded-xl hover:bg-muted/20 transition-colors">
                  <div>
                    <strong className="text-foreground">Cardiology ECG Report</strong>
                    <span className="text-muted-foreground block text-[9px] mt-0.5">Uploaded: 2026-06-07 • Verified</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[9px] flex items-center gap-1 cursor-pointer">
                    View <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {tabParam === "billing" && (
        <Card className="shadow-xs">
          <CardHeader className="border-b border-border/40 pb-3.5 bg-muted/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Invoice Statements & Payments
            </CardTitle>
            <CardDescription className="text-xxs">Download clinical invoices and pay pending statements.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="p-4">Invoice No</th>
                    <th className="p-4">Billing Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Amount Tariff</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Operation</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length > 0 ? (
                    invoices.map(inv => (
                      <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-mono font-bold text-primary">{inv.invoiceNo}</td>
                        <td className="p-4 text-muted-foreground font-medium">{inv.date}</td>
                        <td className="p-4 text-foreground/80 font-semibold">Clinical Consultation Fees</td>
                        <td className="p-4 text-foreground/90 font-extrabold">${inv.amount}</td>
                        <td className="p-4">
                          <Badge variant={inv.status.toLowerCase() as any}>{inv.status}</Badge>
                        </td>
                        <td className="p-4 text-right pr-6">
                          {inv.status === "Unpaid" ? (
                            <Button
                              size="sm"
                              onClick={() => handlePayInvoice(inv.id)}
                              className="h-7 text-[10px] font-bold cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground flex items-center gap-1 ml-auto"
                            >
                              <PayIcon className="h-3 w-3" /> Make Payment
                            </Button>
                          ) : (
                            <span className="text-xxs text-emerald-500 font-bold flex items-center justify-end gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Settle/Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground font-medium">No ledger invoices recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Support Tab */}
      {tabParam === "chat" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Chat Panel */}
          <Card className="md:col-span-2 h-[500px] flex flex-col justify-between overflow-hidden shadow-xs border-border/60">
            {/* Header info */}
            <div className="p-4 border-b border-border/40 bg-muted/10 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-xs font-bold text-foreground">Clinic Helpdesk (Aegis Support)</h4>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Secure, HIPAA-compliant patient communication.</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">Active</Badge>
            </div>

            {/* Chat timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 max-h-[380px]">
              {activePatient.communications.length > 0 ? (
                activePatient.communications.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col w-fit max-w-[70%] p-3 rounded-lg text-xxs ${
                      msg.direction === 'received' // Received by clinic (sent by patient)
                        ? 'bg-primary text-primary-foreground ml-auto rounded-tr-none shadow-xxs'
                        : 'bg-card text-foreground border border-border mr-auto rounded-tl-none shadow-xxs'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className={`text-[8px] mt-1 text-right block ${msg.direction === 'received' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {msg.timestamp} • {msg.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-medium">No messaging history. Send a query to chat with clinic!</div>
              )}

              {isTyping && (
                <div className="bg-card text-foreground border border-border mr-auto p-2.5 rounded-lg rounded-tl-none text-xxs italic animate-pulse">
                  Clinic Assistant is typing a reply...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border/40 flex gap-2 bg-muted/5 shrink-0">
              <Input
                placeholder="Ask about appointments, opening hours, or general questions..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="h-10 text-xs flex-1"
                disabled={isTyping}
                required
              />
              <Button type="submit" size="icon" className="h-10 w-10 cursor-pointer shrink-0" disabled={isTyping}>
                <Send className="h-4.5 w-4.5" />
              </Button>
            </form>
          </Card>

          {/* AI Assistants Information Panel */}
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5 shadow-2xs">
              <CardHeader className="p-4 pb-1 flex flex-row items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">AI Appointment Assistant</span>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[10px] text-foreground/80 leading-relaxed font-semibold">
                Type messages about <strong>booking, scheduling, or rescheduling</strong> to consult the AI Appointment Assistant for real-time schedule matching advice.
              </CardContent>
            </Card>

            <Card className="border-secondary/20 bg-secondary/5 shadow-2xs">
              <CardHeader className="p-4 pb-1 flex flex-row items-center gap-1.5">
                <Info className="h-4 w-4 text-secondary" />
                <span className="text-[10px] font-bold text-secondary-foreground uppercase tracking-wide">AI FAQ Assistant</span>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[10px] text-foreground/85 leading-relaxed font-semibold">
                Ask about <strong>clinic hours, payment rules, location, or general checkup tariffs</strong> to consult the AI FAQ Assistant for instant answers.
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* BOOK APPOINTMENT DIALOG */}
      <Dialog open={showBookModal} onOpenChange={setShowBookModal}>
        <DialogHeader>
          <DialogTitle>Book Clinical Appointment</DialogTitle>
          <DialogClose onClick={() => setShowBookModal(false)} />
        </DialogHeader>
        <form onSubmit={handleBookAppointment}>
          <DialogContent className="text-xxs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="book-dept">Specialty Department</Label>
                <Select id="book-dept" value={bookDept} onChange={(e) => setBookDept(e.target.value)}>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-doc">Available Consultant</Label>
                <Select id="book-doc" value={bookDocId} onChange={(e) => setBookDocId(e.target.value)} required>
                  {doctors.filter(d => d.department === bookDept).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  {doctors.filter(d => d.department === bookDept).length === 0 && (
                    <option value="">No doctors available in specialty</option>
                  )}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="book-date">Requested Date</Label>
                <Input id="book-date" type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} required className="text-xs h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-time">Preferred Time Slot</Label>
                <Select id="book-time" value={bookTime} onChange={(e) => setBookTime(e.target.value)}>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="01:00 PM">01:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-notes">Observation Notes / Symptoms</Label>
              <Textarea id="book-notes" placeholder="Describe symptoms or reasons for appointment..." value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} rows={3} required className="text-xs" />
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border mt-3 flex justify-between items-center">
              <span className="font-semibold text-muted-foreground">Standard Consultation Tariff:</span>
              <strong className="text-foreground text-xs">$150.00</strong>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowBookModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer" disabled={doctors.filter(d => d.department === bookDept).length === 0}>Request Booking</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}

export default function PatientPortal() {
  return (
    <Suspense fallback={<div className="text-sm font-semibold text-muted-foreground animate-pulse">Loading Patient Portal...</div>}>
      <PatientPortalContent />
    </Suspense>
  )
}
