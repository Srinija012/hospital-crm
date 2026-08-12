"use client"

import * as React from "react"
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  User,
  Phone,
  Stethoscope,
  Search,
  ShieldAlert,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import {
  dbGetTrashedPatients,
  dbRestorePatientFromTrash,
  dbPermanentlyDeleteTrashedPatient,
  getActiveRole,
  TrashedPatient
} from "@/lib/db"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function getDaysRemaining(deletedAt: string): number {
  const elapsed = Date.now() - new Date(deletedAt).getTime()
  const remaining = THIRTY_DAYS_MS - elapsed
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
}

function getUrgencyColor(daysLeft: number) {
  if (daysLeft <= 3) return "text-red-500 bg-red-500/10 border-red-500/20"
  if (daysLeft <= 7) return "text-amber-500 bg-amber-500/10 border-amber-500/20"
  return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
}

export default function TrashBinPage() {
  const [trashedPatients, setTrashedPatients] = React.useState<TrashedPatient[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [activeRole, setActiveRole] = React.useState("Anonymous")
  const [confirmDelete, setConfirmDelete] = React.useState<TrashedPatient | null>(null)
  const [confirmRestore, setConfirmRestore] = React.useState<TrashedPatient | null>(null)
  const [isActing, setIsActing] = React.useState(false)
  const [notice, setNotice] = React.useState("")

  const triggerNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(""), 4000)
  }

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await dbGetTrashedPatients()
      // Sort by most recently deleted first
      data.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
      setTrashedPatients(data)
    } catch (err) {
      console.error("Failed to load trash bin:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const role = getActiveRole()
    setActiveRole(role)
    if (role === 'Clinic Admin' || role === 'Super Admin') {
      loadData()
    } else {
      setLoading(false)
    }
  }, [loadData])

  const filtered = trashedPatients.filter(p => {
    const q = searchTerm.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.doctorAssignedName || "").toLowerCase().includes(q)
    )
  })

  // Access guard
  if (activeRole !== 'Clinic Admin' && activeRole !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive/60" />
        <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          The Trash Bin is only accessible to Clinic Admins and Super Admins.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-foreground tracking-tight">Patient Trash Bin</h1>
            <p className="text-xs text-muted-foreground font-semibold">
              Deleted records are auto-purged after 30 days · {trashedPatients.length} record{trashedPatients.length !== 1 ? "s" : ""} in trash
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs cursor-pointer"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </Button>
      </div>

      {/* Notice bar */}
      {notice && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold text-primary animate-in fade-in duration-300">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice("")}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl">
        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <span className="font-bold text-amber-600 dark:text-amber-400">30-Day Automatic Deletion: </span>
          Records in trash are permanently deleted after 30 days. Restore a patient before the timer expires to keep their data.
          Records with <span className="text-red-500 font-bold">≤3 days</span> remaining are highlighted in red.
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, ID..."
          className="pl-9 h-9 text-xs"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/40">
            <Trash2 className="h-9 w-9 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-foreground">
              {searchTerm ? "No matching records" : "Trash Bin is Empty"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {searchTerm ? "Try a different search term." : "Deleted patient records will appear here."}
            </p>
          </div>
        </div>
      )}

      {/* Trashed patients grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(patient => {
            const daysLeft = getDaysRemaining(patient.deletedAt)
            const urgencyClass = getUrgencyColor(daysLeft)
            const deletedDate = new Date(patient.deletedAt).toLocaleDateString("en-US", {
              day: "numeric", month: "short", year: "numeric"
            })

            return (
              <Card
                key={patient.trashedId || patient.id}
                className="relative border border-border/60 hover:border-destructive/30 transition-all duration-200 hover:shadow-md overflow-hidden group"
              >
                {/* Urgency stripe */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${daysLeft <= 3 ? "bg-red-500" : daysLeft <= 7 ? "bg-amber-500" : "bg-emerald-500"}`} />

                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground uppercase shrink-0">
                        {patient.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-bold text-foreground truncate">{patient.name}</CardTitle>
                        <span className="text-[10px] text-muted-foreground font-semibold">{patient.id}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold shrink-0 ${urgencyClass}`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {daysLeft}d left
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-4">
                  {/* Info rows */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="font-semibold text-foreground">{patient.phone}</span>
                      <span className="text-muted-foreground">· {patient.gender}, {patient.age} yrs</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Stethoscope className="h-3 w-3 shrink-0" />
                      <span>{patient.doctorAssignedName || "Unassigned"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span>Deleted by <strong className="text-foreground">{patient.deletedBy}</strong> on {deletedDate}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-[11px] font-semibold cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600"
                      onClick={() => setConfirmRestore(patient)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-[11px] font-semibold cursor-pointer border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive"
                      onClick={() => setConfirmDelete(patient)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Restore Confirmation Dialog ── */}
      <Dialog open={!!confirmRestore} onOpenChange={(open) => { if (!isActing && !open) setConfirmRestore(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <RotateCcw className="h-5 w-5" />
              Restore Patient Record?
            </DialogTitle>
          </DialogHeader>
          {confirmRestore && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This will restore <strong className="text-foreground">{confirmRestore.name}</strong> back to the active patient registry.
              </p>
              <p className="text-xs">All their medical records, vitals, and communication history will be accessible again.</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="cursor-pointer" disabled={isActing} onClick={() => setConfirmRestore(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              disabled={isActing}
              onClick={async () => {
                if (!confirmRestore) return
                setIsActing(true)
                try {
                  await dbRestorePatientFromTrash(confirmRestore.trashedId!)
                  triggerNotice(`"${confirmRestore.name}" has been restored to the active registry.`)
                  setConfirmRestore(null)
                  loadData()
                } catch (err: any) {
                  triggerNotice(`Error: ${err?.message || 'Failed to restore'}`)
                } finally {
                  setIsActing(false)
                }
              }}
            >
              {isActing ? "Restoring..." : "Yes, Restore Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Permanent Delete Confirmation Dialog ── */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!isActing && !open) setConfirmDelete(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Record?
            </DialogTitle>
          </DialogHeader>
          {confirmDelete && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                You are about to <strong className="text-destructive">permanently and irreversibly delete</strong> the record for <strong className="text-foreground">{confirmDelete.name}</strong>.
              </p>
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold">
                🚨 This action CANNOT be undone. All patient data including medical history, vitals, prescriptions, and communication logs will be permanently lost.
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="cursor-pointer" disabled={isActing} onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              disabled={isActing}
              onClick={async () => {
                if (!confirmDelete) return
                setIsActing(true)
                try {
                  await dbPermanentlyDeleteTrashedPatient(confirmDelete.trashedId!)
                  triggerNotice(`"${confirmDelete.name}" has been permanently deleted.`)
                  setConfirmDelete(null)
                  loadData()
                } catch (err: any) {
                  triggerNotice(`Error: ${err?.message || 'Failed to delete'}`)
                } finally {
                  setIsActing(false)
                }
              }}
            >
              {isActing ? "Deleting..." : "Yes, Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
