import { useMemo } from 'react'
import { storage } from '../../utils/storage'

export default function ProgressPage() {
  const streak = storage.getStudyStreak() || 14
  const videosWatched = storage.getVideosWatched()
  const quizHistory = storage.getQuizHistory()
  const studiedDays = storage.getStudiedDays()

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = now.getDate()

    const days = []
    // Blank days before first of month (Mon=0 start)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    for (let i = 0; i < startOffset; i++) days.push(null)

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        day: d,
        isToday: d === today,
        isStudied: studiedDays.includes(dateStr),
        isFuture: d > today,
      })
    }
    return days
  }, [studiedDays])

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  const goalMinutes = 120
  const todayMinutes = 80
  const goalPct = Math.min(Math.round((todayMinutes / goalMinutes) * 100), 100)

  // SVG ring for daily goal
  const radius = 55
  const circumference = 2 * Math.PI * radius
  const goalOffset = circumference - (goalPct / 100) * circumference

  return (
    <div className="px-4 md:px-8 lg:px-16 py-8">
      <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface mb-8">Your Progress</h1>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-10">
        {/* Daily Goal Tracker */}
        <div className="md:col-span-4 bg-surface-container border border-outline-variant/20 rounded-2xl p-6 flex flex-col items-center justify-center">
          <h3 className="font-headline text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">Daily Goal</h3>
          <div className="relative w-36 h-36 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r={radius} fill="none" className="stroke-surface-container-high" strokeWidth="8" />
              <circle cx="65" cy="65" r={radius} fill="none" className="stroke-primary" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={goalOffset}
                style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-3xl font-extrabold text-on-surface">{goalPct}%</span>
            </div>
          </div>
          <p className="text-on-surface-variant text-sm text-center">
            <span className="text-on-surface font-medium">1hr 20min</span> of 2hr daily goal
          </p>
        </div>

        {/* Study Streak Calendar */}
        <div className="md:col-span-8 bg-surface-container border border-outline-variant/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-headline text-sm font-bold text-on-surface-variant uppercase tracking-wider">{monthName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">🔥</span>
                <span className="font-headline text-lg font-bold text-on-surface">{streak} Day Streak</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Unstoppable</span>
              </div>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-on-surface-variant text-xs font-medium py-1">{d}</div>
            ))}
            {calendarDays.map((day, i) => (
              <div key={i} className="aspect-square flex items-center justify-center">
                {day ? (
                  <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                    day.isToday
                      ? 'bg-primary text-on-primary ring-2 ring-primary/50 shadow-lg shadow-primary/20'
                      : day.isStudied
                      ? 'bg-primary/80 text-on-primary'
                      : day.isFuture
                      ? 'border border-dashed border-outline-variant/30 text-outline'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {day.isToday ? '🔥' : day.day}
                  </div>
                ) : <div />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Progress */}
      <section className="mb-10">
        <h2 className="font-headline text-xl font-bold text-on-surface mb-5">Subject Progress</h2>
        <div className="space-y-4">
          {[
            { label: 'JEE Mains', pct: 60, color: '#3b82f6' },
            { label: 'JEE Advanced', pct: 30, color: '#00e475' },
            { label: 'NEET', pct: 75, color: '#81ecff' },
          ].map(sub => (
            <div key={sub.label} className="bg-surface-container border border-outline-variant/20 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-on-surface font-medium text-sm">{sub.label}</span>
                <span className="text-on-surface-variant text-sm font-medium">{sub.pct}%</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${sub.pct}%`, backgroundColor: sub.color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quiz History */}
      <section>
        <h2 className="font-headline text-xl font-bold text-on-surface mb-5">Quiz History</h2>
        <div className="bg-surface-container border border-outline-variant/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="text-left px-5 py-3 text-on-surface-variant text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant text-xs font-medium uppercase tracking-wider">Subject</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant text-xs font-medium uppercase tracking-wider">Score</th>
                  <th className="text-left px-5 py-3 text-on-surface-variant text-xs font-medium uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {quizHistory.length > 0 ? quizHistory.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors">
                    <td className="px-5 py-3 text-on-surface text-sm">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-on-surface text-sm">{item.subject?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        item.score >= 7 ? 'bg-secondary/10 text-secondary' : item.score >= 5 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'
                      }`}>{item.score}/{item.total}</span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant text-sm">{item.timeTaken}s</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant text-sm">No quizzes taken yet. Start a quiz to track your progress!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
