import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { primaryApp, primaryDb } from './firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export async function requestNotificationPermission(userId) {
  try {
    console.log('[FCM] Starting permission request...')
    
    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported')
      return null
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[FCM] Service Worker not supported')
      return null
    }

    const permission = await Notification.requestPermission()
    console.log('[FCM] Permission result:', permission)
    
    if (permission !== 'granted') {
      console.warn('[FCM] Permission denied')
      return null
    }

    const VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY
    console.log('[FCM] VAPID key exists:', !!VAPID)
    console.log('[FCM] VAPID starts with:', VAPID?.substring(0, 10))

    const messaging = getMessaging(primaryApp)
    
    // Wait for service worker to be ready
    const swReg = await navigator.serviceWorker.ready
    console.log('[FCM] Service worker ready:', swReg.scope)

    const token = await getToken(messaging, { 
      vapidKey: VAPID,
      serviceWorkerRegistration: swReg
    })
    
    console.log('[FCM] Token received:', !!token)
    console.log('[FCM] Token preview:', token?.substring(0, 20))

    if (token && userId) {
      await setDoc(
        doc(primaryDb, 'users', userId),
        { 
          fcmToken: token,
          fcmTokenUpdated: serverTimestamp()
        },
        { merge: true }
      )
      console.log('[FCM] ✅ Token saved to Firestore for user:', userId)
    } else {
      console.warn('[FCM] ❌ No token or no userId:', { token: !!token, userId })
    }
    
    return token
  } catch (err) {
    console.error('[FCM] ❌ Error:', err.code, err.message)
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
