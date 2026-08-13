"use client"

import * as React from "react"
import {
  Search,
  Send,
  MessageSquare,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  UserPlus,
  AlertCircle,
  WifiOff,
  Check,
  CheckCheck,
  Circle,
  ExternalLink,
  ArrowLeft,
  Activity,
  HeartPulse
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import {
  dbGetPatients,
  dbAddCommunicationLog,
  dbAddMultipleCommunicationLogs,
  dbMarkFollowUpsAsContacted,
  Patient
} from "@/lib/db"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/database"
import { useWhatsApp } from "@/lib/whatsapp-context"

const AVATAR_COLORS: [string, string][] = [
  ["#25D366", "#128C7E"], // WhatsApp green
  ["#34B7F1", "#0a85c2"], // blue
  ["#AF4BDF", "#8e24aa"], // purple
  ["#FF6B6B", "#e53935"], // red
  ["#FFA726", "#F57C00"], // orange
  ["#26C6DA", "#00838F"], // teal
  ["#EC407A", "#AD1457"], // pink
  ["#66BB6A", "#388E3C"], // dark green
]


function getAvatarColor(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// Format time as WhatsApp does: Today → 10:30 AM, else → DD/MM/YYYY
function formatChatTime(ts: number): string {
  if (!ts) return ""
  const d = new Date(ts * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

// Format message timestamps inside the chat
function formatMsgTime(timestamp: string): string {
  if (!timestamp) return ""
  // timestamp is like "6/8/2026 10:30 AM"
  const parts = timestamp.split(" ")
  if (parts.length >= 3) return parts[1] + " " + parts[2]
  return timestamp
}

// Clean phone number from JID
function jidToPhone(jid: string): string {
  return jid?.split("@")[0] || jid
}

// Format phone number nicely: +1 (234) 567-8900
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 12) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  if (digits.length === 11) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  return `+${digits}`
}

export default function CommunicationCenter() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [chatMessage, setChatMessage] = React.useState("")
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const [activeWaChat, setActiveWaChat] = React.useState<any | null>(null)
  const [sending, setSending] = React.useState(false)

  const {
    status: waStatus,
    user: waUser,
    chats: waChats,
    contacts: waContacts,
    messages: waMessages,
    setActiveJid,
    sendMessage,
    triggerDbSync
  } = useWhatsApp()

  React.useEffect(() => {
    setActiveJid(activeWaChat?.id || null)
  }, [activeWaChat, setActiveJid])

  const patients = useLiveQuery(async () => {
    const list = await db.patients.toArray();
    await Promise.all(
      list.map(async (p) => {
        try {
          const comms = await db.communications.where('patientId').equals(p.id).toArray();
          comms.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          p.communications = comms;
        } catch (err) {
          console.warn(`Failed to fetch communications for patient ${p.id}:`, err);
          p.communications = [];
        }
      })
    );
    return list;
  }) || [];



  // Auto-scroll messages to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [waMessages])



  // Pre-compute JID-to-patient matches to eliminate render-loop regex evaluation overhead
  const jidToPatientCache = React.useMemo(() => {
    const cache: Record<string, Patient> = {}
    const processItem = (jid: string) => {
      if (!jid) return
      const cleanJid = jid.split("@")[0].replace(/[^0-9]/g, "")
      const match = patients.find(p => {
        const cleanPhone = p.phone.replace(/[^0-9]/g, "")
        if (!cleanPhone || cleanPhone.length < 7) return false
        const minLength = Math.min(cleanPhone.length, cleanJid.length)
        return cleanPhone.slice(-minLength) === cleanJid.slice(-minLength)
      })
      if (match) {
        cache[jid] = match
      }
    }
    waChats.forEach(c => processItem(c.id))
    waContacts.forEach(c => processItem(c.id))
    return cache
  }, [patients, waChats, waContacts])

  // Instant constant-time dictionary lookup
  const getPatientForJid = React.useCallback((jid: string): Patient | null => {
    if (!jid) return null
    return jidToPatientCache[jid] || null
  }, [jidToPatientCache])

  // Resolve display name for a chat: prefer CRM patient name, then baileys chat.name, then phone
  const getChatDisplayName = (chat: any): string => {
    const patient = getPatientForJid(chat.id)
    if (patient) return patient.name
    if (chat.name && chat.name !== jidToPhone(chat.id)) return chat.name
    return formatPhone(jidToPhone(chat.id))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim() || !activeWaChat || sending) return
    const textToSend = chatMessage
    setChatMessage("")
    setSending(true)

    try {
      const success = await sendMessage(activeWaChat.id, textToSend)
      if (success) {
        const matchedPatient = getPatientForJid(activeWaChat.id)
        if (matchedPatient) {
          await dbAddCommunicationLog(matchedPatient.id, {
            type: "whatsapp", direction: "sent", content: textToSend, status: "sent"
          })
          await dbMarkFollowUpsAsContacted(matchedPatient.id)
          triggerDbSync()
        }
      }
    } catch (err) {
      console.warn("Failed to send WhatsApp message:", err)
    } finally {
      setSending(false)
    }
  }

  const filteredChats = waChats.filter(c => {
    const name = getChatDisplayName(c).toLowerCase()
    const phone = jidToPhone(c.id)
    return name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm)
  })

  const filteredContacts = waContacts.filter(c => {
    const name = (c.name || '').toLowerCase()
    const phone = jidToPhone(c.id)
    const alreadyInChats = waChats.some(wc => wc.id === c.id)
    const matchesSearch = searchTerm.trim()
      ? (name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm))
      : true
    return !alreadyInChats && matchesSearch
  })

  const activePatient = activeWaChat ? getPatientForJid(activeWaChat.id) : null
  const activeName = activeWaChat ? getChatDisplayName(activeWaChat) : ""
  const [avatarBg, avatarText] = activeName ? getAvatarColor(activeName) : ["#25D366", "#128C7E"]

  return (
    <div className="h-[calc(100vh-115px)] flex border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300"
      style={{ background: "var(--card)" }}>

      {/* ───────────── LEFT SIDEBAR — Chat List ───────────── */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-border/60"
        style={{ background: "var(--card)" }}>

        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40"
          style={{ background: "var(--muted)" }}>
          <div className="flex items-center gap-3">
            {/* Self avatar */}
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
              {waUser?.name?.charAt(0) || "O"}
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">{waUser?.name || "OnlyClinic"}</div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {waStatus === "connected" ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <Circle className="h-2 w-2 fill-emerald-500" /> Online
                  </span>
                ) : "WhatsApp Business"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {waStatus === "connected" && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] font-bold px-1.5 py-0.5">
                LIVE
              </Badge>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-full text-xs bg-muted/60 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {waStatus !== "connected" ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <WifiOff className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">WhatsApp Not Connected</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Scan the QR code to link your WhatsApp account
                </p>
              </div>
              <Link to="/whatsapp-automation">
                <Button size="sm" className="h-8 text-xs cursor-pointer rounded-full px-5">
                  Connect WhatsApp
                </Button>
              </Link>
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map(chat => {
              const isActive = activeWaChat?.id === chat.id
              const patient = getPatientForJid(chat.id)
              const displayName = getChatDisplayName(chat)
              const [bg, fg] = getAvatarColor(displayName)
              const phoneDisplay = formatPhone(jidToPhone(chat.id))
              const timeDisplay = formatChatTime(chat.conversationTimestamp)

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveWaChat(chat)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/20 relative
                    ${isActive
                      ? "bg-primary/8 dark:bg-primary/10"
                      : "hover:bg-muted/40"
                    }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {chat.profilePic ? (
                      <img
                        src={chat.profilePic}
                        alt={displayName}
                        className="h-12 w-12 rounded-full object-cover shadow-sm"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white text-base font-bold shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${bg}, ${fg})` }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {patient && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                        <Check className="h-2 w-2 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground truncate pr-2">{displayName}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-muted-foreground truncate pr-2">
                        {patient ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ CRM Patient · {phoneDisplay}
                          </span>
                        ) : phoneDisplay}
                      </span>
                      {chat.unreadCount > 0 && (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : null}

          {/* Render Address Book Contacts if present */}
          {waStatus === "connected" && filteredContacts.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/30 border-y border-border/10 tracking-wider">
                Address Book Contacts ({filteredContacts.length})
              </div>
              {filteredContacts.map(contact => {
                const displayName = contact.name || jidToPhone(contact.id)
                const [bg, fg] = getAvatarColor(displayName)
                const phoneDisplay = formatPhone(jidToPhone(contact.id))

                return (
                  <div
                    key={contact.id}
                    onClick={() => setActiveWaChat({
                      id: contact.id,
                      name: displayName,
                      unreadCount: 0,
                      conversationTimestamp: Math.floor(Date.now() / 1000)
                    })}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/20"
                  >
                    <div className="relative shrink-0">
                      {contact.profilePic ? (
                        <img
                          src={contact.profilePic}
                          alt={displayName}
                          className="h-12 w-12 rounded-full object-cover shadow-sm"
                        />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center text-white text-base font-bold shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${bg}, ${fg})` }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{displayName}</div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">{phoneDisplay}</div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {waStatus === "connected" && filteredChats.length === 0 && filteredContacts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6 py-12">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground font-semibold">No contacts or chats found</p>
            </div>
          )}
        </div>
      </div>

      {/* ───────────── CENTER — Chat Window ───────────── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23e5ddd5' width='400' height='400'/%3E%3C/svg%3E")`,
        backgroundSize: "cover"
      }}>
        {activeWaChat ? (
          <>
            {/* Chat Header — WhatsApp style */}
            <div className="flex items-center justify-between px-4 py-2.5 shadow-sm shrink-0 z-10"
              style={{ background: "var(--muted)" }}>
              <div className="flex items-center gap-3">
                <button className="lg:hidden text-muted-foreground" onClick={() => setActiveWaChat(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {/* Contact avatar */}
                {activeWaChat.profilePic ? (
                  <img
                    src={activeWaChat.profilePic}
                    alt={activeName}
                    className="h-10 w-10 rounded-full object-cover shadow-sm shrink-0"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
                    style={{ background: `linear-gradient(135deg, ${avatarBg}, ${avatarText})` }}
                  >
                    {activeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold text-foreground leading-tight">{activeName}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {formatPhone(jidToPhone(activeWaChat.id))}
                    {activePatient && (
                      <span className="ml-2 text-emerald-500 font-semibold">· CRM Registered</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activePatient && (
                  <Link to={`/patients?id=${activePatient.id}`}>
                    <Button size="sm" variant="ghost"
                      className="h-8 text-[10px] font-semibold gap-1 text-primary cursor-pointer">
                      <ExternalLink className="h-3.5 w-3.5" /> View Patient
                    </Button>
                  </Link>
                )}
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground cursor-pointer" title="Voice Call">
                  <Phone className="h-4.5 w-4.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground cursor-pointer" title="Video Call">
                  <Video className="h-4.5 w-4.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground cursor-pointer">
                  <MoreVertical className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
                backgroundSize: "24px 24px",
                backgroundColor: "var(--background)"
              }}>
              {waMessages.length > 0 ? (
                <>
                  {/* Date separator */}
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] font-semibold px-3 py-1 rounded-full shadow-sm"
                      style={{ background: "rgba(11, 20, 26, 0.08)", color: "var(--muted-foreground)" }}>
                      TODAY
                    </span>
                  </div>

                  {waMessages.map((msg, i) => {
                    const isSent = msg.direction === "sent"
                    const timeStr = formatMsgTime(msg.timestamp)
                    const prevMsg = i > 0 ? waMessages[i - 1] : null
                    const isFirstInGroup = !prevMsg || prevMsg.direction !== msg.direction

                    return (
                      <div key={msg.id || i} className={`flex ${isSent ? "justify-end" : "justify-start"} mb-0.5`}>
                        <div className={`relative max-w-[65%] min-w-[80px] px-3 py-2 rounded-lg text-sm shadow-sm
                          ${isSent
                            ? "rounded-tr-none text-white"
                            : "rounded-tl-none text-foreground border border-border/30"
                          }
                          ${isFirstInGroup ? "mt-2" : "mt-0.5"}
                        `}
                          style={{
                            background: isSent ? "#25D366" : "var(--card)",
                          }}>
                          {/* Tail */}
                          {isFirstInGroup && (
                            <div
                              className={`absolute top-0 w-3 h-3 ${isSent ? "-right-2" : "-left-2"}`}
                              style={{
                                width: 0, height: 0,
                                borderStyle: "solid",
                                borderWidth: isSent ? "0 0 10px 10px" : "0 10px 10px 0",
                                borderColor: isSent
                                  ? "transparent transparent transparent #25D366"
                                  : `transparent var(--card) transparent transparent`
                              }}
                            />
                          )}
                          {msg.mediaUrl ? (
                            msg.mediaType === "image" ? (
                              <div className="mb-1.5 rounded-lg overflow-hidden max-w-[260px] border border-black/5">
                                <img
                                  src={msg.mediaUrl}
                                  alt="WhatsApp Image"
                                  className="w-full h-auto object-cover max-h-[260px] cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(msg.mediaUrl || undefined, '_blank')}
                                />
                              </div>
                            ) : msg.mediaType === "video" ? (
                              <div className="mb-1.5 rounded-lg overflow-hidden max-w-[260px] border border-black/5 bg-black/10">
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  className="w-full h-auto max-h-[260px]"
                                />
                              </div>
                            ) : null
                          ) : null}
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words pr-12">
                            {msg.content}
                          </p>
                          {/* Timestamp + ticks */}
                          <div className={`absolute bottom-1.5 right-2.5 flex items-center gap-1 ${isSent ? "text-white/70" : "text-muted-foreground"}`}>
                            <span className="text-[10px] font-medium">{timeStr}</span>
                            {isSent && (
                              msg.status === "read"
                                ? <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                                : msg.status === "delivered"
                                  ? <CheckCheck className="h-3.5 w-3.5" />
                                  : <Check className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-primary/50" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Start a conversation</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send a message to {activeName}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar — WhatsApp style */}
            <form onSubmit={handleSend}
              className="flex items-center gap-2 px-4 py-3 shrink-0 border-t border-border/30"
              style={{ background: "var(--muted)" }}>
              <Button type="button" size="icon" variant="ghost"
                className="h-10 w-10 text-muted-foreground shrink-0 cursor-pointer rounded-full">
                <Smile className="h-5 w-5" />
              </Button>
              <Button type="button" size="icon" variant="ghost"
                className="h-10 w-10 text-muted-foreground shrink-0 cursor-pointer rounded-full">
                <Paperclip className="h-5 w-5" />
              </Button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Type a message"
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  className="w-full h-10 px-4 rounded-full text-sm bg-card border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              {chatMessage.trim() ? (
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending}
                  className="h-10 w-10 shrink-0 cursor-pointer rounded-full"
                  style={{ background: "#25D366" }}
                  title="Send message"
                >
                  <Send className="h-4.5 w-4.5 text-white" />
                </Button>
              ) : (
                <Button type="button" size="icon" variant="ghost"
                  className="h-10 w-10 text-muted-foreground shrink-0 cursor-pointer rounded-full">
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </form>
          </>
        ) : (
          /* No chat selected — WhatsApp Web welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
            <div className="h-24 w-24 rounded-full border-4 border-muted flex items-center justify-center"
              style={{ background: "var(--muted)" }}>
              <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">OnlyClinic WhatsApp Inbox</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                Send and receive messages from your registered patients. Select a conversation from the left to begin.
              </p>
            </div>
            {waStatus !== "connected" && (
              <Link to="/whatsapp-automation">
                <Button className="rounded-full px-6 cursor-pointer" style={{ background: "#25D366" }}>
                  Connect WhatsApp to Start
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ───────────── RIGHT PANEL — Patient Info ───────────── */}
      {activeWaChat && (
        <div className="w-[280px] shrink-0 border-l border-border/60 flex flex-col overflow-y-auto max-xl:hidden"
          style={{ background: "var(--card)" }}>

          {activePatient ? (
            <>
              {/* Contact Header */}
              <div className="flex flex-col items-center gap-2 px-5 pt-8 pb-5 border-b border-border/40"
                style={{ background: "var(--muted)" }}>
                {activeWaChat.profilePic ? (
                  <img
                    src={activeWaChat.profilePic}
                    alt={activePatient.name}
                    className="h-20 w-20 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md"
                    style={{ background: `linear-gradient(135deg, ${avatarBg}, ${avatarText})` }}
                  >
                    {activeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <h4 className="text-sm font-bold text-foreground">{activePatient.name}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{activePatient.phone}</p>
                  <Badge className="mt-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold hover:bg-emerald-500/10">
                    CRM Patient · {activePatient.id}
                  </Badge>
                </div>
              </div>

              {/* Patient Info Grid */}
              <div className="p-4 space-y-3 text-xs">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Patient Details</h5>
                {[
                  ["Age", `${activePatient.age} yrs`],
                  ["Gender", activePatient.gender],
                  ["Blood Group", activePatient.bloodGroup],
                  ["Language", activePatient.preferredLanguage],
                  ["Doctor", activePatient.doctorAssignedName || "Unassigned"],
                  ["Last Visit", activePatient.lastVisit],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground font-medium">{label}</span>
                    <span className="font-semibold text-foreground/80 text-right">{value}</span>
                  </div>
                ))}

                {/* Allergies alert */}
                {activePatient.allergies && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-500/8 border border-rose-500/20 text-[10px] text-rose-600 font-semibold flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Allergies: {activePatient.allergies}
                  </div>
                )}
              </div>

              {/* Vitals */}
              {activePatient.vitals.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" /> Latest Vitals
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["BP", activePatient.vitals[0].bp, "mmHg", "blue"],
                      ["HR", `${activePatient.vitals[0].heartRate}`, "bpm", "emerald"],
                    ].map(([label, val, unit, color]) => (
                      <div key={label} className={`p-2 rounded-xl text-center bg-${color}-500/8 border border-${color}-500/20`}>
                        <div className={`text-[9px] font-bold text-${color}-600 uppercase`}>{label}</div>
                        <div className="text-sm font-extrabold text-foreground">{val}</div>
                        <div className="text-[9px] text-muted-foreground">{unit}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Diagnosis */}
              {activePatient.medicalHistory.length > 0 && (
                <div className="px-4 pb-4 space-y-2">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-secondary" /> Recent Diagnosis
                  </h5>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/30 text-[11px] text-foreground/80 leading-relaxed">
                    {activePatient.medicalHistory[0].diagnosis}
                  </div>
                </div>
              )}

              {/* View Full Profile button */}
              <div className="px-4 pb-5 mt-auto">
                <Link to={`/patients?id=${activePatient.id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full text-xs cursor-pointer gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Full Patient File
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            /* Unknown contact panel */
            <div className="p-5 space-y-5">
              <div className="flex flex-col items-center gap-3 pt-6 pb-4 border-b border-border/40">
                {activeWaChat.profilePic ? (
                  <img
                    src={activeWaChat.profilePic}
                    alt={activeName}
                    className="h-20 w-20 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md"
                    style={{ background: `linear-gradient(135deg, ${avatarBg}, ${avatarText})` }}
                  >
                    {activeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <h4 className="text-sm font-bold text-foreground">{activeName}</h4>
                  <p className="text-[11px] text-muted-foreground">{formatPhone(jidToPhone(activeWaChat.id))}</p>
                </div>
              </div>

              <div className="p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl space-y-2 text-xxs">
                <h5 className="font-bold text-amber-600 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Unregistered Contact
                </h5>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  This contact is not linked to any patient record in the CRM.
                </p>
                <Link to={`/patients?registerPhone=${encodeURIComponent(jidToPhone(activeWaChat.id))}`}>
                  <Button size="sm" className="w-full h-8 text-[11px] font-bold cursor-pointer mt-2 gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> Register as Patient
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
