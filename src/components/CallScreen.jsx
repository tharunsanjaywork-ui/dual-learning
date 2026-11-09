import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { db } from '../lib/firebase'
import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { createPeerConnection, getLocalStream } from '../lib/webrtc'
import { startOutgoingRingback, stopRingtone } from '../lib/ringtone'

export default function CallScreen({ callId, otherUser, onEnd, isOutgoing, currentUserId }) {
  const [status, setStatus] = useState(isOutgoing ? 'calling' : 'connecting')
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(false)

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const timerRef = useRef(null)
  const heartbeatTimerRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const unsubsRef = useRef([])
  const remoteStreamRef = useRef(null)
  const candidatesQueueRef = useRef([])
  const isRemoteDescriptionSetRef = useRef(false)
  const audioContextRef = useRef(null)
  const gainNodeRef = useRef(null)

  // Teardown cleanup function
  const cleanup = useCallback(() => {
    stopRingtone()
    clearInterval(timerRef.current)
    clearInterval(heartbeatTimerRef.current)

    unsubsRef.current.forEach(unsub => {
      try { unsub() } catch {}
    })
    unsubsRef.current = []

    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null

    if (pcRef.current) {
      try { pcRef.current.close() } catch {}
      pcRef.current = null
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close().catch(() => {}) } catch {}
      audioContextRef.current = null
      gainNodeRef.current = null
    }
  }, [])

  const location = useLocation()
  const initialPathRef = useRef(location.pathname)

  const endCall = useCallback(async (explicitStatus = null) => {
    try {
      const finalStatus = explicitStatus || (status === 'calling' ? 'cancelled' : 'ended')
      await updateDoc(doc(db, 'calls', callId), { status: finalStatus })
    } catch {}
    cleanup()
    onEnd()
  }, [callId, cleanup, onEnd, status])

  // Setup speaker audio enhancement via Web Audio API
  const setupAudioRouting = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(speakerOn ? 2.5 : 1.0, ctx.currentTime)

      source.connect(gain)
      gain.connect(ctx.destination)
      gainNodeRef.current = gain
    } catch (err) {
      console.warn('[Call] Web Audio routing warning:', err)
    }
  }

  // Handle speaker toggle
  const toggleSpeaker = () => {
    const nextState = !speakerOn
    setSpeakerOn(nextState)

    // Adjust gain boost
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        nextState ? 2.5 : 1.0,
        audioContextRef.current.currentTime
      )
    }

    // Also try setSinkId if supported by the browser
    if (remoteAudioRef.current && typeof remoteAudioRef.current.setSinkId === 'function') {
      navigator.mediaDevices?.enumerateDevices?.().then(devices => {
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput')
        if (audioOutputs.length > 1) {
          const target = nextState ? audioOutputs[audioOutputs.length - 1].deviceId : ''
          remoteAudioRef.current.setSinkId(target).catch(() => {})
        }
      }).catch(() => {})
    }
  }

  // Setup ontrack
  const setupOnTrack = (pc) => {
    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        const stream = e.streams[0]
        remoteStreamRef.current = stream
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream
          remoteAudioRef.current.play().catch(err => {
            console.warn('[Call] Auto-play blocked, waiting for interaction:', err)
          })
        }
        setupAudioRouting(stream)
      }
    }
  }

  // Process queued ICE candidates after setRemoteDescription
  const flushQueuedCandidates = async (pc) => {
    const queue = [...candidatesQueueRef.current]
    candidatesQueueRef.current = []
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(cand)
      } catch (e) {
        console.warn('[Call] Queued candidate error:', e)
      }
    }
  }

  // ═══ OUTGOING CALL (Caller) ═══
  const startOutgoingCall = async () => {
    try {
      startOutgoingRingback()
      const stream = await getLocalStream()
      localStreamRef.current = stream
      const pc = createPeerConnection()
      pcRef.current = pc

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          stopRingtone()
          setStatus('connected')
        }
        if (pc.iceConnectionState === 'failed') {
          console.warn('[Call] Caller ICE failed, attempting restartIce()...')
          if (typeof pc.restartIce === 'function') {
            try { pc.restartIce() } catch (e) { console.warn('[Call] restartIce error:', e) }
          }
        }
      }

      // Add local audio tracks
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      setupOnTrack(pc)

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // ICE candidates from caller
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await addDoc(collection(db, 'calls', callId, 'callerCandidates'), e.candidate.toJSON())
          } catch {}
        }
      }

      // Write offer to Firestore
      await setDoc(doc(db, 'calls', callId), {
        offer: { type: offer.type, sdp: offer.sdp },
        callerId: currentUserId,
        calleeId: otherUser?.id,
        status: 'ringing',
        callerAliveAt: Date.now(),
        createdAt: serverTimestamp(),
      })

      // Listen for callee's candidates
      const unsubCandidates = onSnapshot(
        collection(db, 'calls', callId, 'calleeCandidates'),
        snap => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data())
              if (isRemoteDescriptionSetRef.current && pcRef.current) {
                pcRef.current.addIceCandidate(candidate).catch(() => {})
              } else {
                candidatesQueueRef.current.push(candidate)
              }
            }
          })
        }
      )
      unsubsRef.current.push(unsubCandidates)

      // Listen for answer from callee
      const unsubCall = onSnapshot(doc(db, 'calls', callId), async (snap) => {
        const data = snap.data()
        if (!data) return

        if (data.answer && !isRemoteDescriptionSetRef.current && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
            isRemoteDescriptionSetRef.current = true
            stopRingtone()
            setStatus('connected')
            await flushQueuedCandidates(pcRef.current)
          } catch (err) {
            console.error('[Call] Failed to set remote description:', err)
          }
        }

        if (['ended', 'declined', 'cancelled', 'missed'].includes(data.status)) {
          cleanup()
          onEnd()
        }

        // Liveness check
        if (data.calleeAliveAt && Date.now() - data.calleeAliveAt > 10000) {
          console.warn('[Call] Callee connection timed out')
          endCall()
        }
      })
      unsubsRef.current.push(unsubCall)

    } catch (err) {
      console.error('[Call] Outgoing call error:', err)
      stopRingtone()
      setStatus('failed')
    }
  }

  // ═══ INCOMING CALL (Callee) ═══
  const answerIncomingCall = async () => {
    try {
      const stream = await getLocalStream()
      localStreamRef.current = stream
      const pc = createPeerConnection()
      pcRef.current = pc

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStatus('connected')
        }
        if (pc.iceConnectionState === 'failed') {
          console.warn('[Call] Callee ICE failed, attempting restartIce()...')
          if (typeof pc.restartIce === 'function') {
            try { pc.restartIce() } catch (e) { console.warn('[Call] restartIce error:', e) }
          }
        }
      }

      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      setupOnTrack(pc)

      // Get call doc
      const callSnap = await getDoc(doc(db, 'calls', callId))
      if (!callSnap.exists() || !callSnap.data().offer) {
        setStatus('failed')
        return
      }

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(callSnap.data().offer))
      isRemoteDescriptionSetRef.current = true

      // Send callee candidates
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await addDoc(collection(db, 'calls', callId, 'calleeCandidates'), e.candidate.toJSON())
          } catch {}
        }
      }

      // Fetch existing caller candidates
      const existingCandidates = await getDocs(collection(db, 'calls', callId, 'callerCandidates'))
      existingCandidates.docs.forEach(d => {
        pc.addIceCandidate(new RTCIceCandidate(d.data())).catch(() => {})
      })

      // Listen for incoming caller candidates
      const unsubCallerCand = onSnapshot(
        collection(db, 'calls', callId, 'callerCandidates'),
        snap => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {})
            }
          })
        }
      )
      unsubsRef.current.push(unsubCallerCand)

      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await updateDoc(doc(db, 'calls', callId), {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'connected',
        calleeAliveAt: Date.now(),
      })

      setStatus('connected')

      // Listen for call end / liveness
      const unsubCall = onSnapshot(doc(db, 'calls', callId), (snap) => {
        const data = snap.data()
        if (['ended', 'declined', 'cancelled', 'missed'].includes(data?.status)) {
          cleanup()
          onEnd()
        }
        if (data?.callerAliveAt && Date.now() - data.callerAliveAt > 10000) {
          console.warn('[Call] Caller connection timed out')
          endCall()
        }
      })
      unsubsRef.current.push(unsubCall)

    } catch (err) {
      console.error('[Call] Incoming call answer error:', err)
      setStatus('failed')
    }
  }

  // ═══ COMPREHENSIVE CALL TERMINATION TRIGGERS ═══
  // 1. unmount, 2. route change, 3. visibilitychange hidden, 4. pagehide,
  // 5. beforeunload, 6. popstate/back, 7. zone switch, 8. logout
  useEffect(() => {
    if (isOutgoing) {
      startOutgoingCall()
    } else {
      answerIncomingCall()
    }

    // Trigger 4 & 5: beforeunload & pagehide
    const handleBeforeUnload = () => {
      endCall()
    }

    // Trigger 7: Zone switch (panic switch)
    const handlePanic = () => {
      endCall()
    }

    // Trigger 3: Visibility change hidden (tab switched/minimized/backgrounded)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endCall()
      }
    }

    // Trigger 6: Browser back / forward button (popstate)
    const handlePopState = () => {
      endCall()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)
    window.addEventListener('dz_panic_switch', handlePanic)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Trigger 1: Unmount cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      window.removeEventListener('dz_panic_switch', handlePanic)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cleanup()
    }
  }, [])

  // Trigger 2: Route change detection
  useEffect(() => {
    if (location.pathname !== initialPathRef.current) {
      endCall()
    }
  }, [location.pathname, endCall])

  // Trigger 8: Logout / user invalidation
  useEffect(() => {
    if (!currentUserId) {
      endCall()
    }
  }, [currentUserId, endCall])

  // 60-second ringing timeout for outgoing calls (marks as missed if unanswered)
  useEffect(() => {
    if (isOutgoing && status === 'calling') {
      const ringTimer = setTimeout(() => {
        endCall('missed')
      }, 60000)
      return () => clearTimeout(ringTimer)
    }
  }, [isOutgoing, status, endCall])

  // Call duration timer & Heartbeat ping
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

      // Heartbeat ping every 2.5 seconds
      const heartbeatKey = isOutgoing ? 'callerAliveAt' : 'calleeAliveAt'
      heartbeatTimerRef.current = setInterval(() => {
        updateDoc(doc(db, 'calls', callId), {
          [heartbeatKey]: Date.now(),
        }).catch(() => {})
      }, 2500)
    }

    return () => {
      clearInterval(timerRef.current)
      clearInterval(heartbeatTimerRef.current)
    }
  }, [status, callId, isOutgoing])

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMuted(!track.enabled)
  }

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-between py-12 px-4 animate-fade-up select-none">
      {/* Remote Audio — MUST NOT be display: none */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls={false}
        muted={false}
        style={{ position: 'fixed', top: -100, left: -100, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Top User Info */}
      <div className="flex flex-col items-center gap-4 mt-8">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-secondary/30 animate-glow-secondary shadow-2xl">
          {otherUser?.profilePic ? (
            <img src={otherUser.profilePic} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-outline">person</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-on-surface text-2xl font-bold font-headline">{otherUser?.displayName || 'User'}</h2>
          <p className="text-secondary text-sm mt-1 font-medium">
            {status === 'calling' && <span className="animate-pulse">Calling...</span>}
            {status === 'connecting' && <span className="animate-pulse">Connecting...</span>}
            {status === 'connected' && formatDuration(duration)}
            {status === 'failed' && <span className="text-error">Call failed</span>}
          </p>
        </div>
      </div>

      {/* Connected Wave Animation */}
      {status === 'connected' && (
        <div className="flex items-end gap-1.5 h-16 my-auto">
          {[24, 40, 56, 36, 64, 48, 32, 52, 60, 38, 44].map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-secondary wave-bar"
              style={{
                height: `${h}px`,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex items-center gap-6 sm:gap-8 mb-6">
        {/* Mute */}
        <button
          type="button"
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md ${
            muted ? 'bg-error/20 border border-error text-error' : 'bg-surface-container-high text-on-surface'
          }`}
          aria-label={muted ? 'Unmute' : 'Mute'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          <span className="material-symbols-outlined text-2xl">{muted ? 'mic_off' : 'mic'}</span>
        </button>

        {/* End Call */}
        <button
          type="button"
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-error text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-error/40"
          aria-label="End call"
          title="End call"
        >
          <span className="material-symbols-outlined text-3xl">call_end</span>
        </button>

        {/* Speakerphone */}
        <button
          type="button"
          onClick={toggleSpeaker}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md ${
            speakerOn
              ? 'bg-secondary/20 border border-secondary text-secondary'
              : 'bg-surface-container-high text-on-surface'
          }`}
          aria-label={speakerOn ? 'Turn off speaker' : 'Turn on speaker'}
          title={speakerOn ? 'Speaker ON' : 'Speaker OFF'}
        >
          <span className="material-symbols-outlined text-2xl">
            {speakerOn ? 'volume_up' : 'volume_down'}
          </span>
        </button>
      </div>
    </div>
  )
}
