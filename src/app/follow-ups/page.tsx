"use client"

import * as React from "react"
import {
  Clock,
  Phone,
  MessageSquare,
  CheckCircle,
  CalendarDays,
  AlertCircle,
  Plus,
  Search,
  X,
  FileSpreadsheet,
  Download,
  Trash2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { jsPDF } from "jspdf"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import {
  dbGetFollowUps,
  dbCompleteFollowUp,
  dbDeleteFollowUp,
  dbSaveFollowUp,
  dbGetPatients,
  dbGetDoctors,
  dbAddCommunicationLog,
  getActiveRole,
  FollowUp,
  Patient,
  Doctor,
  translateMessage,
  getFollowUpMessageForPatient,
  isDefaultEnglishMessage
} from "@/lib/db"
import { WHATSAPP_API_URL } from "@/lib/utils"

export default function FollowUpsPage() {
  const toast = useToast()
  const [followups, setFollowups] = React.useState<FollowUp[]>([])
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [statusFilter, setStatusFilter] = React.useState("All")
  const [activeRole, setActiveRole] = React.useState<string>("Anonymous")
  const [currentUserName, setCurrentUserName] = React.useState<string>("")
  
  // Reschedule dialog states
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [selectedFup, setSelectedFup] = React.useState<FollowUp | null>(null)
  const [selectedPatientId, setSelectedPatientId] = React.useState("")
  const [followUpDateInput, setFollowUpDateInput] = React.useState("")
  const [followUpTimeInput, setFollowUpTimeInput] = React.useState("10:00")
  const [assignedDoctorId, setAssignedDoctorId] = React.useState("")
  const [customMsgInput, setCustomMsgInput] = React.useState("")
  const [followUpStatusInput, setFollowUpStatusInput] = React.useState<'Pending' | 'Contacted' | 'Completed' | 'Overdue'>("Pending")
  const [fupPhoneInput, setFupPhoneInput] = React.useState("")

  // Filter panel states
  const [searchTerm, setSearchTerm] = React.useState("")
  const [doctorFilter, setDoctorFilter] = React.useState("All")
  const [languageFilter, setLanguageFilter] = React.useState("All")
  const [dateFilterMode, setDateFilterMode] = React.useState("All")
  const [startDateFilter, setStartDateFilter] = React.useState("")
  const [endDateFilter, setEndDateFilter] = React.useState("")

  // Notification overlays
  const [activeNotification, setActiveNotification] = React.useState("")

  const loadData = async () => {
    try {
      setFollowups(await dbGetFollowUps())
      setPatients(await dbGetPatients())
      setDoctors(await dbGetDoctors())
    } catch (err) {
      console.error(err)
    }
  }

  // ── Export helpers ────────────────────────────────────────────
  const exportToCSV = (data: FollowUp[]) => {
    if (data.length === 0) return
    const headers = ["Patient Name", "Patient ID", "Phone", "Last Visit", "Follow-up Date", "Time", "Physician", "Status", "Custom Message"]
    const rows = data.map(f => [
      f.patientName, f.patientId, f.phone, f.lastVisitDate,
      f.followUpDate, f.followUpTime || "10:00", f.doctorName, f.status, f.customMessage || ""
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `followups_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToPDF = (data: FollowUp[]) => {
    if (data.length === 0) return
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 12
    const colWidths = [40, 28, 26, 26, 22, 36, 22, 60]
    const headers = ["Patient Name", "Phone", "Last Visit", "Follow-up Date", "Time", "Physician", "Status", "Message"]

    // Title
    pdf.setFontSize(14)
    pdf.setFont("helvetica", "bold")
    pdf.text("Follow-up Schedule Report", margin, 16)
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(100)
    pdf.text(`Generated: ${new Date().toLocaleString()} | Total Records: ${data.length}`, margin, 22)
    pdf.setTextColor(0)

    // Table header
    let y = 30
    pdf.setFillColor(240, 240, 248)
    pdf.rect(margin, y, pageWidth - margin * 2, 8, "F")
    pdf.setFontSize(7)
    pdf.setFont("helvetica", "bold")
    let x = margin
    headers.forEach((h, i) => { pdf.text(h, x + 1, y + 5.5); x += colWidths[i] })
    y += 8

    // Rows
    pdf.setFont("helvetica", "normal")
    data.forEach((f, idx) => {
      if (y > pageHeight - 20) {
        pdf.addPage()
        y = 20
      }
      if (idx % 2 === 0) { pdf.setFillColor(250, 250, 252); pdf.rect(margin, y, pageWidth - margin * 2, 8, "F") }
      const cells = [f.patientName, f.phone, f.lastVisitDate, f.followUpDate, f.followUpTime || "10:00", f.doctorName, f.status, f.customMessage || "—"]
      x = margin
      cells.forEach((cell, i) => {
        const text = String(cell ?? "")
        pdf.text(text.length > 18 ? text.slice(0, 17) + "…" : text, x + 1, y + 5.5)
        x += colWidths[i]
      })
      y += 8
    })

    pdf.save(`followups_${new Date().toISOString().split("T")[0]}.pdf`)
  }


  React.useEffect(() => {
    setActiveRole(getActiveRole())
    const stored = localStorage.getItem("active_user_session")
    if (stored) {
      const sess = JSON.parse(stored)
      setCurrentUserName(sess.name || "")
    }
    loadData()
  }, [])

  const handleComplete = async (id: string) => {
    try {
      await dbCompleteFollowUp(id)
      loadData()
      triggerNotice("Follow-up marked as Completed!")
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteFollowUp = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this follow-up record?")) return
    try {
      await dbDeleteFollowUp(id)
      loadData()
      triggerNotice("Follow-up record deleted successfully.")
    } catch (err: any) {
      toast.error("Failed to delete follow-up: " + err.message)
    }
  }

  const triggerNotice = (msg: string) => {
    setActiveNotification(msg)
    setTimeout(() => setActiveNotification(""), 3000)
  }

  const handleCall = (fup: FollowUp) => {
    triggerNotice(`Simulating phone call connection to ${fup.patientName} at ${fup.phone}...`)
  }

  // Auto-update customMsgInput to patient's language when patient OR date/doctor changes
  React.useEffect(() => {
    if (isEditing) return  // Don't auto-override when editing existing follow-up
    if (!selectedPatientId) return
    const pat = patients.find(p => p.id === selectedPatientId)
    if (!pat) return
    const docSelected = doctors.find(d => d.id === assignedDoctorId)
    const docName = docSelected ? docSelected.name : "your doctor"
    const date = followUpDateInput || new Date().toISOString().split("T")[0]
    const msg = getFollowUpMessageForPatient(pat, date, docName)
    setCustomMsgInput(msg)
  }, [selectedPatientId, followUpDateInput, assignedDoctorId])

  // WhatsApp reminder — always sends in patient's preferred language
  const handleWhatsAppReminder = (fup: FollowUp) => {
    const pat = patients.find(p => p.id === fup.patientId)
    const lang = pat ? pat.preferredLanguage : "English"

    // If customMessage is empty or matches the default English template, translate to preferred language
    let resolvedMsg = ""
    if (lang !== "English" && (!fup.customMessage || isDefaultEnglishMessage(fup.customMessage))) {
      resolvedMsg = translateMessage("follow_up_reminder", lang, {
        "Patient Name": fup.patientName,
        "Date": fup.followUpDate,
        "Doctor": fup.doctorName
      })
    } else {
      resolvedMsg = fup.customMessage
        ? fup.customMessage
        : translateMessage("follow_up_reminder", lang, {
            "Patient Name": fup.patientName,
            "Date": fup.followUpDate,
            "Doctor": fup.doctorName
          })
    }

    // Trigger WhatsApp API endpoint to actually send the message!
    fetch(`${WHATSAPP_API_URL}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fup.phone, text: resolvedMsg })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "WhatsApp API server returned an error.");
      }
      return res.json();
    })
    .then(() => {
      dbAddCommunicationLog(fup.patientId, {
        type: 'whatsapp',
        direction: 'sent',
        content: resolvedMsg,
        status: 'delivered'
      }).then(() => {
        dbSaveFollowUp({
          ...fup,
          status: 'Contacted'
        }).then(() => {
          loadData()
          triggerNotice(`✅ WhatsApp Reminder sent to ${fup.patientName} in ${lang}!`)
        }).catch((err) => {
          console.warn("Failed to update follow-up status:", err)
        })
      }).catch((err) => {
        console.warn("Failed to send WhatsApp reminder log:", err)
      })
    })
    .catch((err) => {
      console.warn("WhatsApp dispatch error (Falling back to offline log):", err.message);
      // Fallback: log locally and mark status contacted anyway so clinical tasks don't block
      dbAddCommunicationLog(fup.patientId, {
        type: 'whatsapp',
        direction: 'sent',
        content: resolvedMsg,
        status: 'sent'
      }).then(() => {
        dbSaveFollowUp({
          ...fup,
          status: 'Contacted'
        }).then(() => {
          loadData()
          triggerNotice(`⚠️ WhatsApp sent offline (logged locally). Status updated to Contacted.`)
        }).catch((err) => {
          console.warn("Failed to update follow-up status:", err)
        })
      }).catch((err) => {
        console.warn("Failed to send WhatsApp reminder log:", err)
      })
    })
  }

  const handleFupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Find selected patient details if creating
    const pat = patients.find(p => p.id === selectedPatientId)
    if (!pat && !isEditing) return

    const resolvedPatientId = isEditing && selectedFup ? selectedFup.patientId : selectedPatientId
    const resolvedPatientName = isEditing && selectedFup ? selectedFup.patientName : (pat ? pat.name : "Unknown Patient")
    const resolvedAge = isEditing && selectedFup ? selectedFup.age : (pat ? pat.age : 30)

    // Resolve doctor name
    const docSelected = doctors.find(d => d.id === assignedDoctorId)
    const docName = docSelected ? docSelected.name : "Unassigned Staff"

    dbSaveFollowUp({
      id: isEditing && selectedFup ? selectedFup.id : undefined,
      patientId: resolvedPatientId,
      patientName: resolvedPatientName,
      age: resolvedAge,
      phone: fupPhoneInput || (pat ? pat.phone : ""),
      lastVisitDate: isEditing && selectedFup ? selectedFup.lastVisitDate : new Date().toISOString().split("T")[0],
      followUpDate: followUpDateInput,
      followUpTime: followUpTimeInput,
      doctorId: assignedDoctorId,
      doctorName: docName,
      status: followUpStatusInput,
      customMessage: customMsgInput
    }).then(() => {
      setShowEditModal(false)
      setSelectedFup(null)
      setIsEditing(false)
      
      // Clear inputs
      setSelectedPatientId("")
      setFollowUpDateInput("")
      setFollowUpTimeInput("10:00")
      setAssignedDoctorId("")
      setCustomMsgInput("")
      setFupPhoneInput("")
      setFollowUpStatusInput("Pending")
      
      loadData()
      triggerNotice(isEditing ? "Follow-up edited successfully." : "Follow-up created successfully.")
    }).catch(err => toast.error("Failed to save follow-up: " + err.message))
  }

  // Urgency indicator logic: Red = Overdue, Orange = Today, Green = Upcoming
  const getFupUrgency = (fup: FollowUp) => {
    if (fup.status === 'Completed') return 'completed'
    if (fup.status === 'Contacted') return 'contacted'
    
    const todayStr = new Date().toISOString().split('T')[0]
    
    if (fup.followUpDate < todayStr) return 'overdue'
    if (fup.followUpDate === todayStr) return 'today'
    return 'upcoming'
  }

  const getUrgencyRowClass = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return 'border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10'
      case 'today':
        return 'border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10'
      case 'upcoming':
        return 'border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
      case 'contacted':
        return 'border-l-4 border-l-sky-500 bg-sky-50/10 dark:bg-sky-950/5'
      default:
        return 'border-l-4 border-l-muted'
    }
  }

  const filteredFollowUps = followups.filter(f => {
    // 1. Status Filter
    if (statusFilter !== "All") {
      if (statusFilter === "Pending") {
        if (f.status !== "Pending" && f.status !== "Overdue") return false
      } else {
        if (f.status !== statusFilter) return false
      }
    }

    // 2. Search Term Filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase()
      const matchesName = f.patientName.toLowerCase().includes(term)
      const matchesDoc = f.doctorName.toLowerCase().includes(term)
      const matchesPhone = f.phone.includes(term)
      const matchesMsg = f.customMessage ? f.customMessage.toLowerCase().includes(term) : false
      if (!matchesName && !matchesDoc && !matchesPhone && !matchesMsg) return false
    }

    // 3. Doctor Filter
    if (doctorFilter !== "All") {
      if (f.doctorId !== doctorFilter && f.doctorName !== doctorFilter) return false
    }

    // 4. Language Filter
    if (languageFilter !== "All") {
      const pat = patients.find(p => p.id === f.patientId)
      if (!pat || pat.preferredLanguage !== languageFilter) return false
    }

    // 5. Date Filter Mode
    if (dateFilterMode !== "All") {
      const fDateStr = f.followUpDate // YYYY-MM-DD
      if (dateFilterMode === "Today") {
        if (fDateStr !== "2026-06-08") return false
      } else if (dateFilterMode === "Tomorrow") {
        if (fDateStr !== "2026-06-09") return false
      } else if (dateFilterMode === "ThisWeek") {
        if (fDateStr < "2026-06-08" || fDateStr > "2026-06-14") return false
      } else if (dateFilterMode === "Custom") {
        if (startDateFilter !== "" && fDateStr < startDateFilter) return false
        if (endDateFilter !== "" && fDateStr > endDateFilter) return false
      }
    }

    return true
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alert toast info */}
      {activeNotification && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold text-primary">
          <CheckCircle className="h-4.5 w-4.5 animate-pulse" /> {activeNotification}
        </div>
      )}

      {/* Filter Roster Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-foreground">Follow-up Dashboard</h3>
          <p className="text-xxs text-muted-foreground font-medium mt-0.5">Manage patient clinical checkups and outreach reminders.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeRole !== 'Patient' && (
            <Button
              onClick={() => {
                setIsEditing(false)
                setSelectedFup(null)
                setSelectedPatientId(patients[0]?.id || "")
                setFollowUpDateInput(new Date().toISOString().split("T")[0])
                setFollowUpTimeInput("10:00")
                setAssignedDoctorId(doctors[0]?.id || "")
                setCustomMsgInput("")
                setFupPhoneInput(patients[0]?.phone || "")
                setFollowUpStatusInput("Pending")
                setShowEditModal(true)
              }}
              size="sm"
              className="h-9 text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" /> Schedule Outreach
            </Button>
          )}

          <div className="w-[180px]">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="All">All Follow-ups</option>
              <option value="Pending">Active / Overdue</option>
              <option value="Completed">Completed</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Search & Filter Card */}
      <Card className="border border-border/50 shadow-2xs bg-card/60 backdrop-blur-md">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-1/3">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/75">
                <Search className="h-4 w-4" />
              </span>
              <Input
                type="text"
                placeholder="Search patient, doctor, phone, msg..."
                className="pl-9 pr-4 h-9 text-xs w-full bg-muted/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Quick date selectors */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-xxs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date:</span>
              {[
                { label: "All Dates", value: "All" },
                { label: "Today", value: "Today" },
                { label: "Tomorrow", value: "Tomorrow" },
                { label: "This Week", value: "ThisWeek" },
                { label: "Custom Range", value: "Custom" }
              ].map((d) => (
                <Button
                  key={d.value}
                  variant={dateFilterMode === d.value ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-[10px] font-semibold px-3 cursor-pointer whitespace-nowrap"
                  onClick={() => {
                    setDateFilterMode(d.value)
                    if (d.value !== "Custom") {
                      setStartDateFilter("")
                      setEndDateFilter("")
                    }
                  }}
                >
                  {d.label}
                </Button>
              ))}
            </div>

            {/* Reset Filters button */}
            {(searchTerm || doctorFilter !== "All" || languageFilter !== "All" || dateFilterMode !== "All" || statusFilter !== "All") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[10px] text-destructive hover:text-destructive/80 hover:bg-destructive/10 cursor-pointer flex items-center gap-1"
                onClick={() => {
                  setSearchTerm("")
                  setDoctorFilter("All")
                  setLanguageFilter("All")
                  setDateFilterMode("All")
                  setStartDateFilter("")
                  setEndDateFilter("")
                  setStatusFilter("All")
                }}
              >
                <X className="h-3.5 w-3.5" /> Clear Filters
              </Button>
            )}

            {/* Export buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-semibold px-3 cursor-pointer flex items-center gap-1.5"
                onClick={() => {
                  if (filteredFollowUps.length === 0) return
                  exportToCSV(filteredFollowUps)
                }}
                title="Export filtered follow-ups as CSV (opens in Excel)"
                disabled={filteredFollowUps.length === 0}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-semibold px-3 cursor-pointer flex items-center gap-1.5"
                onClick={() => {
                  if (filteredFollowUps.length === 0) return
                  exportToPDF(filteredFollowUps)
                }}
                title="Export filtered follow-ups as PDF"
                disabled={filteredFollowUps.length === 0}
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* Expanded filter options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border/30">
            {/* Language filter */}
            <div className="space-y-1">
              <Label className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">Preferred Language</Label>
              <Select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="All">All Languages</option>
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

            {/* Doctor filter */}
            <div className="space-y-1">
              <Label className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">Assigned Doctor</Label>
              <Select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="All">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                ))}
              </Select>
            </div>

            {/* Custom start date (only when dateFilterMode is Custom) */}
            {dateFilterMode === "Custom" && (
              <>
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">End Date</Label>
                  <Input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ledger Card */}
      <Card className="overflow-hidden border border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Patient Follow-up Schedule</CardTitle>
            <CardDescription className="text-xxs">Urgency codes: <span className="text-rose-500 font-bold">Red (Overdue)</span>, <span className="text-amber-500 font-bold">Orange (Today)</span>, <span className="text-emerald-500 font-bold">Green (Upcoming)</span></CardDescription>
          </div>
          <Badge variant="outline" className="text-xxs">{filteredFollowUps.length} matches</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-left">
                  <th className="p-4 pl-6">Patient Name</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Last Visit</th>
                  <th className="p-4">Follow-up Date</th>
                  <th className="p-4">Physician</th>
                  <th className="p-4">Urgency Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowUps.length > 0 ? (
                  filteredFollowUps.map(f => {
                    const urgency = getFupUrgency(f)
                    return (
                      <tr
                        key={f.id}
                        className={`border-b border-border/60 hover:bg-muted/10 transition-colors ${getUrgencyRowClass(urgency)}`}
                        style={f.status === 'Completed' ? { filter: 'grayscale(100%)', opacity: 0.6 } : undefined}
                      >
                        <td className="p-4 pl-6">
                          <div className="font-bold text-foreground">{f.patientName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">Age: {f.age} yrs</span>
                            {(() => {
                              const pat = patients.find(p => p.id === f.patientId)
                              const lang = pat?.preferredLanguage
                              if (!lang || lang === "English") return null
                              const langColors: Record<string, string> = {
                                Telugu: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                                Hindi: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                Tamil: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                Kannada: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                                Malayalam: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
                                Marathi: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
                                Bengali: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
                                Punjabi: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              }
                              return (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${langColors[lang] || "bg-muted text-muted-foreground"}`}>
                                  🌐 {lang}
                                </span>
                              )
                            })()}
                          </div>
                          {f.customMessage && (
                            <span className="text-[10px] text-primary/80 font-medium italic block mt-0.5 max-w-[240px] truncate" title={f.customMessage}>
                              💬 {f.customMessage}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-foreground/80">{f.phone}</td>
                        <td className="p-4 text-muted-foreground">{f.lastVisitDate}</td>
                        <td className="p-4 font-bold text-foreground/85">
                          <div>{f.followUpDate}</div>
                          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {f.followUpTime || "10:00"}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-muted-foreground">{f.doctorName}</td>
                        <td className="p-4">
                          <Badge
                            variant={
                              urgency === 'completed'
                                ? 'completed'
                                : urgency === 'contacted'
                                ? 'confirmed' // Sky Blue
                                : urgency === 'overdue'
                                ? 'cancelled'
                                : urgency === 'today'
                                ? 'inprogress'
                                : 'scheduled'
                            }
                          >
                            {urgency === 'overdue' 
                              ? 'Overdue' 
                              : urgency === 'today' 
                              ? 'Today' 
                              : urgency === 'completed' 
                              ? 'Completed' 
                              : urgency === 'contacted' 
                              ? 'Contacted' 
                              : 'Upcoming'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right space-x-1.5 flex items-center justify-end">
                          {f.status !== "Completed" ? (
                            <>
                              {/* WhatsApp reminder - available to Receptionist, Admin, Doctor */}
                              {(activeRole !== "Patient") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg cursor-pointer"
                                  onClick={() => handleWhatsAppReminder(f)}
                                  title="Send WhatsApp alert"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Phone call simulation - Receptionist & Admin */}
                              {(activeRole === "Receptionist" || activeRole === "Clinic Admin" || activeRole === "Super Admin") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-secondary hover:text-secondary/80 hover:bg-secondary/10 rounded-lg cursor-pointer"
                                  onClick={() => handleCall(f)}
                                  title="Call patient"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Reschedule - Receptionist & Admin */}
                              {(activeRole === "Receptionist" || activeRole === "Clinic Admin" || activeRole === "Super Admin") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg cursor-pointer"
                                  onClick={() => {
                                    setSelectedFup(f)
                                    setSelectedPatientId(f.patientId)
                                    setFollowUpDateInput(f.followUpDate)
                                    setFollowUpTimeInput(f.followUpTime || "10:00")
                                    setAssignedDoctorId(f.doctorId || "")
                                    setCustomMsgInput(f.customMessage || "")
                                    setFupPhoneInput(f.phone || "")
                                    setFollowUpStatusInput(f.status || "Pending")
                                    setIsEditing(true)
                                    setShowEditModal(true)
                                  }}
                                  title="Edit Follow-up"
                                >
                                  <CalendarDays className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Complete - Doctor for own patients, Receptionist & Admin for all */}
                              {(activeRole === "Clinic Admin" || activeRole === "Super Admin" || activeRole === "Receptionist" ||
                                (activeRole === "Doctor" && f.doctorName === currentUserName)) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-500 hover:text-emerald-500/80 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                  onClick={() => handleComplete(f.id)}
                                  title="Mark completed"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Checked Off
                            </span>
                          )}

                          {/* Delete Follow-up Log - Clinic Admin & Super Admin */}
                          {(activeRole === "Clinic Admin" || activeRole === "Super Admin") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-500/80 hover:bg-rose-500/10 rounded-lg cursor-pointer ml-1"
                              onClick={() => handleDeleteFollowUp(f.id)}
                              title="Delete follow-up log"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                        <span className="text-sm font-semibold">No follow-ups matches that parameters.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* OUTREACH DIALOG */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open)
        if (!open) {
          setIsEditing(false)
          setSelectedFup(null)
          setSelectedPatientId("")
          setFollowUpDateInput("")
          setFollowUpTimeInput("10:00")
          setAssignedDoctorId("")
          setCustomMsgInput("")
          setFupPhoneInput("")
          setFollowUpStatusInput("Pending")
        }
      }}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Follow-up Outreach" : "Schedule New Outreach"}</DialogTitle>
          <DialogClose onClick={() => setShowEditModal(false)} />
        </DialogHeader>
        <form onSubmit={handleFupSubmit} className="space-y-4 text-xs">
          <DialogContent>
            {isEditing && selectedFup ? (
              <div className="space-y-1">
                <span className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">Patient Records File</span>
                <div className="text-sm font-bold text-foreground">{selectedFup.patientName} ({selectedFup.patientId})</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="fup-patient">Select Patient</Label>
                <Select
                  id="fup-patient"
                  value={selectedPatientId}
                  onChange={(e) => {
                    const patId = e.target.value
                    setSelectedPatientId(patId)
                    const selectedPat = patients.find(p => p.id === patId)
                    if (selectedPat) {
                      setFupPhoneInput(selectedPat.phone)
                    }
                  }}
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fup-phone">Contact Phone</Label>
                <Input
                  id="fup-phone"
                  placeholder="e.g. +1234567890"
                  value={fupPhoneInput}
                  onChange={(e) => setFupPhoneInput(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fup-doctor">Assigned Physician</Label>
                <Select
                  id="fup-doctor"
                  value={assignedDoctorId}
                  onChange={(e) => setAssignedDoctorId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fup-date">Follow-up Date</Label>
                <Input
                  id="fup-date"
                  type="date"
                  value={followUpDateInput}
                  onChange={(e) => setFollowUpDateInput(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fup-time">Dispatch Time</Label>
                <Input
                  id="fup-time"
                  type="time"
                  value={followUpTimeInput}
                  onChange={(e) => setFollowUpTimeInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fup-status">Follow-up Status</Label>
                <Select
                  id="fup-status"
                  value={followUpStatusInput}
                  onChange={(e) => setFollowUpStatusInput(e.target.value as any)}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fup-message">Custom Message Override (Optional)</Label>
              <Textarea
                id="fup-message"
                placeholder="e.g. Hello {Patient Name}, this is a reminder for your upcoming follow-up."
                value={customMsgInput}
                onChange={(e) => setCustomMsgInput(e.target.value)}
                rows={3}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">{isEditing ? "Save Changes" : "Create Follow-up"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
