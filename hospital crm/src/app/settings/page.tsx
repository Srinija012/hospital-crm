"use client"

import * as React from "react"
import {
  Settings,
  Building2,
  Clock,
  ShieldAlert,
  Save,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState("profile")
  const [successMsg, setSuccessMsg] = React.useState("")

  // Form states
  const [hName, setHName] = React.useState("Aegis General Hospital")
  const [hAddress, setHAddress] = React.useState("100 Healthcare Parkway, Medical District")
  const [hContact, setHContact] = React.useState("director@aegisgeneral.com")
  const [hPhone, setHPhone] = React.useState("+1 (555) 010-0900")
  
  const [shiftStart, setShiftStart] = React.useState("08:00 AM")
  const [shiftEnd, setShiftEnd] = React.useState("06:00 PM")
  const [timeZone, setTimeZone] = React.useState("EST (GMT -5)")
  
  const [roleMode, setRoleMode] = React.useState("Administrator")
  const [securityLevel, setSecurityLevel] = React.useState("Tier 1 - Full Access Clearance")

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("active_user_session")
      if (stored) {
        const sess = JSON.parse(stored)
        setRoleMode(sess.role)
        updateSecurityLabel(sess.role)
      }

      const storedSettings = localStorage.getItem("h_clinic_settings")
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings)
          if (settings.hName) setHName(settings.hName)
          if (settings.hAddress) setHAddress(settings.hAddress)
          if (settings.hContact) setHContact(settings.hContact)
          if (settings.hPhone) setHPhone(settings.hPhone)
          if (settings.shiftStart) setShiftStart(settings.shiftStart)
          if (settings.shiftEnd) setShiftEnd(settings.shiftEnd)
          if (settings.timeZone) setTimeZone(settings.timeZone)
        } catch (e) {
          console.warn("Failed to parse clinic settings", e)
        }
      }
    }
  }, [])

  const updateSecurityLabel = (role: string) => {
    if (role === "Administrator") {
      setSecurityLevel("Tier 1 - Full Access Clearance")
    } else if (role === "Physician") {
      setSecurityLevel("Tier 2 - Clinical Access Clearance")
    } else if (role === "Receptionist") {
      setSecurityLevel("Tier 3 - Front Desk Access Clearance")
    }
  }

  React.useEffect(() => {
    updateSecurityLabel(roleMode)
  }, [roleMode])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window !== "undefined") {
      const settings = {
        hName,
        hAddress,
        hContact,
        hPhone,
        shiftStart,
        shiftEnd,
        timeZone
      }
      localStorage.setItem("h_clinic_settings", JSON.stringify(settings))
      window.dispatchEvent(new Event("clinic-settings-updated"))
    }
    setSuccessMsg("Settings updated successfully!")
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const handleSaveRoles = (e: React.FormEvent) => {
    e.preventDefault()
    let sessionData = null
    
    if (roleMode === "Administrator") {
      sessionData = {
        username: "admin",
        role: "Administrator",
        name: "Dr. Marcus Vance",
        avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120"
      }
    } else if (roleMode === "Physician") {
      sessionData = {
        username: "doctor",
        role: "Physician",
        name: "Dr. Sarah Connor",
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120"
      }
    } else if (roleMode === "Receptionist") {
      sessionData = {
        username: "receptionist",
        role: "Receptionist",
        name: "Emily Watson",
        avatar: "https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=120"
      }
    }

    if (sessionData && typeof window !== "undefined") {
      localStorage.setItem("active_user_session", JSON.stringify(sessionData))
      setSuccessMsg(`Switched role session to ${roleMode}! Refreshing page...`)
      setTimeout(() => {
        window.location.reload()
      }, 200)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      {/* Header status panel */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4.5 w-4.5" /> {successMsg}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tabs Triggers */}
        <TabsList className="w-full justify-start border-b border-border/40 bg-transparent rounded-none h-auto p-0 mb-6 space-x-6">
          <TabsTrigger
            value="profile"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 py-3 text-xs"
          >
            <Building2 className="h-4 w-4 mr-2 inline" /> Clinic Profile
          </TabsTrigger>
          <TabsTrigger
            value="hours"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 py-3 text-xs"
          >
            <Clock className="h-4 w-4 mr-2 inline" /> Working Hours
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-1 py-3 text-xs"
          >
            <ShieldAlert className="h-4 w-4 mr-2 inline" /> Security & Roles
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Clinic Profile */}
        <TabsContent value="profile">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Clinical Information Registry</CardTitle>
                <CardDescription className="text-xxs">Configure base directory listings, addresses, and contacts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="h-name">Clinic/Hospital Name</Label>
                    <Input id="h-name" value={hName} onChange={(e) => setHName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="h-contact">Director email</Label>
                    <Input id="h-contact" type="email" value={hContact} onChange={(e) => setHContact(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="h-address">Physical Street Address</Label>
                  <Input id="h-address" value={hAddress} onChange={(e) => setHAddress(e.target.value)} required />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="h-phone">Switchboard Phone</Label>
                    <Input id="h-phone" value={hPhone} onChange={(e) => setHPhone(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="h-depts">Active Specialties</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="outline">Cardiology</Badge>
                      <Badge variant="outline">Pediatrics</Badge>
                      <Badge variant="outline">Dermatology</Badge>
                      <Badge variant="outline">Neurology</Badge>
                      <Badge variant="outline">Orthopedics</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button type="submit" size="sm" className="cursor-pointer">
                  <Save className="h-4 w-4 mr-1.5" /> Save Profile
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Tab 2: Working Hours */}
        <TabsContent value="hours">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Shift Work Schedules</CardTitle>
                <CardDescription className="text-xxs">Define operational schedules and default clinic timezone settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="shift-start">Start Shift Time</Label>
                    <Select id="shift-start" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)}>
                      <option value="07:00 AM">07:00 AM</option>
                      <option value="08:00 AM">08:00 AM</option>
                      <option value="09:00 AM">09:00 AM</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shift-end">End Shift Time</Label>
                    <Select id="shift-end" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)}>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                      <option value="08:00 PM">08:00 PM</option>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">Operational Timezone</Label>
                    <Select id="timezone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                      <option value="EST (GMT -5)">EST (GMT -5)</option>
                      <option value="PST (GMT -8)">PST (GMT -8)</option>
                      <option value="GMT (GMT 0)">GMT (GMT 0)</option>
                      <option value="IST (GMT +5:30)">IST (GMT +5:30)</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Weekend Policy</Label>
                    <div className="text-xxs text-muted-foreground mt-2 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-500" /> Weekend bookings require director approvals
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button type="submit" size="sm" className="cursor-pointer">
                  <Save className="h-4 w-4 mr-1.5" /> Save Roster Rules
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Tab 3: Security & Roles */}
        <TabsContent value="roles">
          <form onSubmit={handleSaveRoles}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Access Privilege Profiles</CardTitle>
                <CardDescription className="text-xxs">Verify administrative and billing clearance levels for active session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-role">Active User Role</Label>
                    <Select id="sec-role" value={roleMode} onChange={(e) => setRoleMode(e.target.value)}>
                      <option value="Administrator">Administrator</option>
                      <option value="Physician">Physician</option>
                      <option value="Receptionist">Receptionist</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sec-level">Clearance Tier</Label>
                    <Input id="sec-level" value={securityLevel} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button type="submit" size="sm" className="cursor-pointer">
                  <Save className="h-4 w-4 mr-1.5" /> Apply Roles
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
