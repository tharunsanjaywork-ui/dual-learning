import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { isUserOnline } from '../../utils/storage'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { doc, getDoc, getDocs, updateDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore'
import DateSeparator from '../../components/chat/DateSeparator'
import ScrollToBottomButton from '../../components/chat/ScrollToBottomButton'
import MessageBubble from '../../components/chat/MessageBubble'
import MediaViewerModal from '../../components/chat/MediaViewerModal'

export default function GroupChatPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { sendMessage } = useChat()
  const [showInfo, setShowInfo] = useState(false)
  const [text, setText] = useState('')
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [addMemberInput, setAddMemberInput] = useState('')
  const [activeMedia, setActiveMedia] = useState(null)

  const listRef = useRef(null)
  const inputRef = useRef(null)
  const isNearBottomRef = useRef(true)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [unreadCountBelow, setUnreadCountBelow] = useState(0)

  const handleScroll = () => {
    if (!listRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    const distance = scrollHeight - scrollTop - clientHeight
    const near = distance < 120
    isNearBottomRef.current = near
    setShowScrollBottom(!near)
    if (near) setUnreadCountBelow(0)
  }

  const scrollToBottom = useCallback((smooth = true) => {
    if (!listRef.current) return
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    })
    setUnreadCountBelow(0)
    setShowScrollBottom(false)
    isNearBottomRef.current = true
  }, [])

  // Fetch group data
  useEffect(() => {
    if (!groupId) return
    const unsub = onSnapshot(doc(db, 'groups', groupId), async (snap) => {
      if (!snap.exists()) { setLoading(false); return }
      const data = { id: snap.id, ...snap.data() }
      setGroup(data)

      // Fetch member profiles
      const memberProfiles = []
      for (const uid of (data.members || [])) {
        const userDoc = await getDoc(doc(db, 'users', uid))
        if (userDoc.exists()) {
          memberProfiles.push({ id: uid, ...userDoc.data(), role: data.admins?.includes(uid) ? 'Admin' : 'Member' })
        }
      }
      setMembers(memberProfiles)
      setLoading(false)
    })
    return unsub
  }, [groupId])

  // Listen to group messages
  useEffect(() => {
    if (!groupId) return
    const q = query(collection(db, 'messages', groupId, 'msgs'), orderBy('createdAt', 'asc'), limit(100))
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [groupId])

  // Auto-scroll on new messages only if already near bottom
  useEffect(() => {
    if (messages.length === 0) return
    if (isNearBottomRef.current) {
      scrollToBottom(true)
    } else {
      setUnreadCountBelow(c => c + 1)
    }
  }, [messages, scrollToBottom])

  // Scroll to bottom on initial load / group change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 50)
    }
  }, [groupId, scrollToBottom])

  // Auto-resize textarea up to 5 lines (~128px)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`
    }
  }, [text])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || !groupId) return
    await addDoc(collection(db, 'messages', groupId, 'msgs'), {
      senderId: userProfile?.id, type: 'text', content: trimmed,
      reactions: [], seen: [userProfile?.id], isDeleted: false, createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'groups', groupId), { lastMessage: trimmed, lastMessageAt: serverTimestamp() }).catch(() => {})
    setText('')
    inputRef.current?.focus()
  }

  const handleRemoveMember = async (uid) => {
    if (!group || !userProfile?.id) return
    if (!group.admins?.includes(userProfile.id)) { alert('Only admins can remove members'); return }
    await updateDoc(doc(db, 'groups', groupId), { members: arrayRemove(uid), admins: arrayRemove(uid) })
  }

  const handleAddMember = async (usernameOverride) => {
    const username = (usernameOverride || addMemberInput).trim()
    if (!username || !group) return
    const { docs } = await getDocs(query(collection(db, 'users'), where('username', '==', username)))
    if (docs.length === 0) { alert('User not found'); return }
    const userId = docs[0].id
    if (group.members?.includes(userId)) { alert('Already a member'); return }
    await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(userId) })
    setAddMemberInput('')
  }

  const generateInviteLink = () => {
    const link = `${window.location.origin}/messenger/group/${groupId}`
    navigator.clipboard.writeText(link).then(() => alert('Invite link copied!')).catch(() => {})
  }

  const handleLeave = async () => {
    if (!userProfile?.id || !groupId) return
    if (confirm('Leave this group?')) {
      await updateDoc(doc(db, 'groups', groupId), { members: arrayRemove(userProfile.id), admins: arrayRemove(userProfile.id) })
      navigate('/messenger/chats')
    }
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>
  if (!group) return <div className="flex flex-col items-center justify-center h-full"><p className="text-on-surface-variant">Group not found</p></div>

  const isAdmin = group.admins?.includes(userProfile?.id)

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative animate-page-enter">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
        {/* Top Bar — shrink-0 and always visible */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-surface-container-low/90 backdrop-blur-xl border-b border-outline-variant/20 flex-shrink-0 z-20">
          <button
            onClick={() => navigate('/messenger/chats')}
            className="p-1.5 -ml-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            aria-label="Back to chats"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full gradient-secondary flex items-center justify-center text-lg flex-shrink-0">
            {group.icon || '📚'}
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={() => setShowInfo(!showInfo)} className="text-left w-full">
              <h3 className="text-on-surface font-medium text-sm truncate leading-tight">{group.name || 'Group'}</h3>
              <p className="text-secondary text-xs truncate leading-tight mt-0.5">{members.length} members</p>
            </button>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0"
            aria-label="Group info"
          >
            <span className="material-symbols-outlined text-xl">info</span>
          </button>
        </div>

        {/* Messages Scroll Area — ONLY scrollable area */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 space-y-2 overscroll-contain relative"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full gradient-secondary flex items-center justify-center text-2xl mb-4">
                {group.icon || '📚'}
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-1">{group.name}</h3>
              <p className="text-on-surface-variant text-sm mb-2">{group.description || ''}</p>
              <p className="text-outline text-xs">{members.length} members</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.senderId === userProfile?.id
              const sender = members.find(m => m.id === msg.senderId)
              const prevMsg = idx > 0 ? messages[idx - 1] : null
              const isNewDay = !prevMsg || (() => {
                const d1 = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt || Date.now())
                const d2 = prevMsg.createdAt?.toDate ? prevMsg.createdAt.toDate() : new Date(prevMsg.createdAt || Date.now())
                return d1.toDateString() !== d2.toDateString()
              })()

              return (
                <Fragment key={msg.id}>
                  {isNewDay && <DateSeparator date={msg.createdAt} />}
                  <MessageBubble
                    msg={msg}
                    isMine={isMine}
                    senderName={sender?.displayName}
                    onOpenMedia={setActiveMedia}
                  />
                </Fragment>
              )
            })
          )}
        </div>

        {/* Scroll to bottom button */}
        <ScrollToBottomButton
          show={showScrollBottom}
          unreadCount={unreadCountBelow}
          onClick={() => scrollToBottom(true)}
        />

        {/* Input Bar — ONE row like WhatsApp with bottom safe-area */}
        <div
          className="bg-surface-container-low border-t border-outline-variant/20 flex-shrink-0 relative z-20"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-end gap-1.5 px-2.5 py-2">
            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Message"
                rows={1}
                className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-3.5 py-2 text-sm text-on-surface resize-none focus:border-secondary/50 focus:outline-none transition-all break-anywhere leading-5"
                style={{ minHeight: '38px', maxHeight: '128px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="p-2.5 rounded-xl bg-secondary text-on-secondary shadow-lg shadow-secondary/30 disabled:opacity-30 flex-shrink-0 transition-transform active:scale-95"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Group Info Panel — slide-in drawer on mobile */}
      {showInfo && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setShowInfo(false)} />
          <div className="fixed inset-y-0 right-0 w-80 z-40 md:relative md:inset-auto md:z-auto border-l border-outline-variant/20 bg-surface-container-low overflow-y-auto transition-transform duration-300 animate-fade-up">
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full gradient-secondary flex items-center justify-center text-3xl mb-3">
                  {group.icon || '📚'}
                </div>
                <h3 className="font-headline text-lg font-bold text-on-surface">{group.name}</h3>
                <p className="text-on-surface-variant text-sm text-center mt-1">{group.description || ''}</p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {isAdmin && (
                  <button
                    onClick={() => { const name = prompt('Add member username:'); if (name) handleAddMember(name) }}
                    className="bg-surface-container rounded-xl p-3 text-center hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-secondary text-xl block mb-1">person_add</span>
                    <span className="text-on-surface-variant text-xs">Add Member</span>
                  </button>
                )}
                <button
                  onClick={generateInviteLink}
                  className="bg-surface-container rounded-xl p-3 text-center hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-secondary text-xl block mb-1">link</span>
                  <span className="text-on-surface-variant text-xs">Invite Link</span>
                </button>
              </div>

              {/* Members */}
              <h4 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3">
                Members ({members.length})
              </h4>
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container transition-colors">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center">
                        {member.profilePic ? (
                          <img src={member.profilePic} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-outline text-base">person</span>
                        )}
                      </div>
                      {isUserOnline(member) && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface-container-low" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface text-sm font-medium truncate">{member.displayName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      member.role === 'Admin'
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      {member.role}
                    </span>
                    {isAdmin && member.id !== userProfile?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 rounded-lg hover:bg-error/10 text-outline hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleLeave}
                className="w-full mt-8 flex items-center justify-center gap-2 bg-error/10 text-error rounded-xl py-3 font-medium text-sm hover:bg-error/20 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>Leave Group
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Media Viewer Modal */}
      <MediaViewerModal
        isOpen={!!activeMedia}
        media={activeMedia}
        onClose={() => setActiveMedia(null)}
      />
    </div>
  )
}
