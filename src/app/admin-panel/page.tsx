"use client"

import * as React from "react"
import {
  Users,
  DollarSign,
  UserCheck,
  CalendarCheck,
  CheckCircle,
  AlertCircle,
  CreditCard,
  UserX,
  Stethoscope,
  Smile,
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  Building,
  Globe,
  Server
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  dbSaveDoctor,
  dbDeleteDoctor,
  dbSaveDoctorAttendance,
  dbPayDoctorSalary,
  dbUnpayDoctorSalary,
  dbSaveClinic,
  dbDeleteClinic,
  getActiveRole,
  dbEnforceRole,
  Doctor,
  AuditLogEntry,
  ClinicOrg
} from "@/lib/db"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/database"

export default function AdminPanelPage() {
  const [activeRole, setActiveRole] = React.useState<string>("Anonymous")
  const [activeNotification, setActiveNotification] = React.useState("")

  // Staff Form state
  const [showStaffModal, setShowStaffModal] = React.useState(false)
  const [editingStaff, setEditingStaff] = React.useState<Doctor | null>(null)
  const [sName, setSName] = React.useState("")
  const [sEmail, setSEmail] = React.useState("")
  const [sSpecialty, setSSpecialty] = React.useState("")
  const [sDept, setSDept] = React.useState("Cardiology")
  const [sSalary, setSSalary] = React.useState(5000)
  const [sRole, setSRole] = React.useState<'Administrator' | 'Physician' | 'Receptionist'>("Physician")
  const [sAvailability, setSAvailability] = React.useState<'Available' | 'Busy' | 'On Leave'>("Available")

  // Clinic Form state
  const [showClinicModal, setShowClinicModal] = React.useState(false)
  const [editingClinic, setEditingClinic] = React.useState<ClinicOrg | null>(null)
  const [cName, setCDomain] = React.useState("") // Note: cName used for domain in form? We keep name/domain states
  const [cNameText, setCNameText] = React.useState("") // text for name
  const [cPlan, setCPlan] = React.useState<'Trial' | 'Professional' | 'Enterprise'>("Trial")
  const [cStatus, setCStatus] = React.useState<'Active' | 'Suspended'>("Active")

  // Reset clinic states specifically
  const [cDomainState, setCDomainState] = React.useState("")

  const [seeding, setSeeding] = React.useState(false)

  const handleSeedPatients = async () => {
    setSeeding(true)
    triggerNotice("Starting database seeding (10,000 patients)...")
    const startTime = performance.now()
    
    const chunkSize = 1000
    const totalPatients = 10000
    
    try {
      for (let i = 0; i < totalPatients; i += chunkSize) {
        const patientsChunk: any[] = []
        for (let j = 0; j < chunkSize; j++) {
          const idNum = i + j + 1
          const patientId = `pat-seed-${idNum}`
          patientsChunk.push({
            id: patientId,
            name: `Patient Seed ${idNum}`,
            age: 20 + (idNum % 60),
            gender: idNum % 2 === 0 ? "Male" : "Female",
            dob: "1990-01-01",
            phone: `+919900${String(idNum).padStart(6, '0')}`,
            alternatePhone: "",
            email: `patient.seed.${idNum}@example.com`,
            addressInfo: { address: "123 Seed St", city: "Hyderabad", state: "TS", country: "India", pincode: "500001" },
            bloodGroup: "O+",
            existingConditions: idNum % 5 === 0 ? "Diabetes" : "None",
            allergies: idNum % 7 === 0 ? "Penicillin" : "None",
            doctorAssignedId: "doc-1",
            doctorAssignedName: "Dr. Sarah Connor",
            preferredLanguage: "English",
            preferredContactMethod: "WhatsApp",
            whatsappOptIn: true,
            lastVisit: "2026-06-11",
            vitals: [],
            medicalHistory: [],
            prescriptions: [],
            communications: [],
            enableAutomatedFollowUp: false,
            archived: false,
            createdAt: new Date().toISOString()
          })
        }
        await db.patients.bulkAdd(patientsChunk)
      }
      const endTime = performance.now()
      const timeTakenSec = ((endTime - startTime) / 1000).toFixed(2)
      triggerNotice(`Successfully seeded 10,000 patients in ${timeTakenSec} seconds!`)
    } catch (err: any) {
      console.error(err)
      triggerNotice(`Seeding failed: ${err.message}`)
    } finally {
      setSeeding(false)
    }
  }

  const staffList = useLiveQuery(async () => {
    const list = await db.doctors.toArray()
    list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }) || []

  const auditLogs = useLiveQuery(async () => {
    try {
      dbEnforceRole(['Clinic Admin', 'Super Admin'])
      const list = await db.auditLogs.toArray()
      list.sort((a, b) => b.id.localeCompare(a.id))
      return list
    } catch {
      return []
    }
  }, [activeRole]) || []

  const clinics = useLiveQuery(async () => {
    const role = getActiveRole()
    if (role === "Super Admin") {
      const record = await db.appSettings.get('h_clinics_up')
      return record ? record.value as ClinicOrg[] : []
    }
    return []
  }, [activeRole]) || []

  React.useEffect(() => {
    const role = getActiveRole()
    setActiveRole(role)
  }, [])

  const triggerNotice = (msg: string) => {
    setActiveNotification(msg)
    setTimeout(() => setActiveNotification(""), 3000)
  }

  // Attendance controls: mark Present (+1%), Absent (-2%), Sick Leave (no change)
  const handleMarkAttendance = async (id: string, name: string, status: 'Present' | 'Absent' | 'Sick Leave') => {
    const staff = staffList.find(s => s.id === id)
    if (!staff) return

    let nextRate = staff.attendanceRate
    if (status === 'Present') {
      nextRate = Math.min(100, staff.attendanceRate + 1)
    } else if (status === 'Absent') {
      nextRate = Math.max(0, staff.attendanceRate - 2)
    }

    await dbSaveDoctorAttendance(id, nextRate)
    triggerNotice(`Logged ${name} as ${status}. Updated attendance rate: ${nextRate}%`)
  }

  // Salary control
  const handleProcessSalary = async (id: string, name: string) => {
    await dbPayDoctorSalary(id)
    triggerNotice(`Salary payment processed successfully for ${name}!`)
  }

  const handleResetSalary = async (id: string, name: string) => {
    await dbUnpayDoctorSalary(id)
    triggerNotice(`Salary payment status reset to Unpaid for ${name}.`)
  }

  // Staff management operations
  const handleOpenAddStaff = () => {
    setEditingStaff(null)
    setSName("")
    setSEmail("")
    setSSpecialty("General Practitioner")
    setSDept("Cardiology")
    setSSalary(6000)
    setSRole("Physician")
    setSAvailability("Available")
    setShowStaffModal(true)
  }

  const handleOpenEditStaff = (staff: Doctor) => {
    setEditingStaff(staff)
    setSName(staff.name)
    setSEmail(staff.email)
    setSSpecialty(staff.specialty)
    setSDept(staff.department)
    setSSalary(staff.salary || 0)
    setSRole(staff.role)
    setSAvailability(staff.availability)
    setShowStaffModal(true)
  }

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    await dbSaveDoctor({
      id: editingStaff?.id,
      name: sName,
      email: sEmail,
      specialty: sSpecialty,
      department: sDept,
      salary: Number(sSalary),
      role: sRole,
      availability: sAvailability,
      avatar: editingStaff?.avatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120",
      activePatients: editingStaff?.activePatients || 0,
      attendanceRate: editingStaff?.attendanceRate || 100,
      salaryStatus: editingStaff?.salaryStatus || 'Unpaid'
    })
    setShowStaffModal(false)
    triggerNotice(editingStaff ? `Staff details for ${sName} updated successfully!` : `New staff member ${sName} registered!`)
  }

  const handleDeleteStaff = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove staff member ${name}?`)) {
      await dbDeleteDoctor(id)
      triggerNotice(`Staff member ${name} deleted successfully.`)
    }
  }

  const handleOpenAddClinic = () => {
    setEditingClinic(null)
    setCNameText("")
    setCDomain("")
    setCPlan("Trial")
    setCStatus("Active")
    setShowClinicModal(true)
  }

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault()
    await dbSaveClinic({
      id: editingClinic?.id,
      name: cNameText,
      domain: cName, // form maps domain to cName state in old code
      subscriptionPlan: cPlan,
      status: cStatus,
      createdAt: editingClinic?.createdAt || new Date().toISOString().split("T")[0]
    })
    setShowClinicModal(false)
    triggerNotice(editingClinic ? `Organization details for ${cNameText} updated!` : `New Clinic Organization registered successfully!`)
  }

  const handleDeleteClinic = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete clinic organization ${name}? This will suspend all its users.`)) {
      await dbDeleteClinic(id)
      triggerNotice(`Clinic organization ${name} deleted.`)
    }
  }

  const handleToggleClinicStatus = async (clinic: ClinicOrg) => {
    const nextStatus = clinic.status === "Active" ? "Suspended" : "Active"
    await dbSaveClinic({
      ...clinic,
      status: nextStatus
    })
    triggerNotice(`Clinic ${clinic.name} subscription status updated to ${nextStatus}.`)
  }

  // Financial Payroll KPIs
  const totalStaffCount = staffList.length
  const totalPayrollCost = staffList.reduce((sum, curr) => sum + (curr.salary || 0), 0)
  
  const unpaidStaff = staffList.filter(s => (s.salaryStatus || 'Unpaid') === "Unpaid")
  const unpaidPayrollCost = unpaidStaff.reduce((sum, curr) => sum + (curr.salary || 0), 0)
  
  const avgAttendance = staffList.length > 0 
    ? (staffList.reduce((sum, curr) => sum + curr.attendanceRate, 0) / staffList.length).toFixed(1) 
    : "0"

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toast Alert Notice */}
      {activeNotification && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold text-primary">
          <CheckCircle className="h-4.5 w-4.5 animate-pulse" /> {activeNotification}
        </div>
      )}

      {/* KPI stats cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <Card className="relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payroll Expense</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayrollCost.toLocaleString()}/mo</div>
            <p className="text-xxs text-muted-foreground font-semibold mt-1">Total base wages for {totalStaffCount} staff</p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outstanding Wages</CardTitle>
            <CreditCard className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">${unpaidPayrollCost.toLocaleString()}</div>
            <p className="text-xxs text-muted-foreground font-semibold mt-1">Pending payments for {unpaidStaff.length} staff</p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attendance Rate</CardTitle>
            <CalendarCheck className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{avgAttendance}%</div>
            <p className="text-xxs text-muted-foreground font-semibold mt-1">Monthly clinic average</p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Shifts</CardTitle>
            <UserCheck className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffList.filter(s => s.availability === "Available").length} On-Duty</div>
            <p className="text-xxs text-muted-foreground font-semibold mt-1">Physicians ready for consults</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Roster & Payroll Tabs */}
      <Tabs defaultValue="attendance">
        <TabsList className={`grid ${activeRole === 'Super Admin' ? 'grid-cols-4 w-[600px]' : 'grid-cols-3 w-[450px]'} max-w-full bg-muted/60 text-xxs mb-6`}>
          <TabsTrigger value="attendance">Shift Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Wages & Payroll</TabsTrigger>
          <TabsTrigger value="audit">HIPAA Audit Trails</TabsTrigger>
          {activeRole === "Super Admin" && <TabsTrigger value="organizations">Platform Organizations</TabsTrigger>}
        </TabsList>

        {/* Tab 1: Shift Attendance */}
        <TabsContent value="attendance">
          <Card className="overflow-hidden border border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Staff Attendance Log</CardTitle>
                <CardDescription className="text-xxs">Record daily attendance, affecting monthly stats.</CardDescription>
              </div>
              <Button onClick={handleOpenAddStaff} size="sm" className="h-8 text-xxs flex items-center gap-1 cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Add Staff Member
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-left">
                      <th className="p-4 pl-6">Staff Profile</th>
                      <th className="p-4">Department & Role</th>
                      <th className="p-4">Availability</th>
                      <th className="p-4">Attendance Rate</th>
                      <th className="p-4">Log Today's Roster</th>
                      <th className="p-4 text-right pr-6">Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className="h-9 w-9 rounded-xl object-cover border border-border bg-muted"
                          />
                          <div>
                            <div className="font-bold text-foreground">{staff.name}</div>
                            <span className="text-[10px] text-muted-foreground">{staff.email}</span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-foreground/80">
                          <div>{staff.department}</div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">{staff.role}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant={staff.availability === "Available" ? "completed" : staff.availability === "Busy" ? "inprogress" : "cancelled"}>
                            {staff.availability}
                          </Badge>
                        </td>
                        <td className="p-4 font-extrabold">
                          <div className="flex items-center gap-1.5">
                            <span className={staff.attendanceRate >= 90 ? "text-emerald-500" : staff.attendanceRate >= 80 ? "text-amber-500" : "text-rose-500"}>
                              {staff.attendanceRate}%
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div
                                  className={`h-full ${staff.attendanceRate >= 90 ? "bg-emerald-500" : staff.attendanceRate >= 80 ? "bg-amber-500" : "bg-rose-500"}`}
                                  style={{ width: `${staff.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xxs font-semibold text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                            onClick={() => handleMarkAttendance(staff.id, staff.name, 'Present')}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Present
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xxs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            onClick={() => handleMarkAttendance(staff.id, staff.name, 'Absent')}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" /> Absent
                          </Button>
                        </td>
                        <td className="p-4 text-right pr-6 space-x-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => handleOpenEditStaff(staff)}
                            title="Edit Profile"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/80 cursor-pointer"
                            onClick={() => handleDeleteStaff(staff.id, staff.name)}
                            title="Delete Staff"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Wages & Payroll */}
        <TabsContent value="payroll">
          <Card className="overflow-hidden border border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-sm font-bold">Payroll Wages Registry</CardTitle>
              <CardDescription className="text-xxs">Process monthly salaries and record financial disbursements.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-left">
                      <th className="p-4 pl-6">Staff Profile</th>
                      <th className="p-4">Clearance Role</th>
                      <th className="p-4">Monthly Base Salary</th>
                      <th className="p-4">Salary Status</th>
                      <th className="p-4 text-right pr-6">Payroll Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className="h-9 w-9 rounded-xl object-cover border border-border bg-muted"
                          />
                          <div>
                            <div className="font-bold text-foreground">{staff.name}</div>
                            <span className="text-[10px] text-muted-foreground">{staff.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xxs">{staff.role}</Badge>
                        </td>
                        <td className="p-4 font-extrabold text-foreground/80">${(staff.salary || 0).toLocaleString()}</td>
                        <td className="p-4">
                          <Badge variant={(staff.salaryStatus || 'Unpaid').toLowerCase() === 'paid' ? 'completed' : 'inprogress'}>
                            {staff.salaryStatus || 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right pr-6">
                          {(staff.salaryStatus || 'Unpaid') === "Unpaid" ? (
                            <Button
                              size="sm"
                              className="h-8 text-xxs font-bold cursor-pointer"
                              onClick={() => handleProcessSalary(staff.id, staff.name)}
                            >
                              <DollarSign className="h-3.5 w-3.5 mr-1" /> Process Salary
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xxs font-semibold cursor-pointer border-dashed"
                              onClick={() => handleResetSalary(staff.id, staff.name)}
                            >
                              Reset status
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: HIPAA Access Audit Logs */}
        <TabsContent value="audit">
          <Card className="overflow-hidden border border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-primary" /> HIPAA Security Audit Trail
              </CardTitle>
              <CardDescription className="text-xxs">Searchable access logs showing which clinical staff retrieved patient folders or updated records.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-left">
                      <th className="p-4 pl-6">Access Timestamp</th>
                      <th className="p-4">Staff Operator</th>
                      <th className="p-4">Clearance Role</th>
                      <th className="p-4">Target Patient</th>
                      <th className="p-4 text-right pr-6">Action Event Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length > 0 ? (
                      auditLogs
                        .filter(log => activeRole === "Super Admin" || !!log.patientId)
                        .map((log) => (
                          <tr key={log.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                            <td className="p-4 pl-6 font-mono text-muted-foreground">{log.timestamp}</td>
                            <td className="p-4 font-bold text-foreground">{log.staffName}</td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-xxs uppercase">{log.staffRole}</Badge>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-foreground/80">{log.patientName}</div>
                              <span className="text-[10px] text-muted-foreground">ID: {log.patientId}</span>
                            </td>
                            <td className="p-4 text-right font-medium text-primary pr-6">{log.action}</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No audit trail logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Platform Organizations (Super Admin Only) */}
        {activeRole === "Super Admin" && (
          <TabsContent value="organizations" className="space-y-6">
            <Card className="overflow-hidden border border-border shadow-xs animate-in fade-in duration-300">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Building className="h-4.5 w-4.5 text-primary" /> Platform Clinic Registries
                  </CardTitle>
                  <CardDescription className="text-xxs">Manage global clinic organizations, suspension flags, and billing subscription tiers.</CardDescription>
                </div>
                <Button onClick={handleOpenAddClinic} size="sm" className="h-8 text-xxs flex items-center gap-1 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Register Clinic Org
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-left">
                        <th className="p-4 pl-6">Clinic Name</th>
                        <th className="p-4">Tenant Domain</th>
                        <th className="p-4">Subscription Plan</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right pr-6">Operations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinics.length > 0 ? (
                        clinics.map((clinic) => (
                          <tr key={clinic.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                            <td className="p-4 pl-6 font-bold text-foreground">{clinic.name}</td>
                            <td className="p-4 font-mono text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" /> {clinic.domain}
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-xxs uppercase">{clinic.subscriptionPlan}</Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant={clinic.status === "Active" ? "completed" : "cancelled"}>
                                {clinic.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right pr-6 space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xxs font-semibold cursor-pointer"
                                onClick={() => handleToggleClinicStatus(clinic)}
                              >
                                {clinic.status === "Active" ? "Suspend" : "Activate"}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive/80 cursor-pointer"
                                onClick={() => handleDeleteClinic(clinic.id, clinic.name)}
                                title="Delete Clinic Org"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No Clinic organizations registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Global integrations panel card */}
            <Card className="border border-border shadow-xs animate-in fade-in duration-300">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Server className="h-4.5 w-4.5 text-primary" /> Global SaaS Platform Integrations
                </CardTitle>
                <CardDescription className="text-xxs">Configure globally shared connection parameters across all tenant clinics.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xxs">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/30 rounded-xl border border-border/20">
                    <span className="text-muted-foreground font-semibold block mb-0.5">WhatsApp Business Gateway API</span>
                    <div className="font-bold text-foreground">Endpoint: http://localhost:3001</div>
                    <div className="text-muted-foreground mt-0.5">Instance Connection Status: <span className="text-emerald-500 font-bold">ONLINE</span></div>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-xl border border-border/20">
                    <span className="text-muted-foreground font-semibold block mb-0.5">Supabase Database Sync</span>
                    <div className="font-bold text-foreground">RLS Policy enforcement mode: Enforced</div>
                    <div className="text-muted-foreground mt-0.5">Auditing Sync: <span className="text-primary font-bold">ACTIVE (HIPAA Compliance)</span></div>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-xl border border-border/20 flex flex-col justify-between">
                    <div>
                      <span className="text-muted-foreground font-semibold block mb-0.5">Database Performance Audit</span>
                      <div className="font-bold text-foreground">IndexedDB (Dexie) Storage</div>
                      <div className="text-muted-foreground mt-0.5">Load Testing: Populate AegisDB with 10k patient logs.</div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={handleSeedPatients} 
                      disabled={seeding}
                      className="mt-3 cursor-pointer text-[10px] h-7 bg-primary text-primary-foreground font-bold hover:bg-primary/95 flex items-center justify-center gap-1.5 w-fit"
                    >
                      {seeding ? "Seeding..." : "Seed 10,000 Patients"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ADD/EDIT STAFF DIALOG */}
      <Dialog open={showStaffModal} onOpenChange={setShowStaffModal}>
        <DialogHeader>
          <DialogTitle>{editingStaff ? "Edit Staff Member Details" : "Register New Staff Member"}</DialogTitle>
          <DialogClose onClick={() => setShowStaffModal(false)} />
        </DialogHeader>
        <form onSubmit={handleSaveStaff} className="text-xxs">
          <DialogContent>
            <div className="space-y-1.5">
              <Label htmlFor="st-name">Full Name</Label>
              <Input id="st-name" placeholder="Dr. Marcus Vance" value={sName} onChange={(e) => setSName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="st-email">Email Address</Label>
              <Input id="st-email" type="email" placeholder="m.vance@hospital.com" value={sEmail} onChange={(e) => setSEmail(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="st-specialty">Specialty / Role Title</Label>
                <Input id="st-specialty" placeholder="Clinical Director" value={sSpecialty} onChange={(e) => setSSpecialty(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-dept">Department</Label>
                <Select id="st-dept" value={sDept} onChange={(e) => setSDept(e.target.value)}>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Administration">Administration</option>
                  <option value="Front Desk">Front Desk</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="st-salary">Monthly Salary ($)</Label>
                <Input id="st-salary" type="number" value={sSalary} onChange={(e) => setSSalary(Number(e.target.value))} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-role">Access Clearance Role</Label>
                <Select id="st-role" value={sRole} onChange={(e) => setSRole(e.target.value as any)}>
                  <option value="Physician">Physician (Doctor)</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Administrator">Administrator (Clinic Admin)</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="st-avail">Status availability</Label>
                <Select id="st-avail" value={sAvailability} onChange={(e) => setSAvailability(e.target.value as any)}>
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="On Leave">On Leave</option>
                </Select>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowStaffModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Save Staff Details</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* REGISTER CLINIC DIALOG */}
      <Dialog open={showClinicModal} onOpenChange={setShowClinicModal}>
        <DialogHeader>
          <DialogTitle>Register Clinic Org Tenant</DialogTitle>
          <DialogClose onClick={() => setShowClinicModal(false)} />
        </DialogHeader>
        <form onSubmit={handleSaveClinic} className="text-xxs">
          <DialogContent>
            <div className="space-y-1.5">
              <Label htmlFor="cl-name">Clinic Organization Name</Label>
              <Input id="cl-name" placeholder="Aegis Specialty Pediatrics" value={cNameText} onChange={(e) => setCNameText(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cl-domain">Subdomain Domain URL</Label>
              <Input id="cl-domain" placeholder="westpediatrics.aegiscrm.com" value={cName} onChange={(e) => setCDomain(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cl-plan">Subscription Plan</Label>
                <Select id="cl-plan" value={cPlan} onChange={(e) => setCPlan(e.target.value as any)}>
                  <option value="Trial">Trial tier</option>
                  <option value="Professional">Professional tier</option>
                  <option value="Enterprise">Enterprise SaaS tier</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cl-status">Clinic Status</Label>
                <Select id="cl-status" value={cStatus} onChange={(e) => setCStatus(e.target.value as any)}>
                  <option value="Active">Active / Approved</option>
                  <option value="Suspended">Suspended / Frozen</option>
                </Select>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowClinicModal(false)} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Register Organization</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}

