import { useEffect } from 'react'

export default function AttachBottomSheet({ isOpen, onClose, onSelectFile, onShareLocation, onOpenGif }) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const items = [
    {
      id: 'photo',
      icon: 'image',
      label: 'Photos & Videos',
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      accept: 'image/*,video/*',
      type: 'file',
    },
    {
      id: 'doc',
      icon: 'description',
      label: 'Document',
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      accept: '*/*',
      type: 'file',
    },
    {
      id: 'location',
      icon: 'location_on',
      label: 'Location',
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      type: 'action',
      onClick: () => {
        onShareLocation()
        onClose()
      },
    },
    {
      id: 'gif',
      icon: 'gif_box',
      label: 'GIF',
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      type: 'action',
      onClick: () => {
        onOpenGif()
        onClose()
      },
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      
      <div
        className="relative w-full max-w-sm sm:rounded-3xl rounded-t-3xl bg-surface-container-low border border-outline-variant/30 p-5 shadow-2xl animate-bottom-sheet z-10"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-outline-variant/40 rounded-full mx-auto mb-4 sm:hidden" />
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-bold text-sm text-on-surface">Share Content</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {items.map(item => {
            if (item.type === 'file') {
              return (
                <label
                  key={item.id}
                  className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-surface-container-high transition-all cursor-pointer group active:scale-95"
                >
                  <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border shadow-sm ${item.color}`}>
                    <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-on-surface-variant text-center line-clamp-1">
                    {item.label}
                  </span>
                  <input
                    type="file"
                    accept={item.accept}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        onSelectFile(e)
                        onClose()
                      }
                    }}
                  />
                </label>
              )
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-surface-container-high transition-all cursor-pointer group active:scale-95"
              >
                <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border shadow-sm ${item.color}`}>
                  <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-on-surface-variant text-center line-clamp-1">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

