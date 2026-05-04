import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { app, secondaryApp, useSecondary } from './firebase'

const PRIMARY_VAPID = 'yqivzlaz5-3ArOU-QMl8bgyFSpgHgR7AJDZ9LtPbPhs'
const SECONDARY_VAPID = '1XP9tvN3w2-Hwjey5Ck5cZ-pkDfqCUe-gVDjv-kdCRs'

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const activeApp = useSecondary ? secondaryApp : app
    const messaging = getMessaging(activeApp)
    const vapidKey = useSecondary ? SECONDARY_VAPID : PRIMARY_VAPID
    const token = await getToken(messaging, { vapidKey })
    return token
  } catch (err) {
    console.error('Notification permission error:', err)
    return null
  }
}

export function listenForegroundNotifications(callback) {
  const activeApp = useSecondary ? secondaryApp : app
  const messaging = getMessaging(activeApp)
  return onMessage(messaging, callback)
}
