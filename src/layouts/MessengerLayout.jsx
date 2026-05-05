import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import CallScreen from '../components/CallScreen'
import IncomingCall from '../components/IncomingCall'

const MOBILE_NAV = [
  { to: '/messenger/chats', label: 'Home', icon: 'home' },
  { to: '/messenger/stories', label: 'Stories', icon: 'auto_stories' },
  { to: '/messenger/search', label: 'Search', icon: 'search' },
  { to: '/messenger/notifications', label: 'Alerts', icon: 'notifications' },
  { to: '/messenger/profile/me', label: 'Profile', icon: 'person' },
]

export default function MessengerLayout() {
  const { userProfile, switchToStudy, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)

  const cameFromNotification = new URLSearchParams(window.location.search).get('from') === 'notification'

  const handleSwitch = () => {
    switchToStudy()
    navigate('/switching', { replace: true })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Check if we're in a chat (hide bottom nav on mobile)
  const isInChat = location.pathname.includes('/chat/') || location.pathname.includes('/group/')

  // ═══ INCOMING CALL LISTENER (works on ALL messenger pages) ═══
  useEffect(() => {
    if (!userProfile?.id) return
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', userProfile.id),
      where('status', '==', 'ringing')
    )
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const callDoc = snap.docs[0]
        setIncomingCall({
          callId: callDoc.id,
          callerId: callDoc.data().callerId
        })
      } else {
        setIncomingCall(null)
      }
    })
    return unsub
  }, [userProfile?.id])

  // ═══ OUTGOING CALL LISTENER (dispatched from ChatPage) ═══
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

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 px-3 md:px-6 flex items-center gap-2 md:gap-3">
        {/* Logo */}
        <NavLink to="/messenger/chats" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base">auto_awesome</span>
          </div>
          <span className="font-headline text-base font-bold text-on-surface hidden md:block">Focus Sanctuary</span>
        </NavLink>

        {/* Search (desktop) */}
        <div className="flex-1 max-w-md mx-auto hidden md:block">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-sm text-on-surface focus:border-secondary/50 transition-all"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-0.5 md:gap-1 ml-auto flex-shrink-0">
          {/* Home Button */}
          <NavLink
            to="/messenger/chats"
            className={({ isActive }) =>
              `flex items-center gap-1 px-2 md:px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'text-secondary bg-secondary/10'
                  : 'text-on-surface-variant hover:text-secondary hover:bg-secondary/10'
              }`
            }
          >
            <span className="material-symbols-outlined text-lg">home</span>
            <span className="hidden md:inline text-sm">Home</span>
          </NavLink>

          {/* Notifications */}
          <NavLink
            to="/messenger/notifications"
            className="relative p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all hidden md:flex"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          </NavLink>

          {/* Switch to Study */}
          {!cameFromNotification && (
          <button
            onClick={handleSwitch}
            className="flex items-center gap-1 px-2 md:px-3 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-all"
            title="Switch to Study"
          >
            <span className="material-symbols-outlined text-lg">swap_horiz</span>
            <span className="hidden lg:inline">Switch</span>
          </button>
          )}

          {/* Avatar */}
          <div className="relative">
            <button
              onClick={() => setAvatarOpen(!avatarOpen)}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-outline-variant/50 hover:border-secondary transition-colors"
            >
              {userProfile?.profilePic ? (
                <img src={userProfile.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-lg">person</span>
                </div>
              )}
            </button>

            {avatarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-56 glass-strong rounded-2xl p-2 shadow-2xl border border-outline-variant/20 animate-scale-in">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-on-surface font-medium text-sm truncate">{userProfile?.displayName}</p>
                    <p className="text-on-surface-variant text-xs truncate">@{userProfile?.username}</p>
                  </div>
                  <div className="h-px bg-outline-variant/20 my-1" />
                  <button onClick={() => { setAvatarOpen(false); navigate('/messenger/profile/me') }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-lg">person</span>View Profile
                  </button>
                  <button onClick={() => { setAvatarOpen(false); navigate('/messenger/profile/edit') }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-lg">edit</span>Edit Profile
                  </button>
                  <button onClick={() => { setAvatarOpen(false); navigate('/messenger/settings') }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-lg">settings</span>Settings
                  </button>
                  <div className="h-px bg-outline-variant/20 my-1" />
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-error hover:bg-error-container/20 transition-colors">
                    <span className="material-symbols-outlined text-lg">logout</span>Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="pt-14 md:pt-16 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      {!isInChat && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-low/90 backdrop-blur-xl border-t border-outline-variant/20 px-2 py-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center">
            {MOBILE_NAV.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl transition-all ${
                    isActive ? 'text-secondary' : 'text-on-surface-variant'
                  }`
                }
              >
                <span className="material-symbols-outlined text-xl">{link.icon}</span>
                <span className="text-[10px] font-medium">{link.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {/* ═══ CALL OVERLAYS (global — works on all messenger pages) ═══ */}
      {activeCall && (
        <CallScreen
          callId={activeCall.callId}
          otherUser={activeCall.callerUser}
          isOutgoing={activeCall.isOutgoing}
          currentUserId={userProfile?.id}
          onEnd={() => setActiveCall(null)}
        />
      )}
      {incomingCall && !activeCall && (
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
    </div>
  )
}
