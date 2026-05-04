import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

export default function NotificationsPage() {
  const { userProfile, setUserProfile } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [followedBack, setFollowedBack] = useState({})

  useEffect(() => {
    if (!userProfile?.id) return
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userProfile.id)
    )
    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      // Sort locally to avoid composite index requirement
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return timeB - timeA
      })
      setNotifications(notifs)
    })
    return unsub
  }, [userProfile?.id])

  // Initialize followedBack state from current following list
  useEffect(() => {
    if (!userProfile?.following) return
    const state = {}
    userProfile.following.forEach(id => { state[id] = true })
    setFollowedBack(state)
  }, [userProfile?.following])

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read)
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true })
    }
  }

  const handleFollowBack = async (userId, fromName) => {
    if (!userProfile?.id || !userId) return
    const isCurrentlyFollowing = followedBack[userId]
    const myRef = doc(db, 'users', userProfile.id)
    const theirRef = doc(db, 'users', userId)

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        await updateDoc(myRef, { following: arrayRemove(userId) })
        await updateDoc(theirRef, { followers: arrayRemove(userProfile.id) })
        setFollowedBack(prev => ({ ...prev, [userId]: false }))
        setUserProfile(prev => ({ ...prev, following: (prev.following || []).filter(id => id !== userId) }))
      } else {
        // Follow back
        await updateDoc(myRef, { following: arrayUnion(userId) })
        await updateDoc(theirRef, { followers: arrayUnion(userProfile.id) })
        setFollowedBack(prev => ({ ...prev, [userId]: true }))
        setUserProfile(prev => ({ ...prev, following: [...(prev.following || []), userId] }))
      }
    } catch (err) {
      console.error('Follow action failed:', err)
    }
  }

  const followRequests = notifications.filter(n => n.type === 'follow_request')
  const groupInvites = notifications.filter(n => n.type === 'group_invite')
  const storyReactions = notifications.filter(n => n.type === 'story_reaction')
  const newFollowers = notifications.filter(n => n.type === 'follow')
  const otherNotifs = notifications.filter(n => !['follow_request', 'group_invite', 'story_reaction', 'follow'].includes(n.type))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/messenger/chats')} className="page-back-btn">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="font-headline text-2xl md:text-5xl font-bold text-on-surface" style={{ fontStyle: 'italic' }}>Notifications</h1>
        </div>
        <button onClick={markAllRead} className="text-secondary text-sm font-medium hover:underline flex-shrink-0">Mark all as read</button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 opacity-20">notifications</span>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-2">All caught up!</h3>
          <p className="text-on-surface-variant text-sm">No new notifications at the moment</p>
        </div>
      ) : (
        <div className="space-y-8 stagger-children">
          {/* Follow Requests */}
          {followRequests.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">person_add</span>Follow Requests
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {followRequests.map(n => (
                  <div key={n.id} className={`bg-surface-container border rounded-xl p-4 flex items-center gap-3 ${!n.read ? 'border-l-2 border-l-secondary border-outline-variant/20' : 'border-outline-variant/20'}`}>
                    <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-outline">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface text-sm font-medium truncate">{n.data?.fromName || 'Someone'}</p>
                      <p className="text-on-surface-variant text-xs">wants to follow you</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-base">check</span>
                      </button>
                      <button className="w-9 h-9 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors">
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Group Invites */}
          {groupInvites.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">group</span>Group Invites
              </h3>
              {groupInvites.map(n => (
                <div key={n.id} className="bg-gradient-to-r from-secondary-container to-surface-container border border-outline-variant/20 rounded-2xl p-5 mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl gradient-secondary flex items-center justify-center text-xl">📚</div>
                    <div className="flex-1">
                      <h4 className="text-on-surface font-bold text-sm">{n.data?.groupName || 'Study Group'}</h4>
                      <p className="text-on-surface-variant text-xs">{n.data?.groupDesc || 'Join this study group'}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="flex-1 bg-secondary text-on-secondary py-2.5 rounded-full font-bold text-sm hover:scale-[1.02] transition-transform">Accept</button>
                    <button className="flex-1 bg-surface-container-highest text-on-surface-variant py-2.5 rounded-full font-bold text-sm hover:bg-surface-bright transition-colors">Decline</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Story Reactions */}
          {storyReactions.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">auto_stories</span>Story Reactions
              </h3>
              <div className="space-y-2">
                {storyReactions.map(n => (
                  <div key={n.id} className="flex items-center gap-3 px-4 py-3 bg-surface-container rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-outline text-base">person</span>
                    </div>
                    <p className="text-on-surface text-sm flex-1">
                      <span className="font-medium">{n.data?.fromName}</span>
                      <span className="text-on-surface-variant"> reacted {n.data?.emoji || '🔥'} to your story</span>
                    </p>
                    <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex-shrink-0" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* New Followers */}
          {newFollowers.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">group_add</span>New Followers
              </h3>
              <div className="bg-surface-container border border-outline-variant/20 rounded-2xl divide-y divide-outline-variant/10">
                {newFollowers.map(n => {
                  const fromId = n.data?.fromId
                  const isFollowing = followedBack[fromId]
                  return (
                    <div key={n.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => fromId && navigate(`/messenger/profile/${fromId}`)}
                        className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-outline text-base">person</span>
                      </button>
                      <p className="text-on-surface text-sm flex-1">
                        <span className="font-medium">{n.data?.fromName || 'Someone'}</span>
                        <span className="text-on-surface-variant"> started following you</span>
                      </p>
                      <button
                        onClick={() => handleFollowBack(fromId, n.data?.fromName)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isFollowing
                            ? 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                            : 'bg-secondary text-on-secondary hover:scale-105'
                        }`}
                      >
                        {isFollowing ? 'Following ✓' : 'Follow Back'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
