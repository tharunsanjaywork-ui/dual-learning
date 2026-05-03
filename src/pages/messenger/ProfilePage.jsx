import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { db } from '../../lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import QRCode from 'qrcode'

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { userProfile, setUserProfile } = useAuth()
  const { getOrCreateChat } = useChat()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState('')

  const isOwnProfile = userId === 'me' || userId === userProfile?.id

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      if (isOwnProfile) {
        setProfile(userProfile)
      } else {
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) setProfile({ id: userId, ...userDoc.data() })
      }
      setLoading(false)
    }
    fetchProfile()
  }, [userId, userProfile, isOwnProfile])

  const isFollowing = userProfile?.following?.includes(profile?.id)

  const handleFollow = async () => {
    if (!userProfile?.id || !profile?.id || isOwnProfile) return
    const myRef = doc(db, 'users', userProfile.id)
    const theirRef = doc(db, 'users', profile.id)
    if (isFollowing) {
      await updateDoc(myRef, { following: arrayRemove(profile.id) })
      await updateDoc(theirRef, { followers: arrayRemove(userProfile.id) })
      setUserProfile(prev => ({ ...prev, following: prev.following.filter(id => id !== profile.id) }))
      setProfile(prev => ({ ...prev, followers: prev.followers?.filter(id => id !== userProfile.id) || [] }))
    } else {
      await updateDoc(myRef, { following: arrayUnion(profile.id) })
      await updateDoc(theirRef, { followers: arrayUnion(userProfile.id) })
      setUserProfile(prev => ({ ...prev, following: [...(prev.following || []), profile.id] }))
      setProfile(prev => ({ ...prev, followers: [...(prev.followers || []), userProfile.id] }))

      // Send notification
      await addDoc(collection(db, 'notifications'), {
        toUserId: profile.id,
        type: 'follow',
        data: {
          fromId: userProfile.id,
          fromName: userProfile.displayName
        },
        read: false,
        createdAt: serverTimestamp()
      })
    }
  }

  const handleMessage = async () => {
    if (!profile?.id) return
    const chatId = await getOrCreateChat(profile.id)
    if (chatId) navigate(`/messenger/chat/${chatId}`)
  }

  const isBlocked = userProfile?.blockedUsers?.includes(profile?.id)

  const handleBlock = async () => {
    if (!userProfile?.id || !profile?.id || isOwnProfile) return
    const myRef = doc(db, 'users', userProfile.id)
    if (isBlocked) {
      await updateDoc(myRef, { blockedUsers: arrayRemove(profile.id) })
      setUserProfile(prev => ({ ...prev, blockedUsers: (prev.blockedUsers || []).filter(id => id !== profile.id) }))
    } else {
      if (!confirm(`Block @${profile.username}? They won't be able to message you.`)) return
      await updateDoc(myRef, { blockedUsers: arrayUnion(profile.id) })
      setUserProfile(prev => ({ ...prev, blockedUsers: [...(prev.blockedUsers || []), profile.id] }))
    }
  }

  // Generate QR code for own profile
  useEffect(() => {
    if (isOwnProfile && profile) {
      const url = `${window.location.origin}/messenger/profile/${profile.id}`
      QRCode.toDataURL(url, { width: 200, color: { dark: '#00e475', light: '#0a0a0a' } })
        .then(setQrUrl).catch(() => {})
    }
  }, [isOwnProfile, profile])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-20 mb-3">person_off</span>
        <p className="text-on-surface-variant">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center mb-8">
        {/* Profile Picture */}
        <div className="relative mb-5">
          <div className="w-32 h-32 md:w-44 md:h-44 rounded-full p-1 bg-gradient-to-r from-secondary to-tertiary shadow-[0_0_40px_rgba(0,228,117,0.3)]">
            <div className="w-full h-full rounded-full overflow-hidden bg-background p-0.5">
              {profile.profilePic ? (
                <img src={profile.profilePic} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-5xl">person</span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-8 h-8 bg-secondary rounded-full flex items-center justify-center border-3 border-background shadow-lg">
            <span className="material-symbols-outlined filled text-white text-sm">verified</span>
          </div>
        </div>

        {/* Name */}
        <h1 className="font-headline text-2xl md:text-4xl font-black text-on-surface mb-1">{profile.displayName}</h1>
        <p className="text-secondary font-medium mb-2">@{profile.username}</p>
        {profile.bio && <p className="text-on-surface-variant text-sm max-w-sm mb-4">{profile.bio}</p>}

        {/* Interest chips */}
        {profile.interests?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {profile.interests.map(i => (
              <span key={i} className="px-3 py-1 rounded-full border border-secondary/30 text-secondary text-xs font-medium">{i}</span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-8 mb-6">
          {[
            { label: 'Followers', value: profile.followers?.length || 0 },
            { label: 'Following', value: profile.following?.length || 0 },
            { label: 'Stories', value: 0 },
          ].map(stat => (
            <button key={stat.label} className="text-center group">
              <p className="font-headline text-xl font-bold text-on-surface group-hover:text-secondary transition-colors">{stat.value}</p>
              <p className="text-on-surface-variant text-xs">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        {isOwnProfile ? (
          <button
            onClick={() => navigate('/messenger/profile/edit')}
            className="w-full max-w-sm bg-surface-container-highest text-on-surface font-headline font-bold py-3 rounded-full hover:bg-surface-bright transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">edit</span>Edit Profile
          </button>
        ) : (
          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={handleFollow}
              className={`flex-1 py-3 rounded-full font-headline font-bold text-sm transition-all ${
                isFollowing
                  ? 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                  : 'bg-secondary text-on-secondary hover:scale-[1.02] shadow-lg shadow-secondary/30'
              }`}
            >
              {isFollowing ? 'Following ✓' : 'Follow'}
            </button>
            <button onClick={handleMessage} className="flex-1 border border-outline-variant/30 text-on-surface py-3 rounded-full font-headline font-bold text-sm hover:bg-surface-container-high transition-colors">
              Message
            </button>
            <button onClick={handleBlock} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${isBlocked ? 'border-error/30 bg-error/10 text-error' : 'border-outline-variant/30 hover:bg-surface-container-high text-on-surface-variant'}`} title={isBlocked ? 'Unblock' : 'Block'}>
              <span className="material-symbols-outlined text-lg">{isBlocked ? 'person_off' : 'block'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Story Highlights */}
      <section className="mb-8">
        <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-4">Story Highlights</h3>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
          <button className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-outline-variant/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-outline text-xl">add</span>
            </div>
            <span className="text-on-surface-variant text-[10px]">New</span>
          </button>
          {['Travel', 'Food', 'Study'].map(h => (
            <button key={h} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-xl">photo_camera</span>
              </div>
              <span className="text-on-surface-variant text-[10px]">{h}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Media Grid Placeholder */}
      <section>
        <div className="flex gap-1 mb-4 border-b border-outline-variant/20">
          {['POSTS', 'REELS', 'TAGGED'].map((tab, i) => (
            <button key={tab} className={`flex-1 py-3 text-xs font-bold tracking-wider ${i === 0 ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-surface-container-high rounded-lg flex items-center justify-center group hover:opacity-80 transition-opacity cursor-pointer relative">
              <span className="material-symbols-outlined text-outline/20 text-3xl">image</span>
              <div className="absolute inset-0 bg-secondary/0 group-hover:bg-secondary/20 rounded-lg transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-3 text-white text-xs font-bold">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">favorite</span>0</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">chat_bubble</span>0</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* QR Code (own profile only) */}
      {isOwnProfile && qrUrl && (
        <section className="mb-8">
          <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-4">Share Profile</h3>
          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 flex flex-col items-center">
            <img src={qrUrl} alt="Profile QR Code" className="w-40 h-40 rounded-xl mb-3" />
            <p className="text-on-surface-variant text-sm mb-2">Scan to view profile</p>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/messenger/profile/${profile?.id}`); alert('Link copied!') }}
              className="px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium hover:bg-secondary/20 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-base">content_copy</span>Copy Link
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
