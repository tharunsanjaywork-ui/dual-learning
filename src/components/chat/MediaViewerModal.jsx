import { useState, useEffect, useRef, useCallback } from 'react'

export default function MediaViewerModal({ isOpen, onClose, media }) {
  const [scale, setScale] = useState(1)
  const [touchStart, setTouchStart] = useState({ y: 0, x: 0 })
  const [translateY, setTranslateY] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const imgRef = useRef(null)

  // Android back button handling via history state
  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ dz_media_modal: true }, '')

    const handlePopState = (e) => {
      onClose()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    if (window.history.state?.dz_media_modal) {
      window.history.back()
    }
    onClose()
  }, [onClose])

  const handleDoubleTap = () => {
    setScale(s => (s > 1 ? 1 : 2))
  }

  // Swipe down to dismiss gesture
  const onTouchStart = (e) => {
    if (scale > 1) return // disable swipe down when zoomed in
    if (e.touches.length === 1) {
      setTouchStart({ y: e.touches[0].clientY, x: e.touches[0].clientX })
      setIsSwiping(true)
    }
  }

  const onTouchMove = (e) => {
    if (!isSwiping || scale > 1) return
    const currentY = e.touches[0].clientY
    const deltaY = currentY - touchStart.y
    if (deltaY > 0) {
      setTranslateY(deltaY)
    }
  }

  const onTouchEnd = () => {
    if (!isSwiping) return
    setIsSwiping(false)
    if (translateY > 120) {
      handleClose()
    }
    setTranslateY(0)
  }

  if (!isOpen || !media) return null

  const isVideo = media.type === 'video'
  const isImage = media.type === 'image' || media.type === 'gif'

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between transition-opacity duration-200"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0.4, 1 - translateY / 300)})`,
      }}
      onClick={handleClose}
    >
      {/* Top Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md text-white z-20 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>

        <div className="flex-1 min-w-0 px-3 text-center">
          <p className="text-sm font-medium truncate">{media.fileName || (isVideo ? 'Video' : 'Photo')}</p>
          <p className="text-xs text-white/60">{media.subtitle || ''}</p>
        </div>

        <div className="flex items-center gap-1">
          {isImage && (
            <button
              onClick={() => setScale(s => (s > 1 ? 1 : 2))}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-colors"
              title={scale > 1 ? 'Zoom out' : 'Zoom in'}
            >
              <span className="material-symbols-outlined text-xl">{scale > 1 ? 'zoom_out' : 'zoom_in'}</span>
            </button>
          )}
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            download={media.fileName || 'download'}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-colors"
            title="Download"
          >
            <span className="material-symbols-outlined text-xl">download</span>
          </a>
        </div>
      </div>

      {/* Media Canvas */}
      <div
        className="flex-1 flex items-center justify-center p-2 relative overflow-hidden select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {isImage && (
          <img
            ref={imgRef}
            src={media.url}
            alt={media.fileName || ''}
            onDoubleClick={handleDoubleTap}
            className="max-h-full max-w-full object-contain cursor-pointer transition-transform duration-200"
            style={{
              transform: `scale(${scale})`,
            }}
            draggable={false}
          />
        )}

        {isVideo && (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-lg"
          />
        )}
      </div>

      {/* Footer Info or controls */}
      <div className="px-4 py-3 bg-black/60 backdrop-blur-md text-center text-xs text-white/50 z-20 flex-shrink-0">
        {isImage && <span>Double tap or pinch to zoom • Swipe down to dismiss</span>}
      </div>
    </div>
  )
}

