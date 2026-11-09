import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { isUserOnline } from '../../utils/storage'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { uploadToCloudinary, uploadBlobToCloudinary, getFileType } from '../../lib/cloudinary'
import { searchGifs } from '../../lib/giphy'
import AttachBottomSheet from '../../components/chat/AttachBottomSheet'
import DateSeparator, { formatDateSeparator } from '../../components/chat/DateSeparator'
import ScrollToBottomButton from '../../components/chat/ScrollToBottomButton'
import MessageBubble from '../../components/chat/MessageBubble'
import MediaViewerModal from '../../components/chat/MediaViewerModal'


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
  const listRef = useRef(null)
  const isNearBottomRef = useRef(true)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [unreadCountBelow, setUnreadCountBelow] = useState(0)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const messageRefs = useRef({})
  const inputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioPreviewRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const audioStreamRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const [activeMedia, setActiveMedia] = useState(null)
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
  const [recordState, setRecordState] = useState('idle')
  const [recordTime, setRecordTime] = useState(0)
  const [contextMenu, setContextMenu] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [editText, setEditText] = useState('')
  const [showReactPicker, setShowReactPicker] = useState(null)
  const [forwardModal, setForwardModal] = useState(null)

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

  const scrollToMessage = (msgId) => {
    const el = messageRefs.current[msgId]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('msg-highlight')
    setTimeout(() => el.classList.remove('msg-highlight'), 1500)
  }

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

  // Auto-scroll on new messages only if already near bottom
  useEffect(() => {
    if (messages.length === 0) return
    if (isNearBottomRef.current) {
      scrollToBottom(true)
    } else {
      setUnreadCountBelow(c => c + 1)
    }
  }, [messages, scrollToBottom])

  // Scroll to bottom on initial load / chat change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 50)
    }
  }, [chatId, scrollToBottom])

  // Auto-resize textarea up to 5 lines (~128px)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`
    }
  }, [text])

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

  // Audio recording — state machine: idle → recording → preview → idle
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size < 500) { setRecordState('idle'); return }
        audioPreviewRef.current = blob
        setRecordState('preview')
      }
      mediaRecorderRef.current = mr
      mr.start(1000)
      setRecordState('recording')
      setRecordTime(0)
      recordingTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch { alert('Microphone access denied') }
  }
  const stopRecordingForPreview = () => {
    clearInterval(recordingTimerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
  }
  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
    audioPreviewRef.current = null
    audioChunksRef.current = []
    setRecordState('idle')
    setRecordTime(0)
  }
  const discardPreview = () => {
    audioPreviewRef.current = null
    setRecordState('idle')
    setRecordTime(0)
  }
  const sendAudioPreview = async () => {
    const blob = audioPreviewRef.current
    if (!blob) return
    setUploading(true)
    setRecordState('idle')
    try {
      const result = await uploadBlobToCloudinary(blob, 'audio', 'messages')
      await sendMessage(chatId, { type: 'audio', content: '', fileURL: result.secure_url, fileName: 'Voice message', fileSize: blob.size, audioDuration: recordTime })
    } catch (err) { alert('Audio upload failed: ' + err.message) }
    finally { setUploading(false); audioPreviewRef.current = null; setRecordTime(0) }
  }
  const formatRecordTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

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

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative animate-page-enter">
      {/* Chat Top Bar — shrink-0 and always visible */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-surface-container-low/90 backdrop-blur-xl border-b border-outline-variant/20 flex-shrink-0 z-20">
        <button
          onClick={() => navigate('/messenger/chats')}
          className="p-1.5 -ml-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          aria-label="Back to chats"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>

        <button
          onClick={() => otherUser?.id && navigate(`/messenger/profile/${otherUser.id}`)}
          className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 hover:opacity-85 transition-opacity cursor-pointer disabled:cursor-default text-left"
          disabled={!otherUser}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-surface-container-highest">
              {otherUser?.profilePic ? (
                <img src={otherUser.profilePic} alt={otherUser?.displayName || 'User'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline text-lg">person</span>
                </div>
              )}
            </div>
            {isUserOnline(otherUser) && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface-container-low online-dot-animated" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-on-surface font-medium text-sm truncate leading-tight">
              {otherUser?.displayName || 'Loading...'}
            </h3>
            <p className="text-on-surface-variant text-xs truncate leading-tight mt-0.5">
              {Object.keys(typingUsers).filter(uid => uid !== userProfile?.id).length > 0 ? (
                <span className="text-secondary animate-pulse flex items-center gap-1 font-medium">
                  <span className="typing-dot w-1 h-1 rounded-full bg-secondary inline-block" />
                  <span className="typing-dot w-1 h-1 rounded-full bg-secondary inline-block" />
                  <span className="typing-dot w-1 h-1 rounded-full bg-secondary inline-block" />
                  typing...
                </span>
              ) : isUserOnline(otherUser) ? (
                <span className="text-secondary font-medium">Online</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0 relative">
          <button
            onClick={() => {
              if (!otherUser?.id || !userProfile?.id) return
              const id = `${userProfile.id}_${otherUser.id}_${Date.now()}`
              window.dispatchEvent(new CustomEvent('dz_start_call', { detail: { callId: id, otherUser, isOutgoing: true } }))
            }}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Audio call"
            aria-label="Start voice call"
          >
            <span className="material-symbols-outlined text-xl">call</span>
          </button>

          <button
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="More options"
            aria-label="More options"
          >
            <span className="material-symbols-outlined text-xl">more_vert</span>
          </button>

          {/* Three-dots dropdown menu */}
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowHeaderMenu(false)} />
              <div className="absolute right-0 top-12 glass-strong rounded-2xl p-1.5 w-48 shadow-2xl border border-outline-variant/20 animate-scale-in z-40">
                <button
                  onClick={() => {
                    setShowHeaderMenu(false)
                    if (otherUser?.id) navigate(`/messenger/profile/${otherUser.id}`)
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors w-full text-left"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  View Profile
                </button>
                <button
                  onClick={() => {
                    setShowHeaderMenu(false)
                    navigate('/messenger/settings')
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors w-full text-left"
                >
                  <span className="material-symbols-outlined text-lg">wallpaper</span>
                  Wallpaper
                </button>
                <button
                  onClick={() => {
                    setShowHeaderMenu(false)
                    navigate('/messenger/chats')
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors w-full text-left"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                  Close Chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area — ONLY scrollable area */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 space-y-2 overscroll-contain relative"
        style={(() => {
          const wp = localStorage.getItem('dz_chat_wallpaper')
          return wp && typeof wp === 'string' && wp.startsWith('http') ? {
            backgroundImage: `linear-gradient(rgba(13,14,17,0.75), rgba(13,14,17,0.75)), url(${wp})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'local',
          } : {}
        })()}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant opacity-20 mb-3">chat_bubble</span>
            <p className="text-on-surface-variant text-sm">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId === userProfile?.id
            const prevMsg = idx > 0 ? messages[idx - 1] : null
            const isNewDay = !prevMsg || (() => {
              const d1 = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt || Date.now())
              const d2 = prevMsg.createdAt?.toDate ? prevMsg.createdAt.toDate() : new Date(prevMsg.createdAt || Date.now())
              return d1.toDateString() !== d2.toDateString()
            })()

            const replyMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null

            return (
              <Fragment key={msg.id}>
                {isNewDay && <DateSeparator date={msg.createdAt} />}
                <MessageBubble
                  ref={el => { if (el) messageRefs.current[msg.id] = el }}
                  msg={msg}
                  isMine={isMine}
                  replyMessage={replyMsg ? {
                    ...replyMsg,
                    isMine: replyMsg.senderId === userProfile?.id,
                    senderName: otherUser?.displayName,
                  } : null}
                  onReplyClick={scrollToMessage}
                  onContextMenu={openContextMenu}
                  onOpenMedia={setActiveMedia}
                />
              </Fragment>
            )
          })
        )}
      </div>

      {/* Scroll to bottom button with unread count */}
      <ScrollToBottomButton
        show={showScrollBottom}
        unreadCount={unreadCountBelow}
        onClick={() => scrollToBottom(true)}
      />

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-3 sm:px-4 py-2 bg-surface-container border-t border-outline-variant/20 flex items-center gap-3 animate-fade-up flex-shrink-0 z-20">
          <div className="w-1 h-9 bg-secondary rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-secondary text-xs font-semibold">
              Replying to {replyTo.senderId === userProfile?.id ? 'yourself' : otherUser?.displayName}
            </p>
            <p className="text-on-surface-variant text-xs truncate">
              {replyTo.type === 'audio' ? '🎤 Voice message'
               : replyTo.type === 'image' ? '📷 Photo'
               : replyTo.content}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-surface-container-high rounded-lg text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="bg-surface-container border-t border-outline-variant/20 overflow-hidden flex flex-col gif-picker-mobile animate-bottom-sheet flex-shrink-0 z-30" style={{maxHeight:'280px'}}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/10">
            <input
              type="text"
              value={gifQuery}
              onChange={e => handleGifSearch(e.target.value)}
              placeholder="Search GIFs..."
              className="flex-1 bg-surface-container-high rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none"
              autoFocus
            />
            <button onClick={() => setShowGifPicker(false)} className="p-1.5 rounded-lg hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="grid grid-cols-3 gap-2">
              {gifResults.map(gif => (
                <button
                  key={gif.id}
                  onClick={() => handleGifSend(gif)}
                  className="relative rounded-xl overflow-hidden hover:opacity-80 transition-opacity border border-outline-variant/10 active:scale-95"
                  style={{aspectRatio:'4/3'}}
                  title={gif.title}
                >
                  <img src={gif.preview || gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
              {gifResults.length === 0 && (
                <p className="col-span-3 text-center text-on-surface-variant text-sm py-6">No GIFs found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="px-3 py-2 bg-surface-container border-t border-outline-variant/20 emoji-picker-mobile animate-bottom-sheet flex-shrink-0 z-30">
          <div className="emoji-tabs flex items-center gap-1 overflow-x-auto pb-1 mb-2">
            {EMOJI_KEYS.map(key => (
              <button
                key={key}
                onClick={() => setEmojiCategory(key)}
                className={`emoji-tab px-2 py-1 rounded-lg text-lg ${emojiCategory === key ? 'bg-secondary/20 text-secondary' : 'hover:bg-surface-container-high'}`}
              >
                {key}
              </button>
            ))}
            <button onClick={() => setShowEmojiPicker(false)} className="p-1 rounded-lg hover:bg-surface-container-high ml-auto">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
            </button>
          </div>
          <p className="text-on-surface-variant text-xs font-medium mb-1.5 px-1">{EMOJI_CATEGORIES[emojiCategory].name}</p>
          <div className="flex flex-wrap gap-1 max-h-44 overflow-y-auto pb-1">
            {EMOJI_CATEGORIES[emojiCategory].emojis.map((em, i) => (
              <button
                key={`${em}-${i}`}
                onClick={() => setText(prev => prev + em)}
                className="text-2xl hover:scale-125 transition-transform p-1 rounded"
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer — ONE row like WhatsApp with bottom safe-area */}
      <div
        className="bg-surface-container-low border-t border-outline-variant/20 flex-shrink-0 relative z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {recordState === 'recording' ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <button onClick={cancelRecording} className="p-2 rounded-xl text-error hover:bg-error/10 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
            <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
            <span className="font-mono text-xs text-error font-semibold">{formatRecordTime(recordTime)}</span>
            <span className="text-on-surface-variant text-xs flex-1 truncate">Recording audio...</span>
            <button onClick={stopRecordingForPreview} className="p-2.5 rounded-xl bg-secondary text-on-secondary hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/30">
              <span className="material-symbols-outlined text-xl">check</span>
            </button>
          </div>
        ) : recordState === 'preview' && audioPreviewRef.current ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-container">
            <button onClick={discardPreview} className="p-2 rounded-xl text-error hover:bg-error/10 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
            <audio controls src={audioPreviewRef.current._blobUrl || (audioPreviewRef.current._blobUrl = URL.createObjectURL(audioPreviewRef.current))} className="flex-1 h-9 rounded-xl" />
            <button onClick={sendAudioPreview} className="p-2.5 rounded-xl bg-secondary text-on-secondary hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/30">
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5 px-2.5 py-2">
            {/* Emoji toggle */}
            <button
              type="button"
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false) }}
              className="p-2 rounded-xl text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors active:scale-95 flex-shrink-0"
              aria-label="Emoji picker"
            >
              <span className="material-symbols-outlined text-xl">mood</span>
            </button>

            {/* Auto-growing textarea up to 5 lines */}
            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Message"
                rows={1}
                className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-3.5 py-2 text-sm text-on-surface resize-none focus:border-secondary/50 focus:outline-none transition-all break-anywhere leading-5"
                style={{ minHeight: '38px', maxHeight: '128px' }}
              />
            </div>

            {/* Attach button */}
            <button
              type="button"
              onClick={() => setShowAttach(true)}
              className="p-2 rounded-xl text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors active:scale-95 flex-shrink-0"
              aria-label="Attach file"
            >
              <span className="material-symbols-outlined text-xl">attach_file</span>
            </button>

            {/* Send or Mic */}
            {text.trim() ? (
              <button
                type="button"
                onClick={handleSend}
                className="p-2.5 rounded-xl bg-secondary text-on-secondary hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-secondary/30 flex-shrink-0"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-xl text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors active:scale-95 flex-shrink-0"
                aria-label="Record voice message"
              >
                <span className="material-symbols-outlined text-xl">mic</span>
              </button>
            )}
          </div>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <div className="px-3 py-1 bg-surface-container flex items-center gap-2 border-t border-outline-variant/10 text-xs text-secondary animate-pulse">
            <div className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span>Uploading media...</span>
          </div>
        )}
      </div>

      {/* Attach Bottom Sheet */}
      <AttachBottomSheet
        isOpen={showAttach}
        onClose={() => setShowAttach(false)}
        onSelectFile={handleFileUpload}
        onShareLocation={shareLocation}
        onOpenGif={() => setShowGifPicker(true)}
      />

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-modal-backdrop" onClick={() => setEditingMsg(null)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md animate-modal-content" onClick={e => e.stopPropagation()}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-modal-backdrop" onClick={() => setForwardModal(null)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto animate-modal-content" onClick={e => e.stopPropagation()}>
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

      {/* Fullscreen Media Viewer Modal */}
      <MediaViewerModal
        isOpen={!!activeMedia}
        media={activeMedia}
        onClose={() => setActiveMedia(null)}
      />

    </div>
  )
}
