"use client"

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ShieldAlert, LogOut, ArrowLeft, HeartPulse } from "lucide-react"
import { Button } from "./ui/button"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { getMigrationError } from "@/lib/db"
import { WhatsAppProvider } from "@/lib/whatsapp-context"

export interface UserSession {
  username: string
  role: 'Super Admin' | 'Clinic Admin' | 'Doctor' | 'Receptionist' | 'Patient'
  name: string
  avatar: string
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const pathname = location.pathname
  const navigate = useNavigate()
  const router = {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true })
  }
  const [session, setSession] = React.useState<UserSession | null>(null)
  const [loading, setLoading] = React.useState(true)

  const checkAuth = () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_user_session")
      if (stored) {
        setSession(JSON.parse(stored))
      } else {
        setSession(null)
      }
    }
    setLoading(false)
  }

  // Monitor path changes and check auth
  React.useEffect(() => {
    checkAuth()
    
    // Listen to storage changes for multi-tab support
    const handleStorageChange = () => checkAuth()
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [pathname])

  React.useEffect(() => {
    if (!loading) {
      if (!session && pathname !== "/login") {
        router.push("/login")
      } else if (session) {
        if (pathname === "/login") {
          if (session.role === "Patient") {
            router.push("/patient-portal")
          } else {
            router.push("/")
          }
        } else if (session.role === "Patient" && !pathname.startsWith("/patient-portal")) {
          router.push("/patient-portal")
        } else if (session.role !== "Patient" && pathname.startsWith("/patient-portal")) {
          router.push("/")
        }
      }
    }
  }, [session, pathname, loading, router])

  const handleLogout = () => {
    localStorage.removeItem("active_user_session")
    setSession(null)
    router.push("/login")
  }

  // Access Permission rules checks
  const hasAccess = () => {
    if (!session) return false
    
    const role = session.role
    
    // Super Admin has access to everything
    if (role === "Super Admin") return true

    // Patients can ONLY view patient-portal routes
    if (role === "Patient") {
      return pathname.startsWith("/patient-portal")
    }

    // Non-patients cannot access the patient portal
    if (pathname.startsWith("/patient-portal")) {
      return false
    }

    // Clinic Admin has access to all clinical/admin modules
    if (role === "Clinic Admin") return true

    // Restricted routes rules for Receptionist
    if (role === "Receptionist") {
      if (pathname === "/admin-panel" || pathname === "/settings" || pathname === "/reports" || pathname === "/automation-builder") {
        return false
      }
    }

    // Restricted routes rules for Doctor
    if (role === "Doctor") {
      if (
        pathname === "/admin-panel" || 
        pathname === "/settings" || 
        pathname === "/reports" || 
        pathname === "/automation-builder" || 
        pathname === "/billing" ||
        pathname === "/whatsapp-automation"
      ) {
        return false
      }
    }

    return true
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <HeartPulse className="h-12 w-12 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-muted-foreground animate-pulse">Authenticating OnlyClinic session...</span>
        </div>
      </div>
    )
  }

  // If on login, let the login page render directly without layout wrappers
  if (pathname === "/login") {
    return <>{children}</>
  }

  if (!session) {
    return null // Will redirect in useEffect
  }

  // Access Denied screen
  if (!hasAccess()) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-6 bg-background text-foreground animate-in fade-in duration-500">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
          <div className="h-16 w-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
            <ShieldAlert className="h-9 w-9 animate-bounce" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Access Restricted</h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Your profile is logged in as <strong className="text-rose-500 uppercase">{session.role}</strong>. 
              This route requires authorization parameters that your current role does not possess.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs cursor-pointer"
              onClick={() => {
                if (session.role === "Patient") {
                  router.push("/patient-portal")
                } else {
                  router.push("/")
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Safety
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 text-xs cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isFullBleed = pathname === "/automation-builder" || pathname === "/whatsapp-automation"

  return (
    <WhatsAppProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar Left */}
        <Sidebar className="hidden md:flex flex-shrink-0" />
        
        {/* Main Content Area Right */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Top */}
          <Header />
          
          {/* Sub-page Content */}
          <main className={`flex-1 relative ${isFullBleed ? 'p-0 overflow-hidden' : 'overflow-y-auto p-6 md:p-8'}`}>
            {getMigrationError() && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl mb-6 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                <div>
                  <strong className="font-bold">Database Migration Error:</strong> {getMigrationError()}. Your localStorage data was not touched. Try refreshing the page or clearing browser storage.
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </WhatsAppProvider>
  )
}
