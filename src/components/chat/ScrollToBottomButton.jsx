export default function ScrollToBottomButton({ onClick, unreadCount = 0 }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-20 right-4 z-20 flex items-center gap-1.5 bg-surface-container-high/90 hover:bg-surface-container-highest border border-outline-variant/40 text-on-surface px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 animate-fade-in group"
      title="Scroll to bottom"
      type="button"
    >
      <span className="material-symbols-outlined text-lg text-secondary group-hover:translate-y-0.5 transition-transform">
        arrow_downward
      </span>
      {unreadCount > 0 && (
        <span className="bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

