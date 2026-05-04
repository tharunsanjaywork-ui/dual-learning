import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { storage } from '../utils/storage'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const savedUsername = storage.getUsername()
  const savedDisplayName = storage.getDisplayName()
  const savedProfilePic = storage.getProfilePic()

  const [username, setUsername] = useState(savedUsername || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isReturningUser = !!savedUsername

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) { setError('Please enter your username'); return }
    if (!password) { setError('Please enter your password'); return }

    setLoading(true)
    try {
      const result = await login(username.toLowerCase().trim(), password)
      if (result.mode === 'study') {
        navigate('/study', { replace: true })
      } else {
        navigate('/messenger', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Incorrect password, try again')
    } finally {
      setLoading(false)
    }
  }

  const handleNotYou = () => {
    storage.clearAuth()
    navigate('/register', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Ambient glow blobs */}
      <div className="ambient-blob w-[600px] h-[600px] bg-primary-container -top-48 -left-48 fixed" />
      <div className="ambient-blob w-[500px] h-[500px] bg-primary-dim -bottom-40 -right-40 fixed" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl">
          {/* Profile Section */}
          <div className="flex flex-col items-center mb-8">
            {isReturningUser && savedProfilePic ? (
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary shadow-lg shadow-primary/20 animate-pulse-glow">
                  <img src={savedProfilePic} alt={savedDisplayName} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-secondary rounded-full flex items-center justify-center border-2 border-background">
                  <span className="material-symbols-outlined text-white text-xs">check</span>
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-surface-container-high border-2 border-primary/30 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">person</span>
              </div>
            )}

            {isReturningUser ? (
              <>
                <h2 className="font-headline text-xl font-bold text-on-surface">{savedDisplayName}</h2>
                <p className="text-on-surface-variant text-sm mt-1">Welcome back! 👋</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center animate-zoom-bounce">
                    <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
                  </div>
                  <h1 className="font-headline text-2xl font-bold text-on-surface">DualZone</h1>
                </div>
                <p className="text-on-surface-variant text-sm">Sign in to your sanctuary</p>
              </>
            )}
          </div>

          {error && (
            <div className="bg-error-container/30 border border-error/30 rounded-2xl px-4 py-3 mb-6 flex items-center gap-2 animate-shake">
              <span className="material-symbols-outlined text-error text-lg">error</span>
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up-fade">
            {/* Username (hidden if returning user) */}
            {!isReturningUser && (
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">alternate_email</span>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError('') }}
                  placeholder="Username"
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Enter your password"
                autoFocus={isReturningUser}
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-12 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white font-headline font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/30 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Login <span className="material-symbols-outlined text-lg">arrow_forward</span></>
              )}
            </button>
          </form>

          {isReturningUser ? (
            <p className="text-center text-on-surface-variant text-sm mt-6">
              Not you?{' '}
              <button onClick={handleNotYou} className="text-primary hover:text-primary-fixed transition-colors font-medium">
                Click here
              </button>
            </p>
          ) : (
            <p className="text-center text-on-surface-variant text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-primary-fixed transition-colors font-medium">Register</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
