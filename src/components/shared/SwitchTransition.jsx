import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SwitchTransition() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/study/home', { replace: true })
    }, 1800)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center">
      {/* Ambient glow */}
      <div className="ambient-blob w-[300px] h-[300px] bg-primary-container top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ position: 'absolute' }} />

      {/* Bouncing book icon */}
      <div className="relative animate-bounce-slow mb-8">
        <span
          className="material-symbols-outlined filled text-primary"
          style={{ fontSize: '72px', filter: 'drop-shadow(0 0 30px rgba(166,140,255,0.5))' }}
        >
          menu_book
        </span>
      </div>

      {/* Text with animated dots */}
      <div className="flex items-center gap-1 mb-8">
        <p className="text-on-surface font-headline text-lg font-semibold">Switching to StudyZone</p>
        <span className="inline-flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-dots" style={{ animationDelay: '0s' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-dots" style={{ animationDelay: '0.3s' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-dots" style={{ animationDelay: '0.6s' }} />
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-surface-container-high rounded-full overflow-hidden">
        <div className="h-full gradient-primary rounded-full animate-progress" />
      </div>
    </div>
  )
}
