/* src/shared/components/chat/ChatTabBar.jsx - Overlay tab selector. */
import { Bot } from 'lucide-react'

import { useChatContext } from '@shared/context/ChatContext'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'groups', label: 'Groups' },
  { icon: Bot, id: 'ai', label: 'AI' },
]

export function ChatTabBar() {
  const { activeTab, setActiveTab } = useChatContext()

  return (
    <div className="flex h-11 shrink-0 border-t border-white/10 bg-brand/90">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id

        return (
          <button
            className={[
              'flex h-full flex-1 items-center justify-center text-[13px] font-medium transition-all duration-150',
              active
                ? 'border-b-2 border-white bg-white/15 font-semibold text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white/90',
            ].join(' ')}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {Icon ? <Icon aria-hidden="true" className="mr-1 h-3.5 w-3.5" /> : null}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default ChatTabBar
