import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { uploadToCloudinary, uploadBlobToCloudinary, getFileType } from '../../lib/cloudinary'
import { searchGifs } from '../../lib/giphy'

const EMOJI_CATEGORIES = {
  '😀': { name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
  '👋': { name: 'Gestures', emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄'] },
  '❤️': { name: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶','😍','🥰','😘','💋','💏','💑'] },
  '🐶': { name: 'Animals', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'] },
  '🍔': { name: 'Food', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊'] },
  '⚽': { name: 'Activities', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','🤺','⛹️','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🎪','🎨','🎭','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎬','🎮','🕹️','🎲','🧩','🎯','🎳','🎰','🎗️','🏅','🥇','🥈','🥉','🏆','📚','✏️','📝','📖'] },
  '🚗': { name: 'Travel', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚔','🚍','🚘','🚖','✈️','🛫','🛬','🛩️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','🏠','🏡','🏘️','🏢','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🎠','🛝','🎡','🎢','💈','🎪','🗺️','🧭','⛰️','🏔️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️'] },
  '💡': { name: 'Objects', emojis: ['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📸','📹','🎥','📽️','📺','📻','🎙️','🎚️','🎛️','⏰','⏱️','⏳','📡','🔋','🔌','💰','💵','💴','💶','💷','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','🗡️','⚔️','💣','🪃','🏹','🛡️','🪚','🔩','⚙️','🗜️','🔑','🗝️','🔒','🔓','📦','📫','📬','📮','✉️','📧','📪','🗳️','🏷️','🔖','📎','🖇️','📐','📏','📌','📍','✂️','🗑️','🖊️','🖋️','✒️','📝','📁','📂','🗂️','📅','📆','📇','📈','📉','📊','📋','🗒️','🗓️'] },
  '✨': { name: 'Symbols', emojis: ['✨','⭐','🌟','💫','⚡','🔥','💥','🎆','🎇','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','❄️','☃️','⛄','🌊','💧','💦','☔','🎵','🎶','🔔','🔕','📣','📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄','🔇','🔈','🔉','🔊','📯','🔔','💤','💢','💬','🔰','⚜️','🔱','📛','🔰','♻️','✅','❎','❌','⭕','❗','❕','❓','❔','‼️','⁉️','💯','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜','◼️','◻️','🔶','🔷','🔸','🔹','▪️','▫️','💠','🔘','🔳','🔲'] },
  '🏁': { name: 'Flags', emojis: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇮🇳','🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇯🇵','🇰🇷','🇨🇳','🇫🇷','🇩🇪','🇮🇹','🇪🇸','🇧🇷','🇲🇽','🇷🇺','🇸🇦','🇦🇪','🇸🇬','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇳🇬','🇿🇦','🇪🇬','🇰🇪','🇬🇭','🇵🇰','🇧🇩','🇱🇰','🇳🇵','🇹🇷','🇳🇱','🇧🇪','🇨🇭','🇦🇹','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇵🇹','🇬🇷','🇮🇪','🇳🇿','🇦🇷','🇨🇴','🇨🇱','🇵🇪'] },
}
const EMOJI_KEYS = Object.keys(EMOJI_CATEGORIES)

export default function ChatPage() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { messages, setActiveChat, sendMessage, markAsSeen, addReaction, deleteMessage, editMessage, toggleStarMessage, forwardMessage, typingUsers, setTyping, chats } = useChat()
  const { userProfile } = useAuth()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const typingTimeoutRef = useRef(null)

  const [text, setText] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(EMOJI_KEYS[0])
  const [gifResults, setGifResults] = useState([])
  const [gifQuery, setGifQuery] = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [showReactPicker, setShowReactPicker] = useState(null)
  const [forwardModal, setForwardModal] = useState(null)

  useEffect(() => {
    setActiveChat(chatId)
    const fetchOtherUser = async () => {
      const ids = chatId.split('_')
      const otherId = ids.find(id => id !== userProfile?.id)
      if (otherId) {
        const userDoc = await getDoc(doc(db, 'users', otherId))
        if (userDoc.exists()) setOtherUser({ id: otherId, ...userDoc.data() })
      }
    }
    if (chatId) fetchOtherUser()
    return () => setActiveChat(null)
  }, [chatId, userProfile?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark messages as seen
  useEffect(() => {
    if (!messages.length || !userProfile?.id) return
    const unseen = messages
      .filter(m => m.senderId !== userProfile.id && !m.seen?.includes(userProfile.id))
      .map(m => m.id)
    if (unseen.length) markAsSeen(chatId, unseen)
  }, [messages, userProfile?.id, chatId])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    await sendMessage(chatId, { type: 'text', content: trimmed, replyTo: replyTo?.id })
    setText('')
    setReplyTo(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setShowAttach(false)
    setUploading(true)
    try {
      const type = getFileType(file)
      const result = await uploadToCloudinary(file, type, 'messages')
      await sendMessage(chatId, {
        type, content: '', fileURL: result.secure_url,
        fileName: file.name, fileSize: file.size,
      })
    } catch (err) { 
      console.error('Upload failed:', err)
      alert('Upload failed: ' + err.message)
    }
    finally { setUploading(false) }
  }

  const handleGifSend = async (gif) => {
    await sendMessage(chatId, { type: 'gif', content: gif.title, fileURL: gif.url })
    setShowGifPicker(false)
  }

  const handleGifSearch = async (q) => {
    setGifQuery(q)
    try {
      const results = await searchGifs(q, 12)
      setGifResults(results)
    } catch { setGifResults([]) }
  }

  useEffect(() => {
    if (showGifPicker && gifResults.length === 0) handleGifSearch('')
  }, [showGifPicker])

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Typing indicator
  const handleTextChange = (e) => {
    setText(e.target.value)
    setTyping(chatId, true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setTyping(chatId, false), 3000)
  }

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size < 500) return
        setUploading(true)
        try {
          const result = await uploadBlobToCloudinary(blob, 'audio', 'messages')
          await sendMessage(chatId, { type: 'audio', content: '', fileURL: result.secure_url, fileName: 'Voice message', fileSize: blob.size })
        } catch (err) { alert('Audio upload failed: ' + err.message) }
        finally { setUploading(false) }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
    } catch { alert('Microphone access denied') }
  }
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    setRecording(false)
  }

  // Location sharing
  const shareLocation = () => {
    setShowAttach(false)
    if (!navigator.geolocation) { alert('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
        const data = await res.json()
        if (data.display_name) address = data.display_name
      } catch {}
      await sendMessage(chatId, { type: 'location', content: address, location: { latitude, longitude, address } })
    }, () => alert('Location access denied'))
  }

  // Context menu
  const openContextMenu = (e, msg) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({ msg, x: e.clientX || rect.left, y: e.clientY || rect.top })
  }
  const closeContextMenu = () => { setContextMenu(null); setShowReactPicker(null) }
  useEffect(() => { const h = () => closeContextMenu(); window.addEventListener('click', h); return () => window.removeEventListener('click', h) }, [])

  const handleCopy = (msg) => { navigator.clipboard.writeText(msg.content || '').catch(() => {}); closeContextMenu() }
  const handleReply = (msg) => { setReplyTo(msg); closeContextMenu(); inputRef.current?.focus() }
  const handleStar = (msg) => { toggleStarMessage(chatId, msg.id, msg.isStarred); closeContextMenu() }
  const handleDeleteForMe = (msg) => { deleteMessage(chatId, msg.id, false); closeContextMenu() }
  const handleDeleteForAll = (msg) => { deleteMessage(chatId, msg.id, true); closeContextMenu() }
  const handleStartEdit = (msg) => {
    const created = msg.createdAt?.toMillis ? msg.createdAt.toMillis() : (msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : 0)
    if (Date.now() - created > 120000) { alert('Can only edit within 2 minutes'); closeContextMenu(); return }
    setEditingMsg(msg); setEditText(msg.content); closeContextMenu()
  }
  const handleSaveEdit = async () => {
    if (!editingMsg || !editText.trim()) return
    await editMessage(chatId, editingMsg.id, editText.trim())
    setEditingMsg(null); setEditText('')
  }
  const handleForward = (msg) => { setForwardModal(msg); closeContextMenu() }
  const handleForwardTo = async (targetChatId) => {
    if (forwardModal) await forwardMessage(targetChatId, forwardModal)
    setForwardModal(null)
  }

  const renderMessage = (msg) => {
    const isDeleted = msg.isDeleted

    if (isDeleted) {
      return <p className="text-on-surface-variant text-sm italic">This message was deleted</p>
    }

    switch (msg.type) {
      case 'image':
        return <img src={msg.fileURL} alt="" className="max-w-[280px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.fileURL)} />
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <button className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-lg">play_arrow</span>
            </button>
            <div className="flex gap-0.5 items-end flex-1 h-8">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="w-1 bg-current rounded-full opacity-60" style={{ height: `${4 + Math.random() * 20}px` }} />
              ))}
            </div>
            <span className="text-xs opacity-70">0:15</span>
          </div>
        )
      case 'video':
        return (
          <div className="relative max-w-[280px] rounded-xl overflow-hidden cursor-pointer" onClick={() => window.open(msg.fileURL)}>
            <video src={msg.fileURL} className="w-full" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="material-symbols-outlined filled text-white text-3xl">play_arrow</span>
            </div>
          </div>
        )
      case 'file':
        return (
          <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white/5 rounded-xl p-3 min-w-[200px] hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-2xl">description</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.fileName || 'File'}</p>
              <p className="text-xs opacity-60">{msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : ''}</p>
            </div>
            <span className="material-symbols-outlined text-lg">download</span>
          </a>
        )
      case 'gif':
        return (
          <div className="relative max-w-[250px] rounded-xl overflow-hidden">
            <img src={msg.fileURL} alt={msg.content} className="w-full" />
            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">GIF</span>
          </div>
        )
      case 'location':
        return (
          <div className="bg-white/5 rounded-xl overflow-hidden min-w-[200px]">
            <div className="h-32 bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-secondary">location_on</span>
            </div>
            <p className="px-3 py-2 text-xs">{msg.location?.address || 'Shared location'}</p>
          </div>
        )
      default:
        return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] animate-page-enter">
      {/* Chat Top Bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 flex-shrink-0">
        <button onClick={() => navigate('/messenger/chats')} className="p-1 -ml-1">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {otherUser?.profilePic ? (
              <img src={otherUser.profilePic} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-outline">person</span>
              </div>
            )}
          </div>
          {otherUser?.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface-container-low" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-on-surface font-medium text-sm truncate">{otherUser?.displayName || 'Loading...'}</h3>
          <p className="text-on-surface-variant text-xs">{Object.keys(typingUsers).length > 0 ? <span className="text-secondary animate-pulse">typing...</span> : otherUser?.isOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-xl">call</span>
          </button>
          <button className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all hidden md:flex">
            <span className="material-symbols-outlined text-xl">videocam</span>
          </button>
          <button className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all">
            <span className="material-symbols-outlined text-xl">more_vert</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-20 mb-3">chat_bubble</span>
            <p className="text-on-surface-variant text-sm">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === userProfile?.id

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`} onContextMenu={(e) => openContextMenu(e, msg)}>
              <div className={`max-w-[75%] md:max-w-[60%] ${isMine ? 'order-1' : ''}`}>
                {/* Reply preview */}
                {msg.replyTo && (
                  <div className="bg-white/5 rounded-t-xl px-3 py-1.5 border-l-2 border-primary mb-0.5">
                    <p className="text-xs text-on-surface-variant truncate">Replied to a message</p>
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? 'bg-secondary-container/30 border border-secondary/10 rounded-br-md'
                    : 'bg-surface-container-high rounded-bl-md'
                }`} style={isMine ? { borderRight: '3px solid var(--secondary)' } : {}}>
                  {renderMessage(msg)}
                  <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-on-surface-variant/60">{formatTime(msg.createdAt)}</span>
                    {msg.isEdited && <span className="text-[10px] text-on-surface-variant/40">edited</span>}
                    {isMine && (
                      <span className={`material-symbols-outlined text-xs ${msg.seen?.length > 1 ? 'text-secondary' : 'text-on-surface-variant/40'}`}>
                        {msg.seen?.length > 1 ? 'done_all' : 'done'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {msg.reactions?.length > 0 && (
                  <div className="flex gap-1 mt-1 justify-end">
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="text-xs bg-surface-container-high rounded-full px-1.5 py-0.5">{r.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-surface-container border-t border-outline-variant/20 flex items-center gap-3">
          <div className="w-1 h-8 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-primary text-xs font-medium">Reply to message</p>
            <p className="text-on-surface-variant text-xs truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)}>
            <span className="material-symbols-outlined text-outline text-lg">close</span>
          </button>
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="px-4 py-3 bg-surface-container border-t border-outline-variant/20 h-80 overflow-hidden flex flex-col gif-picker-mobile animate-bottom-sheet">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={gifQuery}
              onChange={e => handleGifSearch(e.target.value)}
              placeholder="Search GIFs..."
              className="flex-1 bg-surface-container-high rounded-xl px-4 py-2 text-sm text-on-surface"
              autoFocus
            />
            <button onClick={() => setShowGifPicker(false)} className="p-1.5 rounded-lg hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2">
            {gifResults.map(gif => (
              <button key={gif.id} onClick={() => handleGifSend(gif)} className="rounded-xl overflow-hidden hover:opacity-80 transition-opacity border border-outline-variant/10">
                <img src={gif.preview || gif.url} alt={gif.title} className="w-full aspect-auto" loading="lazy" />
              </button>
            ))}
            {gifResults.length === 0 && <p className="col-span-2 text-center text-on-surface-variant text-sm py-8">No GIFs found</p>}
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="px-3 py-2 bg-surface-container border-t border-outline-variant/20 emoji-picker-mobile animate-bottom-sheet">
          {/* Category tabs */}
          <div className="emoji-tabs">
            {EMOJI_KEYS.map(key => (
              <button
                key={key}
                onClick={() => setEmojiCategory(key)}
                className={`emoji-tab ${emojiCategory === key ? 'active' : ''}`}
              >
                {key}
              </button>
            ))}
            <button onClick={() => setShowEmojiPicker(false)} className="emoji-tab ml-auto" style={{fontSize: '14px'}}>
              <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
            </button>
          </div>
          {/* Category label */}
          <p className="text-on-surface-variant text-xs font-medium mb-1.5 px-1">{EMOJI_CATEGORIES[emojiCategory].name}</p>
          {/* Emoji grid */}
          <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto pb-1">
            {EMOJI_CATEGORIES[emojiCategory].emojis.map((em, i) => (
              <button key={`${em}-${i}`} onClick={() => setText(prev => prev + em)} className="text-2xl hover:scale-125 transition-transform p-0.5 rounded">
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="px-3 md:px-4 py-2 md:py-3 bg-surface-container-low border-t border-outline-variant/20 flex items-end gap-1.5 md:gap-2 flex-shrink-0 chat-input-mobile">
        {/* Attach */}
        <div className="relative">
          <button onClick={() => setShowAttach(!showAttach)} className="p-2 rounded-xl text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-all">
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </button>
          {showAttach && (
            <div className="absolute bottom-12 left-0 glass-strong rounded-2xl p-2 w-48 shadow-2xl border border-outline-variant/20 animate-scale-in">
              {[
                { icon: 'image', label: 'Image', accept: 'image/*' },
                { icon: 'videocam', label: 'Video', accept: 'video/*' },
                { icon: 'mic', label: 'Audio', accept: 'audio/*' },
                { icon: 'description', label: 'File', accept: '*' },
              ].map(item => (
                <label key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  {item.label}
                  <input type="file" accept={item.accept} onChange={handleFileUpload} className="hidden" />
                </label>
              ))}
              <button onClick={shareLocation} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors w-full">
                <span className="material-symbols-outlined text-lg">location_on</span>Location
              </button>
            </div>
          )}
        </div>

        {/* Emoji */}
        <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false) }} className="p-2 rounded-xl text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-all">
          <span className="material-symbols-outlined text-xl">mood</span>
        </button>

        {/* GIF */}
        <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false) }} className="p-2 rounded-xl text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-all">
          <span className="material-symbols-outlined text-xl">gif_box</span>
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-4 py-2.5 text-sm text-on-surface resize-none focus:border-secondary/50 focus:shadow-[0_0_0_2px_rgba(0,228,117,0.1)] transition-all max-h-24"
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* Upload indicator */}
        {uploading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high border border-outline-variant/30 rounded-xl mr-1 animate-pulse">
            <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-xs font-medium text-secondary truncate">Uploading media, please wait...</span>
          </div>
        )}

        {/* Mic */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`p-2.5 rounded-xl transition-all ${recording ? 'bg-error text-white animate-pulse scale-110' : 'text-on-surface-variant hover:text-secondary hover:bg-secondary/10'}`}
          title="Hold to record audio"
        >
          <span className="material-symbols-outlined text-xl">{recording ? 'stop' : 'mic'}</span>
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!text.trim() && !uploading}
          className="p-2.5 rounded-xl bg-secondary text-on-secondary hover:scale-105 transition-transform shadow-lg shadow-secondary/30 disabled:opacity-30 disabled:shadow-none disabled:scale-100"
        >
          <span className="material-symbols-outlined text-xl">send</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={closeContextMenu}>
          <div className="glass-strong rounded-2xl p-1.5 w-52 shadow-2xl border border-outline-variant/20 animate-scale-in" style={{ position: 'fixed', left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 350) }} onClick={e => e.stopPropagation()}>
            {[{ icon: 'reply', label: 'Reply', fn: () => handleReply(contextMenu.msg) },
              { icon: 'add_reaction', label: 'React', fn: () => setShowReactPicker(contextMenu.msg) },
              { icon: 'content_copy', label: 'Copy', fn: () => handleCopy(contextMenu.msg) },
              { icon: 'star', label: contextMenu.msg.isStarred ? 'Unstar' : 'Star', fn: () => handleStar(contextMenu.msg) },
              { icon: 'forward', label: 'Forward', fn: () => handleForward(contextMenu.msg) },
              ...(contextMenu.msg.senderId === userProfile?.id ? [
                { icon: 'edit', label: 'Edit', fn: () => handleStartEdit(contextMenu.msg) },
                { icon: 'delete', label: 'Delete for everyone', fn: () => handleDeleteForAll(contextMenu.msg), danger: true },
              ] : []),
              { icon: 'delete_sweep', label: 'Delete for me', fn: () => handleDeleteForMe(contextMenu.msg), danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.fn} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left transition-colors ${item.danger ? 'text-error hover:bg-error/10' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-lg">{item.icon}</span>{item.label}
              </button>
            ))}
            {showReactPicker && (
              <div className="flex flex-wrap gap-1 p-2 border-t border-outline-variant/20 mt-1">
                {['❤️','😂','😮','😢','😡','👍','🔥','🎉'].map(em => (
                  <button key={em} onClick={() => { addReaction(chatId, showReactPicker.id, em); closeContextMenu() }} className="text-xl hover:scale-125 transition-transform p-1">{em}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMsg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingMsg(null)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-on-surface font-bold mb-3">Edit Message</h3>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface resize-none" rows={3} />
            <div className="flex gap-2 mt-3">
              <button onClick={handleSaveEdit} className="flex-1 bg-secondary text-on-secondary py-2.5 rounded-full font-bold text-sm">Save</button>
              <button onClick={() => setEditingMsg(null)} className="flex-1 bg-surface-container-highest text-on-surface-variant py-2.5 rounded-full font-bold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setForwardModal(null)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-on-surface font-bold mb-3">Forward to...</h3>
            {chats.filter(c => c.id !== chatId).map(c => (
              <button key={c.id} onClick={() => handleForwardTo(c.id)} className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-surface-container-high transition-colors">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                  {c.otherUser?.profilePic ? <img src={c.otherUser.profilePic} className="w-full h-full rounded-full object-cover" /> : <span className="material-symbols-outlined text-outline">person</span>}
                </div>
                <span className="text-on-surface text-sm font-medium">{c.otherUser?.displayName || 'Unknown'}</span>
              </button>
            ))}
            {chats.filter(c => c.id !== chatId).length === 0 && <p className="text-on-surface-variant text-sm text-center py-4">No other chats to forward to</p>}
          </div>
        </div>
      )}
    </div>
  )
}
