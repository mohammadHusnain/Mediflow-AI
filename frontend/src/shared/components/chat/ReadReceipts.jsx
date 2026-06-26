/* src/shared/components/chat/ReadReceipts.jsx - WhatsApp-style message delivery marks. */
import { Check, Clock } from 'lucide-react'

function DoubleCheck({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="10"
      viewBox="0 0 16 10"
      width="16"
    >
      <path
        d="M1 5.2 3.6 8 9.2 1.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="m7 6.8 1.2 1.2 6-6.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

export function ReadReceipts({ status = 'sent' }) {
  if (status === 'sending') {
    return <Clock aria-hidden="true" className="h-2.5 w-2.5 text-white/55" />
  }

  if (status === 'failed') {
    return (
      <span className="font-sans text-[10px] font-semibold text-rose-600">
        Failed
      </span>
    )
  }

  if (status === 'sent') {
    return <Check aria-hidden="true" className="h-2.5 w-2.5 text-white/65" />
  }

  return (
    <DoubleCheck
      className={
        status === 'read'
          ? 'h-2.5 w-4 text-brand-light'
          : 'h-2.5 w-4 text-white/65'
      }
    />
  )
}

export default ReadReceipts
