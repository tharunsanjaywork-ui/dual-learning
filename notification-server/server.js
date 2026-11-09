const admin = require('firebase-admin')
const express = require('express')
const app = express()

// Initialize Firebase Admin
let serviceAccount
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT)
  } catch (e) {
    console.error('[DualZone] Failed to parse service account:', e.message)
    process.exit(1)
  }
} else {
  try {
    serviceAccount = require('./serviceAccount.json')
  } catch {
    console.error('[DualZone] No service account found!')
    process.exit(1)
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()
console.log('[DualZone] ✅ Server started successfully!')

// Track sent notifications to avoid duplicates
const sentNotifications = new Set()

// Use Firestore timestamp as reference instead of 
// local time — this survives server restarts!
async function getLastCheckTime() {
  try {
    const ref = db.collection('system').doc('notifServer')
    const snap = await ref.get()
    if (snap.exists && snap.data().lastCheck) {
      const lastCheck = snap.data().lastCheck.toDate()
      console.log('[DualZone] Resuming from:', lastCheck.toISOString())
      return lastCheck
    }
  } catch (e) {
    console.warn('[DualZone] Could not read lastCheck:', e.message)
  }
  // Default: check messages from last 30 seconds on first run
  return new Date(Date.now() - 30000)
}

async function saveLastCheckTime(time) {
  try {
    await db.collection('system').doc('notifServer').set({
      lastCheck: admin.firestore.Timestamp.fromDate(time),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
  } catch (e) {
    // Non-critical, ignore
  }
}

let lastCheckTime = new Date(Date.now() - 30000)

// Initialize lastCheckTime from Firestore on startup
getLastCheckTime().then(t => { lastCheckTime = t })

async function checkNewMessages() {
  const checkStart = new Date()

  try {
    // Get all users with FCM tokens
    const usersSnap = await db.collection('users')
      .where('fcmToken', '!=', '')
      .get()

    if (usersSnap.empty) return

    console.log(`[DualZone] Checking ${usersSnap.size} users at ${checkStart.toISOString()}`)

    let notificationsSent = 0

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data()
      const fcmToken = userData.fcmToken
      const userId = userDoc.id

      if (!fcmToken || fcmToken.trim() === '') continue

      // Get chats for this user
      const chatsSnap = await db.collection('chats')
        .where('participants', 'array-contains', userId)
        .get()

      if (chatsSnap.empty) continue

      for (const chatDoc of chatsSnap.docs) {
        const chatId = chatDoc.id

        // Get recent messages — simple orderBy only
        // No composite index needed this way
        const msgsSnap = await db
          .collection('messages')
          .doc(chatId)
          .collection('msgs')
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get()

        if (msgsSnap.empty) continue

        for (const msgDoc of msgsSnap.docs) {
          const msg = msgDoc.data()
          const msgId = msgDoc.id

          // Convert Firestore timestamp to Date
          let msgTime
          if (msg.createdAt?.toDate) {
            msgTime = msg.createdAt.toDate()
          } else if (msg.createdAt?._seconds) {
            msgTime = new Date(msg.createdAt._seconds * 1000)
          } else {
            continue // Skip if no valid timestamp
          }

          // Only process messages newer than last check
          if (msgTime <= lastCheckTime) continue

          // Skip messages sent by this user
          if (msg.senderId === userId) continue

          // Skip already notified
          const notifKey = `${userId}-${msgId}`
          if (sentNotifications.has(notifKey)) continue
          sentNotifications.add(notifKey)

          // Keep set from growing too large
          if (sentNotifications.size > 2000) {
            const arr = [...sentNotifications]
            arr.slice(0, 1000).forEach(k => 
              sentNotifications.delete(k))
          }

          console.log(`[DualZone] 📨 New message found! Sending to ${userId}`)

          // Send FCM notification
          try {
            const response = await admin.messaging().send({
              token: fcmToken,
              // data-only message — service worker handles display
              data: {
                title: 'Dual Zone',
                body: 'Update, there is an update',
                url: '/study/jee-mains',
                chatId: chatId,
                msgId: msgId,
              },
              webpush: {
                headers: {
                  Urgency: 'high',
                  TTL: '300'
                },
                fcmOptions: {
                  link: 'https://dual-learning.onrender.com/study/jee-mains'
                }
              },
              android: {
                priority: 'high'
              },
              apns: {
                headers: {
                  'apns-priority': '10'
                }
              }
            })
            
            console.log(`[DualZone] ✅ Notification sent! User: ${userId}, Response: ${response}`)
            notificationsSent++
            
          } catch (fcmErr) {
            if (fcmErr.code === 
                'messaging/registration-token-not-registered') {
              // Token expired — remove it
              await db.collection('users').doc(userId)
                .update({ fcmToken: '' })
                .catch(() => {})
              console.log(`[DualZone] 🗑️ Removed expired token for: ${userId}`)
            } else if (fcmErr.code === 
                'messaging/invalid-registration-token') {
              await db.collection('users').doc(userId)
                .update({ fcmToken: '' })
                .catch(() => {})
              console.log(`[DualZone] 🗑️ Removed invalid token for: ${userId}`)
            } else {
              console.warn('[DualZone] FCM error:', 
                fcmErr.code, '-', fcmErr.message)
            }
          }
        }
      }
    }

    if (notificationsSent > 0) {
      console.log(`[DualZone] 📊 Sent ${notificationsSent} notifications this cycle`)
    }

  } catch (err) {
    console.error('[DualZone] ❌ Error:', err.message)
    if (err.code) console.error('[DualZone] Error code:', err.code)
  }

  // Save checkStart (not now) as lastCheckTime
  // This ensures we don't miss messages if check takes time
  lastCheckTime = checkStart
  await saveLastCheckTime(checkStart)
}

// Run immediately then every 5 seconds
checkNewMessages()
setInterval(checkNewMessages, 5000)

// Keep-alive ping to prevent Render free tier sleeping
// Read URL strictly from environment — NO hardcoded URLs
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || null

if (SERVER_URL) {
  setInterval(() => {
    const http = SERVER_URL.startsWith('https') ? require('https') : require('http')
    http.get(SERVER_URL, (res) => {
      console.log('[DualZone] 💓 Keep-alive ping OK:', res.statusCode)
    }).on('error', (e) => {
      console.warn('[DualZone] Keep-alive ping failed:', e.message)
    })
  }, 10 * 60 * 1000) // every 10 minutes
} else {
  console.log('[DualZone] Self keep-alive ping disabled (no RENDER_EXTERNAL_URL or SERVER_URL set)')
}

// Allowed origins for API endpoints
const RAW_ALLOWED = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const ALLOWED_ORIGINS = RAW_ALLOWED.split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean)

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    lastChecked: lastCheckTime.toISOString(),
    notifCacheSize: sentNotifications.size,
    uptime: process.uptime()
  })
})

// Storage usage metrics endpoint — CORS restricted strictly to site origin
app.options('/api/storage-usage', (req, res) => {
  const reqOrigin = (req.headers.origin || '').replace(/\/$/, '')
  if (ALLOWED_ORIGINS.includes(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Vary', 'Origin')
    return res.sendStatus(204)
  }
  return res.status(403).json({ error: 'CORS forbidden: origin not allowed' })
})

app.get('/api/storage-usage', async (req, res) => {
  const reqOrigin = (req.headers.origin || '').replace(/\/$/, '')
  if (reqOrigin) {
    if (ALLOWED_ORIGINS.includes(reqOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin)
      res.setHeader('Vary', 'Origin')
    } else {
      return res.status(403).json({ error: 'CORS forbidden: origin not allowed' })
    }
  }

  try {
    let docSnap = await db.collection('system').doc('storageStats').get()
    if (!docSnap.exists) {
      docSnap = await db.collection('system').doc('cloudinaryStats').get()
    }
    const data = docSnap.exists ? docSnap.data() : {}
    const LIMIT = 25 * 1024 * 1024 * 1024 // 25 GB
    const primaryBytes = data.primaryBytes || 0
    const secondaryBytes = data.secondaryBytes || 0
    const primaryPct = Math.min(Math.round((primaryBytes / LIMIT) * 100), 100)
    const secondaryPct = Math.min(Math.round((secondaryBytes / LIMIT) * 100), 100)

    res.json({
      primary: {
        usedBytes: primaryBytes,
        usedGB: (primaryBytes / (1024 ** 3)).toFixed(2),
        totalGB: 25,
        percentage: primaryPct
      },
      secondary: {
        usedBytes: secondaryBytes,
        usedGB: (secondaryBytes / (1024 ** 3)).toFixed(2),
        totalGB: 25,
        percentage: secondaryPct
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[DualZone] 🚀 Server running on port ${PORT}`)
})
