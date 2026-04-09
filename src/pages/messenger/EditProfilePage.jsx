import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { storage } from '../../utils/storage'

const INTERESTS = ['Physics', 'Chemistry', 'Math', 'Biology', 'Coding', 'Music', 'Sports', 'Art']

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { userProfile, setUserProfile } = useAuth()

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [bio, setBio] = useState(userProfile?.bio || '')
  const [interests, setInterests] = useState(userProfile?.interests || [])
  const [profilePicFile, setProfilePicFile] = useState(null)
  const [preview, setPreview] = useState(userProfile?.profilePic || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePicChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfilePicFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const toggleInterest = (i) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Display name is required'); return }
    setLoading(true)
    setError('')
    try {
      let picUrl = userProfile?.profilePic || ''
      if (profilePicFile) {
        const result = await uploadToCloudinary(profilePicFile, 'image', 'profile_pics')
        picUrl = result.secure_url
      }

      const updates = { displayName: displayName.trim(), bio: bio.trim(), interests, profilePic: picUrl }
      await updateDoc(doc(db, 'users', userProfile.id), updates)
      setUserProfile(prev => ({ ...prev, ...updates }))
      storage.setDisplayName(displayName.trim())
      storage.setProfilePic(picUrl)
      navigate('/messenger/profile/me')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-8">Edit Profile</h1>

      {/* Profile Picture */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer" onClick={() => document.getElementById('edit-pic-input').click()}>
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-r from-secondary to-tertiary shadow-[0_0_40px_rgba(0,228,117,0.3)]">
            <div className="w-full h-full rounded-full overflow-hidden bg-background p-0.5">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-4xl">person</span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
          </div>
          <div className="absolute bottom-0 right-0 w-9 h-9 bg-secondary rounded-full flex items-center justify-center border-3 border-background shadow-lg">
            <span className="material-symbols-outlined text-white text-sm">edit</span>
          </div>
        </div>
        <input id="edit-pic-input" type="file" accept="image/*" onChange={handlePicChange} className="hidden" />
      </div>

      {error && (
        <div className="bg-error-container/30 border border-error/30 rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-base">error</span>
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        {/* Display Name */}
        <div>
          <label className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-2 block">Display Name</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">person</span>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-on-surface text-sm focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all" />
          </div>
        </div>

        {/* Username (disabled) */}
        <div>
          <label className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-2 block">Username</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-lg">alternate_email</span>
            <input type="text" value={userProfile?.username || ''} disabled
              className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl pl-12 pr-12 py-3.5 text-on-surface-variant text-sm cursor-not-allowed" />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-2 block">Bio</label>
          <div className="relative">
            <textarea value={bio} onChange={e => { if (e.target.value.length <= 150) setBio(e.target.value) }}
              rows={3} placeholder="Tell people about yourself..."
              className="w-full bg-surface-container-high border border-outline-variant/50 rounded-2xl px-4 py-3.5 text-on-surface text-sm focus:border-secondary focus:ring-1 focus:ring-secondary/30 transition-all resize-none" />
            <span className="absolute bottom-3 right-4 text-xs text-outline">{bio.length}/150</span>
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3 block">Interests</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(i => (
              <button key={i} type="button" onClick={() => toggleInterest(i)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  interests.includes(i)
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                }`}>
                {i}
              </button>
            ))}
            <button className="px-4 py-2 rounded-full text-sm font-medium border border-dashed border-outline-variant/50 text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors">
              + Add more
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-secondary text-on-secondary font-headline font-bold py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-secondary/30 disabled:opacity-50">
            {loading ? <div className="w-5 h-5 border-2 border-on-secondary border-t-transparent rounded-full animate-spin mx-auto" /> : 'Save Changes'}
          </button>
          <button onClick={() => navigate(-1)}
            className="flex-1 bg-surface-container-highest text-on-surface font-headline font-bold py-3.5 rounded-full hover:bg-surface-bright transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
