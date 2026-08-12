"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import {
  Stethoscope,
  Mail,
  UserCheck,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Plus
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { useLiveQuery } from "dexie-react-hooks"
import {
  dbGetDoctors,
  dbSaveDoctorAvailability,
  dbGetAppointments,
  getActiveRole,
  Doctor
} from "@/lib/db"

function DoctorAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const [imgError, setImgError] = React.useState(false)

  const getInitials = (n: string) => {
    const parts = n.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return (parts[0]?.[0] || 'D').toUpperCase()
  }

  if (imgError || !avatar) {
    return (
      <div className="h-16 w-16 rounded-xl border-2 border-card shadow-md bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center text-primary font-bold text-lg select-none">
        {getInitials(name)}
      </div>
    )
  }

  return (
    <img
      src={avatar}
      alt=""
      onError={() => setImgError(true)}
      className="h-16 w-16 rounded-xl object-cover border-2 border-card shadow-md bg-muted"
    />
  )
}

export default function DoctorsPage() {
  const toast = useToast()
  const [activeRole, setActiveRole] = React.useState<string>("Anonymous")
  const [currentUserName, setCurrentUserName] = React.useState<string>("")

  const doctors = useLiveQuery(async () => {
    return await dbGetDoctors()
  }, [activeRole, currentUserName]) || []

  const appointments = useLiveQuery(async () => {
    return await dbGetAppointments()
  }, [activeRole, currentUserName]) || []

  React.useEffect(() => {
    setActiveRole(getActiveRole())
    try {
      const stored = localStorage.getItem("active_user_session")
      if (stored) {
        const sess = JSON.parse(stored)
        setCurrentUserName(sess.name || "")
      }
    } catch {
      // ignore
    }
  }, [])

  const handleStatusChange = async (docId: string, status: Doctor['availability']) => {
    try {
      await dbSaveDoctorAvailability(docId, status)
      toast.info(`Availability updated to "${status}".`)
    } catch {
      toast.error("Failed to update availability.")
    }
  }

  const getStatusBadgeVariant = (status: Doctor['availability']) => {
    switch (status) {
      case "Available": return "completed"
      case "Busy": return "inprogress"
      case "On Leave": return "cancelled"
      default: return "outline"
    }
  }

  const canChangeStatus = (doc: Doctor): boolean => {
    if (activeRole === "Super Admin" || activeRole === "Clinic Admin") return true
    if (activeRole === "Doctor" && doc.name === currentUserName) return true
    return false
  }

  const canViewSensitiveData = activeRole === "Super Admin" || activeRole === "Clinic Admin"

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Staff stats header card */}
      <div className="bg-card border border-border p-6 rounded-xl shadow-xs flex flex-wrap gap-6 items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Medical Staff Registry</h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Manage attending shifts, workload distribution, and directory listings.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          {(activeRole === "Super Admin" || activeRole === "Clinic Admin") && (
            <Link to="/admin-panel">
              <Button size="sm" variant="outline" className="h-9 text-xs cursor-pointer flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Manage Staff in Admin Panel
              </Button>
            </Link>
          )}

          <div className="flex gap-4 text-center">
            <div className="px-4 py-2 bg-muted/40 rounded-lg border border-border/20">
              <div className="text-lg font-extrabold text-foreground">{doctors.length}</div>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Staff</span>
            </div>
            <div className="px-4 py-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
              <div className="text-lg font-extrabold text-emerald-500">{doctors.filter(d => d.availability === "Available").length}</div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Available</span>
            </div>
            <div className="px-4 py-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
              <div className="text-lg font-extrabold text-amber-500">{doctors.filter(d => d.availability === "Busy").length}</div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Busy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Doctor Cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {doctors.map(doc => {
          const isSelf = activeRole === "Doctor" && doc.name === currentUserName
          return (
            <Card key={doc.id} className={`overflow-hidden flex flex-col justify-between shadow-xs transition-all hover:shadow-md ${isSelf ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
              <div>
                <div className="h-16 bg-gradient-to-r from-primary/10 via-muted/30 to-muted/10 border-b border-border/20" />

                <CardContent className="p-6 pt-0 relative -mt-8 space-y-4">
                  <div className="flex justify-between items-end gap-3">
                    <DoctorAvatar name={doc.name} avatar={doc.avatar} />
                    <Badge variant={getStatusBadgeVariant(doc.availability)} className="mb-1 text-xs px-2.5 py-0.5">
                      {doc.availability}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-foreground leading-snug tracking-tight">{doc.name}</h4>
                      {isSelf && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" /> You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-primary font-semibold">{doc.specialty}</div>
                    <div className="text-xs text-muted-foreground font-medium">Dept: {doc.department}</div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border/40 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                        <UserCheck className="h-4 w-4 text-muted-foreground/70" /> Active Caseload
                      </span>
                      <span className="font-semibold text-foreground truncate">{doc.activePatients} patients</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                        <Calendar className="h-4 w-4 text-muted-foreground/70" /> Daily Shift Load
                      </span>
                      {(() => {
                        const today = new Date().toISOString().split("T")[0]
                        const todayCount = appointments.filter(a => a.doctorId === doc.id && a.date === today && a.status !== "Cancelled").length
                        const loadText = todayCount >= 3 ? "Heavy Load" : todayCount > 0 ? "Medium Load" : "Light Load"
                        return (
                          <span className="font-semibold text-foreground truncate min-w-0 text-right">
                            {todayCount} booking{todayCount !== 1 ? 's' : ''} <span className="text-muted-foreground font-normal">({loadText})</span>
                          </span>
                        )
                      })()}
                    </div>

                    {canViewSensitiveData && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                          <Mail className="h-4 w-4 text-muted-foreground/70" /> Contact Info
                        </span>
                        <span className="font-medium text-foreground truncate select-all text-right min-w-0" title={doc.email}>
                          {doc.email}
                        </span>
                      </div>
                    )}

                    {canViewSensitiveData && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground font-medium flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                          <Stethoscope className="h-4 w-4 text-muted-foreground/70" /> Salary
                        </span>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground flex-shrink-0">
                          <span>${(doc.salary || 0).toLocaleString()}</span>
                          <Badge
                            variant={doc.salaryStatus?.toLowerCase() === 'paid' ? 'completed' : 'inprogress'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {doc.salaryStatus || 'Unpaid'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Shift Status</span>
                {canChangeStatus(doc) ? (
                  <div className="w-[140px]">
                    <Select
                      value={doc.availability}
                      onChange={(e) => handleStatusChange(doc.id, e.target.value as Doctor['availability'])}
                      className="h-8 text-xs py-1"
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="On Leave">On Leave</option>
                    </Select>
                  </div>
                ) : (
                  <Badge variant={getStatusBadgeVariant(doc.availability)} className="text-xs">{doc.availability}</Badge>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {doctors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center">
            <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">No staff members registered yet.</p>
          {(activeRole === "Super Admin" || activeRole === "Clinic Admin") && (
            <Link to="/admin-panel">
              <Button size="sm" variant="outline" className="cursor-pointer">
                <Plus className="h-4.5 w-4.5 mr-1" /> Add First Doctor in Admin Panel
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 bg-muted/20 border border-border p-4 rounded-xl text-xs text-muted-foreground leading-relaxed">
        <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
        <span>
          Availability switches update immediately across the appointments grid scheduler. Changing status to <strong>On Leave</strong> displays warnings on the appointments page if bookings exist.
        </span>
      </div>
    </div>
  )
}
