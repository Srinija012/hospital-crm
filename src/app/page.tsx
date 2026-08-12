"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  UserPlus,
  CalendarPlus,
  Heart,
  TrendingUp,
  Stethoscope,
  UserCheck,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  dbGetAppointments,
  dbGetPatients,
  dbGetDoctors,
  dbGetInvoices,
  dbGetFollowUps,
  dbUpdateAppointmentStatus,
  Appointment,
  Patient,
  Doctor,
  Invoice,
  FollowUp
} from "@/lib/db"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

export default function Dashboard() {
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [followups, setFollowups] = React.useState<FollowUp[]>([])
  const [session, setSession] = React.useState<any | null>(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setAppointments(await dbGetAppointments())
        setPatients(await dbGetPatients())
        setDoctors(await dbGetDoctors())
        setInvoices(await dbGetInvoices())
        setFollowups(await dbGetFollowUps())
      } catch (err) {
        console.error("Failed to load dashboard data:", err)
      } finally {
        setMounted(true)
      }
    }

    loadData()

    const stored = localStorage.getItem("active_user_session")
    if (stored) {
      setSession(JSON.parse(stored))
    }
  }, [])

  const handleUpdateStatus = async (id: string, nextStatus: Appointment['status']) => {
    try {
      const updated = await dbUpdateAppointmentStatus(id, nextStatus)
      setAppointments(updated)
    } catch (err: any) {
      console.error("Failed to update status:", err)
    }
  }

  // Chart 1: Appointments Trend (derived dynamically from the last 7 calendar days)
  const lineChartData = React.useMemo(() => {
    const data = []
    const today = new Date()
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const count = appointments.filter(a => a.date === dateStr && a.status !== "Cancelled").length
      const formattedDate = `${dayNames[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
      data.push({ name: formattedDate, appointments: count })
    }
    return data
  }, [appointments])

  if (!mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Heart className="h-12 w-12 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground font-semibold">Loading Aegis CRM...</span>
        </div>
      </div>
    )
  }

  // Key Statistics
  const totalPatients = patients.length
  const todayStr = "2026-06-08"
  const todayAppointments = appointments.filter(a => a.date === todayStr && a.status !== "Cancelled")
  const activeDoctors = doctors.filter(d => d.availability === "Available").length
  
  const totalRevenue = invoices
    .filter(i => i.status === "Paid")
    .reduce((sum, current) => sum + current.amount, 0)

  const role = session?.role || "Clinic Admin"

  const hasRealTrafficData = appointments.some(a => a.status !== "Cancelled")

  // Chart 2: Departments Load Breakdown
  const deptCount: Record<string, number> = {}
  appointments.forEach(a => {
    if (a.status !== "Cancelled") {
      deptCount[a.department] = (deptCount[a.department] || 0) + 1
    }
  })

  const pieChartData = Object.keys(deptCount).map(dept => ({
    name: dept,
    value: deptCount[dept]
  }))

  const COLORS = ["#0d9488", "#0284c7", "#f59e0b", "#10b981", "#8b5cf6"]

  const recentAppointments = appointments
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const renderStatCards = () => {
    if (role === "Doctor") {
      const pendingFollowups = followups.filter(f => f.status === "Pending").length
      const upcomingApts = appointments.filter(a => a.status === "Scheduled").length
      return (
        <>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Patients</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patients.length}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">Assigned cases in registry</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-secondary/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Patients</CardTitle>
              <Calendar className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">
                {todayAppointments.filter(a => a.status === "Completed").length} completed / {todayAppointments.filter(a => a.status === "Scheduled").length} pending
              </p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Upcoming Appointments</CardTitle>
              <Stethoscope className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingApts}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">Future consults scheduled</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Follow-ups</CardTitle>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingFollowups}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">Pending care plans</p>
            </CardContent>
          </Card>
        </>
      )
    }

    if (role === "Receptionist") {
      const pendingFollowups = followups.filter(f => f.status === "Pending").length
      const todayAppointmentsCount = todayAppointments.length
      const newRegistrationsCount = patients.length
      return (
        <>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Patients</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patients.length}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">Registered case files</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-secondary/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Appointments</CardTitle>
              <Calendar className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointmentsCount}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">Scheduled for check-in</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Follow-ups Due</CardTitle>
              <Clock className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingFollowups}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">Reminders pending dispatch</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Registrations</CardTitle>
              <UserPlus className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newRegistrationsCount}</div>
              <p className="text-xxs text-muted-foreground font-semibold mt-1">Registered folder files</p>
            </CardContent>
          </Card>
        </>
      )
    }

    // Clinic Admin / Super Admin (Full financials)
    return (
      <>
        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Patients</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            <p className="text-xxs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3.5 w-3.5" /> +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-secondary/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Consults</CardTitle>
            <Calendar className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xxs text-muted-foreground font-semibold mt-1">
              {todayAppointments.filter(a => a.status === "Completed").length} completed / {todayAppointments.filter(a => a.status === "Scheduled").length} pending
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">On-Duty Staff</CardTitle>
            <Stethoscope className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDoctors}</div>
            <p className="text-xxs text-muted-foreground font-semibold mt-1">
              Out of {doctors.length} total staff physicians
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full -mr-6 -mt-6 transition-all group-hover:scale-110" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ledger Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xxs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3.5 w-3.5" /> +8% target achieved
            </p>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Overview Stat Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {renderStatCards()}
      </div>

      {/* Main Charts & Analytics Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Appointments Over Time Line Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Patient Traffic Trend
            </CardTitle>
            <CardDescription className="text-xxs">Daily volume of clinical consultations completed and scheduled.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {hasRealTrafficData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--foreground)"
                    }}
                  />
                  <Line type="monotone" dataKey="appointments" stroke="var(--primary)" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40">
                <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold">No patient traffic data recorded yet</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Patient activity trends will appear once consultations are scheduled.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departments Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Department Load</CardTitle>
            <CardDescription className="text-xxs">Distribution of current cases by department.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col justify-center">
            {pieChartData.length > 0 && appointments.some(a => a.status !== "Cancelled") ? (
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "10px",
                        color: "var(--foreground)"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-2 text-[10px] px-4">
                  {pieChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate text-muted-foreground font-medium">{entry.name}: <strong className="text-foreground">{entry.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40">
                <Stethoscope className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold">No cases recorded yet</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Department loads will show once appointments are active.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Patient Consultation Queue Manager */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-primary" />
                Live Patient Consultation Queue Manager
              </CardTitle>
              <CardDescription className="text-xxs">Real-time check-in flow and doctor queue for today's visits.</CardDescription>
            </div>
            <Link to="/appointments">
              <Button size="sm" variant="outline" className="text-xxs h-8 cursor-pointer">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="p-3.5 pl-6">Patient</th>
                    <th className="p-3.5">Attending Staff</th>
                    <th className="p-3.5">Time Slot</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Queue Status</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const todayQueue = appointments.filter(a => a.date === todayStr && a.status !== "Cancelled")
                    
                    if (todayQueue.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs font-semibold">
                            No appointments scheduled for today.
                          </td>
                        </tr>
                      )
                    }

                    return todayQueue.map((apt) => {
                      const getQueueBadgeVariant = (status: string) => {
                        switch (status) {
                          case "Scheduled": return "scheduled"
                          case "Confirmed": return "confirmed"
                          case "Checked In": return "confirmed" // renders light blue
                          case "In Consultation": return "inprogress" // renders amber
                          case "Completed": return "completed" // renders emerald
                          case "No Show": return "cancelled" // renders rose
                          default: return "outline"
                        }
                      }

                      return (
                        <tr key={apt.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                          <td className="p-3.5 pl-6">
                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                              {apt.patientName}
                              <Link to={`/patients?id=${apt.patientId}`} title="Open Patient EHR" className="text-primary hover:text-primary/80">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-medium">{apt.doctorName}</td>
                          <td className="p-3.5 font-mono text-[11px] text-foreground/85">{apt.timeSlot}</td>
                          <td className="p-3.5">
                            <Badge variant="outline" className="text-[10px]">{apt.department}</Badge>
                          </td>
                          <td className="p-3.5">
                            <Badge variant={getQueueBadgeVariant(apt.status) as any}>
                              {apt.status}
                            </Badge>
                          </td>
                          <td className="p-3.5 pr-6 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {(apt.status === "Scheduled" || apt.status === "Confirmed") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] px-2 font-bold cursor-pointer"
                                  onClick={() => handleUpdateStatus(apt.id, "Checked In")}
                                >
                                  <UserCheck className="h-3 w-3 mr-1 text-primary" /> Check In
                                </Button>
                              )}

                              {apt.status === "Checked In" && (
                                <Button
                                  size="sm"
                                  className="h-7 text-[10px] px-2 font-bold cursor-pointer bg-amber-500 hover:bg-amber-600 border-amber-600 text-white"
                                  onClick={() => handleUpdateStatus(apt.id, "In Consultation")}
                                >
                                  <Stethoscope className="h-3 w-3 mr-1" /> Start Consult
                                </Button>
                              )}

                              {apt.status === "In Consultation" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10px] px-2 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white"
                                    onClick={() => handleUpdateStatus(apt.id, "Completed")}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" /> Finish
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[10px] px-2 font-bold cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                    onClick={() => handleUpdateStatus(apt.id, "No Show")}
                                  >
                                    No Show
                                  </Button>
                                </>
                              )}

                              {apt.status === "Completed" && (
                                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 justify-end">
                                  <CheckCircle className="h-3.5 w-3.5" /> Checked Off
                                </span>
                              )}

                              {(apt.status === "Cancelled" || apt.status === "No Show") && (
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Action Panel / Quick Links */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold font-sans">Quick Operations</CardTitle>
            <CardDescription className="text-xxs">Rapid access links to medical staff administrative tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-center">
            {role !== "Receptionist" && (
              <Link to="/appointments">
                <Button className="w-full flex items-center justify-start gap-3 text-xs h-11 cursor-pointer">
                  <CalendarPlus className="h-5 w-5" />
                  <span>Book New Consultation</span>
                </Button>
              </Link>
            )}
            
            {role !== "Doctor" && (
              <Link to="/patients">
                <Button variant="secondary" className="w-full flex items-center justify-start gap-3 text-xs h-11 cursor-pointer">
                  <UserPlus className="h-5 w-5" />
                  <span>Register New Patient</span>
                </Button>
              </Link>
            )}

            {role !== "Receptionist" && (
              <Link to="/doctors">
                <Button variant="outline" className="w-full flex items-center justify-start gap-3 text-xs h-11 cursor-pointer">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <span>Adjust Physician Schedules</span>
                </Button>
              </Link>
            )}

            {role === "Receptionist" && (
              <Link to="/appointments">
                <Button className="w-full flex items-center justify-start gap-3 text-xs h-11 cursor-pointer">
                  <CalendarPlus className="h-5 w-5" />
                  <span>Schedule Patient Appointment</span>
                </Button>
              </Link>
            )}
          </CardContent>
          <div className="p-6 pt-0 border-t border-border/40 mt-4 flex items-center gap-3">
            <Heart className="h-5 w-5 text-primary animate-pulse flex-shrink-0" />
            <span className="text-xxs text-muted-foreground font-medium leading-relaxed">
              Vitals alerts and check-in rosters refresh in real-time. Contact IT for clinical hardware integrations.
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
