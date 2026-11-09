export function formatDateSeparator(date) {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : new Date(date)
  const now = new Date()
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'long' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

export default function DateSeparator({ date }) {
  const label = formatDateSeparator(date)
  if (!label) return null

  return (
    <div className="flex justify-center my-3 select-none">
      <span className="text-[11px] font-medium text-on-surface-variant/90 bg-surface-container-high/90 px-3.5 py-1 rounded-full border border-outline-variant/30 shadow-sm backdrop-blur-md">
        {label}
      </span>
    </div>
  )
}

