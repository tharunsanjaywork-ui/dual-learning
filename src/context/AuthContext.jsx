import { createContext, useContext, useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp,
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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // Fetch profile from Firestore (try both UIDs)
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (profileDoc.exists()) {
          setUserProfile({ id: firebaseUser.uid, ...profileDoc.data() })
        } else {
          // Try to find by studyAccountUid or messengerAccountUid
          const allUsers = await getDocs(collection(db, 'users'))
          const found = allUsers.docs.find(d => 
            d.data().studyAccountUid === firebaseUser.uid || 
            d.data().messengerAccountUid === firebaseUser.uid
          )
          if (found) {
            setUserProfile({ id: found.id, ...found.data() })
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

    // Hash both passwords with bcrypt
    const studyHash = await bcrypt.hash(studyPassword, 12)
    const messengerHash = await bcrypt.hash(messengerPassword, 12)

    // Create Firebase Auth account with study password
    const cred = await createUserWithEmailAndPassword(auth, email, studyPassword)

    // Store user data in Firestore (keyed by Firebase Auth UID)
    await setDoc(doc(db, 'users', cred.user.uid), {
      username,
      email,
      secretEmail,
      displayName,
      profilePic: profilePic || '',
      bio: bio || '',
      interests: interests || [],
      passwordStudy: studyHash,
      passwordMessenger: messengerHash,
      followers: [],
      following: [],
      closeFriends: [],
      blockedUsers: [],
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    })

    // Create study progress doc
    await setDoc(doc(db, 'studyProgress', cred.user.uid), {
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
    storage.setUserId(cred.user.uid)

    // Sign out so user goes to login
    await signOut(auth)

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

    // Try study password first (Firebase Auth)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const profile = { id: firestoreId, ...userData }
      setUserProfile(profile)
      setUser(cred.user)

      await setDoc(doc(db, 'users', firestoreId), { isOnline: true, lastSeen: serverTimestamp() }, { merge: true })

      storage.setUsername(username)
      storage.setDisplayName(userData.displayName)
      storage.setProfilePic(userData.profilePic || '')
      storage.setUserId(firestoreId)

      const token = await cred.user.getIdToken()
      sessionStorage.setItem('dz_token', token)

      setMode('study')
      return { mode: 'study' }
    } catch {
      // Study password failed, try messenger password (Firebase Auth with secret email)
      try {
        const cred = await signInWithEmailAndPassword(auth, secretEmail, password)
        const profile = { id: firestoreId, ...userData }
        setUserProfile(profile)
        setUser(cred.user)

        await setDoc(doc(db, 'users', firestoreId), { isOnline: true, lastSeen: serverTimestamp() }, { merge: true })

        storage.setUsername(username)
        storage.setDisplayName(userData.displayName)
        storage.setProfilePic(userData.profilePic || '')
        storage.setUserId(firestoreId)

        const token = await cred.user.getIdToken()
        sessionStorage.setItem('dz_token', token)

        setMode('messenger')
        return { mode: 'messenger' }
      } catch {
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

    // Sign out current auth session
    await signOut(auth)

    // Sign in with secret email and messenger password
    const secretEmail = userProfile.secretEmail || `${userProfile.username}_secret@dualzone.app`
    await signInWithEmailAndPassword(auth, secretEmail, password)

    setMode('messenger')
    return true
  }

  // Switch from messenger to study (instant, no password)
  const switchToStudy = () => {
    setMode('study')
  }

  // Logout
  const logout = async () => {
    if (userProfile?.id) {
      await setDoc(doc(db, 'users', userProfile.id), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {})
    }
    sessionStorage.removeItem('dz_token')
    setMode(null)
    setUserProfile(null)
    await signOut(auth)
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
