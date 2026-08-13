"use client"

import { Link, useLocation, useNavigate } from "react-router-dom"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  CreditCard,
  Settings,
  HeartPulse,
  LogOut,
  Clock,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Workflow,
  UserCheck,
  Trash2
} from "lucide-react"

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Follow-ups", href: "/follow-ups", icon: Clock },
  { name: "Unified Inbox", href: "/communication", icon: MessageSquare },
  { name: "WhatsApp Engine", href: "/whatsapp-automation", icon: MessageCircle },
  { name: "Billing & Invoices", href: "/billing", icon: CreditCard },
  { name: "Attending Staff", href: "/doctors", icon: Stethoscope },
  { name: "Staff Admin Panel", href: "/admin-panel", icon: UserCheck },
  { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { name: "Workflow Builder", href: "/automation-builder", icon: Workflow },
  { name: "Patient Trash Bin", href: "/trash", icon: Trash2, adminOnly: true },
  { name: "System Settings", href: "/settings", icon: Settings },
]

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const router = {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true })
  }
  const [session, setSession] = React.useState<{ name: string; role: string; avatar: string } | null>(null)

  const [clinicName, setClinicName] = React.useState("OnlyClinic")
  const [clinicSub, setClinicSub] = React.useState("Healthcare SaaS Engine")

  React.useEffect(() => {
    const stored = localStorage.getItem("active_user_session")
    if (stored) {
      setSession(JSON.parse(stored))
    }

    const loadSettings = () => {
      const storedSettings = localStorage.getItem("h_clinic_settings")
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings)
          if (settings.hName) {
            setClinicName(settings.hName)
            setClinicSub("Clinic Registry Profile")
            return
          }
        } catch (e) {}
      }
      setClinicName("OnlyClinic")
      setClinicSub("Healthcare SaaS Engine")
    }

    loadSettings()

    window.addEventListener("clinic-settings-updated", loadSettings)
    window.addEventListener("storage", loadSettings)

    return () => {
      window.removeEventListener("clinic-settings-updated", loadSettings)
      window.removeEventListener("storage", loadSettings)
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("active_user_session")
    router.push("/login")
  }

  // Filter links based on user session role
  const filteredMenuItems = React.useMemo(() => {
    if (!session) return []
    const role = session.role

    if (role === "Patient") {
      return [
        { name: "Portal Dashboard", href: "/patient-portal?tab=overview", icon: LayoutDashboard },
        { name: "My Appointments", href: "/patient-portal?tab=appointments", icon: Calendar },
        { name: "Medical History", href: "/patient-portal?tab=medical", icon: Stethoscope },
        { name: "Invoices & Payments", href: "/patient-portal?tab=billing", icon: CreditCard },
        { name: "Chat Support", href: "/patient-portal?tab=chat", icon: MessageSquare }
      ]
    }

    // Otherwise, filter original menuItems
    return menuItems.filter(item => {
      if (role === "Super Admin") return true
      if (role === "Clinic Admin" || role === "Administrator") return true

      // Non-admin roles: hide adminOnly items
      if ((item as any).adminOnly) return false

      if (role === "Doctor" || role === "Physician") {
        return (
          item.href === "/" ||
          item.href === "/patients" ||
          item.href === "/appointments" ||
          item.href === "/follow-ups" ||
          item.href === "/communication" ||
          item.href === "/doctors"
        )
      }

      if (role === "Receptionist") {
        return (
          item.href === "/" ||
          item.href === "/patients" ||
          item.href === "/appointments" ||
          item.href === "/follow-ups" ||
          item.href === "/communication" ||
          item.href === "/billing" ||
          item.href === "/whatsapp-automation" ||
          item.href === "/doctors"
        )
      }

      return false
    })
  }, [session])

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r border-border bg-card text-card-foreground",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-border/40 gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0">
          <HeartPulse className="h-5.5 w-5.5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xs font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate" title={clinicName}>
            {clinicName}
          </h1>
          <span className="text-[9px] text-muted-foreground block -mt-1 font-medium truncate" title={clinicSub}>
            {clinicSub}
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isPatientTab = item.href.includes("?tab=")
          const tabParam = isPatientTab ? item.href.split("?tab=")[1] : null
          const activeTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") || "overview" : "overview"
          const isActive = isPatientTab 
            ? pathname === "/patient-portal" && activeTab === tabParam
            : pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 group relative cursor-pointer",
                {
                  "bg-primary/10 text-primary": isActive,
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground": !isActive,
                }
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/4 h-1/2 w-1 rounded-r-md bg-primary" />
              )}
              <item.icon
                className={cn("h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110", {
                  "text-primary": isActive,
                  "text-muted-foreground group-hover:text-accent-foreground": !isActive,
                })}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="border-t border-border/40 p-4 flex items-center justify-between">
        {session ? (
          <div className="flex items-center gap-2.5">
            <img
              src={session.avatar}
              alt="User Avatar"
              className="h-8 w-8 rounded-full border border-border object-cover bg-muted"
            />
            <div>
              <h4 className="text-xxs font-bold leading-tight text-foreground truncate max-w-[130px]">
                {session.name}
              </h4>
              <span className="text-[10px] text-muted-foreground block truncate max-w-[130px] font-semibold uppercase">{session.role}</span>
            </div>
          </div>
        ) : (
          <div className="text-xxs text-muted-foreground font-semibold">Not Authenticated</div>
        )}
        <button
          onClick={handleLogout}
          title="Sign out"
          className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
