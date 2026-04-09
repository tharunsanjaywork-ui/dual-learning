// localStorage helpers — used across both modes

export const storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key)
      return val ? JSON.parse(val) : null
    } catch {
      return localStorage.getItem(key)
    }
  },

  set: (key, value) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  },

  remove: (key) => localStorage.removeItem(key),

  clear: () => localStorage.clear(),

  // Auth helpers
  getUsername: () => localStorage.getItem('dz_username'),
  setUsername: (v) => localStorage.setItem('dz_username', v),
  getDisplayName: () => localStorage.getItem('dz_displayName'),
  setDisplayName: (v) => localStorage.setItem('dz_displayName', v),
  getProfilePic: () => localStorage.getItem('dz_profilePic'),
  setProfilePic: (v) => localStorage.setItem('dz_profilePic', v),
  getUserId: () => localStorage.getItem('dz_userId'),
  setUserId: (v) => localStorage.setItem('dz_userId', v),

  isFirstVisit: () => !localStorage.getItem('dz_username'),

  clearAuth: () => {
    localStorage.removeItem('dz_username')
    localStorage.removeItem('dz_displayName')
    localStorage.removeItem('dz_profilePic')
    localStorage.removeItem('dz_userId')
  },

  // Study helpers
  getContinueWatching: () => {
    try { return JSON.parse(localStorage.getItem('dz_continueWatching')) } catch { return null }
  },
  setContinueWatching: (video) => localStorage.setItem('dz_continueWatching', JSON.stringify(video)),

  getStudyStreak: () => parseInt(localStorage.getItem('dz_streak') || '0'),
  setStudyStreak: (n) => localStorage.setItem('dz_streak', String(n)),

  getQuizHistory: () => {
    try { return JSON.parse(localStorage.getItem('dz_quizHistory') || '[]') } catch { return [] }
  },
  addQuizResult: (result) => {
    const history = storage.getQuizHistory()
    history.unshift({ ...result, date: new Date().toISOString() })
    localStorage.setItem('dz_quizHistory', JSON.stringify(history.slice(0, 50)))
  },

  getVideosWatched: () => {
    try { return JSON.parse(localStorage.getItem('dz_videosWatched') || '[]') } catch { return [] }
  },
  addVideoWatched: (videoId) => {
    const watched = storage.getVideosWatched()
    if (!watched.includes(videoId)) {
      watched.push(videoId)
      localStorage.setItem('dz_videosWatched', JSON.stringify(watched))
    }
  },

  getStudiedDays: () => {
    try { return JSON.parse(localStorage.getItem('dz_studiedDays') || '[]') } catch { return [] }
  },
  markStudiedToday: () => {
    const days = storage.getStudiedDays()
    const today = new Date().toISOString().split('T')[0]
    if (!days.includes(today)) {
      days.push(today)
      localStorage.setItem('dz_studiedDays', JSON.stringify(days))
    }
  },

  // Theme
  getTheme: () => localStorage.getItem('dz_theme') || 'dark',
  setTheme: (t) => localStorage.setItem('dz_theme', t),
}
