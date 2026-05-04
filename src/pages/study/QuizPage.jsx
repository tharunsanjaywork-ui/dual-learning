import { useState, useEffect, useCallback, useRef } from 'react'
import { getQuizBySubject, subjectLabels } from '../../data/quizData'
import { storage } from '../../utils/storage'
import { useAuth } from '../../context/AuthContext'

const EXAMS = [
  { key: 'jee-mains', label: 'JEE Mains', icon: 'analytics', desc: '10 Questions • 5 Minutes', color: '#a68cff' },
  { key: 'jee-advanced', label: 'JEE Advanced', icon: 'star', desc: '10 Questions • 5 Minutes', color: '#a68cff' },
  { key: 'neet', label: 'NEET', icon: 'biotech', desc: '10 Questions • 5 Minutes', color: '#00e475' },
]

export default function QuizPage() {
  const { saveQuizScore, updateStreak } = useAuth()
  const [screen, setScreen] = useState('select') // 'select' | 'quiz' | 'results'
  const [selectedExam, setSelectedExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timer, setTimer] = useState(30)
  const [showAnswer, setShowAnswer] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const timerAutoAdvanced = useRef(false)

  // Timer countdown
  useEffect(() => {
    if (screen !== 'quiz' || showAnswer) return
    if (timer <= 0) {
      // Prevent double-fire: only auto-advance once per question
      if (!timerAutoAdvanced.current) {
        timerAutoAdvanced.current = true
        handleNext()
      }
      return
    }
    const interval = setInterval(() => setTimer(t => t - 1), 1000)
    return () => clearInterval(interval)
  }, [screen, timer, showAnswer])

  const startQuiz = (examKey) => {
    setSelectedExam(examKey)
    setQuestions(getQuizBySubject(examKey))
    setCurrentQ(0)
    setAnswers({})
    setTimer(30)
    setShowAnswer(false)
    timerAutoAdvanced.current = false
    setStartTime(Date.now())
    setScreen('quiz')
  }

  const handleAnswer = (optionIndex) => {
    if (showAnswer) return
    setAnswers(prev => ({ ...prev, [currentQ]: optionIndex }))
    setShowAnswer(true)
  }

  const handleNext = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
      setTimer(30)
      setShowAnswer(false)
      timerAutoAdvanced.current = false
    } else {
      // Quiz complete — calculate score
      const finalAnswers = { ...answers }
      const score = Object.entries(finalAnswers).filter(([q, a]) => questions[parseInt(q)]?.answer === a).length
      const timeTaken = Math.round((Date.now() - startTime) / 1000)

      // Save to localStorage
      storage.addQuizResult({
        subject: selectedExam,
        score,
        total: questions.length,
        timeTaken,
      })
      storage.markStudiedToday()

      // Save to Firestore
      const scoreData = {
        subject: selectedExam,
        score,
        total: questions.length,
        timeTaken,
        date: new Date().toISOString(),
      }
      saveQuizScore(scoreData).catch(() => {})
      updateStreak().catch(() => {})

      setScreen('results')
    }
  }, [currentQ, questions, answers, startTime, selectedExam, saveQuizScore, updateStreak])

  const score = Object.entries(answers).filter(([q, a]) => questions[parseInt(q)]?.answer === a).length
  const totalTime = startTime ? Math.round((Date.now() - startTime) / 1000) : 0
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0

  // SVG timer circle
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const timerOffset = circumference - (timer / 30) * circumference

  // Score ring
  const scoreOffset = circumference - (pct / 100) * circumference

  if (screen === 'select') {
    return (
      <div className="px-4 md:px-8 lg:px-16 py-8">
        <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface mb-2">Quiz Challenge</h1>
        <p className="text-on-surface-variant mb-8">Select an exam to begin your assessment</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
          {EXAMS.map(exam => (
            <button
              key={exam.key}
              onClick={() => startQuiz(exam.key)}
              className="group relative bg-surface-container border border-outline-variant/20 rounded-2xl p-6 text-left hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all overflow-hidden card-interactive animate-zoom-in"
            >
              <span className="material-symbols-outlined absolute top-4 right-4 text-6xl opacity-10" style={{ color: exam.color }}>{exam.icon}</span>
              <div className="relative">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${exam.color}15` }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: exam.color }}>{exam.icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-1">{exam.label}</h3>
                <p className="text-on-surface-variant text-sm mb-4">{exam.desc}</p>
                <span className="text-primary text-sm font-medium flex items-center gap-1">
                  Start <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (screen === 'results') {
    return (
      <div className="px-4 md:px-8 lg:px-16 py-8 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">Assessment Complete</span>

          {/* Confetti for high score */}
          {score >= 7 && Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${10 + Math.random() * 80}%`,
              backgroundColor: ['#a68cff', '#00e475', '#ff6b9d', '#ffd700', '#00bcd4'][i % 5],
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}

          {/* Score Ring */}
          <div className="relative w-40 h-40 mx-auto mb-4 animate-zoom-bounce">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" className="stroke-surface-container-high" strokeWidth="6" />
              <circle cx="50" cy="50" r={radius} fill="none" className="stroke-primary" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-3xl font-extrabold text-on-surface">{pct}%</span>
              <span className="text-on-surface-variant text-xs">Score</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="font-headline text-lg font-bold text-secondary">{score}/{questions.length}</p>
              <p className="text-on-surface-variant text-xs">Correct</p>
            </div>
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="font-headline text-lg font-bold text-error">{questions.length - score}/{questions.length}</p>
              <p className="text-on-surface-variant text-xs">Wrong</p>
            </div>
            <div className="bg-surface-container rounded-xl p-3 text-center">
              <p className="font-headline text-lg font-bold text-tertiary">{totalTime}s</p>
              <p className="text-on-surface-variant text-xs">Time</p>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="space-y-3 mb-8">
          {questions.map((q, i) => {
            const userAnswer = answers[i]
            const isCorrect = userAnswer === q.answer
            return (
              <div key={i} className={`bg-surface-container border rounded-xl p-4 ${isCorrect ? 'border-secondary/30' : 'border-error/30'}`}>
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined text-lg mt-0.5 ${isCorrect ? 'text-secondary' : 'text-error'}`}>
                    {isCorrect ? 'check_circle' : 'cancel'}
                  </span>
                  <div className="flex-1">
                    <p className="text-on-surface text-sm font-medium mb-1">Q{i + 1}: {q.q}</p>
                    <p className="text-on-surface-variant text-xs">Your answer: {q.options[userAnswer] || 'Skipped'} {!isCorrect && `• Correct: ${q.options[q.answer]}`}</p>
                    <p className="text-outline text-xs mt-1">{q.explanation}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={() => startQuiz(selectedExam)} className="flex-1 gradient-primary text-white font-headline font-bold py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform">
            Try Again
          </button>
          <button onClick={() => setScreen('select')} className="flex-1 bg-surface-container-highest text-on-surface font-headline font-bold py-3.5 rounded-full hover:bg-surface-bright transition-colors">
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  // Quiz Screen
  const q = questions[currentQ]
  if (!q) return null

  return (
    <div className="px-4 md:px-8 lg:px-16 py-8">
      <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Main Quiz Area */}
        <div className="flex-1">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Question {currentQ + 1} of {questions.length}
            </span>
            <span className="text-on-surface-variant text-sm">{subjectLabels[selectedExam]}</span>
          </div>

          {/* Timer */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" className="stroke-surface-container-high" strokeWidth="5" />
                <circle cx="50" cy="50" r={radius} fill="none"
                  className={`${timer > 10 ? 'stroke-primary' : 'stroke-error'}`}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={timerOffset}
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-headline text-2xl font-bold ${timer > 10 ? 'text-on-surface' : 'text-error'}`}>{timer}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-container-high rounded-full h-1.5 mb-8">
            <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
          </div>

          {/* Question */}
          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-6 md:p-8 mb-6">
            <h2 className="font-headline text-xl md:text-2xl font-bold text-on-surface">{q.q}</h2>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {q.options.map((option, i) => {
              const isSelected = answers[currentQ] === i
              const isCorrect = q.answer === i
              const showResult = showAnswer

              let classes = 'bg-surface-container-high border border-outline-variant/30 text-on-surface hover:bg-surface-bright'
              if (showResult && isCorrect) classes = 'bg-secondary/10 border-secondary/50 text-secondary ring-2 ring-secondary/30'
              else if (showResult && isSelected && !isCorrect) classes = 'bg-error/10 border-error/50 text-error ring-2 ring-error/30'

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={showAnswer}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${classes} ${showResult && isCorrect ? 'animate-option-correct' : ''} ${showResult && isSelected && !isCorrect ? 'animate-option-wrong' : ''}`}
                >
                  <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-medium flex-1">{option}</span>
                  {showResult && isCorrect && <span className="material-symbols-outlined text-secondary">check_circle</span>}
                  {showResult && isSelected && !isCorrect && <span className="material-symbols-outlined text-error">cancel</span>}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showAnswer && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 animate-slide-up">
              <p className="text-on-surface-variant text-sm"><span className="text-primary font-medium">Explanation:</span> {q.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => { if (currentQ > 0) { setCurrentQ(currentQ - 1); setShowAnswer(true) } }}
              disabled={currentQ === 0}
              className="px-6 py-3 rounded-full bg-surface-container-highest text-on-surface font-medium text-sm hover:bg-surface-bright transition-colors disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-full gradient-primary text-white font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {currentQ === questions.length - 1 ? 'Finish Quiz' : 'Next Question →'}
            </button>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 space-y-4">
          <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5">
            <h4 className="font-headline text-sm font-bold text-on-surface mb-3">Performance Insights</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Avg. Time</span>
                <span className="text-on-surface font-medium">{30 - timer}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Accuracy</span>
                <span className="text-on-surface font-medium">{currentQ > 0 ? Math.round((score / currentQ) * 100) : 0}%</span>
              </div>
            </div>
          </div>
          <div className="gradient-primary rounded-2xl p-5">
            <span className="material-symbols-outlined text-white/80 text-2xl mb-2 block">psychology</span>
            <h4 className="text-white font-headline font-bold text-sm mb-1">Focus Mode Active</h4>
            <p className="text-white/60 text-xs">Stay concentrated for best results</p>
          </div>
        </div>
      </div>
    </div>
  )
}
