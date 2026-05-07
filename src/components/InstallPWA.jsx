import { useState, useEffect } from 'react'

export default function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      // Show banner after 10 seconds
      setTimeout(() => setShowBanner(true), 10000)
    }

    const installedHandler = () => {
      setInstalled(true)
      setShowBanner(false)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setShowBanner(false)
  }

  if (!showBanner || installed) return null

  return (
    <div className="fixed bottom-24 md:bottom-6 left-4 right-4 z-[150] animate-fade-up">
      <div className="glass-strong rounded-2xl p-4 shadow-2xl border border-outline-variant/30 flex items-center gap-3">
        
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary">install_mobile</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-on-surface font-bold text-sm">Install Focus Sanctuary</p>
          <p className="text-on-surface-variant text-xs">Get notifications even when browser is minimized</p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowBanner(false)}
            className="px-3 py-1.5 rounded-xl text-on-surface-variant text-xs hover:bg-surface-container-high transition-colors">
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-opacity press-bounce">
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
