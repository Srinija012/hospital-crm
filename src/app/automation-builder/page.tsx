"use client"

import * as React from "react"
import {
  Workflow,
  Plus,
  Play,
  Pause,
  ArrowRight,
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  SlidersHorizontal,
  RefreshCw,
  X,
  ArrowDown,
  ChevronLeft
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

// ─── n8n Style Palette Node Definitions ─────────────────────────────────────

export interface PaletteNode {
  id: string
  label: string
  category: "Triggers" | "Delays" | "Conditions" | "Messaging" | "Operations"
  desc: string
  iconName: string
  defaultStep: string
  color: string
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
  { id: "delay-time", label: "Wait Delay Timer", category: "Delays", desc: "Pause workflow for specified minutes, hours, or days", iconName: "clock", defaultStep: "Wait: 1 Days", color: "bg-amber-500" },
  { id: "delay-until", label: "Wait Until Specific Time", category: "Delays", desc: "Hold execution until exact clock time (e.g. 9:00 AM Next Day)", iconName: "calendar", defaultStep: "Wait: 9:00 AM Next Day", color: "bg-amber-600" },

  // 🔀 Logic & Conditions
  { id: "filter-lang", label: "Filter: Preferred Language", category: "Conditions", desc: "Branch or filter based on patient language (Telugu, Hindi, English, etc.)", iconName: "lang", defaultStep: "Filter: Language = English", color: "bg-indigo-500" },
  { id: "filter-triage", label: "Filter: Triage Priority", category: "Conditions", desc: "Filter execution by High Risk, Emergency, or Normal priority", iconName: "triage", defaultStep: "Filter: Priority = High Risk", color: "bg-indigo-600" },
  { id: "filter-optin", label: "Filter: WhatsApp Opt-In", category: "Conditions", desc: "Check if patient has consented to WhatsApp messages", iconName: "shield", defaultStep: "Filter: WhatsApp Opt-in = Yes", color: "bg-blue-500" },
  { id: "filter-age", label: "Filter: Age Bracket", category: "Conditions", desc: "Segment by Senior (65+), Adult (18-64), or Pediatric (<18)", iconName: "filter", defaultStep: "Filter: Age Group = Senior", color: "bg-cyan-500" },

  // 💬 Messaging Actions
  { id: "msg-wa-welcome", label: "Send Welcome WhatsApp", category: "Messaging", desc: "Send default clinic introduction via WhatsApp", iconName: "wa", defaultStep: "Send Welcome WhatsApp", color: "bg-emerald-500" },
  { id: "msg-wa-custom", label: "Send Custom WhatsApp Message", category: "Messaging", desc: "Send dynamic text with tags ({Patient Name}, {Doctor}, {Date})", iconName: "wa", defaultStep: "Send WhatsApp: Hello {Patient Name}, welcome to OnlyClinic!", color: "bg-emerald-600" },
  { id: "msg-wa-invoice", label: "Send WhatsApp Invoice PDF", category: "Messaging", desc: "Attach itemized clinical bill text/PDF via WhatsApp", iconName: "doc", defaultStep: "Send WhatsApp Invoice Attachment", color: "bg-teal-600" },
  { id: "msg-wa-feedback", label: "Send WhatsApp Feedback Request", category: "Messaging", desc: "Ask patient to rate their consultation experience", iconName: "wa", defaultStep: "Send WhatsApp: Hi {Patient Name}, how was your consultation with {Doctor}? Please reply with feedback.", color: "bg-emerald-500" },
  { id: "msg-sms-bill", label: "Send SMS Payment Reminder", category: "Messaging", desc: "Send SMS alert for pending bill balance", iconName: "sms", defaultStep: "Send Pending Bill SMS", color: "bg-sky-500" },
  { id: "msg-sms-custom", label: "Send Custom SMS", category: "Messaging", desc: "Dispatch custom text message via SMS gateway", iconName: "sms", defaultStep: "Send SMS: Hello {Patient Name}, your appointment is confirmed for {Date} at {Time}.", color: "bg-sky-600" },
  { id: "msg-email-welcome", label: "Send Welcome Email", category: "Messaging", desc: "Send formal clinic welcome email to patient address", iconName: "email", defaultStep: "Send Email: Welcome", color: "bg-rose-500" },

  // 🩺 Clinical Operations
  { id: "op-create-task", label: "Create Staff Follow-up Task", category: "Operations", desc: "Assign follow-up task to assigned doctor / receptionist", iconName: "task", defaultStep: "Create Staff Task", color: "bg-orange-500" },
  { id: "op-triage-level", label: "Set Patient Triage Priority", category: "Operations", desc: "Update patient risk classification to High or Emergency", iconName: "triage", defaultStep: "Internal: Set Triage Priority = High", color: "bg-rose-600" },
  { id: "op-add-tag", label: "Add Patient CRM Tag", category: "Operations", desc: "Tag patient profile with VIP, Chronic Care, or High Risk", iconName: "tag", defaultStep: "Internal: Add Tag = VIP", color: "bg-pink-500" },
  { id: "op-auto-recurrent", label: "Auto-Schedule 30-Day Checkup", category: "Operations", desc: "Schedule next recurring consult task in 30 days", iconName: "calendar", defaultStep: "Internal: Auto-schedule Next Follow-up", color: "bg-purple-600" },
  { id: "op-block-wa", label: "Opt-Out WhatsApp (Block)", category: "Operations", desc: "Flag patient as opted-out from automated WhatsApps", iconName: "shield", defaultStep: "Internal: Block WhatsApp Communication", color: "bg-red-500" },
  { id: "op-unblock-wa", label: "Opt-In WhatsApp (Unblock)", category: "Operations", desc: "Restore WhatsApp message eligibility for patient", iconName: "shield", defaultStep: "Internal: Unblock WhatsApp Communication", color: "bg-emerald-500" },
  { id: "op-webhook", label: "Trigger External Webhook API", category: "Operations", desc: "Dispatch HTTP POST JSON event to external hospital EHR", iconName: "zap", defaultStep: "Trigger Webhook: https://api.hospital-ehr.com/event", color: "bg-yellow-500" }
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

function getNodeIcon(iconName: string) {
  switch (iconName) {
    case "clock": return <Clock className="h-3.5 w-3.5 text-white" />
    case "calendar": return <Calendar className="h-3.5 w-3.5 text-white" />
    case "lang": return <Languages className="h-3.5 w-3.5 text-white" />
    case "triage": return <ShieldAlert className="h-3.5 w-3.5 text-white" />
    case "shield": return <ShieldAlert className="h-3.5 w-3.5 text-white" />
    case "filter": return <Filter className="h-3.5 w-3.5 text-white" />
    case "wa": return <MessageSquare className="h-3.5 w-3.5 text-white" />
    case "sms": return <MessageSquare className="h-3.5 w-3.5 text-white" />
    case "email": return <Mail className="h-3.5 w-3.5 text-white" />
    case "doc": return <FileText className="h-3.5 w-3.5 text-white" />
    case "task": return <UserCheck className="h-3.5 w-3.5 text-white" />
    case "tag": return <Tag className="h-3.5 w-3.5 text-white" />
    case "zap": return <Zap className="h-3.5 w-3.5 text-white" />
    default: return <Settings className="h-3.5 w-3.5 text-white" />
  }
}

function getNodeCategoryBadgeColor(category: string) {
  switch (category) {
    case "Triggers": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    case "Delays": return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    case "Conditions": return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
    case "Messaging": return "bg-teal-500/20 text-teal-400 border-teal-500/30"
    case "Operations": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/30"
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AutomationBuilderPage({ embedded }: { embedded?: boolean }) {
  const [workflows, setWorkflows] = React.useState<AutomationWorkflow[]>([])
  const [activeWorkflow, setActiveWorkflow] = React.useState<AutomationWorkflow | null>(null)
  const [logs, setLogs] = React.useState<WorkflowExecutionLog[]>([])
  const [activeTab, setActiveTab] = React.useState("builder")
  
  // n8n Layout Mode & UI States
  const [layoutMode, setLayoutMode] = React.useState<'graph' | 'tree'>('graph')
  const [zoomLevel, setZoomLevel] = React.useState<number>(100)
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true)
  const [inspectorNodeIdx, setInspectorNodeIdx] = React.useState<number | null>(null)

  // Palette Filter
  const [paletteFilter, setPaletteFilter] = React.useState("")
  const [activeCategoryTab, setActiveCategoryTab] = React.useState<string>("All")

  // Drag & drop dropzone states
  const [draggedNode, setDraggedNode] = React.useState<PaletteNode | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  // Step Inspector Drawer Text Edit State
  const [inspectorText, setInspectorText] = React.useState("")
  const [isTranslating, setIsTranslating] = React.useState(false)

  // Dry-Run Sandbox Tester Modal
  const [showSandboxModal, setShowSandboxModal] = React.useState(false)
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = React.useState("")
  const [testResults, setTestResults] = React.useState<any[] | null>(null)
  const [isTesting, setIsTesting] = React.useState(false)

  // Toast Notification
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
      name: "New Clinical Flow",
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
    showToast("Created new n8n-style workflow canvas!")
  }

  // Save current Active Workflow
  const handleSaveWorkflow = async () => {
    if (!activeWorkflow) return
    await dbSaveWorkflow(activeWorkflow)
    await loadData()
    showToast("Workflow node graph saved!")
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
    showToast(`Appended node: ${nodeToInsert.label}`)
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
    if (inspectorNodeIdx === idx) setInspectorNodeIdx(null)
  }

  const handleDuplicateStep = (idx: number) => {
    if (!activeWorkflow) return
    const newSteps = [...activeWorkflow.steps]
    newSteps.splice(idx + 1, 0, activeWorkflow.steps[idx])
    setActiveWorkflow({ ...activeWorkflow, steps: newSteps })
  }

  // Inspector Drawer Node Click
  const handleSelectNodeForInspector = (idx: number) => {
    if (!activeWorkflow) return
    setInspectorNodeIdx(idx)
    setInspectorText(activeWorkflow.steps[idx])
  }

  const handleSaveInspector = () => {
    if (!activeWorkflow || inspectorNodeIdx === null) return
    const newSteps = [...activeWorkflow.steps]
    newSteps[inspectorNodeIdx] = inspectorText
    setActiveWorkflow({ ...activeWorkflow, steps: newSteps })
    showToast("Node parameters updated!")
  }

  // Auto Translate helper inside Step Inspector
  const handleAutoTranslateStep = async (targetLang: string) => {
    if (!inspectorText) return
    setIsTranslating(true)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(inspectorText)}`
      const res = await fetch(url)
      const data = await res.json()
      if (data && data[0]) {
        const translated = data[0].map((x: any) => x[0]).join('')
        setInspectorText(translated)
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
    setInspectorText(prev => `${prev} ${tag}`)
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none ${embedded ? 'p-0' : ''}`}>
      
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="h-4 w-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP n8n CONTROL BAR */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        
        {/* Left: Workflow Selector & Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Workflow className="h-4.5 w-4.5" />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeWorkflow?.id || ""}
              onChange={(e) => {
                const found = workflows.find(w => w.id === e.target.value)
                if (found) {
                  setActiveWorkflow(found)
                  setInspectorNodeIdx(null)
                }
              }}
              className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {workflows.map(wf => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({wf.steps.length} Nodes)
                </option>
              ))}
            </select>

            {activeWorkflow && (
              <Input
                value={activeWorkflow.name}
                onChange={(e) => setActiveWorkflow({ ...activeWorkflow, name: e.target.value })}
                className="h-8 text-xs font-bold w-48 bg-slate-950 border-slate-800 text-slate-100 focus:ring-emerald-500"
                placeholder="Workflow Title"
              />
            )}
          </div>
        </div>

        {/* Center: Tabs Switcher */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("builder")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "builder" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Canvas Graph
          </button>
          <button
            onClick={() => setActiveTab("blueprints")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "blueprints" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Blueprints
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "logs" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Execution Logs
          </button>
        </div>

        {/* Right: Actions & Status */}
        {activeWorkflow && (
          <div className="flex items-center gap-2">
            
            {/* Status Toggle */}
            <button
              onClick={() => setActiveWorkflow({ ...activeWorkflow, status: activeWorkflow.status === 'Active' ? 'Paused' : 'Active' })}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeWorkflow.status === 'Active'
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20"
              }`}
            >
              {activeWorkflow.status === 'Active' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span>{activeWorkflow.status === 'Active' ? "Active" : "Paused"}</span>
            </button>

            {/* Test Sandbox */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSandboxModal(true)}
              className="h-8 text-xs font-bold bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 cursor-pointer gap-1.5"
            >
              <Play className="h-3.5 w-3.5 text-indigo-400" /> Test Node Graph
            </Button>

            {/* Save Workflow */}
            <Button
              size="sm"
              onClick={handleSaveWorkflow}
              className="h-8 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Save Graph
            </Button>

            {/* Create New */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateNewWorkflow}
              className="h-8 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* TAB 1: n8n VISUAL CANVAS GRAPH */}
        {activeTab === "builder" && activeWorkflow && (
          <>
            {/* COLLAPSIBLE LEFT PALETTE SIDEBAR */}
            <div className={`transition-all duration-300 border-r border-slate-800 bg-slate-900/80 flex flex-col shrink-0 z-20 ${sidebarOpen ? 'w-80' : 'w-12'}`}>
              
              {/* Sidebar Header */}
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                {sidebarOpen ? (
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-400" /> Node Library Palette
                  </span>
                ) : (
                  <Layers className="h-4 w-4 text-emerald-400 mx-auto" />
                )}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                >
                  {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>

              {sidebarOpen && (
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <Input
                      placeholder="Filter nodes..."
                      value={paletteFilter}
                      onChange={(e) => setPaletteFilter(e.target.value)}
                      className="pl-8 text-xs h-8 bg-slate-950 border-slate-800 text-slate-200"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1">
                    {["All", "Delays", "Conditions", "Messaging", "Operations"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategoryTab(cat)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                          activeCategoryTab === cat
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-950 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Palette Node List */}
                  <div className="space-y-2 pt-1">
                    {filteredPaletteNodes.map(node => (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node)}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-grab active:cursor-grabbing group shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-md ${node.color} flex items-center justify-center shrink-0`}>
                              {getNodeIcon(node.iconName)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                                {node.label}
                              </h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1">
                                {node.desc}
                              </p>
                            </div>
                          </div>
                          <GripVertical className="h-3.5 w-3.5 text-slate-600 group-hover:text-emerald-400 shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CENTER GRAPH CANVAS */}
            <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col justify-between">
              
              {/* CANVAS BACKGROUND GRID DOTS */}
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

              {/* CANVAS ZOOM & LAYOUT CONTROLS (FLOATING BOTTOM LEFT) */}
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 backdrop-blur-md p-1.5 rounded-xl shadow-xl">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-300 px-1">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                  title="Reset Zoom"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* GRAPH CANVAS NODE TREE */}
              <div className="flex-1 overflow-auto p-8 relative z-10 flex flex-col items-center">
                
                <div
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  className="transition-transform duration-200 space-y-6 w-full max-w-xl"
                >
                  {/* TRIGGER START NODE */}
                  <div className="p-4 rounded-2xl bg-slate-900 border-2 border-emerald-500/60 shadow-xl shadow-emerald-500/5 relative group">
                    
                    {/* Output Handle Dot */}
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center z-10">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-emerald-500/20">
                          ⚡
                        </div>
                        <div>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                            Workflow Trigger Node
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-100">
                            {activeWorkflow.trigger}
                          </h3>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[9px] font-bold">
                        TRIGGER
                      </Badge>
                    </div>
                  </div>

                  {/* DROP ZONE (INDEX 0) */}
                  <div
                    onDragOver={(e) => handleDragOver(e, 0)}
                    onDrop={(e) => handleDropNode(e, 0)}
                    className={`py-2 px-4 rounded-xl border-2 border-dashed transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                      dragOverIndex === 0
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 scale-102 shadow-lg"
                        : "border-slate-800 hover:border-emerald-500/50 bg-slate-900/30 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-bold">Drop node here to insert at step #1</span>
                  </div>

                  {/* DYNAMIC COMPACT n8n NODE CARDS */}
                  {activeWorkflow.steps.map((stepText, idx) => (
                    <React.Fragment key={idx}>
                      
                      {/* CONNECTING VECTOR SVG LINE */}
                      <div className="flex justify-center my-0.5">
                        <div className="flex flex-col items-center">
                          <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/80 to-slate-700" />
                          <ArrowDown className="h-4 w-4 text-emerald-400 -mt-1" />
                        </div>
                      </div>

                      {/* COMPACT n8n STEP NODE CARD */}
                      <div
                        onClick={() => handleSelectNodeForInspector(idx)}
                        className={`p-3.5 rounded-2xl bg-slate-900 border transition-all cursor-pointer relative shadow-lg group hover:shadow-2xl ${
                          inspectorNodeIdx === idx
                            ? "border-emerald-400 shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                            : "border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Input Handle Dot */}
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center" />
                        
                        {/* Output Handle Dot */}
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-slate-900 border-2 border-slate-600 group-hover:border-emerald-400 flex items-center justify-center" />

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="h-6 w-6 rounded-md bg-slate-800 text-slate-300 text-xs font-extrabold flex items-center justify-center shrink-0 border border-slate-700">
                              #{idx + 1}
                            </span>
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                                {stepText.split(":")[0]}
                              </h4>
                              <p className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 break-all">
                                {stepText}
                              </p>
                            </div>
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveStep(idx, 'up'); }}
                              disabled={idx === 0}
                              className="p-1 rounded text-slate-500 hover:text-slate-200 cursor-pointer disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveStep(idx, 'down'); }}
                              disabled={idx === activeWorkflow.steps.length - 1}
                              className="p-1 rounded text-slate-500 hover:text-slate-200 cursor-pointer disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicateStep(idx); }}
                              className="p-1 rounded text-slate-500 hover:text-slate-200 cursor-pointer"
                              title="Duplicate Node"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteStep(idx); }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                              title="Delete Node"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* INTERMEDIATE DROP ZONE */}
                      <div
                        onDragOver={(e) => handleDragOver(e, idx + 1)}
                        onDrop={(e) => handleDropNode(e, idx + 1)}
                        className={`py-2 px-4 rounded-xl border-2 border-dashed transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                          dragOverIndex === idx + 1
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 scale-102 shadow-lg"
                            : "border-slate-800/60 hover:border-emerald-500/40 bg-slate-950/40 text-slate-600 hover:text-slate-300"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold">Drop node to insert at position #{idx + 2}</span>
                      </div>

                    </React.Fragment>
                  ))}

                  {/* END TERMINAL NODE */}
                  <div className="flex justify-center pt-2">
                    <Badge variant="outline" className="bg-slate-900 text-slate-400 border-slate-800 text-[10px] font-bold uppercase py-1 px-3">
                      ✓ End Node Sequence
                    </Badge>
                  </div>

                </div>
              </div>
            </div>

            {/* RIGHT SIDE INSPECTOR DRAWER (n8n NODE SETTINGS) */}
            {inspectorNodeIdx !== null && activeWorkflow.steps[inspectorNodeIdx] && (
              <div className="w-88 border-l border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 flex flex-col justify-between shrink-0 z-30 shadow-2xl animate-in slide-in-from-right-6 duration-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider">
                        Node Inspector #{inspectorNodeIdx + 1}
                      </h3>
                    </div>
                    <button
                      onClick={() => setInspectorNodeIdx(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Inspector Text Edit */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-200">Node Command / Custom Text</Label>
                    <Textarea
                      rows={5}
                      value={inspectorText}
                      onChange={(e) => setInspectorText(e.target.value)}
                      className="text-xs font-mono bg-slate-950 border-slate-800 text-slate-200 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Dynamic Tag Chips */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Insert Dynamic Patient Tags:</Label>
                    <div className="flex flex-wrap gap-1">
                      {["{Patient Name}", "{Doctor}", "{Date}", "{Time}", "{Amount}", "{Invoice No}"].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleInsertTag(tag)}
                          className="px-2 py-1 rounded bg-slate-950 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 text-[10px] font-mono cursor-pointer border border-slate-800"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Translate Assistant */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                      <Languages className="h-3.5 w-3.5" /> Auto-Translate Text:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["Telugu", "Hindi", "Tamil", "Kannada", "Malayalam", "Marathi"].map(lang => (
                        <button
                          key={lang}
                          disabled={isTranslating}
                          onClick={() => handleAutoTranslateStep(lang)}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer border border-slate-800"
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectorNodeIdx(null)}
                    className="w-1/2 text-xs bg-slate-950 border-slate-800 text-slate-300 cursor-pointer"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveInspector}
                    className="w-1/2 text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                  >
                    Save Node
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: PRESET BLUEPRINTS */}
        {activeTab === "blueprints" && (
          <div className="p-8 space-y-6 w-full max-w-5xl mx-auto overflow-y-auto">
            <h2 className="text-base font-extrabold text-slate-100">Enterprise Clinical Automation Blueprints</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ENTERPRISE_BLUEPRINTS.map((bp, idx) => (
                <Card key={idx} className="bg-slate-900 border-slate-800 text-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] uppercase font-bold">
                        Blueprint #{idx + 1}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-700">
                        ⚡ {bp.trigger}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-100 mt-2">
                      {bp.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      {bp.desc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {bp.steps.map((st, sIdx) => (
                      <div key={sIdx} className="p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                        #{sIdx + 1} {st}
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleLoadBlueprint(bp)}
                      className="w-full text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                    >
                      Load into n8n Graph Canvas
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === "logs" && (
          <div className="p-8 space-y-6 w-full max-w-4xl mx-auto overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-100">Workflow Execution Logs</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await dbClearWorkflowLogs()
                  await loadData()
                  showToast("Logs cleared")
                }}
                className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
              >
                Clear Audit Trail
              </Button>
            </div>

            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-100">{log.workflowName}</span>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-[9px]">
                      {log.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Patient: <strong className="text-slate-200">{log.patientName}</strong> | Timestamp: {log.timestamp}
                  </p>
                  <div className="space-y-1 pt-1">
                    {log.stepsExecuted.map((se, idx) => (
                      <div key={idx} className="text-[10px] font-mono p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span>#{idx + 1} {se.step}</span>
                        <span className={se.status === 'success' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {se.details || se.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-12">No workflow execution logs recorded yet.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* DRY-RUN SANDBOX TESTER MODAL */}
      <Dialog open={showSandboxModal} onOpenChange={setShowSandboxModal}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-400" /> n8n Node Graph Sandbox Tester
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-400 leading-relaxed">
              Test execution of <strong>{activeWorkflow?.name}</strong> against a real patient record from IndexedDB without sending external messages.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-200">Select Test Patient Profile:</Label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) - Phone: {p.phone} | Lang: {p.preferredLanguage}
                  </option>
                ))}
              </select>
            </div>

            {testResults && (
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <span className="text-[10px] font-bold uppercase text-slate-400">Sandbox Execution Log Output:</span>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {testResults.map((tr, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">Step #{idx + 1}: {tr.step}</span>
                        <Badge variant={tr.status === 'success' ? 'default' : 'destructive'} className="text-[9px]">
                          {tr.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-400">{tr.details || tr.error || "Step executed cleanly"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={() => setShowSandboxModal(false)} className="text-xs bg-slate-950 border-slate-800 text-slate-300 cursor-pointer">
              Close Sandbox
            </Button>
            <Button size="sm" onClick={handleRunSandboxTest} disabled={isTesting} className="text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer">
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
