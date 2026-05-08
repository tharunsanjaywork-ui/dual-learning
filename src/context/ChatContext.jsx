import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  primaryDb, secondaryDb,
  getMessagesDb, getMessagesDbName,
  checkAndSwitchMessagesDb, trackFirestoreWrite,
} from '../lib/firebase'
import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDocs, serverTimestamp, limit, arrayUnion, arrayRemove, setDoc, getDoc,
} from 'firebase/firestore'
import { useAuth } from './AuthContext'
import { showInAppNotification } from '../lib/notifications'
import { isUserOnline } from '../utils/storage'

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

  // Detect new messages without Cloud Functions (Foreground)
  // Use a ref to track if notification listeners 
  // are already set up
  const notifListenersRef = useRef([])
  const notifSetupRef = useRef(false)

  useEffect(() => {
    if (!userProfile?.id || !chats.length) return
    // Only set up once, or when chats count changes significantly
    if (notifSetupRef.current) {
      // Clean up old listeners
      notifListenersRef.current.forEach(fn => fn())
      notifListenersRef.current = []
    }
    notifSetupRef.current = true

    chats.forEach(chat => {
      if (!chat.id) return
      
      const q = query(
        collection(primaryDb, 'messages', chat.id, 'msgs'),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      
      let isFirstLoad = true
      const unsub = onSnapshot(q, (snap) => {
        if (isFirstLoad) { isFirstLoad = false; return }
        if (snap.empty) return
        
        const lastMsg = snap.docs[0].data()
        if (lastMsg.senderId === userProfile.id) return
        
        const isViewingThisChat = window.location.pathname
          .includes(chat.id)
        if (isViewingThisChat) return
        
        const senderName = chat.otherUser?.displayName 
          || 'Someone'
        const msgPreview = lastMsg.type === 'text' 
          ? (lastMsg.content?.substring(0, 50) || '')
          : lastMsg.type === 'audio' ? '🎤 Voice message'
          : lastMsg.type === 'image' ? '📷 Photo'
          : lastMsg.type === 'video' ? '🎬 Video'
          : '📎 File'

        showInAppNotification({
          title: 'Dual Zone',
          body: `${senderName}: ${msgPreview}`,
          onClick: () => {
            window.location.href = `/messenger/chat/${chat.id}`
          }
        })

        if (Notification.permission === 'granted') {
          try {
            const n = new Notification('Dual Zone', {
              body: 'Update, there is an update',
              icon: '/icon-192.png',
              silent: true,
              tag: `msg-${chat.id}`, // tag prevents duplicates!
            })
            n.onclick = () => {
              window.focus()
              window.location.href = '/study/jee-mains'
            }
          } catch (e) {}
        }
      })
      
      notifListenersRef.current.push(unsub)
    })

    return () => {
      notifListenersRef.current.forEach(fn => fn())
      notifListenersRef.current = []
      notifSetupRef.current = false
    }
  }, [chats.length, userProfile?.id])

  // Detect new calls without Cloud Functions (Foreground)
  useEffect(() => {
    if (!userProfile?.id) return
    
    const q = query(
      collection(primaryDb, 'calls'),
      where('calleeId', '==', userProfile.id),
      where('status', '==', 'ringing')
    )
    
    let isFirstLoad = true
    const unsub = onSnapshot(q, (snap) => {
      if (isFirstLoad) { isFirstLoad = false; return }
      if (snap.empty) return
      
      if (Notification.permission === 'granted') {
        try {
          const n = new Notification('Life is going on', {
            body: 'Join us on live.',
            icon: '/icon-192.png',
            silent: true,
            tag: 'incoming-call', // prevents duplicate call notifications
          })
          n.onclick = () => {
            window.focus()
            window.location.href = '/study/jee-mains'
          }
        } catch (e) {}
      }
      
      showInAppNotification({
        title: 'Life is going on',
        body: 'Join us on live.',
        onClick: () => {
          window.location.href = '/study/jee-mains'
        }
      })
    })
    
    return unsub
  }, [userProfile?.id])

  // Listen to user's chats — ALWAYS from primary
  useEffect(() => {
    if (!userProfile?.id) return

    const q = query(
      collection(primaryDb, 'chats'),
      where('participants', 'array-contains', userProfile.id)
    )

    const unsub = onSnapshot(q, async (snapshot) => {
      const chatList = []
      for (const chatDoc of snapshot.docs) {
        const data = chatDoc.data()
        const otherId = data.participants.find(id => id !== userProfile.id)
        let otherUser = null
        if (otherId) {
          const userDoc = await getDoc(doc(primaryDb, 'users', otherId))
          if (userDoc.exists()) otherUser = { id: otherId, ...userDoc.data() }
        }
        chatList.push({ id: chatDoc.id, ...data, otherUser })
      }

      chatList.sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0
        const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0
        return timeB - timeA
      })

      setChats(chatList)
    })

    return unsub
  }, [userProfile?.id])

  // Listen to messages — read from BOTH databases and merge
  useEffect(() => {
    if (!activeChat) { setMessages([]); return }

    const primaryMessages = {}
    const secondaryMessages = {}

    // Listen to primary
    const q1 = query(
      collection(primaryDb, 'messages', activeChat, 'msgs'),
      orderBy('createdAt', 'asc'),
      limit(100)
    )
    const unsub1 = onSnapshot(q1, (snap) => {
      // Clear and rebuild
      Object.keys(primaryMessages).forEach(k => delete primaryMessages[k])
      snap.docs.forEach(d => {
        primaryMessages[d.id] = { id: d.id, ...d.data(), _source: 'primary' }
      })
      mergeAndSetMessages()
    })

    // Also listen to secondary (even if currently writing to primary)
    const q2 = query(
      collection(secondaryDb, 'messages', activeChat, 'msgs'),
      orderBy('createdAt', 'asc'),
      limit(100)
    )
    const unsub2 = onSnapshot(q2, (snap) => {
      Object.keys(secondaryMessages).forEach(k => delete secondaryMessages[k])
      snap.docs.forEach(d => {
        secondaryMessages[d.id] = { id: d.id, ...d.data(), _source: 'secondary' }
      })
      mergeAndSetMessages()
    })

    function mergeAndSetMessages() {
      const allMsgs = [
        ...Object.values(primaryMessages),
        ...Object.values(secondaryMessages)
      ]
      allMsgs.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return tA - tB
      })
      setMessages(allMsgs)
    }

    return () => { unsub1(); unsub2() }
  }, [activeChat])

  // Listen to typing indicator — always primary
  useEffect(() => {
    if (!activeChat || !userProfile?.id) return

    const typingRef = doc(primaryDb, 'chats', activeChat)
    const unsub = onSnapshot(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        const typing = data.typing || {}
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

  // Listen to online status — always primary
  useEffect(() => {
    if (!userProfile?.id) return

    const following = userProfile.following || []
    if (following.length === 0) return

    const batches = []
    for (let i = 0; i < following.length; i += 10) {
      batches.push(following.slice(i, i + 10))
    }

    const unsubs = batches.map(batch => {
      const q = query(collection(primaryDb, 'users'), where('__name__', 'in', batch))
      return onSnapshot(q, (snapshot) => {
        const statuses = {}
        snapshot.docs.forEach(d => {
          statuses[d.id] = isUserOnline(d.data())
        })
        setOnlineUsers(prev => ({ ...prev, ...statuses }))
      })
    })

    return () => unsubs.forEach(u => u())
  }, [userProfile?.id, userProfile?.following])

  // Set typing status — always primary
  const setTyping = useCallback(async (chatId, isTyping) => {
    if (!userProfile?.id || !chatId) return
    try {
      await updateDoc(doc(primaryDb, 'chats', chatId), {
        [`typing.${userProfile.id}`]: isTyping ? serverTimestamp() : null,
      })
    } catch {
      // Ignore errors for typing indicator
    }
  }, [userProfile?.id])

  // Send a message — uses smart router
  const sendMessage = useCallback(async (chatId, message) => {
    if (!userProfile?.id) return

    // Check storage and possibly switch db for messages
    await checkAndSwitchMessagesDb()
    const messagesDb = getMessagesDb()

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
      _dbSource: getMessagesDbName(),
    }

    // Write message to correct db
    const ref = await addDoc(
      collection(messagesDb, 'messages', chatId, 'msgs'),
      msgData
    )

    // Track estimated size for storage monitoring
    const estimatedSize = JSON.stringify(msgData).length + 200
    trackFirestoreWrite(estimatedSize)

    // Always update chat metadata in PRIMARY db
    await setDoc(
      doc(primaryDb, 'chats', chatId),
      {
        participants: [userProfile.id,
          chatId.split('_').find(id => id !== userProfile.id)],
        lastMessage: message.type === 'text'
          ? (message.content || '').substring(0, 100)
          : `📎 ${message.type}`,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    // Clear typing
    setTyping(chatId, false)
    return ref
  }, [userProfile?.id, setTyping])

  // Create or get a chat — always primary
  const getOrCreateChat = useCallback(async (otherUserId) => {
    if (!userProfile?.id) return null

    const participants = [userProfile.id, otherUserId].sort()
    const chatId = participants.join('_')

    const chatRef = doc(primaryDb, 'chats', chatId)
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

  // Mark messages as seen — uses source db
  const markAsSeen = useCallback(async (chatId, messageIds) => {
    if (!userProfile?.id) return
    for (const msgId of messageIds) {
      // Try both databases
      try {
        await updateDoc(doc(primaryDb, 'messages', chatId, 'msgs', msgId), {
          seen: arrayUnion(userProfile.id),
        })
      } catch {
        try {
          await updateDoc(doc(secondaryDb, 'messages', chatId, 'msgs', msgId), {
            seen: arrayUnion(userProfile.id),
          })
        } catch { /* ignore */ }
      }
    }
  }, [userProfile?.id])

  // Add reaction — try both dbs
  const addReaction = useCallback(async (chatId, messageId, emoji) => {
    if (!userProfile?.id) return

    const tryDb = async (dbRef) => {
      const msgRef = doc(dbRef, 'messages', chatId, 'msgs', messageId)
      const msgDoc = await getDoc(msgRef)
      if (msgDoc.exists()) {
        const existingReactions = msgDoc.data().reactions || []
        const withoutMine = existingReactions.filter(r => r.uid !== userProfile.id)
        withoutMine.push({ uid: userProfile.id, emoji })
        await updateDoc(msgRef, { reactions: withoutMine })
        return true
      }
      return false
    }

    if (!(await tryDb(primaryDb))) {
      await tryDb(secondaryDb)
    }
  }, [userProfile?.id])

  // Delete message — try both dbs
  const deleteMessage = useCallback(async (chatId, messageId, forEveryone = false) => {
    const tryDb = async (dbRef) => {
      try {
        const msgRef = doc(dbRef, 'messages', chatId, 'msgs', messageId)
        const msgDoc = await getDoc(msgRef)
        if (!msgDoc.exists()) return false
        if (forEveryone) {
          await updateDoc(msgRef, {
            isDeleted: true,
            content: 'This message was deleted',
            fileURL: '',
          })
        } else {
          await updateDoc(msgRef, {
            [`deletedFor.${userProfile?.id}`]: true,
          })
        }
        return true
      } catch { return false }
    }

    if (!(await tryDb(primaryDb))) {
      await tryDb(secondaryDb)
    }
  }, [userProfile?.id])

  // Edit message — try both dbs
  const editMessage = useCallback(async (chatId, messageId, newContent) => {
    const tryDb = async (dbRef) => {
      try {
        const msgRef = doc(dbRef, 'messages', chatId, 'msgs', messageId)
        const msgDoc = await getDoc(msgRef)
        if (!msgDoc.exists()) return false
        await updateDoc(msgRef, {
          content: newContent,
          isEdited: true,
          editedAt: serverTimestamp(),
        })
        return true
      } catch { return false }
    }

    if (!(await tryDb(primaryDb))) {
      await tryDb(secondaryDb)
    }
  }, [])

  // Star/unstar message — try both dbs
  const toggleStarMessage = useCallback(async (chatId, messageId, isStarred) => {
    const tryDb = async (dbRef) => {
      try {
        await updateDoc(doc(dbRef, 'messages', chatId, 'msgs', messageId), {
          isStarred: !isStarred,
        })
        return true
      } catch { return false }
    }

    if (!(await tryDb(primaryDb))) {
      await tryDb(secondaryDb)
    }
  }, [])

  // Forward message — uses sendMessage (which uses router)
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

  // Pin/unpin chat — always primary
  const togglePinChat = useCallback(async (chatId, isPinned) => {
    if (!userProfile?.id) return
    await updateDoc(doc(primaryDb, 'chats', chatId), {
      pinnedBy: isPinned ? arrayRemove(userProfile.id) : arrayUnion(userProfile.id),
    })
  }, [userProfile?.id])

  // Mute/unmute chat — always primary
  const toggleMuteChat = useCallback(async (chatId, isMuted) => {
    if (!userProfile?.id) return
    await updateDoc(doc(primaryDb, 'chats', chatId), {
      mutedBy: isMuted ? arrayRemove(userProfile.id) : arrayUnion(userProfile.id),
    })
  }, [userProfile?.id])

  // Archive/unarchive chat — always primary
  const toggleArchiveChat = useCallback(async (chatId, isArchived) => {
    if (!userProfile?.id) return
    await updateDoc(doc(primaryDb, 'chats', chatId), {
      archivedBy: isArchived ? arrayRemove(userProfile.id) : arrayUnion(userProfile.id),
    })
  }, [userProfile?.id])

  // Set chat wallpaper — always primary
  const setChatWallpaper = useCallback(async (chatId, wallpaper) => {
    await updateDoc(doc(primaryDb, 'chats', chatId), { wallpaper })
  }, [])

  // Set nickname — always primary
  const setNickname = useCallback(async (chatId, userId, nickname) => {
    await updateDoc(doc(primaryDb, 'chats', chatId), {
      [`nicknames.${userId}`]: nickname,
    })
  }, [])

  // Set disappearing messages — always primary
  const setDisappearingMessages = useCallback(async (chatId, duration) => {
    await updateDoc(doc(primaryDb, 'chats', chatId), {
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
