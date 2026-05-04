import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'

export default function IncomingCall({ callId, callerId, onAccept, onReject }) {
  const [caller, setCaller] = useState(null)

  useEffect(() => {
    if (!callerId) return
    getDoc(doc(db, 'users', callerId)).then(snap => {
      if (snap.exists()) setCaller({ id: snap.id, ...snap.data() })
    })
  }, [callerId])

  const accept = async () => {
    onAccept(callId, caller)
  }

  const reject = async () => {
    await updateDoc(doc(db, 'calls', callId), { status: 'ended' }).catch(() => {})
    onReject()
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-[200] glass-strong rounded-2xl p-4 shadow-2xl border border-outline-variant/30 animate-fade-down">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-secondary/30">
          {caller?.profilePic
            ? <img src={caller.profilePic} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-outline">person</span>
              </div>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-on-surface-variant text-xs mb-0.5">Incoming voice call</p>
          <p className="text-on-surface font-bold text-sm truncate">{caller?.displayName || 'Someone'}</p>
        </div>

        <button onClick={reject}
          className="w-11 h-11 rounded-full bg-error/20 border border-error/40 flex items-center justify-center hover:bg-error/30 active:scale-90 transition-all">
          <span className="material-symbols-outlined text-error text-xl">call_end</span>
        </button>

        <button onClick={accept}
          className="w-11 h-11 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center hover:bg-secondary/30 active:scale-90 transition-all">
          <span className="material-symbols-outlined text-secondary text-xl">call</span>
        </button>
      </div>
    </div>
  )
}
