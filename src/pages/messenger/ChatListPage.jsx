import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'

export default function ChatListPage() {
  const { chats, setActiveChat, onlineUsers } = useChat()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filters = ['All', 'Unread', 'Groups', 'Archived']

  const filteredChats = chats.filter(chat => {
    if (filter === 'Archived') return chat.archivedBy?.includes(userProfile?.id)
    if (filter === 'Groups') return chat.participants?.length > 2
    if (filter === 'Unread') return true // simplified
    return !chat.archivedBy?.includes(userProfile?.id)
  }).filter(chat => {
    if (!searchQuery) return true
    const name = chat.otherUser?.displayName || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const openChat = (chat) => {
    setActiveChat(chat.id)
    navigate(`/messenger/chat/${chat.id}`)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Stories Bar */}
      <div className="px-4 py-4 border-b border-outline-variant/20">
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
          {/* Your Story */}
          <button onClick={() => navigate('/messenger/stories')} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative w-14 h-14 rounded-full border-2 border-dashed border-secondary/50 flex items-center justify-center">
              {userProfile?.profilePic ? (
                <img src={userProfile.profilePic} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline">person</span>
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-secondary rounded-full flex items-center justify-center border-2 border-background">
                <span className="material-symbols-outlined text-white text-xs">add</span>
              </div>
            </div>
            <span className="text-on-surface-variant text-[10px]">Your Story</span>
          </button>

          {/* Other stories (placeholder) */}
          {[1, 2, 3, 4].map(i => (
            <button key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-secondary p-0.5">
                <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-lg">person</span>
                </div>
              </div>
              <span className="text-on-surface-variant text-[10px]">User {i}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats or people..."
            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:border-secondary/50 transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="divide-y divide-outline-variant/10">
        {filteredChats.length > 0 ? filteredChats.map(chat => {
          const other = chat.otherUser
          const isOnline = other ? onlineUsers[other.id] : false
          const isPinned = chat.pinnedBy?.includes(userProfile?.id)
          const isMuted = chat.mutedBy?.includes(userProfile?.id)

          return (
            <button
              key={chat.id}
              onClick={() => openChat(chat)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container-high/50 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-14 h-14 rounded-full overflow-hidden ${isMuted ? 'opacity-60 grayscale' : ''}`}>
                  {other?.profilePic ? (
                    <img src={other.profilePic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-xl">person</span>
                    </div>
                  )}
                </div>
                {isOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-background" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-on-surface font-medium text-sm truncate">
                    {other?.displayName || 'Unknown User'}
                  </span>
                  <span className="text-on-surface-variant text-xs flex-shrink-0 ml-2">{formatTime(chat.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-on-surface-variant text-sm truncate flex-1">{chat.lastMessage || 'No messages yet'}</p>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {isPinned && <span className="material-symbols-outlined text-secondary text-sm">keep</span>}
                    {isMuted && <span className="material-symbols-outlined text-outline text-sm">notifications_off</span>}
                  </div>
                </div>
              </div>
            </button>
          )
        }) : (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4 opacity-20">chat</span>
            <h3 className="font-headline text-lg font-bold text-on-surface mb-2">No conversations yet</h3>
            <p className="text-on-surface-variant text-sm text-center mb-6">Find people to connect with and start messaging</p>
            <button
              onClick={() => navigate('/messenger/search')}
              className="gradient-secondary text-on-secondary px-6 py-2.5 rounded-full font-medium text-sm hover:scale-105 transition-transform"
            >
              Discover People
            </button>
          </div>
        )}
      </div>

      {/* FAB (mobile) */}
      <button
        onClick={() => navigate('/messenger/search')}
        className="md:hidden fixed bottom-24 right-5 w-14 h-14 rounded-full bg-secondary flex items-center justify-center shadow-[0_10px_30px_rgba(0,228,117,0.4)] hover:scale-110 transition-transform z-40"
      >
        <span className="material-symbols-outlined text-white text-xl">edit</span>
      </button>
    </div>
  )
}
