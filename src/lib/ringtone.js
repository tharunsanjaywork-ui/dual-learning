// Web Audio API Ringtone Generator — zero external assets, immediate start & stop

let activeAudioCtx = null
let ringTimer = null

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
    activeAudioCtx = new AudioCtx()
  }
  if (activeAudioCtx.state === 'suspended') {
    activeAudioCtx.resume().catch(() => {})
  }
  return activeAudioCtx
}

export function startOutgoingRingback() {
  stopRingtone()
  const ctx = getAudioContext()
  if (!ctx) return

  const playBurst = () => {
    if (!activeAudioCtx || activeAudioCtx.state === 'closed') return
    try {
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc2.type = 'sine'
      osc1.frequency.setValueAtTime(440, ctx.currentTime)
      osc2.frequency.setValueAtTime(480, ctx.currentTime)

      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(ctx.currentTime)
      osc2.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 1.6)
      osc2.stop(ctx.currentTime + 1.6)
    } catch {}
  }

  playBurst()
  ringTimer = setInterval(playBurst, 4000)
}

export function startIncomingRingtone() {
  stopRingtone()
  const ctx = getAudioContext()
  if (!ctx) return

  const playBurst = () => {
    if (!activeAudioCtx || activeAudioCtx.state === 'closed') return
    try {
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'triangle'
      osc2.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, now) // C5
      osc2.frequency.setValueAtTime(659.25, now) // E5

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.setValueAtTime(0.12, now + 0.4)
      gain.gain.setValueAtTime(0.001, now + 0.5)
      gain.gain.setValueAtTime(0.12, now + 0.6)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 1.5)
      osc2.stop(now + 1.5)
    } catch {}
  }

  playBurst()
  ringTimer = setInterval(playBurst, 3000)
}

export function stopRingtone() {
  if (ringTimer) {
    clearInterval(ringTimer)
    ringTimer = null
  }
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close().catch(() => {})
    } catch {}
    activeAudioCtx = null
  }
}

