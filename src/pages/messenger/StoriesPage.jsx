import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, deleteDoc, getDocs, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { uploadToCloudinary } from '../../lib/cloudinary'

export default function StoriesPage() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [viewingStory, setViewingStory] = useState(null)
  const [viewIdx, setViewIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [closeFriendsOnly, setCloseFriendsOnly] = useState(false)
  const progressRef = useRef(null)
  const timerRef = useRef(null)

  // Fetch stories from people user follows + own stories
  useEffect(() => {
    if (!userProfile?.id) return
    const following = [...(userProfile.following || []), userProfile.id]

    const unsubs = []
    for (let i = 0; i < following.length; i += 10) {
      const batch = following.slice(i, i + 10)
      const q = query(collection(db, 'stories'), where('userId', 'in', batch))
      const unsub = onSnapshot(q, async (snap) => {
        const allStories = []
        for (const d of snap.docs) {
          const data = { id: d.id, ...d.data() }
          const created = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0
          if (Date.now() - created > 86400000) {
            deleteDoc(doc(db, 'stories', d.id)).catch(() => {})
            continue
          }
          if (data.closeFriendsOnly && data.userId !== userProfile.id && !data.closeFriends?.includes(userProfile.id)) continue
          const userDoc = await getDoc(doc(db, 'users', data.userId))
          if (userDoc.exists()) data.user = { id: userDoc.id, ...userDoc.data() }
          allStories.push(data)
        }
        const grouped = {}
        allStories.forEach(s => {
          if (!grouped[s.userId]) grouped[s.userId] = { user: s.user, stories: [] }
          grouped[s.userId].stories.push(s)
        })
        setStories(Object.values(grouped))
      })
      unsubs.push(unsub)
    }
    return () => unsubs.forEach(u => u())
  }, [userProfile?.id, userProfile?.following])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const type = file.type.startsWith('video/') ? 'video' : 'image'
      const result = await uploadToCloudinary(file, type, 'stories')
      await addDoc(collection(db, 'stories'), {
        userId: userProfile.id, type, mediaUrl: result.secure_url,
        caption: '', viewers: [], reactions: [],
        closeFriendsOnly, closeFriends: userProfile.closeFriends || [],
        createdAt: serverTimestamp(),
      })
    } catch (err) { alert('Upload failed: ' + err.message) }
    finally { setUploading(false) }
  }

  const openStory = (groupIdx) => {
    setViewingStory(groupIdx)
    setViewIdx(0)
    startTimer()
  }

  const startTimer = () => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => nextStory(), 5000)
  }

  const nextStory = () => {
    clearTimeout(timerRef.current)
    if (viewingStory === null) return
    const group = stories[viewingStory]
    if (!group) { closeStory(); return }
    if (viewIdx < group.stories.length - 1) {
      setViewIdx(prev => prev + 1)
      startTimer()
    } else if (viewingStory < stories.length - 1) {
      setViewingStory(prev => prev + 1)
      setViewIdx(0)
      startTimer()
    } else {
      closeStory()
    }
  }

  const prevStory = () => {
    clearTimeout(timerRef.current)
    if (viewIdx > 0) { setViewIdx(prev => prev - 1); startTimer() }
    else if (viewingStory > 0) {
      setViewingStory(prev => prev - 1)
      setViewIdx(stories[viewingStory - 1]?.stories.length - 1 || 0)
      startTimer()
    }
  }

  const closeStory = () => {
    clearTimeout(timerRef.current)
    setViewingStory(null)
    setViewIdx(0)
  }

  // Mark as viewed
  useEffect(() => {
    if (viewingStory === null || !userProfile?.id) return
    const story = stories[viewingStory]?.stories[viewIdx]
    if (story && !story.viewers?.includes(userProfile.id)) {
      updateDoc(doc(db, 'stories', story.id), { viewers: arrayUnion(userProfile.id) }).catch(() => {})
    }
  }, [viewingStory, viewIdx, userProfile?.id])

  const reactToStory = async (emoji) => {
    const story = stories[viewingStory]?.stories[viewIdx]
    if (!story) return
    await updateDoc(doc(db, 'stories', story.id), {
      reactions: arrayUnion({ uid: userProfile.id, emoji, name: userProfile.displayName })
    }).catch(() => {})
    if (story.userId !== userProfile.id) {
      await addDoc(collection(db, 'notifications'), {
        toUserId: story.userId, type: 'story_reaction',
        data: { fromId: userProfile.id, fromName: userProfile.displayName, emoji, storyId: story.id },
        read: false, createdAt: serverTimestamp(),
      }).catch(() => {})
    }
  }

  const currentStory = viewingStory !== null ? stories[viewingStory]?.stories[viewIdx] : null
  const currentGroup = viewingStory !== null ? stories[viewingStory] : null

  return (
    <div className="max-w-3xl mx-auto px-2 py-6 animate-page-enter">
      <div className="flex items-center gap-3 mb-6 px-2">
        <button onClick={() => navigate(-1)} className="page-back-btn">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <h1 className="font-headline text-2xl font-bold text-on-surface">Stories</h1>
      </div>

      {/* Story Circles — Instagram style */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-4">
        {/* Add Story Button — always first */}
        <label className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-dashed border-outline-variant">
              {uploading
                ? <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-secondary text-2xl">add</span>
              }
            </div>
            {userProfile?.profilePic && (
              <img src={userProfile.profilePic} alt=""
                className="absolute inset-0 w-full h-full rounded-full object-cover opacity-30" />
            )}
          </div>
          <span className="text-on-surface-variant text-[10px] w-16 text-center truncate">Add Story</span>
          <input type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>

        {/* Story circles */}
        {stories.map((group, i) => {
          const hasUnviewed = group.stories.some(s => !s.viewers?.includes(userProfile?.id))
          const isOwn = group.user?.id === userProfile?.id
          return (
            <button key={i} onClick={() => openStory(i)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-16 h-16 rounded-full p-[2px] ${hasUnviewed ? 'bg-gradient-to-tr from-secondary via-tertiary to-primary story-ring-animated' : 'bg-outline-variant/40'}`}>
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  {group.user?.profilePic
                    ? <img src={group.user.profilePic} alt="" className="w-full h-full rounded-full object-cover" />
                    : <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline text-base">person</span>
                      </div>
                  }
                </div>
              </div>
              <span className="text-on-surface-variant text-[10px] w-16 text-center truncate">
                {isOwn ? 'Your Story' : group.user?.displayName}
              </span>
            </button>
          )
        })}
        {stories.length === 0 && <p className="text-on-surface-variant text-sm py-8 pl-2">No stories yet. Be the first to share!</p>}
      </div>

      {/* Close Friends toggle — only when uploading */}
      <div className="px-4 mt-3">
        <button onClick={() => setCloseFriendsOnly(!closeFriendsOnly)}
          className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${closeFriendsOnly ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
          {closeFriendsOnly ? '★ Close Friends' : 'Everyone'}
        </button>
      </div>

      {/* Story Viewer Modal */}
      {viewingStory !== null && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Progress bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
            {currentGroup?.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div className={`h-full bg-white rounded-full ${i < viewIdx ? 'w-full' : i === viewIdx ? 'animate-story-progress' : 'w-0'}`} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center gap-3 z-10">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {currentGroup?.user?.profilePic
                ? <img src={currentGroup.user.profilePic} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full bg-white/20 flex items-center justify-center"><span className="material-symbols-outlined text-white text-sm">person</span></div>
              }
            </div>
            <span className="text-white text-sm font-medium">{currentGroup?.user?.displayName}</span>
            <span className="text-white/50 text-xs">{currentStory.createdAt?.toDate ? new Date(currentStory.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            <div className="flex-1" />
            {currentStory.closeFriendsOnly && <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">★ Close Friends</span>}
            <button onClick={closeStory} className="text-white/70 hover:text-white p-1">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Media */}
          <div className="w-full h-full flex items-center justify-center">
            {currentStory.type === 'video' ? (
              <video src={currentStory.mediaUrl} className="max-w-full max-h-full object-contain" autoPlay muted />
            ) : (
              <img src={currentStory.mediaUrl} alt="" className="max-w-full max-h-full object-contain" />
            )}
          </div>

          {/* Navigation areas */}
          <button onClick={prevStory} className="absolute left-0 top-0 bottom-0 w-1/3" />
          <button onClick={nextStory} className="absolute right-0 top-0 bottom-0 w-1/3" />

          {/* Reactions */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {['❤️', '🔥', '😂', '😮', '😢', '👏'].map(em => (
              <button key={em} onClick={() => reactToStory(em)} className="text-2xl hover:scale-125 transition-transform drop-shadow-lg">{em}</button>
            ))}
          </div>

          {/* Viewers (own stories) */}
          {currentStory.userId === userProfile?.id && (
            <div className="absolute bottom-20 left-4 z-10">
              <p className="text-white/60 text-xs"><span className="material-symbols-outlined text-sm align-middle">visibility</span> {currentStory.viewers?.length || 0} viewers</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
