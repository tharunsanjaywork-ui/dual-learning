import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { uploadToCloudinary } from '../lib/cloudinary'

const INTERESTS = ['Physics', 'Chemistry', 'Math', 'Biology', 'Coding', 'Music', 'Sports', 'Art']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({
    username: '',
    studyPassword: '',
    confirmStudyPassword: '',
    messengerPassword: '',
    confirmMessengerPassword: '',
    displayName: '',
    bio: '',
    interests: [],
  })
  const [profilePicFile, setProfilePicFile] = useState(null)
  const [profilePicPreview, setProfilePicPreview] = useState(null)
  const [showStudyPass, setShowStudyPass] = useState(false)
  const [showConfirmStudyPass, setShowConfirmStudyPass] = useState(false)
  const [showSecretPass, setShowSecretPass] = useState(false)
  const [showConfirmSecretPass, setShowConfirmSecretPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleProfilePic = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfilePicFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setProfilePicPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const toggleInterest = (interest) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!form.username.trim() || form.username.includes(' ')) {
      setError('Username cannot be empty or contain spaces'); return
    }
    if (form.studyPassword.length < 6) {
      setError('Password must be at least 6 characters'); return
    }
    if (form.studyPassword !== form.confirmStudyPassword) {
      setError('Passwords do not match'); return
    }
    if (form.messengerPassword.length < 6) {
      setError('Secondary password must be at least 6 characters'); return
    }
    if (form.messengerPassword !== form.confirmMessengerPassword) {
      setError('Secondary passwords do not match'); return
    }
    if (form.studyPassword === form.messengerPassword) {
      setError('Both passwords must be different'); return
    }
    if (!form.displayName.trim()) {
      setError('Display name is required'); return
    }

    setLoading(true)
    try {
      let profilePicUrl = ''
      if (profilePicFile) {
        const result = await uploadToCloudinary(profilePicFile, 'image', 'profile_pics')
        profilePicUrl = result.secure_url
      }

      await register({
        username: form.username.toLowerCase().trim(),
        studyPassword: form.studyPassword,
        messengerPassword: form.messengerPassword,
        displayName: form.displayName.trim(),
        profilePic: profilePicUrl,
        bio: form.bio.trim(),
        interests: form.interests,
      })

      navigate('/login')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Ambient glow blobs */}
      <div className="ambient-blob w-[500px] h-[500px] bg-primary-container -top-40 -left-40 fixed" />
      <div className="ambient-blob w-[400px] h-[400px] bg-primary-dim -bottom-32 -right-32 fixed" />

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Glass card */}
        <div className="glass-strong rounded-3xl p-8 md:p-10 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">DualZone</h1>
          </div>
          <p className="text-center text-on-surface-variant text-sm mb-8">Create your sanctuary for focus and flow</p>

          {error && (
            <div className="bg-error-container/30 border border-error/30 rounded-2xl px-4 py-3 mb-6 flex items-center gap-2 animate-shake">
              <span className="material-symbols-outlined text-error text-lg">error</span>
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">alternate_email</span>
              <input
                id="register-username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="johndoe"
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Study Password */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
              <input
                id="register-study-password"
                name="studyPassword"
                type={showStudyPass ? 'text' : 'password'}
                value={form.studyPassword}
                onChange={handleChange}
                placeholder="Create your password"
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-12 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <button type="button" onClick={() => setShowStudyPass(!showStudyPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">{showStudyPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {/* Confirm Study Password */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">check_circle</span>
              <input
                id="register-confirm-study"
                name="confirmStudyPassword"
                type={showConfirmStudyPass ? 'text' : 'password'}
                value={form.confirmStudyPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-12 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <button type="button" onClick={() => setShowConfirmStudyPass(!showConfirmStudyPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">{showConfirmStudyPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-outline-variant/30" />
              <span className="text-outline text-xs">SECONDARY</span>
              <div className="flex-1 h-px bg-outline-variant/30" />
            </div>

            {/* Secret Password */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">shield</span>
              <input
                id="register-messenger-password"
                name="messengerPassword"
                type={showSecretPass ? 'text' : 'password'}
                value={form.messengerPassword}
                onChange={handleChange}
                placeholder="Create a secondary password"
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-12 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <button type="button" onClick={() => setShowSecretPass(!showSecretPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">{showSecretPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {/* Confirm Secret Password */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">verified_user</span>
              <input
                id="register-confirm-messenger"
                name="confirmMessengerPassword"
                type={showConfirmSecretPass ? 'text' : 'password'}
                value={form.confirmMessengerPassword}
                onChange={handleChange}
                placeholder="Confirm secondary password"
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-12 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <button type="button" onClick={() => setShowConfirmSecretPass(!showConfirmSecretPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">{showConfirmSecretPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-outline-variant/30" />
              <span className="text-outline text-xs">PROFILE</span>
              <div className="flex-1 h-px bg-outline-variant/30" />
            </div>

            {/* Display Name */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">person</span>
              <input
                id="register-displayname"
                name="displayName"
                type="text"
                value={form.displayName}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden bg-surface-container-high border-2 border-dashed border-outline-variant/50 flex-shrink-0 group cursor-pointer"
                onClick={() => document.getElementById('profile-pic-input').click()}>
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline text-2xl">photo_camera</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg">edit</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-on-surface text-sm font-medium">Profile Picture</p>
                <p className="text-on-surface-variant text-xs">Click to upload (optional)</p>
              </div>
              <input id="profile-pic-input" type="file" accept="image/*" onChange={handleProfilePic} className="hidden" />
            </div>

            {/* Bio */}
            <div className="relative">
              <textarea
                id="register-bio"
                name="bio"
                value={form.bio}
                onChange={(e) => { if (e.target.value.length <= 150) handleChange(e) }}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl px-4 py-3.5 text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              />
              <span className="absolute bottom-3 right-4 text-xs text-outline">{form.bio.length}/150</span>
            </div>

            {/* Interests */}
            <div>
              <p className="text-on-surface-variant text-xs font-medium mb-3 uppercase tracking-wider">Interests</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      form.interests.includes(interest)
                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                        : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white font-headline font-bold text-base py-4 rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/30 disabled:opacity-50 disabled:pointer-events-none mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Account <span className="material-symbols-outlined text-lg">arrow_forward</span></>
              )}
            </button>
          </form>

          <p className="text-center text-on-surface-variant text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-fixed transition-colors font-medium">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
