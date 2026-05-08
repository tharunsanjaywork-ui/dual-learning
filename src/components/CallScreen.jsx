import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/firebase'
import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { createPeerConnection, getLocalStream } from '../lib/webrtc'

export default function CallScreen({ callId, otherUser, onEnd, isOutgoing, currentUserId }) {
  const [status, setStatus] = useState(isOutgoing ? 'calling' : 'connecting')
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(false)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const timerRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const unsubsRef = useRef([])
  const remoteStreamRef = useRef(null)

  useEffect(() => {
    if (isOutgoing) {
      startOutgoingCall()
    } else {
      answerIncomingCall()
    }
    return () => cleanup()
  }, [])

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [status])

  // Attach remote stream when audio element becomes ready
  useEffect(() => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current
      remoteAudioRef.current.play()
        .then(() => console.log('[Call] Audio attached via effect'))
        .catch(err => console.warn('[Call] Play failed:', err))
    }
  }, [status, muted]) // Re-run when status changes OR mute toggles

  // Continuous audio health check — reattach if srcObject is lost
  useEffect(() => {
    if (status !== 'connected') return
    const checkAudio = setInterval(() => {
      if (remoteAudioRef.current && remoteStreamRef.current) {
        if (!remoteAudioRef.current.srcObject) {
          console.log('[Call] Reattaching lost audio')
          remoteAudioRef.current.srcObject = remoteStreamRef.current
          remoteAudioRef.current.play().catch(() => {})
        }
      }
    }, 2000)
    return () => clearInterval(checkAudio)
  }, [status])

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const setupOnTrack = (pc) => {
    pc.ontrack = (e) => {
      console.log('[Call] Remote track received:', e.streams)
      if (e.streams && e.streams[0]) {
        remoteStreamRef.current = e.streams[0]
        // Try to attach immediately if ref is ready
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0]
          remoteAudioRef.current.play()
            .then(() => console.log('[Call] Audio playing'))
            .catch(err => console.warn('[Call] Play blocked:', err))
        }
      }
    }
  }

  // ═══ OUTGOING CALL (Caller side) ═══
  const startOutgoingCall = async () => {
    try {
      const stream = await getLocalStream()
      localStreamRef.current = stream
      const pc = createPeerConnection()
      pcRef.current = pc

      // Enable ICE trickling and restart
      pc.onnegotiationneeded = () => {
        console.log('[WebRTC] Negotiation needed')
      }
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE state:', pc.iceConnectionState)
        if (pc.iceConnectionState === 'connected' || 
            pc.iceConnectionState === 'completed') {
          setStatus('connected')
          // Try attaching stream again when ICE connects
          if (remoteStreamRef.current && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStreamRef.current
            remoteAudioRef.current.play().catch(() => {})
          }
        }
        if (pc.iceConnectionState === 'failed') {
          console.error('[WebRTC] ICE failed - trying restart')
          setStatus('failed')
        }
      }
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState)
      }

      // 1. Add local audio tracks
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      // 2. Set up ontrack for remote audio
      setupOnTrack(pc)

      // 3. Create offer and set local description
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 4. Send ICE candidates to Firestore (AFTER setLocalDescription)
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await addDoc(collection(db, 'calls', callId, 'callerCandidates'), e.candidate.toJSON())
          } catch (err) { console.warn('Failed to send caller candidate:', err) }
        }
      }

      // 5. Write offer to Firestore
      await setDoc(doc(db, 'calls', callId), {
        offer: { type: offer.type, sdp: offer.sdp },
        callerId: currentUserId,
        calleeId: otherUser?.id,
        status: 'ringing',
        createdAt: serverTimestamp(),
      })

      // 6. Function to add callee ICE candidates — ONLY called after setRemoteDescription
      const addCalleeCandidates = () => {
        // First get any existing candidates
        getDocs(collection(db, 'calls', callId, 'calleeCandidates'))
          .then(snap => {
            snap.docs.forEach(d => {
              pc.addIceCandidate(new RTCIceCandidate(d.data()))
                .catch(e => console.warn('ICE add error:', e))
            })
          })
        // Then listen for new ones
        const unsub = onSnapshot(
          collection(db, 'calls', callId, 'calleeCandidates'),
          snap => {
            snap.docChanges().forEach(change => {
              if (change.type === 'added') {
                pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
                  .catch(e => console.warn('ICE add error:', e))
              }
            })
          }
        )
        unsubsRef.current.push(unsub)
      }

      // 7. Listen for answer from callee
      const unsub1 = onSnapshot(doc(db, 'calls', callId), async (snap) => {
        const data = snap.data()
        if (!data) return

        // When answer arrives, set remote description THEN add ICE candidates
        if (data.answer && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            setStatus('connected')
            // NOW it's safe to add callee ICE candidates
            addCalleeCandidates()
          } catch (err) { console.error('Failed to set remote description:', err) }
        }

        if (data.status === 'ended' || data.status === 'declined') {
          cleanup()
          onEnd()
        }
      })
      unsubsRef.current.push(unsub1)

    } catch (err) {
      console.error('Call error:', err)
      setStatus('failed')
    }
  }

  // ═══ INCOMING CALL (Callee side) ═══
  const answerIncomingCall = async () => {
    try {
      const stream = await getLocalStream()
      localStreamRef.current = stream
      const pc = createPeerConnection()
      pcRef.current = pc

      // Enable ICE trickling and restart
      pc.onnegotiationneeded = () => {
        console.log('[WebRTC] Negotiation needed')
      }
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE state:', pc.iceConnectionState)
        if (pc.iceConnectionState === 'connected' || 
            pc.iceConnectionState === 'completed') {
          setStatus('connected')
          // Try attaching stream again when ICE connects
          if (remoteStreamRef.current && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStreamRef.current
            remoteAudioRef.current.play().catch(() => {})
          }
        }
        if (pc.iceConnectionState === 'failed') {
          console.error('[WebRTC] ICE failed - trying restart')
          setStatus('failed')
        }
      }
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState)
      }

      // 1. Add local audio tracks
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      // 2. Set up ontrack for remote audio
      setupOnTrack(pc)

      // 3. Get call doc with the offer
      const callSnap = await getDoc(doc(db, 'calls', callId))
      if (!callSnap.exists()) { setStatus('failed'); return }
      const callData = callSnap.data()
      if (!callData.offer) { setStatus('failed'); return }

      // 4. Set remote description (caller's offer)
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer))

      // 5. IMMEDIATELY after setRemoteDescription, add existing caller ICE candidates
      getDocs(collection(db, 'calls', callId, 'callerCandidates'))
        .then(snap => {
          snap.docs.forEach(d => {
            pc.addIceCandidate(new RTCIceCandidate(d.data()))
              .catch(e => console.warn('Caller ICE error:', e))
          })
        })

      // 6. Listen for new caller candidates
      const unsubCaller = onSnapshot(
        collection(db, 'calls', callId, 'callerCandidates'),
        snap => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added') {
              pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
                .catch(() => {})
            }
          })
        }
      )
      unsubsRef.current.push(unsubCaller)

      // 7. Set up callee ICE candidate sending
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          try {
            await addDoc(collection(db, 'calls', callId, 'calleeCandidates'), e.candidate.toJSON())
          } catch (err) { console.warn('Failed to send callee candidate:', err) }
        }
      }

      // 8. Create answer and set local description
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // 9. Write answer to Firestore
      await updateDoc(doc(db, 'calls', callId), {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'connected',
      })

      setStatus('connected')

      // 10. Listen for call end
      const unsub2 = onSnapshot(doc(db, 'calls', callId), (snap) => {
        const data = snap.data()
        if (data?.status === 'ended') {
          cleanup()
          onEnd()
        }
      })
      unsubsRef.current.push(unsub2)

    } catch (err) {
      console.error('Answer error:', err)
      setStatus('failed')
    }
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    unsubsRef.current.forEach(unsub => { try { unsub() } catch {} })
    unsubsRef.current = []
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
  }

  const endCall = async () => {
    try {
      await updateDoc(doc(db, 'calls', callId), { status: 'ended' })
    } catch {}
    cleanup()
    onEnd()
  }

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    const newMutedState = track.enabled // if currently enabled, we ARE about to mute
    track.enabled = !track.enabled
    setMuted(newMutedState) // muted = true when track is now disabled
    // After state change, ensure audio element still has the remote stream
    setTimeout(() => {
      if (remoteAudioRef.current && remoteStreamRef.current &&
          !remoteAudioRef.current.srcObject) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current
        remoteAudioRef.current.play().catch(() => {})
      }
    }, 100)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-between py-16 animate-fade-up">
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls={false}
        onLoadedMetadata={() => {
          remoteAudioRef.current?.play()
            .catch(() => {})
        }}
        onCanPlay={() => {
          remoteAudioRef.current?.play()
            .catch(() => {})
        }}
        style={{ display: 'none' }}
      />

      {/* Top — user info */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-secondary/30 animate-glow-secondary">
          {otherUser?.profilePic
            ? <img src={otherUser.profilePic} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-outline">person</span>
              </div>
          }
        </div>
        <div className="text-center">
          <h2 className="text-on-surface text-2xl font-bold font-headline">{otherUser?.displayName}</h2>
          <p className="text-secondary text-sm mt-1">
            {status === 'calling' && <span className="animate-pulse">Calling...</span>}
            {status === 'connecting' && <span className="animate-pulse">Connecting...</span>}
            {status === 'connected' && formatDuration(duration)}
            {status === 'failed' && 'Call failed'}
          </p>
        </div>
      </div>

      {/* Wave animation when connected */}
      {status === 'connected' && (
        <div className="flex items-end gap-1 h-16">
          {[32,48,64,40,72,56,36,60,68,44,52].map((h, i) => (
            <div key={i}
              className="w-1.5 rounded-full bg-secondary wave-bar"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      )}

      {/* Bottom — call controls */}
      <div className="flex items-center gap-8">
        <button onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${muted ? 'bg-error/20 border border-error' : 'bg-surface-container-high'}`}>
          <span className="material-symbols-outlined text-2xl text-on-surface">{muted ? 'mic_off' : 'mic'}</span>
        </button>

        <button onClick={endCall}
          className="w-16 h-16 rounded-full bg-error flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-error/40">
          <span className="material-symbols-outlined text-white text-2xl">call_end</span>
        </button>

        <button onClick={() => setSpeakerOn(!speakerOn)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${speakerOn ? 'bg-secondary/20 border border-secondary' : 'bg-surface-container-high'}`}>
          <span className="material-symbols-outlined text-2xl text-on-surface">{speakerOn ? 'volume_up' : 'volume_down'}</span>
        </button>
      </div>
    </div>
  )
}
