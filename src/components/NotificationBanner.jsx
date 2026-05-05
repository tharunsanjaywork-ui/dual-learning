import { useState, useEffect } from 'react'

export default function NotificationBanner() {
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      setNotification(e.detail)
      setTimeout(() => setNotification(null), 4000)
    }
    window.addEventListener('dz_notification', handler)
    return () => window.removeEventListener('dz_notification', handler)
  }, [])

  if (!notification) return null

  return (
    <div
      onClick={() => {
        notification.onClick?.()
        setNotification(null)
      }}
      className="fixed top-4 left-4 right-4 z-[300] glass-strong rounded-2xl p-4 shadow-2xl border border-outline-variant/30 animate-fade-down cursor-pointer hover:opacity-90 transition-opacity"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-secondary">notifications</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-on-surface font-bold text-sm truncate">{notification.title}</p>
          <p className="text-on-surface-variant text-xs truncate">{notification.body}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setNotification(null) }}
          className="p-1 rounded-lg hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-outline text-sm">close</span>
        </button>
      </div>
    </div>
  )
}
