import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SwitchModal from '../components/shared/SwitchModal'

const NAV_LINKS = [
  { to: '/study/home', label: 'Home', icon: 'home' },
  { to: '/study/jee-mains', label: 'JEE Mains', icon: 'school' },
  { to: '/study/jee-advanced', label: 'JEE Advanced', icon: 'rocket_launch' },
  { to: '/study/neet', label: 'NEET', icon: 'medical_services' },
  { to: '/study/quiz', label: 'Quiz', icon: 'quiz' },
  { to: '/study/notes', label: 'Notes', icon: 'description' },
  { to: '/study/progress', label: 'Progress', icon: 'trending_up' },
]

const MOBILE_NAV = [
  { to: '/study/home', label: 'Home', icon: 'home' },
  { to: '/study/quiz', label: 'Quiz', icon: 'quiz' },
  { to: '/study/notes', label: 'Notes', icon: 'description' },
  { to: '/study/progress', label: 'Progress', icon: 'trending_up' },
  { to: '/study/jee-mains', label: 'Explore', icon: 'explore' },
]

export default function StudyLayout() {
  const { user, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [switchOpen, setSwitchOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const cameFromNotification = new URLSearchParams(window.location.search).get('from') === 'notification'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Switch button: if not logged in, go to login. If logged in, show auth modal.
  const handleSwitch = () => {
    if (!user) {
      navigate('/login')
      return
    }
    setSwitchOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Top Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 px-6 items-center gap-2">
        {/* Logo */}
        <NavLink to="/study/home" className="flex items-center gap-2 mr-4 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base">auto_awesome</span>
          </div>
          <span className="font-headline text-base font-bold text-on-surface hidden lg:block">Focus Sanctuary</span>
        </NavLink>

        {/* Nav Links */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto hide-scrollbar">
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`
              }
            >
              <span className="material-symbols-outlined text-lg">{link.icon}</span>
              <span className="hidden lg:inline">{link.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search */}
          <div className="relative hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-surface-container-high border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-sm text-on-surface w-48 focus:w-64 transition-all focus:border-primary/50"
            />
          </div>

          {/* Switch Button */}
          {!cameFromNotification && (
          <button
            onClick={handleSwitch}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 hover:from-primary/30 hover:to-secondary/30 transition-all duration-300 text-on-surface group"
            title="Switch Mode"
          >
            <span className="text-xl group-hover:rotate-180 transition-transform duration-500">🤖</span>
            <span className="hidden xl:inline text-sm font-medium text-on-surface">Chatbot</span>
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse absolute -top-0.5 -right-0.5" />
          </button>
          )}

          {/* Avatar / Sign In */}
          {user && userProfile ? (
            <div className="relative">
              <button
                onClick={() => setAvatarOpen(!avatarOpen)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-outline-variant/50 hover:border-primary transition-colors"
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
                    <button onClick={() => { setAvatarOpen(false); navigate(`/study/home`) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-lg">person</span>View Profile
                    </button>
                    <button onClick={() => { setAvatarOpen(false); navigate(`/study/home`) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-lg">edit</span>Edit Profile
                    </button>
                    <button onClick={() => { setAvatarOpen(false); setSwitchOpen(true) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined text-lg">swap_horiz</span>Switch Mode
                    </button>
                    <div className="h-px bg-outline-variant/20 my-1" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-error hover:bg-error-container/20 transition-colors">
                      <span className="material-symbols-outlined text-lg">logout</span>Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all">
              <span className="material-symbols-outlined text-lg">login</span>
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 px-3 flex items-center">
        <NavLink to="/study/home" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base">auto_awesome</span>
          </div>
          <span className="font-headline text-sm font-bold text-on-surface">Focus Sanctuary</span>
        </NavLink>
        <div className="flex-1" />
        {/* Mobile Switch Button */}
        {!cameFromNotification && (
        <button
          onClick={handleSwitch}
          className="relative flex flex-col items-center gap-1 px-4 py-2 text-primary"
          title="Switch Mode"
        >
          <span className="text-2xl">🤖</span>
          <span className="text-xs font-medium">Chatbot</span>
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse absolute top-1 right-2" />
        </button>
        )}
        {/* Mobile Avatar / Sign In */}
        {user && userProfile ? (
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-outline-variant/50"
          >
            {userProfile?.profilePic ? (
              <img src={userProfile.profilePic} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-sm">person</span>
              </div>
            )}
          </button>
        ) : (
          <Link to="/login" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all">
            <span className="material-symbols-outlined text-lg">login</span>
          </Link>
        )}
      </div>

      {/* Page Content */}
      <main className="pt-14 md:pt-16 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-container-low/90 backdrop-blur-xl border-t border-outline-variant/20 px-2 py-1">
        <div className="flex items-center justify-around">
          {MOBILE_NAV.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`
              }
            >
              <span className="material-symbols-outlined text-xl">{link.icon}</span>
              <span className="text-[10px] font-medium">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Switch Modal — only show if logged in */}
      {user && <SwitchModal isOpen={switchOpen} onClose={() => setSwitchOpen(false)} />}
    </div>
  )
}
