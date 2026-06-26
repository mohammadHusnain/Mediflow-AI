/* src/shared/lib/chatUtils.js - Message formatting and chat helpers. */
export const convKey = {
  dm: (userId) => `dm_${userId}`,
  group: (groupId) => `group_${groupId}`,
  ai: () => 'ai',
}

export function formatMessageTime(isoString) {
  if (!isoString) return ''

  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatConvTime(isoString) {
  if (!isoString) return ''

  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const today = new Date()
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  )

  if (diffDays === 0) return formatMessageTime(isoString)
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateSeparator(isoString) {
  if (!isoString) return ''

  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: today.getFullYear() === date.getFullYear() ? undefined : 'numeric',
  })
}

export function groupMessages(messages = []) {
  return messages.map((message, index) => {
    const previous = messages[index - 1]
    const currentTime = new Date(message.created_at).getTime()
    const previousTime = new Date(previous?.created_at).getTime()

    return {
      ...message,
      isGrouped:
        index > 0 &&
        previous?.sender_id === message.sender_id &&
        Number.isFinite(currentTime) &&
        Number.isFinite(previousTime) &&
        currentTime - previousTime < 60_000,
    }
  })
}

export function normalizeChatList(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.results)) {
    return response.results
  }

  return []
}

export function normalizeMessagePage(response) {
  const results = normalizeChatList(response)

  return {
    count: Number.isFinite(Number(response?.count)) ? Number(response.count) : results.length,
    next: response?.next || null,
    previous: response?.previous || null,
    results,
  }
}

export function getChatUserId(user) {
  return user?.user_id ?? user?.id ?? user?.pk ?? user?.uuid
}

export function getChatName(entity, fallback = 'MediFlow User') {
  if (!entity) return fallback

  return (
    String(entity.full_name || '').trim() ||
    [entity.first_name, entity.last_name].filter(Boolean).join(' ') ||
    entity.user_name ||
    entity.sender_name ||
    entity.name ||
    entity.username ||
    entity.email ||
    fallback
  )
}

export function getMessageTimestamp(message) {
  return message?.created_at || message?.timestamp || message?.sent_at || ''
}

export function getMessageText(message) {
  if (message?.attachment || message?.file || message?.image) {
    return '[attachment]'
  }

  return String(message?.content || message?.message || '')
}

export function isSameDate(a, b) {
  if (!a || !b) return false

  const first = new Date(a)
  const second = new Date(b)

  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) {
    return false
  }

  return first.toDateString() === second.toDateString()
}

export function makeTempMessage({ content, conversation, sender }) {
  return {
    id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    client_id: crypto.randomUUID?.() || `client_${Date.now()}`,
    content,
    conversation,
    created_at: new Date().toISOString(),
    is_read: false,
    sender_id: getChatUserId(sender),
    sender_name: getChatName(sender),
    status: 'sending',
  }
}

export function getConversationParts(key = '') {
  const [type, id] = String(key).split('_')

  return { id, type }
}
