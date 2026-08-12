"use client"

import * as React from "react"
import { 
  dbGetPatients, 
  dbAddMultipleCommunicationLogs, 
  dbMarkFollowUpsAsContacted,
  type Patient
} from "@/lib/db"
import { WHATSAPP_API_URL } from "./utils"

export interface WhatsAppChat {
  id: string
  unreadCount: number
  name: string
  conversationTimestamp: number
  profilePic?: string
  profilePicError?: boolean
}

export interface WhatsAppContact {
  id: string
  name: string
  verifiedName: string | null
  profilePic?: string
  profilePicError?: boolean
}

export interface WhatsAppMessage {
  id: string
  direction: "sent" | "received"
  content: string
  mediaUrl?: string | null
  mediaType?: string | null
  timestamp: string
  timestampRaw?: number
  status: "sent" | "delivered" | "read" | "failed"
}

export interface ScheduledMessage {
  id: string
  phone: string
  text: string
  sendAt: string
  patientName: string
  status: "pending" | "sent" | "failed" | "cancelled"
  error?: string
  createdAt: string
}

interface WhatsAppContextType {
  status: 'disconnected' | 'connecting' | 'qr' | 'connected' | 'offline'
  qr: string | null
  user: { id: string; name: string } | null
  chats: WhatsAppChat[]
  contacts: WhatsAppContact[]
  messages: WhatsAppMessage[]
  scheduledMessages: ScheduledMessage[]
  activeJid: string | null
  setActiveJid: (jid: string | null) => void
  sendMessage: (phoneOrJid: string, text: string) => Promise<boolean>
  connect: () => Promise<void>
  logout: () => Promise<void>
  refreshState: () => Promise<void>
  triggerDbSync: () => void
}

const WhatsAppContext = React.createContext<WhatsAppContextType | undefined>(undefined)

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<'disconnected' | 'connecting' | 'qr' | 'connected' | 'offline'>('disconnected')
  const [qr, setQr] = React.useState<string | null>(null)
  const [user, setUser] = React.useState<{ id: string; name: string } | null>(null)
  const [chats, setChats] = React.useState<WhatsAppChat[]>([])
  const [contacts, setContacts] = React.useState<WhatsAppContact[]>([])
  const [messages, setMessages] = React.useState<WhatsAppMessage[]>([])
  const [scheduledMessages, setScheduledMessages] = React.useState<ScheduledMessage[]>([])
  const [activeJid, setActiveJid] = React.useState<string | null>(null)
  const [syncCounter, setSyncCounter] = React.useState(0)

  // Sync state fetcher
  const refreshState = React.useCallback(async () => {
    try {
      const url = activeJid
        ? `${WHATSAPP_API_URL}/api/sync-state?jid=${encodeURIComponent(activeJid)}`
        : `${WHATSAPP_API_URL}/api/sync-state`

      const res = await fetch(url)
      if (!res.ok) throw new Error("Offline")

      const data = await res.json()
      setStatus(data.status)
      setQr(data.qr || null)
      setUser(data.user || null)
      setChats(data.chats || [])
      setContacts(data.contacts || [])
      setScheduledMessages(data.scheduled || [])

      if (activeJid) {
        setMessages(data.messages || [])
      } else {
        setMessages([])
      }
    } catch (err) {
      setStatus('offline')
      setQr(null)
      setUser(null)
      setChats([])
      setContacts([])
      setMessages([])
    }
  }, [activeJid])

  // Single polling loop: runs every 3 seconds when provider is mounted
  React.useEffect(() => {
    refreshState()
    const interval = setInterval(refreshState, 3000)
    return () => clearInterval(interval)
  }, [refreshState])

  // Helper to match JID to CRM patient
  const matchPhoneToJid = (phone: string, jid: string): boolean => {
    const p = phone.replace(/[^0-9]/g, "")
    const j = jid.split("@")[0].replace(/[^0-9]/g, "")
    if (!p || p.length < 7 || !j || j.length < 7) return false
    const minLength = Math.min(p.length, j.length)
    return p.slice(-minLength) === j.slice(-minLength)
  }

  // Sync active message list to CRM IndexedDB automatically in background
  React.useEffect(() => {
    if (!activeJid || messages.length === 0) return

    const syncMessagesToCrm = async () => {
      try {
        const patients = await dbGetPatients()
        const matchedPatient = patients.find(p => matchPhoneToJid(p.phone, activeJid))
        
        if (matchedPatient) {
          const newLogs: any[] = []
          messages.forEach((m) => {
            const alreadyExists = matchedPatient.communications.some(
              (c: any) => c.whatsappMessageId ? c.whatsappMessageId === m.id : (c.content === m.content && c.direction === m.direction)
            )
            if (!alreadyExists) {
              newLogs.push({
                type: "whatsapp",
                direction: m.direction,
                content: m.content,
                status: m.status,
                mediaUrl: m.mediaUrl || null,
                mediaType: m.mediaType || null,
                whatsappMessageId: m.id || null
              })
            }
          })

          if (newLogs.length > 0) {
            console.log(`[WhatsAppSync] Syncing ${newLogs.length} new messages for patient ${matchedPatient.name}`)
            await dbAddMultipleCommunicationLogs(matchedPatient.id, newLogs)
            const hasSent = newLogs.some(l => l.direction === 'sent')
            if (hasSent) {
              await dbMarkFollowUpsAsContacted(matchedPatient.id)
            }
          }
        }
      } catch (err) {
        console.warn("[WhatsAppSync] Error syncing messages to CRM DB:", err)
      }
    }

    syncMessagesToCrm()
  }, [activeJid, messages, syncCounter])

  const triggerDbSync = () => {
    setSyncCounter(prev => prev + 1)
  }

  // Connect helper
  const connect = async () => {
    try {
      await fetch(`${WHATSAPP_API_URL}/api/connect`, { method: "POST" })
      refreshState()
    } catch (err) {
      console.error("Failed to trigger WhatsApp connect:", err)
    }
  }

  // Logout helper
  const logout = async () => {
    try {
      await fetch(`${WHATSAPP_API_URL}/api/logout`, { method: "POST" })
      refreshState()
    } catch (err) {
      console.error("Failed to trigger WhatsApp logout:", err)
    }
  }

  // Send message helper
  const sendMessage = async (phoneOrJid: string, text: string): Promise<boolean> => {
    try {
      const cleanPhone = phoneOrJid.split("@")[0].replace(/[^0-9]/g, "")
      const res = await fetch(`${WHATSAPP_API_URL}/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, text })
      })
      if (res.ok) {
        refreshState()
        return true
      }
    } catch (err) {
      console.error("Failed to send WhatsApp message via API:", err)
    }
    return false
  }

  return (
    <WhatsAppContext.Provider
      value={{
        status,
        qr,
        user,
        chats,
        contacts,
        messages,
        scheduledMessages,
        activeJid,
        setActiveJid,
        sendMessage,
        connect,
        logout,
        refreshState,
        triggerDbSync
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  )
}

export function useWhatsApp() {
  const context = React.useContext(WhatsAppContext)
  if (context === undefined) {
    throw new Error("useWhatsApp must be used within a WhatsAppProvider")
  }
  return context
}
