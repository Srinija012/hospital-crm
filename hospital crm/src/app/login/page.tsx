"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { HeartPulse, Lock, User, AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dbGetPatients, dbSavePatient } from "@/lib/db"

export default function LoginPage() {
  const navigate = useNavigate()
  const router = {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true })
  }
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMsg, setErrorMsg] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setLoading(true)

    // Set a short delay for premium loading feel
    setTimeout(async () => {
      let sessionData = null

      if (username === "superadmin" && password === "superadmin123") {
        sessionData = {
          username: "superadmin",
          role: "Super Admin",
          name: "Platform Operator",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120"
        }
      } else if (username === "admin" && password === "admin123") {
        sessionData = {
          username: "admin",
          role: "Clinic Admin",
          name: "Dr. Marcus Vance",
          avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120"
        }
      } else if (username === "doctor" && password === "doctor123") {
        sessionData = {
          username: "doctor",
          role: "Doctor",
          name: "Dr. Sarah Connor",
          avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120"
        }
      } else if (username === "receptionist" && password === "receptionist123") {
        sessionData = {
          username: "receptionist",
          role: "Receptionist",
          name: "Emily Watson",
          avatar: "https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=120"
        }
      } else {
        // Patient login logic
        let pats = await dbGetPatients()
        if (pats.length === 0 && (username === "pat-1" || username === "patient") && password === "patient123") {
          const seeded = await dbSavePatient({
            name: "Jane Doe",
            age: 28,
            gender: "Female",
            dob: "1998-05-15",
            phone: "+15550199",
            alternatePhone: "",
            email: "jane.doe@example.com",
            addressInfo: { address: "456 Oak Ave", city: "Metropolis", state: "NY", country: "USA", pincode: "10001" },
            bloodGroup: "A+",
            existingConditions: "None",
            allergies: "Peanuts",
            doctorAssignedId: "doc-1",
            doctorAssignedName: "Dr. Sarah Connor",
            preferredLanguage: "English",
            preferredContactMethod: "WhatsApp",
            whatsappOptIn: true,
            lastVisit: "2026-06-08",
            vitals: [{ date: "2026-06-08", bp: "118/75", heartRate: 68, temp: 98.4 }],
            medicalHistory: [{ date: "2026-06-08", diagnosis: "Routine Screening Checkup", doctor: "Dr. Sarah Connor", treatment: "Recommended annual physical", notes: "Patient is in excellent cardiovascular health." }],
            prescriptions: [{ name: "Multivitamins", dosage: "1 capsule", frequency: "Once daily", status: "Active" }],
            communications: [{ id: "com-init", type: "whatsapp", direction: "received", content: "Hi! Can I schedule my annual consult?", timestamp: "6/8/2026 10:00 AM", status: "read" }]
          })
          pats = [seeded]
        }

        const matchedPat = pats.find(p => p.id === username || p.phone === username || (username === "patient" && p.id === "pat-1"))
        if (matchedPat && password === "patient123") {
          sessionData = {
            username: matchedPat.id,
            role: "Patient",
            name: matchedPat.name,
            avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120"
          }
        }
      }

      if (sessionData) {
        localStorage.setItem("active_user_session", JSON.stringify(sessionData))
        if (sessionData.role === "Patient") {
          router.push("/patient-portal")
        } else {
          router.push("/")
        }
      } else {
        setErrorMsg("Invalid username or password credentials.")
        setLoading(false)
      }
    }, 800)
  }

  // Helper function to auto-fill credentials for testing convenience
  const autofillCredentials = (userType: 'superadmin' | 'admin' | 'doctor' | 'recep' | 'patient') => {
    if (userType === 'superadmin') {
      setUsername("superadmin")
      setPassword("superadmin123")
    } else if (userType === 'admin') {
      setUsername("admin")
      setPassword("admin123")
    } else if (userType === 'doctor') {
      setUsername("doctor")
      setPassword("doctor123")
    } else if (userType === 'recep') {
      setUsername("receptionist")
      setPassword("receptionist123")
    } else {
      setUsername("pat-1")
      setPassword("patient123")
    }
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand logo header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <HeartPulse className="h-7 w-7 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Aegis CRM
          </h1>
          <p className="text-xs text-muted-foreground font-medium">Healthcare Administration SaaS Portal</p>
        </div>

        {/* Login form Card */}
        <Card className="shadow-2xl border-border/60">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Sign In to Dashboard</CardTitle>
            <CardDescription className="text-xxs">Enter credentials to unlock role-based privileges.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 text-xxs">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-semibold">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Username input */}
              <div className="space-y-1.5">
                <Label htmlFor="login-user">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/80" />
                  <Input
                    id="login-user"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 text-xs h-9"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="space-y-1.5">
                <Label htmlFor="login-pass">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/80" />
                  <Input
                    id="login-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs h-9"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-3">
              <Button type="submit" className="w-full h-9 text-xs cursor-pointer font-bold" disabled={loading}>
                {loading ? "Verifying Credentials..." : "Unlock Access"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Quick Autofill Helper Box */}
        <Card className="bg-muted/30 border-dashed shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xxs font-bold text-muted-foreground uppercase">
              <Info className="h-4 w-4 text-primary" /> Test Account Autofill
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => autofillCredentials('superadmin')}
                className="p-1.5 rounded-lg bg-card border border-border text-[9px] font-bold text-foreground hover:border-primary/50 transition-colors text-center cursor-pointer"
                title="Super Admin"
              >
                Super
              </button>
              <button
                type="button"
                onClick={() => autofillCredentials('admin')}
                className="p-1.5 rounded-lg bg-card border border-border text-[9px] font-bold text-foreground hover:border-primary/50 transition-colors text-center cursor-pointer"
                title="Clinic Admin"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => autofillCredentials('doctor')}
                className="p-1.5 rounded-lg bg-card border border-border text-[9px] font-bold text-foreground hover:border-primary/50 transition-colors text-center cursor-pointer"
                title="Doctor"
              >
                Doctor
              </button>
              <button
                type="button"
                onClick={() => autofillCredentials('recep')}
                className="p-1.5 rounded-lg bg-card border border-border text-[9px] font-bold text-foreground hover:border-primary/50 transition-colors text-center cursor-pointer"
                title="Receptionist"
              >
                Recep
              </button>
              <button
                type="button"
                onClick={() => autofillCredentials('patient')}
                className="p-1.5 rounded-lg bg-card border border-border text-[9px] font-bold text-foreground hover:border-primary/50 transition-colors text-center cursor-pointer"
                title="Patient"
              >
                Patient
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
