import { useState, useEffect } from 'react'
import { checkStorageUsage } from '../lib/cloudinary'

export default function StorageMonitor() {
  const [show, setShow] = useState(false)
  const [level, setLevel] = useState('warning') // 'warning' | 'critical'
  const [usage, setUsage] = useState({ percentage: 0 })

  useEffect(() => {
    const check = async () => {
      const data = await checkStorageUsage()
      setUsage(data)
      if (data.percentage >= 95) { setLevel('critical'); setShow(true) }
      else if (data.percentage >= 90) { setLevel('warning'); setShow(true) }
    }
    check()
    const interval = setInterval(check, 300000) // Check every 5 min
    return () => clearInterval(interval)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4 animate-slide-up">
      <div className={`rounded-2xl p-5 shadow-2xl border ${level === 'critical' ? 'bg-error/90 border-error text-white' : 'bg-surface-container border-outline-variant/30'}`}>
        <div className="flex items-start gap-3">
          <span className={`material-symbols-outlined text-2xl ${level === 'critical' ? 'text-white' : 'text-error'}`}>
            {level === 'critical' ? 'error' : 'warning'}
          </span>
          <div className="flex-1">
            <h4 className={`font-bold text-sm mb-1 ${level === 'critical' ? 'text-white' : 'text-on-surface'}`}>
              {level === 'critical' ? 'Storage Almost Full!' : 'Storage Warning'}
            </h4>
            <p className={`text-xs mb-3 ${level === 'critical' ? 'text-white/80' : 'text-on-surface-variant'}`}>
              {usage.percentage}% of storage used. {level === 'critical' ? 'Delete old files or upgrade.' : 'Consider managing your files.'}
            </p>
            <div className="w-full bg-white/20 rounded-full h-1.5 mb-3">
              <div className={`h-full rounded-full ${level === 'critical' ? 'bg-white' : 'bg-error'}`} style={{ width: `${Math.min(usage.percentage, 100)}%` }} />
            </div>
            <div className="flex gap-2">
              <button className={`px-4 py-1.5 rounded-full text-xs font-bold ${level === 'critical' ? 'bg-white text-error' : 'bg-error text-white'}`}>
                Upgrade
              </button>
              <button onClick={() => setShow(false)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${level === 'critical' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
