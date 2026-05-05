import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { primaryApp, primaryDb } from './firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export async function requestNotificationPermission(userId) {
  try {
    if (!('Notification' in window)) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const messaging = getMessaging(primaryApp)
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })

    if (token && userId) {
      // Save FCM token to user's Firestore doc
      await setDoc(
        doc(primaryDb, 'users', userId),
        {
          fcmToken: token,
          fcmTokenUpdated: serverTimestamp()
        },
        { merge: true }
      )
      console.log('[DualZone] FCM token saved for user:', userId)
    }
    return token
  } catch (err) {
    console.warn('Notification setup failed:', err)
    return null
  }
}

export function listenForegroundNotifications(callback) {
  try {
    const messaging = getMessaging(primaryApp)
    return onMessage(messaging, (payload) => {
      callback(payload)
    })
  } catch (err) {
    console.warn('Foreground notification setup failed:', err)
    return () => {}
  }
}

// Show an in-app notification banner (for foreground)
export function showInAppNotification({ title, body, onClick }) {
  const event = new CustomEvent('dz_notification', {
    detail: { title, body, onClick }
  })
  window.dispatchEvent(event)
}
