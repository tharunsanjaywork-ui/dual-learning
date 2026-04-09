import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SwitchModal({ isOpen, onClose }) {
  const { switchToMessenger } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!password) { setError('Enter your password'); return }

    setLoading(true)
    try {
      await switchToMessenger(password)
      onClose()
      navigate('/messenger', { replace: true })
    } catch {
      setError('Incorrect password')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative glass-strong rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-scale-in border border-primary/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center glow-primary">
            <span className="material-symbols-outlined text-primary text-3xl">shield_lock</span>
          </div>
        </div>

        <h3 className="font-headline text-xl font-bold text-on-surface text-center mb-1">Switch to Secret Mode</h3>
        <p className="text-on-surface-variant text-sm text-center mb-6">Enter your secondary password to continue</p>

        {error && (
          <div className="bg-error-container/30 border border-error/30 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-base">error</span>
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={`relative mb-5 ${shake ? 'animate-shake' : ''}`}>
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Secondary password"
              autoFocus
              className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-container-highest text-on-surface font-headline font-bold py-3.5 rounded-full hover:bg-surface-bright transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 gradient-primary text-white font-headline font-bold py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/30 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Switch Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
