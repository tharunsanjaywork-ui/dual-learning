import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { storage } from '../../utils/storage'
import { getAllVideos, getThumbnail } from '../../data/videos'

const QUICK_ACCESS = [
  { to: '/study/jee-mains', label: 'JEE Mains', desc: 'Complete JEE Mains preparation with video lectures', icon: 'architecture', color: '#3b82f6' },
  { to: '/study/jee-advanced', label: 'JEE Advanced', desc: 'Advanced problem solving for IIT aspirants', icon: 'rocket_launch', color: '#a68cff' },
  { to: '/study/neet', label: 'NEET', desc: 'Biology, Physics & Chemistry for medical entrance', icon: 'medical_services', color: '#00e475' },
]

export default function StudyHome() {
  const { userProfile } = useAuth()
  const streak = storage.getStudyStreak() || 5
  const continueWatching = storage.getContinueWatching()
  const allVideos = getAllVideos()
  const recommended = allVideos.sort(() => Math.random() - 0.5).slice(0, 5)
  const videosWatched = storage.getVideosWatched().length
  const quizzesTaken = storage.getQuizHistory().length

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-20" />
        <div className="relative px-4 md:px-8 lg:px-16 py-10 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="font-headline text-2xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2">
              Welcome back, {userProfile?.displayName?.split(' ')[0] || 'Student'}!
            </h1>
            <p className="text-white/70 text-base md:text-lg">Continue your learning journey. Stay focused, stay consistent.</p>
          </div>
          <div className="glass rounded-2xl p-5 flex items-center gap-4 border border-white/20">
            <div className="text-4xl">🔥</div>
            <div>
              <p className="text-white text-3xl font-headline font-extrabold">{streak}</p>
              <p className="text-white/60 text-sm">Day Streak</p>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 md:px-8 lg:px-16 py-8 space-y-10">
        {/* Quick Access Cards */}
        <section>
          <h2 className="font-headline text-xl md:text-2xl font-bold text-on-surface mb-5">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUICK_ACCESS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="group bg-surface-container border border-outline-variant/20 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${item.color}15` }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: item.color }}>{item.icon}</span>
                </div>
                <h3 className="font-headline text-lg font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">{item.label}</h3>
                <p className="text-on-surface-variant text-sm mb-3">{item.desc}</p>
                <span className="text-primary text-sm font-medium flex items-center gap-1">
                  Start studying <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Continue Watching */}
        {continueWatching && (
          <section>
            <h2 className="font-headline text-xl md:text-2xl font-bold text-on-surface mb-5">Continue Watching</h2>
            <div className="bg-surface-container border border-outline-variant/20 rounded-2xl overflow-hidden flex flex-col md:flex-row">
              <div className="relative aspect-video md:w-80 flex-shrink-0">
                <img src={getThumbnail(continueWatching.id)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="material-symbols-outlined filled text-white text-3xl">play_arrow</span>
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md font-medium">{continueWatching.duration}</span>
              </div>
              <div className="p-5 flex flex-col justify-center border-l-4 border-primary">
                <h3 className="font-headline text-lg font-bold text-on-surface mb-1">{continueWatching.title}</h3>
                <p className="text-on-surface-variant text-sm mb-2">{continueWatching.channel}</p>
                <p className="text-outline text-xs">{continueWatching.views}</p>
              </div>
            </div>
          </section>
        )}

        {/* Recommended Videos */}
        <section>
          <h2 className="font-headline text-xl md:text-2xl font-bold text-on-surface mb-5">Recommended For You</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {recommended.map(video => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { storage.setContinueWatching(video); storage.addVideoWatched(video.id); storage.markStudiedToday() }}
                className="group flex-shrink-0 w-64"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                  <img src={getThumbnail(video.id)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md font-medium">{video.duration}</span>
                </div>
                <h4 className="text-on-surface text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{video.title}</h4>
                <p className="text-on-surface-variant text-xs mt-1">{video.channel} • {video.views}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Today's Quiz Challenge */}
        <section>
          <Link to="/study/quiz" className="block bg-gradient-to-r from-secondary-container to-[#003d1a] rounded-2xl p-6 md:p-8 hover:shadow-lg hover:shadow-secondary/10 transition-all group">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🏆</div>
              <div className="flex-1">
                <h3 className="font-headline text-xl md:text-2xl font-bold text-on-surface mb-1">Today's Quiz Challenge</h3>
                <p className="text-on-surface-variant text-sm">Test your knowledge with daily practice questions</p>
              </div>
              <span className="bg-secondary text-on-secondary px-5 py-2.5 rounded-full font-headline font-bold text-sm group-hover:scale-105 transition-transform hidden md:block">
                Take Quiz
              </span>
            </div>
          </Link>
        </section>

        {/* Stats */}
        <section>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Videos Watched', value: videosWatched, icon: 'play_circle', color: 'primary' },
              { label: 'Quizzes Taken', value: quizzesTaken, icon: 'fact_check', color: 'secondary' },
              { label: 'Current Streak', value: `${streak} days`, icon: 'bolt', color: 'tertiary' },
            ].map(stat => (
              <div key={stat.label} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-4 md:p-6 text-center">
                <span className={`material-symbols-outlined text-${stat.color} text-2xl md:text-3xl mb-2 block`}>{stat.icon}</span>
                <p className="font-headline text-xl md:text-2xl font-bold text-on-surface">{stat.value}</p>
                <p className="text-on-surface-variant text-xs md:text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
