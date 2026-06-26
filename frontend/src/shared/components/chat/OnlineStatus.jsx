/* src/shared/components/chat/OnlineStatus.jsx - Small online or last-seen label. */
import { formatConvTime } from '@shared/lib/chatUtils'

export function OnlineStatus({ lastSeen, online = false }) {
  if (online) {
    return <span className="text-[11px] font-medium text-green-600">Online</span>
  }

  return (
    <span className="text-[11px] text-slate/60">
      {lastSeen ? `Last seen ${formatConvTime(lastSeen)}` : 'Offline'}
    </span>
  )
}

export default OnlineStatus
