import { useState } from 'react'
import { getVideosBySubject, getThumbnail } from '../../data/videos'
import { storage } from '../../utils/storage'

const SUBJECT_INFO = {
  'jee-mains': { title: 'JEE Mains', desc: 'Master the fundamentals for JEE Main examination with comprehensive video lectures and practice material.', pill: 'Foundation Prep', videoCount: 5, notesCount: 12 },
  'jee-advanced': { title: 'JEE Advanced', desc: 'Deep dive into advanced concepts for IIT JEE with problem-solving strategies and paper analysis.', pill: 'Advanced Prep', videoCount: 5, notesCount: 8 },
  'neet': { title: 'NEET', desc: 'Complete Biology, Physics and Chemistry preparation for NEET with NCERT-focused content.', pill: 'Medical Prep', videoCount: 5, notesCount: 15 },
}

const TABS = ['Videos', 'Notes', 'Quiz', 'Progress']

export default function SubjectPage({ subject }) {
  const [activeTab, setActiveTab] = useState('Videos')
  const info = SUBJECT_INFO[subject] || SUBJECT_INFO['jee-mains']
  const videos = getVideosBySubject(subject)

  const handleVideoClick = (video) => {
    storage.setContinueWatching(video)
    storage.addVideoWatched(video.id)
    storage.markStudiedToday()
    window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')
  }

  return (
    <div className="min-h-screen">
      {/* Subject Header Banner */}
      <section className="relative overflow-hidden bg-surface-container-low border-b border-outline-variant/20">
        <div className="absolute top-0 right-0 w-64 h-64 ambient-blob bg-primary-container" />
        <div className="relative px-4 md:px-8 lg:px-16 py-8 md:py-12">
          <div className="flex items-start gap-4">
            <div className="w-[3px] h-16 md:h-20 bg-primary rounded-full shadow-[0_0_12px_rgba(166,140,255,0.5)] flex-shrink-0 mt-1" />
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">{info.pill}</span>
              <h1 className="font-headline text-3xl md:text-5xl lg:text-6xl font-black text-on-surface mb-3">{info.title}</h1>
              <p className="text-on-surface-variant text-sm md:text-base max-w-2xl mb-4">{info.desc}</p>
              <div className="flex items-center gap-4 text-on-surface-variant text-sm">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">play_circle</span>{info.videoCount} Videos</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">description</span>{info.notesCount} Notes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-0 md:top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="px-4 md:px-8 lg:px-16 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-3.5 text-sm font-medium transition-all relative ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(166,140,255,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-8 lg:px-16 py-8">
        {activeTab === 'Videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-10 stagger-children">
            {videos.map(video => (
              <button
                key={video.id}
                onClick={() => handleVideoClick(video)}
                className="group text-left card-interactive"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-surface-container">
                  <img
                    src={getThumbnail(video.id)}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Duration badge */}
                  <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md font-medium backdrop-blur-sm">
                    {video.duration}
                  </span>
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="material-symbols-outlined filled text-white text-2xl">play_arrow</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">smart_display</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-on-surface text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {video.title}
                    </h3>
                    <p className="text-on-surface-variant text-xs mt-1">{video.channel}</p>
                    <p className="text-on-surface-variant text-xs">{video.views} • 1 week ago</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'Notes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {['Mechanics', 'Thermodynamics', 'Optics', 'Organic Chemistry', 'Algebra', 'Calculus'].map((topic, i) => (
              <div key={topic} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 hover:border-primary/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                    <span className="material-symbols-outlined filled text-error text-xl">picture_as_pdf</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{topic}</span>
                </div>
                <h4 className="text-on-surface font-medium text-sm mb-1 group-hover:text-primary transition-colors">{topic} Complete Notes</h4>
                <p className="text-on-surface-variant text-xs mb-3">Comprehensive study material covering all important concepts and formulas.</p>
                <div className="flex items-center justify-between">
                  <span className="text-outline text-xs">{(2.5 + i * 0.8).toFixed(1)} MB</span>
                  <button className="text-primary text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    <span className="material-symbols-outlined text-sm">download</span>Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Quiz' && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-primary text-6xl mb-4 block opacity-30">quiz</span>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Subject Quiz</h3>
            <p className="text-on-surface-variant text-sm mb-6">Test your knowledge on {info.title}</p>
            <a href="/study/quiz" className="inline-flex items-center gap-2 gradient-primary text-white px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-lg">play_arrow</span>Start Quiz
            </a>
          </div>
        )}

        {activeTab === 'Progress' && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-primary text-6xl mb-4 block opacity-30">trending_up</span>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">Your Progress</h3>
            <p className="text-on-surface-variant text-sm mb-2">{info.title} — {storage.getVideosWatched().length} videos watched</p>
            <div className="w-full max-w-md mx-auto bg-surface-container-high rounded-full h-3 mt-6 overflow-hidden">
              <div className="h-full gradient-primary rounded-full transition-all" style={{ width: '40%' }} />
            </div>
            <p className="text-on-surface-variant text-xs mt-2">40% complete</p>
          </div>
        )}
      </div>
    </div>
  )
}
