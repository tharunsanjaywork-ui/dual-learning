import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const BUSY_RESPONSES = [
  "Inference cluster is currently overloaded (503 Service Unavailable). Please retry your request in a few moments.",
  "Network latency exceeded gateway timeout threshold (504 Gateway Timeout). The server is busy. Please try again.",
  "Compute quota temporarily throttled due to high peak traffic. Please press retry to resubmit your query.",
]

const TOAST_MESSAGES = [
  "Servers are busy, please try again.",
  "Service temporarily unavailable. Please retry.",
  "High server load detected. Please try again.",
]

export default function ChatbotGatewayPage() {
  const { user, userProfile, switchToMessenger } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Focus Sanctuary AI Assistant is online. Due to high examination traffic, server capacity is limited. Enter your query below:',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isEnteringMessenger, setIsEnteringMessenger] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [lastUserQuery, setLastUserQuery] = useState('')
  const errorIndexRef = useRef(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const showToast = (text) => {
    setToastMessage(text)
    setTimeout(() => {
      setToastMessage(prev => (prev === text ? null : prev))
    }, 2800)
  }

  const handleRetry = (queryToRetry) => {
    const q = queryToRetry || lastUserQuery || input
    if (!q) return
    executeSubmission(q)
  }

  const executeSubmission = async (text) => {
    const userMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMessage])
    setLastUserQuery(text)
    setInput('')

    // Secret Messenger switch check
    if (user && userProfile?.passwordMessenger) {
      try {
        await switchToMessenger(text)
        // Neutral transition: DO NOT show "Switching to StudyZone" or redirect to /study/home
        setIsEnteringMessenger(true)
        setTimeout(() => {
          navigate('/messenger/chats', { replace: true })
        }, 600)
        return
      } catch {
        // Not the secret password — proceed with decoy server busy response
      }
    }

    // Server busy decoy response
    setIsTyping(true)
    setTimeout(() => {
      const idx = errorIndexRef.current % BUSY_RESPONSES.length
      const replyText = BUSY_RESPONSES[idx]
      const toastText = TOAST_MESSAGES[idx]
      errorIndexRef.current += 1

      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: replyText,
          originalQuery: text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setIsTyping(false)
      showToast(toastText)
    }, 750)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    executeSubmission(text)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] max-w-4xl mx-auto px-3 sm:px-4 py-2 animate-page-enter relative">
      {/* Small Notification Toast */}
      {toastMessage && (
        <div className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-50 bg-surface-container-highest/95 border border-error/30 text-on-surface px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-fade-down backdrop-blur-md">
          <span className="material-symbols-outlined text-error text-base">cloud_off</span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Neutral Transition Overlay when opening Messenger */}
      {isEnteringMessenger && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface-variant font-mono text-xs uppercase tracking-wider">Connecting...</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between py-2 px-3 bg-surface-container-low/80 backdrop-blur-md rounded-2xl border border-outline-variant/20 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/study/home')}
            className="p-1.5 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-lg">smart_toy</span>
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-on-surface leading-tight">
              Sanctuary AI Study Assistant
            </h2>
            <p className="text-[10px] text-primary font-medium flex items-center gap-1 leading-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Online • Academic Helper
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          title="Clear Chat"
        >
          <span className="material-symbols-outlined text-lg">restart_alt</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 py-2 space-y-3 overscroll-contain">
        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const isErr = msg.isError

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 leading-relaxed text-sm ${
                  isUser
                    ? 'bg-primary/20 border border-primary/30 text-on-surface rounded-br-sm'
                    : isErr
                    ? 'bg-surface-container-high border border-error/30 text-on-surface rounded-bl-sm shadow-sm'
                    : 'bg-surface-container-high border border-outline-variant/15 text-on-surface rounded-bl-sm shadow-sm'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold">
                    {isErr ? (
                      <span className="text-error flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span>503 Service Unavailable</span>
                      </span>
                    ) : (
                      <span className="text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>AI Assistant</span>
                      </span>
                    )}
                  </div>
                )}

                <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                {isErr && (
                  <div className="mt-2.5 pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-on-surface-variant/70">Request timed out</span>
                    <button
                      type="button"
                      onClick={() => handleRetry(msg.originalQuery)}
                      className="px-2.5 py-1 rounded-full bg-error/15 hover:bg-error/25 text-error text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">replay</span>
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                <span className="text-[10px] text-on-surface-variant/50 block mt-1 text-right">
                  {msg.time}
                </span>
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface-container-high border border-outline-variant/15 rounded-2xl px-4 py-2.5 flex items-center gap-1.5 text-primary text-xs">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              <span className="ml-1 text-[11px] text-on-surface-variant">Connecting to compute cluster...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <form
        onSubmit={handleSubmit}
        className="mt-2 bg-surface-container-low border border-outline-variant/20 rounded-2xl p-2 flex items-center gap-2 flex-shrink-0 z-10 shadow-lg"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question or enter query..."
          className="flex-1 bg-surface-container-high border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2.5 rounded-xl bg-primary text-on-primary hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 flex-shrink-0 shadow-md shadow-primary/20"
          aria-label="Send"
        >
          <span className="material-symbols-outlined text-xl">send</span>
        </button>
      </form>
    </div>
  )
}

