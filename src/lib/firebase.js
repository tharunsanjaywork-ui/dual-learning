import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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
  const usedMB = parseFloat(localStorage.getItem('dz_firestore_mb') || '0')

  if (usedMB >= STORAGE_THRESHOLD_MB) {
    if (localStorage.getItem(MESSAGES_KEY) !== 'secondary') {
      localStorage.setItem(MESSAGES_KEY, 'secondary')
      console.warn('[DualZone] Messages switched to secondary Firebase')
      return 'secondary'
    }
  }
  return localStorage.getItem(MESSAGES_KEY) || 'primary'
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
