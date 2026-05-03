import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'

export default function ChatListPage() {
  const { chats, setActiveChat, onlineUsers, togglePinChat, toggleMuteChat, toggleArchiveChat } = useChat()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState(null)

  const filters = ['All', 'Unread', 'Groups', 'Archived']

  const filteredChats = chats.filter(chat => {
    if (filter === 'Archived') return chat.archivedBy?.includes(userProfile?.id)
    if (filter === 'Groups') return chat.participants?.length > 2
    if (filter === 'Unread') return true
    return !chat.archivedBy?.includes(userProfile?.id)
  }).filter(chat => {
    if (!searchQuery) return true
    const name = chat.otherUser?.displayName || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  }).sort((a, b) => {
    // Pinned chats first
    const aPinned = a.pinnedBy?.includes(userProfile?.id) ? 1 : 0
    const bPinned = b.pinnedBy?.includes(userProfile?.id) ? 1 : 0
    return bPinned - aPinned
  })

  const openChat = (chat) => {
    setActiveChat(chat.id)
    navigate(`/messenger/chat/${chat.id}`)
  }

  const handleContextMenu = (e, chat) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ chat, x: e.clientX || e.currentTarget.getBoundingClientRect().left, y: e.clientY || e.currentTarget.getBoundingClientRect().top })
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
    <div className="max-w-3xl mx-auto animate-page-enter" onClick={() => setContextMenu(null)}>
      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search chats or people..."
            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:border-secondary/50 transition-all" />
        </div>
        <div className="flex gap-2 mb-2">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'}`}>
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
            <button key={chat.id} onClick={() => openChat(chat)} onContextMenu={(e) => handleContextMenu(e, chat)}
              className="w-full flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-surface-container-high/50 active:scale-[0.99] transition-all text-left">
              <div className="relative flex-shrink-0">
                <div className={`w-14 h-14 rounded-full overflow-hidden ${isMuted ? 'opacity-60 grayscale' : ''}`}>
                  {other?.profilePic ? <img src={other.profilePic} alt="" className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-xl">person</span>
                    </div>
                  )}
                </div>
                {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-background" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-on-surface font-medium text-sm truncate">{other?.displayName || 'Unknown User'}</span>
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
            <h3 className="font-headline text-lg sm:text-xl font-bold text-on-surface mb-2">No conversations yet</h3>
            <p className="text-on-surface-variant text-sm sm:text-base text-center mb-6">Click the + button to find people and start messaging</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}>
          <div className="glass-strong rounded-2xl p-1.5 w-52 shadow-2xl border border-outline-variant/20 animate-scale-in"
            style={{ position: 'fixed', left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 250) }}
            onClick={e => e.stopPropagation()}>
            {[
              { icon: contextMenu.chat.pinnedBy?.includes(userProfile?.id) ? 'keep_off' : 'keep', label: contextMenu.chat.pinnedBy?.includes(userProfile?.id) ? 'Unpin' : 'Pin to top', fn: () => { togglePinChat(contextMenu.chat.id, contextMenu.chat.pinnedBy?.includes(userProfile?.id)); setContextMenu(null) } },
              { icon: contextMenu.chat.mutedBy?.includes(userProfile?.id) ? 'notifications' : 'notifications_off', label: contextMenu.chat.mutedBy?.includes(userProfile?.id) ? 'Unmute' : 'Mute', fn: () => { toggleMuteChat(contextMenu.chat.id, contextMenu.chat.mutedBy?.includes(userProfile?.id)); setContextMenu(null) } },
              { icon: contextMenu.chat.archivedBy?.includes(userProfile?.id) ? 'unarchive' : 'archive', label: contextMenu.chat.archivedBy?.includes(userProfile?.id) ? 'Unarchive' : 'Archive', fn: () => { toggleArchiveChat(contextMenu.chat.id, contextMenu.chat.archivedBy?.includes(userProfile?.id)); setContextMenu(null) } },
            ].map(item => (
              <button key={item.label} onClick={item.fn} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-lg">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => navigate('/messenger/search')}
        className="fixed bottom-24 md:bottom-10 right-5 md:right-10 w-14 h-14 rounded-full bg-secondary flex items-center justify-center shadow-[0_10px_30px_rgba(0,228,117,0.4)] hover:scale-110 transition-transform z-40" title="Add People">
        <span className="material-symbols-outlined text-white text-3xl">add</span>
      </button>
    </div>
  )
}
