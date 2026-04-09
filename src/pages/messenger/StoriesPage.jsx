import { useState } from 'react'

const STORY_REACTIONS = ['🔥', '🙌', '😍', '😂', '😮', '😢', '👏']

export default function StoriesPage() {
  const [viewingStory, setViewingStory] = useState(null)
  const [replyText, setReplyText] = useState('')

  // Placeholder stories
  const stories = [
    { id: 1, user: 'Alice', viewed: false },
    { id: 2, user: 'Bob', viewed: false },
    { id: 3, user: 'Charlie', viewed: true },
  ]

  if (viewingStory) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
              {i === 1 && <div className="h-full bg-white rounded-full animate-progress" />}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-secondary to-tertiary p-0.5">
            <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
              <span className="material-symbols-outlined text-outline text-sm">person</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{viewingStory.user}</p>
            <p className="text-white/50 text-xs">2h ago</p>
          </div>
          <button className="p-2 text-white/70 hover:text-white">
            <span className="material-symbols-outlined text-xl">more_vert</span>
          </button>
          <button onClick={() => setViewingStory(null)} className="p-2 text-white/70 hover:text-white">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Story Content */}
        <div className="flex-1 flex items-center justify-center px-4 relative">
          <div className="w-full max-w-lg aspect-[9/16] bg-gradient-to-br from-primary-container to-primary-dim rounded-xl flex items-center justify-center">
            <p className="text-white text-2xl font-headline font-bold italic text-center px-8">
              "Stay focused, stay hungry. The results will come." ✨
            </p>
          </div>

          {/* Left/Right tap zones */}
          <div className="absolute left-0 top-0 w-1/2 h-full cursor-pointer" onClick={() => {}} />
          <div className="absolute right-0 top-0 w-1/2 h-full cursor-pointer" onClick={() => {}} />
        </div>

        {/* Bottom */}
        <div className="px-4 py-4">
          {/* Seen by */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-white/50 text-xs">Seen by 12</span>
          </div>

          {/* Reply */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Reply to story..."
              className="flex-1 bg-white/10 rounded-full px-5 py-2.5 text-white text-sm placeholder-white/40 focus:bg-white/15 transition-colors"
            />
            <div className="flex gap-1">
              {STORY_REACTIONS.slice(0, 4).map(em => (
                <button key={em} className="text-xl hover:scale-125 transition-transform">{em}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface mb-6">Stories</h1>

      {/* Your Story */}
      <div className="bg-surface-container border border-outline-variant/20 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-secondary/50 flex items-center justify-center cursor-pointer hover:border-secondary transition-colors">
            <span className="material-symbols-outlined text-secondary text-2xl">add</span>
          </div>
          <div>
            <h3 className="text-on-surface font-medium">Create Your Story</h3>
            <p className="text-on-surface-variant text-sm">Share a photo, video, or thought</p>
          </div>
        </div>
      </div>

      {/* Recent Stories */}
      <h3 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-4">Recent Stories</h3>
      <div className="space-y-2">
        {stories.map(story => (
          <button
            key={story.id}
            onClick={() => setViewingStory(story)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-container-high/50 transition-colors text-left"
          >
            <div className={`w-14 h-14 rounded-full p-0.5 ${story.viewed ? 'border-2 border-outline/30' : 'bg-gradient-to-r from-secondary to-tertiary'}`}>
              <div className={`w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center ${story.viewed ? 'opacity-60' : ''}`}>
                <span className="material-symbols-outlined text-outline text-xl">person</span>
              </div>
            </div>
            <div>
              <p className={`font-medium text-sm ${story.viewed ? 'text-on-surface-variant' : 'text-on-surface'}`}>{story.user}</p>
              <p className="text-on-surface-variant text-xs">2h ago</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
