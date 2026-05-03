import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const SECTIONS = [
  {
    title: 'APPEARANCE',
    icon: 'palette',
    items: [
      { label: 'Dark / Light Mode', icon: 'dark_mode', type: 'toggle', key: 'darkMode' },
      { label: 'Chat Wallpaper', icon: 'wallpaper', type: 'link' },
    ],
  },
  {
    title: 'NOTIFICATIONS',
    icon: 'notifications',
    items: [
      { label: 'Messages', icon: 'chat', type: 'toggle', key: 'notifMessages' },
      { label: 'Stories', icon: 'auto_stories', type: 'toggle', key: 'notifStories' },
      { label: 'Follows', icon: 'person_add', type: 'toggle', key: 'notifFollows' },
      { label: 'Groups', icon: 'group', type: 'toggle', key: 'notifGroups' },
    ],
  },
  {
    title: 'PRIVACY',
    icon: 'lock',
    items: [
      { label: 'Last Seen', icon: 'schedule', type: 'select', options: ['Everyone', 'Followers', 'Nobody'], key: 'lastSeen' },
      { label: 'Follow Approval', icon: 'how_to_reg', type: 'toggle', key: 'followApproval' },
      { label: 'Blocked Users', icon: 'block', type: 'link' },
    ],
  },
  {
    title: 'CHAT',
    icon: 'chat_bubble',
    items: [
      { label: 'Disappearing Messages', icon: 'timer', type: 'select', options: ['Off', '24 hours', '7 days', '30 days'], key: 'disappearing' },
      { label: 'Auto-download Media', icon: 'download', type: 'toggle', key: 'autoDownload' },
    ],
  },
  {
    title: 'ACCOUNT',
    icon: 'manage_accounts',
    items: [
      { label: 'Change Password', icon: 'password', type: 'link' },
      { label: 'Delete Account', icon: 'delete_forever', type: 'danger' },
    ],
  },
  {
    title: 'ABOUT',
    icon: 'info',
    items: [
      { label: 'App Version', icon: 'update', type: 'info', value: 'v1.0.0' },
      { label: 'Terms of Service', icon: 'description', type: 'link' },
      { label: 'Privacy Policy', icon: 'policy', type: 'link' },
    ],
  },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [toggles, setToggles] = useState({
    darkMode: true,
    notifMessages: true,
    notifStories: true,
    notifFollows: true,
    notifGroups: true,
    followApproval: false,
    autoDownload: true,
  })
  const [selects, setSelects] = useState({
    lastSeen: 'Everyone',
    disappearing: 'Off',
  })

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 animate-page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="page-back-btn">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <h1 className="font-headline text-2xl font-bold text-on-surface">Settings</h1>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">{section.icon}</span>
              {section.title}
            </h3>
            <div className="bg-surface-container border border-outline-variant/20 rounded-2xl overflow-hidden divide-y divide-outline-variant/10">
              {section.items.map(item => (
                <div key={item.label} className={`flex items-center gap-3 px-4 py-3.5 ${item.type === 'danger' ? 'hover:bg-error/5' : 'hover:bg-surface-container-high/50'} transition-colors`}>
                  <span className={`material-symbols-outlined text-lg ${item.type === 'danger' ? 'text-error' : 'text-on-surface-variant'}`}>{item.icon}</span>
                  <span className={`flex-1 text-sm font-medium ${item.type === 'danger' ? 'text-error' : 'text-on-surface'}`}>{item.label}</span>

                  {item.type === 'toggle' && (
                    <button
                      onClick={() => handleToggle(item.key)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${toggles[item.key] ? 'bg-secondary' : 'bg-outline-variant'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm ${toggles[item.key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                  )}

                  {item.type === 'select' && (
                    <select
                      value={selects[item.key]}
                      onChange={e => setSelects(prev => ({ ...prev, [item.key]: e.target.value }))}
                      className="bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs text-on-surface-variant"
                    >
                      {item.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}

                  {item.type === 'info' && (
                    <span className="text-on-surface-variant text-sm">{item.value}</span>
                  )}

                  {item.type === 'link' && (
                    <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
                  )}

                  {item.type === 'danger' && (
                    <span className="material-symbols-outlined text-error text-lg">chevron_right</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full mt-8 bg-error/10 border border-error/30 text-error font-headline font-bold py-3.5 rounded-2xl hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-lg">logout</span>Logout
      </button>
    </div>
  )
}
