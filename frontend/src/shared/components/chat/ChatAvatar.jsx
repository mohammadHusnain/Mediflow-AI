/* src/shared/components/chat/ChatAvatar.jsx - Chat-specific avatar with context online state. */
import { getAvatarColor, getInitials } from '@shared/lib/avatarColor'
import { getChatName, getChatUserId } from '@shared/lib/chatUtils'
import { useChatContext } from '@shared/context/ChatContext'

const SIZES = {
  lg: 'h-11 w-11 text-sm',
  md: 'h-9 w-9 text-[13px]',
  sm: 'h-7 w-7 text-[11px]',
}

export function ChatAvatar({ className = '', showOnline = false, size = 'md', user }) {
  const { onlineUsers } = useChatContext()
  const name = getChatName(user)
  const userId = getChatUserId(user)
  const isOnline =
    showOnline && userId !== undefined && onlineUsers.has(String(userId))

  return (
    <span className={['relative inline-flex shrink-0', className].join(' ')}>
      <span
        className={[
          'flex items-center justify-center rounded-full font-sans font-medium text-white',
          SIZES[size] || SIZES.md,
        ].join(' ')}
        style={{ backgroundColor: getAvatarColor(name) }}
        title={name}
      >
        {getInitials(name)}
      </span>
      {isOnline ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-canvas" />
      ) : null}
    </span>
  )
}

export default ChatAvatar
