import { useState } from 'react'
import VoiceNotePlayer from './VoiceNotePlayer'

function getOptimizedImageUrl(url, maxWidth = 800) {
  if (!url || typeof url !== 'string') return url
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    // Avoid re-transforming if already transformed
    if (url.includes('/upload/f_auto,q_auto')) return url
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${maxWidth},c_limit/`)
  }
  return url
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return { icon: 'picture_as_pdf', color: 'text-red-400 bg-red-500/10' }
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return { icon: 'description', color: 'text-blue-400 bg-blue-500/10' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'table_view', color: 'text-emerald-400 bg-emerald-500/10' }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: 'folder_zip', color: 'text-amber-400 bg-amber-500/10' }
  return { icon: 'draft', color: 'text-on-surface-variant bg-surface-container-highest' }
}

export default function MediaMessage({ msg, onOpenMedia }) {
  const [imageLoaded, setImageLoaded] = useState(false)

  switch (msg.type) {
    case 'image': {
      const optimizedSrc = getOptimizedImageUrl(msg.fileURL, 800)
      return (
        <div
          onClick={() => onOpenMedia?.({ type: 'image', url: msg.fileURL, fileName: msg.fileName })}
          className="relative max-w-[280px] sm:max-w-[320px] w-full min-h-[160px] max-h-[360px] rounded-xl overflow-hidden cursor-pointer group bg-surface-container-highest/60 select-none"
        >
          {/* Skeleton placeholder while loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-surface-container-highest animate-pulse flex items-center justify-center">
              <span className="material-symbols-outlined text-outline text-3xl">image</span>
            </div>
          )}
          <img
            src={optimizedSrc}
            alt={msg.fileName || 'Photo'}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-auto max-h-[360px] object-cover rounded-xl transition-all duration-300 group-hover:scale-[1.02] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors pointer-events-none rounded-xl" />
        </div>
      )
    }

    case 'video': {
      return (
        <div
          onClick={() => onOpenMedia?.({ type: 'video', url: msg.fileURL, fileName: msg.fileName })}
          className="relative max-w-[280px] sm:max-w-[320px] w-full min-h-[160px] rounded-xl overflow-hidden cursor-pointer group bg-black/80 select-none"
        >
          <video
            src={msg.fileURL}
            className="w-full h-auto max-h-[340px] object-cover rounded-xl opacity-90"
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 flex items-center justify-center transition-colors">
            <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined filled text-white text-3xl">play_arrow</span>
            </div>
          </div>
          {msg.videoDuration && (
            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono font-medium">
              {msg.videoDuration}
            </span>
          )}
        </div>
      )
    }

    case 'audio': {
      return <VoiceNotePlayer src={msg.fileURL} initialDuration={msg.audioDuration} />
    }

    case 'file': {
      const fileInfo = getFileIcon(msg.fileName)
      return (
        <a
          href={msg.fileURL}
          target="_blank"
          rel="noopener noreferrer"
          download={msg.fileName || 'document'}
          className="flex items-center gap-3 bg-black/20 border border-outline-variant/20 hover:border-secondary/30 rounded-xl p-3 min-w-[220px] max-w-[280px] hover:bg-black/30 transition-all group"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${fileInfo.color}`}>
            <span className="material-symbols-outlined text-2xl">{fileInfo.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate group-hover:text-secondary transition-colors">
              {msg.fileName || 'Attachment'}
            </p>
            <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
              {msg.fileSize ? formatBytes(msg.fileSize) : 'Document'}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary text-lg flex-shrink-0">
            download
          </span>
        </a>
      )
    }

    case 'gif': {
      return (
        <div
          onClick={() => onOpenMedia?.({ type: 'gif', url: msg.fileURL, fileName: msg.content })}
          className="relative max-w-[260px] rounded-xl overflow-hidden cursor-pointer group bg-surface-container-highest select-none"
        >
          <img
            src={msg.fileURL}
            alt={msg.content || 'GIF'}
            className="w-full h-auto object-cover rounded-xl group-hover:scale-[1.02] transition-transform"
            loading="lazy"
          />
          <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-xs">
            GIF
          </span>
        </div>
      )
    }

    case 'location': {
      const lat = msg.location?.latitude
      const lon = msg.location?.longitude
      const address = msg.location?.address || msg.content || 'Location'
      const osmUrl = lat && lon ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}` : null

      return (
        <a
          href={osmUrl || '#'}
          target={osmUrl ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="block bg-black/20 border border-outline-variant/20 rounded-xl overflow-hidden min-w-[220px] max-w-[280px] hover:border-secondary/30 transition-all group"
        >
          <div className="h-28 bg-surface-container-highest flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl text-secondary">location_on</span>
            </div>
            <span className="text-[10px] text-white/80 font-medium relative z-10 mt-1">Shared Location</span>
          </div>
          <div className="p-2.5">
            <p className="text-xs text-on-surface font-medium line-clamp-2 leading-relaxed">
              {address}
            </p>
            <p className="text-[10px] text-secondary font-medium mt-1 flex items-center gap-1">
              <span>Open in Maps</span>
              <span className="material-symbols-outlined text-xs">open_in_new</span>
            </p>
          </div>
        </a>
      )
    }

    default:
      return null
  }
}

