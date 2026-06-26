/* src/shared/components/chat/ChatOverlay.jsx - Global floating chat panel. */
import { X } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import ChatTabBar from './ChatTabBar'
import AITab from './tabs/AITab'
import GroupsTab from './tabs/GroupsTab'
import UsersTab from './tabs/UsersTab'
import { useChatContext } from '@shared/context/ChatContext'

const HIDDEN_ROUTES = new Set(['/login', '/change-password'])

export function ChatOverlay() {
  const location = useLocation()
  const { activeTab, closeChat, isOpen } = useChatContext()
  const hidden = HIDDEN_ROUTES.has(location.pathname)

  if (hidden) {
    return null
  }

  return (
    <section
      aria-label="MediFlow chat"
      className={[
        'fixed bottom-4 right-3 z-[998] h-[min(580px,calc(100vh-32px))] w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_8px_48px_rgba(20,24,31,0.18)] transition-all duration-200 sm:bottom-6 sm:right-6',
        isOpen
          ? 'translate-y-0 scale-100 opacity-100 pointer-events-auto'
          : 'translate-y-3 scale-95 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="flex h-full flex-col">
        <header className="flex h-[52px] shrink-0 items-center justify-between bg-brand px-4">
          <h2 className="text-[15px] font-semibold text-white">MediFlow Chat</h2>
          <button
            className="rounded-lg p-1.5 text-white transition-colors hover:bg-white/10"
            onClick={closeChat}
            type="button"
          >
            <span className="sr-only">Close chat</span>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        <ChatTabBar />
        <div className="relative flex-1 overflow-hidden">
          <div className={activeTab === 'users' ? 'h-full' : 'hidden h-full'}>
            <UsersTab />
          </div>
          <div className={activeTab === 'groups' ? 'h-full' : 'hidden h-full'}>
            <GroupsTab />
          </div>
          <div className={activeTab === 'ai' ? 'h-full' : 'hidden h-full'}>
            <AITab key={isOpen ? 'open' : 'closed'} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default ChatOverlay
