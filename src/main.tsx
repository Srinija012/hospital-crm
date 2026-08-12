import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './app/globals.css'
import { AuthWrapper } from './components/auth-wrapper'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/toast'

// Import all pages
import Dashboard from './app/page'
import LoginPage from './app/login/page'
import PatientsPage from './app/patients/page'
import AppointmentsPage from './app/appointments/page'
import FollowUpsPage from './app/follow-ups/page'
import CommunicationInbox from './app/communication/page'
import WhatsAppAutomation from './app/whatsapp-automation/page'
import BillingPage from './app/billing/page'
import DoctorsPage from './app/doctors/page'
import AdminPanel from './app/admin-panel/page'
import ReportsPage from './app/reports/page'
import AutomationBuilder from './app/automation-builder/page'
import SettingsPage from './app/settings/page'
import PatientPortal from './app/patient-portal/page'
import TrashBinPage from './app/trash/page'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AuthWrapper>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/follow-ups" element={<FollowUpsPage />} />
              <Route path="/communication" element={<CommunicationInbox />} />
              <Route path="/whatsapp-automation" element={<WhatsAppAutomation />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/admin-panel" element={<AdminPanel />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/automation-builder" element={<AutomationBuilder />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/patient-portal" element={<PatientPortal />} />
              <Route path="/trash" element={<TrashBinPage />} />
              {/* Fallback to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthWrapper>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
