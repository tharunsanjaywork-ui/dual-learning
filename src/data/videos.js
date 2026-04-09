export const jeeMainsVideos = [
  { id: "pFhkRkABU48", title: "JEE Main 2025 Complete Physics One Shot", channel: "JEE Wallah", duration: "6:32:10", views: "3.2M views", subject: "Physics" },
  { id: "HyF5NRwPBg4", title: "JEE Main Mathematics - Complete Revision", channel: "Vedantu JEE", duration: "5:45:00", views: "1.8M views", subject: "Mathematics" },
  { id: "4OEPPaUxFUk", title: "JEE Mains Chemistry One Shot", channel: "Apni Kaksha", duration: "4:20:30", views: "2.1M views", subject: "Chemistry" },
  { id: "AHgJBsRcJRk", title: "JEE Main 2025 Paper Discussion", channel: "Unacademy JEE", duration: "3:10:00", views: "980K views", subject: "General" },
  { id: "ZED8_uerbb4", title: "JEE Mains Strategy - Score 250+", channel: "Physics Wallah", duration: "1:45:20", views: "4.5M views", subject: "Strategy" },
]

export const jeeAdvancedVideos = [
  { id: "_AzThFO0Bj8", title: "JEE Advanced Physics Complete One Shot", channel: "JEE Wallah", duration: "7:10:00", views: "1.5M views", subject: "Physics" },
  { id: "XHVEoSXP61k", title: "JEE Advanced Maths - Calculus Deep Dive", channel: "Mohit Tyagi", duration: "5:30:00", views: "890K views", subject: "Mathematics" },
  { id: "fSkPKR54eHQ", title: "JEE Advanced Chemistry - Organic Reactions", channel: "Vedantu JEE", duration: "4:55:00", views: "720K views", subject: "Chemistry" },
  { id: "K6Z9qEPEwos", title: "IIT JEE Advanced Paper Analysis", channel: "Unacademy JEE", duration: "3:40:00", views: "1.1M views", subject: "General" },
  { id: "iw4gdW7unhM", title: "JEE Advanced Topper Strategy", channel: "Physics Wallah", duration: "2:00:00", views: "2.3M views", subject: "Strategy" },
]

export const neetVideos = [
  { id: "nYFuxTozgLI", title: "NEET 2025 Biology Complete One Shot", channel: "Physics Wallah NEET", duration: "8:15:00", views: "5.2M views", subject: "Biology" },
  { id: "pqKzx3x9f34", title: "NEET Chemistry All Chapters Revision", channel: "Vedantu NEET", duration: "6:00:00", views: "2.8M views", subject: "Chemistry" },
  { id: "Mw6APxBVZLY", title: "NEET Physics Complete Revision", channel: "Let's Crack NEET UG", duration: "4:30:00", views: "1.6M views", subject: "Physics" },
  { id: "e6TSZJ4XKGU", title: "NEET 2025 Score 700+ Roadmap", channel: "Unacademy NEET", duration: "2:10:00", views: "3.9M views", subject: "Strategy" },
  { id: "HVsd4LIqgLQ", title: "NEET Biology Human Physiology", channel: "Biomentors", duration: "5:50:00", views: "1.2M views", subject: "Biology" },
]

export const getVideosBySubject = (subject) => {
  switch (subject) {
    case 'jee-mains': return jeeMainsVideos
    case 'jee-advanced': return jeeAdvancedVideos
    case 'neet': return neetVideos
    default: return []
  }
}

export const getAllVideos = () => [...jeeMainsVideos, ...jeeAdvancedVideos, ...neetVideos]

export const getThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
