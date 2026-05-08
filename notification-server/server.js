const admin = require('firebase-admin')
const express = require('express')
const app = express()

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccount.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

console.log('[Server] Notification server starting...')

// Listen to new messages in Firestore
// We poll every 5 seconds (simple approach)
let lastChecked = new Date()

async function checkNewMessages() {
  try {
    const cutoff = new Date(lastChecked)
    lastChecked = new Date()

    // Get all chats updated recently
    const chatsSnap = await db.collection('chats')
      .where('lastMessageAt', '>', cutoff)
      .get()

    for (const chatDoc of chatsSnap.docs) {
      const chat = chatDoc.data()
      if (!chat.participants || chat.participants.length < 2) continue

      // Get the last message
      const msgsSnap = await db
        .collection('messages')
        .doc(chatDoc.id)
        .collection('msgs')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (msgsSnap.empty) continue
      const lastMsg = msgsSnap.docs[0].data()
      if (!lastMsg.senderId) continue

      // Find recipient (not the sender)
      const recipientId = chat.participants
        .find(id => id !== lastMsg.senderId)
      if (!recipientId) continue

      // Get recipient FCM token
      const recipientDoc = await db
        .collection('users')
        .doc(recipientId)
        .get()

      if (!recipientDoc.exists) continue
      const recipient = recipientDoc.data()
      const fcmToken = recipient.fcmToken
      if (!fcmToken) continue

      // Get sender name
      const senderDoc = await db
        .collection('users')
        .doc(lastMsg.senderId)
        .get()
      const sender = senderDoc.exists ? senderDoc.data() : {}

      // Send FCM push notification
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
              data: { url: '/study/jee-mains' }
            }
          }
        })
        console.log('[Server] Notification sent to:', recipientId)
      } catch (fcmErr) {
        console.warn('[Server] FCM send failed:', fcmErr.message)
      }
    }
  } catch (err) {
    console.error('[Server] Check failed:', err.message)
  }
}

// Check for new messages every 5 seconds
setInterval(checkNewMessages, 5000)

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'running', lastChecked: lastChecked.toISOString() })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`)
})
