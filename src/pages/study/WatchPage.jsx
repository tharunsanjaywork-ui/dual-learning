import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAllVideos, getThumbnail } from '../../data/videos'

export default function WatchPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [video, setVideo] = useState(null)
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const all = getAllVideos()
    const found = all.find(v => v.id === id) || {
      id,
      title: 'Study Lecture',
      channel: 'Focus Sanctuary',
      duration: 'Lecture',
      subject: 'Revision',
    }
    setVideo(found)

    // Save to Continue Watching history
    try {
      const existingHistory = JSON.parse(localStorage.getItem('dz_study_continue_watching') || '[]')
      const filtered = existingHistory.filter(item => item.id !== id)
      const updated = [
        {
          id: found.id,
          title: found.title,
          channel: found.channel,
          subject: found.subject || 'Study',
          lastWatchedAt: Date.now(),
        },
        ...filtered,
      ].slice(0, 10)
      localStorage.setItem('dz_study_continue_watching', JSON.stringify(updated))
    } catch {}

    // Load lecture notes
    const savedNotes = localStorage.getItem(`dz_study_notes_${id}`) || ''
    setNotes(savedNotes)
  }, [id])

  const handleNotesChange = (e) => {
    const val = e.target.value
    setNotes(val)
    localStorage.setItem(`dz_study_notes_${id}`, val)
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const related = getAllVideos().filter(v => v.id !== id).slice(0, 4)

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 animate-page-enter">
      {/* Back Bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors flex items-center gap-1.5 text-sm"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span className="hidden sm:inline font-medium">Back to Lectures</span>
        </button>
        <span className="text-outline-variant">|</span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
          {video?.subject || 'Study'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Player Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Responsive 16:9 Video Embed */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-outline-variant/20">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
              title={video?.title || 'Lecture Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>

          {/* Video Metadata */}
          <div className="bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-outline-variant/20">
            <h1 className="font-headline text-lg sm:text-xl font-bold text-on-surface leading-snug">
              {video?.title}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-outline-variant/10 text-xs text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">school</span>
                <span className="font-semibold text-on-surface">{video?.channel}</span>
                {video?.duration && (
                  <>
                    <span>•</span>
                    <span>{video.duration}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'share'}</span>
                  <span>{copied ? 'Copied Link' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Study Notes Scratchpad */}
          <div className="bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-outline-variant/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                <h3 className="font-headline font-bold text-sm text-on-surface">Lecture Notes</h3>
              </div>
              <span className="text-[11px] text-on-surface-variant">Auto-saved to device</span>
            </div>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Take notes while watching this lecture... Key formulas, takeaways, timestamps..."
              rows={4}
              className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 resize-y focus:outline-none focus:border-primary/50 transition-all leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Sidebar: Recommended & Next Lectures */}
        <div className="space-y-4">
          <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/20">
            <h3 className="font-headline font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">auto_stories</span>
              <span>Next in Syllabus</span>
            </h3>

            <div className="space-y-3">
              {related.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/study/watch/${item.id}`)}
                  className="flex gap-3 p-2 rounded-xl hover:bg-surface-container-high transition-all cursor-pointer group"
                >
                  <div className="relative w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                    <img
                      src={getThumbnail(item.id)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                      {item.duration}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-on-surface line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant mt-1 truncate">
                      {item.channel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

