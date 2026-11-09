import { useState, useRef, useEffect, useCallback } from 'react'

export default function VoiceNotePlayer({ src, initialDuration = 0 }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState(1)

  // Handle Chrome WebM Infinity duration bug
  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration
    if (isFinite(dur) && !isNaN(dur) && dur > 0) {
      setDuration(dur)
    } else if (initialDuration && isFinite(initialDuration) && initialDuration > 0) {
      setDuration(initialDuration)
    } else {
      // Chromium WebM duration fix: seek near end to recalculate
      const el = audioRef.current
      el.currentTime = 1e101
      const onSeeked = () => {
        el.removeEventListener('seeked', onSeeked)
        el.currentTime = 0
        setDuration(isFinite(el.duration) ? el.duration : (initialDuration || 0))
      }
      el.addEventListener('seeked', onSeeked, { once: true })
    }
  }, [initialDuration])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime || 0
    const dur = duration || audioRef.current.duration || 1
    const pct = isFinite(dur) && dur > 0 ? (cur / dur) * 100 : 0
    setProgress(Math.min(pct, 100))
    setCurrentTime(cur)
  }

  const handleEnded = () => {
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const targetTime = pct * duration
    audioRef.current.currentTime = targetTime
    setCurrentTime(targetTime)
    setProgress(pct * 100)
  }

  const cycleSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  const fmt = (s) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00'
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  // Consistent stylized waveform bars
  const bars = [4, 8, 12, 6, 16, 10, 5, 20, 9, 14, 8, 17, 5, 11, 15, 7, 12, 8, 18, 9, 14, 6]

  return (
    <div className="voice-note-player py-1">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="flex items-center gap-2.5 min-w-[210px] sm:min-w-[240px] max-w-[280px]">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-secondary/20 border border-secondary/30 flex items-center justify-center flex-shrink-0 hover:bg-secondary/30 active:scale-95 transition-all"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <span className="material-symbols-outlined text-secondary text-lg filled">
            {playing ? 'pause' : 'play_arrow'}
          </span>
        </button>

        {/* Waveform and Timers */}
        <div className="flex-1 min-w-0">
          <div
            className="flex items-end gap-[3px] h-7 cursor-pointer mb-1 select-none py-0.5"
            onClick={handleSeek}
            title="Click to seek"
          >
            {bars.map((h, i) => {
              const isPlayed = (i / bars.length) * 100 <= progress
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-150"
                  style={{
                    height: `${h}px`,
                    backgroundColor: isPlayed ? '#00e475' : 'rgba(170, 171, 178, 0.3)',
                    transformOrigin: 'bottom',
                    transform: playing && isPlayed ? 'scaleY(1.15)' : 'scaleY(1)',
                  }}
                />
              )
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 leading-none">
            <span>{fmt(playing ? currentTime : duration)}</span>
            <button
              type="button"
              onClick={cycleSpeed}
              className="px-1.5 py-0.5 rounded bg-surface-container-highest/80 hover:bg-surface-container-highest text-secondary font-mono font-bold text-[9px] transition-colors"
              title="Playback speed"
            >
              {speed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

