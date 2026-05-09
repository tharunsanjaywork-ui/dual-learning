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

const sentNotifications = new Set()
let lastCheckTime = new Date(Date.now() - 10000)

async function checkNewMessages() {
  const checkStart = new Date()
  
  try {
    // Get ALL users who have FCM tokens
    const usersSnap = await db.collection('users')
      .where('fcmToken', '!=', '')
      .get()

    if (usersSnap.empty) {
      console.log('[DualZone] No users with FCM tokens found')
      lastCheckTime = checkStart
      return
    }

    console.log(`[DualZone] Checking ${usersSnap.size} users...`)

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data()
      const fcmToken = userData.fcmToken
      const userId = userDoc.id

      if (!fcmToken || fcmToken === '') continue

      // Get chats this user is in
      const chatsSnap = await db.collection('chats')
        .where('participants', 'array-contains', userId)
        .get()

      if (chatsSnap.empty) continue

      for (const chatDoc of chatsSnap.docs) {
        const chatId = chatDoc.id

        // SIMPLE QUERY — no composite index needed
        // Just get last 3 messages and filter in code
        const msgsSnap = await db
          .collection('messages')
          .doc(chatId)
          .collection('msgs')
          .orderBy('createdAt', 'desc')
          .limit(3)
          .get()

        if (msgsSnap.empty) continue

        for (const msgDoc of msgsSnap.docs) {
          const msg = msgDoc.data()
          const msgId = msgDoc.id

          // Check if message is recent (last 10 seconds)
          const msgTime = msg.createdAt?.toDate 
            ? msg.createdAt.toDate() 
            : new Date(msg.createdAt || 0)
          
          const isRecent = msgTime > lastCheckTime
          if (!isRecent) continue

          // Skip if sender is the recipient
          if (msg.senderId === userId) continue

          // Skip if already notified
          const notifKey = `${userId}-${msgId}`
          if (sentNotifications.has(notifKey)) continue
          sentNotifications.add(notifKey)

          // Keep set small
          if (sentNotifications.size > 1000) {
            const arr = [...sentNotifications]
            arr.slice(0, 500).forEach(k => 
              sentNotifications.delete(k))
          }

          console.log(`[DualZone] Sending notification to ${userId}`)

          // Send FCM — use data-only (not notification)
          // This way onBackgroundMessage handles it
          try {
            await admin.messaging().send({
              token: fcmToken,
              // Use data field ONLY (not notification field)
              // This ensures onBackgroundMessage in SW handles it
              data: {
                title: 'Dual Zone',
                body: 'Update, there is an update',
                url: '/study/jee-mains',
                chatId: chatId,
              },
              webpush: {
                headers: { 
                  Urgency: 'high',
                  TTL: '60'
                },
                fcmOptions: {
                  link: 'https://dual-learning.onrender.com/study/jee-mains'
                }
              }
            })
            console.log(`[DualZone] ✅ Notified: ${userId}`)
          } catch (fcmErr) {
            if (fcmErr.code === 
                'messaging/registration-token-not-registered') {
              await db.collection('users').doc(userId)
                .update({ fcmToken: '' }).catch(() => {})
              console.log(`[DualZone] Removed stale token: ${userId}`)
            } else {
              console.warn('[DualZone] FCM error:', 
                fcmErr.code, fcmErr.message)
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[DualZone] ❌ Check error:', err.message)
  }
  
  lastCheckTime = checkStart
}

// Run immediately then every 5 seconds
checkNewMessages()
setInterval(checkNewMessages, 5000)

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
