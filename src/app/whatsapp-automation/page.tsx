"use client"

import * as React from "react"
import {
  MessageCircle,
  Sparkles,
  Plus,
  Save,
  Languages,
  CheckCircle,
  HelpCircle,
  Clock,
  Settings,
  ArrowRight,
  LogOut
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dbGetAutoReplies, dbSaveAutoReplies, dbGetWhatsAppTemplate, dbSaveWhatsAppTemplate, AutoReplyRule } from "@/lib/db"
import { WHATSAPP_API_URL } from "@/lib/utils"
import { WorkflowBuilder } from "@/app/automation-builder/page"
import { useWhatsApp } from "@/lib/whatsapp-context"

const TEMPLATE_DATABASE: Record<string, Record<string, string>> = {
  follow_up_reminder: {
    English: "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}. Please confirm your attendance.",
    Telugu: "ప్రియమైన {Patient Name}, {Date} న {Doctor} తో మీ ఫాలో-అప్ విజిట్ గుర్తుచేపు. హాజరు నిర్ధారించండి.",
    Hindi: "प्रिय {Patient Name}, {Date} को {Doctor} के साथ आपके फॉलो-अप विजिट का अनुस्मारक। कृपया उपस्थिति की पुष्टि करें।",
    Tamil: "அன்புள்ள {Patient Name}, {Date} அன்று {Doctor} உடனான உங்கள் ஃபாலோ-அப் வருகை நினைவூட்டல். வருகையை உறுதிப்படுத்தவும்.",
    Kannada: "ಪ್ರಿಯ {Patient Name}, {Date} ರಂದು {Doctor} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಫಾಲೋ-ಅಪ್ ಭೇಟಿಯ ನೆನಪೋಲೆ. ದಯವಿಟ್ಟು ಖಚಿತಪಡಿಸಿ.",
    Malayalam: "പ്രിയ {Patient Name}, {Date}-ൽ {Doctor}-യുമായുള്ള ഫോളो-അപ്പ് സന്ദർശനം ഓർമ്മപ്പെടുത്തൽ. ദയവായി സ്ഥിരീകരിക്കുക."
  },
  welcome: {
    English: "Hello {Patient Name}, thank you for registering with OnlyClinic. We are happy to assist you.",
    Telugu: "హలో {Patient Name}, Aegis CRM లో నమోదు చేసుకున్నందుకు ధన్యవాదాలు. మీకు సహాయం చేయడానికి మేము సంతోషిస్తున్నాము.",
    Hindi: "नमस्ते {Patient Name}, Aegis CRM में पंजीकरण करने के लिए धन्यवाद। हम आपकी सहायता करने के लिए खुश हैं।",
    Tamil: "வணக்கம் {Patient Name}, Aegis CRM இல் பதிவு செய்ததற்கு நன்றி. உங்களுக்கு உதவ நாங்கள் மகிழ்ச்சியடைகிறோம்.",
    Kannada: "ನಮಸ್ಕಾರ {Patient Name}, Aegis CRM ನೋಂದಾಯಿಸಿಕೊಂಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾವು ಸಂತೋಷಪಡುತ್ತೇವೆ.",
    Malayalam: "ഹಲೋ {Patient Name}, Aegis CRM-ൽ രജിസ്റ്റർ ചെയ്തതിന് നന്ദি. നിങ്ങളെ സഹായിക്കുന്നതിൽ ഞങ്ങൾക്ക് സന്തോഷമുണ്ട്."
  },
  apt_reminder: {
    English: "Dear {Patient Name}, this is a reminder for your consultation on {Date} at {Time} with {Doctor}.",
    Telugu: "ప్రియమైన {Patient Name}, {Date} తేదీన {Time} సమయానికి {Doctor} తో మీ సంప్రదింపుల రిమైండర్.",
    Hindi: "प्रिय {Patient Name}, यह {Date} को {Time} बजे {Doctor} के साथ आपके परामर्श के लिए एक अनुस्मारक है।",
    Tamil: "அன்புள்ள {Patient Name}, {Date} அன்று {Time} மணிக்கு {Doctor} உடனான உங்கள் ஆலோசனைக்கான நினைவூட்டல்.",
    Kannada: "ಪ್ರಿಯ {Patient Name}, {Date} ರಂದು {Time} ಗಂಟೆಗೆ {Doctor} ಅವರೊಂದಿಗಿನ ನಿಮ್ಮ ಭೇಟಿಯ ನೆನಪೋಲೆ.",
    Malayalam: "പ്രിയ {Patient Name}, {Date}-ൽ {Time}-ന് {Doctor}-യുമായുള്ള നിങ്ങളുടെ കൺസൾട്ടേഷന്റെ ഓർമ്മപ്പെടുത്തൽ."
  },
  bill_pending: {
    English: "Dear {Patient Name}, an invoice of {Amount} is pending for payment. Please settle at your earliest convenience.",
    Telugu: "ప్రియమైన {Patient Name}, మీ {Amount} బిల్లు బకాయి ఉంది. దయచేసి వీలైనంత త్వరగా చెల్లించండి.",
    Hindi: "प्रिय {Patient Name}, आपके {Amount} का चालान भुगतान के लिए लंबित है। कृपया जल्द से जल्द भुगतान करें।",
    Tamil: "அன்புள்ள {Patient Name}, உங்கள் {Amount} கட்டணம் நிலுவையில் உள்ளது. தயவுசெய்து விரைவில் செலுத்தவும்.",
    Kannada: "ಪ್ರಿಯ {Patient Name}, {Amount} ಬಿಲ್ ಬಾಕಿ ಉಳಿದಿದೆ. ದಯವಿಟ್ಟು ಬೇಗನೆ ಪಾವತಿಸಿ.",
    Malayalam: "പ്രിയ {Patient Name}, നിങ്ങളുടെ {Amount} ബിൽ കുടിശ്ശികയാണ്. ദയവായി വേഗത്തിൽ അടയ്ക്കുക."
  },
  invoice_attached: {
    English: "Dear {Patient Name}, please find attached your clinical invoice {Invoice No} for {Amount}. Please settle the bill at your convenience.",
    Telugu: "ప్రియమైన {Patient Name}, దయచేసి మీ క్లినికల్ ఇన్వాయిస్ {Invoice No} మరియు {Amount} బిల్లు బకాయిని ఇక్కడ కనుగొనండి.",
    Hindi: "प्रिय {Patient Name}, कृपया अपना क्लिनिकल चालान {Invoice No} और {Amount} का विवरण संलग्न पाएं।",
    Tamil: "அன்புள்ள {Patient Name}, உங்கள் {Amount} கட்டணம் மற்றும் {Invoice No} விவரங்களை இணைப்பில் காணவும்.",
    Kannada: "ಪ್ರಿಯ {Patient Name}, ದಯವಿಟ್ಟು ನಿಮ್ಮ ಕ್ಲಿನಿಕಲ್ ಇನ್‌ವಾಯ್ಸ್ {Invoice No} ಮತ್ತು {Amount} ಬಿಲ್ ವಿವರಗಳನ್ನು ಇಲ್ಲಿ ನೋಡಿ.",
    Malayalam: "പ്രിയ {Patient Name}, ദയവായി നിങ്ങളുടെ ക്ലിനിക്കൽ ഇൻവോയ്സ് {Invoice No}, തുക {Amount} എന്നിവ ഇതിനോടൊപ്പം കാണുക."
  }
}

export default function WhatsAppAutomation() {
  const [activeTab, setActiveTab] = React.useState("templates")
  const [selectedTemplateKey, setSelectedTemplateKey] = React.useState("welcome")
  const [activeLang, setActiveLang] = React.useState("English")
  const [templateText, setTemplateText] = React.useState("")
  const [successMsg, setSuccessMsg] = React.useState("")

  // Keyword rules states
  const [rules, setRules] = React.useState<AutoReplyRule[]>([])
  const [newKeyword, setNewKeyword] = React.useState("")
  const [newReplyText, setNewReplyText] = React.useState("")

  // WhatsApp connection context state
  const { 
    status: waStatus, 
    qr: waQr, 
    user: waUser, 
    scheduledMessages: scheduledMsgList,
    connect,
    logout
  } = useWhatsApp()

  // Mock variable replacements for visual preview
  const previewData = {
    "{Patient Name}": "John Doe",
    "{Date}": "2026-06-08",
    "{Time}": "09:00 AM",
    "{Doctor}": "Dr. Sarah Connor",
    "{Amount}": "$150",
    "{Invoice No}": "INV-2026-001"
  }

  const syncRulesToServer = async (updatedRules: AutoReplyRule[]) => {
    try {
      await fetch(`${WHATSAPP_API_URL}/api/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRules)
      })
    } catch (err) {
      console.warn("Failed to sync auto-reply rules to WhatsApp server:", err)
    }
  }

  React.useEffect(() => {
    const loadAndSyncRules = async () => {
      const loaded = await dbGetAutoReplies()
      setRules(loaded)
      syncRulesToServer(loaded)
    }
    loadAndSyncRules()
  }, [])

  const handleWaLogout = async () => {
    try {
      await logout()
      setSuccessMsg("Logged out from WhatsApp Web client session successfully.")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch (err) {
      setSuccessMsg("Error sending logout request to WhatsApp background runner.")
      setTimeout(() => setSuccessMsg(""), 3000)
    }
  }

  React.useEffect(() => {
    const loadTemplate = async () => {
      const text = await dbGetWhatsAppTemplate(selectedTemplateKey, activeLang)
      setTemplateText(text)
    }
    loadTemplate()
  }, [selectedTemplateKey, activeLang])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await dbSaveWhatsAppTemplate(selectedTemplateKey, activeLang, templateText)
    setSuccessMsg("WhatsApp Automation template saved successfully!")
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const handleAddRule = async () => {
    if (!newKeyword.trim() || !newReplyText.trim()) return
    const cleaned = newKeyword.toLowerCase().trim()
    const duplicate = rules.find(r => r.keyword === cleaned)
    if (duplicate) {
      setSuccessMsg("Error: Auto-reply rule for this keyword already exists.")
      setTimeout(() => setSuccessMsg(""), 3000)
      return
    }

    const newRule: AutoReplyRule = {
      id: `ar-${Date.now()}`,
      keyword: cleaned,
      replyText: newReplyText,
      isActive: true
    }

    const updated = [newRule, ...rules]
    setRules(updated)
    await dbSaveAutoReplies(updated)
    await syncRulesToServer(updated)
    setNewKeyword("")
    setNewReplyText("")
    setSuccessMsg("Keyword auto-reply rule added successfully!")
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const handleToggleRule = async (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
    setRules(updated)
    await dbSaveAutoReplies(updated)
    await syncRulesToServer(updated)
  }

  const handleDeleteRule = async (id: string) => {
    const updated = rules.filter(r => r.id !== id)
    setRules(updated)
    await dbSaveAutoReplies(updated)
    await syncRulesToServer(updated)
    setSuccessMsg("Rule deleted successfully.")
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  // Generate resolved preview text with variables replaced
  const getPreviewContent = () => {
    let text = templateText
    Object.entries(previewData).forEach(([placeholder, val]) => {
      text = text.replaceAll(placeholder, val)
    })
    return text
  }

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
      {/* Alert Banner */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4.5 w-4.5" /> {successMsg}
        </div>
      )}

      {/* Main split grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left side Tab container */}
          <div className={`${activeTab === "workflows" ? "md:col-span-3" : "md:col-span-2"} space-y-6`}>
            <TabsList className="grid grid-cols-4 w-full max-w-[620px] bg-muted/60 text-[10px] mb-6">
              <TabsTrigger value="templates">Event Templates</TabsTrigger>
              <TabsTrigger value="rules">Auto-Replies</TabsTrigger>
              <TabsTrigger value="connection">Client Sync</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
            </TabsList>

            {/* Tab 1: Event Templates */}
            <TabsContent value="templates">
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" /> Template Editor
                  </CardTitle>
                  <CardDescription className="text-xxs">Configure triggers and customized translation template scripts.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSave}>
                  <CardContent className="space-y-4 text-xxs">
                    <div className="space-y-1.5">
                      <Label htmlFor="temp-select">Select Automation Event Trigger</Label>
                      <Select
                        id="temp-select"
                        value={selectedTemplateKey}
                        onChange={(e) => setSelectedTemplateKey(e.target.value)}
                      >
                        <option value="welcome">Welcome Message (On Registry)</option>
                        <option value="apt_reminder">Appointment Reminders (24h Before)</option>
                        <option value="follow_up_reminder">Follow-up Care Reminders (Automated Reminders)</option>
                        <option value="bill_pending">Invoicing & Pending Payments Alert</option>
                        <option value="invoice_attached">Invoice Receipt & Bill Reminder (with PDF/TXT Attachment)</option>
                      </Select>
                    </div>

                    {/* Editing textarea */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="temp-content">Edit Template String</Label>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Languages className="h-3.5 w-3.5 text-primary" /> Editing Language: {activeLang}
                        </span>
                      </div>
                      <Textarea
                        id="temp-content"
                        rows={4}
                        value={templateText}
                        onChange={(e) => setTemplateText(e.target.value)}
                        className="text-xs font-medium font-sans leading-relaxed"
                        required
                      />
                    </div>

                    {/* Placeholder Helper pills */}
                    <div className="space-y-2 pt-2">
                      <Label className="flex items-center gap-1">
                        Available Template Tokens <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(previewData).map(token => (
                          <Badge
                            key={token}
                            variant="outline"
                            className="cursor-pointer hover:bg-muted text-[10px] py-1 border-dashed"
                            onClick={() => setTemplateText(prev => prev + " " + token)}
                          >
                            {token}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-end border-t border-border/40 pt-4">
                    <Button type="submit" size="sm" className="cursor-pointer">
                      <Save className="h-4 w-4 mr-1.5" /> Save Template
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* Tab 2: Keyword Auto-Replies */}
            <TabsContent value="rules">
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" /> Keyword Auto-Replies
                  </CardTitle>
                  <CardDescription className="text-xxs">Define instant answers when patients send specific trigger keywords (e.g. "timing", "address").</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-xxs">
                  {/* Add rule form */}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/60 space-y-4">
                    <div className="font-bold text-foreground text-[10px] uppercase tracking-wider">Create New Auto-Reply Rule</div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="rule-keyword">Incoming Trigger Keyword</Label>
                        <Input
                          id="rule-keyword"
                          placeholder="e.g. info"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value.toLowerCase().trim())}
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="rule-reply">Automated WhatsApp Reply</Label>
                        <Input
                          id="rule-reply"
                          placeholder="Message content sent back to patient..."
                          value={newReplyText}
                          onChange={(e) => setNewReplyText(e.target.value)}
                          className="text-xs h-9"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleAddRule}
                        size="sm"
                        className="h-8 text-xxs cursor-pointer font-bold"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
                      </Button>
                    </div>
                  </div>

                  {/* Roster of active keyword replies */}
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                          <th className="p-3">Trigger Keyword</th>
                          <th className="p-3">Automated Reply Text</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right pr-4">Operation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.length > 0 ? (
                          rules.map(rule => (
                            <tr key={rule.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-mono font-bold text-primary">"{rule.keyword}"</td>
                              <td className="p-3 text-foreground/80 max-w-[280px] truncate">{rule.replyText}</td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRule(rule.id)}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${rule.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                                >
                                  {rule.isActive ? "ACTIVE" : "PAUSED"}
                                </button>
                              </td>
                              <td className="p-3 text-right pr-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-7 text-[10px] cursor-pointer"
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-muted-foreground">
                              No custom keyword auto-replies configured yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: WhatsApp Client Connection */}
            <TabsContent value="connection">
              <Card className="shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" /> WhatsApp Web Client Sync
                  </CardTitle>
                  <CardDescription className="text-xxs">Link your real WhatsApp Business or personal account by scanning the QR code below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-xxs">
                  {waStatus === "offline" && (
                    <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center text-center gap-2.5">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <Settings className="h-5 w-5 animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-destructive">WhatsApp Background Server Offline</h4>
                        <p className="text-xxs text-muted-foreground max-w-sm">To connect a real device, you need to run the backend scheduler service. Please run <code>npm run dev:all</code> in your terminal.</p>
                      </div>
                    </div>
                  )}

                  {waStatus === "disconnected" && (
                    <div className="p-8 rounded-xl border border-border bg-muted/10 flex flex-col items-center justify-center text-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-xs">Initialize WhatsApp Session</h4>
                        <p className="text-xxs text-muted-foreground max-w-xs leading-normal">Press the button below to start the WebSocket auth listener and request a secure link QR code.</p>
                      </div>
                      <Button
                        type="button"
                        onClick={async () => {
                          try {
                            await connect()
                          } catch (err) {
                            console.warn("Failed to trigger connect:", err)
                          }
                        }}
                        className="h-8 text-xxs font-bold px-4 cursor-pointer"
                      >
                        Start WhatsApp Listener
                      </Button>
                    </div>
                  )}

                  {waStatus === "connecting" && !waQr && (
                    <div className="p-8 rounded-xl border border-border bg-muted/15 flex flex-col items-center justify-center text-center gap-4 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-secondary/15 flex items-center justify-center text-secondary">
                        <Settings className="h-6 w-6 animate-spin" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-xs text-secondary-foreground">Generating Connection Tunnel...</h4>
                        <p className="text-xxs text-muted-foreground max-w-xs leading-normal">Establishing secure handshake with WhatsApp servers. Please wait 5-10 seconds...</p>
                      </div>
                    </div>
                  )}

                  {(waStatus === "qr" || waQr) && waStatus !== "connected" && waStatus !== "offline" && waQr && (
                    <div className="p-6 rounded-xl border border-border bg-card flex flex-col items-center justify-center text-center gap-5">
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-primary flex items-center gap-1.5 justify-center">
                          Scan QR Code to Connect
                        </h4>
                        <p className="text-[10px] text-muted-foreground max-w-md leading-normal">Open WhatsApp on your mobile device &gt; Tap Menu or Settings &gt; Linked Devices &gt; Link a Device, and scan this code.</p>
                      </div>
                      
                      <div className="p-3 bg-white border border-border/80 rounded-xl shadow-xs">
                        <img
                          src={waQr}
                          alt="WhatsApp Auth QR"
                          className="h-44 w-44 object-contain"
                        />
                      </div>
                      
                      <span className="text-[9px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">QR updates dynamically</span>
                    </div>
                  )}

                  {waStatus === "connected" && (
                    <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold shrink-0 border border-emerald-500/20">
                          {waUser?.name?.charAt(0) || "W"}
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5 leading-none">
                            {waUser?.name || "WhatsApp Business"}
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[8px] py-0 px-1 font-bold">CONNECTED</Badge>
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-mono mt-1.5 block">JID: {waUser?.id}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleWaLogout}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-8 text-xxs font-bold cursor-pointer border border-rose-500/20"
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1" /> Disconnect Session
                      </Button>
                    </div>
                  )}

                  {/* Scheduled messages sub-panel */}
                  <div className="space-y-3 pt-4 border-t border-border/40">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" /> Automated Follow-up Dispatch Queue
                      </h4>
                      <Badge variant="outline" className="text-[8px] font-mono px-1">
                        {scheduledMsgList.length} total queued
                      </Badge>
                    </div>
                    
                    <div className="border border-border/60 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                            <th className="p-2.5">Recipient</th>
                            <th className="p-2.5">Scheduled Message</th>
                            <th className="p-2.5">Send Time</th>
                            <th className="p-2.5 text-right pr-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduledMsgList.length > 0 ? (
                            scheduledMsgList.slice().reverse().map(msg => (
                              <tr key={msg.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                                <td className="p-2.5 font-bold text-foreground truncate max-w-[120px]">{msg.patientName} <span className="text-[9px] font-mono text-muted-foreground block">{msg.phone}</span></td>
                                <td className="p-2.5 text-foreground/80 max-w-[200px] truncate" title={msg.text}>{msg.text}</td>
                                <td className="p-2.5 text-muted-foreground font-mono text-[10px]">
                                  {new Date(msg.sendAt).toLocaleDateString()} {new Date(msg.sendAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </td>
                                <td className="p-2.5 text-right pr-3">
                                  <Badge
                                    className={`text-[8px] font-bold ${
                                      msg.status === 'sent' 
                                        ? 'bg-emerald-500 hover:bg-emerald-600' 
                                        : msg.status === 'failed' 
                                        ? 'bg-rose-500 hover:bg-rose-600' 
                                        : 'bg-amber-500 hover:bg-amber-600'
                                    }`}
                                  >
                                    {msg.status.toUpperCase()}
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-5 text-center text-muted-foreground">
                                No automated messages scheduled in the dispatch queue.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Workflows */}
            <TabsContent value="workflows" className="focus-visible:outline-hidden">
              <WorkflowBuilder embedded={true} />
            </TabsContent>
          </div>


        {/* Right side live rendering simulator */}
        {activeTab !== "workflows" && (
          <Card className="flex flex-col justify-between shadow-xs">
            <div>
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Live Preview
                </CardTitle>
                <CardDescription className="text-xxs">Simulation representing patient mobile notification view.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Language selectors */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(TEMPLATE_DATABASE[selectedTemplateKey]).map(lang => (
                    <Button
                      key={lang}
                      size="sm"
                      variant={activeLang === lang ? "default" : "outline"}
                      className="h-7 text-[10px] px-2.5 cursor-pointer"
                      onClick={() => setActiveLang(lang)}
                    >
                      {lang}
                    </Button>
                  ))}
                </div>

                {/* Mobile Phone Mockup */}
                <div className="border border-border/80 rounded-2xl bg-slate-900 text-white p-3.5 min-h-[160px] relative flex flex-col justify-end shadow-md">
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-3 bg-black rounded-full" />
                  
                  {/* Chat bubble */}
                  <div className="bg-emerald-600/90 text-white p-3 rounded-xl rounded-tr-none text-xxs font-sans leading-relaxed mt-4 shadow-sm animate-in zoom-in-95 duration-200">
                    <p className="whitespace-pre-wrap">{getPreviewContent()}</p>
                    <span className="text-[8px] text-emerald-100/70 block text-right mt-1 font-mono">10:00 AM • Read ✓✓</span>
                  </div>
                </div>
              </CardContent>
            </div>

            <div className="p-5 border-t border-border/40 mt-4 text-[10px] text-muted-foreground flex items-center gap-1.5 leading-relaxed">
              <Settings className="h-4 w-4 text-primary shrink-0" />
              <span>Opt-in validation handles template compliance automatically according to WhatsApp business regulations.</span>
            </div>
          </Card>
        )}
      </div>
    </Tabs>
    </div>
  )
}
