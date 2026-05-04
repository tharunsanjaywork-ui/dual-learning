import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { primaryApp } from './firebase'

const PRIMARY_VAPID = 'yqivzlaz5-3ArOU-QMl8bgyFSpgHgR7AJDZ9LtPbPhs'

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const messaging = getMessaging(primaryApp)
    const token = await getToken(messaging, { vapidKey: PRIMARY_VAPID })
    return token
  } catch (err) {
    console.error('Notification permission error:', err)
    return null
  }
}

export function listenForegroundNotifications(callback) {
  try {
    const messaging = getMessaging(primaryApp)
    return onMessage(messaging, callback)
  } catch (err) {
    console.error('Foreground notification error:', err)
    return () => {}
  }
}
