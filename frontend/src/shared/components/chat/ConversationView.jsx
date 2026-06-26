/* src/shared/components/chat/ConversationView.jsx - Shared DM and group conversation panel. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Search, Users, X } from 'lucide-react'

import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import OnlineStatus from './OnlineStatus'
import TypingIndicator from './TypingIndicator'
import SkeletonRow from '@shared/components/SkeletonRow'
import { useChatContext } from '@shared/context/ChatContext'
import useChatScroll from '@shared/hooks/useChatScroll'
import useDebounce from '@shared/hooks/useDebounce'
import {
  formatDateSeparator,
  getChatUserId,
  groupMessages,
  isSameDate,
  normalizeChatList,
} from '@shared/lib/chatUtils'
import { searchMessages } from '@shared/services/chatApi'

function DateSeparator({ value }) {
  return (
    <div className="my-2 flex items-center gap-3">
      <div className="h-px flex-1 bg-hairline" />
      <span className="rounded-full bg-mist px-3 py-0.5 font-sans text-[10px] text-slate/60">
        {formatDateSeparator(value)}
      </span>
      <div className="h-px flex-1 bg-hairline" />
    </div>
  )
}

export function ConversationView({
  avatar,
  conversationKey,
  entity,
  onBack,
  showGroupActions = false,
  showSenderNames = false,
  subtitle,
  title,
}) {
  const {
    canUseLiveChat,
    currentUser,
    hasMoreMessages,
    liveChatUnavailable,
    loadMoreMessages,
    loadingMessages,
    markAsRead,
    messages,
    retryMessage,
    sendMessage,
    setTyping,
    typingUsers,
    wsStatus,
  } = useChatContext()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResultIds, setSearchResultIds] = useState(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const messageRefs = useRef(new Map())
  const debouncedSearch = useDebounce(searchQuery, 400)
  const searchTerm = debouncedSearch.trim()
  const currentMessages = useMemo(
    () => messages.get(conversationKey) || [],
    [conversationKey, messages],
  )
  const groupedMessages = useMemo(
    () => groupMessages(currentMessages),
    [currentMessages],
  )
  const currentUserId = getChatUserId(currentUser)
  const hasMore = Boolean(hasMoreMessages.get(conversationKey))
  const isLoadingMore = loadingMessages.has(conversationKey)
  const activeTypingUsers = [...(typingUsers.get(conversationKey) || [])].filter(
    (userId) => String(userId) !== String(currentUserId),
  )
  const {
    bottomRef,
    containerRef,
    hasNewBelow,
    onScroll,
    scrollToBottom,
  } = useChatScroll(groupedMessages, hasMore, () => loadMoreMessages(conversationKey))

  useEffect(() => {
    if (!currentMessages.length && canUseLiveChat) {
      loadMoreMessages(conversationKey)
    }
  }, [canUseLiveChat, conversationKey, currentMessages.length, loadMoreMessages])

  useEffect(() => {
    markAsRead(conversationKey)
  }, [conversationKey, markAsRead])

  useEffect(() => {
    let mounted = true

    async function runSearch() {
      const query = debouncedSearch.trim()

      if (!query || !canUseLiveChat) {
        setSearchResultIds(new Set())
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      try {
        const results = await searchMessages(conversationKey, query)

        if (mounted) {
          setSearchResultIds(
            new Set(normalizeChatList(results).map((item) => String(item.id))),
          )
        }
      } finally {
        if (mounted) {
          setIsSearching(false)
        }
      }
    }

    runSearch()

    return () => {
      mounted = false
    }
  }, [canUseLiveChat, conversationKey, debouncedSearch])

  const localMatches = useMemo(() => {
    if (!searchTerm) {
      return []
    }

    const normalizedSearch = searchTerm.toLowerCase()

    return groupedMessages.filter(
      (message) =>
        String(message.content || '').toLowerCase().includes(normalizedSearch) ||
        searchResultIds.has(String(message.id)),
    )
  }, [groupedMessages, searchResultIds, searchTerm])
  const firstMatchId = localMatches[0]
    ? String(localMatches[0].id ?? localMatches[0].client_id)
    : ''
  const localMatchCount = searchTerm
    ? groupedMessages.filter((message) =>
        String(message.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        searchResultIds.has(String(message.id)),
      ).length
    : 0

  useEffect(() => {
    if (!firstMatchId) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      messageRefs.current.get(firstMatchId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [firstMatchId])

  function handleCloseSearch() {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResultIds(new Set())
    setIsSearching(false)
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-hairline bg-canvas px-3">
        <button
          className="rounded-lg p-1 text-slate transition hover:bg-mist hover:text-brand"
          onClick={onBack}
          type="button"
        >
          <span className="sr-only">Back to chat list</span>
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-slate-900">{title}</p>
          {typeof subtitle === 'string' ? (
            <p className="truncate text-[11px] text-slate/60">{subtitle}</p>
          ) : (
            subtitle
          )}
        </div>
        <button
          className="rounded-lg p-1.5 text-slate transition hover:bg-mist hover:text-brand"
          onClick={() => {
            if (searchOpen) {
              handleCloseSearch()
            } else {
              setSearchOpen(true)
            }
          }}
          type="button"
        >
          <span className="sr-only">Search messages</span>
          <Search aria-hidden="true" className="h-4 w-4" />
        </button>
        {showGroupActions ? (
          <button
            className="rounded-lg p-1.5 text-slate transition hover:bg-mist hover:text-brand"
            title="Group members"
            type="button"
          >
            <span className="sr-only">Group members</span>
            <Users aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div
        className={[
          'grid shrink-0 overflow-hidden border-b border-hairline bg-mist transition-all duration-200',
          searchOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] border-b-0',
        ].join(' ')}
      >
        <div className="min-h-0">
          <label className="relative block px-3 py-2">
            <span className="sr-only">Search messages</span>
            <Search
              aria-hidden="true"
              className="absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate"
            />
            <input
              className="h-9 w-full rounded-xl border-none bg-canvas pl-9 pr-9 text-[13px] text-slate-900 outline-none placeholder:text-slate/50"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search messages..."
              type="search"
              value={searchQuery}
            />
            <button
              className="absolute right-5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate transition hover:bg-hairline hover:text-ink"
              onClick={handleCloseSearch}
              type="button"
            >
              <span className="sr-only">Close message search</span>
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </label>
        </div>
      </div>

      {canUseLiveChat && wsStatus !== 'connected' ? (
        <div className="shrink-0 bg-amber-50 px-4 py-2 text-center text-[12px] font-medium text-amber-700">
          Reconnecting...
        </div>
      ) : null}
      {liveChatUnavailable ? (
        <div className="shrink-0 bg-brand-light px-4 py-2 text-center text-[12px] font-medium text-brand">
          Chat connects when a backend session is active.
        </div>
      ) : null}

      <div
        className="relative flex-1 overflow-y-auto px-3 py-3"
        onScroll={onScroll}
        ref={containerRef}
      >
        {isLoadingMore ? (
          <div className="mb-3">
            {[0, 1, 2].map((index) => (
              <SkeletonRow index={index} key={index} variant="chat" />
            ))}
          </div>
        ) : null}

        {groupedMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="text-[14px] font-semibold text-slate-900">No messages yet</p>
            <p className="mt-1 text-[12px] text-slate">
              {liveChatUnavailable
                ? 'Messages will appear here after the backend chat service is connected.'
                : 'Start the conversation with a short message.'}
            </p>
          </div>
        ) : (
          groupedMessages.map((message, index) => {
            const previous = groupedMessages[index - 1]
            const showDate =
              index === 0 || !isSameDate(previous?.created_at, message.created_at)
            const isSelf = String(message.sender_id) === String(currentUserId)
            const highlighted =
              searchResultIds.has(String(message.id)) ||
              (debouncedSearch.trim() &&
                String(message.content || '')
                  .toLowerCase()
                  .includes(debouncedSearch.trim().toLowerCase()))

            return (
              <div
                key={message.client_id || message.id}
                ref={(node) => {
                  const key = String(message.id ?? message.client_id)

                  if (node) {
                    messageRefs.current.set(key, node)
                  } else {
                    messageRefs.current.delete(key)
                  }
                }}
              >
                {showDate ? <DateSeparator value={message.created_at} /> : null}
                <MessageBubble
                  highlight={highlighted ? searchTerm : ''}
                  isSelf={isSelf}
                  message={message}
                  onRetry={() => retryMessage(conversationKey, message.id)}
                  sender={entity}
                  showAvatar={!message.isGrouped}
                  showSenderName={showSenderNames}
                />
              </div>
            )
          })
        )}

        {debouncedSearch.trim() && !isSearching && localMatchCount === 0 ? (
          <div className="py-3 text-center text-[13px] text-slate">No messages found</div>
        ) : null}

        {activeTypingUsers.length ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>

      {hasNewBelow ? (
        <button
          className="absolute bottom-[66px] right-5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white shadow-card transition hover:bg-brandDark"
          onClick={() => scrollToBottom()}
          type="button"
        >
          ↓ New message
        </button>
      ) : null}

      <MessageInput
        disabled={liveChatUnavailable}
        onSend={(content) => sendMessage(conversationKey, content)}
        onTypingChange={(isTyping) => setTyping(conversationKey, isTyping)}
      />
    </div>
  )
}

export function ConversationSubtitle({ lastSeen, online }) {
  return <OnlineStatus lastSeen={lastSeen} online={online} />
}

export default ConversationView
