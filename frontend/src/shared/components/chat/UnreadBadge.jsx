/* src/shared/components/chat/UnreadBadge.jsx - Compact unread count pill. */
export function UnreadBadge({ className = '', count = 0 }) {
  const safeCount = Number(count || 0)

  if (safeCount <= 0) {
    return null
  }

  return (
    <span
      className={[
        'flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 font-sans text-[10px] font-bold leading-none text-white',
        className,
      ].join(' ')}
    >
      {safeCount > 99 ? '99+' : safeCount}
    </span>
  )
}

export default UnreadBadge
