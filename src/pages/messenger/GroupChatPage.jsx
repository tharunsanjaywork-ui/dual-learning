import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'

export default function GroupChatPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [showInfo, setShowInfo] = useState(false)
  const [text, setText] = useState('')

  // Placeholder group data
  const group = {
    name: 'Study Group Alpha',
    icon: '📚',
    description: 'A focused study group for JEE preparation',
    members: [
      { id: '1', name: 'Alice', role: 'Admin', online: true },
      { id: '2', name: 'Bob', role: 'Member', online: true },
      { id: '3', name: 'Charlie', role: 'Member', online: false },
    ],
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/20 flex-shrink-0">
          <button onClick={() => navigate('/messenger/chats')} className="md:hidden p-1 -ml-1">
            <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
          </button>
          <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center text-lg">{group.icon}</div>
          <div className="flex-1 min-w-0">
            <button onClick={() => setShowInfo(!showInfo)} className="text-left">
              <h3 className="text-on-surface font-medium text-sm truncate">{group.name}</h3>
              <p className="text-secondary text-xs">{group.members.length} members • Active Session</p>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined text-xl">videocam</span>
            </button>
            <button className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined text-xl">call</span>
            </button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all hidden md:flex">
              <span className="material-symbols-outlined text-xl">info</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full gradient-secondary flex items-center justify-center text-2xl mb-4">{group.icon}</div>
            <h3 className="font-headline text-lg font-bold text-on-surface mb-1">{group.name}</h3>
            <p className="text-on-surface-variant text-sm mb-2">{group.description}</p>
            <p className="text-outline text-xs">Created by Admin • {group.members.length} members</p>
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/20 flex items-end gap-2 flex-shrink-0">
          <button className="p-2 rounded-xl text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-all">
            <span className="material-symbols-outlined text-xl">add_circle</span>
          </button>
          <div className="flex-1">
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." rows={1}
              className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-4 py-2.5 text-sm text-on-surface resize-none focus:border-secondary/50 transition-all" style={{ minHeight: '40px' }} />
          </div>
          <button className="p-2.5 rounded-xl bg-secondary text-on-secondary shadow-lg shadow-secondary/30">
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </div>
      </div>

      {/* Group Info Panel */}
      {showInfo && (
        <div className="w-80 border-l border-outline-variant/20 bg-surface-container-low overflow-y-auto hidden md:block animate-slide-up">
          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full gradient-secondary flex items-center justify-center text-3xl mb-3">{group.icon}</div>
              <h3 className="font-headline text-lg font-bold text-on-surface">{group.name}</h3>
              <p className="text-on-surface-variant text-sm text-center mt-1">{group.description}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="bg-surface-container rounded-xl p-3 text-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-secondary text-xl block mb-1">person_add</span>
                <span className="text-on-surface-variant text-xs">Add Member</span>
              </button>
              <button className="bg-surface-container rounded-xl p-3 text-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-secondary text-xl block mb-1">link</span>
                <span className="text-on-surface-variant text-xs">Invite Link</span>
              </button>
            </div>

            {/* Members */}
            <h4 className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-3">Members ({group.members.length})</h4>
            <div className="space-y-2">
              {group.members.map(member => (
                <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container transition-colors">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-base">person</span>
                    </div>
                    {member.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface-container-low" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface text-sm font-medium truncate">{member.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    member.role === 'Admin' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container-highest text-on-surface-variant'
                  }`}>{member.role}</span>
                </div>
              ))}
            </div>

            {/* Leave Group */}
            <button className="w-full mt-8 flex items-center justify-center gap-2 bg-error/10 text-error rounded-xl py-3 font-medium text-sm hover:bg-error/20 transition-colors">
              <span className="material-symbols-outlined text-lg">logout</span>Leave Group
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
