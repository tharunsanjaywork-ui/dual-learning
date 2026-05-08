import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

// Apply saved theme mode before React renders (prevents flash)
try {
  const saved = localStorage.getItem('dz_settings_toggles')
  if (saved) {
    const toggles = JSON.parse(saved)
    if (toggles.darkMode === false) {
      document.documentElement.classList.add('light-mode')
    }
  }
} catch {}

// Register Firebase service worker for push notifications
if ('serviceWorker' in navigator) {
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
