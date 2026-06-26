/* src/shared/components/chat/FloatingChatButton.jsx - Global chat launcher. */
import { MessageSquare } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import UnreadBadge from './UnreadBadge'
import { useChatContext } from '@shared/context/ChatContext'

const HIDDEN_ROUTES = new Set(['/login', '/change-password'])

export function FloatingChatButton() {
  const location = useLocation()
  const { isOpen, lastMessagePulse, openChat, totalUnread } = useChatContext()
  const hidden = HIDDEN_ROUTES.has(location.pathname)
  const showPulse = Boolean(lastMessagePulse && !isOpen)

  if (hidden || isOpen) {
    return null
  }

  return (
    <button
      className="fixed bottom-4 right-4 z-[999] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-[0_4px_24px_rgba(67,56,202,0.4)] transition-all duration-200 hover:bg-brandDark active:scale-95 sm:bottom-6 sm:right-6"
      onClick={() => openChat()}
      type="button"
    >
      <span className="sr-only">Open MediFlow chat</span>
      {showPulse ? (
        <span
          className="absolute inset-0 animate-ping rounded-full bg-brand/30"
          key={lastMessagePulse}
          style={{ animationFillMode: 'forwards', animationIterationCount: 3 }}
        />
      ) : null}
      <MessageSquare
        aria-hidden="true"
        className="relative h-[22px] w-[22px] transition-transform duration-200 hover:rotate-6"
      />
      <UnreadBadge className="absolute -right-1 -top-1" count={totalUnread} />
    </button>
  )
}

export default FloatingChatButton
