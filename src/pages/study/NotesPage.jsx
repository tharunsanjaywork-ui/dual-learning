import { useState } from 'react'

const NOTES = [
  { title: 'Physics Formula Sheet', topic: 'Physics', desc: 'All important formulas for Mechanics, Electromagnetism, Optics and Modern Physics.', size: '3.2 MB' },
  { title: 'Organic Chemistry Reactions', topic: 'Chemistry', desc: 'Complete named reactions, mechanisms and reagents list.', size: '4.1 MB' },
  { title: 'Calculus Quick Revision', topic: 'Mathematics', desc: 'Limits, derivatives, integrals, and differential equations in one document.', size: '2.8 MB' },
  { title: 'Biology NCERT Summary', topic: 'Biology', desc: 'Chapter-wise NCERT summary for NEET Biology preparation.', size: '5.6 MB' },
  { title: 'Inorganic Chemistry Notes', topic: 'Chemistry', desc: 'Periodic table trends, chemical bonding, and coordination compounds.', size: '3.5 MB' },
  { title: 'Trigonometry Handbook', topic: 'Mathematics', desc: 'All identities, graphs, and inverse trigonometric functions.', size: '1.9 MB' },
  { title: 'Modern Physics Notes', topic: 'Physics', desc: 'Photoelectric effect, atomic models, nuclear physics, and semiconductors.', size: '2.4 MB' },
  { title: 'Genetics & Evolution', topic: 'Biology', desc: 'Mendel\'s laws, molecular basis of inheritance, and evolution theories.', size: '3.7 MB' },
  { title: 'Vector Algebra & 3D Geometry', topic: 'Mathematics', desc: 'Vectors, planes, lines in 3D space with solved examples.', size: '2.1 MB' },
]

const FORMULA_SHEETS = [
  { title: 'JEE Mains Formula Card', subject: 'JEE', pages: 24 },
  { title: 'NEET Biology Diagrams', subject: 'NEET', pages: 36 },
  { title: 'Chemistry Periodic Table+', subject: 'Chemistry', pages: 8 },
]

const FILTERS = ['All Topics', 'Mathematics', 'Chemistry', 'Biology', 'Physics']

export default function NotesPage() {
  const [activeFilter, setActiveFilter] = useState('All Topics')
  const [downloading, setDownloading] = useState(null)
  const filtered = activeFilter === 'All Topics' ? NOTES : NOTES.filter(n => n.topic === activeFilter)

  const handleDownload = (item) => {
    setDownloading(item.title)
    const content = `FOCUS SANCTUARY — STUDY REVISION NOTES\n\nTitle: ${item.title}\nSubject: ${item.topic || item.subject}\n\nSummary:\n${item.desc || 'Comprehensive revision sheet covering key concepts, standard formulas and derivation steps.'}\n\nKey Concepts:\n1. Core definitions and fundamental postulates.\n2. Dimensional analysis, units and equations.\n3. Standard practice techniques and past year questions.\n\nFocus Sanctuary • Study Sanctuary`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.title.replace(/\s+/g, '_')}_Notes.txt`
    a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => setDownloading(null), 1000)
  }

  return (
    <div className="px-4 md:px-8 lg:px-16 py-8 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface">Study Notes</h1>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeFilter === f
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {filtered.map((note, i) => (
          <div key={i} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined filled text-error text-xl">picture_as_pdf</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{note.topic}</span>
            </div>
            <h3 className="text-on-surface font-medium mb-1 group-hover:text-primary transition-colors">{note.title}</h3>
            <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">{note.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-outline text-xs">{note.size}</span>
              <button
                type="button"
                onClick={() => handleDownload(note)}
                className="flex items-center gap-1.5 text-primary text-sm font-medium border border-primary/30 rounded-full px-4 py-1.5 hover:bg-primary/10 transition-colors active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {downloading === note.title ? 'check' : 'download'}
                </span>
                <span>{downloading === note.title ? 'Saved' : 'Download Note'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Formula Sheets */}
      <h2 className="font-headline text-2xl font-bold text-on-surface mb-5">Formula Sheets</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FORMULA_SHEETS.map((sheet, i) => (
          <div key={i} className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-secondary text-2xl">note_alt</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-on-surface font-medium text-sm truncate">{sheet.title}</h4>
              <p className="text-on-surface-variant text-xs">{sheet.pages} pages • {sheet.subject}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(sheet)}
              className="flex items-center gap-1 bg-secondary text-on-secondary px-3.5 py-2 rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-transform flex-shrink-0 cursor-pointer shadow-md shadow-secondary/20"
              aria-label="Download sheet"
            >
              <span className="material-symbols-outlined text-sm">download</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
