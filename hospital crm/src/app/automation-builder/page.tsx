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
  X,
  Zap,
  BarChart3,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
  Search,
  BookOpen,
  Calendar,
  XCircle,
  Upload,
  LayoutGrid,
  List,
  Mail
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
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
  dbDuplicateWorkflow,
  dbGetWorkflowLogs,
  dbClearWorkflowLogs,
  dbRunWorkflowInBulk,
  AutomationWorkflow,
  WorkflowExecutionLog
} from "@/lib/db"

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "Patient Registered",    label: "Patient Registered",      desc: "Fires when a new patient is added to the registry" },
  { value: "Appointment Confirmed", label: "Appointment Confirmed",   desc: "Fires when an appointment status changes to Confirmed" },
  { value: "Follow-up Overdue",     label: "Follow-up Overdue",       desc: "Fires when a follow-up passes its scheduled date" },
  { value: "Bill Settle Complete",  label: "Bill Settled",            desc: "Fires when an invoice is marked as Paid" },
  { value: "Invoice Created",       label: "Invoice Created",         desc: "Fires when a new invoice is generated" },
]

const ACTION_OPTIONS = [
  { value: "Send Welcome WhatsApp",          group: "WhatsApp",  label: "Send Welcome WhatsApp",             icon: "wa" },
  { value: "Send WhatsApp: custom",          group: "WhatsApp",  label: "Send Custom WhatsApp Message",      icon: "wa" },
  { value: "Send WhatsApp Notification",     group: "WhatsApp",  label: "Send WhatsApp Notification",        icon: "wa" },
  { value: "Send WhatsApp Invoice Attachment", group: "WhatsApp", label: "Send Invoice via WhatsApp",        icon: "doc" },
  { value: "Send Pending Bill SMS",          group: "SMS",       label: "Send Bill Reminder SMS",            icon: "sms" },
  { value: "Send SMS: custom",               group: "SMS",       label: "Send Custom SMS Message",           icon: "sms" },
  { value: "Create Staff Task",              group: "Internal",  label: "Create Physician Follow-up Task",   icon: "task" },
  { value: "Wait Delay",                     group: "Flow",      label: "Wait / Delay",                      icon: "wait" },
]

const TRIGGER_COLORS: Record<string, string> = {
  "Patient Registered":    "emerald",
  "Appointment Confirmed": "blue",
  "Follow-up Overdue":     "amber",
  "Bill Settle Complete":  "violet",
  "Invoice Created":       "rose",
}

const PRESET_TEMPLATES = [
  {
    name: "New Patient Welcome Program",
    trigger: "Patient Registered",
    steps: ["Send Welcome WhatsApp", "Wait: 2 Days", "Create Staff Task"],
    desc: "Welcome a new patient immediately via WhatsApp, wait 2 days, and assign a receptionist follow-up task."
  },
  {
    name: "Post-Consultation Feedback Loop",
    trigger: "Bill Settle Complete",
    steps: ["Wait: 2 Hours", "Send WhatsApp: Hi {Patient Name}, thank you for choosing our clinic. How was your consultation with {Doctor}? Please reply with any feedback."],
    desc: "Send a feedback request message 2 hours after a patient pays their invoice."
  },
  {
    name: "No-Show Recovery Outreach",
    trigger: "Follow-up Overdue",
    steps: ["Send WhatsApp: Hello {Patient Name}, we missed you for your follow-up checkup with {Doctor}. Would you like to reschedule?", "Wait: 1 Days", "Create Staff Task"],
    desc: "Reach out via WhatsApp when a follow-up becomes overdue, and flag it for staff action after 24h."
  },
  {
    name: "Monthly Wellness Recommendations",
    trigger: "Patient Registered",
    steps: ["Wait: 30 Days", "Send WhatsApp: Hello {Patient Name}, here is our wellness tip of the month: stay hydrated and walk 30 mins daily!"],
    desc: "Periodically send helpful medical wellness recommendations to registered patients."
  },
  {
    name: "Multi-Day Patient Follow-up",
    trigger: "Patient Registered",
    steps: [
      "Wait: 1 Days",
      "Send WhatsApp: Hello {Patient Name}, this is a 1-day follow-up to see if you have any questions.",
      "Wait: 1 Days",
      "Send WhatsApp: Hello {Patient Name}, this is a 2-day follow-up. We hope you are doing well!",
      "Create Staff Task"
    ],
    desc: "Follow up with patients 1 day and 2 days after registration, and assign a receptionist follow-up task."
  }
]

const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  "hello": {
    Telugu: "నమస్కారం",
    Hindi: "नमस्ते",
    Tamil: "வணக்கம்",
    Kannada: "ನಮಸ್ಕಾರ",
    Malayalam: "ഹലോ",
    Marathi: "नमस्कार",
    Bengali: "হ্যালো",
    Punjabi: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ"
  },
  "welcome to our clinic": {
    Telugu: "మా క్లినిక్‌కు స్వాగతం",
    Hindi: "हमारे क्लिनिक में आपका स्वागत है",
    Tamil: "எங்கள் மருத்துவமனைக்கு வரவேற்கிறோம்",
    Kannada: "ನಮ್ಮ ಕ್ಲಿನಿక్‌ಗೆ ಸುಸ್ವಾಗತ",
    Malayalam: "ഞങ്ങളുടെ ക്ലിനിക്കിലേക്ക് സ്വാഗതം",
    Marathi: "आमच्या क्लिनिकमध्ये आपले स्वागत आहे",
    Bengali: "আমাদের ক্লিনিকে আপনাকে স্বাগতম",
    Punjabi: "ਸਾਡੇ ਕਲੀਨਿਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ"
  },
  "thank you for registering": {
    Telugu: "నమోదు చేసుకున్నందుకు ధన్యవాదాలు",
    Hindi: "पंजीकरण करने के लिए धन्यवाद",
    Tamil: "பதிవు செய்ததற்கு நன்றி",
    Kannada: "ನೋಂದಾಯಿಸಿಕೊಂಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು",
    Malayalam: "രജിസ്റ്റർ ചെയ്തതിന് നന്ദി",
    Marathi: "नोंदणी केल्याबद्दल धन्यवाद",
    Bengali: "নিবন্ধন করার জন্য ধন্যবাদ",
    Punjabi: "ਰਜਿਸਟਰ ਕਰਨ ਲਈ ਤੁਹਾਡਾ ਤੁਹਾਡਾ ਧੰਨਵਾਦ"
  },
  "your appointment is confirmed": {
    Telugu: "మీ అపాయింట్‌మెంట్ నిర్ధారించబడింది",
    Hindi: "आपका अपॉइंटमेंट पक्का हो गया है",
    Tamil: "உங்கள் சந்திப்பு உறுதி செய்யப்பட்டுள்ளது",
    Kannada: "ನಿಮ್ಮ ಅಪಾಯಿಂಟಮೆಂಟ್ ಖಚಿತಪಟ್ಟಿದೆ",
    Malayalam: "നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് സ്ഥിരീകരിച്ചു",
    Marathi: "आपली भेट निश्चित झाली आहे",
    Bengali: "আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত করা হয়েছে",
    Punjabi: "ਤੁਹਾਡੀ ਅਪਾਇੰਟਮੈਂਟ ਦੀ ਪੁਸ਼ਟੀ ਹੋ ​​ਗਈ ਹੈ"
  },
  "please arrive 10 minutes early": {
    Telugu: "దయచేసి 10 నిమిషాలు ముందుగా రాగలరు",
    Hindi: "कृपया 10 मिनट पहले पहुंचें",
    Tamil: "தயவுசெய்து 10 நிமிடங்களுக்கு முன்னதாகவே வரவும்",
    Kannada: "ದಯವಿಟ್ಟು 10 ನಿಮಿಷ ಮುಂಚಿತವಾಗಿ ಬನ್ನಿ",
    Malayalam: "ദയവായി 10 മിനിറ്റ് നേരത്തെ എത്തുക",
    Marathi: "कृपया १० मिनिटे लवकर यावे",
    Bengali: "দয়া করে ১০ মিনিট আগে পৌঁছাবেন",
    Punjabi: "ਕਿਰਪਾ ਕਰਕੇ 10 ਮਿੰਟ ਪਹਿਲਾਂ ਪਹੁੰਚੋ"
  },
  "how was your consultation today?": {
    Telugu: "ఈరోజు మీ సంప్రదింపులు ఎలా ఉన్నాయి?",
    Hindi: "आज आपका परामर्श कैसा रहा?",
    Tamil: "இன்று உங்கள் ஆலோசனை எவ்வாறு இருந்தது?",
    Kannada: "ಇಂದು ನಿಮ್ಮ ಸಮಾಲೋಚನೆ ಹೇಗಿತ್ತು?",
    Malayalam: "ഇന്ന് നിങ്ങളുടെ കൺസൾട്ടേഷൻ എങ്ങനെ ഉണ്ടായിരുന്നു?",
    Marathi: "आजचे आपले सल्लामसलत कसे होते?",
    Bengali: "আজ আপনার পরামর্শ কেমন ছিল?",
    Punjabi: "ਅੱਜ ਤੁਹਾਡੀ ਸਲਾਹ-ਮਸ਼ਵਰਾ ਕਿਵੇਂ ਰਿਹਾ?"
  },
  "we hope you are doing well": {
    Telugu: "మీరు బాగున్నారని ఆశిస్తున్నాము",
    Hindi: "हम आशा करते हैं कि आप अच्छे होंगे",
    Tamil: "நீங்கள் நலமாக இருக்கிறீர்கள் என்று நம்புகிறோம்",
    Kannada: "ನೀವು ಚೆನ್ನಾಗಿದ್ದೀರಿ ಎಂದು ನಾವು ಭಾವಿಸುತ್ತೇವೆ",
    Malayalam: "നിങ്ങൾ സുਖമായിരിക്കുന്നു എന്ന് കരുതുന്നു",
    Marathi: "आम्ही आशा करतो की आपण बरे आहात",
    Bengali: "আমরা আশা করি আপনি ভালো আছেন",
    Punjabi: "ਅਸੀਂ ਉਮੀਦ ਕਰਦੇ ਹਾਂ ਕਿ ਤੁਸੀਂ ਠੀਕ ਹੋਵੋਗੇ"
  },
  "would you like to reschedule?": {
    Telugu: "మీరు పునః షెడ్యూల్ చేయాలనుకుంటున్నారా?",
    Hindi: "क्या आप रीशेड्यूल करना चाहेंगे?",
    Tamil: "நீங்கள் மீண்டும் அட்டவணைப்படுத்த விரும்புகிறீர்களா?",
    Kannada: "ನೀವು ಮರುಹೊಂದಿಸಲು ಬಯಸುತ್ತೀರಾ?",
    Malayalam: "നിങ്ങൾ പുനഃക്രമീകരിക്കാൻ ఆഗ്രഹിക്കുന്നുണ്ടോ?",
    Marathi: "आपण पुन्हा वेळापत्रक करू इच्छिता?",
    Bengali: "আপনি কি পুনরায় সময়সূচী করতে চান?",
    Punjabi: "ਕੀ ਤੁਸੀਂ ਰੀਸ਼ੈਡਿਊਲ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?"
  },
  "for details, please contact us": {
    Telugu: "వివరాల కోసం మమ్మల్ని సంప్రదించండి",
    Hindi: "विवरण के लिए कृपया हमसे संपर्क करें",
    Tamil: "விவரங்களுக்கு எங்களை தொடர்பு கொள்ளவும்",
    Kannada: "ವಿವರಗಳಿಗಾಗಿ ದಯವಿಟ್ಟು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ",
    Malayalam: "വിവരങ്ങൾക്ക് ദയവായി ഞങ്ങളെ ബന്ധപ്പെടുക",
    Marathi: "तपशीलांसाठी कृपया आमच्याशी संपर्क साधा",
    Bengali: "বিস্তারিত জানার জন্য আমাদের সাথে যোগাযোগ করুন",
    Punjabi: "ਵੇਰਵਿਆਂ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਸਾਡੇ ਨਾਲ ਸੰਪਰਕ ਕਰੋ"
  }
};

function localTranslateText(text: string, targetLanguage: string): string {
  if (!text || !targetLanguage || targetLanguage === "English") return text;
  
  let translated = text;
  for (const [englishPhrase, langMap] of Object.entries(TRANSLATION_DICTIONARY)) {
    const translation = langMap[targetLanguage];
    if (translation) {
      const escaped = englishPhrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escaped, "gi");
      translated = translated.replace(regex, translation);
    }
  }
  return translated;
}

async function translateTextOnline(text: string, targetLanguage: string): Promise<string> {
  if (!text || !targetLanguage || targetLanguage === "English") return text;
  const langMap: Record<string, string> = {
    Telugu: "te",
    Hindi: "hi",
    Tamil: "ta",
    Kannada: "kn",
    Malayalam: "ml",
    Marathi: "mr",
    Bengali: "bn",
    Punjabi: "pa"
  };
  const targetCode = langMap[targetLanguage];
  if (!targetCode) return text;

  // Protect tokens like {Patient Name}
  const tokenRegex = /\{[^{}]+\}/g;
  const tokens: string[] = [];
  let index = 0;
  const processedText = text.replace(tokenRegex, (match) => {
    tokens.push(match);
    return `__TOKEN_${index++}__`;
  });

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(processedText)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Translation API failed");
    const data = await res.json();
    if (data && data[0]) {
      let translated = data[0].map((x: any) => x[0]).join('');
      // Restore tokens
      for (let i = 0; i < tokens.length; i++) {
        const loosePlaceholder = new RegExp(`__\\s*TOKEN\\s*_${i}\\s*__`, 'gi');
        translated = translated.replace(loosePlaceholder, tokens[i]);
      }
      return translated;
    }
  } catch (error) {
    console.error("Online translation error, falling back to local dictionary:", error);
  }

  // Fallback to local dictionary translation
  return localTranslateText(text, targetLanguage);
}

const ACTIONS_LIBRARY = [
  { value: "Send Welcome WhatsApp", label: "Welcome WhatsApp", category: "WhatsApp", desc: "Default welcome message template" },
  { value: "Send WhatsApp: custom", label: "Custom WhatsApp", category: "WhatsApp", desc: "Compose custom message text" },
  { value: "Send WhatsApp Notification", label: "WhatsApp Notification", category: "WhatsApp", desc: "Default notification template" },
  { value: "Send WhatsApp Invoice Attachment", label: "Send Invoice via WhatsApp", category: "WhatsApp", desc: "Send PDF invoice with caption" },
  { value: "Send WhatsApp Feedback Request", label: "Feedback Request", category: "WhatsApp", desc: "Request patient feedback via WhatsApp" },
  { value: "Send WhatsApp: Lab Report Request", label: "Request Lab Report", category: "WhatsApp", desc: "Ask patient to upload lab reports" },
  { value: "Send WhatsApp: Prescription PDF", label: "Send Prescription", category: "WhatsApp", desc: "Send prescription PDF via WhatsApp" },
  { value: "Send WhatsApp: Holiday Greetings", label: "Holiday Greetings", category: "WhatsApp", desc: "Send generic holiday greeting" },
  
  { value: "Send Pending Bill SMS", label: "Bill Reminder SMS", category: "SMS", desc: "Send standard bill reminder" },
  { value: "Send SMS: custom", label: "Custom SMS", category: "SMS", desc: "Compose custom SMS text" },
  { value: "Send SMS Appointment Reminder", label: "Appointment Reminder SMS", category: "SMS", desc: "Remind patient of upcoming slot" },

  { value: "Send Email: custom", label: "Custom Email", category: "Email", desc: "Compose custom email text" },
  { value: "Send Email: Prescription", label: "Email Prescription", category: "Email", desc: "Email prescription PDF to patient" },
  { value: "Send Email: Welcome", label: "Email Welcome", category: "Email", desc: "Send patient clinic introduction email" },
  
  { value: "Wait Delay", label: "Wait / Delay", category: "Flow Control", desc: "Pause workflow execution" },
  
  { value: "Filter: Language", label: "Language Filter", category: "Filters", desc: "Filter execution by preferred language" },
  { value: "Filter: Gender", label: "Gender Filter", category: "Filters", desc: "Filter execution by gender" },
  { value: "Filter: Age Group", label: "Age Group Filter", category: "Filters", desc: "Filter execution by age category" },
  { value: "Filter: WhatsApp Opt-in", label: "Opt-in Filter", category: "Filters", desc: "Filter based on opt-in status" },
  { value: "Filter: Department", label: "Department Filter", category: "Filters", desc: "Filter based on doctor's clinical department" },
  { value: "Filter: Appointment Type", label: "Appointment Type Filter", category: "Filters", desc: "Filter based on appointment booking type" },
  
  { value: "Create Staff Task", label: "Create Follow-up Task", category: "Internal", desc: "Assign follow-up task to staff" },
  { value: "Internal: Update Patient Status = Active", label: "Set Status: Active", category: "Internal", desc: "Mark patient status active" },
  { value: "Internal: Update Patient Status = Checked In", label: "Set Status: Checked In", category: "Internal", desc: "Mark patient status checked-in" },
  { value: "Internal: Notify Doctor via Email", label: "Notify Doctor", category: "Internal", desc: "Send email alert to doctor" },
  { value: "Internal: Notify Administrator", label: "Notify Admin", category: "Internal", desc: "Send admin dashboard alert" },
  { value: "Internal: Add Tag = VIP", label: "Add Tag: VIP", category: "Internal", desc: "Tag patient as VIP in registry" },
  { value: "Internal: Add Tag = High Risk", label: "Add Tag: High Risk", category: "Internal", desc: "Tag patient as High Risk category" },
  { value: "Internal: Add Tag = Follow-up Required", label: "Add Tag: Follow-up", category: "Internal", desc: "Tag patient for manual outreach" },
  { value: "Internal: Remove Tag", label: "Remove Patient Tag", category: "Internal", desc: "Clear tracking tags from patient record" },
  { value: "Internal: Auto-schedule Next Follow-up", label: "Auto-schedule Follow-up", category: "Internal", desc: "Schedule task for doctor follow-up in 30 days" },
  { value: "Internal: Block WhatsApp Communication", label: "Block Patient WhatsApp", category: "Internal", desc: "Opt-out patient from all future WhatsApps" },
  { value: "Internal: Unblock WhatsApp Communication", label: "Unblock Patient WhatsApp", category: "Internal", desc: "Opt-in patient to receive WhatsApp templates" }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTriggerColor(trigger: string) {
  return TRIGGER_COLORS[trigger] || "slate"
}

function getStepIcon(step: string) {
  if (step.startsWith("Filter:")) {
    return <Languages className="h-4 w-4 text-indigo-500" />
  }
  if (step.includes("Invoice") || step.includes("Bill") || step.includes("Payment")) {
    return <FileText className="h-4 w-4 text-violet-500" />
  }
  if (step.includes("WhatsApp")) return <MessageSquare className="h-4 w-4 text-emerald-500" />
  if (step.includes("SMS")) return <MessageSquare className="h-4 w-4 text-blue-500" />
  if (step.includes("Email")) return <Mail className="h-4 w-4 text-rose-500" />
  if (step.includes("Wait")) return <Clock className="h-4 w-4 text-amber-500" />
  if (step.includes("Task") || step.includes("Internal") || step.includes("Notify") || step.includes("Tag") || step.includes("Schedule") || step.includes("Block")) {
    return <UserCheck className="h-4 w-4 text-orange-500" />
  }
  return <Settings className="h-4 w-4 text-muted-foreground" />
}

function getStepLabel(step: string) {
  if (step.startsWith("Filter: Language =")) return `Filter: Only ${step.replace("Filter: Language =", "").trim()} patients`
  if (step.startsWith("Filter: Gender =")) return `Filter: Only ${step.replace("Filter: Gender =", "").trim()} patients`
  if (step.startsWith("Filter: Age Group =")) return `Filter: Age Group: ${step.replace("Filter: Age Group =", "").trim()}`
  if (step.startsWith("Filter: WhatsApp Opt-in =")) return `Filter: WhatsApp: ${step.replace("Filter: WhatsApp Opt-in =", "").trim()}`
  if (step.startsWith("Filter: Department =")) return `Filter: Dept: ${step.replace("Filter: Department =", "").trim()}`
  if (step.startsWith("Filter: Appointment Type =")) return `Filter: Appt: ${step.replace("Filter: Appointment Type =", "").trim()}`
  if (step.startsWith("Internal: Update Patient Status =")) return `Set Status: ${step.replace("Internal: Update Patient Status =", "").trim()}`
  if (step === "Internal: Notify Doctor via Email") return "Notify Doctor via Email"
  if (step === "Internal: Notify Administrator") return "Notify Administrator"
  
  if (step.startsWith("Internal: Add Tag =")) return `Add Tag: "${step.replace("Internal: Add Tag =", "").trim()}"`
  if (step.startsWith("Internal: Remove Tag =")) return `Remove Tag: "${step.replace("Internal: Remove Tag =", "").trim()}"`
  if (step === "Internal: Remove Tag") return "Remove All Patient Tags"
  if (step === "Internal: Auto-schedule Next Follow-up") return "Auto-schedule Next Follow-up"
  if (step === "Internal: Block WhatsApp Communication") return "Block Patient WhatsApp"
  if (step === "Internal: Unblock WhatsApp Communication") return "Unblock Patient WhatsApp"

  if (step === "Send WhatsApp Feedback Request") return "WhatsApp: Feedback Request"
  if (step === "Send SMS Appointment Reminder") return "SMS: Appointment Reminder"
  if (step.startsWith("Send WhatsApp:")) return `WhatsApp: "${step.replace("Send WhatsApp:", "").trim()}"`
  if (step.startsWith("Send SMS:")) return `SMS: "${step.replace("Send SMS:", "").trim()}"`
  if (step.startsWith("Send Email:")) return `Email: "${step.replace("Send Email:", "").trim()}"`
  
  if (step.startsWith("Send WhatsApp Invoice Attachment:")) return `Invoice + Caption: "${step.replace("Send WhatsApp Invoice Attachment:", "").trim()}"`
  if (step === "Send WhatsApp Invoice Attachment") return "Invoice Document via WhatsApp"
  if (step === "Send Welcome WhatsApp") return "Welcome WhatsApp Message"
  if (step === "Send WhatsApp Notification") return "WhatsApp Notification"
  if (step === "Send Pending Bill SMS") return "Bill Reminder SMS"
  if (step === "Create Staff Task") return "Create Follow-up Task"
  if (step.startsWith("Wait:")) return `Wait ${step.replace("Wait:", "").trim()}`
  return step
}

function getStepGroup(step: string): string {
  if (step.startsWith("Filter:")) {
    return "Filter"
  }
  if (step.startsWith("Send WhatsApp:") || step === "Send Welcome WhatsApp" || step === "Send WhatsApp Notification" || step.startsWith("Send WhatsApp Invoice Attachment:") || step === "Send WhatsApp Invoice Attachment" || step === "Send WhatsApp Feedback Request") {
    return "WhatsApp"
  }
  if (step.startsWith("Send SMS:") || step === "Send Pending Bill SMS" || step === "Send SMS Appointment Reminder") {
    return "SMS"
  }
  if (step.startsWith("Send Email:")) {
    return "Email"
  }
  if (step.startsWith("Wait:")) {
    return "Delay"
  }
  if (step === "Create Staff Task" || step.startsWith("Internal:")) {
    return "Internal"
  }
  return "System"
}

function getStepGroupColor(step: string): string {
  const group = getStepGroup(step);
  switch (group) {
    case "Filter":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    case "WhatsApp":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "SMS":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "Email":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "Delay":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "Internal":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
}

// ─── Exported Reusable WorkflowBuilder Component ─────────────────────────────

export function WorkflowBuilder({ embedded = false }: { embedded?: boolean }) {
  const [workflows, setWorkflows] = React.useState<AutomationWorkflow[]>([])
  const [selectedWf, setSelectedWf] = React.useState<AutomationWorkflow | null>(null)
  const [notice, setNotice] = React.useState<{ msg: string; type: "success" | "error" }>({ msg: "", type: "success" })

  // Search filter
  const [searchQuery, setSearchQuery] = React.useState("")

  // Run history logs
  const [runLogs, setRunLogs] = React.useState<WorkflowExecutionLog[]>([])
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null)

  // Create workflow dialog
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [wfName, setWfName] = React.useState("")
  const [wfTrigger, setWfTrigger] = React.useState("Patient Registered")

  // Rename dialog
  const [showRenameDialog, setShowRenameDialog] = React.useState(false)
  const [renameName, setRenameName] = React.useState("")

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deletingWf, setDeletingWf] = React.useState<AutomationWorkflow | null>(null)

  // Step builder
  const [selectedActionType, setSelectedActionType] = React.useState("Send Welcome WhatsApp")
  const [delayValue, setDelayValue] = React.useState(2)
  const [delayUnit, setDelayUnit] = React.useState("Days")
  const [customMsgText, setCustomMsgText] = React.useState("")
  const [isAddingStep, setIsAddingStep] = React.useState(false)
  const [showEditStepDialog, setShowEditStepDialog] = React.useState(false)
  const [editingStepIdx, setEditingStepIdx] = React.useState<number | null>(null)
  const [editingStepActionType, setEditingStepActionType] = React.useState("")
  const [editingStepDelayValue, setEditingStepDelayValue] = React.useState(2)
  const [editingStepDelayUnit, setEditingStepDelayUnit] = React.useState("Days")
  const [editingStepCustomMsg, setEditingStepCustomMsg] = React.useState("")
  const [selectedLanguageFilter, setSelectedLanguageFilter] = React.useState("English")
  const [selectedGenderFilter, setSelectedGenderFilter] = React.useState("Male")
  const [selectedAgeFilter, setSelectedAgeFilter] = React.useState("Adult (18-59)")
  const [selectedOptInFilter, setSelectedOptInFilter] = React.useState("Opted In")
  const [selectedDeptFilter, setSelectedDeptFilter] = React.useState("General Medicine")
  const [selectedApptTypeFilter, setSelectedApptTypeFilter] = React.useState("Consultation")
  const [actionsViewMode, setActionsViewMode] = React.useState<"grid" | "list">("grid")
  const [selectedCategory, setSelectedCategory] = React.useState("All")
  const [translateTargetLang, setTranslateTargetLang] = React.useState("Telugu")
  const [editingTranslateTargetLang, setEditingTranslateTargetLang] = React.useState("Telugu")

  // Step reorder
  const [draggingIdx, setDraggingIdx] = React.useState<number | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ""

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        const data = JSON.parse(content)
        const list = Array.isArray(data) ? data : [data]
        let importedCount = 0
        let lastWf = null

        for (const item of list) {
          if (!item.name || !item.trigger || !Array.isArray(item.steps)) {
            throw new Error("Invalid workflow format. Required fields: name, trigger, and steps (array).")
          }

          const newWf = {
            id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${item.name} (Imported)`,
            trigger: item.trigger,
            steps: item.steps,
            status: (item.status === "Active" || item.status === "Paused") ? item.status : "Paused",
            runCount: 0
          } as AutomationWorkflow

          const saved = await dbSaveWorkflow(newWf)
          lastWf = saved
          importedCount++
        }

        await loadWorkflows()
        if (lastWf) {
          setSelectedWf(lastWf)
        }
        triggerNotice(`Successfully imported ${importedCount} workflow(s)!`)
      } catch (err: any) {
        triggerNotice(err?.message || "Failed to parse JSON file.", "error")
      }
    }
    reader.readAsText(file)
  }

  const triggerNotice = (msg: string, type: "success" | "error" = "success") => {
    setNotice({ msg, type })
    setTimeout(() => setNotice({ msg: "", type: "success" }), 3500)
  }

  const loadWorkflows = React.useCallback(async () => {
    try {
      const data = await dbGetWorkflows()
      setWorkflows(data)
      if (data.length > 0) {
        setSelectedWf(prev => {
          if (prev) {
            const match = data.find(w => w.id === prev.id)
            return match || data[0]
          }
          return data[0]
        })
      } else {
        setSelectedWf(null)
      }
    } catch (err: any) {
      triggerNotice(err?.message || "Failed to load workflows", "error")
    }
  }, [])

  const loadLogs = React.useCallback(async () => {
    try {
      const logs = await dbGetWorkflowLogs()
      setRunLogs(logs)
    } catch (err) {
      console.warn("Failed to load workflow logs:", err)
    }
  }, [])

  React.useEffect(() => { 
    loadWorkflows()
    loadLogs()
  }, [loadWorkflows, loadLogs])

  // Poll execution logs
  React.useEffect(() => {
    const interval = setInterval(loadLogs, 4000)
    return () => clearInterval(interval)
  }, [loadLogs])

  // ── Workflow CRUD ──

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wfName.trim()) return
    try {
      const newWf = await dbSaveWorkflow({ name: wfName.trim(), trigger: wfTrigger, steps: [], status: "Paused", runCount: 0 })
      setShowCreateDialog(false)
      setWfName("")
      await loadWorkflows()
      setSelectedWf(newWf)
      triggerNotice(`Workflow "${newWf.name}" created!`)
    } catch (err: any) {
      triggerNotice(err?.message || "Failed to create workflow", "error")
    }
  }

  const handleToggleStatus = async (wf: AutomationWorkflow) => {
    const next = wf.status === "Active" ? "Paused" : "Active"
    await dbSaveWorkflow({ ...wf, status: next })
    await loadWorkflows()
    triggerNotice(`"${wf.name}" is now ${next}`)
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWf || !renameName.trim()) return
    await dbSaveWorkflow({ ...selectedWf, name: renameName.trim() })
    setShowRenameDialog(false)
    await loadWorkflows()
    triggerNotice("Workflow renamed.")
  }

  const triggerDeleteWorkflow = (wf: AutomationWorkflow) => {
    setDeletingWf(wf)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    const target = deletingWf || selectedWf
    if (!target) return
    try {
      await dbDeleteWorkflow(target.id)
      setShowDeleteDialog(false)
      setDeletingWf(null)
      await loadWorkflows()
      triggerNotice(`"${target.name}" deleted.`)
    } catch (err: any) {
      triggerNotice(err?.message || "Failed to delete workflow", "error")
    }
  }

  const handleDuplicate = async () => {
    if (!selectedWf) return
    const copy = await dbDuplicateWorkflow(selectedWf.id)
    await loadWorkflows()
    setSelectedWf(copy)
    triggerNotice(`Duplicated as "${copy.name}"`)
  }

  const handleResetRunCount = async () => {
    if (!selectedWf) return
    await dbSaveWorkflow({ ...selectedWf, runCount: 0 })
    await loadWorkflows()
    triggerNotice("Run counter reset to 0.")
  }

  const handleBulkRun = async () => {
    if (!selectedWf) return
    try {
      triggerNotice("Executing bulk campaign across all patients...")
      const res = await dbRunWorkflowInBulk(selectedWf.id)
      await loadWorkflows()
      await loadLogs()
      triggerNotice(`Campaign complete: ${res.successCount} executed successfully. Check logs for details.`)
    } catch (err: any) {
      triggerNotice(err?.message || "Failed to run campaign", "error")
    }
  }

  const handleImportPreset = async (preset: typeof PRESET_TEMPLATES[0]) => {
    try {
      const newWf = await dbSaveWorkflow({
        name: preset.name,
        trigger: preset.trigger,
        steps: preset.steps,
        status: "Paused",
        runCount: 0
      })
      await loadWorkflows()
      setSelectedWf(newWf)
      triggerNotice(`Preset "${preset.name}" imported! Activate it when ready.`)
    } catch (err: any) {
      triggerNotice(err?.message || "Failed to import preset", "error")
    }
  }

  const handleClearHistory = async () => {
    try {
      await dbClearWorkflowLogs()
      await loadLogs()
      triggerNotice("Workflow execution logs cleared.")
    } catch (err: any) {
      triggerNotice(err?.message || "Failed to clear logs", "error")
    }
  }

  // ── Step CRUD ──

  const handleAddStep = async () => {
    if (!selectedWf) return
    let step = selectedActionType
    if (selectedActionType === "Wait Delay") {
      step = `Wait: ${delayValue} ${delayUnit}`
    } else if (selectedActionType === "Send WhatsApp: custom") {
      if (!customMsgText.trim()) { triggerNotice("Please enter a message.", "error"); return }
      step = `Send WhatsApp: ${customMsgText.trim()}`
    } else if (selectedActionType === "Send SMS: custom") {
      if (!customMsgText.trim()) { triggerNotice("Please enter a message.", "error"); return }
      step = `Send SMS: ${customMsgText.trim()}`
    } else if (selectedActionType === "Send Email: custom") {
      if (!customMsgText.trim()) { triggerNotice("Please enter a message.", "error"); return }
      step = `Send Email: ${customMsgText.trim()}`
    } else if (selectedActionType === "Send WhatsApp Invoice Attachment") {
      step = customMsgText.trim() ? `Send WhatsApp Invoice Attachment: ${customMsgText.trim()}` : "Send WhatsApp Invoice Attachment"
    } else if (selectedActionType === "Filter: Language") {
      step = `Filter: Language = ${selectedLanguageFilter}`
    } else if (selectedActionType === "Filter: Gender") {
      step = `Filter: Gender = ${selectedGenderFilter}`
    } else if (selectedActionType === "Filter: Age Group") {
      step = `Filter: Age Group = ${selectedAgeFilter}`
    } else if (selectedActionType === "Filter: WhatsApp Opt-in") {
      step = `Filter: WhatsApp Opt-in = ${selectedOptInFilter}`
    } else if (selectedActionType === "Filter: Department") {
      step = `Filter: Department = ${selectedDeptFilter}`
    } else if (selectedActionType === "Filter: Appointment Type") {
      step = `Filter: Appointment Type = ${selectedApptTypeFilter}`
    }
    const updated = { ...selectedWf, steps: [...selectedWf.steps, step] }
    await dbSaveWorkflow(updated)
    await loadWorkflows()
    setCustomMsgText("")
    setIsAddingStep(false)
    triggerNotice("Step added.")
  }

  const handleRemoveStep = async (idx: number) => {
    if (!selectedWf) return
    const steps = selectedWf.steps.filter((_, i) => i !== idx)
    await dbSaveWorkflow({ ...selectedWf, steps })
    await loadWorkflows()
    triggerNotice("Step removed.")
  }

  const handleEditStepClick = (idx: number, step: string) => {
    setEditingStepIdx(idx)
    
    if (step.startsWith("Wait:")) {
      setEditingStepActionType("Wait Delay")
      const parts = step.replace("Wait:", "").trim().split(" ")
      const val = parseInt(parts[0], 10)
      const unit = parts[1] || "Days"
      setEditingStepDelayValue(isNaN(val) ? 2 : val)
      setEditingStepDelayUnit(unit)
    } else if (step.startsWith("Send WhatsApp:")) {
      setEditingStepActionType("Send WhatsApp: custom")
      setEditingStepCustomMsg(step.replace("Send WhatsApp:", "").trim())
    } else if (step.startsWith("Send SMS:")) {
      setEditingStepActionType("Send SMS: custom")
      setEditingStepCustomMsg(step.replace("Send SMS:", "").trim())
    } else if (step.startsWith("Send Email:")) {
      setEditingStepActionType("Send Email: custom")
      setEditingStepCustomMsg(step.replace("Send Email:", "").trim())
    } else if (step.startsWith("Send WhatsApp Invoice Attachment:")) {
      setEditingStepActionType("Send WhatsApp Invoice Attachment")
      setEditingStepCustomMsg(step.replace("Send WhatsApp Invoice Attachment:", "").trim())
    } else if (step.startsWith("Filter: Language =")) {
      setEditingStepActionType("Filter: Language")
      setEditingStepCustomMsg(step.replace("Filter: Language =", "").trim())
    } else if (step.startsWith("Filter: Gender =")) {
      setEditingStepActionType("Filter: Gender")
      setEditingStepCustomMsg(step.replace("Filter: Gender =", "").trim())
    } else if (step.startsWith("Filter: Age Group =")) {
      setEditingStepActionType("Filter: Age Group")
      setEditingStepCustomMsg(step.replace("Filter: Age Group =", "").trim())
    } else if (step.startsWith("Filter: WhatsApp Opt-in =")) {
      setEditingStepActionType("Filter: WhatsApp Opt-in")
      setEditingStepCustomMsg(step.replace("Filter: WhatsApp Opt-in =", "").trim())
    } else if (step.startsWith("Filter: Department =")) {
      setEditingStepActionType("Filter: Department")
      setEditingStepCustomMsg(step.replace("Filter: Department =", "").trim())
    } else if (step.startsWith("Filter: Appointment Type =")) {
      setEditingStepActionType("Filter: Appointment Type")
      setEditingStepCustomMsg(step.replace("Filter: Appointment Type =", "").trim())
    } else {
      setEditingStepActionType(step)
      setEditingStepCustomMsg("")
    }
    
    setShowEditStepDialog(true)
  }

  const handleSaveEditedStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingStepIdx === null || !selectedWf) return

    let updatedStep = editingStepActionType
    if (editingStepActionType === "Wait Delay") {
      updatedStep = `Wait: ${editingStepDelayValue} ${editingStepDelayUnit}`
    } else if (editingStepActionType === "Send WhatsApp: custom") {
      if (!editingStepCustomMsg.trim()) {
        triggerNotice("Please enter a custom message.", "error")
        return
      }
      updatedStep = `Send WhatsApp: ${editingStepCustomMsg.trim()}`
    } else if (editingStepActionType === "Send SMS: custom") {
      if (!editingStepCustomMsg.trim()) {
        triggerNotice("Please enter a custom message.", "error")
        return
      }
      updatedStep = `Send SMS: ${editingStepCustomMsg.trim()}`
    } else if (editingStepActionType === "Send Email: custom") {
      if (!editingStepCustomMsg.trim()) {
        triggerNotice("Please enter a custom message.", "error")
        return
      }
      updatedStep = `Send Email: ${editingStepCustomMsg.trim()}`
    } else if (editingStepActionType === "Send WhatsApp Invoice Attachment") {
      updatedStep = editingStepCustomMsg.trim() 
        ? `Send WhatsApp Invoice Attachment: ${editingStepCustomMsg.trim()}` 
        : "Send WhatsApp Invoice Attachment"
    } else if (editingStepActionType === "Filter: Language") {
      updatedStep = `Filter: Language = ${editingStepCustomMsg}`
    } else if (editingStepActionType === "Filter: Gender") {
      updatedStep = `Filter: Gender = ${editingStepCustomMsg}`
    } else if (editingStepActionType === "Filter: Age Group") {
      updatedStep = `Filter: Age Group = ${editingStepCustomMsg}`
    } else if (editingStepActionType === "Filter: WhatsApp Opt-in") {
      updatedStep = `Filter: WhatsApp Opt-in = ${editingStepCustomMsg}`
    } else if (editingStepActionType === "Filter: Department") {
      updatedStep = `Filter: Department = ${editingStepCustomMsg}`
    } else if (editingStepActionType === "Filter: Appointment Type") {
      updatedStep = `Filter: Appointment Type = ${editingStepCustomMsg}`
    }

    const steps = [...selectedWf.steps]
    steps[editingStepIdx] = updatedStep

    await dbSaveWorkflow({ ...selectedWf, steps })
    await loadWorkflows()
    
    setShowEditStepDialog(false)
    setEditingStepIdx(null)
    triggerNotice("Step updated successfully.")
  }

  const handleMoveStep = async (from: number, to: number) => {
    if (!selectedWf) return
    const steps = [...selectedWf.steps]
    const [moved] = steps.splice(from, 1)
    steps.splice(to, 0, moved)
    await dbSaveWorkflow({ ...selectedWf, steps })
    await loadWorkflows()
  }

  // ── Derived ──
  const activeCount  = workflows.filter(w => w.status === "Active").length
  const totalRuns    = workflows.reduce((s, w) => s + (w.runCount || 0), 0)

  // Filtered workflows
  const filteredWorkflows = workflows.filter(wf => 
    wf.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    wf.trigger.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* ── Notice bar ── */}
      {notice.msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border animate-in slide-in-from-top-1 duration-200 ${
          notice.type === "error"
            ? "bg-destructive/10 border-destructive/20 text-destructive"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        }`}>
          {notice.type === "error" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{notice.msg}</span>
          <button onClick={() => setNotice({ msg: "", type: "success" })} className="cursor-pointer bg-transparent border-0 text-inherit p-0"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ── Page Header (Only show if not embedded) ── */}
      {!embedded && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground tracking-tight">Workflow Automation</h1>
              <p className="text-xs text-muted-foreground font-semibold">Build, manage and monitor automated trigger-action workflows</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleImportClick}
              variant="outline"
              className="cursor-pointer gap-1.5 font-bold"
              size="sm"
              title="Import workflow from a .json file"
            >
              <Upload className="h-4 w-4" /> Import Workflow
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="cursor-pointer gap-1.5 font-bold"
              size="sm"
            >
              <Plus className="h-4 w-4" /> New Workflow
            </Button>
          </div>
        </div>
      )}

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Workflows", value: workflows.length, icon: <Workflow className="h-4 w-4 text-primary" />, color: "primary" },
          { label: "Active Journeys", value: activeCount,      icon: <Play className="h-4 w-4 text-emerald-500" />, color: "emerald" },
          { label: "Total Executions",value: totalRuns,        icon: <BarChart3 className="h-4 w-4 text-violet-500" />, color: "violet" },
        ].map(stat => (
          <Card key={stat.label} className="relative overflow-hidden border border-border/60 shadow-xs">
            <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/5 to-transparent pointer-events-none`} />
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 border border-border/40 shrink-0">
                {stat.icon}
              </div>
              <div>
                <div className="text-base font-extrabold text-foreground leading-none">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground font-semibold mt-1">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main split layout ── */}
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">

        {/* ─── Left Column: Directory / Presets Tabs ─── */}
        <div className="space-y-4">
          <Tabs defaultValue="directory" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-muted/60 text-xxs mb-3">
              <TabsTrigger value="directory">Directory</TabsTrigger>
              <TabsTrigger value="presets">Import Presets</TabsTrigger>
            </TabsList>

            {/* Tab: Workflow Directory list */}
            <TabsContent value="directory" className="space-y-3 focus-visible:outline-hidden">
              <Card className="overflow-hidden border border-border/60 shadow-xs">
                <CardHeader className="py-2 px-3 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Automation List
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] font-bold py-0">{filteredWorkflows.length}</Badge>
                </CardHeader>

                {/* Directory Search */}
                <div className="px-3 pt-2 pb-1 relative">
                  <Search className="absolute left-5 top-4.5 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="text-xxs h-8 pl-7.5 bg-muted/20"
                  />
                </div>

                <CardContent className="p-0 divide-y divide-border/20 max-h-[360px] overflow-y-auto">
                  {filteredWorkflows.length === 0 && (
                    <div className="py-8 px-4 text-center text-xs text-muted-foreground font-medium">
                      No workflows match search query.
                    </div>
                  )}
                  {filteredWorkflows.map(wf => {
                    const isSelected = selectedWf?.id === wf.id
                    const color = getTriggerColor(wf.trigger)
                    return (
                      <div
                        key={wf.id}
                        onClick={() => setSelectedWf(wf)}
                        className={`group px-3 py-2.5 cursor-pointer transition-all duration-150 flex items-center gap-2.5 hover:bg-muted/30 relative ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        {isSelected && <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r bg-primary" />}

                        {/* Status Dot */}
                        <div className={`h-2 w-2 rounded-full shrink-0 ${
                          wf.status === "Active" ? "bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/40"
                        }`} />

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-foreground truncate leading-tight">{wf.name}</div>
                          <div className="text-[9px] text-muted-foreground font-semibold mt-0.5 flex items-center gap-1">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full bg-${color}-500`} />
                            {wf.trigger}
                          </div>
                        </div>

                        {/* Inline list controls */}
                        <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-bold text-muted-foreground mr-0.5">{wf.steps.length}s</span>
                          
                          <button
                            onClick={e => { e.stopPropagation(); handleToggleStatus(wf) }}
                            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer bg-transparent border-0"
                            title={wf.status === "Active" ? "Pause" : "Activate"}
                          >
                            {wf.status === "Active"
                              ? <Play className="h-3 w-3 text-emerald-500 fill-emerald-500" />
                              : <Pause className="h-3 w-3 text-muted-foreground fill-muted-foreground" />
                            }
                          </button>

                          <button
                            onClick={e => { e.stopPropagation(); triggerDeleteWorkflow(wf) }}
                            className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-transparent border-0"
                            title="Delete Workflow"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Trigger Legend */}
              <Card className="border border-border/60 shadow-xs">
                <CardHeader className="py-2.5 px-3 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Trigger Definitions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {TRIGGER_OPTIONS.map(t => (
                    <div key={t.value} className="flex gap-2 items-start text-[10px]">
                      <div className={`h-1.5 w-1.5 rounded-full bg-${getTriggerColor(t.value)}-500 mt-1 shrink-0`} />
                      <div>
                        <span className="font-bold text-foreground leading-none">{t.label}</span>
                        <p className="text-[9px] text-muted-foreground/80 mt-0.5 font-medium leading-relaxed">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Presets templates Library */}
            <TabsContent value="presets" className="focus-visible:outline-hidden">
              <Card className="border border-border/60 shadow-xs">
                <CardHeader className="py-2.5 px-3 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Preset Templates
                  </CardTitle>
                  <CardDescription className="text-[9px] font-medium">Click to import standard clinic workflow configurations.</CardDescription>
                </CardHeader>
                <CardContent className="p-2 space-y-2 max-h-[460px] overflow-y-auto">
                  {PRESET_TEMPLATES.map(preset => (
                    <div
                      key={preset.name}
                      className="p-2.5 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/30 transition-all flex flex-col justify-between gap-2 text-xxs group border-solid"
                    >
                      <div>
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors">{preset.name}</div>
                        <p className="text-[9px] text-muted-foreground/85 mt-1 leading-relaxed">{preset.desc}</p>
                      </div>

                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/30 border-solid">
                        <Badge variant="outline" className={`text-[8px] font-semibold bg-${getTriggerColor(preset.trigger)}-500/5 text-${getTriggerColor(preset.trigger)}-600 border-${getTriggerColor(preset.trigger)}-500/10`}>
                          {preset.trigger}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleImportPreset(preset)}
                          className="h-6 text-[9px] px-2 font-bold cursor-pointer"
                        >
                          Import
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ─── Right Column: Designer / Execution Logs Tabs ─── */}
        <div>
          {!selectedWf ? (
            <div className="h-full min-h-[400px] border-2 border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center gap-4">
              <Workflow className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-center">
                <p className="text-sm font-bold text-muted-foreground">No Workflow Selected</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Select a workflow from the directory or import a preset template</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={handleImportClick} title="Import workflow from a .json file">
                  <Upload className="h-4 w-4 mr-1" /> Import Workflow
                </Button>
                <Button size="sm" className="cursor-pointer" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create Workflow
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="designer" className="w-full">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <TabsList className="grid grid-cols-2 w-[280px] bg-muted/60 text-xxs">
                  <TabsTrigger value="designer">Workflow Designer</TabsTrigger>
                  <TabsTrigger value="logs">Execution History</TabsTrigger>
                </TabsList>

                {embedded && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      onClick={handleImportClick}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xxs font-bold gap-1 cursor-pointer"
                      title="Import workflow from a .json file"
                    >
                      <Upload className="h-3.5 w-3.5" /> Import
                    </Button>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      size="sm"
                      className="h-7 text-xxs font-bold gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Create
                    </Button>
                  </div>
                )}
              </div>

              {/* Tab Content: Flowchart Canvas Designer */}
              <TabsContent value="designer" className="space-y-4 focus-visible:outline-hidden">
                {/* Canvas Header */}
                <Card className="border border-border/60 shadow-xs">
                  <CardHeader className="p-4 border-b border-border/40 bg-muted/10 space-y-3">
                    {/* Top row: Title, status, trigger metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-base font-extrabold text-foreground tracking-tight truncate">{selectedWf.name}</h2>
                          <Badge
                            className={`text-xs font-bold shrink-0 px-2.5 py-0.5 ${
                              selectedWf.status === "Active"
                                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                            variant="outline"
                          >
                            {selectedWf.status === "Active" ? <Play className="h-3 w-3 mr-1 fill-emerald-500 text-emerald-500" /> : <Pause className="h-3 w-3 mr-1" />}
                            {selectedWf.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium flex-wrap">
                          <span>Trigger: <strong className="text-foreground font-semibold">{selectedWf.trigger}</strong></span>
                          <span>·</span>
                          <span>{selectedWf.steps.length} step{selectedWf.steps.length !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />{selectedWf.runCount || 0} runs</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Action toolbar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30 flex-wrap">
                      <Button
                        variant="outline" size="sm"
                        className={`h-8 text-xs cursor-pointer gap-1.5 font-bold ${
                          selectedWf.status === "Active"
                            ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                            : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        }`}
                        onClick={() => handleToggleStatus(selectedWf)}
                      >
                        {selectedWf.status === "Active" ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Activate</>}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs cursor-pointer gap-1.5 font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-xs border-solid border border-violet-600"
                        onClick={handleBulkRun}
                        title="Run this workflow immediately for all registered patients"
                      >
                        <Zap className="h-3.5 w-3.5 fill-white" /> Run Bulk Campaign
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer gap-1.5 font-medium"
                        onClick={() => { setRenameName(selectedWf.name); setShowRenameDialog(true) }}>
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer gap-1.5 font-medium"
                        onClick={handleDuplicate}>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs cursor-pointer gap-1.5 font-medium"
                        onClick={handleResetRunCount}
                        title="Reset run counter to 0">
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-xs cursor-pointer gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 font-medium"
                        onClick={() => triggerDeleteWorkflow(selectedWf)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Flowchart Canvas */}
                <Card className="border border-border/60 overflow-hidden shadow-xs">
                  <CardContent className="p-5">
                    <div className="flex flex-col items-center gap-0">

                      {/* ── Trigger node ── */}
                      <div className={`w-80 sm:w-96 px-5 py-3 rounded-2xl border-2 border-solid text-center shadow-xs bg-${getTriggerColor(selectedWf.trigger)}-500/5 border-${getTriggerColor(selectedWf.trigger)}-500/60`}>
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">⚡ TRIGGER EVENT</div>
                        <div className="text-sm font-extrabold text-foreground">{selectedWf.trigger}</div>
                      </div>

                      {selectedWf.steps.length > 0 && <ArrowDown className="h-4.5 w-4.5 text-muted-foreground/50 my-1 animate-bounce" />}

                      {/* ── Step nodes ── */}
                      {selectedWf.steps.map((step, idx) => (
                        <React.Fragment key={idx}>
                          <div className="group relative w-80 sm:w-96 px-4 py-3 bg-card border border-border/70 rounded-2xl shadow-xs flex items-center gap-3 hover:border-primary/40 hover:shadow-xs transition-all duration-200 border-solid">
                            {/* Step number */}
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground">
                              {idx + 1}
                            </div>

                            {/* Icon */}
                            <div className="p-1.5 bg-muted/65 rounded-lg shrink-0">
                              {getStepIcon(step)}
                            </div>

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                              <div className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded inline-block mb-0.5 ${getStepGroupColor(step)}`}>
                                {getStepGroup(step)}
                              </div>
                              <div className="text-xs font-bold text-foreground leading-snug truncate" title={getStepLabel(step)}>
                                {getStepLabel(step)}
                              </div>
                            </div>

                            {/* Controls — appear on hover */}
                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => idx > 0 && handleMoveStep(idx, idx - 1)}
                                disabled={idx === 0}
                                className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-0 text-inherit"
                                title="Move up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => idx < selectedWf.steps.length - 1 && handleMoveStep(idx, idx + 1)}
                                disabled={idx === selectedWf.steps.length - 1}
                                className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer bg-transparent border-0 text-inherit"
                                title="Move down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleEditStepClick(idx, step)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground text-muted-foreground transition-all shrink-0 cursor-pointer bg-transparent border-0"
                              title="Edit step"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveStep(idx)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all shrink-0 cursor-pointer bg-transparent border-0"
                              title="Remove step"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          {idx < selectedWf.steps.length - 1 && (
                            <ArrowDown className="h-4 w-4 text-muted-foreground/40 my-0.5" />
                          )}
                        </React.Fragment>
                      ))}

                      {/* ── Empty state ── */}
                      {selectedWf.steps.length === 0 && (
                        <div className="mt-2 w-64 py-6 border-2 border-dashed border-border/40 rounded-2xl text-center text-xs text-muted-foreground font-semibold">
                          No steps yet. Add an action step below.
                        </div>
                      )}

                      {/* ── End cap ── */}
                      {selectedWf.steps.length > 0 && (
                        <>
                          <ArrowDown className="h-4 w-4 text-muted-foreground/40 my-0.5" />
                          <div className="w-32 py-1.5 rounded-xl bg-muted/30 border border-border/40 border-solid text-center text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            END OF JOURNEY
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>

                  {/* ── Add Step Panel ── */}
                  <div className="border-t border-border/40 bg-muted/10 border-solid">
                    {!isAddingStep ? (
                      <div className="p-3 flex justify-center">
                        <Button
                          variant="outline" size="sm"
                          className="cursor-pointer gap-1.5 font-bold border-dashed h-7"
                          onClick={() => setIsAddingStep(true)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Action Step
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {/* Header with Close */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-foreground">Add Step</span>
                          </div>
                          <button onClick={() => { setIsAddingStep(false); setCustomMsgText("") }} className="text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Toolbar: Category Filter & View Mode Toggle */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-border/40 pb-3 border-solid">
                          {/* Category Filter Tabs */}
                          <div className="flex flex-wrap gap-1">
                            {["All", "WhatsApp", "SMS", "Email", "Flow Control", "Filters", "Internal"].map((cat) => (
                              <button
                                type="button"
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-2 py-1 text-[10px] rounded-lg font-bold border border-solid transition-all cursor-pointer ${
                                  selectedCategory === cat
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "bg-background border-border/60 hover:bg-muted/40 text-muted-foreground"
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>

                          {/* View Mode Toggle (Grid vs List) */}
                          <div className="flex items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setActionsViewMode("grid")}
                              className={`p-1.5 rounded-lg border border-solid transition-all cursor-pointer ${
                                actionsViewMode === "grid"
                                  ? "bg-primary/10 border-primary/20 text-primary"
                                  : "bg-background border-border/40 hover:bg-muted/40 text-muted-foreground"
                              }`}
                              title="Grid View"
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionsViewMode("list")}
                              className={`p-1.5 rounded-lg border border-solid transition-all cursor-pointer ${
                                actionsViewMode === "list"
                                  ? "bg-primary/10 border-primary/20 text-primary"
                                  : "bg-background border-border/40 hover:bg-muted/40 text-muted-foreground"
                              }`}
                              title="List View"
                            >
                              <List className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Step Library List or Grid */}
                        <div className="max-h-56 overflow-y-auto pr-1">
                          {actionsViewMode === "grid" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {ACTIONS_LIBRARY.filter(a => selectedCategory === "All" || a.category === selectedCategory).map((action) => {
                                const isSelected = selectedActionType === action.value;
                                return (
                                  <div
                                    key={action.value}
                                    onClick={() => {
                                      setSelectedActionType(action.value);
                                      setCustomMsgText("");
                                    }}
                                    className={`p-2.5 rounded-xl border border-solid text-left cursor-pointer transition-all hover:bg-muted/40 ${
                                      isSelected
                                        ? "bg-primary/[0.04] border-primary shadow-xs ring-1 ring-primary/20"
                                        : "bg-background border-border/60"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="p-1 rounded-lg bg-muted/60">
                                        {getStepIcon(action.value)}
                                      </div>
                                      <span className="text-[11px] font-bold text-foreground line-clamp-1">{action.label}</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground line-clamp-2 leading-tight font-medium">
                                      {action.desc}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {ACTIONS_LIBRARY.filter(a => selectedCategory === "All" || a.category === selectedCategory).map((action) => {
                                const isSelected = selectedActionType === action.value;
                                return (
                                  <div
                                    key={action.value}
                                    onClick={() => {
                                      setSelectedActionType(action.value);
                                      setCustomMsgText("");
                                    }}
                                    className={`p-2 px-3 rounded-lg border border-solid text-left cursor-pointer transition-all flex items-center justify-between hover:bg-muted/40 ${
                                      isSelected
                                        ? "bg-primary/[0.04] border-primary shadow-xs animate-duration-100"
                                        : "bg-background border-border/40"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-1 rounded bg-muted/50">
                                        {getStepIcon(action.value)}
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-bold text-foreground block">{action.label}</span>
                                        <span className="text-[9px] text-muted-foreground font-medium leading-none">{action.desc}</span>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[8px] h-4 font-bold uppercase tracking-wider bg-muted/30">
                                      {action.category}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Selected Step Info / Parameters Config Area */}
                        <div className="p-3 border border-border/50 rounded-xl bg-muted/20 space-y-3 border-solid">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground border-b border-border/30 pb-1.5 border-solid">
                            <span>Selected Action:</span>
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              {getStepIcon(selectedActionType)}
                              {ACTIONS_LIBRARY.find(a => a.value === selectedActionType)?.label || selectedActionType}
                            </span>
                          </div>

                          {/* Render Dynamic Config Fields */}
                          {selectedActionType === "Wait Delay" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-foreground">Duration</Label>
                              <div className="flex gap-1.5">
                                <Input
                                  type="number" min={1}
                                  value={delayValue}
                                  onChange={e => setDelayValue(parseInt(e.target.value) || 1)}
                                  className="h-8 text-xxs flex-1 px-2.5 rounded-lg border-solid"
                                />
                                <Select value={delayUnit} onChange={e => setDelayUnit(e.target.value)} className="text-xxs w-24 h-8 rounded-lg">
                                  <option value="Seconds">Seconds</option>
                                  <option value="Minutes">Minutes</option>
                                  <option value="Hours">Hours</option>
                                  <option value="Days">Days</option>
                                </Select>
                              </div>
                            </div>
                          ) : selectedActionType === "Filter: Language" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-foreground">Preferred Language Filter</Label>
                              <Select
                                value={selectedLanguageFilter}
                                onChange={e => setSelectedLanguageFilter(e.target.value)}
                                className="text-xxs h-8 w-full rounded-lg"
                              >
                                <option value="English">English</option>
                                <option value="Telugu">Telugu</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Tamil">Tamil</option>
                                <option value="Kannada">Kannada</option>
                                <option value="Malayalam">Malayalam</option>
                                <option value="Marathi">Marathi</option>
                                <option value="Bengali">Bengali</option>
                                <option value="Punjabi">Punjabi</option>
                              </Select>
                            </div>
                          ) : selectedActionType === "Filter: Gender" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-foreground">Preferred Gender Filter</Label>
                              <Select
                                value={selectedGenderFilter}
                                onChange={e => setSelectedGenderFilter(e.target.value)}
                                className="text-xxs h-8 w-full rounded-lg"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </Select>
                            </div>
                          ) : selectedActionType === "Filter: Age Group" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-foreground">Preferred Age Group Filter</Label>
                              <Select
                                value={selectedAgeFilter}
                                onChange={e => setSelectedAgeFilter(e.target.value)}
                                className="text-xxs h-8 w-full rounded-lg"
                              >
                                <option value="Minor (<18)">Minor (&lt;18)</option>
                                <option value="Adult (18-59)">Adult (18-59)</option>
                                <option value="Senior (60+)">Senior (60+)</option>
                              </Select>
                            </div>
                          ) : selectedActionType === "Filter: WhatsApp Opt-in" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-foreground">WhatsApp Opt-in Status Filter</Label>
                              <Select
                                value={selectedOptInFilter}
                                onChange={e => setSelectedOptInFilter(e.target.value)}
                                className="text-xxs h-8 w-full rounded-lg"
                              >
                                <option value="Opted In">Opted In</option>
                                <option value="Opted Out">Opted Out</option>
                              </Select>
                            </div>
                          ) : selectedActionType === "Filter: Department" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-foreground">Clinical Department Filter</Label>
                              <Select
                                value={selectedDeptFilter}
                                onChange={e => setSelectedDeptFilter(e.target.value)}
                                className="text-xxs h-8 w-full rounded-lg"
                              >
                                <option value="General Medicine">General Medicine</option>
                                <option value="Cardiology">Cardiology</option>
                                <option value="Pediatrics">Pediatrics</option>
                                <option value="Dental">Dental</option>
                                <option value="Orthopedics">Orthopedics</option>
                              </Select>
                            </div>
                          ) : selectedActionType === "Filter: Appointment Type" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-foreground">Appointment Booking Type Filter</Label>
                              <Select
                                value={selectedApptTypeFilter}
                                onChange={e => setSelectedApptTypeFilter(e.target.value)}
                                className="text-xxs h-8 w-full rounded-lg"
                              >
                                <option value="Consultation">Consultation Slot</option>
                                <option value="Follow-up Checkup">Follow-up Checkup</option>
                                <option value="Lab / Diagnostic Test">Lab / Diagnostic Test</option>
                                <option value="Surgery / Procedure">Surgery / Procedure</option>
                              </Select>
                            </div>
                          ) : (selectedActionType === "Send WhatsApp: custom" ||
                            selectedActionType === "Send SMS: custom" ||
                            selectedActionType === "Send Email: custom" ||
                            selectedActionType === "Send WhatsApp Invoice Attachment") ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold text-foreground">
                                  {selectedActionType === "Send WhatsApp Invoice Attachment" ? "Invoice Caption (optional)" : "Message Content"}
                                </Label>
                                <span className="text-[9px] text-muted-foreground font-semibold">Supports tags like &#123;Patient Name&#125;</span>
                              </div>
                              <textarea
                                rows={3}
                                placeholder={
                                  selectedActionType === "Send WhatsApp Invoice Attachment"
                                    ? "Dear {Patient Name}, here is your clinical invoice."
                                    : "Hello {Patient Name}, your appointment is scheduled."
                                }
                                value={customMsgText}
                                onChange={e => setCustomMsgText(e.target.value)}
                                className="w-full rounded-xl border border-input bg-transparent px-3 py-1.5 text-xxs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none font-medium leading-normal border-solid"
                              />

                              {/* Token Chips */}
                              <div className="flex gap-1 flex-wrap text-[9px] text-muted-foreground font-semibold">
                                <span className="font-bold text-foreground/70">Tokens:</span>
                                {["{Patient Name}", "{Doctor}", "{Date}", "{Time}", "{Amount}", "{Invoice No}"].map(t => (
                                  <code
                                    key={t}
                                    className="text-primary bg-primary/5 px-1 rounded cursor-pointer hover:bg-primary/15"
                                    onClick={() => setCustomMsgText(p => p + t)}
                                  >
                                    {t}
                                  </code>
                                ))}
                              </div>

                              {/* Internal translation widget */}
                              <div className="p-2 border border-border/50 rounded-xl bg-violet-500/[0.03] space-y-1.5 border-solid">
                                <div className="flex items-center gap-1 text-[9px] font-bold text-violet-600 dark:text-violet-400">
                                  <Languages className="h-3.5 w-3.5" />
                                  <span>Internal Translation Helper</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <Select
                                    value={translateTargetLang}
                                    onChange={e => setTranslateTargetLang(e.target.value)}
                                    className="text-[9px] h-7 flex-1 rounded-lg"
                                  >
                                    <option value="Telugu">Telugu (తెలుగు)</option>
                                    <option value="Hindi">Hindi (हिन्दी)</option>
                                    <option value="Tamil">Tamil (தமிழ்)</option>
                                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                                    <option value="Malayalam">Malayalam (മലയാളം)</option>
                                    <option value="Marathi">Marathi (मराठी)</option>
                                    <option value="Bengali">Bengali (বাংলা)</option>
                                    <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                                  </Select>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-7 text-[9px] px-2.5 font-bold bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                                    onClick={async () => {
                                      try {
                                        const translated = await translateTextOnline(customMsgText, translateTargetLang);
                                        setCustomMsgText(translated);
                                        triggerNotice(`Translated message text to ${translateTargetLang}.`);
                                      } catch (err) {
                                        triggerNotice("Translation failed.", "error");
                                      }
                                    }}
                                  >
                                    Translate
                                  </Button>
                                </div>
                                <p className="text-[8.5px] text-muted-foreground leading-tight font-medium">
                                  Translate common phrases while keeping dynamic tags intact.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground leading-snug font-medium italic">
                              This step requires no additional configuration parameters and will be run with default settings.
                            </p>
                          )}

                          {/* Append Action Button */}
                          <div className="pt-1.5 border-t border-border/30 border-solid flex justify-end">
                            <Button
                              onClick={handleAddStep}
                              size="sm"
                              className="h-8 cursor-pointer gap-1.5 font-bold bg-primary hover:bg-primary/95 text-primary-foreground px-4 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" /> Append Step
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              {/* Tab Content: Execution History Logs */}
              <TabsContent value="logs" className="space-y-4 focus-visible:outline-hidden">
                <Card className="border border-border/60 shadow-xs">
                  <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between flex-wrap gap-2 border-solid">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-violet-500" /> Execution History Logs
                      </CardTitle>
                      <CardDescription className="text-[9px] font-medium mt-0.5">Audit log listing of real-time automation runs for active workflows.</CardDescription>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearHistory}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 font-bold h-7 text-[10px] cursor-pointer"
                      disabled={runLogs.length === 0}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Clear Logs
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs font-medium">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[9px] border-solid">
                            <th className="p-2.5 pl-4">Timestamp</th>
                            <th className="p-2.5">Workflow Name</th>
                            <th className="p-2.5">Patient Details</th>
                            <th className="p-2.5">Trigger Event</th>
                            <th className="p-2.5">Outcome</th>
                            <th className="p-2.5 pr-4 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {runLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                                No automation run logs found yet. Active workflows generate history on event triggers.
                              </td>
                            </tr>
                          ) : (
                            runLogs.map(log => {
                              const date = new Date(log.timestamp)
                              const formattedTime = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              const isExpanded = expandedLogId === log.id
                              const isSuccess = log.status === 'success'

                              return (
                                <React.Fragment key={log.id}>
                                  <tr className="hover:bg-muted/10 transition-colors">
                                    <td className="p-2.5 pl-4 font-mono text-muted-foreground">{formattedTime}</td>
                                    <td className="p-2.5 font-bold text-foreground">{log.workflowName}</td>
                                    <td className="p-2.5">
                                      <span className="font-bold text-foreground">{log.patientName}</span>
                                      {log.patientId && <span className="block text-[9px] text-muted-foreground font-mono">{log.patientId}</span>}
                                    </td>
                                    <td className="p-2.5">
                                      <Badge variant="outline" className="text-[8px] font-semibold bg-muted px-1.5 py-0">
                                        {log.triggerEvent}
                                      </Badge>
                                    </td>
                                    <td className="p-2.5">
                                      <Badge className={`text-[8px] font-bold ${isSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                                        {log.status.toUpperCase()}
                                      </Badge>
                                    </td>
                                    <td className="p-2.5 pr-4 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                        className="h-6 text-[9px] px-2 font-bold cursor-pointer"
                                      >
                                        {isExpanded ? "Hide" : "Show Steps"}
                                      </Button>
                                    </td>
                                  </tr>

                                  {/* Detailed chronological steps list */}
                                  {isExpanded && (
                                    <tr className="bg-muted/10">
                                      <td colSpan={6} className="p-3 pl-6 pr-6 border-b border-border/40 border-solid">
                                        <div className="space-y-2">
                                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                            Step Execution Path breakdown:
                                          </div>
                                          {log.stepsExecuted.length === 0 ? (
                                            <div className="text-[10px] text-muted-foreground italic pl-3">
                                              No steps executed in this run.
                                            </div>
                                          ) : (
                                            <div className="space-y-1.5 pl-1">
                                              {log.stepsExecuted.map((stepRun, sIdx) => (
                                                <div key={sIdx} className="flex gap-2 text-[10px] leading-relaxed" style={{alignItems: 'center'}}>
                                                  <span className="shrink-0 mt-0.5">
                                                    {stepRun.status === 'success' ? (
                                                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                                                    )}
                                                  </span>
                                                  <div className="flex-1">
                                                    <span className="font-semibold text-foreground font-mono">
                                                      Step {sIdx + 1}: {getStepLabel(stepRun.step)}
                                                    </span>
                                                    {stepRun.details && (
                                                      <span className="block text-muted-foreground text-[9px] font-medium pl-1 mt-0.5">
                                                        ↳ Detail: {stepRun.details}
                                                      </span>
                                                    )}
                                                    {stepRun.error && (
                                                      <span className="block text-rose-500 text-[9px] font-bold pl-1 mt-0.5">
                                                        ⚠️ Error: {stepRun.error}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* ── Create Workflow Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Create New Workflow
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wf-name" className="text-xs">Workflow Name</Label>
              <Input
                id="wf-name"
                placeholder="e.g. Post-Surgery Follow-up Automation"
                value={wfName}
                onChange={e => setWfName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-trig" className="text-xs">Event Trigger</Label>
              <Select id="wf-trig" value={wfTrigger} onChange={e => setWfTrigger(e.target.value)} className="text-xs">
                {TRIGGER_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
              <p className="text-[10px] text-muted-foreground font-medium">
                {TRIGGER_OPTIONS.find(t => t.value === wfTrigger)?.desc}
              </p>
            </div>
            <div className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 font-semibold border-solid">
              ⚠️ New workflows start <strong>Paused</strong>. Activate them after adding steps.
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" className="cursor-pointer font-bold gap-1">
                <Plus className="h-4 w-4" /> Create Workflow
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Rename Dialog ── */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Rename Workflow
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rename-input" className="text-xs">New Name</Label>
              <Input
                id="rename-input"
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                required
                className="text-xs"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setShowRenameDialog(false)}>Cancel</Button>
              <Button type="submit" className="cursor-pointer font-bold">Save Name</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Workflow?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Are you sure you want to permanently delete <strong className="text-foreground">"{deletingWf?.name || selectedWf?.name}"</strong>?</p>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-semibold border-solid">
              🚨 This cannot be undone. All steps and run history will be lost.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => { setShowDeleteDialog(false); setDeletingWf(null) }}>Cancel</Button>
            <Button variant="destructive" className="cursor-pointer font-bold" onClick={handleDelete}>Yes, Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Action Step Dialog ── */}
      <Dialog open={showEditStepDialog} onOpenChange={setShowEditStepDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Action Step
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEditedStep} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Action Type</Label>
              <Select
                value={editingStepActionType}
                onChange={e => {
                  const val = e.target.value;
                  setEditingStepActionType(val);
                  if (val === "Filter: Language") setEditingStepCustomMsg("English");
                  else if (val === "Filter: Gender") setEditingStepCustomMsg("Male");
                  else if (val === "Filter: Age Group") setEditingStepCustomMsg("Adult (18-59)");
                  else if (val === "Filter: WhatsApp Opt-in") setEditingStepCustomMsg("Opted In");
                  else if (val === "Filter: Department") setEditingStepCustomMsg("General Medicine");
                  else if (val === "Filter: Appointment Type") setEditingStepCustomMsg("Consultation");
                  else setEditingStepCustomMsg("");
                }}
                className="text-xs"
              >
                <optgroup label="── WhatsApp ──">
                  <option value="Send Welcome WhatsApp">Send Welcome WhatsApp</option>
                  <option value="Send WhatsApp: custom">Custom WhatsApp Message</option>
                  <option value="Send WhatsApp Notification">WhatsApp Notification</option>
                  <option value="Send WhatsApp Invoice Attachment">Send Invoice via WhatsApp</option>
                  <option value="Send WhatsApp Feedback Request">Feedback Request</option>
                  <option value="Send WhatsApp: Lab Report Request">Request Lab Report</option>
                  <option value="Send WhatsApp: Prescription PDF">Send Prescription</option>
                  <option value="Send WhatsApp: Holiday Greetings">Holiday Greetings</option>
                </optgroup>
                <optgroup label="── SMS ──">
                  <option value="Send Pending Bill SMS">Bill Reminder SMS</option>
                  <option value="Send SMS: custom">Custom SMS Message</option>
                  <option value="Send SMS Appointment Reminder">Appointment Reminder SMS</option>
                </optgroup>
                <optgroup label="── Email ──">
                  <option value="Send Email: custom">Custom Email Message</option>
                  <option value="Send Email: Prescription">Email Prescription</option>
                  <option value="Send Email: Welcome">Email Welcome</option>
                </optgroup>
                <optgroup label="── Flow Control ──">
                  <option value="Wait Delay">Wait / Delay</option>
                </optgroup>
                <optgroup label="── Filters ──">
                  <option value="Filter: Language">Language Filter</option>
                  <option value="Filter: Gender">Gender Filter</option>
                  <option value="Filter: Age Group">Age Group Filter</option>
                  <option value="Filter: WhatsApp Opt-in">Opt-in Filter</option>
                  <option value="Filter: Department">Department Filter</option>
                  <option value="Filter: Appointment Type">Appointment Type Filter</option>
                </optgroup>
                <optgroup label="── Internal ──">
                  <option value="Create Staff Task">Create Follow-up Task</option>
                  <option value="Internal: Update Patient Status = Active">Set Status: Active</option>
                  <option value="Internal: Update Patient Status = Checked In">Set Status: Checked In</option>
                  <option value="Internal: Notify Doctor via Email">Notify Doctor</option>
                  <option value="Internal: Notify Administrator">Notify Admin</option>
                  <option value="Internal: Add Tag = VIP">Add Tag: VIP</option>
                  <option value="Internal: Add Tag = High Risk">Add Tag: High Risk</option>
                  <option value="Internal: Add Tag = Follow-up Required">Add Tag: Follow-up</option>
                  <option value="Internal: Remove Tag">Remove Patient Tag</option>
                  <option value="Internal: Auto-schedule Next Follow-up">Auto-schedule Follow-up</option>
                  <option value="Internal: Block WhatsApp Communication">Block Patient WhatsApp</option>
                  <option value="Internal: Unblock WhatsApp Communication">Unblock Patient WhatsApp</option>
                </optgroup>
              </Select>
            </div>

            {/* Delay picker */}
            {editingStepActionType === "Wait Delay" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number" min={1}
                    value={editingStepDelayValue}
                    onChange={e => setEditingStepDelayValue(parseInt(e.target.value, 10) || 1)}
                    className="w-20 text-xs"
                  />
                  <Select
                    value={editingStepDelayUnit}
                    onChange={e => setEditingStepDelayUnit(e.target.value)}
                    className="text-xs flex-1"
                  >
                    <option value="Seconds">Seconds</option>
                    <option value="Minutes">Minutes</option>
                    <option value="Hours">Hours</option>
                    <option value="Days">Days</option>
                  </Select>
                </div>
              </div>
            )}

            {/* Language filter selector */}
            {editingStepActionType === "Filter: Language" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Language Filter</Label>
                <Select
                  value={editingStepCustomMsg || "English"}
                  onChange={e => setEditingStepCustomMsg(e.target.value)}
                  className="text-xs w-full"
                >
                  <option value="English">English</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Punjabi">Punjabi</option>
                </Select>
              </div>
            )}

            {/* Gender filter selector */}
            {editingStepActionType === "Filter: Gender" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Gender Filter</Label>
                <Select
                  value={editingStepCustomMsg || "Male"}
                  onChange={e => setEditingStepCustomMsg(e.target.value)}
                  className="text-xs w-full"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            )}

            {/* Age Group filter selector */}
            {editingStepActionType === "Filter: Age Group" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Age Group Filter</Label>
                <Select
                  value={editingStepCustomMsg || "Adult (18-59)"}
                  onChange={e => setEditingStepCustomMsg(e.target.value)}
                  className="text-xs w-full"
                >
                  <option value="Minor (<18)">Minor (&lt;18)</option>
                  <option value="Adult (18-59)">Adult (18-59)</option>
                  <option value="Senior (60+)">Senior (60+)</option>
                </Select>
              </div>
            )}

            {/* WhatsApp Opt-in filter selector */}
            {editingStepActionType === "Filter: WhatsApp Opt-in" && (
              <div className="space-y-1.5">
                <Label className="text-xs">WhatsApp Opt-in Filter</Label>
                <Select
                  value={editingStepCustomMsg || "Opted In"}
                  onChange={e => setEditingStepCustomMsg(e.target.value)}
                  className="text-xs w-full"
                >
                  <option value="Opted In">Opted In</option>
                  <option value="Opted Out">Opted Out</option>
                </Select>
              </div>
            )}

            {/* Department filter selector */}
            {editingStepActionType === "Filter: Department" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Clinical Department Filter</Label>
                <Select
                  value={editingStepCustomMsg || "General Medicine"}
                  onChange={e => setEditingStepCustomMsg(e.target.value)}
                  className="text-xs w-full"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dental">Dental</option>
                  <option value="Orthopedics">Orthopedics</option>
                </Select>
              </div>
            )}

            {/* Appointment Type filter selector */}
            {editingStepActionType === "Filter: Appointment Type" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Appointment Booking Type Filter</Label>
                <Select
                  value={editingStepCustomMsg || "Consultation"}
                  onChange={e => setEditingStepCustomMsg(e.target.value)}
                  className="text-xs w-full"
                >
                  <option value="Consultation">Consultation Slot</option>
                  <option value="Follow-up Checkup">Follow-up Checkup</option>
                  <option value="Lab / Diagnostic Test">Lab / Diagnostic Test</option>
                  <option value="Surgery / Procedure">Surgery / Procedure</option>
                </Select>
              </div>
            )}

            {/* Message composer */}
            {(editingStepActionType === "Send WhatsApp: custom" || 
              editingStepActionType === "Send SMS: custom" || 
              editingStepActionType === "Send Email: custom" || 
              editingStepActionType === "Send WhatsApp Invoice Attachment") && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Message Text</Label>
                  <span className="text-[9px] text-muted-foreground font-semibold">Supports tags like &#123;Patient Name&#125;</span>
                </div>
                <Textarea
                  placeholder="Type message text here..."
                  value={editingStepCustomMsg}
                  onChange={e => setEditingStepCustomMsg(e.target.value)}
                  rows={4}
                  className="text-xs"
                />

                {/* Tokens helper */}
                <div className="flex gap-1 flex-wrap text-[9px] text-muted-foreground font-semibold">
                  <span className="font-bold text-foreground/70">Tokens:</span>
                  {["{Patient Name}", "{Doctor}", "{Date}", "{Time}", "{Amount}", "{Invoice No}"].map(t => (
                    <code key={t} className="text-primary bg-primary/5 px-1 rounded cursor-pointer hover:bg-primary/15"
                      onClick={() => setEditingStepCustomMsg(p => p + t)}>{t}</code>
                  ))}
                </div>

                {/* Inline Translation Widget */}
                <div className="p-2 border border-border/60 rounded-xl bg-violet-500/[0.03] space-y-1.5 border-solid">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                    <Languages className="h-3.5 w-3.5" />
                    <span>Internal Translation Helper</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Select
                      value={editingTranslateTargetLang}
                      onChange={e => setEditingTranslateTargetLang(e.target.value)}
                      className="text-[10px] h-7 flex-1"
                    >
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Malayalam">Malayalam (മലയാളം)</option>
                      <option value="Marathi">Marathi (मराठी)</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                      <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-[10px] px-2.5 font-bold cursor-pointer bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={async () => {
                        try {
                          const translated = await translateTextOnline(editingStepCustomMsg, editingTranslateTargetLang);
                          setEditingStepCustomMsg(translated);
                          triggerNotice(`Translated message to ${editingTranslateTargetLang}.`);
                        } catch (err) {
                          triggerNotice("Translation failed.", "error");
                        }
                      }}
                    >
                      Translate
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-tight font-medium">
                    Translates predefined English clinical phrases while keeping tags (e.g. <code>&#123;Patient Name&#125;</code>) intact.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setShowEditStepDialog(false)}>Cancel</Button>
              <Button type="submit" className="cursor-pointer font-bold">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: "none" }}
      />
    </div>
  )
}

// ─── Default Page Wrapper ───

export default function AutomationBuilderPage() {
  return (
    <div className="p-6">
      <WorkflowBuilder embedded={false} />
    </div>
  )
}
