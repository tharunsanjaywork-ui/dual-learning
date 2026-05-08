import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../lib/firebase'
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { isUserOnline } from '../../utils/storage'

const FILTERS = ['All Residents', 'Deep Thinkers', 'Designers', 'Night Owls', 'Early Birds']

export default function SearchPage() {
  const navigate = useNavigate()
  const { userProfile, setUserProfile } = useAuth()
  const { getOrCreateChat } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All Residents')

  // Load all users on mount for suggested section
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(collection(db, 'users'))
        const users = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.id !== userProfile?.id)
        setAllUsers(users)
      } catch (err) {
        console.error('Fetch users failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [userProfile?.id])

  // Live search as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }
    const q = searchQuery.toLowerCase()
    const filtered = allUsers.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.displayName?.toLowerCase().includes(q)
    )
    setResults(filtered)
  }, [searchQuery, allUsers])

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
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, followers: u.followers?.filter(id => id !== userProfile.id) || [] } : u))
    } else {
      await updateDoc(userRef, { following: arrayUnion(userId) })
      await updateDoc(targetRef, { followers: arrayUnion(userProfile.id) })
      setUserProfile(prev => ({ ...prev, following: [...(prev.following || []), userId] }))
      setResults(prev => prev.map(u => u.id === userId ? { ...u, followers: [...(u.followers || []), userProfile.id] } : u))
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, followers: [...(u.followers || []), userProfile.id] } : u))

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

  // Users to display (search results or suggested)
  const displayUsers = searchQuery.trim() ? results : allUsers.slice(0, 10)

  const renderUserCard = (user) => {
    const isFollowing = userProfile?.following?.includes(user.id)
    const online = isUserOnline(user)
    return (
      <div key={user.id} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-4 hover:border-secondary/30 transition-all group">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-transparent group-hover:border-secondary/40 transition-colors">
              {user.profilePic ? (
                <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-2xl">person</span>
                </div>
              )}
            </div>
            {online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-surface-container online-dot-animated" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-on-surface font-bold text-sm truncate">{user.displayName}</h3>
              {user.followers?.length > 2 && <span className="material-symbols-outlined filled text-secondary text-xs">verified</span>}
            </div>
            <p className="text-on-surface-variant text-xs mb-1">@{user.username}</p>
            {user.bio && <p className="text-on-surface-variant text-xs mb-2 line-clamp-1">{user.bio}</p>}
            <div className="flex items-center gap-3 text-[10px] text-on-surface-variant mb-2.5">
              <span className="font-medium">{user.followers?.length || 0} followers</span>
              <span>•</span>
              <span>{user.following?.length || 0} following</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleFollow(user.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isFollowing
                    ? 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                    : 'bg-secondary text-on-secondary hover:scale-105 active:scale-95'
                }`}
              >
                {isFollowing ? 'Following ✓' : 'Follow'}
              </button>
              <button onClick={() => handleMessage(user.id)}
                className="px-4 py-1.5 rounded-full text-xs font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high transition-colors">
                Message
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter">
      {/* Back + Search Bar */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="page-back-btn flex-shrink-0">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or username..."
            autoFocus
            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-full pl-12 pr-4 py-3 text-on-surface text-sm focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="material-symbols-outlined text-outline text-lg">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === f ? 'bg-secondary text-on-secondary shadow-md shadow-secondary/20' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Section Title */}
      {!searchQuery.trim() && !loading && allUsers.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-secondary text-lg">group</span>
          <h2 className="text-on-surface font-headline font-bold text-base">Suggested People</h2>
          <div className="flex-1 h-px bg-outline-variant/20" />
          <span className="text-on-surface-variant text-xs">{allUsers.length} people</span>
        </div>
      )}

      {/* Results / Suggestions */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface-container rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-surface-container-high" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-surface-container-high rounded w-1/3" />
                  <div className="h-3 bg-surface-container-high rounded w-1/4" />
                  <div className="h-3 bg-surface-container-high rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayUsers.length > 0 ? (
        <div className="space-y-3">
          {displayUsers.map(renderUserCard)}
        </div>
      ) : searchQuery ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl opacity-40">person_search</span>
          </div>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-2">No one found</h3>
          <p className="text-on-surface-variant text-sm text-center max-w-xs">Try a different name or username</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mb-4 animate-float">
            <span className="material-symbols-outlined text-secondary text-4xl">explore</span>
          </div>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-2">Discover People</h3>
          <p className="text-on-surface-variant text-sm text-center max-w-xs">Search by username or name to find people to connect with</p>
        </div>
      )}
    </div>
  )
}
