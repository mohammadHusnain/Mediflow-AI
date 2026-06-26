/* src/shared/components/chat/MessageBubble.jsx - Shared DM, group, and AI message bubble. */
import ChatAvatar from './ChatAvatar'
import ReadReceipts from './ReadReceipts'
import { formatMessageTime, getMessageText, getMessageTimestamp } from '@shared/lib/chatUtils'

function highlightText(text, query) {
  if (!query?.trim()) {
    return text
  }

  const pattern = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${pattern})`, 'ig')

  return text.split(regex).map((part, index) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark className="rounded bg-amber-200 px-0.5 text-ink" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function MessageBubble({
  avatar,
  highlight = '',
  isSelf = false,
  message,
  onRetry,
  retryable = true,
  sender,
  showAvatar = true,
  showSenderName = false,
}) {
  const text = getMessageText(message)
  const failed = message?.status === 'failed'
  const canRetry = failed && retryable && isSelf
  const bubbleClass = failed
    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    : isSelf
      ? 'bg-brand text-white'
      : 'bg-mist text-slate-900'

  return (
    <div
      className={[
        'flex gap-2',
        isSelf ? 'justify-end' : 'justify-start',
        message?.isGrouped ? 'mt-0.5' : 'mt-2',
      ].join(' ')}
    >
      {!isSelf ? (
        <div className="w-7 shrink-0">
          {showAvatar && !message?.isGrouped ? avatar || <ChatAvatar size="sm" user={sender || message} /> : null}
        </div>
      ) : null}
      <div
        className={[
          'flex max-w-[85%] flex-col sm:max-w-[72%]',
          isSelf ? 'items-end' : 'items-start',
        ].join(' ')}
      >
        {showSenderName && !isSelf && !message?.isGrouped ? (
          <p className="mb-0.5 px-1 text-[11px] font-medium text-brand">
            {message?.sender_name || 'MediFlow User'}
          </p>
        ) : null}
        <button
          className={[
            'rounded-[18px] px-4 py-2 text-left text-[14px] font-normal leading-5 outline-none transition',
            isSelf ? 'rounded-br-[4px]' : 'rounded-bl-[4px]',
            canRetry ? 'cursor-pointer hover:bg-rose-100' : 'cursor-default',
            bubbleClass,
          ].join(' ')}
          disabled={!canRetry}
          onClick={() => canRetry && onRetry?.(message)}
          type="button"
        >
          <span className="whitespace-pre-wrap break-words">
            {highlightText(text || '[attachment]', highlight)}
          </span>
        </button>
        <div
          className={[
            'mt-1 flex items-center gap-1 px-1 font-sans text-[10px]',
            isSelf && !failed ? 'text-white/70' : 'text-slate/60',
          ].join(' ')}
        >
          <span>{formatMessageTime(getMessageTimestamp(message))}</span>
          {isSelf ? <ReadReceipts status={message?.status} /> : null}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
