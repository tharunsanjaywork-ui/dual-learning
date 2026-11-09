import { forwardRef } from 'react'
import MediaMessage from './MediaMessage'

function formatTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const MessageBubble = forwardRef(function MessageBubble(
  {
    msg,
    isMine,
    senderName,
    replyMessage,
    onReplyClick,
    onContextMenu,
    onOpenMedia,
  },
  ref
) {
  const isDeleted = msg.isDeleted

  return (
    <div
      ref={ref}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${
        isMine ? 'animate-message-right' : 'animate-message-left'
      }`}
      onContextMenu={(e) => onContextMenu?.(e, msg)}
    >
      <div className={`max-w-[84%] sm:max-w-[72%] md:max-w-[62%] min-w-0 ${isMine ? 'order-1' : ''}`}>
        {/* Group Sender Name */}
        {!isMine && senderName && (
          <p className="text-[11px] text-secondary font-medium mb-1 ml-1 truncate">
            {senderName}
          </p>
        )}

        {/* Reply preview */}
        {msg.replyTo && (
          <button
            type="button"
            onClick={() => onReplyClick?.(msg.replyTo)}
            className="w-full text-left bg-black/25 rounded-xl px-3 py-2 mb-1.5 border-l-2 border-secondary hover:bg-black/35 transition-colors"
          >
            <p className="text-secondary text-[10px] font-semibold mb-0.5">
              {replyMessage ? (replyMessage.isMine ? 'You' : replyMessage.senderName || 'User') : 'Replied message'}
            </p>
            <p className="text-on-surface-variant text-xs truncate">
              {replyMessage?.type === 'image'
                ? '📷 Photo'
                : replyMessage?.type === 'audio'
                ? '🎤 Voice message'
                : replyMessage?.type === 'video'
                ? '🎬 Video'
                : replyMessage?.type === 'file'
                ? '📎 Document'
                : replyMessage?.type === 'gif'
                ? '🎞 GIF'
                : replyMessage?.type === 'location'
                ? '📍 Location'
                : replyMessage?.content || 'Message'}
            </p>
          </button>
        )}

        {/* Main Bubble */}
        <div
          className={`rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 break-words break-anywhere ${
            isMine
              ? 'bg-secondary-container/30 border border-secondary/15 rounded-br-sm'
              : 'bg-surface-container-high rounded-bl-sm border border-outline-variant/10'
          }`}
          style={isMine ? { borderRight: '3px solid var(--secondary)' } : {}}
        >
          {isDeleted ? (
            <p className="text-on-surface-variant text-sm italic py-0.5">This message was deleted</p>
          ) : (
            <>
              {msg.type && msg.type !== 'text' && (
                <div className="mb-1.5">
                  <MediaMessage msg={msg} onOpenMedia={onOpenMedia} />
                </div>
              )}

              {msg.content && msg.type === 'text' && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words break-anywhere text-on-surface">
                  {msg.content}
                </p>
              )}

              {/* Timestamp & Status footer */}
              <div className={`flex items-center gap-1.5 mt-1 select-none ${isMine ? 'justify-end' : 'justify-end sm:justify-start'}`}>
                <span className="text-[10px] text-on-surface-variant/60 leading-none">
                  {formatTime(msg.createdAt)}
                </span>
                {msg.isEdited && (
                  <span className="text-[9px] text-on-surface-variant/40 leading-none">edited</span>
                )}
                {isMine && (
                  <span
                    className={`material-symbols-outlined text-xs leading-none ${
                      msg.seen?.length > 1 ? 'text-secondary' : 'text-on-surface-variant/40'
                    }`}
                  >
                    {msg.seen?.length > 1 ? 'done_all' : 'done'}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Reaction Chips */}
        {msg.reactions?.length > 0 && (
          <div className="flex gap-1 mt-1 justify-end flex-wrap">
            {msg.reactions.map((r, i) => (
              <span
                key={i}
                className="text-xs bg-surface-container-high border border-outline-variant/15 rounded-full px-2 py-0.5 shadow-sm"
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

export default MessageBubble

