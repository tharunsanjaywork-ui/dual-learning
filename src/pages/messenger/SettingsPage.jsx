import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { requestNotificationPermission } from '../../lib/notifications'
import { uploadToCloudinary } from '../../lib/cloudinary'

const SECTIONS = [
  {
    title: 'APPEARANCE',
    icon: 'palette',
    items: [
      { label: 'Chat Wallpaper', icon: 'wallpaper', type: 'wallpaper' },
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
  const { logout, userProfile } = useAuth()
  const wallpaperInputRef = useRef(null)
  const [wallpaperUploading, setWallpaperUploading] = useState(false)
  const [currentWallpaper, setCurrentWallpaper] = useState(() => {
    const wp = localStorage.getItem('dz_chat_wallpaper')
    return wp && typeof wp === 'string' && wp.startsWith('http') ? wp : ''
  })

  const [toggles, setToggles] = useState(() => {
    try {
      const saved = localStorage.getItem('dz_settings_toggles')
      return saved ? JSON.parse(saved) : {
        notifMessages: true, notifStories: true,
        notifFollows: true, notifGroups: true, followApproval: false, autoDownload: true,
      }
    } catch { return { notifMessages: true, notifStories: true, notifFollows: true, notifGroups: true, followApproval: false, autoDownload: true } }
  })
  const [selects, setSelects] = useState(() => {
    try {
      const saved = localStorage.getItem('dz_settings_selects')
      return saved ? JSON.parse(saved) : { lastSeen: 'Everyone', disappearing: 'Off' }
    } catch { return { lastSeen: 'Everyone', disappearing: 'Off' } }
  })


  const handleToggle = async (key) => {
    const newVal = !toggles[key]
    const updated = { ...toggles, [key]: newVal }
    setToggles(updated)
    localStorage.setItem('dz_settings_toggles', JSON.stringify(updated))


    // If enabling message notifications, request permission
    if (key === 'notifMessages' && newVal) {
      try {
        const token = await requestNotificationPermission(userProfile?.id)
        if (!token) {
          // Permission denied — revert toggle
          const reverted = { ...updated, [key]: false }
          setToggles(reverted)
          localStorage.setItem('dz_settings_toggles', JSON.stringify(reverted))
          alert('Notification permission was denied. Please enable it in browser settings.')
        } else {
          console.log('[DualZone] FCM token saved via settings')
        }
      } catch (err) {
        console.error('Notification setup error:', err)
        const reverted = { ...updated, [key]: false }
        setToggles(reverted)
        localStorage.setItem('dz_settings_toggles', JSON.stringify(reverted))
      }
    }
  }

  // Chat wallpaper upload handler
  const handleWallpaperUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setWallpaperUploading(true)
    try {
      const result = await uploadToCloudinary(file, 'image', 'wallpapers')
      const wallpaperUrl = result?.secure_url || (typeof result === 'string' ? result : '')
      if (wallpaperUrl) {
        localStorage.setItem('dz_chat_wallpaper', wallpaperUrl)
        setCurrentWallpaper(wallpaperUrl)
      }
    } catch (err) {
      console.error('Wallpaper upload failed:', err)
      alert('Failed to upload wallpaper. Please try again.')
    } finally {
      setWallpaperUploading(false)
      // Reset file input
      if (wallpaperInputRef.current) wallpaperInputRef.current.value = ''
    }
  }

  const removeWallpaper = () => {
    localStorage.removeItem('dz_chat_wallpaper')
    setCurrentWallpaper('')
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

      {/* Hidden file input for wallpaper */}
      <input
        ref={wallpaperInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleWallpaperUpload}
      />

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

                  {item.type === 'wallpaper' && (
                    <div className="flex items-center gap-2">
                      {currentWallpaper && (
                        <>
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-outline-variant/30">
                            <img src={currentWallpaper} alt="wallpaper" className="w-full h-full object-cover" />
                          </div>
                          <button onClick={removeWallpaper} className="p-1 rounded-lg hover:bg-error/10 transition-colors" title="Remove wallpaper">
                            <span className="material-symbols-outlined text-error text-sm">close</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => wallpaperInputRef.current?.click()}
                        disabled={wallpaperUploading}
                        className="p-1 rounded-lg hover:bg-surface-container-high transition-colors"
                      >
                        {wallpaperUploading ? (
                          <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
                        )}
                      </button>
                    </div>
                  )}

                  {item.type === 'select' && (
                    <select
                      value={selects[item.key]}
                      onChange={e => { const updated = { ...selects, [item.key]: e.target.value }; setSelects(updated); localStorage.setItem('dz_settings_selects', JSON.stringify(updated)) }}
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
