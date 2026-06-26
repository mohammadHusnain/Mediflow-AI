/* eslint-disable react-refresh/only-export-components -- src/shared/context/ChatContext.jsx - Global chat state and realtime routing. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useToast } from '@shared/components/Toast'
import { useAuth } from '@shared/context/AuthContext'
import { filterDMableUsers } from '@shared/lib/chatRbac'
import {
  convKey,
  getChatName,
  getChatUserId,
  getConversationParts,
  getMessageText,
  makeTempMessage,
  normalizeChatList,
  normalizeMessagePage,
} from '@shared/lib/chatUtils'
import { getBackendError } from '@shared/lib/records'
import { PUBLIC_ROUTES_FOR_TESTING } from '@shared/lib/testingAccess'
import useWebSocket from '@shared/hooks/useWebSocket'
import {
  createGroup as createGroupRequest,
  getChatUsers,
  getChatWsUrl,
  getConversations,
  getDMHistory,
  getGroupMessages,
  getMyGroups,
} from '@shared/services/chatApi'

const ChatContext = createContext(null)
const EMPTY_ACTIVE_CONVERSATION = { data: null, id: null, type: null }
const TYPING_TIMEOUT_MS = 3000

function getAccessToken() {
  return localStorage.getItem('access_token') || localStorage.getItem('access') || ''
}

function mapSum(map) {
  return [...map.values()].reduce((sum, value) => sum + Number(value || 0), 0)
}

function setMapValue(map, key, value) {
  const next = new Map(map)

  if (value === undefined || value === null || value === 0) {
    next.delete(key)
  } else {
    next.set(key, value)
  }

  return next
}

function normalizeMessage(message = {}, conversation) {
  return {
    ...message,
    content: getMessageText(message),
    conversation: message.conversation || conversation,
    created_at: message.created_at || message.timestamp || message.sent_at || new Date().toISOString(),
    sender_id: message.sender_id ?? message.sender?.id ?? message.sender,
    sender_name: message.sender_name || getChatName(message.sender, 'MediFlow User'),
    status: message.status || (message.is_read ? 'read' : 'sent'),
  }
}

function normalizeConversationMap(conversations = []) {
  return normalizeChatList(conversations).reduce((map, conversation) => {
    const userId = conversation.user_id ?? conversation.id

    if (userId !== undefined && userId !== null) {
      map.set(String(userId), conversation)
    }

    return map
  }, new Map())
}

function getInitialUnread(conversations = [], groups = []) {
  const unread = new Map()

  normalizeChatList(conversations).forEach((conversation) => {
    const userId = conversation.user_id ?? conversation.id
    const count = Number(conversation.unread_count || 0)

    if (userId !== undefined && count > 0) {
      unread.set(convKey.dm(userId), count)
    }
  })

  normalizeChatList(groups).forEach((group) => {
    const count = Number(group.unread_count || 0)

    if (group.id !== undefined && count > 0) {
      unread.set(convKey.group(group.id), count)
    }
  })

  return unread
}

function getInitialOnlineUsers(users = [], conversations = []) {
  const online = new Set()

  normalizeChatList(users).forEach((user) => {
    if (user.is_online) {
      online.add(String(getChatUserId(user)))
    }
  })

  normalizeChatList(conversations).forEach((conversation) => {
    const userId = conversation.user_id ?? conversation.id

    if (conversation.is_online && userId !== undefined) {
      online.add(String(userId))
    }
  })

  return online
}

export function ChatProvider({ children }) {
  const toast = useToast()
  const { role, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [activeConversation, setActiveConversation] = useState(
    EMPTY_ACTIVE_CONVERSATION,
  )
  const [chatUsers, setChatUsers] = useState([])
  const [conversations, setConversations] = useState(new Map())
  const [groups, setGroups] = useState([])
  const [messages, setMessages] = useState(new Map())
  const [hasMoreMessages, setHasMoreMessages] = useState(new Map())
  const [messagePages, setMessagePages] = useState(new Map())
  const [loadingMessages, setLoadingMessages] = useState(new Set())
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [typingUsers, setTypingUsers] = useState(new Map())
  const [unreadCounts, setUnreadCounts] = useState(new Map())
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const [bootstrapError, setBootstrapError] = useState('')
  const [lastMessagePulse, setLastMessagePulse] = useState(0)
  const typingTimers = useRef(new Map())
  const activeConversationRef = useRef(activeConversation)
  const isOpenRef = useRef(isOpen)

  const currentUser = useMemo(
    () => ({
      ...(user || {}),
      role: role?.slug || user?.role || '',
    }),
    [role, user],
  )
  const currentUserId = getChatUserId(currentUser)
  const canUseLiveChat = Boolean(
    user &&
      getAccessToken() &&
      !PUBLIC_ROUTES_FOR_TESTING,
  )
  const liveChatUnavailable = Boolean(user) && !canUseLiveChat
  const activeConversationKey =
    activeConversation.type && activeConversation.id
      ? activeConversation.type === 'group'
        ? convKey.group(activeConversation.id)
        : convKey.dm(activeConversation.id)
      : ''

  useEffect(() => {
    activeConversationRef.current = activeConversation
  }, [activeConversation])

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const updateConversationPreview = useCallback((conversation, message) => {
    const { id, type } = getConversationParts(conversation)

    if (type === 'dm') {
      setConversations((current) => {
        const next = new Map(current)
        const existing = next.get(String(id)) || {}

        next.set(String(id), {
          ...existing,
          last_message: message.content,
          last_message_time: message.created_at,
          user_id: id,
        })

        return next
      })
    }

    if (type === 'group') {
      setGroups((currentGroups) =>
        currentGroups.map((group) =>
          String(group.id) === String(id)
            ? {
                ...group,
                last_message: message.content,
                last_message_sender: message.sender_name,
                last_message_time: message.created_at,
              }
            : group,
        ),
      )
    }
  }, [])

  const appendMessage = useCallback(
    (conversation, incomingMessage, { countUnread = true } = {}) => {
      const message = normalizeMessage(incomingMessage, conversation)
      const isSelf = String(message.sender_id) === String(currentUserId)

      setMessages((current) => {
        const next = new Map(current)
        const list = next.get(conversation) || []
        const existingIndex = list.findIndex(
          (item) =>
            String(item.id) === String(message.id) &&
            !String(item.id).startsWith('tmp_'),
        )
        const optimisticIndex = list.findIndex(
          (item) =>
            String(item.id).startsWith('tmp_') &&
            item.status === 'sending' &&
            String(item.sender_id) === String(message.sender_id) &&
            item.content === message.content,
        )

        if (existingIndex >= 0) {
          next.set(
            conversation,
            list.map((item, index) =>
              index === existingIndex ? { ...item, ...message } : item,
            ),
          )
          return next
        }

        if (optimisticIndex >= 0) {
          next.set(
            conversation,
            list.map((item, index) =>
              index === optimisticIndex ? { ...item, ...message, status: message.status || 'sent' } : item,
            ),
          )
          return next
        }

        next.set(conversation, [...list, message])
        return next
      })

      updateConversationPreview(conversation, message)

      const active = activeConversationRef.current
      const activeKey =
        active?.type && active?.id
          ? active.type === 'group'
            ? convKey.group(active.id)
            : convKey.dm(active.id)
          : ''
      const shouldIncrementUnread =
        countUnread && !isSelf && (!isOpenRef.current || activeKey !== conversation)

      if (shouldIncrementUnread) {
        setUnreadCounts((current) =>
          setMapValue(current, conversation, Number(current.get(conversation) || 0) + 1),
        )
        setLastMessagePulse(Date.now())
      }
    },
    [currentUserId, updateConversationPreview],
  )

  const clearTypingUser = useCallback((conversation, userId) => {
    setTypingUsers((current) => {
      const next = new Map(current)
      const users = new Set(next.get(conversation) || [])

      users.delete(String(userId))

      if (users.size === 0) {
        next.delete(conversation)
      } else {
        next.set(conversation, users)
      }

      return next
    })
  }, [])

  const handleWsMessage = useCallback(
    (event) => {
      if (event?.type === 'message' || event?.type === 'group_message') {
        appendMessage(event.conversation, event.data)
        return
      }

      if (event?.type === 'typing') {
        const key = `${event.conversation}:${event.user_id}`

        window.clearTimeout(typingTimers.current.get(key))

        if (event.is_typing) {
          setTypingUsers((current) => {
            const next = new Map(current)
            const users = new Set(next.get(event.conversation) || [])

            users.add(String(event.user_id))
            next.set(event.conversation, users)

            return next
          })

          typingTimers.current.set(
            key,
            window.setTimeout(() => {
              clearTypingUser(event.conversation, event.user_id)
              typingTimers.current.delete(key)
            }, TYPING_TIMEOUT_MS),
          )
        } else {
          clearTypingUser(event.conversation, event.user_id)
          typingTimers.current.delete(key)
        }
        return
      }

      if (event?.type === 'read') {
        setMessages((current) => {
          const next = new Map(current)
          const list = next.get(event.conversation) || []

          next.set(
            event.conversation,
            list.map((message) =>
              Number(message.id) <= Number(event.message_id)
                ? { ...message, is_read: true, status: 'read' }
                : message,
            ),
          )

          return next
        })
        return
      }

      if (event?.type === 'online') {
        setOnlineUsers((current) => {
          const next = new Set(current)
          const userId = String(event.user_id)

          if (event.is_online) {
            next.add(userId)
          } else {
            next.delete(userId)
          }

          return next
        })
        return
      }

      if (event?.type === 'error' && event.message) {
        toast.error(event.message)
      }
    },
    [appendMessage, clearTypingUser, toast],
  )

  const {
    disconnect,
    send: sendWs,
    status: wsStatus,
  } = useWebSocket({
    enabled: canUseLiveChat,
    onMessage: handleWsMessage,
    url: canUseLiveChat ? getChatWsUrl() : '',
  })

  const bootstrapChat = useCallback(async () => {
    if (!canUseLiveChat) {
      setChatUsers([])
      setConversations(new Map())
      setGroups([])
      setOnlineUsers(new Set())
      setUnreadCounts(new Map())
      setBootstrapError('')
      setIsBootstrapping(false)
      return
    }

    setIsBootstrapping(true)
    setBootstrapError('')

    try {
      const [usersResponse, conversationsResponse, groupsResponse] =
        await Promise.all([getChatUsers(), getConversations(), getMyGroups()])
      const filteredUsers = filterDMableUsers(
        normalizeChatList(usersResponse),
        currentUser,
      )
      const normalizedConversations = normalizeChatList(conversationsResponse)
      const normalizedGroups = normalizeChatList(groupsResponse)

      setChatUsers(filteredUsers)
      setConversations(normalizeConversationMap(normalizedConversations))
      setGroups(normalizedGroups)
      setOnlineUsers(getInitialOnlineUsers(filteredUsers, normalizedConversations))
      setUnreadCounts(getInitialUnread(normalizedConversations, normalizedGroups))
    } catch (error) {
      const message = getBackendError(error, 'Chat could not be loaded.')

      setBootstrapError(message)
      toast.error(message)
    } finally {
      setIsBootstrapping(false)
    }
  }, [canUseLiveChat, currentUser, toast])

  useEffect(() => {
    const timer = window.setTimeout(() => bootstrapChat(), 0)

    return () => window.clearTimeout(timer)
  }, [bootstrapChat])

  useEffect(() => {
    const timers = typingTimers.current

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const openChat = useCallback((tab) => {
    if (tab) {
      setActiveTab(tab)
    }

    setIsOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openConversation = useCallback((type, id, data) => {
    setActiveConversation({ data, id, type })
  }, [])

  const backToList = useCallback(() => {
    setActiveConversation(EMPTY_ACTIVE_CONVERSATION)
  }, [])

  const markAsRead = useCallback(
    (conversation) => {
      setUnreadCounts((current) => setMapValue(current, conversation, 0))

      const list = messages.get(conversation) || []
      const lastIncoming = [...list]
        .reverse()
        .find(
          (message) =>
            String(message.sender_id) !== String(currentUserId) &&
            !String(message.id).startsWith('tmp_') &&
            (message.is_read !== true || message.status !== 'read'),
        ) ||
        [...list]
          .reverse()
          .find(
            (message) =>
              String(message.sender_id) !== String(currentUserId) &&
              !String(message.id).startsWith('tmp_'),
          )

      if (lastIncoming?.id && canUseLiveChat) {
        sendWs({
          conversation,
          message_id: lastIncoming.id,
          type: 'mark_read',
        })
      }
    },
    [canUseLiveChat, currentUserId, messages, sendWs],
  )

  const loadMoreMessages = useCallback(
    async (conversation) => {
      if (!canUseLiveChat || loadingMessages.has(conversation)) {
        return
      }

      const { id, type } = getConversationParts(conversation)
      const nextPage = Number(messagePages.get(conversation) || 0) + 1

      setLoadingMessages((current) => new Set(current).add(conversation))

      try {
        const response =
          type === 'group'
            ? await getGroupMessages(id, nextPage)
            : await getDMHistory(id, nextPage)
        const page = normalizeMessagePage(response)
        const normalizedMessages = [...page.results]
          .reverse()
          .map((message) => normalizeMessage(message, conversation))

        setMessages((current) => {
          const next = new Map(current)
          const existing = next.get(conversation) || []
          const existingIds = new Set(existing.map((message) => String(message.id)))
          const older = normalizedMessages.filter(
            (message) => !existingIds.has(String(message.id)),
          )

          next.set(conversation, [...older, ...existing])
          return next
        })
        setHasMoreMessages((current) =>
          setMapValue(current, conversation, Boolean(page.next)),
        )
        setMessagePages((current) => setMapValue(current, conversation, nextPage))
      } catch (error) {
        toast.error(getBackendError(error, 'Messages could not be loaded.'))
      } finally {
        setLoadingMessages((current) => {
          const next = new Set(current)
          next.delete(conversation)
          return next
        })
      }
    },
    [canUseLiveChat, loadingMessages, messagePages, toast],
  )

  const sendMessage = useCallback(
    (conversation, content) => {
      const trimmedContent = String(content || '').trim()

      if (!trimmedContent) {
        return false
      }

      const optimisticMessage = makeTempMessage({
        content: trimmedContent,
        conversation,
        sender: currentUser,
      })

      setMessages((current) => {
        const next = new Map(current)
        next.set(conversation, [...(next.get(conversation) || []), optimisticMessage])
        return next
      })
      updateConversationPreview(conversation, optimisticMessage)

      const sent = sendWs({
        content: trimmedContent,
        conversation,
        type: 'send_message',
      })

      if (!sent) {
        setMessages((current) => {
          const next = new Map(current)
          const list = next.get(conversation) || []

          next.set(
            conversation,
            list.map((message) =>
              message.id === optimisticMessage.id
                ? { ...message, status: 'failed' }
                : message,
            ),
          )

          return next
        })
      }

      return sent
    },
    [currentUser, sendWs, updateConversationPreview],
  )

  const retryMessage = useCallback(
    (conversation, messageId) => {
      const failedMessage = (messages.get(conversation) || []).find(
        (message) => message.id === messageId,
      )

      if (!failedMessage) {
        return false
      }

      if (String(failedMessage.sender_id) !== String(currentUserId)) {
        return false
      }

      setMessages((current) => {
        const next = new Map(current)
        const list = next.get(conversation) || []

        next.set(
          conversation,
          list.map((message) =>
            message.id === messageId ? { ...message, status: 'sending' } : message,
          ),
        )

        return next
      })

      const sent = sendWs({
        content: failedMessage.content,
        conversation,
        type: 'send_message',
      })

      if (!sent) {
        setMessages((current) => {
          const next = new Map(current)
          const list = next.get(conversation) || []

          next.set(
            conversation,
            list.map((message) =>
              message.id === messageId ? { ...message, status: 'failed' } : message,
            ),
          )

          return next
        })
      }

      return sent
    },
    [currentUserId, messages, sendWs],
  )

  const setTyping = useCallback(
    (conversation, isTyping) => {
      if (!canUseLiveChat) {
        return false
      }

      return sendWs({
        conversation,
        type: isTyping ? 'typing_start' : 'typing_stop',
      })
    },
    [canUseLiveChat, sendWs],
  )

  const createGroup = useCallback(
    async (name, memberIds) => {
      const group = await createGroupRequest({
        member_ids: memberIds,
        name,
      })

      setGroups((current) => [group, ...current])
      setActiveTab('groups')
      setActiveConversation({ data: group, id: group.id, type: 'group' })

      return group
    },
    [],
  )

  const value = useMemo(
    () => ({
      activeConversation,
      activeConversationKey,
      activeTab,
      backToList,
      bootstrapChat,
      bootstrapError,
      canUseLiveChat,
      chatUsers,
      closeChat,
      conversations,
      createGroup,
      currentUser,
      disconnect,
      groups,
      hasMoreMessages,
      isBootstrapping,
      isOpen,
      lastMessagePulse,
      liveChatUnavailable,
      loadMoreMessages,
      loadingMessages,
      markAsRead,
      messages,
      onlineUsers,
      openChat,
      openConversation,
      retryMessage,
      sendMessage,
      setActiveTab,
      setTyping,
      totalUnread: mapSum(unreadCounts),
      typingUsers,
      unreadCounts,
      wsStatus: canUseLiveChat ? wsStatus : 'disconnected',
    }),
    [
      activeConversation,
      activeConversationKey,
      activeTab,
      backToList,
      bootstrapChat,
      bootstrapError,
      canUseLiveChat,
      chatUsers,
      closeChat,
      conversations,
      createGroup,
      currentUser,
      disconnect,
      groups,
      hasMoreMessages,
      isBootstrapping,
      isOpen,
      lastMessagePulse,
      liveChatUnavailable,
      loadMoreMessages,
      loadingMessages,
      markAsRead,
      messages,
      onlineUsers,
      openChat,
      openConversation,
      retryMessage,
      sendMessage,
      setTyping,
      typingUsers,
      unreadCounts,
      wsStatus,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  const context = useContext(ChatContext)

  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }

  return context
}

export default ChatProvider
