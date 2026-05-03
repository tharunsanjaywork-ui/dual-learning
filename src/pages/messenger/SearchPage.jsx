import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../lib/firebase'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'

const FILTERS = ['All Residents', 'Deep Thinkers', 'Designers', 'Night Owls', 'Early Birds']

export default function SearchPage() {
  const navigate = useNavigate()
  const { userProfile, setUserProfile } = useAuth()
  const { getOrCreateChat } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All Residents')

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const users = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== userProfile?.id && u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
      setResults(users)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId) => {
    if (!userProfile?.id) return
    const isFollowing = userProfile.following?.includes(userId)
    const userRef = doc(db, 'users', userProfile.id)
    const targetRef = doc(db, 'users', userId)

    if (isFollowing) {
      await updateDoc(userRef, { following: arrayRemove(userId) })
      await updateDoc(targetRef, { followers: arrayRemove(userProfile.id) })
      setUserProfile(prev => ({ ...prev, following: prev.following.filter(id => id !== userId) }))
      setResults(prev => prev.map(u => u.id === userId ? { ...u, followers: u.followers?.filter(id => id !== userProfile.id) || [] } : u))
    } else {
      await updateDoc(userRef, { following: arrayUnion(userId) })
      await updateDoc(targetRef, { followers: arrayUnion(userProfile.id) })
      setUserProfile(prev => ({ ...prev, following: [...(prev.following || []), userId] }))
      setResults(prev => prev.map(u => u.id === userId ? { ...u, followers: [...(u.followers || []), userProfile.id] } : u))

      // Send notification
      await addDoc(collection(db, 'notifications'), {
        toUserId: userId,
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

  const handleMessage = async (userId) => {
    const chatId = await getOrCreateChat(userId)
    if (chatId) navigate(`/messenger/chat/${chatId}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      {/* Back + Search Bar */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="page-back-btn flex-shrink-0">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Discover new perspectives..."
            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-full pl-12 pr-4 py-3.5 text-on-surface text-sm focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 transition-all"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === f ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface-container rounded-2xl p-5 animate-shimmer shimmer-bg">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-surface-container-high" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-container-high rounded w-1/3" />
                  <div className="h-3 bg-surface-container-high rounded w-1/2" />
                  <div className="h-3 bg-surface-container-high rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map(user => {
            const isFollowing = userProfile?.following?.includes(user.id)
            return (
              <div key={user.id} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 hover:border-secondary/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent hover:border-secondary transition-colors">
                      {user.profilePic ? (
                        <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                          <span className="material-symbols-outlined text-outline text-3xl">person</span>
                        </div>
                      )}
                    </div>
                    {user.isOnline && <div className="absolute bottom-1 right-1 w-4 h-4 bg-secondary rounded-full border-2 border-surface-container" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-on-surface font-bold text-base truncate">{user.displayName}</h3>
                      <span className="material-symbols-outlined filled text-secondary text-base">verified</span>
                    </div>
                    <p className="text-on-surface-variant text-sm mb-1">@{user.username}</p>
                    {user.bio && <p className="text-on-surface-variant text-sm mb-2 line-clamp-2">{user.bio}</p>}
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                      <span>{user.followers?.length || 0} followers</span>
                      <span>•</span>
                      <span>0 mutuals</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleFollow(user.id)}
                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                          isFollowing
                            ? 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                            : 'bg-secondary text-on-secondary hover:scale-105'
                        }`}
                      >
                        {isFollowing ? 'Following ✓' : 'Follow'}
                      </button>
                      <button onClick={() => handleMessage(user.id)}
                        className="px-5 py-2 rounded-full text-sm font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high transition-colors">
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : searchQuery ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 opacity-20">person_search</span>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-2">No travelers found</h3>
          <p className="text-on-surface-variant text-sm text-center">Try a different search term or explore the filters</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 opacity-20">explore</span>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-2">Discover People</h3>
          <p className="text-on-surface-variant text-sm text-center">Search by username to find people to connect with</p>
        </div>
      )}
    </div>
  )
}
