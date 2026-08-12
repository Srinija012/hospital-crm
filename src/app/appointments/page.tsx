"use client"

import * as React from "react"
import {
  Calendar as CalendarIcon,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Clock,
  User,
  HeartPulse,
  Trash2,
  Edit2,
  AlertCircle
} from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  dbGetAppointments,
  dbSaveAppointment,
  dbDeleteAppointment,
  dbGetPatients,
  dbGetDoctors,
  getActiveRole,
  Appointment,
  Doctor,
  Patient
} from "@/lib/db"

export default function AppointmentsPage() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [activeRole, setActiveRole] = React.useState<string>("Anonymous")

  React.useEffect(() => {
    setActiveRole(getActiveRole())
  }, [])
  
  // Filtering states
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("All")
  const [deptFilter, setDeptFilter] = React.useState("All")
  const [dateFilter, setDateFilter] = React.useState("")
  
  // Views toggle: "table" | "calendar"
  const [currentView, setCurrentView] = React.useState<"table" | "calendar">("table")
  
  // Dialog states
  const [showBookModal, setShowBookModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null)
  
  // New/Edit Form states
  const [formPatientId, setFormPatientId] = React.useState("")
  const [formPatientName, setFormPatientName] = React.useState("")
  const [formDept, setFormDept] = React.useState("Cardiology")
  const [formDoctorId, setFormDoctorId] = React.useState("")
  const [formDate, setFormDate] = React.useState(new Date().toISOString().split("T")[0])
  const [formTimeSlot, setFormTimeSlot] = React.useState("09:00 AM")
  const [formNotes, setFormNotes] = React.useState("")
  const [formCost, setFormCost] = React.useState<number | string>(150)
  const [formStatus, setFormStatus] = React.useState<Appointment['status']>("Scheduled")
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
  const [confirmDeleteApt, setConfirmDeleteApt] = React.useState<string | null>(null)
  const toast = useToast()

  const clearErr = (f: string) => setFormErrors(p => { const n = { ...p }; delete n[f]; return n })

  // Load database
  const loadData = async () => {
    try {
      const apts = await dbGetAppointments()
      setAppointments(apts)
      const pats = await dbGetPatients()
      setPatients(pats)
      const docs = await dbGetDoctors()
      setDoctors(docs)
      
      // Set default doctor in form if doctors are loaded
      if (docs.length > 0) {
        const initialDoc = docs.find(d => d.department === formDept) || docs[0]
        setFormDoctorId(initialDoc.id)
      }
    } catch (err) {
      console.error("Failed to load appointments registry:", err)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  // Update selected doctor when department changes in form
  React.useEffect(() => {
    const filteredDocs = doctors.filter(d => d.department === formDept)
    if (filteredDocs.length > 0) {
      // Don't auto-reset if selected appointment is being loaded
      if (!showEditModal) {
        setFormDoctorId(filteredDocs[0].id)
      }
    }
  }, [formDept, doctors, showEditModal])

  // Filtered Appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesStatus = statusFilter === "All" || apt.status === statusFilter
    const matchesDept = deptFilter === "All" || apt.department === deptFilter
    const matchesDate = !dateFilter || apt.date === dateFilter

    return matchesSearch && matchesStatus && matchesDept && matchesDate
  })

  // Grouped for Calendar View (mocking next 7 days starting from today, June 8th, 2026)
  const calendarDays = [
    "2026-06-08",
    "2026-06-09",
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
    "2026-06-13",
    "2026-06-14"
  ]

  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:30 AM",
    "01:00 PM",
    "02:00 PM",
    "03:30 PM",
    "05:00 PM"
  ]

  const handleOpenBookModal = () => {
    setFormPatientId(patients[0]?.id || "")
    setFormPatientName(patients[0]?.name || "")
    setFormDept("Cardiology")
    setFormDate("2026-06-08")
    setFormTimeSlot("09:00 AM")
    setFormNotes("")
    setFormCost(150)
    setFormStatus("Scheduled")
    setShowBookModal(true)
  }

  const handleOpenEditModal = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setFormPatientId(apt.patientId)
    setFormPatientName(apt.patientName)
    setFormDept(apt.department)
    setFormDoctorId(apt.doctorId)
    setFormDate(apt.date)
    setFormTimeSlot(apt.timeSlot)
    setFormNotes(apt.notes)
    setFormCost(apt.cost)
    setFormStatus(apt.status)
    setShowEditModal(true)
  }

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!formPatientId && !formPatientName.trim()) errors.patient = "Please select a patient."
    if (!formDoctorId) errors.doctor = "Please assign a doctor."
    if (!formDate) errors.date = "Appointment date is required."
    const cost = Number(formCost)
    if (isNaN(cost) || cost < 0) errors.cost = "Cost must be a positive number."
    if (Object.keys(errors).length > 0) { setFormErrors(errors); toast.error("Please fix the highlighted errors."); return }
    
    // Resolve patient details
    let pName = formPatientName
    let pId = formPatientId
    if (pId) {
      const match = patients.find(p => p.id === pId)
      if (match) pName = match.name
    } else {
      pId = `pat-${patients.length + 1}`
    }

    // Resolve doctor details
    const doc = doctors.find(d => d.id === formDoctorId)
    const docName = doc ? doc.name : "Dr. Medical Staff"

    try {
      dbSaveAppointment({
        patientId: pId,
        patientName: pName,
        doctorId: formDoctorId,
        doctorName: docName,
        date: formDate,
        timeSlot: formTimeSlot,
        department: formDept,
        status: "Scheduled",
        notes: formNotes,
        cost: Number(formCost)
      }).then(() => {
        setShowBookModal(false)
        loadData()
        toast.success(`Appointment booked for ${pName} on ${formDate}.`)
      }).catch(err => toast.error(err.message))
    } catch { toast.error("Failed to book appointment. Please try again.") }
  }

  const handleUpdateAppointment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment) return
    const errors: Record<string, string> = {}
    if (!formDoctorId) errors.doctor = "Please assign a doctor."
    if (!formDate) errors.date = "Date is required."
    const cost = Number(formCost)
    if (isNaN(cost) || cost < 0) errors.cost = "Cost must be a positive number."
    if (Object.keys(errors).length > 0) { setFormErrors(errors); toast.error("Please fix the highlighted errors."); return }

    const doc = doctors.find(d => d.id === formDoctorId)
    const docName = doc ? doc.name : selectedAppointment.doctorName

    try {
      dbSaveAppointment({
        id: selectedAppointment.id,
        patientId: formPatientId,
        patientName: formPatientName,
        doctorId: formDoctorId,
        doctorName: docName,
        date: formDate,
        timeSlot: formTimeSlot,
        department: formDept,
        status: formStatus,
        notes: formNotes,
        cost: Number(formCost)
      }).then(() => {
        setShowEditModal(false)
        setSelectedAppointment(null)
        loadData()
        toast.success("Appointment updated successfully.")
      }).catch(err => toast.error(err.message))
    } catch { toast.error("Failed to update appointment.") }
  }

  const handleDeleteApt = (id: string) => {
    setConfirmDeleteApt(id)
  }

  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { weekday: 'short', month: 'numeric', day: 'numeric' })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("table")}
            className="flex items-center gap-1.5 text-xs h-9 cursor-pointer"
          >
            <List className="h-4 w-4" /> Table View
          </Button>
          <Button
            variant={currentView === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("calendar")}
            className="flex items-center gap-1.5 text-xs h-9 cursor-pointer"
          >
            <CalendarIcon className="h-4 w-4" /> Calendar Grid
          </Button>
        </div>

        {activeRole !== "Doctor" && (
          <Button onClick={handleOpenBookModal} size="sm" className="flex items-center gap-1.5 text-xs h-9 cursor-pointer">
            <Plus className="h-4.5 w-4.5" /> Book Consultation
          </Button>
        )}
      </div>

      {/* Filter panel */}
      <Card className="shadow-xs">
        <CardContent className="p-5 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient or physician..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Department */}
          <div className="w-[180px]">
            <Select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="All">All Departments</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
            </Select>
          </div>

          {/* Status */}
          <div className="w-[150px]">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>

          {/* Date Picker */}
          <div className="w-[160px]">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Reset button */}
          {(searchTerm || statusFilter !== "All" || deptFilter !== "All" || dateFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("All")
                setDeptFilter("All")
                setDateFilter("")
              }}
              className="text-xs text-primary hover:text-primary/80 h-9 font-semibold cursor-pointer"
            >
              Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Views Container */}
      {currentView === "table" ? (
        /* TABLE VIEW */
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
            <CardTitle className="text-sm font-bold">Appointment Ledger</CardTitle>
            <CardDescription className="text-xxs">Listing of matches based on selected filters ({filteredAppointments.length} found)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-left">
                    <th className="p-4">Patient</th>
                    <th className="p-4">Doctor</th>
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Cost</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <User className="h-4 w-4 text-muted-foreground/80" />
                            {apt.patientName}
                          </div>
                          <span className="text-xxs text-muted-foreground font-medium ml-5.5">ID: {apt.patientId}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <HeartPulse className="h-4 w-4 text-primary/80" />
                            {apt.doctorName}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold">{apt.date}</div>
                          <div className="text-xxs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {apt.timeSlot}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xxs">{apt.department}</Badge>
                        </td>
                        <td className="p-4 font-bold text-foreground/80">${apt.cost}</td>
                        <td className="p-4">
                          <Badge variant={apt.status.toLowerCase() as any}>
                            {apt.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => handleOpenEditModal(apt)}
                            title="Edit / Reschedule"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {(activeRole === "Clinic Admin" || activeRole === "Super Admin") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/80 cursor-pointer"
                              onClick={() => handleDeleteApt(apt.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                          <span className="text-sm font-semibold">No appointments found match those parameters.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* CALENDAR VIEW */
        <Card className="overflow-hidden border border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
            <CardTitle className="text-sm font-bold">Weekly Consultation Grid</CardTitle>
            <CardDescription className="text-xxs">Visual schedule matrix for days starting from June 8, 2026.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px] grid grid-cols-8 border-b border-border">
                {/* Time slot column heading */}
                <div className="p-3 bg-muted/40 font-semibold border-r border-border text-xxs text-muted-foreground text-center flex items-center justify-center">
                  Time Slot
                </div>
                {/* Day headings */}
                {calendarDays.map((day) => (
                  <div key={day} className="p-3 bg-muted/20 font-bold border-r border-border last:border-r-0 text-xxs text-center text-foreground flex flex-col items-center justify-center gap-0.5">
                    <span>{getDayLabel(day)}</span>
                    <span className="text-xxs text-muted-foreground font-semibold font-mono">{day.slice(5)}</span>
                  </div>
                ))}
              </div>

              {/* Slots Rows */}
              {timeSlots.map((slot) => (
                <div key={slot} className="min-w-[800px] grid grid-cols-8 border-b border-border last:border-b-0 hover:bg-muted/5 transition-colors">
                  {/* Time label */}
                  <div className="p-3 bg-muted/10 border-r border-border flex items-center justify-center text-xxs font-bold font-mono text-muted-foreground">
                    {slot}
                  </div>
                  {/* Calendar Cells */}
                  {calendarDays.map((day) => {
                    const cellApts = appointments.filter(
                      (a) => a.date === day && a.timeSlot === slot && a.status !== "Cancelled"
                    )

                    return (
                      <div
                        key={`${day}-${slot}`}
                        className="p-2 border-r border-border last:border-r-0 min-h-[90px] flex flex-col gap-1.5 relative group justify-center"
                      >
                        {cellApts.map((apt) => (
                          <div
                            key={apt.id}
                            onClick={() => handleOpenEditModal(apt)}
                            className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xxs text-primary font-semibold hover:bg-primary/20 transition-all cursor-pointer shadow-2xs hover:scale-102 flex flex-col justify-between"
                          >
                            <span className="font-bold truncate text-foreground/90">{apt.patientName}</span>
                            <span className="text-[10px] text-primary/80 truncate leading-tight mt-0.5">{apt.doctorName}</span>
                            <Badge variant={apt.status.toLowerCase() as any} className="text-[9px] px-1 py-0 scale-95 origin-left w-fit mt-1">
                              {apt.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      <Dialog open={showBookModal} onOpenChange={setShowBookModal}>
        <DialogHeader>
          <DialogTitle>Book Consultation Slot</DialogTitle>
          <DialogClose onClick={() => setShowBookModal(false)} />
        </DialogHeader>
        <form onSubmit={handleBookAppointment}>
          <DialogContent>
            {/* Patient dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="form-patient">Patient Registry</Label>
              {patients.length > 0 ? (
                <Select
                  id="form-patient"
                  value={formPatientId}
                  onChange={(e) => {
                    setFormPatientId(e.target.value)
                    const match = patients.find(p => p.id === e.target.value)
                    if (match) setFormPatientName(match.name)
                  }}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Age: {p.age}, ID: {p.id})</option>
                  ))}
                  <option value="">-- Manual Guest Entry --</option>
                </Select>
              ) : (
                <Input
                  id="form-patient"
                  placeholder="Enter guest patient name..."
                  value={formPatientName}
                  onChange={(e) => setFormPatientName(e.target.value)}
                  required
                />
              )}
            </div>

            {formPatientId && (() => {
              const patient = patients.find(p => p.id === formPatientId)
              if (!patient) return null
              const hasRisk = patient.preferredLanguage !== "English"
              if (!hasRisk) return null
              return (
                <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xxs text-amber-600 dark:text-amber-400 animate-in fade-in duration-200">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                  <div>
                    <strong className="font-bold">Proactive Compliance Notice:</strong> AI no-show risk index is <span className="text-rose-500 font-extrabold">Moderate (28%)</span> due to preferred contact language ({patient.preferredLanguage}). WhatsApp pre-consultation workflow triggers automatically on confirmation.
                  </div>
                </div>
              )
            })()}

            {/* Manual Patient Input (If Guest selected) */}
            {!formPatientId && (
              <div className="space-y-1.5">
                <Label htmlFor="form-patient-manual">Guest Name</Label>
                <Input
                  id="form-patient-manual"
                  placeholder="Enter guest patient name..."
                  value={formPatientName}
                  onChange={(e) => setFormPatientName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1.5">
                <Label htmlFor="form-dept">Clinical Specialty</Label>
                <Select
                  id="form-dept"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
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
                <Label htmlFor="form-doctor">Attending Physician</Label>
                <Select
                  id="form-doctor"
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                >
                  {doctors.filter(d => d.department === formDept).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.availability})</option>
                  ))}
                  {doctors.filter(d => d.department === formDept).length === 0 && (
                    <option value="">No doctors in this dept</option>
                  )}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="form-date">Consultation Date</Label>
                <Input
                  id="form-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              {/* Time slot */}
              <div className="space-y-1.5">
                <Label htmlFor="form-time">Appointment Slot</Label>
                <Select
                  id="form-time"
                  value={formTimeSlot}
                  onChange={(e) => setFormTimeSlot(e.target.value)}
                >
                  {timeSlots.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Cost */}
              <div className="space-y-1.5">
                <Label htmlFor="form-cost">Billing Tariff ($)</Label>
                <Input
                  id="form-cost"
                  type="number"
                  value={formCost}
                  onChange={(e) => setFormCost(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="form-notes">Diagnostic Rationale / Notes</Label>
              <Textarea
                id="form-notes"
                placeholder="Reason for visit, allergies, referral details..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBookModal(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer">Book Appointment</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* EDIT APPOINTMENT / RESCHEDULE MODAL */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogHeader>
          <DialogTitle>Modify Consultation Schedule</DialogTitle>
          <DialogClose onClick={() => setShowEditModal(false)} />
        </DialogHeader>
        {selectedAppointment && (
          <form onSubmit={handleUpdateAppointment}>
            <DialogContent>
              {/* Patient Details (Read Only) */}
              <div className="space-y-1">
                <span className="text-xxs font-bold text-muted-foreground uppercase tracking-wider">Patient Records File</span>
                <div className="text-sm font-bold text-foreground">{formPatientName} ({formPatientId})</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Department */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-dept">Clinical Specialty</Label>
                  <Select
                    id="edit-dept"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
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
                  <Label htmlFor="edit-doctor">Attending Physician</Label>
                  <Select
                    id="edit-doctor"
                    value={formDoctorId}
                    onChange={(e) => setFormDoctorId(e.target.value)}
                  >
                    {doctors.filter(d => d.department === formDept).map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.availability})</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date">Consultation Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                {/* Time slot */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-time">Appointment Slot</Label>
                  <Select
                    id="edit-time"
                    value={formTimeSlot}
                    onChange={(e) => setFormTimeSlot(e.target.value)}
                  >
                    {timeSlots.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-status">Consultation Status</Label>
                  <Select
                    id="edit-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </Select>
                </div>

                {/* Cost */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-cost">Billing Tariff ($)</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes">Diagnostic Rationale / Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Reason for visit..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </DialogContent>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="cursor-pointer">Save Changes</Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={!!confirmDeleteApt}
        title="Delete Appointment"
        message="Are you sure you want to permanently delete this appointment? This action cannot be undone."
        confirmLabel="Yes, Delete"
        cancelLabel="Keep Appointment"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteApt) {
            dbDeleteAppointment(confirmDeleteApt)
              .then(() => {
                loadData()
                toast.success("Appointment deleted.")
              })
              .catch(() => toast.error("Failed to delete appointment."))
          }
          setConfirmDeleteApt(null)
        }}
        onCancel={() => setConfirmDeleteApt(null)}
      />
    </div>
  )
}
