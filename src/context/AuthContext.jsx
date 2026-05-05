import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { auth, db } from '../lib/firebase'
import { requestNotificationPermission } from '../lib/notifications'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp, updateDoc, arrayUnion,
} from 'firebase/firestore'
import bcrypt from 'bcryptjs'
import { storage } from '../utils/storage'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [mode, setMode] = useState(null) // 'study' | 'messenger'
  const [loading, setLoading] = useState(true)

  const isSwitching = useRef(false)
  const isLoggingIn = useRef(false)

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip auth state changes during mode switching or active login
      if (isSwitching.current || isLoggingIn.current) return

      if (firebaseUser) {
        setUser(firebaseUser)

        // Restore mode from sessionStorage first, then localStorage fallback
        const savedMode = sessionStorage.getItem('dz_mode') || localStorage.getItem('dz_mode')

        // Fetch profile from Firestore
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (profileDoc.exists()) {
            setUserProfile({ id: profileDoc.id, ...profileDoc.data() })
          } else {
            // Try to find by studyAccountUid or messengerAccountUid
            const q = query(collection(db, 'users'), where('studyAccountUid', '==', firebaseUser.uid))
            const snap = await getDocs(q)
            if (!snap.empty) {
              setUserProfile({ id: snap.docs[0].id, ...snap.docs[0].data() })
            } else {
              const q2 = query(collection(db, 'users'), where('messengerAccountUid', '==', firebaseUser.uid))
              const snap2 = await getDocs(q2)
              if (!snap2.empty) {
                setUserProfile({ id: snap2.docs[0].id, ...snap2.docs[0].data() })
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch profile:', err)
        }

        // Restore mode
        if (savedMode) {
          setMode(savedMode)
          // Sync both storages
          sessionStorage.setItem('dz_mode', savedMode)
          localStorage.setItem('dz_mode', savedMode)
        } else {
          // Determine mode from email
          const email = firebaseUser.email || ''
          if (email.includes('_secret@')) {
            setMode('messenger')
            sessionStorage.setItem('dz_mode', 'messenger')
            localStorage.setItem('dz_mode', 'messenger')
          } else if (email.includes('@dualzone.app')) {
            setMode('study')
            sessionStorage.setItem('dz_mode', 'study')
            localStorage.setItem('dz_mode', 'study')
          }
        }
      } else {
        setUser(null)
        setUserProfile(null)
        setMode(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // Register new user
  const register = async ({ username, studyPassword, messengerPassword, displayName, profilePic, bio, interests }) => {
    // Check if username is taken
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username))
    const existing = await getDocs(usernameQuery)
    if (!existing.empty) {
      throw new Error('Username already taken')
    }

    const email = `${username}@dualzone.app`
    const secretEmail = `${username}_secret@dualzone.app`

    // Hash both passwords with bcrypt (for in-app verification like switch modal)
    const studyHash = await bcrypt.hash(studyPassword, 12)
    const messengerHash = await bcrypt.hash(messengerPassword, 12)

    // Create Firebase Auth account #1 with study password
    const studyCred = await createUserWithEmailAndPassword(auth, email, studyPassword)
    const studyUid = studyCred.user.uid

    // Sign out so we can create the second account
    await signOut(auth)

    // Create Firebase Auth account #2 with messenger password
    const messengerCred = await createUserWithEmailAndPassword(auth, secretEmail, messengerPassword)
    const messengerUid = messengerCred.user.uid

    // Sign out the messenger account
    await signOut(auth)

    // Use the study UID as the primary Firestore document key
    await setDoc(doc(db, 'users', studyUid), {
      username,
      email,
      secretEmail,
      displayName,
      profilePic: profilePic || '',
      bio: bio || '',
      interests: interests || [],
      passwordStudy: studyHash,
      passwordMessenger: messengerHash,
      studyAccountUid: studyUid,
      messengerAccountUid: messengerUid,
      followers: [],
      following: [],
      closeFriends: [],
      blockedUsers: [],
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    })

    // Create study progress doc
    await setDoc(doc(db, 'studyProgress', studyUid), {
      videosWatched: [],
      quizScores: [],
      streak: 0,
      lastStudiedDate: null,
      dailyGoalMinutes: 120,
      todayMinutes: 0,
    })

    // Save to localStorage
    storage.setUsername(username)
    storage.setDisplayName(displayName)
    storage.setProfilePic(profilePic || '')
    storage.setUserId(studyUid)

    return true
  }

  // Login with dual-password check
  const login = async (username, password) => {
    const email = `${username}@dualzone.app`
    const secretEmail = `${username}_secret@dualzone.app`

    // First, find user by username to get their data
    const usernameQuery = query(collection(db, 'users'), where('username', '==', username))
    const snapshot = await getDocs(usernameQuery)

    if (snapshot.empty) {
      throw new Error('User not found. Please register first.')
    }

    const userDoc = snapshot.docs[0]
    const userData = userDoc.data()
    const firestoreId = userDoc.id

    // Prevent onAuthStateChanged from interfering during login
    isLoggingIn.current = true

    // Try study password first (Firebase Auth)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const profile = { id: firestoreId, ...userData }
      setUserProfile(profile)
      setUser(cred.user)
      setLoading(false)

      await setDoc(doc(db, 'users', firestoreId), { isOnline: true, lastSeen: serverTimestamp() }, { merge: true })

      storage.setUsername(username)
      storage.setDisplayName(userData.displayName)
      storage.setProfilePic(userData.profilePic || '')
      storage.setUserId(firestoreId)

      const token = await cred.user.getIdToken()
      sessionStorage.setItem('dz_token', token)
      sessionStorage.setItem('dz_mode', 'study')
      localStorage.setItem('dz_mode', 'study')

      setMode('study')

      // Request notification permission and save FCM token
      requestNotificationPermission(firestoreId).catch(() => {})

      // Allow onAuthStateChanged to work again after a delay
      setTimeout(() => { isLoggingIn.current = false }, 2000)

      return { mode: 'study' }
    } catch {
      // Study password failed, try messenger password (Firebase Auth with secret email)
      try {
        const cred = await signInWithEmailAndPassword(auth, secretEmail, password)
        const profile = { id: firestoreId, ...userData }
        setUserProfile(profile)
        setUser(cred.user)
        setLoading(false)

        await setDoc(doc(db, 'users', firestoreId), { isOnline: true, lastSeen: serverTimestamp() }, { merge: true })

        storage.setUsername(username)
        storage.setDisplayName(userData.displayName)
        storage.setProfilePic(userData.profilePic || '')
        storage.setUserId(firestoreId)

        const token = await cred.user.getIdToken()
        sessionStorage.setItem('dz_token', token)
        sessionStorage.setItem('dz_mode', 'messenger')
        localStorage.setItem('dz_mode', 'messenger')

        setMode('messenger')

        // Request notification permission and save FCM token
        requestNotificationPermission(firestoreId).catch(() => {})

        // Allow onAuthStateChanged to work again after a delay
        setTimeout(() => { isLoggingIn.current = false }, 2000)

        return { mode: 'messenger' }
      } catch {
        isLoggingIn.current = false
        // Both failed - don't reveal which password is which
        throw new Error('Incorrect password, try again')
      }
    }
  }

  // Switch from study to messenger
  const switchToMessenger = async (password) => {
    if (!userProfile) throw new Error('Not logged in')

    // Verify messenger password against stored hash
    const isMatch = await bcrypt.compare(password, userProfile.passwordMessenger)
    if (!isMatch) throw new Error('Incorrect password')

    // Prevent onAuthStateChanged from clearing state during re-auth
    isSwitching.current = true
    try {
      // Sign out current auth session
      await signOut(auth)

      // Sign in with secret email and messenger password
      const secretEmail = userProfile.secretEmail || `${userProfile.username}_secret@dualzone.app`
      const cred = await signInWithEmailAndPassword(auth, secretEmail, password)
      setUser(cred.user)

      const token = await cred.user.getIdToken()
      sessionStorage.setItem('dz_token', token)
      sessionStorage.setItem('dz_mode', 'messenger')
      localStorage.setItem('dz_mode', 'messenger')

      setMode('messenger')
    } finally {
      isSwitching.current = false
    }
    return true
  }

  // Switch from messenger to study (instant, no password)
  const switchToStudy = async () => {
    if (!userProfile) return

    isSwitching.current = true
    try {
      // We can't re-auth without the study password, so just change mode
      // The user is still authenticated and Firestore profile is preserved
      sessionStorage.setItem('dz_mode', 'study')
      localStorage.setItem('dz_mode', 'study')
      setMode('study')
    } finally {
      isSwitching.current = false
    }
  }

  // Logout
  const logout = async () => {
    if (userProfile?.id) {
      await setDoc(doc(db, 'users', userProfile.id), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {})
    }
    sessionStorage.removeItem('dz_token')
    sessionStorage.removeItem('dz_mode')
    localStorage.removeItem('dz_mode')
    setMode(null)
    setUserProfile(null)
    await signOut(auth)
  }

  // Update study progress in Firestore
  const updateStudyProgress = async (updates) => {
    const userId = userProfile?.id || storage.getUserId()
    if (!userId) return
    try {
      await updateDoc(doc(db, 'studyProgress', userId), updates)
    } catch (err) {
      // If doc doesn't exist, create it
      try {
        await setDoc(doc(db, 'studyProgress', userId), {
          videosWatched: [],
          quizScores: [],
          streak: 0,
          lastStudiedDate: null,
          dailyGoalMinutes: 120,
          todayMinutes: 0,
          ...updates,
        })
      } catch (e) {
        console.error('Failed to update study progress:', e)
      }
    }
  }

  // Save quiz score to Firestore
  const saveQuizScore = async (scoreData) => {
    const userId = userProfile?.id || storage.getUserId()
    if (!userId) return
    try {
      await updateDoc(doc(db, 'studyProgress', userId), {
        quizScores: arrayUnion(scoreData),
      })
    } catch {
      console.error('Failed to save quiz score')
    }
  }

  // Update streak in Firestore
  const updateStreak = async () => {
    const userId = userProfile?.id || storage.getUserId()
    if (!userId) return
    try {
      const progressDoc = await getDoc(doc(db, 'studyProgress', userId))
      if (progressDoc.exists()) {
        const data = progressDoc.data()
        const today = new Date().toISOString().split('T')[0]
        const lastStudied = data.lastStudiedDate || ''
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

        let newStreak = data.streak || 0
        if (lastStudied === today) {
          // Already studied today, no change
          return newStreak
        } else if (lastStudied === yesterday) {
          newStreak += 1
        } else {
          newStreak = 1
        }

        await updateDoc(doc(db, 'studyProgress', userId), {
          streak: newStreak,
          lastStudiedDate: today,
        })
        return newStreak
      }
    } catch (err) {
      console.error('Failed to update streak:', err)
    }
    return 0
  }

  const value = {
    user,
    userProfile,
    mode,
    loading,
    register,
    login,
    logout,
    switchToMessenger,
    switchToStudy,
    setMode,
    setUserProfile,
    updateStudyProgress,
    saveQuizScore,
    updateStreak,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
