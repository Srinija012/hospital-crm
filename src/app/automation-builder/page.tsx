"use client"

import * as React from "react"
import {
  Workflow,
  Plus,
  Play,
  Pause,
  ArrowDown,
  Trash2,
  CheckCircle,
  Clock,
  MessageSquare,
  UserCheck,
  Languages,
  Settings,
  FileText,
  Copy,
  Pencil,
  Zap,
  BarChart3,
  Search,
  BookOpen,
  Calendar,
  LayoutGrid,
  Mail,
  GripVertical,
  Filter,
  ShieldAlert,
  Sparkles,
  Tag,
  Layers,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  dbGetWorkflows,
  dbSaveWorkflow,
  dbDeleteWorkflow,
  dbGetWorkflowLogs,
  dbClearWorkflowLogs,
  dbRunWorkflowInBulk,
  dbGetPatients,
  dbExecuteWorkflowForPatient,
  AutomationWorkflow,
  WorkflowExecutionLog,
  Patient
} from "@/lib/db"

// ─── Extended Product Architect Palette Node Categories ─────────────────────

export interface PaletteNode {
  id: string
  label: string
  category: "Triggers" | "Delays" | "Conditions" | "Messaging" | "Operations"
  desc: string
  iconName: string
  defaultStep: string
}

const EVENT_TRIGGERS = [
  { value: "Patient Registered", label: "Patient Registered", desc: "Fires instantly when a new patient is enrolled in CRM" },
  { value: "Appointment Scheduled", label: "Appointment Scheduled", desc: "Fires when an appointment slot is confirmed" },
  { value: "Appointment Cancelled", label: "Appointment Cancelled / No-Show", desc: "Fires when an appointment is marked cancelled or no-show" },
  { value: "Invoice Created", label: "Invoice Created", desc: "Fires when a new clinical invoice is generated" },
  { value: "Bill Settle Complete", label: "Bill Settled / Paid", desc: "Fires when an invoice is marked fully paid" },
  { value: "Lab Results Ready", label: "Lab / Diagnostic Uploaded", desc: "Fires when lab test results are added to medical history" },
  { value: "Patient Inactive (30+ Days)", label: "Inactive Patient (30+ Days)", desc: "Fires when patient has no consultation for 30+ days" },
  { value: "Incoming WhatsApp Message", label: "Incoming WhatsApp Message", desc: "Fires when patient sends an incoming WhatsApp message" }
]

const PALETTE_NODES: PaletteNode[] = [
  // ⏱️ Delays & Timing
  { id: "delay-time", label: "Wait Delay Timer", category: "Delays", desc: "Pause workflow for specified minutes, hours, or days", iconName: "clock", defaultStep: "Wait: 1 Days" },
  { id: "delay-until", label: "Wait Until Specific Time", category: "Delays", desc: "Hold execution until exact clock time (e.g. 9:00 AM Next Day)", iconName: "calendar", defaultStep: "Wait: 9:00 AM Next Day" },

  // 🔀 Logic & Conditions
  { id: "filter-lang", label: "Filter: Preferred Language", category: "Conditions", desc: "Branch or filter based on patient language (Telugu, Hindi, English, etc.)", iconName: "lang", defaultStep: "Filter: Language = English" },
  { id: "filter-triage", label: "Filter: Triage Priority", category: "Conditions", desc: "Filter execution by High Risk, Emergency, or Normal priority", iconName: "triage", defaultStep: "Filter: Priority = High Risk" },
  { id: "filter-optin", label: "Filter: WhatsApp Opt-In", category: "Conditions", desc: "Check if patient has consented to WhatsApp messages", iconName: "shield", defaultStep: "Filter: WhatsApp Opt-in = Yes" },
  { id: "filter-age", label: "Filter: Age Bracket", category: "Conditions", desc: "Segment by Senior (65+), Adult (18-64), or Pediatric (<18)", iconName: "filter", defaultStep: "Filter: Age Group = Senior" },

  // 💬 Messaging Actions
  { id: "msg-wa-welcome", label: "Send Welcome WhatsApp", category: "Messaging", desc: "Send default clinic introduction via WhatsApp", iconName: "wa", defaultStep: "Send Welcome WhatsApp" },
  { id: "msg-wa-custom", label: "Send Custom WhatsApp Message", category: "Messaging", desc: "Send dynamic text with tags ({Patient Name}, {Doctor}, {Date})", iconName: "wa", defaultStep: "Send WhatsApp: Hello {Patient Name}, welcome to OnlyClinic!" },
  { id: "msg-wa-invoice", label: "Send WhatsApp Invoice PDF", category: "Messaging", desc: "Attach itemized clinical bill text/PDF via WhatsApp", iconName: "doc", defaultStep: "Send WhatsApp Invoice Attachment" },
  { id: "msg-wa-feedback", label: "Send WhatsApp Feedback Request", category: "Messaging", desc: "Ask patient to rate their consultation experience", iconName: "wa", defaultStep: "Send WhatsApp: Hi {Patient Name}, how was your consultation with {Doctor}? Please reply with feedback." },
  { id: "msg-sms-bill", label: "Send SMS Payment Reminder", category: "Messaging", desc: "Send SMS alert for pending bill balance", iconName: "sms", defaultStep: "Send Pending Bill SMS" },
  { id: "msg-sms-custom", label: "Send Custom SMS", category: "Messaging", desc: "Dispatch custom text message via SMS gateway", iconName: "sms", defaultStep: "Send SMS: Hello {Patient Name}, your appointment is confirmed for {Date} at {Time}." },
  { id: "msg-email-welcome", label: "Send Welcome Email", category: "Messaging", desc: "Send formal clinic welcome email to patient address", iconName: "email", defaultStep: "Send Email: Welcome" },

  // 🩺 Clinical Operations
  { id: "op-create-task", label: "Create Staff Follow-up Task", category: "Operations", desc: "Assign follow-up task to assigned doctor / receptionist", iconName: "task", defaultStep: "Create Staff Task" },
  { id: "op-triage-level", label: "Set Patient Triage Priority", category: "Operations", desc: "Update patient risk classification to High or Emergency", iconName: "triage", defaultStep: "Internal: Set Triage Priority = High" },
  { id: "op-add-tag", label: "Add Patient CRM Tag", category: "Operations", desc: "Tag patient profile with VIP, Chronic Care, or High Risk", iconName: "tag", defaultStep: "Internal: Add Tag = VIP" },
  { id: "op-auto-recurrent", label: "Auto-Schedule 30-Day Checkup", category: "Operations", desc: "Schedule next recurring consult task in 30 days", iconName: "calendar", defaultStep: "Internal: Auto-schedule Next Follow-up" },
  { id: "op-block-wa", label: "Opt-Out WhatsApp (Block)", category: "Operations", desc: "Flag patient as opted-out from automated WhatsApps", iconName: "shield", defaultStep: "Internal: Block WhatsApp Communication" },
  { id: "op-unblock-wa", label: "Opt-In WhatsApp (Unblock)", category: "Operations", desc: "Restore WhatsApp message eligibility for patient", iconName: "shield", defaultStep: "Internal: Unblock WhatsApp Communication" },
  { id: "op-webhook", label: "Trigger External Webhook API", category: "Operations", desc: "Dispatch HTTP POST JSON event to external hospital EHR", iconName: "zap", defaultStep: "Trigger Webhook: https://api.hospital-ehr.com/event" }
]

const ENTERPRISE_BLUEPRINTS = [
  {
    name: "New Patient Onboarding & Multilingual Welcome Journey",
    trigger: "Patient Registered",
    desc: "Immediately sends a personalized welcome WhatsApp message in the patient's language, waits 2 days, and creates a follow-up task for reception.",
    steps: [
      "Filter: Language = English",
      "Send Welcome WhatsApp",
      "Wait: 2 Days",
      "Create Staff Task"
    ]
  },
  {
    name: "Post-Consultation Invoice & Feedback Loop",
    trigger: "Bill Settle Complete",
    desc: "Waits 2 hours after bill payment, sends WhatsApp feedback survey, and tags patient profile as Engaged.",
    steps: [
      "Wait: 2 Hours",
      "Send WhatsApp: Hi {Patient Name}, thank you for choosing OnlyClinic! How was your consultation today with {Doctor}? Reply with your feedback.",
      "Internal: Add Tag = VIP"
    ]
  },
  {
    name: "High-Risk Triage & Doctor Escalation Pathway",
    trigger: "Appointment Cancelled",
    desc: "Flags cancelled appointments as High Risk, creates immediate doctor task, and sends WhatsApp rebooking link.",
    steps: [
      "Internal: Set Triage Priority = High",
      "Create Staff Task",
      "Send WhatsApp: Hello {Patient Name}, we noticed your appointment with {Doctor} on {Date} was cancelled. Would you like to reschedule now?"
    ]
  },
  {
    name: "Chronic Care 30-Day Recurrent Checkup Scheduler",
    trigger: "Patient Inactive (30+ Days)",
    desc: "Automatically schedules recurring 30-day follow-up consultation task and dispatches wellness reminder SMS.",
    steps: [
      "Internal: Auto-schedule Next Follow-up",
      "Send SMS: Dear {Patient Name}, it has been 30 days since your last checkup. We recommend scheduling a routine wellness consultation with {Doctor}."
    ]
  },
  {
    name: "Payment Overdue Warning & Automatic Opt-Out Management",
    trigger: "Invoice Created",
    desc: "Waits 3 days for bill settlement, sends SMS invoice reminder, and attaches invoice PDF via WhatsApp.",
    steps: [
      "Wait: 3 Days",
      "Send Pending Bill SMS",
      "Send WhatsApp Invoice Attachment"
    ]
  }
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryColor(category: string) {
  switch (category) {
    case "Triggers": return "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
    case "Delays": return "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400"
    case "Conditions": return "border-indigo-500/40 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400"
    case "Messaging": return "border-teal-500/40 bg-teal-500/5 text-teal-600 dark:text-teal-400"
    case "Operations": return "border-orange-500/40 bg-orange-500/5 text-orange-600 dark:text-orange-400"
    default: return "border-slate-500/40 bg-slate-500/5 text-slate-600 dark:text-slate-400"
  }
}

function getNodeIcon(iconName: string) {
  switch (iconName) {
    case "clock": return <Clock className="h-4 w-4 text-amber-500" />
    case "calendar": return <Calendar className="h-4 w-4 text-purple-500" />
    case "lang": return <Languages className="h-4 w-4 text-indigo-500" />
    case "triage": return <ShieldAlert className="h-4 w-4 text-rose-500" />
    case "shield": return <ShieldAlert className="h-4 w-4 text-blue-500" />
    case "filter": return <Filter className="h-4 w-4 text-cyan-500" />
    case "wa": return <MessageSquare className="h-4 w-4 text-emerald-500" />
    case "sms": return <MessageSquare className="h-4 w-4 text-sky-500" />
    case "email": return <Mail className="h-4 w-4 text-rose-500" />
    case "doc": return <FileText className="h-4 w-4 text-violet-500" />
    case "task": return <UserCheck className="h-4 w-4 text-orange-500" />
    case "tag": return <Tag className="h-4 w-4 text-pink-500" />
    case "zap": return <Zap className="h-4 w-4 text-yellow-500" />
    default: return <Settings className="h-4 w-4 text-muted-foreground" />
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AutomationBuilderPage({ embedded }: { embedded?: boolean }) {
  const [workflows, setWorkflows] = React.useState<AutomationWorkflow[]>([])
  const [activeWorkflow, setActiveWorkflow] = React.useState<AutomationWorkflow | null>(null)
  const [logs, setLogs] = React.useState<WorkflowExecutionLog[]>([])
  const [activeTab, setActiveTab] = React.useState("builder")
  
  // Palette search filter
  const [paletteFilter, setPaletteFilter] = React.useState("")
  const [activeCategoryTab, setActiveCategoryTab] = React.useState<string>("All")

  // Drag & drop dropzone states
  const [draggedNode, setDraggedNode] = React.useState<PaletteNode | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  // Step Editor Modal
  const [editingStepIndex, setEditingStepIndex] = React.useState<number | null>(null)
  const [stepEditText, setStepEditText] = React.useState("")
  const [isTranslating, setIsTranslating] = React.useState(false)

  // Dry-Run Sandbox Tester Modal
  const [showSandboxModal, setShowSandboxModal] = React.useState(false)
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = React.useState("")
  const [testResults, setTestResults] = React.useState<any[] | null>(null)
  const [isTesting, setIsTesting] = React.useState(false)

  // Feedback Notification
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Load Workflows and Patients
  const loadData = async () => {
    const wfs = await dbGetWorkflows()
    setWorkflows(wfs)
    if (wfs.length > 0 && !activeWorkflow) {
      setActiveWorkflow(wfs[0])
    }
    const lgs = await dbGetWorkflowLogs()
    setLogs(lgs)
    const pats = await dbGetPatients()
    setPatients(pats)
    if (pats.length > 0) {
      setSelectedPatientId(pats[0].id)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  // Create New Workflow
  const handleCreateNewWorkflow = async () => {
    const newWf: AutomationWorkflow = {
      id: `wf-${Date.now()}`,
      name: "New Clinical Outreach Flow",
      trigger: "Patient Registered",
      steps: [
        "Send Welcome WhatsApp",
        "Wait: 1 Days",
        "Create Staff Task"
      ],
      status: "Active",
      runCount: 0
    }
    await dbSaveWorkflow(newWf)
    await loadData()
    setActiveWorkflow(newWf)
    showToast("New automation workflow created!")
  }

  // Save current Active Workflow
  const handleSaveWorkflow = async () => {
    if (!activeWorkflow) return
    await dbSaveWorkflow(activeWorkflow)
    await loadData()
    showToast("Workflow saved successfully!")
  }

  // Load Preset Blueprint
  const handleLoadBlueprint = async (bp: typeof ENTERPRISE_BLUEPRINTS[0]) => {
    const newWf: AutomationWorkflow = {
      id: `wf-bp-${Date.now()}`,
      name: bp.name,
      trigger: bp.trigger,
      steps: [...bp.steps],
      status: "Active",
      runCount: 0
    }
    await dbSaveWorkflow(newWf)
    await loadData()
    setActiveWorkflow(newWf)
    showToast(`Loaded Blueprint: "${bp.name}"`)
  }

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, node: PaletteNode) => {
    setDraggedNode(node)
    e.dataTransfer.setData("application/json", JSON.stringify(node))
    e.dataTransfer.effectAllowed = "copy"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDragOverIndex(index)
  }

  const handleDropNode = (e: React.DragEvent, insertIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    if (!activeWorkflow) return

    let nodeToInsert = draggedNode
    if (!nodeToInsert) {
      try {
        const raw = e.dataTransfer.getData("application/json")
        if (raw) nodeToInsert = JSON.parse(raw)
      } catch (err) {}
    }
    if (!nodeToInsert) return

    const newSteps = [...activeWorkflow.steps]
    newSteps.splice(insertIndex, 0, nodeToInsert.defaultStep)
    setActiveWorkflow({ ...activeWorkflow, steps: newSteps })
    setDraggedNode(null)
    showToast(`Added step: ${nodeToInsert.label}`)
  }

  // Step Manipulation
  const handleMoveStep = (fromIdx: number, direction: 'up' | 'down') => {
    if (!activeWorkflow) return
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1
    if (toIdx < 0 || toIdx >= activeWorkflow.steps.length) return
    const newSteps = [...activeWorkflow.steps]
    const [moved] = newSteps.splice(fromIdx, 1)
    newSteps.splice(toIdx, 0, moved)
    setActiveWorkflow({ ...activeWorkflow, steps: newSteps })
  }

  const handleDeleteStep = (idx: number) => {
    if (!activeWorkflow) return
    const newSteps = [...activeWorkflow.steps]
    newSteps.splice(idx, 1)
    setActiveWorkflow({ ...activeWorkflow, steps: newSteps })
  }

  const handleDuplicateStep = (idx: number) => {
    if (!activeWorkflow) return
    const newSteps = [...activeWorkflow.steps]
    newSteps.splice(idx + 1, 0, activeWorkflow.steps[idx])
    setActiveWorkflow({ ...activeWorkflow, steps: newSteps })
  }

  // Open Step Editor
  const handleOpenStepEditor = (idx: number) => {
    if (!activeWorkflow) return
    setEditingStepIndex(idx)
    setStepEditText(activeWorkflow.steps[idx])
  }

  const handleSaveStepEdit = () => {
    if (!activeWorkflow || editingStepIndex === null) return
    const newSteps = [...activeWorkflow.steps]
    newSteps[editingStepIndex] = stepEditText
    setActiveWorkflow({ ...activeWorkflow, steps: newSteps })
    setEditingStepIndex(null)
    showToast("Step parameters updated!")
  }

  // Auto Translate helper inside Step Editor
  const handleAutoTranslateStep = async (targetLang: string) => {
    if (!stepEditText) return
    setIsTranslating(true)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(stepEditText)}`
      const res = await fetch(url)
      const data = await res.json()
      if (data && data[0]) {
        const translated = data[0].map((x: any) => x[0]).join('')
        setStepEditText(translated)
        showToast(`Translated to ${targetLang}!`)
      }
    } catch (err) {
      showToast("Translation service unavailable.")
    } finally {
      setIsTranslating(false)
    }
  }

  // Insert dynamic tag chip into text
  const handleInsertTag = (tag: string) => {
    setStepEditText(prev => `${prev} ${tag}`)
  }

  // Sandbox Dry-Run Test execution
  const handleRunSandboxTest = async () => {
    if (!activeWorkflow || !selectedPatientId) return
    setIsTesting(true)
    setTestResults(null)

    const selectedPat = patients.find(p => p.id === selectedPatientId)
    if (!selectedPat) {
      setIsTesting(false)
      return
    }

    const stepLogs: any[] = []
    try {
      await dbExecuteWorkflowForPatient(
        activeWorkflow,
        selectedPat,
        (step: string, status: 'success' | 'failed', error?: string, details?: string) => {
          stepLogs.push({ step, status, error, details, timestamp: new Date().toLocaleTimeString() })
        }
      )
      setTestResults(stepLogs)
    } catch (err: any) {
      stepLogs.push({ step: "Execution Engine", status: "failed", error: err.message })
      setTestResults(stepLogs)
    } finally {
      setIsTesting(false)
    }
  }

  // Bulk Run Execution
  const handleRunBulk = async () => {
    if (!activeWorkflow) return
    showToast(`Dispatched workflow execution across ${patients.length} patients...`)
    await dbRunWorkflowInBulk(activeWorkflow.id)
    await loadData()
    showToast("Bulk workflow execution complete!")
  }

  // Filter palette nodes
  const filteredPaletteNodes = PALETTE_NODES.filter(node => {
    const matchesFilter = node.label.toLowerCase().includes(paletteFilter.toLowerCase()) || node.desc.toLowerCase().includes(paletteFilter.toLowerCase())
    if (activeCategoryTab === "All") return matchesFilter
    return matchesFilter && node.category === activeCategoryTab
  })

  return (
    <div className={`min-h-screen bg-slate-50/50 dark:bg-slate-950/50 space-y-6 font-sans ${embedded ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
      
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="h-4 w-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  Drag & Drop Visual Automation Builder
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Product Architect Edition
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Design multi-step clinical outreach workflows, automated triage alerts, and multilingual WhatsApp patient journeys.
                </p>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleCreateNewWorkflow} className="text-xs font-bold gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" /> New Workflow
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSandboxModal(true)} disabled={!activeWorkflow} className="text-xs font-bold gap-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/5">
              <Play className="h-4 w-4" /> Dry-Run Sandbox Test
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveWorkflow} disabled={!activeWorkflow} className="text-xs font-bold gap-1.5 cursor-pointer shadow-lg shadow-primary/20">
              <CheckCircle className="h-4 w-4" /> Save Workflow
            </Button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="builder" className="text-xs font-bold gap-1.5 cursor-pointer">
            <LayoutGrid className="h-4 w-4" /> Canvas Builder
          </TabsTrigger>
          <TabsTrigger value="blueprints" className="text-xs font-bold gap-1.5 cursor-pointer">
            <BookOpen className="h-4 w-4" /> Preset Blueprints
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-bold gap-1.5 cursor-pointer">
            <BarChart3 className="h-4 w-4" /> Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VISUAL CANVAS BUILDER */}
        <TabsContent value="builder" className="mt-6 space-y-6">
          
          {/* Active Workflow Selector Header */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-full md:w-80">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Active Workflow</Label>
                  <select
                    value={activeWorkflow?.id || ""}
                    onChange={(e) => {
                      const found = workflows.find(w => w.id === e.target.value)
                      if (found) setActiveWorkflow(found)
                    }}
                    className="w-full h-9 rounded-xl border border-input bg-card px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {workflows.map(wf => (
                      <option key={wf.id} value={wf.id}>
                        {wf.name} ({wf.steps.length} Steps - {wf.status === 'Active' ? 'Active' : 'Paused'})
                      </option>
                    ))}
                  </select>
                </div>

                {activeWorkflow && (
                  <div className="pt-4 flex items-center gap-2">
                    <Input
                      value={activeWorkflow.name}
                      onChange={(e) => setActiveWorkflow({ ...activeWorkflow, name: e.target.value })}
                      className="text-xs font-bold h-9 w-60"
                      placeholder="Workflow Title"
                    />
                    <Button
                      variant={activeWorkflow.status === 'Active' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveWorkflow({ ...activeWorkflow, status: activeWorkflow.status === 'Active' ? 'Paused' : 'Active' })}
                      className={`text-xs font-bold h-9 cursor-pointer ${activeWorkflow.status === 'Active' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-amber-500 border-amber-500/30'}`}
                    >
                      {activeWorkflow.status === 'Active' ? <Play className="h-3.5 w-3.5 mr-1" /> : <Pause className="h-3.5 w-3.5 mr-1" />}
                      {activeWorkflow.status === 'Active' ? "Active" : "Paused"}
                    </Button>
                  </div>
                )}
              </div>

              {activeWorkflow && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRunBulk} className="text-xs font-bold gap-1.5 cursor-pointer">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Run in Bulk ({patients.length} Patients)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!activeWorkflow) return
                      await dbDeleteWorkflow(activeWorkflow.id)
                      await loadData()
                      showToast("Workflow deleted")
                    }}
                    className="text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {activeWorkflow ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT SIDEBAR: DRAGGABLE PALETTE LIBRARY */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="border-border/60 shadow-md h-full">
                  <CardHeader className="pb-3 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" /> Node Step Palette
                      </CardTitle>
                      <Badge variant="secondary" className="text-[9px] font-bold">
                        Drag to Canvas
                      </Badge>
                    </div>
                    <CardDescription className="text-xxs">
                      Drag any node onto the workflow canvas on the right to append or insert.
                    </CardDescription>

                    {/* Search & Category Tabs */}
                    <div className="space-y-2 pt-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search nodes..."
                          value={paletteFilter}
                          onChange={(e) => setPaletteFilter(e.target.value)}
                          className="pl-8 text-xs h-8"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {["All", "Delays", "Conditions", "Messaging", "Operations"].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategoryTab(cat)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              activeCategoryTab === cat
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 space-y-2 max-h-[620px] overflow-y-auto">
                    {filteredPaletteNodes.map(node => (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node)}
                        className={`p-3 rounded-xl border border-dashed transition-all hover:shadow-md cursor-grab active:cursor-grabbing group bg-card hover:border-primary/60 ${getCategoryColor(node.category)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-background border border-border shrink-0">
                              {getNodeIcon(node.iconName)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                {node.label}
                              </h4>
                              <p className="text-[10px] text-muted-foreground font-medium line-clamp-1">
                                {node.desc}
                              </p>
                            </div>
                          </div>
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-primary" />
                        </div>
                      </div>
                    ))}

                    {filteredPaletteNodes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No node steps found matching "{paletteFilter}".
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT CENTER: VISUAL WORKFLOW CANVAS */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="border-border/60 shadow-lg min-h-[650px] bg-slate-50/80 dark:bg-slate-950/80 relative overflow-hidden">
                  
                  {/* Canvas Background Mesh */}
                  <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                  <CardHeader className="pb-3 border-b border-border/40 bg-card/60 backdrop-blur-sm relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                          Visual Sequence Flow
                        </CardTitle>
                        <CardDescription className="text-xxs">
                          Drop palette cards into any drop zone below. Click any step to configure custom parameters.
                        </CardDescription>
                      </div>

                      {/* Trigger Event Selector */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Trigger Event:</Label>
                        <select
                          value={activeWorkflow.trigger}
                          onChange={(e) => setActiveWorkflow({ ...activeWorkflow, trigger: e.target.value })}
                          className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {EVENT_TRIGGERS.map(trig => (
                            <option key={trig.value} value={trig.value}>
                              ⚡ {trig.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-4 relative z-10">
                    
                    {/* START TRIGGER NODE */}
                    <div className="p-4 rounded-2xl bg-card border-2 border-emerald-500/40 shadow-lg relative max-w-xl mx-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                            ⚡
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              Workflow Start Trigger
                            </span>
                            <h3 className="text-sm font-extrabold text-foreground">
                              {activeWorkflow.trigger}
                            </h3>
                            <p className="text-[10px] text-muted-foreground">
                              {EVENT_TRIGGERS.find(t => t.value === activeWorkflow.trigger)?.desc || "Fires execution sequence"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          ENTRY POINT
                        </Badge>
                      </div>
                    </div>

                    {/* TOP DROP ZONE (INDEX 0) */}
                    <div
                      onDragOver={(e) => handleDragOver(e, 0)}
                      onDrop={(e) => handleDropNode(e, 0)}
                      className={`py-3 px-4 rounded-xl border-2 border-dashed transition-all text-center max-w-xl mx-auto flex items-center justify-center gap-2 cursor-pointer ${
                        dragOverIndex === 0
                          ? "border-primary bg-primary/10 text-primary scale-102 shadow-md"
                          : "border-border/60 hover:border-primary/40 bg-card/40 text-muted-foreground"
                      }`}
                    >
                      <Plus className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold">Drop palette step here to insert at position #1</span>
                    </div>

                    {/* DYNAMIC WORKFLOW STEP CARDS */}
                    {activeWorkflow.steps.map((stepText, idx) => (
                      <React.Fragment key={idx}>
                        
                        {/* CONNECTING CONNECTOR ARROW */}
                        <div className="flex justify-center my-1">
                          <div className="flex flex-col items-center">
                            <div className="w-0.5 h-6 bg-border" />
                            <ArrowDown className="h-4 w-4 text-muted-foreground/60 -mt-1" />
                          </div>
                        </div>

                        {/* STEP CARD */}
                        <div className="p-4 rounded-2xl bg-card border border-border shadow-md hover:shadow-xl transition-all max-w-xl mx-auto relative group">
                          
                          <div className="flex items-start justify-between gap-3">
                            
                            <div className="flex items-start gap-3">
                              <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[9px] font-bold uppercase">
                                    Step #{idx + 1}
                                  </Badge>
                                  <h4 className="text-xs font-bold text-foreground">
                                    {stepText.split(":")[0]}
                                  </h4>
                                </div>

                                <p className="text-xs font-medium text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40 font-mono text-[11px] break-all">
                                  {stepText}
                                </p>
                              </div>
                            </div>

                            {/* CONTROLS */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenStepEditor(idx)}
                                className="h-7 px-2 text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer"
                                title="Configure Step Parameters"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(idx, 'up')}
                                disabled={idx === 0}
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(idx, 'down')}
                                disabled={idx === activeWorkflow.steps.length - 1}
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicateStep(idx)}
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                title="Duplicate Step"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStep(idx)}
                                className="h-7 w-7 p-0 cursor-pointer text-destructive hover:bg-destructive/10"
                                title="Delete Step"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* INTERMEDIATE DROP ZONE */}
                        <div
                          onDragOver={(e) => handleDragOver(e, idx + 1)}
                          onDrop={(e) => handleDropNode(e, idx + 1)}
                          className={`py-2 px-4 rounded-xl border-2 border-dashed transition-all text-center max-w-xl mx-auto flex items-center justify-center gap-2 cursor-pointer ${
                            dragOverIndex === idx + 1
                              ? "border-primary bg-primary/10 text-primary scale-102 shadow-md"
                              : "border-border/40 hover:border-primary/40 bg-card/20 text-muted-foreground/60 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[11px] font-bold">Drop palette step to insert at position #{idx + 2}</span>
                        </div>

                      </React.Fragment>
                    ))}

                    {/* END NODE */}
                    <div className="flex justify-center pt-2">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase bg-slate-500/10 text-slate-500 border-slate-500/30 py-1 px-3">
                        ✓ Workflow Execution Complete
                      </Badge>
                    </div>

                  </CardContent>
                </Card>
              </div>

            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent className="space-y-4">
                <Workflow className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-md font-bold">No Workflow Selected</h3>
                <Button onClick={handleCreateNewWorkflow} className="text-xs font-bold cursor-pointer">
                  Create First Workflow
                </Button>
              </CardContent>
            </Card>
          )}

        </TabsContent>

        {/* TAB 2: PRESET ENTERPRISE BLUEPRINTS */}
        <TabsContent value="blueprints" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ENTERPRISE_BLUEPRINTS.map((bp, idx) => (
              <Card key={idx} className="border-border/60 hover:border-primary/50 transition-all shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[9px] uppercase font-bold bg-primary/10 text-primary">
                      Preset Blueprint #{idx + 1}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-500/30">
                      ⚡ Trigger: {bp.trigger}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground mt-2">
                    {bp.name}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {bp.desc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Configured Steps Sequence:</span>
                  <div className="space-y-1.5">
                    {bp.steps.map((st, sIdx) => (
                      <div key={sIdx} className="p-2 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <span className="truncate">{st}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleLoadBlueprint(bp)}
                    className="w-full text-xs font-bold cursor-pointer gap-2"
                  >
                    <Sparkles className="h-4 w-4" /> Load Blueprint into Builder
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: AUDIT LOGS */}
        <TabsContent value="logs" className="mt-6 space-y-4">
          <Card className="border-border/60 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold">Workflow Execution History Logs</CardTitle>
                <CardDescription className="text-xxs">Detailed resolution log entries for all triggered workflows.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await dbClearWorkflowLogs()
                  await loadData()
                  showToast("Audit logs cleared.")
                }}
                className="text-xs font-bold text-destructive border-destructive/20 cursor-pointer"
              >
                Clear Audit Trail
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-border/60 bg-card text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-foreground">{log.workflowName}</span>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-[9px]">
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Patient: <strong className="text-foreground">{log.patientName}</strong> | Run Time: {log.timestamp}
                    </p>
                    <div className="space-y-1 pt-1">
                      {log.stepsExecuted.map((se, idx) => (
                        <div key={idx} className="text-[10px] font-mono p-1.5 rounded bg-muted/40 flex items-center justify-between">
                          <span>#{idx + 1} {se.step}</span>
                          <span className={se.status === 'success' ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                            {se.details || se.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No workflow execution logs recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* STEP CONFIGURATOR MODAL */}
      <Dialog open={editingStepIndex !== null} onOpenChange={(open) => !open && setEditingStepIndex(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Configure Step Parameters
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Step Specification & Text Command</Label>
              <Textarea
                rows={4}
                value={stepEditText}
                onChange={(e) => setStepEditText(e.target.value)}
                className="text-xs font-mono"
                placeholder="Enter step command or custom text..."
              />
            </div>

            {/* TAG CHIPS */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Click to Insert Dynamic Patient Tag:</Label>
              <div className="flex flex-wrap gap-1.5">
                {["{Patient Name}", "{Doctor}", "{Date}", "{Time}", "{Amount}", "{Invoice No}", "{Language}"].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag)}
                    className="px-2 py-1 rounded-md bg-muted hover:bg-primary/20 text-foreground text-[10px] font-bold font-mono transition-colors cursor-pointer border border-border/40"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* AUTO TRANSLATION ASSISTANT */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <span className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
                <Languages className="h-3.5 w-3.5" /> Multilingual Auto-Translator:
              </span>
              <div className="flex flex-wrap gap-1">
                {["Telugu", "Hindi", "Tamil", "Kannada", "Malayalam", "Marathi"].map(lang => (
                  <Button
                    key={lang}
                    variant="outline"
                    size="sm"
                    disabled={isTranslating}
                    onClick={() => handleAutoTranslateStep(lang)}
                    className="h-7 text-[10px] font-bold cursor-pointer"
                  >
                    Translate to {lang}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingStepIndex(null)} className="text-xs cursor-pointer">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveStepEdit} className="text-xs font-bold cursor-pointer">
              Save Parameters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DRY-RUN SANDBOX TESTER MODAL */}
      <Dialog open={showSandboxModal} onOpenChange={setShowSandboxModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-500" /> Dry-Run Workflow Sandbox Tester
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Test execution of <strong>{activeWorkflow?.name}</strong> against a real patient record from your CRM database without sending actual external messages.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Test Patient Profile:</Label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full h-9 rounded-xl border border-input bg-card px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) - Phone: {p.phone} | Lang: {p.preferredLanguage}
                  </option>
                ))}
              </select>
            </div>

            {testResults && (
              <div className="space-y-2 border-t border-border/40 pt-3">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Sandbox Execution Results:</span>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {testResults.map((tr, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-card border border-border text-[11px] font-mono space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Step #{idx + 1}: {tr.step}</span>
                        <Badge variant={tr.status === 'success' ? 'default' : 'destructive'} className="text-[9px]">
                          {tr.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{tr.details || tr.error || "Step executed cleanly"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={() => setShowSandboxModal(false)} className="text-xs cursor-pointer">
              Close Sandbox
            </Button>
            <Button size="sm" onClick={handleRunSandboxTest} disabled={isTesting} className="text-xs font-bold gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white">
              {isTesting ? "Executing Sandbox..." : "Run Test Simulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Exported WorkflowBuilder Component for Cross-Page Imports ────────────────
export function WorkflowBuilder({ embedded }: { embedded?: boolean }) {
  return <AutomationBuilderPage embedded={embedded} />
}
