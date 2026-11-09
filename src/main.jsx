import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { isFirebaseConfigured } from './lib/firebase'
import './index.css'

// Register Firebase service worker for push notifications
if ('serviceWorker' in navigator && isFirebaseConfigured) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then(reg => {
        console.log('[SW] Registered:', reg.scope)
      })
      .catch(err => {
        console.warn('[SW] Registration failed:', err)
      })
  })
}

const root = ReactDOM.createRoot(document.getElementById('root'))

if (!isFirebaseConfigured) {
  root.render(
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-6 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Environment Setup Required</h1>
        <p className="text-[#8a8a8a] text-sm mb-6 leading-relaxed">
          Firebase credentials are not configured in this build. If you are seeing this on Render, please add your <code className="text-[#7c6af7] bg-[#242424] px-1.5 py-0.5 rounded text-xs font-mono">VITE_*</code> environment variables in the Render Dashboard.
        </p>
        <div className="bg-[#242424] border border-[#2e2e2e] rounded-xl p-4 text-left text-xs text-[#a0a0a0] mb-6 space-y-2">
          <p className="font-semibold text-white">How to fix in 1 minute:</p>
          <ol className="list-decimal list-inside space-y-1 text-[#8a8a8a]">
            <li>Open your Render Dashboard</li>
            <li>Go to <strong className="text-white">dualzone</strong> &rarr; <strong className="text-white">Environment</strong></li>
            <li>Add your <code className="text-[#7c6af7]">VITE_FIREBASE_*</code> keys from your <code className="text-white">.env</code></li>
            <li>Click <strong className="text-white">Manual Deploy &rarr; Clear build cache & deploy</strong></li>
          </ol>
        </div>
      </div>
    </div>
  )
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}
