import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { storage } from './utils/storage'
import { db } from './lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import CallScreen from './components/CallScreen'
import IncomingCall from './components/IncomingCall'
import { requestNotificationPermission } from './lib/notifications'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StudyLayout from './layouts/StudyLayout'
import MessengerLayout from './layouts/MessengerLayout'
import StudyHome from './pages/study/StudyHome'
import SubjectPage from './pages/study/SubjectPage'
import NotesPage from './pages/study/NotesPage'
import QuizPage from './pages/study/QuizPage'
import ProgressPage from './pages/study/ProgressPage'
import ChatListPage from './pages/messenger/ChatListPage'
import ChatPage from './pages/messenger/ChatPage'
import GroupChatPage from './pages/messenger/GroupChatPage'
import SearchPage from './pages/messenger/SearchPage'
import NotificationsPage from './pages/messenger/NotificationsPage'
import ProfilePage from './pages/messenger/ProfilePage'
import EditProfilePage from './pages/messenger/EditProfilePage'
import SettingsPage from './pages/messenger/SettingsPage'
import StoriesPage from './pages/messenger/StoriesPage'
import SwitchTransition from './components/shared/SwitchTransition'
import StorageMonitor from './components/StorageMonitor'
import NotificationBanner from './components/NotificationBanner'
import InstallPWA from './components/InstallPWA'

function ProtectedRoute({ children, requiredMode }) {
  const { user, mode, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-on-surface-variant font-body text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requiredMode && mode !== requiredMode) {
    return <Navigate to={`/${mode || 'login'}`} replace />
  }

  return children
}

export default function App() {
  const { loading, user, userProfile, mode } = useAuth()
  const [activeCall, setActiveCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)

  useEffect(() => {
    if (!userProfile?.id) return
    
    // Re-request permission if not granted yet
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        // Not yet asked — request after 3 seconds
        setTimeout(() => {
          requestNotificationPermission(userProfile.id)
            .then(token => {
              if (token) {
                console.log('[App] FCM token refreshed on app open')
              }
            })
            .catch(() => {})
        }, 3000)
      } else if (Notification.permission === 'granted') {
        // Already granted — just refresh the token
        // (tokens can expire and need refreshing)
        requestNotificationPermission(userProfile.id)
          .catch(() => {})
      }
    }
  }, [userProfile?.id])

  // ═══ GLOBAL INCOMING CALL LISTENER ═══
  useEffect(() => {
    if (!userProfile?.id) return
    if (mode !== 'messenger') return
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', userProfile.id),
      where('status', '==', 'ringing')
    )
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const callDoc = snap.docs[0]
        if (!activeCall) {
          setIncomingCall({
            callId: callDoc.id,
            callerId: callDoc.data().callerId
          })
        }
      } else {
        setIncomingCall(null)
      }
    })
    return unsub
  }, [userProfile?.id, activeCall, mode])

  // ═══ GLOBAL OUTGOING CALL LISTENER ═══
  useEffect(() => {
    const handler = (e) => {
      setActiveCall({
        callId: e.detail.callId,
        callerUser: e.detail.otherUser,
        isOutgoing: true
      })
    }
    window.addEventListener('dz_start_call', handler)
    return () => window.removeEventListener('dz_start_call', handler)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <>
    <StorageMonitor />
    <NotificationBanner />
    <InstallPWA />

    {/* Global call overlays — messenger mode only */}
    {mode === 'messenger' && activeCall && (
      <CallScreen
        callId={activeCall.callId}
        otherUser={activeCall.callerUser}
        isOutgoing={activeCall.isOutgoing}
        currentUserId={userProfile?.id}
        onEnd={() => setActiveCall(null)}
      />
    )}
    {mode === 'messenger' && incomingCall && !activeCall && (
      <IncomingCall
        callId={incomingCall.callId}
        callerId={incomingCall.callerId}
        onAccept={(callId, caller) => {
          setIncomingCall(null)
          setActiveCall({ callId, isOutgoing: false, callerUser: caller })
        }}
        onReject={() => setIncomingCall(null)}
      />
    )}

    <Routes>
      {/* Auth Routes */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/switching" element={<SwitchTransition />} />

      {/* Study Routes — NO auth required (Task 3) */}
      <Route path="/study" element={<StudyLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<StudyHome />} />
        <Route path="jee-mains" element={<SubjectPage subject="jee-mains" />} />
        <Route path="jee-advanced" element={<SubjectPage subject="jee-advanced" />} />
        <Route path="neet" element={<SubjectPage subject="neet" />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="progress" element={<ProgressPage />} />
      </Route>

      {/* Messenger Routes — protected */}
      <Route path="/messenger" element={
        <ProtectedRoute requiredMode="messenger">
          <ChatProvider>
            <MessengerLayout />
          </ChatProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="chats" replace />} />
        <Route path="chats" element={<ChatListPage />} />
        <Route path="chat/:chatId" element={<ChatPage />} />
        <Route path="group/:groupId" element={<GroupChatPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="stories" element={<StoriesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile/edit" element={<EditProfilePage />} />
        <Route path="profile/:userId" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Default redirect — always go to study (Task 3) */}
      <Route path="*" element={<Navigate to="/study/home" replace />} />
    </Routes>
    </>
  )
}
