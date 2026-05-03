import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDocs, serverTimestamp, limit, arrayUnion, arrayRemove, setDoc, getDoc,
} from 'firebase/firestore'
import { useAuth } from './AuthContext'

const ChatContext = createContext(null)

export const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

export function ChatProvider({ children }) {
  const { userProfile } = useAuth()
  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState({})
  const [onlineUsers, setOnlineUsers] = useState({})

  // Listen to user's chats
  useEffect(() => {
    if (!userProfile?.id) return

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userProfile.id)
    )

    const unsub = onSnapshot(q, async (snapshot) => {
      const chatList = []
      for (const chatDoc of snapshot.docs) {
        const data = chatDoc.data()
        // Get other participant's profile
        const otherId = data.participants.find(id => id !== userProfile.id)
        let otherUser = null
        if (otherId) {
          const userDoc = await getDoc(doc(db, 'users', otherId))
          if (userDoc.exists()) otherUser = { id: otherId, ...userDoc.data() }
        }
        chatList.push({ id: chatDoc.id, ...data, otherUser })
      }
      
      // Sort in memory to avoid requiring Firebase composite indexes
      chatList.sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0
        const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0
        return timeB - timeA
      })
      
      setChats(chatList)
    })

    return unsub
  }, [userProfile?.id])

  // Listen to messages in active chat
  useEffect(() => {
    if (!activeChat) { setMessages([]); return }

    const q = query(
      collection(db, 'messages', activeChat, 'msgs'),
      orderBy('createdAt', 'asc'),
      limit(100)
    )

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setMessages(msgs)
    })

    return unsub
  }, [activeChat])

  // Listen to typing indicator for active chat
  useEffect(() => {
    if (!activeChat || !userProfile?.id) return

    const typingRef = doc(db, 'chats', activeChat)
    const unsub = onSnapshot(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const typing = data.typing || {}
        // Remove own typing status and expired ones (> 5 seconds)
        const now = Date.now()
        const activeTypers = {}
        Object.entries(typing).forEach(([uid, ts]) => {
          if (uid !== userProfile.id) {
            const typingTime = ts?.toMillis ? ts.toMillis() : (typeof ts === 'number' ? ts : 0)
            if (now - typingTime < 5000) {
              activeTypers[uid] = true
            }
          }
        })
        setTypingUsers(activeTypers)
      }
    })

    return unsub
  }, [activeChat, userProfile?.id])

  // Listen to online status of users
  useEffect(() => {
    if (!userProfile?.id) return

    const following = userProfile.following || []
    if (following.length === 0) return

    // Batch into groups of 10 (Firestore where-in limit)
    const batches = []
    for (let i = 0; i < following.length; i += 10) {
      batches.push(following.slice(i, i + 10))
    }

    const unsubs = batches.map(batch => {
      const q = query(collection(db, 'users'), where('__name__', 'in', batch))
      return onSnapshot(q, (snapshot) => {
        const statuses = {}
        snapshot.docs.forEach(d => {
          statuses[d.id] = d.data().isOnline || false
        })
        setOnlineUsers(prev => ({ ...prev, ...statuses }))
      })
    })

    return () => unsubs.forEach(u => u())
  }, [userProfile?.id, userProfile?.following])

  // Set typing status
  const setTyping = useCallback(async (chatId, isTyping) => {
    if (!userProfile?.id || !chatId) return
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.${userProfile.id}`]: isTyping ? serverTimestamp() : null,
      })
    } catch {
      // Ignore errors for typing indicator
    }
  }, [userProfile?.id])

  // Send a message
  const sendMessage = useCallback(async (chatId, message) => {
    if (!userProfile?.id) return

    const msgData = {
      senderId: userProfile.id,
      type: message.type || 'text',
      content: message.content || '',
      fileURL: message.fileURL || '',
      fileName: message.fileName || '',
      fileSize: message.fileSize || 0,
      location: message.location || null,
      contactId: message.contactId || null,
      replyTo: message.replyTo || null,
      reactions: [],
      seen: [userProfile.id],
      isDeleted: false,
      isEdited: false,
      isStarred: false,
      disappearsAt: null,
      createdAt: serverTimestamp(),
    }

    await addDoc(collection(db, 'messages', chatId, 'msgs'), msgData)

    // Update chat's last message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: message.content || `[${message.type}]`,
      lastMessageAt: serverTimestamp(),
    })

    // Clear typing
    setTyping(chatId, false)
  }, [userProfile?.id, setTyping])

  // Create or get a chat with another user
  const getOrCreateChat = useCallback(async (otherUserId) => {
    if (!userProfile?.id) return null

    const participants = [userProfile.id, otherUserId].sort()
    const chatId = participants.join('_')

    const chatRef = doc(db, 'chats', chatId)
    const chatDoc = await getDoc(chatRef)

    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        participants,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        nicknames: {},
        pinnedBy: [],
        mutedBy: [],
        archivedBy: [],
        wallpaper: '',
        typing: {},
        disappearingMessages: { enabled: false, duration: 0 },
      })
    }

    return chatId
  }, [userProfile?.id])

  // Mark messages as seen
  const markAsSeen = useCallback(async (chatId, messageIds) => {
    if (!userProfile?.id) return
    for (const msgId of messageIds) {
      await updateDoc(doc(db, 'messages', chatId, 'msgs', msgId), {
        seen: arrayUnion(userProfile.id),
      }).catch(() => {})
    }
  }, [userProfile?.id])

  // Add reaction to message
  const addReaction = useCallback(async (chatId, messageId, emoji) => {
    if (!userProfile?.id) return
    const msgRef = doc(db, 'messages', chatId, 'msgs', messageId)
    // First remove any existing reaction from this user
    const msgDoc = await getDoc(msgRef)
    if (msgDoc.exists()) {
      const existingReactions = msgDoc.data().reactions || []
      const withoutMine = existingReactions.filter(r => r.uid !== userProfile.id)
      withoutMine.push({ uid: userProfile.id, emoji })
      await updateDoc(msgRef, { reactions: withoutMine })
    }
  }, [userProfile?.id])

  // Delete message
  const deleteMessage = useCallback(async (chatId, messageId, forEveryone = false) => {
    if (forEveryone) {
      await updateDoc(doc(db, 'messages', chatId, 'msgs', messageId), {
        isDeleted: true,
        content: 'This message was deleted',
        fileURL: '',
      })
    } else {
      // For "delete for me" — we'd need a deletedFor array, simplified here
      await updateDoc(doc(db, 'messages', chatId, 'msgs', messageId), {
        [`deletedFor.${userProfile?.id}`]: true,
      })
    }
  }, [userProfile?.id])

  // Edit message (2-min window enforced in UI)
  const editMessage = useCallback(async (chatId, messageId, newContent) => {
    await updateDoc(doc(db, 'messages', chatId, 'msgs', messageId), {
      content: newContent,
      isEdited: true,
      editedAt: serverTimestamp(),
    })
  }, [])

  // Star/unstar message
  const toggleStarMessage = useCallback(async (chatId, messageId, isStarred) => {
    await updateDoc(doc(db, 'messages', chatId, 'msgs', messageId), {
      isStarred: !isStarred,
    })
  }, [])

  // Forward message
  const forwardMessage = useCallback(async (targetChatId, originalMsg) => {
    if (!userProfile?.id) return
    await sendMessage(targetChatId, {
      type: originalMsg.type,
      content: originalMsg.content ? `↪ ${originalMsg.content}` : '',
      fileURL: originalMsg.fileURL,
      fileName: originalMsg.fileName,
      fileSize: originalMsg.fileSize,
      location: originalMsg.location,
    })
  }, [userProfile?.id, sendMessage])

  // Pin/unpin chat
  const togglePinChat = useCallback(async (chatId, isPinned) => {
    if (!userProfile?.id) return
    await updateDoc(doc(db, 'chats', chatId), {
      pinnedBy: isPinned ? arrayRemove(userProfile.id) : arrayUnion(userProfile.id),
    })
  }, [userProfile?.id])

  // Mute/unmute chat
  const toggleMuteChat = useCallback(async (chatId, isMuted) => {
    if (!userProfile?.id) return
    await updateDoc(doc(db, 'chats', chatId), {
      mutedBy: isMuted ? arrayRemove(userProfile.id) : arrayUnion(userProfile.id),
    })
  }, [userProfile?.id])

  // Archive/unarchive chat
  const toggleArchiveChat = useCallback(async (chatId, isArchived) => {
    if (!userProfile?.id) return
    await updateDoc(doc(db, 'chats', chatId), {
      archivedBy: isArchived ? arrayRemove(userProfile.id) : arrayUnion(userProfile.id),
    })
  }, [userProfile?.id])

  // Set chat wallpaper
  const setChatWallpaper = useCallback(async (chatId, wallpaper) => {
    await updateDoc(doc(db, 'chats', chatId), { wallpaper })
  }, [])

  // Set nickname
  const setNickname = useCallback(async (chatId, userId, nickname) => {
    await updateDoc(doc(db, 'chats', chatId), {
      [`nicknames.${userId}`]: nickname,
    })
  }, [])

  // Set disappearing messages timer
  const setDisappearingMessages = useCallback(async (chatId, duration) => {
    await updateDoc(doc(db, 'chats', chatId), {
      disappearingMessages: { enabled: duration > 0, duration },
    })
  }, [])

  const value = {
    chats,
    activeChat,
    setActiveChat,
    messages,
    sendMessage,
    getOrCreateChat,
    markAsSeen,
    addReaction,
    deleteMessage,
    editMessage,
    toggleStarMessage,
    forwardMessage,
    typingUsers,
    onlineUsers,
    setTyping,
    togglePinChat,
    toggleMuteChat,
    toggleArchiveChat,
    setChatWallpaper,
    setNickname,
    setDisappearingMessages,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
