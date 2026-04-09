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
      where('participants', 'array-contains', userProfile.id),
      orderBy('lastMessageAt', 'desc')
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

  // Listen to online status of users
  useEffect(() => {
    if (!userProfile?.id) return

    // Listen to all users' online status (for simplicity, listen to followed users)
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
  }, [userProfile?.id])

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
    await updateDoc(msgRef, {
      reactions: arrayUnion({ uid: userProfile.id, emoji }),
    })
  }, [userProfile?.id])

  // Delete message
  const deleteMessage = useCallback(async (chatId, messageId) => {
    await updateDoc(doc(db, 'messages', chatId, 'msgs', messageId), {
      isDeleted: true,
      content: 'This message was deleted',
    })
  }, [])

  // Edit message (2-min window enforced in UI)
  const editMessage = useCallback(async (chatId, messageId, newContent) => {
    await updateDoc(doc(db, 'messages', chatId, 'msgs', messageId), {
      content: newContent,
      isEdited: true,
      editedAt: serverTimestamp(),
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
    typingUsers,
    onlineUsers,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
