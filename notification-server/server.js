const admin = require('firebase-admin')
const express = require('express')
const app = express()

// Initialize Firebase Admin with service account
// On Render: reads from environment variable
// Locally: reads from serviceAccount.json file
let serviceAccount
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else {
  try {
    serviceAccount = require('./serviceAccount.json')
  } catch {
    console.error('[DualZone] No service account found! Set FIREBASE_SERVICE_ACCOUNT env var.')
    process.exit(1)
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

console.log('[DualZone] Notification server starting...')

// Track already-sent notifications to prevent duplicates
const sentNotifications = new Set()

async function checkNewMessages() {
  try {
    const now = new Date()
    const sixSecondsAgo = new Date(now - 6000)

    // Get ALL users who have FCM tokens
    const usersSnap = await db.collection('users')
      .where('fcmToken', '!=', '')
      .get()

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data()
      const fcmToken = userData.fcmToken
      const userId = userDoc.id

      if (!fcmToken) continue

      // Get chats this user is in
      const chatsSnap = await db.collection('chats')
        .where('participants', 'array-contains', userId)
        .get()

      for (const chatDoc of chatsSnap.docs) {
        const chatId = chatDoc.id

        // Get messages from last 6 seconds
        const msgsSnap = await db
          .collection('messages')
          .doc(chatId)
          .collection('msgs')
          .where('createdAt', '>', sixSecondsAgo)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get()

        if (msgsSnap.empty) continue

        const msg = msgsSnap.docs[0].data()
        const msgId = msgsSnap.docs[0].id

        // Skip if sender is this user (don't notify yourself)
        if (msg.senderId === userId) continue

        // Skip if already notified about this message
        const notifKey = `${userId}-${msgId}`
        if (sentNotifications.has(notifKey)) continue
        sentNotifications.add(notifKey)

        // Clean up old entries to keep the Set small
        if (sentNotifications.size > 1000) {
          const entries = [...sentNotifications]
          entries.slice(0, 500).forEach(e => sentNotifications.delete(e))
        }

        // Send FCM notification
        try {
          await admin.messaging().send({
            token: fcmToken,
            data: {
              title: 'Dual Zone',
              body: 'Update, there is an update',
              url: '/study/jee-mains',
            },
            webpush: {
              headers: { Urgency: 'high' },
              notification: {
                title: 'Dual Zone',
                body: 'Update, there is an update',
                icon: '/icon-192.png',
                silent: true,
                tag: `msg-${chatId}`,
              },
              fcmOptions: {
                link: 'https://dual-learning.onrender.com/study/jee-mains'
              }
            }
          })
          console.log(`[DualZone] ✅ Notified user: ${userId}`)
        } catch (fcmErr) {
          // Token expired — remove it so we don't spam errors
          if (fcmErr.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(userId)
              .update({ fcmToken: '' })
              .catch(() => {})
            console.log(`[DualZone] Removed stale token for user: ${userId}`)
          } else {
            console.warn('[DualZone] FCM error:', fcmErr.code)
          }
        }
      }
    }
  } catch (err) {
    console.error('[DualZone] Check error:', err.message)
  }
}

// Run every 5 seconds
setInterval(checkNewMessages, 5000)

// Also run immediately on start
checkNewMessages()

// Health check endpoint
let lastCheck = new Date()
setInterval(() => { lastCheck = new Date() }, 5000)

app.get('/', (req, res) => {
  res.json({ status: 'running', lastChecked: lastCheck.toISOString() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[DualZone] Running on port ${PORT}`)
})
