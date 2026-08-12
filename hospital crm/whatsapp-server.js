const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

const mediaDir = path.join(__dirname, 'whatsapp-media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir);
}

// Intercept console outputs to quiet Baileys session / credentials output
const originalLog = console.log;
console.log = function(...args) {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  if (
    msg.includes('Closing session: SessionEntry') || 
    msg.includes('SessionEntry {') || 
    msg.includes('_chains:') ||
    msg.includes('registrationId:') ||
    msg.includes('currentRatchet:') ||
    msg.includes('pendingPreKey:')
  ) {
    return; // suppress noisy signal logs
  }
  originalLog.apply(console, args);
};

// Clean old media files (older than 2 days) to prevent disk space exhaustion
function cleanOldMedia() {
  try {
    const files = fs.readdirSync(mediaDir);
    const now = Date.now();
    const maxAge = 2 * 24 * 60 * 60 * 1000; // 2 days in ms
    let deletedCount = 0;
    files.forEach((file) => {
      const filePath = path.join(mediaDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    if (deletedCount > 0) {
      console.log(`[MediaCleanup] Deleted ${deletedCount} old media files.`);
    }
  } catch (err) {
    console.error('[MediaCleanup] Error during media cleanup:', err);
  }
}

// Start background media cleanup
cleanOldMedia();
setInterval(cleanOldMedia, 12 * 60 * 60 * 1000);

app.use(cors());
app.use(express.json());
app.use('/media', express.static(mediaDir));

const logger = pino({ level: 'silent' });
const sessionDir = path.join(__dirname, 'whatsapp-session');
const scheduledFile = path.join(__dirname, 'scheduled-messages.json');
const rulesFile = path.join(__dirname, 'autoreply-rules.json');
const chatsFile = path.join(__dirname, 'whatsapp-chats.json');
const messagesFile = path.join(__dirname, 'whatsapp-messages.json');
const contactsFile = path.join(__dirname, 'whatsapp-contacts.json');

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr' | 'connected'
let userInfo = null;
let isSyncingChats = false;

// Filter out status updates and newsletter broadcasts
function isChatJid(jid) {
  if (!jid) return false;
  if (jid === 'status@broadcast') return false;
  if (jid.endsWith('@newsletter')) return false;
  return true;
}

// Name resolution priority:
// 1. contact name from contactsCache (synced contacts / history sync)
// 2. chat name
// 3. raw phone number (fallback to let frontend format)
function resolveChatName(jid, chatName) {
  const contact = contactsCache.get(jid);
  if (contact && contact.name && contact.name !== jid.split('@')[0]) {
    return contact.name;
  }
  if (chatName && chatName !== jid.split('@')[0] && chatName !== jid) {
    return chatName;
  }
  return jid.split('@')[0];
}

// Ephemeral in-memory database mirroring the connected phone
const activeChats = new Map(); // Map<jid, chatMeta>
const contactsCache = new Map(); // Map<jid, contact>
const messagesStore = new Map(); // Map<jid, Message[]>
let autoReplyRules = [];

// Prunes messaging history to keep only the last 50 messages per contact JID.
// This prevents memory bloat and keeps the client UI fast.
function pruneMessages() {
  const maxMessages = 50;
  let pruned = false;
  for (const [jid, msgs] of messagesStore.entries()) {
    if (Array.isArray(msgs) && msgs.length > maxMessages) {
      messagesStore.set(jid, msgs.slice(-maxMessages));
      pruned = true;
    }
  }
  return pruned;
}

// Ensure scheduled messages file exists
if (!fs.existsSync(scheduledFile)) {
  fs.writeFileSync(scheduledFile, JSON.stringify([], null, 2));
}

// Ensure auto-reply rules file exists
if (!fs.existsSync(rulesFile)) {
  fs.writeFileSync(rulesFile, JSON.stringify([], null, 2));
} else {
  try {
    autoReplyRules = JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
  } catch (err) {
    console.error('Failed to parse autoreply-rules.json:', err);
  }
}

// Purge session database files, in-memory caches, media directory, and optionally credentials folder
function purgeSessionData({ includeCreds }) {
  console.log(`[Purge] Purging session data (includeCreds: ${includeCreds})...`);
  
  // Clear Maps
  activeChats.clear();
  contactsCache.clear();
  messagesStore.clear();
  
  // Delete legacy files if they exist on disk
  [chatsFile, messagesFile, contactsFile].forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`[Purge] Deleted legacy database file: ${file}`);
      } catch (err) {
        console.error(`[Purge] Failed to delete file ${file}:`, err);
      }
    }
  });

  // Recursively delete all files in the whatsapp-media cache directory
  if (fs.existsSync(mediaDir)) {
    try {
      const files = fs.readdirSync(mediaDir);
      files.forEach(file => {
        const filePath = path.join(mediaDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
      console.log('[Purge] Emptied whatsapp-media cache directory.');
    } catch (err) {
      console.error('[Purge] Failed to clear media directory:', err);
    }
  }

  // Delete credentials folder to force a new QR code on next connect
  if (includeCreds) {
    if (fs.existsSync(sessionDir)) {
      try {
        deleteFolderRecursive(sessionDir);
        console.log('[Purge] Deleted session credentials directory.');
      } catch (err) {
        console.error('[Purge] Failed to delete session credentials:', err);
      }
    }
  }
}

// Clean up legacy JSON databases and temp media on startup, preserving session credentials
purgeSessionData({ includeCreds: false });

// Phone to JID formatter
function formatJid(phone) {
  if (!phone) return null;
  if (phone.endsWith('@s.whatsapp.net')) return phone;
  const clean = phone.replace(/[^0-9]/g, '');
  return `${clean}@s.whatsapp.net`;
}

// Clean folder recursive
function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// Get extension from mime type
function getExtension(mimetype) {
  if (!mimetype) return 'bin';
  const parts = mimetype.split('/');
  if (parts.length > 1) {
    const ext = parts[1].split(';')[0]; // e.g. jpeg, png, mp4
    if (ext === 'jpeg') return 'jpg';
    return ext;
  }
  return 'bin';
}

// Recursively traverse to find a media message
function getMediaMessage(message) {
  if (!message) return null;
  if (message.imageMessage) return { type: 'image', msg: message.imageMessage };
  if (message.videoMessage) return { type: 'video', msg: message.videoMessage };
  
  const nested = message.viewOnceMessage?.message || 
                 message.ephemeralMessage?.message ||
                 message.viewOnceMessageV2?.message;
  if (nested) {
    return getMediaMessage(nested);
  }
  return null;
}

// Download media in background
async function downloadMedia(msg, localPath) {
  try {
    console.log(`[MediaDownload] Downloading media for message ${msg.key.id}...`);
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: logger,
        reuploadRequest: sock ? sock.updateMediaMessage : undefined
      }
    );
    fs.writeFileSync(localPath, buffer);
    console.log(`[MediaDownload] Downloaded and saved media to ${localPath}`);
  } catch (err) {
    console.error(`[MediaDownload] Failed to download media for message ${msg.key.id}:`, err);
  }
}

// Format incoming/outgoing WhatsApp messages
function formatMessage(msg) {
  if (!msg.message) return null;

  const mediaInfo = getMediaMessage(msg.message);
  let content = '';
  let mediaUrl = null;
  let mediaType = null;

  if (mediaInfo) {
    const ext = getExtension(mediaInfo.msg.mimetype);
    const filename = `media-${msg.key.id}.${ext}`;
    const localPath = path.join(mediaDir, filename);
    mediaUrl = `http://localhost:3001/media/${filename}`;
    mediaType = mediaInfo.type; // 'image' | 'video'
    content = mediaInfo.type === 'image' ? '[Image]' : '[Video]';

    // Asynchronously download in background if file doesn't exist
    if (!fs.existsSync(localPath)) {
      downloadMedia(msg, localPath).catch(() => {});
    }
  } else {
    if (msg.message.conversation) {
      content = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      content = msg.message.extendedTextMessage.text;
    } else if (msg.message.audioMessage) {
      content = '[Audio]';
    } else if (msg.message.documentMessage) {
      content = '[Document]';
    } else if (msg.message.stickerMessage) {
      content = '[Sticker]';
    } else if (msg.message.locationMessage) {
      content = '[Location]';
    } else if (msg.message.contactMessage) {
      content = '[Contact]';
    } else {
      const nested = msg.message.viewOnceMessage?.message || 
                     msg.message.ephemeralMessage?.message ||
                     msg.message.viewOnceMessageV2?.message;
      if (nested) {
        if (nested.conversation) content = nested.conversation;
        else if (nested.extendedTextMessage?.text) content = nested.extendedTextMessage.text;
        else if (nested.imageMessage) content = '[Image]';
        else if (nested.videoMessage) content = '[Video]';
      }
    }
  }

  if (!content && !mediaUrl) return null;

  const rawTs = Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000);

  return {
    id: msg.key.id,
    direction: msg.key.fromMe ? 'sent' : 'received',
    content: content,
    mediaUrl: mediaUrl,
    mediaType: mediaType,
    timestamp: new Date(rawTs * 1000).toLocaleDateString("en-US") + " " + new Date(rawTs * 1000).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
    timestampRaw: rawTs,
    status: msg.status === 4 ? 'read' : msg.status === 3 ? 'delivered' : 'sent'
  };
}

// Start Baileys WASocket
async function startWhatsApp() {
  try {
    // Safely clean up any existing socket connection to prevent double connections and memory leaks
    if (sock) {
      try {
        console.log("Cleaning up existing socket before reconnecting...");
        sock.ev.removeAllListeners();
        sock.end();
      } catch (err) {
        console.error("Error closing old socket:", err);
      }
      sock = null;
    }

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    sock = makeWASocket({
      version,
      auth: state,
      logger: logger,
      printQRInTerminal: false,
      browser: ['Aegis Hospital CRM', 'Chrome', '120.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messaging-history.status', ({ status, syncType, progress }) => {
      console.log(`[SyncStatus] History sync status: ${status}, syncType: ${syncType}, progress: ${progress}`);
      if (status === 'complete') {
        isSyncingChats = false;
      } else {
        isSyncingChats = true;
      }
    });

    sock.ev.on('chats.set', ({ chats }) => {
      chats.forEach(chat => {
        if (!isChatJid(chat.id)) return;
        activeChats.set(chat.id, {
          id: chat.id,
          unreadCount: chat.unreadCount || 0,
          name: chat.name || contactsCache.get(chat.id)?.name || chat.id.split('@')[0],
          conversationTimestamp: chat.conversationTimestamp || Math.floor(Date.now() / 1000)
        });
      });
    });

    sock.ev.on('contacts.set', ({ contacts }) => {
      contacts.forEach(contact => {
        const id = contact.id;
        if (!id || !isChatJid(id)) return;
        contactsCache.set(id, {
          id: id,
          name: contact.name || contact.verifiedName || contact.notify || id.split('@')[0],
          verifiedName: contact.verifiedName || null
        });
      });
    });

    sock.ev.on('contacts.upsert', (newContacts) => {
      newContacts.forEach(contact => {
        const id = contact.id;
        if (!id || !isChatJid(id)) return;
        contactsCache.set(id, {
          id: id,
          name: contact.name || contact.verifiedName || contact.notify || id.split('@')[0],
          verifiedName: contact.verifiedName || null
        });
        if (activeChats.has(id)) {
          const chat = activeChats.get(id);
          chat.name = contactsCache.get(id).name;
          activeChats.set(id, chat);
        }
      });
    });

    sock.ev.on('contacts.update', (updates) => {
      updates.forEach(update => {
        const id = update.id;
        if (!id || !isChatJid(id)) return;
        const current = contactsCache.get(id) || {};
        contactsCache.set(id, {
          ...current,
          id: id,
          name: update.name || update.verifiedName || update.notify || current.name || id.split('@')[0]
        });
        if (activeChats.has(id)) {
          const chat = activeChats.get(id);
          chat.name = contactsCache.get(id).name;
          activeChats.set(id, chat);
        }
      });
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        connectionStatus = 'qr';
        try {
          qrCodeData = await qrcode.toDataURL(qr);
          console.log('[WhatsApp] Generated new QR code successfully.');
        } catch (err) {
          console.error('Failed to generate QR base64:', err);
        }
      } else if (connection === 'connecting' && !qrCodeData) {
        connectionStatus = 'connecting';
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        qrCodeData = null;
        userInfo = {
          id: sock.user.id,
          name: sock.user.name || sock.user.id.split(':')[0]
        };
        isSyncingChats = true;
        console.log('WhatsApp connection opened successfully!');
        // Safety timeout to turn off sync after 45s if Baileys doesn't report status: complete
        setTimeout(() => {
          isSyncingChats = false;
        }, 45000);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403 || statusCode === 405;
        console.log(`Connection closed (code: ${statusCode}). Session expired/invalid: ${isLoggedOut}`);
        
        connectionStatus = 'disconnected';
        userInfo = null;
        qrCodeData = null;
        isSyncingChats = false;
        
        if (isLoggedOut) {
          console.log(`[WhatsApp] Session expired or invalid (code ${statusCode}). Purging session credentials to generate fresh QR code.`);
          purgeSessionData({ includeCreds: true });
        } else {
          setTimeout(startWhatsApp, 3000);
        }
      }
    });

    sock.ev.on('messaging-history.set', ({ chats, messages }) => {
      chats.forEach(chat => {
        if (!isChatJid(chat.id)) return;
        activeChats.set(chat.id, {
          id: chat.id,
          unreadCount: chat.unreadCount || 0,
          name: chat.name || contactsCache.get(chat.id)?.name || chat.id.split('@')[0],
          conversationTimestamp: chat.conversationTimestamp || Math.floor(Date.now() / 1000)
        });
      });

      messages.forEach(msg => {
        const jid = msg.key.remoteJid;
        if (!jid || !isChatJid(jid)) return;

        // Parse and save pushName during history sync
        if (msg.pushName) {
          const currentContact = contactsCache.get(jid) || {};
          if (!currentContact.name || currentContact.name === jid.split('@')[0]) {
            contactsCache.set(jid, {
              ...currentContact,
              id: jid,
              name: msg.pushName
            });
            const chat = activeChats.get(jid);
            if (chat) {
              chat.name = msg.pushName;
              activeChats.set(jid, chat);
            }
          }
        }

        if (!messagesStore.has(jid)) messagesStore.set(jid, []);
        const formatted = formatMessage(msg);
        if (formatted) {
          const list = messagesStore.get(jid);
          // Prevent duplicates
          if (!list.some(m => m.id === formatted.id)) {
            list.push(formatted);
          }
        }
      });
      pruneMessages();
    });

    sock.ev.on('chats.upsert', (newChats) => {
      newChats.forEach(chat => {
        if (!isChatJid(chat.id)) return;
        const current = activeChats.get(chat.id) || {};
        activeChats.set(chat.id, {
          ...current,
          id: chat.id,
          name: chat.name || contactsCache.get(chat.id)?.name || current.name || chat.id.split('@')[0],
          unreadCount: chat.unreadCount || 0,
          conversationTimestamp: Math.floor(Date.now() / 1000)
        });
      });
    });

    sock.ev.on('messages.update', (updates) => {
      updates.forEach(upd => {
        const jid = upd.key.remoteJid;
        if (!jid) return;
        const list = messagesStore.get(jid);
        if (list) {
          const msg = list.find(m => m.id === upd.key.id);
          if (msg) {
            if (upd.update.status) {
              msg.status = upd.update.status === 4 ? 'read' : upd.update.status === 3 ? 'delivered' : msg.status;
            }
            if (upd.update.message) {
              const formatted = formatMessage({ key: upd.key, message: upd.update.message, messageTimestamp: Math.floor(Date.now() / 1000) });
              if (formatted) {
                msg.content = formatted.content;
                msg.mediaUrl = formatted.mediaUrl;
                msg.mediaType = formatted.mediaType;
              }
            }
          }
        }
      });
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type === 'notify') {
        messages.forEach(msg => {
          const jid = msg.key.remoteJid;
          if (!jid || !isChatJid(jid)) return;

          // Parse and save pushName during incoming message reception
          if (msg.pushName) {
            const currentContact = contactsCache.get(jid) || {};
            if (!currentContact.name || currentContact.name === jid.split('@')[0]) {
              contactsCache.set(jid, {
                ...currentContact,
                id: jid,
                name: msg.pushName
              });
            }
          }

          if (!messagesStore.has(jid)) messagesStore.set(jid, []);
          const formatted = formatMessage(msg);
          if (formatted) {
            const list = messagesStore.get(jid);
            // Prevent duplicates
            if (!list.some(m => m.id === formatted.id)) {
              list.push(formatted);
              pruneMessages();
            }
            // Update or create chat thread
            const currentChat = activeChats.get(jid) || {};
            activeChats.set(jid, {
              id: jid,
              name: currentChat.name || contactsCache.get(jid)?.name || msg.pushName || jid.split('@')[0],
              unreadCount: (currentChat.unreadCount || 0) + 1,
              conversationTimestamp: Math.floor(Date.now() / 1000)
            });
          }
        });
      }
    });

  } catch (error) {
    console.error('Error starting WhatsApp socket:', error);
    connectionStatus = 'disconnected';
  }
}

// REST API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qr: qrCodeData,
    user: userInfo,
    syncing: isSyncingChats
  });
});

app.post('/api/logout', async (req, res) => {
  console.log('Logging out from WhatsApp...');
  try {
    if (sock && connectionStatus === 'connected') {
      await sock.logout();
    }
  } catch (err) {
    console.error('Error logging out socket:', err);
  }
  
  purgeSessionData({ includeCreds: true });
  connectionStatus = 'disconnected';
  qrCodeData = null;
  userInfo = null;
  
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/connect', async (req, res) => {
  if (connectionStatus === 'connected') {
    return res.json({ success: true, status: connectionStatus, message: 'Already connected' });
  }
  console.log('Initializing WhatsApp connection from API...');
  if (connectionStatus === 'disconnected' || req.body?.force) {
    purgeSessionData({ includeCreds: true });
  }
  startWhatsApp();
  res.json({ success: true, status: connectionStatus, message: 'Initialization started' });
});

app.get('/api/chats', (req, res) => {
  const chatsList = Array.from(activeChats.values())
    .filter(chat => isChatJid(chat.id))
    .map(chat => ({
      ...chat,
      name: resolveChatName(chat.id, chat.name)
    }))
    .sort((a, b) => b.conversationTimestamp - a.conversationTimestamp);
  
  if (sock && connectionStatus === 'connected') {
    const now = Date.now();
    chatsList.forEach(chat => {
      if (!chat.profilePic && !chat.profilePicError && (!chat.lastPicCheck || now - chat.lastPicCheck > 60 * 60 * 1000)) {
        chat.lastPicCheck = now;
        activeChats.set(chat.id, { ...activeChats.get(chat.id), lastPicCheck: now });

        sock.profilePictureUrl(chat.id, 'image')
          .then(url => {
            if (url) {
              chat.profilePic = url;
              const cached = activeChats.get(chat.id);
              if (cached) activeChats.set(chat.id, { ...cached, profilePic: url });
            } else {
              chat.profilePicError = true;
              const cached = activeChats.get(chat.id);
              if (cached) activeChats.set(chat.id, { ...cached, profilePicError: true });
            }
          })
          .catch(() => {
            chat.profilePicError = true;
            const cached = activeChats.get(chat.id);
            if (cached) activeChats.set(chat.id, { ...cached, profilePicError: true });
          });
      }
    });
  }
  
  res.json(chatsList);
});

app.get('/api/contacts', (req, res) => {
  res.json(Array.from(contactsCache.values()).filter(c => isChatJid(c.id)));
});

app.get('/api/messages/:jid', (req, res) => {
  const jid = req.params.jid;
  const history = messagesStore.get(jid) || [];
  
  const sorted = history.slice().sort((a, b) => {
    return (a.timestampRaw || 0) - (b.timestampRaw || 0);
  });
  
  res.json(sorted);
});

app.get('/api/sync-state', (req, res) => {
  const { jid } = req.query;
  const chatsList = Array.from(activeChats.values())
    .filter(chat => isChatJid(chat.id))
    .map(chat => ({
      ...chat,
      name: resolveChatName(chat.id, chat.name)
    }))
    .sort((a, b) => b.conversationTimestamp - a.conversationTimestamp);
  const history = jid ? (messagesStore.get(jid) || []) : [];
  
  const sortedHistory = history.slice().sort((a, b) => {
    return (a.timestampRaw || 0) - (b.timestampRaw || 0);
  });
  
  res.json({
    status: connectionStatus,
    qr: qrCodeData,
    user: userInfo,
    chats: chatsList,
    contacts: Array.from(contactsCache.values()).filter(c => isChatJid(c.id)),
    messages: sortedHistory,
    syncing: isSyncingChats
  });

  // Try to fetch profile pictures for chats in background with rate limit checks
  if (sock && connectionStatus === 'connected') {
    const now = Date.now();
    chatsList.forEach(chat => {
      if (!chat.profilePic && !chat.profilePicError && (!chat.lastPicCheck || now - chat.lastPicCheck > 60 * 60 * 1000)) {
        chat.lastPicCheck = now;
        activeChats.set(chat.id, { ...activeChats.get(chat.id), lastPicCheck: now });

        sock.profilePictureUrl(chat.id, 'image')
          .then(url => {
            if (url) {
              chat.profilePic = url;
              const cached = activeChats.get(chat.id);
              if (cached) activeChats.set(chat.id, { ...cached, profilePic: url });
            } else {
              chat.profilePicError = true;
              const cached = activeChats.get(chat.id);
              if (cached) activeChats.set(chat.id, { ...cached, profilePicError: true });
            }
          })
          .catch(() => {
            chat.profilePicError = true;
            const cached = activeChats.get(chat.id);
            if (cached) activeChats.set(chat.id, { ...cached, profilePicError: true });
          });
      }
    });
  }
});

app.post('/api/send', async (req, res) => {
  const { phone, text } = req.body;
  const jid = formatJid(phone);
  
  if (!jid) {
    return res.status(400).json({ error: 'Invalid JID or phone number' });
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ error: 'WhatsApp client is not connected' });
  }

  try {
    console.log(`Sending WhatsApp message to ${jid}: ${text}`);
    const result = await sock.sendMessage(jid, { text: text });
    
    // Log in messagesStore
    if (!messagesStore.has(jid)) messagesStore.set(jid, []);
    const formatted = {
      id: result.key.id,
      direction: 'sent',
      content: text,
      timestamp: new Date().toLocaleDateString("en-US") + " " + new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };
    messagesStore.get(jid).push(formatted);

    // Update active chat timestamp
    const currentChat = activeChats.get(jid) || {};
    activeChats.set(jid, {
      ...currentChat,
      id: jid,
      name: currentChat.name || contactsCache.get(jid)?.name || phone,
      unreadCount: 0,
      conversationTimestamp: Math.floor(Date.now() / 1000)
    });

    res.json({ success: true, message: formatted });
  } catch (err) {
    console.error(`Failed to send message to ${jid}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Auto-reply rules endpoints
app.get('/api/rules', (req, res) => {
  res.json(autoReplyRules);
});

app.post('/api/rules', (req, res) => {
  try {
    autoReplyRules = req.body || [];
    fs.writeFileSync(rulesFile, JSON.stringify(autoReplyRules, null, 2));
    console.log(`Synced ${autoReplyRules.length} keyword auto-reply rules.`);
    res.json({ success: true, count: autoReplyRules.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save auto-reply rules' });
  }
});

// Scheduled messages endpoints
app.get('/api/scheduled', (req, res) => {
  try {
    const list = JSON.parse(fs.readFileSync(scheduledFile, 'utf8'));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read scheduled messages' });
  }
});

app.post('/api/schedule', (req, res) => {
  const { phone, text, sendAt, patientName, attachment } = req.body;
  if (!phone || !text || !sendAt) {
    return res.status(400).json({ error: 'Missing phone, text, or sendAt schedule' });
  }

  try {
    const list = JSON.parse(fs.readFileSync(scheduledFile, 'utf8'));
    const newSchedule = {
      id: `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      phone,
      text,
      sendAt,
      patientName: patientName || 'Patient',
      status: 'pending',
      attachment: attachment || null,
      createdAt: new Date().toISOString()
    };
    list.push(newSchedule);
    fs.writeFileSync(scheduledFile, JSON.stringify(list, null, 2));
    console.log(`Scheduled follow-up for ${patientName} on ${sendAt}`);
    res.json(newSchedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save scheduled message' });
  }
});

// Endpoint to cancel scheduled messages when a patient is deleted or bill is paid in the CRM
app.post('/api/cancel-scheduled', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Missing phone number' });
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  try {
    const list = JSON.parse(fs.readFileSync(scheduledFile, 'utf8'));
    let cancelledCount = 0;
    for (let msg of list) {
      if (msg.phone === cleanPhone && msg.status === 'pending') {
        msg.status = 'cancelled';
        msg.cancelledAt = new Date().toISOString();
        msg.cancelReason = 'Patient deleted or bill settled in CRM';
        cancelledCount++;
      }
    }
    if (cancelledCount > 0) {
      fs.writeFileSync(scheduledFile, JSON.stringify(list, null, 2));
      console.log(`[Scheduler] Cancelled ${cancelledCount} pending schedule(s) for ${cleanPhone}`);
    }
    res.json({ success: true, cancelled: cancelledCount });
  } catch (err) {
    console.error('Failed to cancel scheduled messages:', err);
    res.status(500).json({ error: 'Failed to cancel scheduled messages' });
  }
});

// Endpoint to wipe ALL pending scheduled messages (e.g. full reset)
app.post('/api/cancel-all-scheduled', (req, res) => {
  try {
    fs.writeFileSync(scheduledFile, JSON.stringify([], null, 2));
    console.log('[Scheduler] All scheduled messages cleared.');
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to clear all scheduled messages:', err);
    res.status(500).json({ error: 'Failed to clear scheduled messages' });
  }
});


// Start scheduler checking loop
setInterval(async () => {
  if (connectionStatus !== 'connected' || !sock) return;

  try {
    const list = JSON.parse(fs.readFileSync(scheduledFile, 'utf8'));
    const now = new Date();
    let updated = false;

    for (let msg of list) {
      if (msg.status === 'pending' && new Date(msg.sendAt) <= now) {
        const jid = formatJid(msg.phone);
        if (jid) {
          try {
            let result;
            if (msg.attachment) {
              console.log(`[Scheduler] Dispatching message with attachment to ${msg.phone} (${msg.patientName})`);
              result = await sock.sendMessage(jid, {
                document: Buffer.from(msg.attachment.content),
                mimetype: msg.attachment.mimetype || 'text/plain',
                fileName: msg.attachment.fileName || 'Invoice.txt',
                caption: msg.text
              });
            } else {
              console.log(`[Scheduler] Dispatching message on-time to ${msg.phone} (${msg.patientName})`);
              result = await sock.sendMessage(jid, { text: msg.text });
            }
            
            msg.status = 'sent';
            msg.sentAt = new Date().toISOString();
            msg.msgId = result.key.id;
            updated = true;

            // Log in message history
            if (!messagesStore.has(jid)) messagesStore.set(jid, []);
            messagesStore.get(jid).push({
              id: result.key.id,
              direction: 'sent',
              content: msg.attachment ? `[Invoice Document: ${msg.attachment.fileName}] ${msg.text}` : msg.text,
              timestamp: new Date().toLocaleDateString("en-US") + " " + new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
              status: 'sent'
            });

            // Update active chat
            const currentChat = activeChats.get(jid) || {};
            activeChats.set(jid, {
              ...currentChat,
              id: jid,
              name: msg.patientName,
              unreadCount: 0,
              conversationTimestamp: Math.floor(Date.now() / 1000)
            });
          } catch (err) {
            console.error(`[Scheduler] Failed to send to ${msg.phone}:`, err);
            msg.status = 'failed';
            msg.error = err.message;
            updated = true;
          }
        }
      }
    }

    if (updated) {
      fs.writeFileSync(scheduledFile, JSON.stringify(list, null, 2));
    }
  } catch (err) {
    console.error('[Scheduler Loop Error]:', err);
  }
}, 10000); // Check every 10 seconds

// Start Express + WhatsApp Connection
app.listen(PORT, () => {
  console.log(`WhatsApp CRM API Server running on http://localhost:${PORT}`);
  startWhatsApp();
});

// Prevent unhandled errors/exceptions from crashing the server (e.g. undici ECONNRESET/aborted network requests)
process.on('uncaughtException', (err) => {
  console.error('[Server Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server Unhandled Rejection] at:', promise, 'reason:', reason);
});

