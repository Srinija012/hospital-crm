"use client"

import * as React from "react"
import {
  CreditCard,
  Search,
  DollarSign,
  TrendingUp,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Trash2,
  Plus,
  Download
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import {
  dbPayInvoice,
  dbSaveInvoice,
  dbDeleteInvoice,
  getActiveRole,
  Invoice,
  Patient
} from "@/lib/db"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/database"

function validateInvoiceForm(
  patientName: string,
  amount: number | string,
  date: string
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!patientName || patientName === "-- Choose Patient --") errors.patientName = "Please select or enter a patient name."
  const amt = Number(amount)
  if (!amount || isNaN(amt) || amt <= 0) errors.amount = "Amount must be greater than zero."
  if (!date) errors.date = "Issue date is required."
  return errors
}

export default function BillingPage() {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("All")
  const [activeRole, setActiveRole] = React.useState<string>("Anonymous")
  const [showInvoiceModal, setShowInvoiceModal] = React.useState(false)
  const [formPatientSelector, setFormPatientSelector] = React.useState("")
  const [formGuestName, setFormGuestName] = React.useState("")
  const [formAmount, setFormAmount] = React.useState<number | string>(150)
  const [formDate, setFormDate] = React.useState("")
  const [formStatus, setFormStatus] = React.useState<'Paid' | 'Unpaid' | 'Overdue'>("Unpaid")
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = React.useState<{ id: string; invoiceNo: string } | null>(null)

  const invoices = useLiveQuery(async () => {
    const role = getActiveRole()
    let collection
    if (role === 'Patient') {
      const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null
      const patientName = session ? JSON.parse(session).name : ""
      collection = db.invoices.where('patientName').equals(patientName)
    } else {
      collection = db.invoices.toCollection()
    }

    let list = await collection
      .filter(inv => {
        const matchesSearch = !searchTerm.trim() ? true : (
          inv.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
        )
        const matchesStatus = statusFilter === "All" || inv.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .toArray()

    list.sort((a, b) => b.invoiceNo.localeCompare(a.invoiceNo))
    return list
  }, [searchTerm, statusFilter, activeRole]) || []

  const patients = useLiveQuery(async () => {
    return await db.patients.toArray()
  }) || []

  React.useEffect(() => {
    setActiveRole(getActiveRole())
  }, [])

  const openCreateModal = () => {
    setFormPatientSelector("")
    setFormGuestName("")
    setFormAmount(150)
    setFormDate(new Date().toISOString().split("T")[0])
    setFormStatus("Unpaid")
    setFormErrors({})
    setShowInvoiceModal(true)
  }

  const clearErr = (f: string) => setFormErrors(p => { const n = { ...p }; delete n[f]; return n })
  const resolvedPatientName = formPatientSelector === "__guest__" ? formGuestName.trim() : formPatientSelector

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateInvoiceForm(resolvedPatientName, formAmount, formDate)
    if (Object.keys(errors).length > 0) { setFormErrors(errors); toast.error("Please fix the highlighted errors."); return }
    try {
      const count = await db.invoices.count()
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`
      await dbSaveInvoice({ invoiceNo, patientId: '', patientName: resolvedPatientName, date: formDate, amount: Number(formAmount), status: formStatus })
      setShowInvoiceModal(false)
      toast.success(`Invoice ${invoiceNo} created for ${resolvedPatientName}.`)
    } catch (err: any) { toast.error("Failed to create invoice: " + err.message) }
  }

  const confirmDeleteInvoice = async () => {
    if (!confirmDelete) return
    try {
      await dbDeleteInvoice(confirmDelete.id)
      toast.success(`Invoice ${confirmDelete.invoiceNo} deleted.`)
    } catch { toast.error("Failed to delete invoice.") } finally { setConfirmDelete(null) }
  }

  const handlePayInvoice = async (id: string, invoiceNo: string, patientName: string) => {
    try { await dbPayInvoice(id); toast.success(`Invoice ${invoiceNo} settled as Paid.`) }
    catch { toast.error("Failed to settle invoice.") }
  }

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) { toast.warning("No invoices to export."); return }
    const headers = ["Invoice #", "Patient", "Date", "Amount ($)", "Status"]
    const rows = filteredInvoices.map(i => [i.invoiceNo, i.patientName, i.date, i.amount, i.status])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `invoices_${new Date().toISOString().split("T")[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success("Invoices exported as CSV.")
  }

  const totalInvoiced = invoices.reduce((s, c) => s + c.amount, 0)
  const totalPaid = invoices.filter(i => i.status === "Paid").reduce((s, c) => s + c.amount, 0)
  const totalUnpaid = invoices.filter(i => i.status === "Unpaid").reduce((s, c) => s + c.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === "Overdue").reduce((s, c) => s + c.amount, 0)

  const filteredInvoices = invoices

  const FieldError = ({ field }: { field: string }) =>
    formErrors[field] ? <p className="text-[10px] text-destructive font-medium flex items-center gap-1 mt-0.5"><AlertCircle className="h-3 w-3" />{formErrors[field]}</p> : null

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {activeRole !== "Receptionist" && activeRole !== "Doctor" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-top duration-300">
          {[
            { label: "Gross Invoiced", value: totalInvoiced, color: "text-foreground", icon: <DollarSign className="h-5 w-5 text-primary" />, sub: "Total clinical billing" },
            { label: "Total Received", value: totalPaid, color: "text-emerald-500", icon: <FileCheck className="h-5 w-5 text-emerald-500" />, sub: `${((totalPaid/(totalInvoiced||1))*100).toFixed(0)}% collection rate` },
            { label: "Outstanding (Unpaid)", value: totalUnpaid, color: "text-amber-500", icon: <Clock className="h-5 w-5 text-amber-500" />, sub: "Awaiting clearance" },
            { label: "Delinquent (Overdue)", value: totalOverdue, color: "text-rose-500", icon: <AlertCircle className="h-5 w-5 text-rose-500" />, sub: "Requires follow-up" },
          ].map(kpi => (
            <Card key={kpi.label} className="relative overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{kpi.label}</CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpi.color}`}>${kpi.value.toLocaleString()}</div>
                <p className="text-xxs text-muted-foreground font-semibold mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-xs">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patient, invoice ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {(activeRole === "Super Admin" || activeRole === "Clinic Admin") && (
              <>
                <Button onClick={openCreateModal} size="sm" className="h-9 text-xs cursor-pointer flex items-center gap-1.5"><Plus className="h-4.5 w-4.5" />Create Invoice</Button>
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 text-xs cursor-pointer flex items-center gap-1.5"><Download className="h-4 w-4" />Export CSV</Button>
              </>
            )}
            <div className="w-[160px]">
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 text-xs">
                <option value="All">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Overdue">Overdue</option>
              </Select>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Invoices Ledger</CardTitle>
              <CardDescription className="text-xxs">Medical invoice receipts issued to patients.</CardDescription>
            </div>
            <Badge variant="outline" className="text-xxs">{filteredInvoices.length} records</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-left">
                    <th className="p-4">Invoice #</th><th className="p-4">Patient</th><th className="p-4">Date</th>
                    <th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length > 0 ? filteredInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-mono font-bold text-foreground/80">
                        <div className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-muted-foreground/60" />{inv.invoiceNo}</div>
                      </td>
                      <td className="p-4 font-bold text-foreground">{inv.patientName}</td>
                      <td className="p-4 text-muted-foreground">{inv.date}</td>
                      <td className="p-4 font-extrabold text-foreground/80">${(inv.amount || 0).toLocaleString()}</td>
                      <td className="p-4"><Badge variant={(inv.status?.toLowerCase() || 'unpaid') as any}>{inv.status}</Badge></td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status !== "Paid" ? (
                            activeRole !== "Doctor" ? (
                              <Button onClick={() => handlePayInvoice(inv.id, inv.invoiceNo, inv.patientName)} size="sm" className="text-[10px] h-8 cursor-pointer flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />Settle Bill
                              </Button>
                            ) : <span className="text-xxs text-amber-500 font-bold flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Outstanding</span>
                          ) : (
                            <span className="text-xxs text-emerald-500 font-bold flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Settled</span>
                          )}
                          {(activeRole === "Clinic Admin" || activeRole === "Super Admin") && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer" onClick={() => setConfirmDelete({ id: inv.id, invoiceNo: inv.invoiceNo })} title="Delete Invoice">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2"><AlertCircle className="h-8 w-8 text-muted-foreground/60" /><span className="text-sm font-semibold">No invoices match the current filters.</span></div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CREATE INVOICE DIALOG */}
      <Dialog open={showInvoiceModal} onOpenChange={v => { if (!v) { setShowInvoiceModal(false); setFormErrors({}) } }}>
        <DialogHeader>
          <DialogTitle>Create New Medical Invoice</DialogTitle>
          <DialogClose onClick={() => { setShowInvoiceModal(false); setFormErrors({}) }} />
        </DialogHeader>
        <form onSubmit={handleCreateInvoice} noValidate className="text-xxs">
          <DialogContent>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-patient">Patient <span className="text-destructive">*</span></Label>
                <Select id="inv-patient" value={formPatientSelector} onChange={e => { setFormPatientSelector(e.target.value); clearErr("patientName") }} className={formErrors.patientName ? "border-destructive" : ""}>
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => <option key={p.id} value={p.name}>{p.name} ({p.id})</option>)}
                  <option value="__guest__">Guest / Walk-in Patient</option>
                </Select>
                <FieldError field="patientName" />
              </div>
              {formPatientSelector === "__guest__" && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <Label htmlFor="inv-guest-name">Guest Full Name <span className="text-destructive">*</span></Label>
                  <Input id="inv-guest-name" placeholder="e.g. John Doe" value={formGuestName} onChange={e => { setFormGuestName(e.target.value); clearErr("patientName") }} className={formErrors.patientName ? "border-destructive" : ""} />
                  <FieldError field="patientName" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-amount">Amount ($) <span className="text-destructive">*</span></Label>
                  <Input id="inv-amount" type="number" min={1} step={0.01} value={formAmount} onChange={e => { setFormAmount(e.target.value === "" ? "" : Number(e.target.value)); clearErr("amount") }} className={formErrors.amount ? "border-destructive" : ""} />
                  <FieldError field="amount" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-date">Issue Date <span className="text-destructive">*</span></Label>
                  <Input id="inv-date" type="date" value={formDate} onChange={e => { setFormDate(e.target.value); clearErr("date") }} className={formErrors.date ? "border-destructive" : ""} />
                  <FieldError field="date" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-status">Payment Status</Label>
                <Select id="inv-status" value={formStatus} onChange={e => setFormStatus(e.target.value as Invoice['status'])}>
                  <option value="Unpaid">Unpaid — Invoice Issued</option>
                  <option value="Paid">Paid — Already Settled</option>
                  <option value="Overdue">Overdue — Past Due Date</option>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3 text-primary" />Fields marked <span className="text-destructive font-bold mx-0.5">*</span> are required.</p>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowInvoiceModal(false); setFormErrors({}) }} className="cursor-pointer">Cancel</Button>
            <Button type="submit" className="cursor-pointer">Create Invoice</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmDialog open={!!confirmDelete} title="Cancel & Delete Invoice" message={`Permanently delete invoice "${confirmDelete?.invoiceNo}"? This action cannot be undone.`} confirmLabel="Yes, Delete" cancelLabel="Keep Invoice" variant="danger" onConfirm={confirmDeleteInvoice} onCancel={() => setConfirmDelete(null)} />
    </div>
  )
}
