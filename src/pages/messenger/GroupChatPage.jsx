import { useState, useEffect, useRef } from 'react'
import { isUserOnline } from '../../utils/storage'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { doc, getDoc, getDocs, updateDoc, onSnapshot, collection, query, where, orderBy, limit, addDoc, serverTimestamp, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore'
import { uploadToCloudinary, getFileType } from '../../lib/cloudinary'

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
  const messagesEndRef = useRef(null)

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || !groupId) return
    await addDoc(collection(db, 'messages', groupId, 'msgs'), {
      senderId: userProfile?.id, type: 'text', content: trimmed,
      reactions: [], seen: [userProfile?.id], isDeleted: false, createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'groups', groupId), { lastMessage: trimmed, lastMessageAt: serverTimestamp() }).catch(() => {})
    setText('')
  }

  const handleRemoveMember = async (uid) => {
    if (!group || !userProfile?.id) return
    if (!group.admins?.includes(userProfile.id)) { alert('Only admins can remove members'); return }
    await updateDoc(doc(db, 'groups', groupId), { members: arrayRemove(uid), admins: arrayRemove(uid) })
  }

  const handleAddMember = async () => {
    if (!addMemberInput.trim() || !group) return
    const { docs } = await getDocs(query(collection(db, 'users'), where('username', '==', addMemberInput.trim())))
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
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] animate-page-enter">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 flex-shrink-0">
          <button onClick={() => navigate('/messenger/chats')} className="p-1.5 -ml-1">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </button>
          <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center text-lg">{group.icon || '📚'}</div>
          <div className="flex-1 min-w-0">
            <button onClick={() => setShowInfo(!showInfo)} className="text-left">
              <h3 className="text-on-surface font-medium text-sm truncate max-w-[120px] md:max-w-none">{group.name || 'Group'}</h3>
              <p className="text-secondary text-xs">{members.length} members</p>
            </button>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-xl">info</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full gradient-secondary flex items-center justify-center text-2xl mb-4">{group.icon || '📚'}</div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-1">{group.name}</h3>
              <p className="text-on-surface-variant text-sm mb-2">{group.description || ''}</p>
              <p className="text-outline text-xs">{members.length} members</p>
            </div>
          ) : messages.map(msg => {
            const isMine = msg.senderId === userProfile?.id
            const sender = members.find(m => m.id === msg.senderId)
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] md:max-w-[60%]`}>
                  {!isMine && <p className="text-xs text-secondary font-medium mb-0.5 ml-1">{sender?.displayName || 'Unknown'}</p>}
                  <div className={`rounded-2xl px-4 py-2.5 ${isMine ? 'bg-secondary-container/30 border border-secondary/10 rounded-br-md' : 'bg-surface-container-high rounded-bl-md'}`}>
                    {msg.isDeleted ? <p className="text-on-surface-variant text-sm italic">Deleted</p> : <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
                    <span className="text-[10px] text-on-surface-variant/60 block mt-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/20 flex items-end gap-2 flex-shrink-0">
          <div className="flex-1">
            <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} placeholder="Type a message..." rows={1}
              className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-4 py-2.5 text-sm text-on-surface resize-none focus:border-secondary/50 transition-all" style={{ minHeight: '40px' }} />
          </div>
          <button onClick={handleSend} disabled={!text.trim()} className="p-2.5 rounded-xl bg-secondary text-on-secondary shadow-lg shadow-secondary/30 disabled:opacity-30">
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </div>
      </div>

      {/* Group Info Panel — slide-in drawer on mobile */}
      {showInfo && (
        <>
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setShowInfo(false)} />
        <div className="fixed inset-y-0 right-0 w-80 z-40 md:relative md:inset-auto md:z-auto border-l border-outline-variant/20 bg-surface-container-low overflow-y-auto transition-transform duration-300 animate-fade-up">
          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full gradient-secondary flex items-center justify-center text-3xl mb-3">{group.icon || '📚'}</div>
              <h3 className="font-headline text-lg font-bold text-on-surface">{group.name}</h3>
              <p className="text-on-surface-variant text-sm text-center mt-1">{group.description || ''}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {isAdmin && (
                <button onClick={() => { const name = prompt('Add member username:'); if (name) { setAddMemberInput(name); handleAddMember() } }} className="bg-surface-container rounded-xl p-3 text-center hover:bg-surface-container-high transition-colors">
                  <span className="material-symbols-outlined text-secondary text-xl block mb-1">person_add</span>
                  <span className="text-on-surface-variant text-xs">Add Member</span>
                </button>
              )}
              <button onClick={generateInviteLink} className="bg-surface-container rounded-xl p-3 text-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-secondary text-xl block mb-1">link</span>
                <span className="text-on-surface-variant text-xs">Invite Link</span>
              </button>
            </div>

            {/* Members */}
            <h4 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3">Members ({members.length})</h4>
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container transition-colors">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center">
                      {member.profilePic ? <img src={member.profilePic} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-outline text-base">person</span>}
                    </div>
                    {isUserOnline(member) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface-container-low" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface text-sm font-medium truncate">{member.displayName}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${member.role === 'Admin' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container-highest text-on-surface-variant'}`}>{member.role}</span>
                  {isAdmin && member.id !== userProfile?.id && (
                    <button onClick={() => handleRemoveMember(member.id)} className="p-1 rounded-lg hover:bg-error/10 text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleLeave} className="w-full mt-8 flex items-center justify-center gap-2 bg-error/10 text-error rounded-xl py-3 font-medium text-sm hover:bg-error/20 transition-colors">
              <span className="material-symbols-outlined text-lg">logout</span>Leave Group
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
