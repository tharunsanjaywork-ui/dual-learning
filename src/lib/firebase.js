import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore'

const primaryConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const secondaryConfig = {
  apiKey: import.meta.env.VITE_FIREBASE2_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE2_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE2_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE2_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE2_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE2_APP_ID,
}

export const primaryApp = initializeApp(primaryConfig)
export const secondaryApp = initializeApp(secondaryConfig, 'secondary')

export const primaryAuth = getAuth(primaryApp)
export const secondaryAuth = getAuth(secondaryApp)

export const primaryDb = getFirestore(primaryApp)
export const secondaryDb = getFirestore(secondaryApp)

// Auth ALWAYS uses primary (user profiles never move)
export const auth = primaryAuth

// db export always points to primary
// (for non-message collections like users, stories etc)
export const db = primaryDb

// ═══ DATABASE ROUTER ═══
// RULE: Auth + user data → ALWAYS primary
// RULE: Messages → primary if space, secondary if full
// THRESHOLD: Switch when primary > 950MB (leaving 50MB free for auth/user data)

const STORAGE_THRESHOLD_MB = 950
const MESSAGES_KEY = 'dz_messages_db' // 'primary' | 'secondary'

export function getMessagesDb() {
  const stored = localStorage.getItem(MESSAGES_KEY)
  if (stored === 'secondary') return secondaryDb
  return primaryDb
}

export function getMessagesDbName() {
  return localStorage.getItem(MESSAGES_KEY) || 'primary'
}

export async function checkAndSwitchMessagesDb() {
  try {
    const snap = await getDoc(doc(primaryDb, 'system', 'storageStats'))
    if (snap.exists()) {
      const data = snap.data()
      const primaryBytes = data.primaryFirestoreBytes || 0
      const primaryMB = primaryBytes / (1024 * 1024)

      if (primaryMB >= STORAGE_THRESHOLD_MB) {
        if (localStorage.getItem(MESSAGES_KEY) !== 'secondary') {
          localStorage.setItem(MESSAGES_KEY, 'secondary')
          console.warn('[DualZone] Messages switched to secondary Firebase based on central storageStats')
          return 'secondary'
        }
      } else if (localStorage.getItem(MESSAGES_KEY) === 'secondary' && primaryMB < STORAGE_THRESHOLD_MB) {
        // Space reclaimed in primary
        localStorage.setItem(MESSAGES_KEY, 'primary')
        return 'primary'
      }
    }
  } catch (err) {
    console.warn('[DualZone] Central storage check failed, using cached state:', err.message)
  }
  return localStorage.getItem(MESSAGES_KEY) || 'primary'
}

// Centrally count Firestore message bytes in system/storageStats and per-user in storageByUser/{uid}
export async function trackMessageStorageChange(bytes, isSecondary = false, uid = null, isNewMessage = true, userInfo = {}) {
  try {
    const field = isSecondary ? 'secondaryFirestoreBytes' : 'primaryFirestoreBytes'
    // Central system stats
    await setDoc(
      doc(primaryDb, 'system', 'storageStats'),
      {
        [field]: increment(bytes),
        totalFirestoreBytes: increment(bytes),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    // Per-user stats
    if (uid) {
      const userPayload = {
        uid,
        bytes: increment(bytes),
        messageCount: increment(isNewMessage ? 1 : (bytes < 0 ? -1 : 0)),
        updatedAt: serverTimestamp(),
      }
      if (userInfo.displayName) userPayload.displayName = userInfo.displayName
      if (userInfo.username) userPayload.username = userInfo.username

      await setDoc(
        doc(primaryDb, 'storageByUser', uid),
        userPayload,
        { merge: true }
      )
    }

    // Keep localStorage cache in sync for offline display
    const currentMB = parseFloat(localStorage.getItem('dz_firestore_mb') || '0')
    const newMB = Math.max(0, currentMB + (bytes / (1024 * 1024)))
    localStorage.setItem('dz_firestore_mb', newMB.toFixed(4))
  } catch (err) {
    console.warn('[DualZone] Failed to track message storage change:', err.message)
  }
}

export function trackFirestoreWrite(estimatedBytes = 500) {
  const currentMB = parseFloat(localStorage.getItem('dz_firestore_mb') || '0')
  const newMB = currentMB + (estimatedBytes / (1024 * 1024))
  localStorage.setItem('dz_firestore_mb', newMB.toFixed(4))
}

export function isUsingSecondaryMessages() {
  return localStorage.getItem(MESSAGES_KEY) === 'secondary'
}

export default primaryApp
