import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { storage } from './utils/storage'

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
  const { loading } = useAuth()

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
    <Routes>
      {/* Auth Routes */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/switching" element={<SwitchTransition />} />

      {/* Study Routes */}
      <Route path="/study" element={
        <ProtectedRoute requiredMode="study">
          <StudyLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<StudyHome />} />
        <Route path="jee-mains" element={<SubjectPage subject="jee-mains" />} />
        <Route path="jee-advanced" element={<SubjectPage subject="jee-advanced" />} />
        <Route path="neet" element={<SubjectPage subject="neet" />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="quiz" element={<QuizPage />} />
        <Route path="progress" element={<ProgressPage />} />
      </Route>

      {/* Messenger Routes */}
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
        <Route path="profile/:userId" element={<ProfilePage />} />
        <Route path="profile/edit" element={<EditProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={storage.isFirstVisit() ? '/register' : '/login'} replace />} />
    </Routes>
    </>
  )
}
