import { AlertTriangle, MessageCircle, RefreshCw } from 'lucide-react'

function formatTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function statusLabel(status = '') {
  return String(status || '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function MessageBubble({ message = {}, onRetry }) {
  const outbound = message.direction === 'outbound'
  const failed = message.delivery_status === 'failed'
  const critical = Boolean(message.is_critical_flag)
  const bubbleClass = outbound
    ? 'bg-brand text-white rounded-[18px] rounded-br-[4px]'
    : 'bg-mist text-slate-900 rounded-[18px] rounded-bl-[4px]'

  return (
    <div className={`flex py-1 ${outbound ? 'justify-end' : 'justify-start'}`}>
      <button
        className={[
          'max-w-[86%] text-left sm:max-w-[72%]',
          failed && onRetry ? 'cursor-pointer' : 'cursor-default',
        ].join(' ')}
        onClick={() => {
          if (failed && onRetry) {
            onRetry(message)
          }
        }}
        type="button"
      >
        <div
          className={[
            'relative break-words px-4 py-2 text-[14px] leading-5 shadow-sm',
            bubbleClass,
            critical ? 'border-l-[3px] border-rose-500' : '',
          ].join(' ')}
        >
          {outbound ? (
            <span className="absolute -right-1 -top-2 inline-flex items-center gap-1 rounded-full bg-canvas px-1.5 py-0.5 text-[9px] font-semibold text-[#075E54] shadow-sm">
              <MessageCircle aria-hidden="true" className="h-2.5 w-2.5" />
              WhatsApp
            </span>
          ) : null}
          <p className="whitespace-pre-wrap">
            {critical ? (
              <AlertTriangle
                aria-hidden="true"
                className="mr-1.5 inline h-3.5 w-3.5 text-rose-500"
              />
            ) : null}
            {message.content || ''}
          </p>
          {failed ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-100">
              <RefreshCw aria-hidden="true" className="h-3 w-3" />
              Failed. Tap to retry.
            </p>
          ) : null}
        </div>
        <div
          className={[
            'mt-1 flex flex-wrap items-center gap-1 font-mono text-[10px]',
            outbound ? 'justify-end text-slate/60' : 'justify-start text-slate/50',
          ].join(' ')}
        >
          <span>{formatTime(message.sent_at)}</span>
          {outbound ? (
            <>
              <span>-</span>
              <span className={failed ? 'text-rose-500' : ''}>
                {statusLabel(message.delivery_status)}
              </span>
            </>
          ) : null}
        </div>
      </button>
    </div>
  )
}

export default MessageBubble
