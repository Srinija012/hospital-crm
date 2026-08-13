// src/lib/db.ts
import { 
  db, 
  type Patient, 
  type Doctor, 
  type Appointment, 
  type FollowUp, 
  type Invoice, 
  type AutomationWorkflow, 
  type AuditLogEntry, 
  type AutoReplyRule, 
  type ClinicOrg, 
  type CommunicationLog,
  type PatientVitals,
  type MedicalRecord,
  type Prescription,
  type PatientAddress,
  type TrashedPatient
} from './database';
import { WHATSAPP_API_URL } from './utils';
import { supabase } from './supabase';

export type { 
  Patient, 
  Doctor, 
  Appointment, 
  FollowUp, 
  Invoice, 
  AutomationWorkflow, 
  AuditLogEntry, 
  AutoReplyRule, 
  ClinicOrg, 
  CommunicationLog,
  PatientVitals,
  MedicalRecord,
  Prescription,
  PatientAddress,
  TrashedPatient
};

// Global variables for migration status
let migrationError: string | null = null;

export function getMigrationError(): string | null {
  return migrationError;
}

const INITIAL_DOCTORS: Doctor[] = [
  { id: 'doc-admin', name: 'Dr. Marcus Vance', specialty: 'Clinical Director', department: 'Administration', availability: 'Available', status: 'Available', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120', email: 'm.vance@hospital.com', activePatients: 0, role: 'Administrator', attendanceRate: 100, salary: 12500, salaryStatus: 'Paid' },
  { id: 'doc-1', name: 'Dr. Sarah Connor', specialty: 'Cardiologist', department: 'Cardiology', availability: 'Available', status: 'Available', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120', email: 's.connor@hospital.com', activePatients: 0, role: 'Physician', attendanceRate: 100, salary: 9500, salaryStatus: 'Paid' },
  { id: 'doc-2', name: 'Dr. James Carter', specialty: 'Pediatrician', department: 'Pediatrics', availability: 'Available', status: 'Available', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120', email: 'j.carter@hospital.com', activePatients: 0, role: 'Physician', attendanceRate: 100, salary: 8800, salaryStatus: 'Paid' },
  { id: 'doc-3', name: 'Dr. Evelyn Martinez', specialty: 'Dermatologist', department: 'Dermatology', availability: 'Available', status: 'Available', avatar: 'https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=120', email: 'e.martinez@hospital.com', activePatients: 0, role: 'Physician', attendanceRate: 100, salary: 9000, salaryStatus: 'Paid' },
  { id: 'doc-4', name: 'Dr. Robert Chen', specialty: 'Neurologist', department: 'Neurology', availability: 'Available', status: 'Available', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120', email: 'r.chen@hospital.com', activePatients: 0, role: 'Physician', attendanceRate: 100, salary: 8500, salaryStatus: 'Paid' },
  { id: 'doc-5', name: 'Dr. Amanda Ross', specialty: 'Orthopedic Surgeon', department: 'Orthopedics', availability: 'Available', status: 'Available', avatar: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&q=80&w=120', email: 'a.ross@hospital.com', activePatients: 0, role: 'Physician', attendanceRate: 100, salary: 10000, salaryStatus: 'Paid' },
  { id: 'doc-recep', name: 'Emily Watson', specialty: 'Lead Receptionist', department: 'Front Desk', availability: 'Available', status: 'Available', avatar: 'https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=120', email: 'e.watson@hospital.com', activePatients: 0, role: 'Receptionist', attendanceRate: 100, salary: 4500, salaryStatus: 'Paid' }
];

const INITIAL_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: "wf-1",
    name: "Patient Welcome Journey",
    trigger: "Patient Registered",
    steps: ["Send Welcome WhatsApp", "Wait: 2 Days", "Create Staff Task"],
    status: "Active",
    runCount: 0
  },
  {
    id: "wf-2",
    name: "Appointment Confirmation Message",
    trigger: "Appointment Confirmed",
    steps: ["Send Welcome WhatsApp"],
    status: "Active",
    runCount: 0
  },
  {
    id: "wf-3",
    name: "Overdue Follow-up Task",
    trigger: "Follow-up Overdue",
    steps: ["Create Staff Task"],
    status: "Active",
    runCount: 0
  },
  {
    id: "wf-4",
    name: "Multi-Day Patient Follow-up",
    trigger: "Patient Registered",
    steps: [
      "Wait: 1 Days",
      "Send WhatsApp: Hello {Patient Name}, this is a 1-day follow-up to see if you have any questions.",
      "Wait: 1 Days",
      "Send WhatsApp: Hello {Patient Name}, this is a 2-day follow-up. We hope you are doing well!",
      "Create Staff Task"
    ],
    status: "Active",
    runCount: 0
  }
];

const INITIAL_AUTO_REPLIES: AutoReplyRule[] = [
  { id: "ar-1", keyword: "timing", replyText: "Our clinic is open Monday to Friday, 8:00 AM to 6:00 PM. Weekend consults require prior bookings.", isActive: true },
  { id: "ar-2", keyword: "address", replyText: "We are located at 100 Healthcare Parkway, Medical District. Free parking is available.", isActive: true },
  { id: "ar-3", keyword: "help", replyText: "Hello! Type 'timing' for hours, 'address' for location, or wait for an operator to respond.", isActive: true }
];

export const TRANSLATED_WELCOME: Record<string, string> = {
  English: "Hello {Patient Name}, thank you for registering with our clinic. We are happy to assist you.",
  Telugu: "హలో {Patient Name}, మా క్లినిక్‌లో నమోదు చేసుకున్నందుకు ధన్యవాదాలు. మీకు సహాయం చేయడానికి మేము సంతోషిస్తున్నాము.",
  Hindi: "नमस्ते {Patient Name}, हमारे क्लिनिक में पंजीकरण करने के लिए धन्यवाद। हम आपकी सहायता करने के लिए खुश हैं।",
  Tamil: "வணக்கம் {Patient Name}, எங்கள் மருத்துவமனையில் பதிவு செய்ததற்கு நன்றி. உங்களுக்கு உதவ நாங்கள் மகிழ்ச்சியடைகிறோம்.",
  Kannada: "ನಮಸ್ಕಾರ {Patient Name}, ನಮ್ಮ ಕ್ಲಿನಿಕ್‌ನಲ್ಲಿ ನೋಂದಾಯಿಸಿಕೊಂಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾವು ಸಂತೋಷಪಡುತ್ತೇವೆ.",
  Malayalam: "ഹലോ {Patient Name}, ഞങ്ങളുടെ ക്ലിനിക്കിൽ രജിസ്റ്റർ ചെയ്തതിന് നന്ദി. നിങ്ങളെ സഹായിക്കുന്നതിൽ ഞങ്ങൾക്ക് സന്തോഷമുണ്ട്.",
  Marathi: "नमस्कार {Patient Name}, आमच्या क्लिनिकमध्ये नोंदणी केल्याबद्दल धन्यवाद. आपल्याला मदत करण्यात आम्हाला आनंद आहे.",
  Bengali: "হ্যালো {Patient Name}, আমাদের ক্লিনিকে নিবন্ধন করার জন্য আপনাকে ধন্যবাদ। আমরা আপনাকে সাহায্য করতে পেরে আনন্দিত।",
  Punjabi: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {Patient Name}, ਸਾਡੇ ਕਲੀਨ建立 ਰਜਿਸਟਰ ਕਰਨ ਲਈ ਤੁਹਾਡਾ ਧੰਨਵਾਦ। ਸਾਡੇ ਕਲੀਨਿਕ ਵਿੱਚ ਰਜਿਸਟਰ ਕਰਨ ਲਈ ਤੁਹਾਡਾ ਧੰਨਵਾਦ।"
};

export const MULTILINGUAL_TEMPLATES: Record<string, Record<string, string>> = {
  welcome: {
    English:   "Hello {Patient Name}, thank you for registering with our clinic. We look forward to caring for you.",
    Telugu:    "హలో {Patient Name}, మా క్లినిక్‌లో నమోదు చేసుకున్నందుకు ధన్యవాదాలు. మీ సంరక్షణకు మేము సిద్ధంగా ఉన్నాము.",
    Hindi:     "नमस्ते {Patient Name}, हमारे क्लिनिक में पंजीकरण करने के लिए धन्यवाद। हम आपकी देखभाल करने के लिए तत्पर हैं।",
    Tamil:     "வணக்கம் {Patient Name}, எங்கள் மருத்துவமனையில் பதிவு செய்ததற்கு நன்றி. உங்கள் சேவையில் நாங்கள் மகிழ்ச்சியடைகிறோம்.",
    Kannada:   "ನಮಸ್ಕಾರ {Patient Name}, ನಮ್ಮ ಕ್ಲಿನಿಕ್‌ನಲ್ಲಿ ನೋಂದಾಯಿಸಿಕೊಂಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಆರೋಗ್ಯ ಸೇವೆಗೆเรา ಸಿದ್ಧರಿದ್ದೇವೆ.",
    Malayalam: "ഹലോ {Patient Name}, ഞങ്ങളുടെ ക്ലിനിക്കിൽ രജിസ്റ്റർ ചെയ്തതിന് നന്ദി. നിങ്ങളെ പരിചരിക്കാൻ ഞങ്ങൾ സന്തുഷ്ടരാണ്.",
    Marathi:   "नमस्कार {Patient Name}, आमच्या क्लिनिकमध्ये नोंदणी केल्याबद्दल धन्यवाद. आपली काळजी घेण्यास आम्ही तयार आहोत.",
    Bengali:   "হ্যালো {Patient Name}, আমাদের ক্লিনিকে নিবন্ধন করার জন্য আপনাকে ধন্যবাদ। আপনার সেবায় আমরা প্রস্তুত।",
    Punjabi:   "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {Patient Name}, ਸਾਡੇ ਕਲੀਨਿਕ ਵਿੱਚ ਰਜਿਸਟਰ ਕਰਨ ਲਈ ਤੁਹਾਡਾ ਧੰਨਵਾਦ। ਤੁਹਾਡੀ ਦੇਖਭਾਲ ਕਰਨ ਲਈ ਅਸੀਂ ਤਿਆਰ ਹਾਂ।"
  },
  apt_reminder: {
    English:   "Dear {Patient Name}, this is a reminder for your appointment on {Date} at {Time} with {Doctor}. Please arrive 10 minutes early.",
    Telugu:    "ప్రియమైన {Patient Name}, {Date} న {Time} కి {Doctor} తో మీ అపాయింట్‌మెంట్ రిమైండర్. దయచేసి 10 నిమిషాల ముందు రండి.",
    Hindi:     "प्रिय {Patient Name}, {Date} को {Time} बजे {Doctor} के साथ आपके अपॉइंटमेंट का अनुस्मारक। कृपया 10 मिनट पहले पहुंचें।",
    Tamil:     "அன்புள்ள {Patient Name}, {Date} அன்று {Time} மணிக்கு {Doctor} உடனான உங்கள் சந்திப்பு நினைவூட்டல். 10 நிமிடம் முன்னதாக வருக.",
    Kannada:   "ಪ್ರಿಯ {Patient Name}, {Date} ರಂದು {Time} ಗೆ {Doctor} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ರಿಮೈಂಡర్. 10 ನಿಮಿಷ ಮೊದಲು ಬನ್ನಿ.",
    Malayalam: "പ്രിയ {Patient Name}, {Date}-ൽ {Time}-ന് {Doctor}-യുമായുള്ള അപ്പോയ്ന്റ്മെന്റ് ഓർമ്മപ്പെടുത്തൽ. 10 മിനിറ്റ് മുമ്പ് എത്തുക.",
    Marathi:   "प्रिय {Patient Name}, {Date} रोजी {Time} वाजता {Doctor} यांच्यासोबत तुमच्या अपॉइंटमेंटची आठवण. 10 मिनिटे आधी या.",
    Bengali:   "প্রিয় {Patient Name}, {Date} তারিখে {Time}-এ {Doctor} এর সাথে আপনার অ্যাপয়েন্টমেন্টের অনুস্মারক। ১০ মিনিট আগে আসুন।",
    Punjabi:   "ਪਿਆਰੇ {Patient Name}, {Date} ਨੂੰ {Time} ਵਜੇ {Doctor} ਨਾਲ ਤੁਹਾਡੀ ਅਪੌਇੰਟਮੈਂਟ ਦੀ ਯਾਦ। 10 ਮਿਨਟ ਪਹਿਲਾਂ ਪਹੁੰਚੋ।"
  },
  follow_up_reminder: {
    English:   "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}. Please confirm your attendance.",
    Telugu:    "ప్రియమైన {Patient Name}, {Date} న {Doctor} తో మీ ఫాలో-అప్ విజిట్ గుర్తుచేపు. హాజరు నిర్ధారించండి.",
    Hindi:     "प्रिय {Patient Name}, {Date} को {Doctor} के साथ आपके फॉलो-अप विजिट का अनुस्मारक। कृपया उपस्थिति की पुष्टि करें।",
    Tamil:     "அன்புள்ள {Patient Name}, {Date} அன்று {Doctor} உடனான உங்கள் ஃபாலோ-அப் வருகை நினைவூட்டல். வருகையை உறுதிப்படுத்தவும்.",
    Kannada:   "ಪ್ರಿಯ {Patient Name}, {Date} ರಂದು {Doctor} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಫಾಲೋ-ಅಪ್ ಭೇಟಿಯ ನೆನಪೋಲೆ. ದಯವಿಟ್ಟು ಖಚಿತಪಡಿಸಿ.",
    Malayalam: "പ്രിയ {Patient Name}, {Date}-ൽ {Doctor}-യുമായുള്ള ഫോളോ-അപ്പ് സന്ദർശനം ഓർമ്മപ്പെടുത്തൽ. ദയവായി സ്ഥിരീകരിക്കുക.",
    Marathi:   "प्रिय {Patient Name}, {Date} रोजी {Doctor} यांच्यासोबत फॉलो-अप भेटीसाठी आठवण. उपस्थिती निश्चित करा.",
    Bengali:   "প্রিয় {Patient Name}, {Date} তারিখে {Doctor} এর সাথে আপনার ফলো-আপ ভিজিটের অনুস্মারক। উপস্থিতি নিশ্চিত করুন।",
    Punjabi:   "ਪਿਆਰੇ {Patient Name}, {Date} ਨੂੰ {Doctor} ਨਾਲ ਫਾਲੋ-ਅੱਪ ਮੁਲਾਕਾਤ ਦੀ ਯਾਦ। ਹਾਜ਼ਰੀ ਪੱਕੀ ਕਰੋ।"
  },
  bill_pending: {
    English: "Dear {Patient Name}, an invoice of {Amount} is pending for payment. Please settle at your earliest convenience.",
    Telugu: "ప్రియమైన {Patient Name}, మీ {Amount} బిల్లు బకాయి ఉంది. దయచేసి వీలైనంత త్వరగా చెల్లించండి.",
    Hindi: "प्रिय {Patient Name}, आपके {Amount} का चालान भुगतान के लिए लंबित है। कृपया जल्द से जल्द भुगतान करें।",
    Tamil: "அன்புள்ள {Patient Name}, உங்கள் {Amount} கட்டணம் நிலుவையில் உள்ளது. தயவுசெய்து விரைவில் செலுத்தவும்.",
    Kannada: "ಪ್ರிய {Patient Name}, {Amount} ಬಿಲ್ ಬಾಕಿ ಉಳಿದಿದೆ. దయవిట్టు బేగనే పಾವతಿಸಿ.",
    Malayalam: "പ്രിയ {Patient Name}, നിങ്ങളുടെ {Amount} ബിൽ കുടിശ്ശികയാണ്. ദയവായി വേഗത്തിൽ അടയ്ക്കുക."
  },
  invoice_attached: {
    English: "Dear {Patient Name}, please find attached your clinical invoice {Invoice No} for {Amount}. Please settle the bill at your convenience.",
    Telugu: "ప్రియమైన {Patient Name}, దయచేసి మీ క్లినికల్ ఇన్వాయిస్ {Invoice No} మరియు {Amount} బిల్లు బకాయిని ఇక్కడ కనుగొనండి.",
    Hindi: "प्रिय {Patient Name}, कृपया अपना क्लिनिकल चालान {Invoice No} और {Amount} का विवरण संलग्न पाएं।",
    Tamil: "அன்புள்ள {Patient Name}, உங்கள் {Amount} கட்டணம் மற்றும் {Invoice No} விவரங்களை இணைப்பில் காணவும்.",
    Kannada: "ಪ್ರಿಯ {Patient Name}, దయవిట్టు నిమ్మ క్లినికల్ ఇన్‌వాయ్స్ {Invoice No} మత్తు {Amount} బిల్ వివరగళన్ను ఇల్లి నోడి.",
    Malayalam: "പ്രിയ {Patient Name}, ദയവായി നിങ്ങളുടെ ക്ലിനിക്കിൽ ഇൻവോയ്സ് {Invoice No}, തുക {Amount} എന്നിവ ഇതിനോടൊപ്പം കാണുക."
  }
};

const DEFAULT_TEMPLATES = MULTILINGUAL_TEMPLATES;

// Helper to fetch/set simple appSettings
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const record = await db.appSettings.get(key);
  if (!record) {
    await db.appSettings.put({ key, value: defaultValue });
    return defaultValue;
  }
  return record.value as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.appSettings.put({ key, value });
}

// Background Capping Tasks
function capAuditLogsInBackground() {
  setTimeout(async () => {
    try {
      const count = await db.auditLogs.count();
      if (count > 10000) {
        const overflow = count - 10000;
        const oldestKeys = await db.auditLogs.orderBy('id').limit(overflow).primaryKeys();
        await db.auditLogs.bulkDelete(oldestKeys);
      }
    } catch (err) {
      console.warn("Background audit log capping failed:", err);
    }
  }, 100);
}

function capCommunicationsInBackground(patientId: string) {
  setTimeout(async () => {
    try {
      const count = await db.communications.where('patientId').equals(patientId).count();
      if (count > 5000) {
        const overflow = count - 5000;
        const comms = await db.communications.where('patientId').equals(patientId).toArray();
        if (comms.length > 5000) {
          // Sort lexicographically by id (effectively sorting by timestamp/creation order)
          comms.sort((a, b) => a.id.localeCompare(b.id));
          const oldestKeys = comms.slice(0, comms.length - 5000).map(c => c.id);
          await db.communications.bulkDelete(oldestKeys);
        }
      }
    } catch (err) {
      console.warn("Background communications capping failed:", err);
    }
  }, 100);
}

// First Boot Migration Logic
async function runMigration() {
  if (typeof window === 'undefined') return;

  // Enforce Clean Migration v4 check as per original design before running Dexie migration
  if (!localStorage.getItem("h_clean_migration_v4")) {
    localStorage.removeItem("h_patients_up");
    localStorage.removeItem("h_appointments_up");
    localStorage.removeItem("h_followups_up");
    localStorage.removeItem("h_invoices_up");
    localStorage.removeItem("h_workflows_up");
    localStorage.removeItem("h_auditlogs_up");
    localStorage.setItem("h_clean_migration_v4", "true");
  }

  try {
    const isComplete = await db.appSettings.get('migrationComplete');
    if (isComplete && isComplete.value === 'true') {
      return;
    }

    const patientsKey = 'h_patients_up';
    const doctorsKey = 'h_doctors_up';
    const appointmentsKey = 'h_appointments_up';
    const followupsKey = 'h_followups_up';
    const invoicesKey = 'h_invoices_up';
    const workflowsKey = 'h_workflows_up';
    const auditlogsKey = 'h_auditlogs_up';
    const autorepliesKey = 'h_autoreplies_up';
    const clinicsKey = 'h_clinics_up';

    const hasData = localStorage.getItem(patientsKey) || localStorage.getItem(doctorsKey) || localStorage.getItem(invoicesKey);
    if (!hasData) {
      await db.appSettings.put({ key: 'migrationComplete', value: 'true' });
      return;
    }

    console.log('Starting one-time migration from localStorage to Dexie (IndexedDB)...');

    const patientsRaw = localStorage.getItem(patientsKey);
    const doctorsRaw = localStorage.getItem(doctorsKey);
    const appointmentsRaw = localStorage.getItem(appointmentsKey);
    const followupsRaw = localStorage.getItem(followupsKey);
    const invoicesRaw = localStorage.getItem(invoicesKey);
    const workflowsRaw = localStorage.getItem(workflowsKey);
    const auditlogsRaw = localStorage.getItem(auditlogsKey);
    const autorepliesRaw = localStorage.getItem(autorepliesKey);
    const clinicsRaw = localStorage.getItem(clinicsKey);

    const patients: Patient[] = patientsRaw ? JSON.parse(patientsRaw) : [];
    const doctors: Doctor[] = doctorsRaw ? JSON.parse(doctorsRaw) : INITIAL_DOCTORS;
    const appointments: Appointment[] = appointmentsRaw ? JSON.parse(appointmentsRaw) : [];
    const followups: FollowUp[] = followupsRaw ? JSON.parse(followupsRaw) : [];
    const invoices: Invoice[] = invoicesRaw ? JSON.parse(invoicesRaw) : [];
    const workflows: AutomationWorkflow[] = workflowsRaw ? JSON.parse(workflowsRaw) : INITIAL_WORKFLOWS;
    const auditLogs: AuditLogEntry[] = auditlogsRaw ? JSON.parse(auditlogsRaw) : [];
    const autoreplyRules: AutoReplyRule[] = autorepliesRaw ? JSON.parse(autorepliesRaw) : INITIAL_AUTO_REPLIES;
    const clinics: ClinicOrg[] = clinicsRaw ? JSON.parse(clinicsRaw) : [];

    await db.transaction('rw', [db.patients, db.doctors, db.invoices, db.auditLogs, db.communications, db.appSettings], async () => {
      const allComms: CommunicationLog[] = [];
      const patientsToInsert = patients.map(p => {
        const { communications, ...rest } = p;
        if (communications && Array.isArray(communications)) {
          communications.forEach(c => {
            allComms.push({
              ...c,
              patientId: p.id,
              channel: c.type || 'whatsapp'
            });
          });
        }
        return {
          ...rest,
          communications: [] 
        } as Patient;
      });

      if (patientsToInsert.length > 0) {
        await db.patients.bulkPut(patientsToInsert);
      }
      if (allComms.length > 0) {
        await db.communications.bulkPut(allComms);
      }
      if (doctors.length > 0) {
        await db.doctors.bulkPut(doctors.map(d => ({ ...d, status: d.availability })));
      }
      if (invoices.length > 0) {
        await db.invoices.bulkPut(invoices.map(i => ({ ...i, patientId: i.patientId || '' })));
      }
      if (auditLogs.length > 0) {
        await db.auditLogs.bulkPut(auditLogs.map(l => ({ ...l, actorRole: l.staffRole, entityType: 'patient' })));
      }

      await db.appSettings.put({ key: 'h_appointments_up', value: appointments });
      await db.appSettings.put({ key: 'h_followups_up', value: followups });
      await db.appSettings.put({ key: 'h_workflows_up', value: workflows });
      await db.appSettings.put({ key: 'h_autoreplies_up', value: autoreplyRules });
      await db.appSettings.put({ key: 'h_clinics_up', value: clinics });

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('h_wa_template_')) {
          const val = localStorage.getItem(key);
          if (val) {
            await db.appSettings.put({ key, value: val });
          }
        }
      }

      await db.appSettings.put({ key: 'migrationComplete', value: 'true' });
    });

    console.log('Migration completed successfully. Clearing localStorage.');

    localStorage.removeItem(patientsKey);
    localStorage.removeItem(doctorsKey);
    localStorage.removeItem(appointmentsKey);
    localStorage.removeItem(followupsKey);
    localStorage.removeItem(invoicesKey);
    localStorage.removeItem(workflowsKey);
    localStorage.removeItem(auditlogsKey);
    localStorage.removeItem(autorepliesKey);
    localStorage.removeItem(clinicsKey);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('h_wa_template_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (error: any) {
    console.error('Migration failed:', error);
    migrationError = error?.message || String(error);
  }
}

async function cleanupDuplicateWorkflows() {
  if (typeof window === 'undefined') return;
  try {
    const workflows = await getSetting<AutomationWorkflow[]>('h_workflows_up', INITIAL_WORKFLOWS);
    const activeRegWfs = workflows.filter(w => w.status === 'Active' && w.trigger === 'Patient Registered');
    if (activeRegWfs.length > 1) {
      console.log(`[Workflow Cleanup] Found ${activeRegWfs.length} active Patient Registered workflows. Pausing duplicates...`);
      let keptOne = false;
      const updatedWorkflows = workflows.map(w => {
        if (w.status === 'Active' && w.trigger === 'Patient Registered') {
          if (!keptOne) {
            keptOne = true;
            return w;
          } else {
            return { ...w, status: 'Paused' as const };
          }
        }
        return w;
      });
      await setSetting('h_workflows_up', updatedWorkflows);
    }
  } catch (err) {
    console.warn("Failed to run workflow cleanup:", err);
  }
}

// Run non-blocking migration
runMigration();
cleanupDuplicateWorkflows();

// Role Helper Function
export function getActiveRole(): string {
  if (typeof window === 'undefined') return 'System';
  const stored = localStorage.getItem("active_user_session");
  if (!stored) return 'Anonymous';
  try {
    const session = JSON.parse(stored);
    return session.role || 'Anonymous';
  } catch {
    return 'Anonymous';
  }
}

// Enforce Database Authorization
export function dbEnforceRole(allowedRoles: string[]) {
  const role = getActiveRole();
  if (role === 'Super Admin') return; 
  if (!allowedRoles.includes(role)) {
    throw new Error(`Access Denied: Role '${role}' is not authorized to perform this operation.`);
  }
}

export async function dbClearAllData(): Promise<void> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.transaction('rw', [db.patients, db.invoices, db.communications, db.auditLogs, db.trashedPatients, db.appSettings], async () => {
    await db.patients.clear();
    await db.invoices.clear();
    await db.communications.clear();
    await db.auditLogs.clear();
    await db.trashedPatients.clear();
    await db.appSettings.put({ key: 'h_appointments_up', value: [] });
    await db.appSettings.put({ key: 'h_followups_up', value: [] });
  });
}


// ─── DOCTORS ───
export async function dbGetDoctors(): Promise<Doctor[]> {
  const doctors = await db.doctors.toArray();
  if (doctors.length === 0) {
    await db.doctors.bulkPut(INITIAL_DOCTORS.map(d => ({ ...d, status: d.availability })));
    return dbGetDoctors();
  }
  const role = getActiveRole();
  if (role === 'Patient') {
    return doctors.map((d: Doctor) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      department: d.department,
      availability: d.availability,
      status: d.status,
      avatar: d.avatar,
      email: '',
      activePatients: 0,
      role: 'Physician',
      attendanceRate: 0,
      salary: 0,
      salaryStatus: 'Paid'
    }));
  }
  return doctors;
}

export async function dbSaveDoctorAvailability(doctorId: string, availability: Doctor['availability']): Promise<Doctor[]> {
  const role = getActiveRole();
  if (role === 'Doctor') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const docName = session ? JSON.parse(session).name : "";
    const doctors = await db.doctors.toArray();
    const docMatch = doctors.find(d => d.id === doctorId);
    if (docMatch && docMatch.name !== docName) {
      throw new Error("Access Denied: Doctors can only modify their own availability.");
    }
  } else {
    dbEnforceRole(['Clinic Admin', 'Super Admin']);
  }
  await db.doctors.update(doctorId, { availability, status: availability });
  return dbGetDoctors();
}

export async function dbSaveDoctorAttendance(doctorId: string, attendanceRate: number): Promise<Doctor[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.doctors.update(doctorId, { attendanceRate });
  return dbGetDoctors();
}

export async function dbPayDoctorSalary(doctorId: string): Promise<Doctor[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.doctors.update(doctorId, { salaryStatus: 'Paid' });
  return dbGetDoctors();
}

export async function dbUnpayDoctorSalary(doctorId: string): Promise<Doctor[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.doctors.update(doctorId, { salaryStatus: 'Unpaid' });
  return dbGetDoctors();
}
export async function dbSaveDoctor(doc: Omit<Doctor, 'id' | 'status'> & { id?: string; status?: Doctor['status'] }): Promise<Doctor> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const id = doc.id || `doc-${Date.now()}`;
  const newDoc: Doctor = {
    ...doc,
    id,
    activePatients: doc.activePatients || 0,
    attendanceRate: doc.attendanceRate || 100,
    salaryStatus: doc.salaryStatus || 'Unpaid',
    status: doc.availability
  } as Doctor;
  await db.doctors.put(newDoc);

  (async () => {
    try {
      await supabase.from('doctors').upsert([{
        id: newDoc.id,
        name: newDoc.name,
        specialty: newDoc.specialty,
        department: newDoc.department,
        availability: newDoc.availability,
        avatar: newDoc.avatar,
        email: newDoc.email,
        active_patients: newDoc.activePatients,
        role: newDoc.role,
        attendance_rate: newDoc.attendanceRate,
        salary: newDoc.salary,
        salary_status: newDoc.salaryStatus,
        status: newDoc.status
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Doctor Warning]', err?.message || err);
    }
  })();

  return newDoc;
}

export async function dbDeleteDoctor(id: string): Promise<Doctor[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.doctors.delete(id);
  (async () => {
    try {
      await supabase.from('doctors').delete().eq('id', id);
    } catch (err: any) {}
  })();
  return dbGetDoctors();
}

// ─── PATIENTS ───
export async function dbGetPatients(): Promise<Patient[]> {
  const patients = await db.patients.toArray();
  const role = getActiveRole();
  const showArchived = role === 'Clinic Admin' || role === 'Super Admin';
  let list = showArchived ? patients : patients.filter((p: Patient) => !p.archived);

  if (role === 'Patient') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const patientId = session ? JSON.parse(session).username : "";
    list = list.filter((p: Patient) => p.id === patientId);
  }
  
  if (role === 'Doctor') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const docName = session ? JSON.parse(session).name : "";
    const doctors = await dbGetDoctors();
    const docMatch = doctors.find(d => d.name === docName);
    const docId = docMatch ? docMatch.id : "";
    list = list.filter((p: Patient) => p.doctorAssignedId === docId || p.doctorAssignedName === docName);
  }

  // Populate communications for each patient from IndexedDB table in parallel
  await Promise.all(
    list.map(async (patient) => {
      try {
        const comms = await db.communications.where('patientId').equals(patient.id).toArray();
        comms.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        patient.communications = comms;
      } catch (err) {
        console.warn(`Failed to fetch communications for patient ${patient.id}:`, err);
        patient.communications = [];
      }
    })
  );

  return list;
}

export async function dbSavePatient(patient: Omit<Patient, 'id'> & { id?: string }): Promise<Patient> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor', 'Patient']);
  const role = getActiveRole();
  
  if (role === 'Patient' && patient.id) {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const patientId = session ? JSON.parse(session).username : "";
    if (patient.id !== patientId) {
      throw new Error("Access Denied: Patients can only edit their own profile details.");
    }
  }
  
  if (role === 'Doctor' && patient.id) {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const docName = session ? JSON.parse(session).name : "";
    const doctors = await db.doctors.toArray();
    const docMatch = doctors.find(d => d.name === docName);
    const docId = docMatch ? docMatch.id : "";
    const patients = await db.patients.toArray();
    const currentPatient = patients.find(p => p.id === patient.id);
    if (currentPatient && currentPatient.doctorAssignedId !== docId && currentPatient.doctorAssignedName !== docName) {
      throw new Error("Access Denied: Doctors can only modify details for patients assigned to them.");
    }
  }

  const isNew = !patient.id;
  const patientsCount = await db.patients.count();
  const id = patient.id || `pat-${patientsCount + 1}`;
  
  let docName = "Unassigned Staff";
  if (patient.doctorAssignedId) {
    const docs = await dbGetDoctors();
    const docMatch = docs.find(d => d.id === patient.doctorAssignedId);
    if (docMatch) docName = docMatch.name;
  }

  const newPatient: Patient = {
    ...patient,
    id,
    dob: patient.dob || '1990-01-01',
    alternatePhone: patient.alternatePhone || '',
    addressInfo: patient.addressInfo || { address: '', city: '', state: '', country: '', pincode: '' },
    bloodGroup: patient.bloodGroup || 'A+',
    existingConditions: patient.existingConditions || '',
    allergies: patient.allergies || '',
    doctorAssignedId: patient.doctorAssignedId || '',
    doctorAssignedName: docName,
    preferredLanguage: patient.preferredLanguage || 'English',
    preferredContactMethod: patient.preferredContactMethod || 'WhatsApp',
    whatsappOptIn: patient.whatsappOptIn !== undefined ? patient.whatsappOptIn : true,
    lastVisit: patient.lastVisit || new Date().toISOString().split("T")[0],
    vitals: patient.vitals || [],
    medicalHistory: patient.medicalHistory || [],
    prescriptions: patient.prescriptions || [],
    communications: [], 
    enableAutomatedFollowUp: patient.enableAutomatedFollowUp !== undefined ? patient.enableAutomatedFollowUp : true,
    customFollowUpDays: patient.customFollowUpDays !== undefined ? patient.customFollowUpDays : 14,
    customFollowUpMessage: patient.customFollowUpMessage || '',
    archived: patient.archived || false,
    createdAt: patient.createdAt || new Date().toISOString()
  } as Patient;

  await db.patients.put(newPatient);

  // Synchronize registered patient automatically to Supabase Cloud DB
  (async () => {
    try {
      const { error } = await supabase.from('patients').upsert([{
        id: newPatient.id,
        name: newPatient.name,
        age: newPatient.age,
        gender: newPatient.gender,
        dob: newPatient.dob,
        phone: newPatient.phone,
        alternate_phone: newPatient.alternatePhone,
        email: newPatient.email,
        address_info: newPatient.addressInfo,
        blood_group: newPatient.bloodGroup,
        existing_conditions: newPatient.existingConditions,
        allergies: newPatient.allergies,
        doctor_assigned_id: newPatient.doctorAssignedId,
        doctor_assigned_name: newPatient.doctorAssignedName,
        preferred_language: newPatient.preferredLanguage,
        preferred_contact_method: newPatient.preferredContactMethod,
        whatsapp_opt_in: newPatient.whatsappOptIn,
        last_visit: newPatient.lastVisit,
        vitals: newPatient.vitals,
        medical_history: newPatient.medicalHistory,
        prescriptions: newPatient.prescriptions,
        enable_automated_follow_up: newPatient.enableAutomatedFollowUp,
        custom_follow_up_days: newPatient.customFollowUpDays,
        custom_follow_up_message: newPatient.customFollowUpMessage,
        archived: newPatient.archived,
        created_at: newPatient.createdAt
      }]);
      if (error) {
        console.warn('[Supabase Sync Warning]', error.message);
      } else {
        console.log(`[Supabase Sync Success] Patient ${newPatient.name} (${newPatient.id}) synced to Supabase.`);
      }
    } catch (err: any) {
      console.warn('[Supabase Sync Exception]', err?.message || err);
    }
  })();

  // NOTE: Welcome WhatsApp is sent exclusively by the "Patient Welcome Journey" workflow
  // triggered below via dbTriggerWorkflow("Patient Registered"). Do NOT add a direct
  // send here — it would result in a double message every time a patient is registered.

  if (isNew && newPatient.enableAutomatedFollowUp) {
    const days = newPatient.customFollowUpDays || 14;
    const followUpDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await dbSaveFollowUp({
      patientId: id,
      patientName: newPatient.name,
      age: newPatient.age,
      phone: newPatient.phone,
      lastVisitDate: newPatient.lastVisit,
      followUpDate,
      doctorId: newPatient.doctorAssignedId || 'doc-1',
      doctorName: newPatient.doctorAssignedName || 'Dr. Sarah Connor',
      status: 'Pending',
      customMessage: newPatient.customFollowUpMessage || ''
    });
  }

  if (isNew) {
    await dbTriggerWorkflow("Patient Registered", { patient: newPatient });
  }

  // Populate communications back on returning patient record
  const finalComms = await db.communications.where('patientId').equals(id).toArray();
  newPatient.communications = finalComms;

  return newPatient;
}

export async function dbArchivePatient(id: string): Promise<Patient[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.patients.update(id, { archived: true });
  return dbGetPatients();
}

export async function dbRestorePatient(id: string): Promise<Patient[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.patients.update(id, { archived: false });
  return dbGetPatients();
}

// ─── TRASH BIN (Soft Delete with 30-day expiry) ───
const TRASH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export async function dbPurgeExpiredTrashedPatients(): Promise<void> {
  try {
    const allTrashed = await db.trashedPatients.toArray();
    const now = Date.now();
    const expiredIds = allTrashed
      .filter(p => now - new Date(p.deletedAt).getTime() > TRASH_EXPIRY_MS)
      .map(p => p.trashedId!)
      .filter(Boolean);
    if (expiredIds.length > 0) {
      await db.trashedPatients.bulkDelete(expiredIds);
    }
  } catch (err) {
    console.warn('Failed to purge expired trashed patients:', err);
  }
}

export async function dbGetTrashedPatients(): Promise<TrashedPatient[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await dbPurgeExpiredTrashedPatients();
  return db.trashedPatients.toArray();
}

export async function dbMovePatientToTrash(patientId: string): Promise<void> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  const session = typeof window !== 'undefined' ? localStorage.getItem('active_user_session') : null;
  const actorName = session ? JSON.parse(session).name : 'Unknown';

  const trashedRecord: TrashedPatient = {
    ...patient,
    deletedAt: new Date().toISOString(),
    deletedBy: actorName,
  };

  await db.transaction('rw', [db.patients, db.trashedPatients], async () => {
    await db.trashedPatients.add(trashedRecord);
    await db.patients.delete(patientId);
  });

  (async () => {
    try {
      // Remove from main patients table in Supabase
      await supabase.from('patients').delete().eq('id', patientId);
      // Upsert into trashed_patients table in Supabase
      await supabase.from('trashed_patients').upsert([{
        trashed_id: String(trashedRecord.trashedId || patientId),
        id: patientId,
        name: patient.name,
        phone: patient.phone,
        deleted_at: trashedRecord.deletedAt,
        deleted_by: actorName,
        patient_data: patient
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Trash Warning]', err?.message || err);
    }
  })();
}

export async function dbRestorePatientFromTrash(trashedId: string): Promise<void> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const trashed = await db.trashedPatients.get(trashedId);
  if (!trashed) throw new Error(`Trashed record ${trashedId} not found`);

  const { deletedAt, deletedBy, trashedId: _tid, ...patientData } = trashed as any;
  const restoredPatient: Patient = { ...patientData, archived: false };

  await db.transaction('rw', [db.patients, db.trashedPatients], async () => {
    await db.patients.put(restoredPatient);
    await db.trashedPatients.delete(trashedId);
  });

  (async () => {
    try {
      // Delete from trashed_patients table in Supabase
      await supabase.from('trashed_patients').delete().eq('trashed_id', String(trashedId));
      await supabase.from('trashed_patients').delete().eq('id', String(restoredPatient.id));
      // Re-insert into main patients table in Supabase
      await supabase.from('patients').upsert([{
        id: restoredPatient.id,
        name: restoredPatient.name,
        age: restoredPatient.age,
        gender: restoredPatient.gender,
        dob: restoredPatient.dob,
        phone: restoredPatient.phone,
        alternate_phone: restoredPatient.alternatePhone,
        email: restoredPatient.email,
        address_info: restoredPatient.addressInfo,
        blood_group: restoredPatient.bloodGroup,
        existing_conditions: restoredPatient.existingConditions,
        allergies: restoredPatient.allergies,
        doctor_assigned_id: restoredPatient.doctorAssignedId,
        doctor_assigned_name: restoredPatient.doctorAssignedName,
        preferred_language: restoredPatient.preferredLanguage,
        preferred_contact_method: restoredPatient.preferredContactMethod,
        whatsapp_opt_in: restoredPatient.whatsappOptIn,
        last_visit: restoredPatient.lastVisit,
        vitals: restoredPatient.vitals,
        medical_history: restoredPatient.medicalHistory,
        prescriptions: restoredPatient.prescriptions,
        enable_automated_follow_up: restoredPatient.enableAutomatedFollowUp,
        custom_follow_up_days: restoredPatient.customFollowUpDays,
        custom_follow_up_message: restoredPatient.customFollowUpMessage,
        archived: false,
        created_at: restoredPatient.createdAt
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Restore Warning]', err?.message || err);
    }
  })();
}

export async function dbPermanentlyDeleteTrashedPatient(trashedId: string): Promise<void> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const trashed = await db.trashedPatients.get(trashedId);
  const targetPatientId = trashed ? trashed.id : trashedId;

  await db.trashedPatients.delete(trashedId);

  (async () => {
    try {
      // Delete permanently from both patients and trashed_patients tables in Supabase
      await supabase.from('patients').delete().eq('id', String(targetPatientId));
      await supabase.from('patients').delete().eq('id', String(trashedId));
      await supabase.from('trashed_patients').delete().eq('trashed_id', String(trashedId));
      await supabase.from('trashed_patients').delete().eq('id', String(targetPatientId));
    } catch (err: any) {
      console.warn('[Supabase Sync Permanent Delete Warning]', err?.message || err);
    }
  })();
}

// ─── COMMUNICATIONS ───
export async function dbAddCommunicationLog(patientId: string, log: Omit<CommunicationLog, 'id' | 'timestamp' | 'patientId'>): Promise<Patient | null> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor', 'Patient']);
  const patient = await db.patients.get(patientId);
  if (!patient) return null;

  const timestamp = new Date().toLocaleDateString("en-US") + " " + new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
  const newLog: CommunicationLog = {
    ...log,
    id: `com-log-${Date.now()}`,
    patientId,
    channel: log.type,
    timestamp
  } as CommunicationLog;

  await db.communications.put(newLog);
  capCommunicationsInBackground(patientId);

  (async () => {
    try {
      await supabase.from('communications').upsert([{
        id: newLog.id,
        patient_id: newLog.patientId,
        type: newLog.type,
        channel: newLog.channel,
        direction: newLog.direction,
        content: newLog.content,
        timestamp: newLog.timestamp,
        status: newLog.status,
        media_url: newLog.mediaUrl,
        media_type: newLog.mediaType,
        whatsapp_message_id: newLog.whatsappMessageId
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Comm Warning]', err?.message || err);
    }
  })();

  const finalComms = await db.communications.where('patientId').equals(patientId).toArray();
  patient.communications = finalComms;
  return patient;
}

export async function dbAddMultipleCommunicationLogs(
  patientId: string,
  logs: Omit<CommunicationLog, 'id' | 'timestamp' | 'patientId'>[]
): Promise<Patient | null> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor', 'Patient']);
  const patient = await db.patients.get(patientId);
  if (!patient) return null;

  const timestamp = new Date().toLocaleDateString("en-US") + " " + new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });

  const commsToInsert = logs.map((log, index) => ({
    ...log,
    id: `com-log-${Date.now()}-${index}`,
    patientId,
    channel: log.type,
    timestamp
  } as CommunicationLog));

  await db.communications.bulkPut(commsToInsert);
  capCommunicationsInBackground(patientId);

  (async () => {
    try {
      const mappedLogs = commsToInsert.map(l => ({
        id: l.id,
        patient_id: l.patientId,
        type: l.type,
        channel: l.channel,
        direction: l.direction,
        content: l.content,
        timestamp: l.timestamp,
        status: l.status,
        media_url: l.mediaUrl,
        media_type: l.mediaType,
        whatsapp_message_id: l.whatsappMessageId
      }));
      await supabase.from('communications').upsert(mappedLogs);
    } catch (err: any) {
      console.warn('[Supabase Sync Comms Warning]', err?.message || err);
    }
  })();

  const finalComms = await db.communications.where('patientId').equals(patientId).toArray();
  patient.communications = finalComms;
  return patient;
}

// ─── APPOINTMENTS ───
export async function dbGetAppointments(): Promise<Appointment[]> {
  const appointments = await getSetting<Appointment[]>('h_appointments_up', []);
  const role = getActiveRole();
  
  if (role === 'Patient') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const patientId = session ? JSON.parse(session).username : "";
    return appointments.filter((a: Appointment) => a.patientId === patientId);
  }
  
  if (role === 'Doctor') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const docName = session ? JSON.parse(session).name : "";
    const doctors = await dbGetDoctors();
    const docMatch = doctors.find(d => d.name === docName);
    const docId = docMatch ? docMatch.id : "";
    return appointments.filter((a: Appointment) => a.doctorId === docId || a.doctorName === docName);
  }
  
  return appointments;
}

export async function dbSaveAppointment(appointment: Omit<Appointment, 'id'> & { id?: string }): Promise<Appointment> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor', 'Patient']);
  const appointments = await getSetting<Appointment[]>('h_appointments_up', []);
  const role = getActiveRole();
  
  if (role === 'Doctor' && appointment.id) {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const docName = session ? JSON.parse(session).name : "";
    const currentApt = appointments.find(a => a.id === appointment.id);
    if (currentApt && currentApt.doctorName !== docName) {
      throw new Error("Access Denied: Doctors can only manage their own appointments.");
    }
  }

  const id = appointment.id || `apt-${appointments.length + 1}`;
  const newApt: Appointment = { ...appointment, id };

  const index = appointments.findIndex(a => a.id === id);
  const isNew = index === -1;
  const oldApt = isNew ? null : { ...appointments[index] };

  if (index >= 0) {
    appointments[index] = newApt;
  } else {
    appointments.push(newApt);

    if (newApt.status !== 'Cancelled') {
      const invoices = await dbGetInvoices();
      const invNo = `INV-2026-00${invoices.length + 1}`;
      await dbSaveInvoice({
        invoiceNo: invNo,
        patientId: newApt.patientId,
        patientName: newApt.patientName,
        date: newApt.date,
        amount: newApt.cost,
        status: 'Unpaid'
      });
    }

    if (typeof window !== "undefined" && newApt.status !== 'Cancelled') {
      const patients = await dbGetPatients();
      const pMatch = patients.find(p => p.id === newApt.patientId);
      const phone = pMatch ? pMatch.phone : null;

      if (phone) {
        const lang = pMatch ? pMatch.preferredLanguage : 'English';
        let aptTemplate = await dbGetWhatsAppTemplate("apt_reminder", lang);
        if (!aptTemplate) {
          aptTemplate = MULTILINGUAL_TEMPLATES.apt_reminder?.[lang] || MULTILINGUAL_TEMPLATES.apt_reminder?.English || "Dear {Patient Name}, this is a reminder for your appointment on {Date} at {Time} with {Doctor}.";
        }
        const reminderMsg = aptTemplate
          .replace(/{Patient Name}/g, newApt.patientName)
          .replace(/{Date}/g, newApt.date)
          .replace(/{Time}/g, newApt.timeSlot)
          .replace(/{Doctor}/g, newApt.doctorName);

        const aptDateObj = new Date(newApt.date + "T09:00:00");
        const sendDate = new Date(aptDateObj.getTime() - 24 * 60 * 60 * 1000);
        const sendAtTime = sendDate.getTime() > Date.now() ? sendDate.toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString();

        fetch(`${WHATSAPP_API_URL}/api/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone,
            text: reminderMsg,
            sendAt: sendAtTime,
            patientName: newApt.patientName
          })
        }).catch(() => {});
      }
    }
  }

  await setSetting('h_appointments_up', appointments);

  (async () => {
    try {
      await supabase.from('appointments').upsert([{
        id: newApt.id,
        patient_id: newApt.patientId,
        patient_name: newApt.patientName,
        doctor_id: newApt.doctorId,
        doctor_name: newApt.doctorName,
        date: newApt.date,
        time_slot: newApt.timeSlot,
        department: newApt.department,
        status: newApt.status,
        notes: newApt.notes,
        cost: newApt.cost
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Apt Warning]', err?.message || err);
    }
  })();

  if (newApt.status === 'Confirmed' && (isNew || oldApt?.status !== 'Confirmed')) {
    await dbTriggerWorkflow("Appointment Confirmed", { appointment: newApt });
  }

  return newApt;
}

export async function dbDeleteAppointment(id: string): Promise<Appointment[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const appointments = await getSetting<Appointment[]>('h_appointments_up', []);
  const filtered = appointments.filter(a => a.id !== id);
  await setSetting('h_appointments_up', filtered);

  (async () => {
    try {
      await supabase.from('appointments').delete().eq('id', id);
    } catch (err: any) {}
  })();

  return filtered;
}

export async function dbUpdateAppointmentStatus(id: string, status: Appointment['status']): Promise<Appointment[]> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor']);
  const appointments = await getSetting<Appointment[]>('h_appointments_up', []);
  const index = appointments.findIndex(a => a.id === id);
  if (index >= 0) {
    const oldStatus = appointments[index].status;
    appointments[index].status = status;
    await setSetting('h_appointments_up', appointments);

    const updatedApt = appointments[index];
    (async () => {
      try {
        await supabase.from('appointments').upsert([{
          id: updatedApt.id,
          patient_id: updatedApt.patientId,
          patient_name: updatedApt.patientName,
          doctor_id: updatedApt.doctorId,
          doctor_name: updatedApt.doctorName,
          date: updatedApt.date,
          time_slot: updatedApt.timeSlot,
          department: updatedApt.department,
          status: updatedApt.status,
          notes: updatedApt.notes,
          cost: updatedApt.cost
        }]);
      } catch (err: any) {
        console.warn('[Supabase Sync Apt Warning]', err?.message || err);
      }
    })();

    if (status === 'Confirmed' && oldStatus !== 'Confirmed') {
      await dbTriggerWorkflow("Appointment Confirmed", { appointment: appointments[index] });
    }
  }
  return appointments;
}

// ─── FOLLOW-UPS ───
export async function dbGetFollowUps(): Promise<FollowUp[]> {
  await dbCheckOverdueFollowUps();
  const followups = await getSetting<FollowUp[]>('h_followups_up', []);
  const role = getActiveRole();
  
  if (role === 'Patient') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const patientId = session ? JSON.parse(session).username : "";
    return followups.filter((f: FollowUp) => f.patientId === patientId);
  }
  
  if (role === 'Doctor') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const docName = session ? JSON.parse(session).name : "";
    const doctors = await dbGetDoctors();
    const docMatch = doctors.find(d => d.name === docName);
    const docId = docMatch ? docMatch.id : "";
    return followups.filter((f: FollowUp) => f.doctorId === docId || f.doctorName === docName);
  }
  
  return followups;
}

export async function dbSaveFollowUp(fup: Omit<FollowUp, 'id'> & { id?: string }): Promise<FollowUp> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor']);
  const followups = await getSetting<FollowUp[]>('h_followups_up', []);
  const id = fup.id || `fup-${followups.length + 1}`;
  const cleanPhone = fup.phone.replace(/[^0-9]/g, '');
  let newFup: FollowUp = { ...fup, id, phone: cleanPhone };

  if (typeof window !== "undefined") {
    const patient = await db.patients.get(newFup.patientId);
    const lang = patient ? patient.preferredLanguage : 'English';
    if (lang !== 'English' && isDefaultEnglishMessage(newFup.customMessage || '')) {
      let fupTemplate = await dbGetWhatsAppTemplate("follow_up_reminder", lang);
      if (!fupTemplate) {
        fupTemplate = MULTILINGUAL_TEMPLATES.follow_up_reminder?.[lang] || MULTILINGUAL_TEMPLATES.follow_up_reminder?.English || "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}.";
      }
      newFup.customMessage = fupTemplate;
    }
  }

  const index = followups.findIndex(f => f.id === id);
  const isNew = index === -1;

  if (index >= 0) {
    followups[index] = newFup;
  } else {
    followups.push(newFup);
  }

  await setSetting('h_followups_up', followups);

  (async () => {
    try {
      await supabase.from('follow_ups').upsert([{
        id: newFup.id,
        patient_id: newFup.patientId,
        patient_name: newFup.patientName,
        age: newFup.age,
        phone: newFup.phone,
        last_visit_date: newFup.lastVisitDate,
        follow_up_date: newFup.followUpDate,
        follow_up_time: newFup.followUpTime,
        doctor_id: newFup.doctorId,
        doctor_name: newFup.doctorName,
        status: newFup.status,
        custom_message: newFup.customMessage
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Fup Warning]', err?.message || err);
    }
  })();

  if (typeof window !== "undefined" && newFup.status !== 'Completed') {
    const patient = await db.patients.get(newFup.patientId);
    const lang = patient ? patient.preferredLanguage : 'English';

    let fupTemplate = await dbGetWhatsAppTemplate("follow_up_reminder", lang);
    if (!fupTemplate) {
      fupTemplate = MULTILINGUAL_TEMPLATES.follow_up_reminder?.[lang] || MULTILINGUAL_TEMPLATES.follow_up_reminder?.English || "Dear {Patient Name}, this is a reminder from our clinic for your scheduled follow-up on {Date} with {Doctor}.";
    }

    let defaultMsg = newFup.customMessage || fupTemplate;
    defaultMsg = defaultMsg
      .replace(/{Patient Name}/g, newFup.patientName)
      .replace(/{Date}/g, newFup.followUpDate)
      .replace(/{Doctor}/g, newFup.doctorName);
    
    const fTime = newFup.followUpTime || "10:00";
    const sendAtDate = new Date(`${newFup.followUpDate}T${fTime}:00`);
    const sendAtISO = isNaN(sendAtDate.getTime()) 
      ? new Date(newFup.followUpDate + "T10:00:00").toISOString()
      : sendAtDate.toISOString();

    const cancelPromise = !isNew 
      ? fetch(`${WHATSAPP_API_URL}/api/cancel-scheduled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: newFup.phone })
        }).catch(() => {})
      : Promise.resolve();

    cancelPromise.then(() => {
      fetch(`${WHATSAPP_API_URL}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newFup.phone,
          text: defaultMsg,
          sendAt: sendAtISO,
          patientName: newFup.patientName
        })
      }).catch(() => {});
    });
  }

  return newFup;
}

export async function dbCompleteFollowUp(id: string): Promise<FollowUp[]> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor']);
  const followups = await getSetting<FollowUp[]>('h_followups_up', []);
  const updated = followups.map(f => f.id === id ? { ...f, status: 'Completed' as const } : f);
  await setSetting('h_followups_up', updated);

  (async () => {
    try {
      await supabase.from('follow_ups').update({ status: 'Completed' }).eq('id', id);
    } catch (err: any) {}
  })();

  return updated;
}

export async function dbDeleteFollowUp(id: string): Promise<FollowUp[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const followups = await getSetting<FollowUp[]>('h_followups_up', []);
  const updated = followups.filter(f => f.id !== id);
  await setSetting('h_followups_up', updated);

  (async () => {
    try {
      await supabase.from('follow_ups').delete().eq('id', id);
    } catch (err: any) {}
  })();

  return updated;
}

export async function dbMarkFollowUpsAsContacted(patientId: string): Promise<void> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Doctor']);
  const followups = await getSetting<FollowUp[]>('h_followups_up', []);
  let updated = false;
  for (const f of followups) {
    if (f.patientId === patientId && (f.status === 'Pending' || f.status === 'Overdue')) {
      f.status = 'Contacted';
      updated = true;
    }
  }
  if (updated) {
    await setSetting('h_followups_up', followups);
  }
}


let isOverdueChecked = false;
export async function dbCheckOverdueFollowUps(): Promise<void> {
  if (typeof window === 'undefined' || isOverdueChecked) return;
  isOverdueChecked = true;

  const followups = await getSetting<FollowUp[]>('h_followups_up', []);
  const today = new Date().toISOString().split('T')[0];
  let updated = false;

  for (const f of followups) {
    if (f.status === 'Pending' && f.followUpDate < today) {
      f.status = 'Overdue';
      updated = true;
      await dbTriggerWorkflow("Follow-up Overdue", { followUp: f });
    }
  }

  if (updated) {
    await setSetting('h_followups_up', followups);
  }
}

// ─── INVOICES ───
export async function dbGetInvoices(): Promise<Invoice[]> {
  const invoices = await db.invoices.toArray();
  const role = getActiveRole();
  if (role === 'Patient') {
    const session = typeof window !== 'undefined' ? localStorage.getItem("active_user_session") : null;
    const patientName = session ? JSON.parse(session).name : "";
    return invoices.filter((i: Invoice) => i.patientName === patientName);
  }
  return invoices;
}

export async function dbSaveInvoice(invoice: Omit<Invoice, 'id'> & { id?: string }): Promise<Invoice> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Patient']);
  const count = await db.invoices.count();
  const id = invoice.id || `inv-${count + 1}`;
  const newInv: Invoice = { 
    ...invoice, 
    id,
    patientId: invoice.patientId || '',
    createdAt: invoice.createdAt || new Date().toISOString()
  } as Invoice;

  await db.invoices.put(newInv);

  (async () => {
    try {
      await supabase.from('invoices').upsert([{
        id: newInv.id,
        invoice_no: newInv.invoiceNo,
        patient_id: newInv.patientId,
        patient_name: newInv.patientName,
        date: newInv.date,
        amount: newInv.amount,
        status: newInv.status,
        created_at: newInv.createdAt
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Inv Warning]', err?.message || err);
    }
  })();

  await dbTriggerWorkflow("Invoice Created", { invoice: newInv });
  return newInv;
}

export async function dbPayInvoice(id: string): Promise<Invoice[]> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin', 'Patient']);
  const inv = await db.invoices.get(id);
  if (inv) {
    await db.invoices.update(id, { status: 'Paid' });

    (async () => {
      try {
        await supabase.from('invoices').upsert([{
          id: inv.id,
          invoice_no: inv.invoiceNo,
          patient_id: inv.patientId,
          patient_name: inv.patientName,
          date: inv.date,
          amount: inv.amount,
          status: 'Paid',
          created_at: inv.createdAt
        }]);
      } catch (err: any) {
        console.warn('[Supabase Sync Inv Warning]', err?.message || err);
      }
    })();
    
    if (inv.status !== 'Paid') {
      await dbTriggerWorkflow("Bill Settle Complete", { invoice: { ...inv, status: 'Paid' } });
      const patients = await dbGetPatients();
      const patient = patients.find(p => p.name.toLowerCase() === inv.patientName.toLowerCase());
      if (patient && typeof window !== "undefined") {
        fetch(`${WHATSAPP_API_URL}/api/cancel-scheduled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: patient.phone })
        }).catch(() => {});
      }
    }
  }
  return dbGetInvoices();
}

export async function dbDeleteInvoice(id: string): Promise<Invoice[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await db.invoices.delete(id);

  (async () => {
    try {
      await supabase.from('invoices').delete().eq('id', id);
    } catch (err: any) {}
  })();

  return dbGetInvoices();
}

export interface WorkflowExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  patientId?: string;
  patientName?: string;
  timestamp: string; // ISO
  triggerEvent: string;
  stepsExecuted: {
    step: string;
    status: 'success' | 'failed';
    error?: string;
    details?: string;
  }[];
  status: 'success' | 'failed';
}

export async function dbGetWorkflowLogs(): Promise<WorkflowExecutionLog[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  return getSetting<WorkflowExecutionLog[]>('h_workflow_logs_up', []);
}

export async function dbAddWorkflowLog(log: WorkflowExecutionLog): Promise<void> {
  const logs = await getSetting<WorkflowExecutionLog[]>('h_workflow_logs_up', []);
  const updatedLogs = [log, ...logs].slice(0, 100);
  await setSetting('h_workflow_logs_up', updatedLogs);
}

export async function dbClearWorkflowLogs(): Promise<void> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  await setSetting('h_workflow_logs_up', []);
}

// ─── WORKFLOWS ───
export async function dbGetWorkflows(): Promise<AutomationWorkflow[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  return getSetting<AutomationWorkflow[]>('h_workflows_up', INITIAL_WORKFLOWS);
}

export async function dbSaveWorkflow(workflow: Omit<AutomationWorkflow, 'id'> & { id?: string }): Promise<AutomationWorkflow> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const workflows = await getSetting<AutomationWorkflow[]>('h_workflows_up', INITIAL_WORKFLOWS);
  const id = workflow.id || `wf-${workflows.length + 1}`;
  const newWf: AutomationWorkflow = {
    ...workflow,
    id,
    runCount: workflow.runCount || 0
  };

  const index = workflows.findIndex(w => w.id === id);
  if (index >= 0) {
    workflows[index] = newWf;
  } else {
    workflows.push(newWf);
  }

  await setSetting('h_workflows_up', workflows);
  return newWf;
}

export async function dbDeleteWorkflow(id: string): Promise<AutomationWorkflow[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const workflows = await getSetting<AutomationWorkflow[]>('h_workflows_up', INITIAL_WORKFLOWS);
  const filtered = workflows.filter((w: AutomationWorkflow) => w.id !== id);
  await setSetting('h_workflows_up', filtered);
  return filtered;
}

export async function dbDuplicateWorkflow(id: string): Promise<AutomationWorkflow> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const workflows = await getSetting<AutomationWorkflow[]>('h_workflows_up', INITIAL_WORKFLOWS);
  const original = workflows.find((w: AutomationWorkflow) => w.id === id);
  if (!original) throw new Error(`Workflow ${id} not found`);
  return dbSaveWorkflow({
    ...original,
    id: undefined,
    name: `${original.name} (Copy)`,
    runCount: 0,
    status: 'Paused'
  });
}

// ─── WHATSAPP TEMPLATES ───
export async function dbGetWhatsAppTemplate(eventKey: string, lang: string): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES[eventKey]?.[lang] || "";
  const key = `h_wa_template_${eventKey}_${lang}`;
  try {
    const saved = await db.appSettings.get(key);
    if (saved) return saved.value as string;
  } catch (err) {
    console.warn("Failed to read WhatsApp template from Dexie:", err);
  }
  return DEFAULT_TEMPLATES[eventKey]?.[lang] || "";
}

export async function dbSaveWhatsAppTemplate(eventKey: string, lang: string, text: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const key = `h_wa_template_${eventKey}_${lang}`;
  await db.appSettings.put({ key, value: text });
}

// ─── AUDIT LOGS ───
export async function dbGetAuditLogs(): Promise<AuditLogEntry[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const logs = await db.auditLogs.toArray();
  // Sort by id in reverse to get newest logs first
  logs.sort((a, b) => b.id.localeCompare(a.id));
  return logs;
}

export async function dbAddAuditLog(log: Omit<AuditLogEntry, 'id' | 'timestamp' | 'staffName' | 'staffRole'>): Promise<AuditLogEntry> {
  let staffName = "System Scheduler";
  let staffRole = "System";

  if (typeof window !== "undefined") {
    const storedSession = localStorage.getItem("active_user_session");
    if (storedSession) {
      const sess = JSON.parse(storedSession);
      staffName = sess.name || sess.username;
      staffRole = sess.role;
    }
  }

  const timestamp = new Date().toLocaleDateString("en-US") + " " + new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
  const id = `audit-${Date.now()}`;
  const newEntry: AuditLogEntry = {
    ...log,
    id,
    timestamp,
    staffName,
    staffRole,
    actorRole: staffRole,
    entityType: 'patient'
  };

  await db.auditLogs.put(newEntry);
  capAuditLogsInBackground();

  (async () => {
    try {
      await supabase.from('audit_logs').upsert([{
        id: newEntry.id,
        timestamp: newEntry.timestamp,
        staff_name: newEntry.staffName,
        staff_role: newEntry.staffRole,
        actor_role: newEntry.actorRole,
        entity_type: newEntry.entityType,
        patient_id: newEntry.patientId,
        patient_name: newEntry.patientName,
        action: newEntry.action
      }]);
    } catch (err: any) {
      console.warn('[Supabase Sync Audit Log Warning]', err?.message || err);
    }
  })();

  return newEntry;
}

// ─── DUPLICATES & MERGE ───
export async function dbFindDuplicatePatients(): Promise<{ p1: Patient; p2: Patient }[]> {
  const patients = await dbGetPatients();
  const duplicates: { p1: Patient; p2: Patient }[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < patients.length; i++) {
    for (let j = i + 1; j < patients.length; j++) {
      const p1 = patients[i];
      const p2 = patients[j];
      
      const cleanPhone1 = p1.phone.replace(/[^0-9]/g, "");
      const cleanPhone2 = p2.phone.replace(/[^0-9]/g, "");
      const matchesPhone = cleanPhone1 && cleanPhone1 === cleanPhone2;
      const matchesEmail = p1.email && p1.email.toLowerCase().trim() === p2.email.toLowerCase().trim();
      
      if (matchesPhone || matchesEmail) {
        const pairId = [p1.id, p2.id].sort().join("-");
        if (!checked.has(pairId)) {
          duplicates.push({ p1, p2 });
          checked.add(pairId);
        }
      }
    }
  }

  return duplicates;
}

export interface DuplicateMatch {
  patient: Patient;
  matchReasons: string[];
  severity: 'exact' | 'strong' | 'weak';
}

export async function dbCheckPatientDuplicate(
  candidate: { name: string; phone: string; email: string; dob: string },
  excludeId?: string
): Promise<DuplicateMatch[]> {
  const patients = (await dbGetPatients()).filter(p => !p.archived && p.id !== excludeId);
  const results: DuplicateMatch[] = [];

  const cleanPhone = (candidate.phone || '').replace(/[\s\-()+]/g, '');
  const cleanEmail = (candidate.email || '').toLowerCase().trim();
  const cleanName  = (candidate.name || '').toLowerCase().trim();

  for (const p of patients) {
    const reasons: string[] = [];
    const pPhone = (p.phone || '').replace(/[\s\-()+]/g, '');
    const pEmail = (p.email || '').toLowerCase().trim();
    const pName  = (p.name || '').toLowerCase().trim();

    if (cleanPhone && pPhone && cleanPhone === pPhone) reasons.push('Same phone number');
    if (cleanEmail && pEmail && cleanEmail === pEmail)  reasons.push('Same email address');
    if (cleanName && pName === cleanName && candidate.dob && p.dob === candidate.dob) reasons.push('Same name & date of birth');
    if (cleanName && pName === cleanName && !candidate.dob) reasons.push('Same full name');

    if (reasons.length === 0) continue;

    let severity: DuplicateMatch['severity'] = 'weak';
    if (reasons.some(r => r.includes('phone'))) severity = 'exact';
    else if (reasons.length >= 2 || reasons.some(r => r.includes('email'))) severity = 'strong';

    results.push({ patient: p, matchReasons: reasons, severity });
  }

  return results.sort((a, b) => {
    const order = { exact: 0, strong: 1, weak: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export async function dbMergePatients(primaryId: string, secondaryId: string): Promise<Patient[]> {
  dbEnforceRole(['Clinic Admin', 'Super Admin']);
  const primary = await db.patients.get(primaryId);
  const secondary = await db.patients.get(secondaryId);

  if (!primary || !secondary) return dbGetPatients();

  // Populate communications for secondary and primary to merge
  const primaryComms = await db.communications.where('patientId').equals(primaryId).toArray();
  const secondaryComms = await db.communications.where('patientId').equals(secondaryId).toArray();

  const mergedVitals = [...primary.vitals, ...secondary.vitals].sort((a, b) => b.date.localeCompare(a.date));
  const mergedHistory = [...primary.medicalHistory, ...secondary.medicalHistory].sort((a, b) => b.date.localeCompare(a.date));
  
  const presMap = new Map<string, Prescription>();
  primary.prescriptions.forEach(p => presMap.set(p.name.toLowerCase(), p));
  secondary.prescriptions.forEach(p => presMap.set(p.name.toLowerCase(), p));
  const mergedPrescriptions = Array.from(presMap.values());

  // Update secondary communications to primaryId
  await db.transaction('rw', [db.patients, db.communications, db.appSettings, db.invoices], async () => {
    // Save primary updates
    await db.patients.update(primaryId, {
      vitals: mergedVitals,
      medicalHistory: mergedHistory,
      prescriptions: mergedPrescriptions,
      existingConditions: [primary.existingConditions, secondary.existingConditions].filter(Boolean).join(", "),
      allergies: [primary.allergies, secondary.allergies].filter(Boolean).join(", ")
    });

    // Update communications table
    await db.communications.where('patientId').equals(secondaryId).modify({ patientId: primaryId });

    // Delete secondary patient
    await db.patients.delete(secondaryId);

    // Clean up appointments
    const appointments = await getSetting<Appointment[]>('h_appointments_up', []);
    const updatedApts = appointments.map(a => {
      if (a.patientId === secondaryId) {
        return { ...a, patientId: primaryId, patientName: primary.name };
      }
      return a;
    });
    await setSetting('h_appointments_up', updatedApts);

    // Clean up followups
    const followups = await getSetting<FollowUp[]>('h_followups_up', []);
    const updatedFups = followups.map(f => {
      if (f.patientId === secondaryId) {
        return { ...f, patientId: primaryId, patientName: primary.name };
      }
      return f;
    });
    await setSetting('h_followups_up', updatedFups);

    // Clean up invoices table
    await db.invoices.where('patientId').equals(secondaryId).modify({ patientId: primaryId, patientName: primary.name });
  });

  // Create audit log entry
  await dbAddAuditLog({
    patientId: primaryId,
    patientName: primary.name,
    action: `Merged duplicate patient record (ID: ${secondaryId}, Name: ${secondary.name})`
  });

  return dbGetPatients();
}

// ─── AUTO-REPLIES ───
export async function dbGetAutoReplies(): Promise<AutoReplyRule[]> {
  const role = getActiveRole();
  if (role === 'Patient') return [];
  return getSetting<AutoReplyRule[]>('h_autoreplies_up', INITIAL_AUTO_REPLIES);
}

export async function dbSaveAutoReplies(rules: AutoReplyRule[]): Promise<AutoReplyRule[]> {
  dbEnforceRole(['Receptionist', 'Clinic Admin', 'Super Admin']);
  await setSetting('h_autoreplies_up', rules);
  return rules;
}

// ─── CLINICS ───
export async function dbGetClinics(): Promise<ClinicOrg[]> {
  dbEnforceRole(['Super Admin']);
  const initialClinics: ClinicOrg[] = [
    { id: 'clinic-1', name: 'Aegis General Clinic (Downtown)', domain: 'downtown.aegiscrm.com', status: 'Active', subscriptionPlan: 'Enterprise', createdAt: '2025-01-15' },
    { id: 'clinic-2', name: 'Aegis Westside Pediatrics', domain: 'westpediatrics.aegiscrm.com', status: 'Active', subscriptionPlan: 'Professional', createdAt: '2025-04-10' },
    { id: 'clinic-3', name: 'Aegis Dental Care', domain: 'dental.aegiscrm.com', status: 'Suspended', subscriptionPlan: 'Trial', createdAt: '2026-02-01' }
  ];
  return getSetting<ClinicOrg[]>('h_clinics_up', initialClinics);
}

export async function dbSaveClinic(clinic: Omit<ClinicOrg, 'id'> & { id?: string }): Promise<ClinicOrg> {
  dbEnforceRole(['Super Admin']);
  const clinics = await getSetting<ClinicOrg[]>('h_clinics_up', []);
  const id = clinic.id || `clinic-${clinics.length + 1}`;
  const newClinic = { ...clinic, id } as ClinicOrg;
  const idx = clinics.findIndex(c => c.id === id);
  if (idx >= 0) {
    clinics[idx] = newClinic;
  } else {
    clinics.push(newClinic);
  }
  await setSetting('h_clinics_up', clinics);
  return newClinic;
}

export async function dbDeleteClinic(id: string): Promise<ClinicOrg[]> {
  dbEnforceRole(['Super Admin']);
  const clinics = await getSetting<ClinicOrg[]>('h_clinics_up', []);
  const filtered = clinics.filter(c => c.id !== id);
  await setSetting('h_clinics_up', filtered);
  return filtered;
}

// ─── TRANSLATION UTILS ───
export function isDefaultEnglishMessage(msg: string): boolean {
  if (!msg) return true;
  const cleaned = msg.trim().toLowerCase();
  if (
    cleaned === "" ||
    cleaned.startsWith("hello {patient name}, this is a reminder for your scheduled follow-up checkup. please confirm if you can make it.") ||
    cleaned.startsWith("dear {patient name}, this is a reminder from our clinic for your scheduled follow-up on {date} with {doctor}.") ||
    cleaned.startsWith("dear {patient name}, this is a reminder from our clinic for your scheduled follow-up on {date} with {doctor}")
  ) {
    return true;
  }

  const cleanedSingleLine = cleaned.replace(/\s+/g, " ");
  const regex1 = /^hello\s+.*,\s+this\s+is\s+a\s+reminder\s+for\s+your\s+scheduled\s+follow-up\s+checkup\.\s+please\s+confirm\s+if\s+you\s+can\s+make\s+it\.?$/i;
  const regex2 = /^dear\s+.*,\s+this\s+is\s+a\s+reminder\s+from\s+our\s+clinic\s+for\s+your\s+scheduled\s+follow-up\s+on\s+.*\s+with\s+.*\.(\s+please\s+confirm\s+your\s+attendance\.)?$/i;
  
  if (regex1.test(cleanedSingleLine) || regex2.test(cleanedSingleLine)) {
    return true;
  }

  return false;
}

export function translateMessage(
  templateKey: string,
  language: string,
  vars: Record<string, string> = {}
): string {
  const langTemplates = MULTILINGUAL_TEMPLATES[templateKey];
  if (!langTemplates) return "";
  let text = langTemplates[language] || langTemplates["English"] || "";
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return text;
}

export function getFollowUpMessageForPatient(
  patient: { name: string; preferredLanguage: string },
  followUpDate: string,
  doctorName: string
): string {
  return translateMessage("follow_up_reminder", patient.preferredLanguage, {
    "Patient Name": patient.name,
    "Date": followUpDate,
    "Doctor": doctorName
  });
}



function resolveCustomMessage(
  text: string,
  patient: Patient,
  context: {
    patient?: Patient;
    appointment?: Appointment;
    invoice?: Invoice;
    followUp?: FollowUp;
  }
): string {
  const dateStr = context.appointment?.date || new Date().toISOString().split('T')[0];
  const timeStr = context.appointment?.timeSlot || "10:00 AM";
  const docName = context.appointment?.doctorName || patient.doctorAssignedName || "Dr. Sarah Connor";
  const amountStr = context.invoice ? `$${context.invoice.amount}` : "$150";
  const invoiceNo = context.invoice?.invoiceNo || `INV-${Date.now().toString().slice(-4)}`;

  return text
    .replace(/{Patient Name}/g, patient.name)
    .replace(/{Date}/g, dateStr)
    .replace(/{Time}/g, timeStr)
    .replace(/{Doctor}/g, docName)
    .replace(/{Amount}/g, amountStr)
    .replace(/{Invoice No}/g, invoiceNo);
}

async function getResolvedMessageTemplate(
  triggerEvent: string,
  patient: Patient,
  context: {
    patient?: Patient;
    appointment?: Appointment;
    invoice?: Invoice;
    followUp?: FollowUp;
  }
): Promise<string> {
  let templateKey = "welcome";
  if (triggerEvent === "Appointment Confirmed") {
    templateKey = "apt_reminder";
  } else if (triggerEvent === "Bill Settle Complete") {
    templateKey = "bill_pending";
  } else if (triggerEvent === "Invoice Created") {
    templateKey = "invoice_attached";
  }

  const lang = patient.preferredLanguage || "English";

  // Fetch the saved template for the patient's language directly from DB.
  // Since "Save Template" now auto-translates English to all languages,
  // this will always contain the user's custom text (not the hardcoded default).
  let text = await dbGetWhatsAppTemplate(templateKey, lang);

  // Safety net: if the patient's language template is missing, use the saved
  // English template and translate it on the fly right now
  if (!text && lang !== "English" && typeof window !== "undefined") {
    const englishText = await dbGetWhatsAppTemplate(templateKey, "English");
    if (englishText) {
      const langCodeMap: Record<string, string> = {
        Telugu: "te", Hindi: "hi", Tamil: "ta",
        Kannada: "kn", Malayalam: "ml", Marathi: "mr",
        Bengali: "bn", Gujarati: "gu", Punjabi: "pa"
      };
      const targetCode = langCodeMap[lang];
      if (targetCode) {
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetCode}&dt=t&q=${encodeURIComponent(englishText)}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data && data[0]) {
            text = data[0].map((x: any) => x[0]).join("");
            await dbSaveWhatsAppTemplate(templateKey, lang, text);
          }
        } catch {
          text = englishText; // fallback to English if translation fails
        }
      } else {
        text = englishText;
      }
    }
  }

  // Final fallback to hardcoded multilingual default
  if (!text) {
    text = MULTILINGUAL_TEMPLATES[templateKey]?.[lang]
      || MULTILINGUAL_TEMPLATES[templateKey]?.English
      || "";
  }

  const dateStr = context.appointment?.date || new Date().toISOString().split('T')[0];
  const timeStr = context.appointment?.timeSlot || "10:00 AM";
  const docName = context.appointment?.doctorName || patient.doctorAssignedName || "Dr. Sarah Connor";
  const amountStr = context.invoice ? `$${context.invoice.amount}` : "$150";
  const invoiceNo = context.invoice?.invoiceNo || `INV-${Date.now().toString().slice(-4)}`;

  text = text.replace(/{Patient Name}/g, patient.name);
  text = text.replace(/{Date}/g, dateStr);
  text = text.replace(/{Time}/g, timeStr);
  text = text.replace(/{Doctor}/g, docName);
  text = text.replace(/{Amount}/g, amountStr);
  text = text.replace(/{Invoice No}/g, invoiceNo);

  return text;
}

function scheduleWhatsAppMessage(phone: string, text: string, sendAt: string, patientName: string) {
  if (typeof window === "undefined") return;

  fetch(`${WHATSAPP_API_URL}/api/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      text,
      sendAt,
      patientName
    })
  }).catch(() => {});
}

// ─── WORKFLOW ENGINE ───
export async function dbTriggerWorkflow(
  triggerEvent: string,
  context: {
    patient?: Patient;
    appointment?: Appointment;
    invoice?: Invoice;
    followUp?: FollowUp;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;

  const workflows = await getSetting<AutomationWorkflow[]>('h_workflows_up', INITIAL_WORKFLOWS);
  const activeWfs = workflows.filter((w: any) => w.status === 'Active' && w.trigger === triggerEvent);

  if (activeWfs.length === 0) return;

  let patient: Patient | undefined = context.patient;
  if (!patient) {
    const patientName = context.appointment?.patientName || context.invoice?.patientName || context.followUp?.patientName;
    if (patientName) {
      const patients = await dbGetPatients();
      patient = patients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
    }
  }
  if (!patient && context.followUp?.patientId) {
    const patients = await dbGetPatients();
    patient = patients.find(p => p.id === context.followUp?.patientId);
  }
  if (!patient && context.appointment?.patientId) {
    const patients = await dbGetPatients();
    patient = patients.find(p => p.id === context.appointment?.patientId);
  }

  let workflowsChanged = false;
  for (const wf of activeWfs) {
    const wfIndex = workflows.findIndex((w: any) => w.id === wf.id);
    if (wfIndex >= 0) {
      workflows[wfIndex].runCount = (workflows[wfIndex].runCount || 0) + 1;
      workflowsChanged = true;
    }

    const stepsLog: { step: string; status: 'success' | 'failed'; error?: string; details?: string }[] = [];
    let overallStatus: 'success' | 'failed' = 'success';

    try {
      await executeWorkflowSteps(wf, patient, context, (stepName, status, err, details) => {
        stepsLog.push({ step: stepName, status, error: err, details });
        if (status === 'failed') overallStatus = 'failed';
      });
    } catch (e: any) {
      overallStatus = 'failed';
      stepsLog.push({ step: 'Workflow Engine', status: 'failed', error: e.message || String(e) });
    }

    const runLog: WorkflowExecutionLog = {
      id: `wfl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workflowId: wf.id,
      workflowName: wf.name,
      patientId: patient?.id,
      patientName: patient?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      triggerEvent,
      stepsExecuted: stepsLog,
      status: overallStatus
    };
    await dbAddWorkflowLog(runLog);
  }

  if (workflowsChanged) {
    await setSetting('h_workflows_up', workflows);
  }
}

export async function dbRunWorkflowInBulk(workflowId: string): Promise<{ successCount: number; failedCount: number; logs: string[] }> {
  if (typeof window === 'undefined') return { successCount: 0, failedCount: 0, logs: [] };

  const workflows = await getSetting<AutomationWorkflow[]>('h_workflows_up', INITIAL_WORKFLOWS);
  const wf = workflows.find((w: any) => w.id === workflowId);
  if (!wf) throw new Error("Workflow not found");

  const patients = await dbGetPatients();
  let successCount = 0;
  let failedCount = 0;
  const logs: string[] = [];

  for (const patient of patients) {
    const context = { patient };
    const stepsLog: { step: string; status: 'success' | 'failed'; error?: string; details?: string }[] = [];
    let overallStatus: 'success' | 'failed' = 'success';

    try {
      await executeWorkflowSteps(wf, patient, context, (stepName, status, err, details) => {
        stepsLog.push({ step: stepName, status, error: err, details });
        if (status === 'failed') overallStatus = 'failed';
      });
      
      const wasFiltered = stepsLog.some(log => log.details && log.details.includes("Workflow stopped"));
      if (wasFiltered) {
        logs.push(`Patient "${patient.name}" skipped (filtered out).`);
      } else {
        successCount++;
        logs.push(`Successfully executed workflow for patient "${patient.name}".`);
      }
    } catch (e: any) {
      overallStatus = 'failed';
      failedCount++;
      stepsLog.push({ step: 'Workflow Engine', status: 'failed', error: e.message || String(e) });
      logs.push(`Failed executing workflow for patient "${patient.name}": ${e.message}`);
    }

    const runLog: WorkflowExecutionLog = {
      id: `wfl-bulk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      workflowId: wf.id,
      workflowName: wf.name,
      patientId: patient.id,
      patientName: patient.name,
      timestamp: new Date().toISOString(),
      triggerEvent: "Manual Bulk Run",
      stepsExecuted: stepsLog,
      status: overallStatus
    };
    await dbAddWorkflowLog(runLog);
  }

  // Update run count
  const wfIndex = workflows.findIndex((w: any) => w.id === wf.id);
  if (wfIndex >= 0) {
    workflows[wfIndex].runCount = (workflows[wfIndex].runCount || 0) + successCount;
    await setSetting('h_workflows_up', workflows);
  }

  return { successCount, failedCount, logs };
}

export async function dbExecuteWorkflowForPatient(
  wf: AutomationWorkflow,
  patient: Patient | undefined,
  onStepComplete?: (stepName: string, status: 'success' | 'failed', error?: string, details?: string) => void
): Promise<void> {
  return executeWorkflowSteps(wf, patient, { patient }, onStepComplete);
}

async function executeWorkflowSteps(
  wf: AutomationWorkflow,
  patient: Patient | undefined,
  context: {
    patient?: Patient;
    appointment?: Appointment;
    invoice?: Invoice;
    followUp?: FollowUp;
  },
  onStepComplete?: (stepName: string, status: 'success' | 'failed', error?: string, details?: string) => void
): Promise<void> {
  let accumulatedDelayMs = 0;

  for (const step of wf.steps) {
    let success = true;
    let errMsg = '';
    let details = '';

    try {
      if (step.startsWith("Filter: Language =")) {
        const requiredLang = step.replace("Filter: Language =", "").trim().toLowerCase();
        const patientLang = patient?.preferredLanguage?.toLowerCase() || "";
        if (patientLang !== requiredLang) {
          details = `Workflow stopped: patient language '${patient?.preferredLanguage || "Unknown"}' does not match filter '${step.replace("Filter: Language =", "").trim()}'`;
          if (onStepComplete) {
            onStepComplete(step, 'success', undefined, details);
          }
          break; // Stop executing further steps for this patient
        }
        details = `Patient language '${patient?.preferredLanguage}' matches filter.`;
      } else if (step.startsWith("Filter: Gender =")) {
        const requiredGender = step.replace("Filter: Gender =", "").trim().toLowerCase();
        const patientGender = patient?.gender?.toLowerCase() || "";
        if (patientGender !== requiredGender) {
          details = `Workflow stopped: patient gender '${patient?.gender || "Unknown"}' does not match filter '${step.replace("Filter: Gender =", "").trim()}'`;
          if (onStepComplete) onStepComplete(step, 'success', undefined, details);
          break;
        }
        details = `Patient gender '${patient?.gender}' matches filter.`;
      } else if (step.startsWith("Filter: Age Group =")) {
        const group = step.replace("Filter: Age Group =", "").trim().toLowerCase();
        const age = patient?.age || 0;
        let match = false;
        if (group === "minor (<18)" && age < 18) match = true;
        else if (group === "adult (18-59)" && age >= 18 && age < 60) match = true;
        else if (group === "senior (60+)" && age >= 60) match = true;
        
        if (!match) {
          details = `Workflow stopped: patient age ${age} does not match filter '${step.replace("Filter: Age Group =", "").trim()}'`;
          if (onStepComplete) onStepComplete(step, 'success', undefined, details);
          break;
        }
        details = `Patient age ${age} matches filter.`;
      } else if (step.startsWith("Filter: WhatsApp Opt-in =")) {
        const optIn = step.replace("Filter: WhatsApp Opt-in =", "").trim().toLowerCase();
        const requiredOptIn = optIn === "opted in";
        const patientOptIn = patient?.whatsappOptIn || false;
        if (patientOptIn !== requiredOptIn) {
          details = `Workflow stopped: patient WhatsApp opt-in is ${patientOptIn ? 'Opted In' : 'Opted Out'}, filter is ${step.replace("Filter: WhatsApp Opt-in =", "").trim()}`;
          if (onStepComplete) onStepComplete(step, 'success', undefined, details);
          break;
        }
        details = `Patient WhatsApp opt-in matches filter.`;
      } else if (step.startsWith("Filter: Department =")) {
        const requiredDept = step.replace("Filter: Department =", "").trim().toLowerCase();
        const apptDept = context.appointment?.department?.toLowerCase() || "";
        if (apptDept && !apptDept.includes(requiredDept)) {
          details = `Workflow stopped: clinical department '${apptDept}' does not match filter '${step.replace("Filter: Department =", "").trim()}'`;
          if (onStepComplete) onStepComplete(step, 'success', undefined, details);
          break;
        }
        details = `Clinical department matches filter.`;
      } else if (step.startsWith("Filter: Appointment Type =")) {
        const requiredType = step.replace("Filter: Appointment Type =", "").trim().toLowerCase();
        const apptType = ((context.appointment?.status || "") + " " + (context.appointment?.notes || "")).toLowerCase();
        if (requiredType && !apptType.includes(requiredType)) {
          details = `Workflow stopped: appointment type details do not match filter '${step.replace("Filter: Appointment Type =", "").trim()}'`;
          if (onStepComplete) onStepComplete(step, 'success', undefined, details);
          break;
        }
        details = `Appointment type matches filter.`;
      } else if (step.startsWith("Internal: Update Patient Status =")) {
        const status = step.replace("Internal: Update Patient Status =", "").trim();
        details = `Updated patient status to '${status}' (simulated).`;
      } else if (step === "Internal: Notify Doctor via Email") {
        details = `Sent email notification to assigned physician (simulated).`;
      } else if (step === "Internal: Notify Administrator") {
        details = `Logged alert notification to Administrator audit console (simulated).`;
      } else if (step === "Send WhatsApp Feedback Request") {
        if (!patient) throw new Error("Missing patient context");
        const text = `Hi ${patient.name}, thank you for choosing our clinic. How was your consultation with ${context.appointment?.doctorName || 'your physician'}? Please reply with any feedback.`;
        const sendAt = new Date(Date.now() + accumulatedDelayMs).toISOString();
        scheduleWhatsAppMessage(patient.phone, text, sendAt, patient.name);
        details = `Scheduled WhatsApp feedback request to ${patient.phone}`;
      } else if (step === "Send SMS Appointment Reminder") {
        if (!patient) throw new Error("Missing patient context");
        const text = `Hello ${patient.name}, this is a reminder of your upcoming consultation slot on ${context.appointment?.date || 'tomorrow'}.`;
        const timestamp = new Date(Date.now() + accumulatedDelayMs).toLocaleDateString("en-US") + " " + new Date(Date.now() + accumulatedDelayMs).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
        await db.communications.put({
          id: `com-auto-wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          patientId: patient.id,
          type: 'sms',
          channel: 'sms',
          direction: 'sent',
          content: text,
          timestamp,
          status: 'delivered'
        });
        details = `Logged SMS reminder to ${patient.phone}`;
      } else if (step.startsWith("Wait:")) {
        const parts = step.replace("Wait:", "").trim().split(" ");
        const val = parseInt(parts[0]) || 0;
        const unit = parts[1]?.toLowerCase() || "day";

        let durationMs = 0;
        if (unit.startsWith("second")) {
          durationMs = val * 1000;
        } else if (unit.startsWith("minute")) {
          durationMs = val * 60 * 1000;
        } else if (unit.startsWith("hour")) {
          durationMs = val * 60 * 60 * 1000;
        } else {
          durationMs = val * 24 * 60 * 60 * 1000;
        }
        accumulatedDelayMs += durationMs;
        details = `Accumulated wait delay: ${val} ${unit}`;
      } else if (step.startsWith("Send WhatsApp Invoice Attachment") || step === "Send WhatsApp Invoice Attachment" || step === "Send WhatsApp Invoice") {
        if (!patient) throw new Error("Missing patient context");

        const amountStr = context.invoice ? `$${context.invoice.amount}` : "$150";
        const invoiceNo = context.invoice?.invoiceNo || `INV-${Date.now().toString().slice(-4)}`;
        const invoiceDate = context.invoice?.date || new Date().toISOString().split('T')[0];
        
        const invoiceText = `
==================================================
                 CLINICAL INVOICE
==================================================
Invoice No:   ${invoiceNo}
Date:         ${invoiceDate}
Patient:      ${patient.name}
Phone:        ${patient.phone}
--------------------------------------------------
Description                        Amount
--------------------------------------------------
Medical Consultation / Treatment   ${amountStr}
--------------------------------------------------
TOTAL DUE:                         ${amountStr}
==================================================
Thank you for choosing OnlyClinic.
For payment inquiries, please reply to this message.
==================================================
`;
        
        let captionText = `Dear ${patient.name}, please find attached your clinical invoice ${invoiceNo} for ${amountStr}.`;
        if (step.includes(":")) {
          const customCaption = step.split(":").slice(1).join(":").trim();
          if (customCaption) {
            captionText = resolveCustomMessage(customCaption, patient, context);
          }
        }
        
        const sendAt = new Date(Date.now() + accumulatedDelayMs).toISOString();

        if (typeof window !== "undefined") {
          fetch(`${WHATSAPP_API_URL}/api/schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: patient.phone,
              text: captionText,
              sendAt,
              patientName: patient.name,
              attachment: {
                content: invoiceText,
                fileName: `Invoice-${invoiceNo}.txt`,
                mimetype: 'text/plain'
              }
            })
          }).catch(() => {});
        }

        const timestamp = new Date(Date.now() + accumulatedDelayMs).toLocaleDateString("en-US") + " " + new Date(Date.now() + accumulatedDelayMs).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
        const isScheduled = accumulatedDelayMs > 0;

        const logEntry: CommunicationLog = {
          id: `com-auto-wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          patientId: patient.id,
          type: 'whatsapp',
          channel: 'whatsapp',
          direction: 'sent',
          content: `[Attached Invoice: ${invoiceNo}.txt] ${captionText}`,
          timestamp,
          status: isScheduled ? 'sent' : 'delivered'
        } as CommunicationLog;

        await db.communications.put(logEntry);
        capCommunicationsInBackground(patient.id);
        details = `Scheduled invoice ${invoiceNo} via WhatsApp to ${patient.phone}`;
      } else if (step.startsWith("Send WhatsApp:") || step === "Send Welcome WhatsApp" || step === "Send WhatsApp Notification") {
        if (!patient) throw new Error("Missing patient context");

        let text = "";
        if (step.startsWith("Send WhatsApp:")) {
          text = step.replace("Send WhatsApp:", "").trim();
          text = resolveCustomMessage(text, patient, context);
        } else {
          text = await getResolvedMessageTemplate(wf.trigger, patient, context);
        }
        const sendAt = new Date(Date.now() + accumulatedDelayMs).toISOString();

        scheduleWhatsAppMessage(patient.phone, text, sendAt, patient.name);

        const timestamp = new Date(Date.now() + accumulatedDelayMs).toLocaleDateString("en-US") + " " + new Date(Date.now() + accumulatedDelayMs).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
        const isScheduled = accumulatedDelayMs > 0;

        const logEntry: CommunicationLog = {
          id: `com-auto-wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          patientId: patient.id,
          type: 'whatsapp',
          channel: 'whatsapp',
          direction: 'sent',
          content: text,
          timestamp,
          status: isScheduled ? 'sent' : 'delivered'
        } as CommunicationLog;

        await db.communications.put(logEntry);
        capCommunicationsInBackground(patient.id);
        details = `Scheduled message to ${patient.phone}: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`;
      } else if (step.startsWith("Send SMS:") || step === "Send Pending Bill SMS" || step === "Send SMS Payment Reminder") {
        if (!patient) throw new Error("Missing patient context");

        let text = "";
        if (step.startsWith("Send SMS:")) {
          text = step.replace("Send SMS:", "").trim();
          text = resolveCustomMessage(text, patient, context);
        } else {
          const amountStr = context.invoice ? `$${context.invoice.amount}` : "$150";
          text = `Dear ${patient.name}, an invoice of ${amountStr} is pending for payment. Please settle at your earliest convenience.`;
        }
        const timestamp = new Date(Date.now() + accumulatedDelayMs).toLocaleDateString("en-US") + " " + new Date(Date.now() + accumulatedDelayMs).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });

        const logEntry: CommunicationLog = {
          id: `com-auto-wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          patientId: patient.id,
          type: 'sms',
          channel: 'sms',
          direction: 'sent',
          content: text,
          timestamp,
          status: 'delivered'
        } as CommunicationLog;

        await db.communications.put(logEntry);
        capCommunicationsInBackground(patient.id);
        details = `Logged SMS to ${patient.phone}: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`;
      } else if (step === "Create Staff Task" || step === "Create Physician Follow-up Task") {
        if (!patient) throw new Error("Missing patient context");

        const followUpDate = new Date(Date.now() + accumulatedDelayMs).toISOString().split('T')[0];
        const doctorId = patient.doctorAssignedId || 'doc-1';
        const doctorName = patient.doctorAssignedName || 'Dr. Sarah Connor';

        await dbSaveFollowUp({
          patientId: patient.id,
          patientName: patient.name,
          age: patient.age,
          phone: patient.phone,
          lastVisitDate: patient.lastVisit || new Date().toISOString().split('T')[0],
          followUpDate,
          doctorId,
          doctorName,
          status: 'Pending',
          customMessage: `Automated follow-up task generated by workflow: ${wf.name}`
        });
        details = `Created follow-up task for ${followUpDate} with ${doctorName}`;
      } else if (step.startsWith("Send Email:") || step === "Send Email: Prescription" || step === "Send Email: Welcome") {
        if (!patient) throw new Error("Missing patient context");
        let text = "";
        if (step.startsWith("Send Email:")) {
          text = step.replace("Send Email:", "").trim();
          text = resolveCustomMessage(text, patient, context);
        } else if (step === "Send Email: Prescription") {
          text = `Dear ${patient.name}, please find attached your prescription details.`;
        } else {
          text = `Dear ${patient.name}, welcome to OnlyClinic. We are pleased to have you register with us.`;
        }
        
        const timestamp = new Date(Date.now() + accumulatedDelayMs).toLocaleDateString("en-US") + " " + new Date(Date.now() + accumulatedDelayMs).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
        
        await db.communications.put({
          id: `com-auto-wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          patientId: patient.id,
          type: 'email',
          channel: 'email',
          direction: 'sent',
          content: text,
          timestamp,
          status: 'delivered'
        });
        details = `Logged Email notification to ${patient.email || 'patient email'} (simulated)`;
      } else if (step.startsWith("Internal: Add Tag =")) {
        if (!patient) throw new Error("Missing patient context");
        const tag = step.replace("Internal: Add Tag =", "").trim();
        details = `Added tag "${tag}" to patient registry profile (simulated).`;
      } else if (step.startsWith("Internal: Remove Tag =") || step === "Internal: Remove Tag") {
        details = `Cleared patient tags from registry record (simulated).`;
      } else if (step === "Internal: Auto-schedule Next Follow-up") {
        if (!patient) throw new Error("Missing patient context");
        const followUpDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await dbSaveFollowUp({
          patientId: patient.id,
          patientName: patient.name,
          age: patient.age,
          phone: patient.phone,
          lastVisitDate: patient.lastVisit || new Date().toISOString().split('T')[0],
          followUpDate,
          doctorId: patient.doctorAssignedId || 'doc-1',
          doctorName: patient.doctorAssignedName || 'Dr. Sarah Connor',
          status: 'Pending',
          customMessage: `Automated next follow-up scheduled by workflow.`
        });
        details = `Auto-scheduled next follow-up task for ${followUpDate}.`;
      } else if (step === "Internal: Block WhatsApp Communication") {
        if (!patient) throw new Error("Missing patient context");
        patient.whatsappOptIn = false;
        await db.patients.put(patient);
        details = `Blocked WhatsApp communication (Opt-out) for ${patient.name}`;
      } else if (step === "Internal: Unblock WhatsApp Communication") {
        if (!patient) throw new Error("Missing patient context");
        patient.whatsappOptIn = true;
        await db.patients.put(patient);
        details = `Unblocked WhatsApp communication (Opt-in) for ${patient.name}`;
      } else if (step.startsWith("Filter: Language")) {
        if (!patient) throw new Error("Missing patient context");
        const requiredLang = step.includes("=") ? step.split("=")[1].trim() : "English";
        if (patient.preferredLanguage !== requiredLang) {
          details = `Filtered out patient ${patient.name}: Preferred language '${patient.preferredLanguage}' != '${requiredLang}'`;
        } else {
          details = `Passed language filter (${requiredLang}) for ${patient.name}`;
        }
      } else if (step.startsWith("Internal: Set Triage Priority")) {
        if (!patient) throw new Error("Missing patient context");
        const priority = step.includes("=") ? step.split("=")[1].trim() : "High";
        details = `Assigned Triage Priority '${priority}' to patient record ${patient.name}`;
      } else if (step.startsWith("Trigger Webhook")) {
        const targetUrl = step.includes(":") ? step.split(":").slice(1).join(":").trim() : "https://api.clinic-webhook.com/event";
        details = `Dispatched external HTTP POST webhook event to ${targetUrl}`;
      }
    } catch (err: any) {
      success = false;
      errMsg = err.message || String(err);
    }

    if (onStepComplete) {
      onStepComplete(step, success ? 'success' : 'failed', errMsg || undefined, details || undefined);
    }
  }
}
