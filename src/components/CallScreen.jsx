import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/firebase'
import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { createPeerConnection, getLocalStream } from '../lib/webrtc'

export default function CallScreen({ callId, otherUser, onEnd, isOutgoing }) {
  const [status, setStatus] = useState(isOutgoing ? 'calling' : 'connected')
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(false)
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const timerRef = useRef(null)
  const remoteAudioRef = useRef(null)

  useEffect(() => {
    startCall()
    return () => cleanup()
  }, [])

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [status])

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const startCall = async () => {
    try {
      const stream = await getLocalStream()
      localStreamRef.current = stream
      const pc = createPeerConnection()
      pcRef.current = pc

      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0]
        }
      }

      if (isOutgoing) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await setDoc(doc(db, 'calls', callId), {
          offer: { type: offer.type, sdp: offer.sdp },
          callerId: otherUser?.id ? callId.split('_')[0] : 'me',
          calleeId: otherUser?.id,
          status: 'ringing',
          createdAt: serverTimestamp(),
        })

        const unsub = onSnapshot(doc(db, 'calls', callId), async (snap) => {
          const data = snap.data()
          if (!data) return
          if (data.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            setStatus('connected')
          }
          if (data.status === 'ended') {
            unsub()
            cleanup()
            onEnd()
          }
        })

        pc.onicecandidate = async (e) => {
          if (e.candidate) {
            await addDoc(collection(db, 'calls', callId, 'callerCandidates'), e.candidate.toJSON())
          }
        }

        onSnapshot(collection(db, 'calls', callId, 'calleeCandidates'), (snap) => {
          snap.docChanges().forEach(async change => {
            if (change.type === 'added') {
              await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()))
            }
          })
        })
      }
    } catch (err) {
      console.error('Call error:', err)
      setStatus('failed')
    }
  }

  const cleanup = () => {
    clearInterval(timerRef.current)
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
  }

  const endCall = async () => {
    await updateDoc(doc(db, 'calls', callId), { status: 'ended' }).catch(() => {})
    cleanup()
    onEnd()
  }

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setMuted(!track.enabled)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-between py-16 animate-fade-up">
      <audio ref={remoteAudioRef} autoPlay />

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
            {status === 'connected' && formatDuration(duration)}
            {status === 'failed' && 'Call failed'}
          </p>
        </div>
      </div>

      {/* Wave animation when connected */}
      {status === 'connected' && (
        <div className="flex items-end gap-1 h-12">
          {[4,7,10,6,12,8,5,9,11,6,8].map((h, i) => (
            <div key={i} className="w-1.5 rounded-full bg-secondary wave-bar"
              style={{ '--bar-h': `${h}px`, '--i': i }} />
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
