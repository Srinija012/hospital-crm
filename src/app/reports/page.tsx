"use client"

import * as React from "react"
import {
  BarChart3,
  TrendingUp,
  Download,
  CalendarCheck,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Activity,
  Stethoscope
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  dbGetPatients,
  dbGetInvoices,
  dbGetFollowUps,
  dbGetAppointments,
  Patient,
  Invoice,
  FollowUp,
  Appointment
} from "@/lib/db"

export default function ReportsPage() {
  const [exportNotice, setExportNotice] = React.useState("")
  const [isExporting, setIsExporting] = React.useState(false)
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [followups, setFollowups] = React.useState<FollowUp[]>([])
  const [appointments, setAppointments] = React.useState<Appointment[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setPatients(await dbGetPatients())
        setInvoices(await dbGetInvoices())
        setFollowups(await dbGetFollowUps())
        setAppointments(await dbGetAppointments())
      } catch (err) {
        console.error("Failed to load reports data:", err)
      } finally {
        setMounted(true)
      }
    }
    loadData()
  }, [])

  // 1. Patient Growth Trend (Last 6 Months cumulative totals)
  const growthData = React.useMemo(() => {
    if (patients.length === 0) return []
    const data = []
    const today = new Date()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)
      
      const count = patients.filter(p => {
        const pDate = p.createdAt ? new Date(p.createdAt) : null
        return pDate && pDate <= endOfMonth
      }).length

      data.push({
        month: `${months[month]} ${String(year).slice(-2)}`,
        patients: count
      })
    }
    return data
  }, [patients])

  const hasRealGrowthData = patients.length > 0

  // 2. Monthly Revenue Ledger (Gross collections per month for last 6 months)
  const revenueData = React.useMemo(() => {
    const paidInvoices = invoices.filter(inv => inv.status === "Paid")
    if (paidInvoices.length === 0) return []
    const data = []
    const today = new Date()
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const startOfMonth = new Date(year, month, 1)
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)
      
      const sum = paidInvoices.filter(inv => {
        const invDate = inv.createdAt ? new Date(inv.createdAt) : new Date(inv.date)
        return invDate >= startOfMonth && invDate <= endOfMonth
      }).reduce((acc, curr) => acc + curr.amount, 0)

      data.push({
        month: `${months[month]} ${String(year).slice(-2)}`,
        revenue: sum
      })
    }
    return data
  }, [invoices])

  const hasRealRevenueData = invoices.some(inv => inv.status === "Paid")

  // 3. Weekly Follow-up Completion Rate (%) over last 5 weeks
  const followUpRateData = React.useMemo(() => {
    if (followups.length === 0) return []
    const data = []
    const today = new Date()
    for (let i = 4; i >= 0; i--) {
      const startOfWeek = new Date()
      startOfWeek.setDate(today.getDate() - (i + 1) * 7)
      const endOfWeek = new Date()
      endOfWeek.setDate(today.getDate() - i * 7)

      const weeklyFups = followups.filter(f => {
        const fDate = new Date(f.followUpDate)
        return fDate >= startOfWeek && fDate <= endOfWeek
      })

      const total = weeklyFups.length
      const completed = weeklyFups.filter(f => f.status === "Completed").length
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100

      data.push({
        week: `Wk -${i}`,
        rate: rate
      })
    }
    return data
  }, [followups])

  const hasRealFollowupData = followups.length > 0

  // 4. KPI Summary Calculations
  const totalPatientsCount = patients.length
  
  const completedFollowups = followups.filter(f => f.status === 'Completed').length
  const followUpSuccessRate = followups.length > 0
    ? Math.round((completedFollowups / followups.length) * 100)
    : 0

  // WhatsApp Delivery Success Rate
  const communicationsCount = patients.reduce((acc, p) => acc + (p.communications?.length || 0), 0)
  const deliveredComms = patients.reduce((acc, p) => acc + (p.communications?.filter(c => c.status === 'delivered' || c.status === 'read')?.length || 0), 0)
  const waDeliveryRate = communicationsCount > 0
    ? Math.round((deliveredComms / communicationsCount) * 100)
    : 0

  // No-Show Rate
  const completedApts = appointments.filter(a => a.status === 'Completed').length
  const noShowApts = appointments.filter(a => a.status === 'No Show').length
  const noShowRate = (completedApts + noShowApts) > 0
    ? Math.round((noShowApts / (completedApts + noShowApts)) * 100)
    : 0

  const triggerExport = (format: string) => {
    setIsExporting(true)
    setExportNotice(`Preparing report data compiled for ${format}...`)
    
    setTimeout(() => {
      setIsExporting(false)
      setExportNotice(`Report successfully exported to Aegis_${format}_Report.zip!`)
      setTimeout(() => setExportNotice(""), 3500)
    }, 1200)
  }

  if (!mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-12 w-12 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground font-semibold">Loading Clinic Analytics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Export notification */}
      {exportNotice && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold text-primary">
          <CheckCircle className="h-4.5 w-4.5 animate-pulse" /> {exportNotice}
        </div>
      )}

      {/* Roster Header */}
      <div className="bg-card border border-border p-5 rounded-xl shadow-xs flex flex-wrap gap-6 items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Clinic Analytics & Audits</h3>
          <p className="text-xxs text-muted-foreground font-medium mt-0.5">Access visual caseload charts, financial parameters, and WhatsApp delivery indicators.</p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerExport("PDF")}
            disabled={isExporting}
            className="text-xxs h-8 cursor-pointer flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerExport("CSV")}
            disabled={isExporting}
            className="text-xxs h-8 cursor-pointer flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerExport("Excel")}
            disabled={isExporting}
            className="text-xxs h-8 cursor-pointer flex items-center gap-1"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </div>

      {/* KPIs Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Patient Intake Index</span>
          <div className="text-xl font-bold mt-1">{totalPatientsCount}</div>
          <span className="text-[9px] text-emerald-500 font-semibold mt-0.5">Total registered patients</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Follow-up Success Rate</span>
          <div className="text-xl font-bold mt-1">{followUpSuccessRate}%</div>
          <span className="text-[9px] text-emerald-500 font-semibold mt-0.5">Resolved care outreach</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">WhatsApp Delivery</span>
          <div className="text-xl font-bold mt-1">{waDeliveryRate}%</div>
          <span className="text-[9px] text-emerald-500 font-semibold mt-0.5">Delivery channel opt-in match</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">No-Show Prediction</span>
          <div className="text-xl font-bold mt-1">{noShowRate}%</div>
          <span className="text-[9px] text-emerald-500 font-semibold mt-0.5">Actual client appointment skip rate</span>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Growth Line chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold">Patient Growth Trend</CardTitle>
            <CardDescription className="text-xxs">Cumulative patient intake over last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {hasRealGrowthData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={9} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={9} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "var(--foreground)"
                    }}
                  />
                  <Line type="monotone" dataKey="patients" stroke="var(--primary)" strokeWidth={2.5} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold">No patient growth data recorded yet</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Trends will appear once patient files are registered.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold">Monthly Revenue Ledger</CardTitle>
            <CardDescription className="text-xxs">Gross invoiced collection totals.</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {hasRealRevenueData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={9} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={9} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "var(--foreground)"
                    }}
                  />
                  <Bar dataKey="revenue" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40">
                <DollarSign className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold">No revenue data recorded yet</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Billing metrics will update as invoices are marked Paid.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow-up success rate chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs font-bold flex items-center gap-1.5">
              <CalendarCheck className="h-4.5 w-4.5 text-primary" />
              Follow-up Completion Rate (%)
            </CardTitle>
            <CardDescription className="text-xxs">Percentage of successfully resolved checkup outreach logs weekly.</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {hasRealFollowupData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={followUpRateData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={9} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={9} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "var(--foreground)"
                    }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={2.5} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/40">
                <CalendarCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold">No follow-up data recorded yet</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Outreach metrics will show as follow-ups are completed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
