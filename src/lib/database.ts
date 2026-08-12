// src/lib/database.ts
import Dexie, { type Table } from 'dexie';

export interface PatientVitals {
  date: string;
  bp: string;
  heartRate: number;
  temp: number;
}

export interface MedicalRecord {
  date: string;
  diagnosis: string;
  doctor: string;
  treatment: string;
  notes: string;
}

export interface Prescription {
  name: string;
  dosage: string;
  frequency: string;
  status: 'Active' | 'Completed' | 'Discontinued';
}

export interface CommunicationLog {
  id: string;
  patientId?: string;
  type: 'whatsapp' | 'sms' | 'email';
  channel?: 'whatsapp' | 'sms' | 'email';
  direction: 'sent' | 'received';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  mediaType?: string;
  whatsappMessageId?: string | null;
}

export interface PatientAddress {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  phone: string;
  alternatePhone: string;
  email: string;
  addressInfo: PatientAddress;
  bloodGroup: string;
  existingConditions: string;
  allergies: string;
  doctorAssignedId: string;
  doctorAssignedName: string;
  preferredLanguage: 'English' | 'Telugu' | 'Hindi' | 'Tamil' | 'Kannada' | 'Malayalam' | 'Marathi' | 'Bengali' | 'Punjabi';
  preferredContactMethod: 'WhatsApp' | 'SMS' | 'Email' | 'Call';
  whatsappOptIn: boolean;
  lastVisit: string;
  vitals: PatientVitals[];
  medicalHistory: MedicalRecord[];
  prescriptions: Prescription[];
  communications: CommunicationLog[]; // Nested communications for backwards compatibility
  enableAutomatedFollowUp?: boolean;
  customFollowUpDays?: number;
  customFollowUpMessage?: string;
  archived?: boolean;
  createdAt?: string; // Add optional createdAt for the index
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  availability: 'Available' | 'Busy' | 'On Leave';
  avatar: string;
  email: string;
  activePatients: number;
  role: 'Administrator' | 'Physician' | 'Receptionist';
  attendanceRate: number;
  salary: number;
  salaryStatus: 'Paid' | 'Unpaid';
  status: 'Available' | 'Busy' | 'On Leave'; // Map database index "status"
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  department: string;
  status: 'Scheduled' | 'Confirmed' | 'Checked In' | 'In Consultation' | 'Completed' | 'Cancelled' | 'No Show';
  notes: string;
  cost: number;
}

export interface FollowUp {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  phone: string;
  lastVisitDate: string;
  followUpDate: string;
  followUpTime?: string;
  doctorId: string;
  doctorName: string;
  status: 'Pending' | 'Contacted' | 'Completed' | 'Overdue';
  customMessage?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  patientId: string; // Add patientId for DB table index
  patientName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  createdAt?: string; // Add optional createdAt for index
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  trigger: string;
  steps: string[];
  status: 'Active' | 'Paused';
  runCount: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  staffName: string;
  staffRole: string;
  actorRole?: string; // map to actorRole index
  entityType?: string; // map to entityType index
  patientId: string;
  patientName: string;
  action: string;
}

export interface AutoReplyRule {
  id: string;
  keyword: string;
  replyText: string;
  isActive: boolean;
}

export interface ClinicOrg {
  id: string;
  name: string;
  domain: string;
  status: 'Active' | 'Suspended';
  subscriptionPlan: 'Trial' | 'Professional' | 'Enterprise';
  createdAt: string;
}

export interface AppSetting {
  key: string;
  value: any;
}

export interface TrashedPatient extends Patient {
  deletedAt: string;   // ISO timestamp when moved to trash
  deletedBy: string;   // Name/role of actor who deleted
  trashedId?: string;  // Dexie auto-generated PK in trashedPatients table
}

export class AegisDB extends Dexie {
  patients!: Table<Patient, string>;
  doctors!: Table<Doctor, string>;
  invoices!: Table<Invoice, string>;
  auditLogs!: Table<AuditLogEntry, string>;
  communications!: Table<CommunicationLog, string>;
  appSettings!: Table<AppSetting, string>;
  trashedPatients!: Table<TrashedPatient, string>;

  constructor() {
    super('AegisDB');
    this.version(1).stores({
      patients: '++id, phone, email, name, preferredLanguage, createdAt, [name+phone]',
      doctors: '++id, name, status, specialty',
      invoices: '++id, patientId, status, createdAt',
      auditLogs: '++id, timestamp, actorRole, entityType',
      communications: '++id, patientId, channel, timestamp',
      appSettings: '&key'
    });
    // Version 2: Add trashedPatients table for soft-delete with 30-day expiry
    this.version(2).stores({
      patients: '++id, phone, email, name, preferredLanguage, createdAt, [name+phone]',
      doctors: '++id, name, status, specialty',
      invoices: '++id, patientId, status, createdAt',
      auditLogs: '++id, timestamp, actorRole, entityType',
      communications: '++id, patientId, channel, timestamp',
      appSettings: '&key',
      trashedPatients: '++trashedId, id, deletedAt, phone, name'
    });
  }
}

export const db = new AegisDB();
