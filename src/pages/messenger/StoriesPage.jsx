import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [audience, setAudience] = useState('everyone') // 'everyone' | 'followers' | 'close_friends'
  const [isPaused, setIsPaused] = useState(false)
  const [showViewersModal, setShowViewersModal] = useState(false)
  const [viewerProfiles, setViewerProfiles] = useState([])
  const [loadingViewers, setLoadingViewers] = useState(false)

  const timerRef = useRef(null)
  const holdTimeoutRef = useRef(null)

  // Fetch stories from people user follows + own stories
  useEffect(() => {
    if (!userProfile?.id) return
    const following = Array.from(new Set([...(userProfile.following || []), userProfile.id]))

    const unsubs = []
    for (let i = 0; i < following.length; i += 10) {
      const batch = following.slice(i, i + 10)
      const q = query(collection(db, 'stories'), where('userId', 'in', batch))
      const unsub = onSnapshot(q, async (snap) => {
        const allStories = []
        for (const d of snap.docs) {
          const data = { id: d.id, ...d.data() }

          // CRITICAL BUG FIX: Only delete if createdAt is defined AND older than 24h
          if (data.createdAt) {
            const created = data.createdAt.toMillis ? data.createdAt.toMillis() : (data.createdAt.seconds ? data.createdAt.seconds * 1000 : 0)
            if (created > 0 && Date.now() - created > 86400000) {
              deleteDoc(doc(db, 'stories', d.id)).catch(() => {})
              continue
            }
          }

          // Audience filtering for other users' stories
          if (data.userId !== userProfile.id) {
            if (data.audience === 'close_friends' || data.closeFriendsOnly) {
              const isCloseFriend = data.closeFriends?.includes(userProfile.id)
              if (!isCloseFriend) continue
            } else if (data.audience === 'followers') {
              const isFollower = userProfile.following?.includes(data.userId)
              if (!isFollower) continue
            }
          }

          const userDoc = await getDoc(doc(db, 'users', data.userId))
          if (userDoc.exists()) {
            data.user = { id: userDoc.id, ...userDoc.data() }
          }
          allStories.push(data)
        }

        const grouped = {}
        allStories.forEach(s => {
          if (!grouped[s.userId]) grouped[s.userId] = { user: s.user, stories: [] }
          grouped[s.userId].stories.push(s)
        })

        // Put own stories first if present
        const sortedGroups = Object.values(grouped).sort((a, b) => {
          if (a.user?.id === userProfile.id) return -1
          if (b.user?.id === userProfile.id) return 1
          return 0
        })

        setStories(sortedGroups)
      })
      unsubs.push(unsub)
    }
    return () => unsubs.forEach(u => u())
  }, [userProfile?.id, userProfile?.following])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const type = file.type.startsWith('video/') ? 'video' : 'image'
      const result = await uploadToCloudinary(file, type, 'stories')
      await addDoc(collection(db, 'stories'), {
        userId: userProfile.id,
        type,
        mediaUrl: result.secure_url,
        caption: '',
        viewers: [],
        reactions: [],
        audience,
        closeFriendsOnly: audience === 'close_friends',
        closeFriends: userProfile.closeFriends || [],
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const closeStory = useCallback(() => {
    clearTimeout(timerRef.current)
    setViewingStory(null)
    setViewIdx(0)
    setIsPaused(false)
    setShowViewersModal(false)
  }, [])

  const nextStory = useCallback(() => {
    clearTimeout(timerRef.current)
    if (viewingStory === null) return
    const group = stories[viewingStory]
    if (!group) { closeStory(); return }

    if (viewIdx < group.stories.length - 1) {
      setViewIdx(prev => prev + 1)
    } else if (viewingStory < stories.length - 1) {
      setViewingStory(prev => prev + 1)
      setViewIdx(0)
    } else {
      closeStory()
    }
  }, [viewingStory, viewIdx, stories, closeStory])

  const prevStory = useCallback(() => {
    clearTimeout(timerRef.current)
    if (viewIdx > 0) {
      setViewIdx(prev => prev - 1)
    } else if (viewingStory > 0) {
      setViewingStory(prev => prev - 1)
      setViewIdx(stories[viewingStory - 1]?.stories.length - 1 || 0)
    }
  }, [viewingStory, viewIdx, stories])

  const openStory = (groupIdx) => {
    setViewingStory(groupIdx)
    setViewIdx(0)
    setIsPaused(false)
    setShowViewersModal(false)
  }

  // Timer loop for story advancement (5s per story, paused during hold or viewers modal)
  useEffect(() => {
    if (viewingStory === null || isPaused || showViewersModal) {
      clearTimeout(timerRef.current)
      return
    }

    timerRef.current = setTimeout(() => {
      nextStory()
    }, 5000)

    return () => clearTimeout(timerRef.current)
  }, [viewingStory, viewIdx, isPaused, showViewersModal, nextStory])

  // Hold to pause interaction handlers
  const handleHoldStart = () => {
    holdTimeoutRef.current = setTimeout(() => {
      setIsPaused(true)
    }, 200)
  }

  const handleHoldEnd = () => {
    clearTimeout(holdTimeoutRef.current)
    setIsPaused(false)
  }

  // Mark story as viewed
  useEffect(() => {
    if (viewingStory === null || !userProfile?.id) return
    const story = stories[viewingStory]?.stories[viewIdx]
    if (story && !story.viewers?.includes(userProfile.id)) {
      updateDoc(doc(db, 'stories', story.id), { viewers: arrayUnion(userProfile.id) }).catch(() => {})
    }
  }, [viewingStory, viewIdx, userProfile?.id, stories])

  const reactToStory = async (emoji) => {
    const story = stories[viewingStory]?.stories[viewIdx]
    if (!story) return
    await updateDoc(doc(db, 'stories', story.id), {
      reactions: arrayUnion({ uid: userProfile.id, emoji, name: userProfile.displayName })
    }).catch(() => {})

    if (story.userId !== userProfile.id) {
      await addDoc(collection(db, 'notifications'), {
        toUserId: story.userId,
        type: 'story_reaction',
        data: { fromId: userProfile.id, fromName: userProfile.displayName, emoji, storyId: story.id },
        read: false,
        createdAt: serverTimestamp(),
      }).catch(() => {})
    }
  }

  const currentGroup = viewingStory !== null ? stories[viewingStory] : null
  const currentStory = currentGroup ? currentGroup.stories[viewIdx] : null

  // Fetch viewers profile when modal opens
  const openViewersModal = async () => {
    if (!currentStory?.viewers?.length) {
      setViewerProfiles([])
      setShowViewersModal(true)
      return
    }
    setLoadingViewers(true)
    setShowViewersModal(true)
    try {
      const profiles = []
      for (const uid of currentStory.viewers) {
        const snap = await getDoc(doc(db, 'users', uid))
        if (snap.exists()) {
          profiles.push({ id: uid, ...snap.data() })
        }
      }
      setViewerProfiles(profiles)
    } catch (err) {
      console.warn('Failed to fetch viewers:', err)
    } finally {
      setLoadingViewers(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <button onClick={() => navigate(-1)} className="page-back-btn p-1.5 rounded-xl hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface text-xl">arrow_back</span>
        </button>
        <h1 className="font-headline text-2xl font-bold text-on-surface">Stories</h1>
      </div>

      {/* Story Circles — Instagram style */}
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-3 px-2">
        {/* Add Story Button */}
        <label className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-dashed border-secondary/40 group-hover:border-secondary transition-colors">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-secondary text-2xl group-hover:scale-110 transition-transform">
                  add
                </span>
              )}
            </div>
            {userProfile?.profilePic && (
              <img
                src={userProfile.profilePic}
                alt=""
                className="absolute inset-0 w-full h-full rounded-full object-cover opacity-25 pointer-events-none"
              />
            )}
          </div>
          <span className="text-on-surface-variant text-[11px] font-medium w-16 text-center truncate">
            {uploading ? 'Posting...' : 'Add Story'}
          </span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>

        {/* Existing Story Groups */}
        {stories.map((group, i) => {
          const hasUnviewed = group.stories.some(s => !s.viewers?.includes(userProfile?.id))
          const isOwn = group.user?.id === userProfile?.id

          return (
            <button
              key={group.user?.id || i}
              onClick={() => openStory(i)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group active:scale-95 transition-transform"
            >
              <div
                className={`w-16 h-16 rounded-full p-[2px] transition-all ${
                  hasUnviewed
                    ? 'bg-gradient-to-tr from-secondary via-emerald-400 to-primary story-ring-animated'
                    : 'bg-outline-variant/30'
                }`}
              >
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  {group.user?.profilePic ? (
                    <img
                      src={group.user.profilePic}
                      alt={group.user.displayName || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-base">person</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-on-surface-variant text-[11px] font-medium w-16 text-center truncate">
                {isOwn ? 'Your Story' : group.user?.displayName || 'User'}
              </span>
            </button>
          )
        })}

        {stories.length === 0 && !uploading && (
          <div className="flex items-center text-on-surface-variant text-sm py-4 pl-2">
            <p>No active stories. Post the first one!</p>
          </div>
        )}
      </div>

      {/* Audience selector for uploading */}
      <div className="mt-4 px-2">
        <p className="text-xs text-on-surface-variant mb-2 font-medium">Post audience:</p>
        <div className="inline-flex rounded-xl bg-surface-container-high p-1 border border-outline-variant/20">
          {[
            { id: 'everyone', label: 'Everyone', icon: 'public' },
            { id: 'followers', label: 'Followers', icon: 'group' },
            { id: 'close_friends', label: '★ Close Friends', icon: 'star' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setAudience(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                audience === opt.id
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Story Viewer Modal */}
      {viewingStory !== null && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none">
          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
            {currentGroup?.stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div
                  className={`h-full bg-white rounded-full transition-all ${
                    i < viewIdx ? 'w-full' : i === viewIdx ? (isPaused ? 'w-1/2' : 'animate-story-progress') : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Top Info Bar */}
          <div className="absolute top-8 left-4 right-4 flex items-center gap-3 z-20">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/20">
              {currentGroup?.user?.profilePic ? (
                <img src={currentGroup.user.profilePic} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">person</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-white text-sm font-medium block truncate">
                {currentGroup?.user?.displayName || 'User'}
              </span>
              <span className="text-white/60 text-[10px]">
                {currentStory.createdAt?.toDate
                  ? new Date(currentStory.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now'}
              </span>
            </div>

            {(currentStory.audience === 'close_friends' || currentStory.closeFriendsOnly) && (
              <span className="text-[10px] bg-secondary/30 text-secondary border border-secondary/40 px-2 py-0.5 rounded-full font-bold">
                ★ Close Friends
              </span>
            )}

            <button
              onClick={closeStory}
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Media Content */}
          <div
            className="w-full h-full flex items-center justify-center relative cursor-pointer"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
          >
            {currentStory.type === 'video' ? (
              <video
                src={currentStory.mediaUrl}
                className="max-w-full max-h-full object-contain"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Left and Right Tap Zones */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevStory() }}
              className="absolute left-0 top-16 bottom-24 w-1/3 z-10 opacity-0 cursor-default"
              aria-label="Previous story"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextStory() }}
              className="absolute right-0 top-16 bottom-24 w-1/3 z-10 opacity-0 cursor-default"
              aria-label="Next story"
            />
          </div>

          {/* Quick Reaction Buttons */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {['❤️', '🔥', '😂', '😮', '😢', '👏'].map(em => (
              <button
                key={em}
                onClick={() => reactToStory(em)}
                className="text-2xl hover:scale-125 active:scale-95 transition-transform drop-shadow-md p-1"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Viewers Trigger Button (Own Stories only) */}
          {currentStory.userId === userProfile?.id && (
            <div className="absolute bottom-18 left-4 z-20">
              <button
                type="button"
                onClick={openViewersModal}
                className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-xs hover:bg-black/80 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                <span>{currentStory.viewers?.length || 0} viewers</span>
              </button>
            </div>
          )}

          {/* Viewers Modal Bottom Sheet */}
          {showViewersModal && (
            <div
              className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-end justify-center"
              onClick={() => setShowViewersModal(false)}
            >
              <div
                className="w-full max-w-md bg-surface-container-low border-t border-outline-variant/30 rounded-t-3xl p-5 shadow-2xl max-h-[60vh] flex flex-col animate-bottom-sheet"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline font-bold text-sm text-on-surface">
                    Viewers ({currentStory.viewers?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowViewersModal(false)}
                    className="p-1 rounded-full text-on-surface-variant hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {loadingViewers ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : viewerProfiles.length === 0 ? (
                    <p className="text-on-surface-variant text-xs text-center py-6">
                      No one has viewed this story yet.
                    </p>
                  ) : (
                    viewerProfiles.map(u => (
                      <div key={u.id} className="flex items-center gap-3 py-2 px-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-highest flex-shrink-0">
                          {u.profilePic ? (
                            <img src={u.profilePic} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-outline">person</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{u.displayName}</p>
                          <p className="text-xs text-on-surface-variant truncate">@{u.username}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
