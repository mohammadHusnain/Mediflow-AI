/* src/shared/components/chat/tabs/UsersTab.jsx - Direct-message chat tab. */
import { Search, SearchX, Users, X } from 'lucide-react'

import ChatAvatar from '../ChatAvatar'
import ConversationView, { ConversationSubtitle } from '../ConversationView'
import UnreadBadge from '../UnreadBadge'
import SkeletonRow from '@shared/components/SkeletonRow'
import { useChatContext } from '@shared/context/ChatContext'
import useDebounce from '@shared/hooks/useDebounce'
import { getChatRoleLabel } from '@shared/lib/chatRbac'
import {
  convKey,
  formatConvTime,
  getChatName,
  getChatUserId,
} from '@shared/lib/chatUtils'
import { useMemo, useState } from 'react'

export function UsersTab() {
  const {
    activeConversation,
    backToList,
    bootstrapError,
    chatUsers,
    conversations,
    isBootstrapping,
    liveChatUnavailable,
    markAsRead,
    onlineUsers,
    openConversation,
    unreadCounts,
  } = useChatContext()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)
  const filteredUsers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()

    if (!query) return chatUsers

    return chatUsers.filter((user) =>
      getChatName(user).toLowerCase().includes(query),
    )
  }, [chatUsers, debouncedSearch])

  if (activeConversation.type === 'dm') {
    const user = activeConversation.data
    const key = convKey.dm(activeConversation.id)

    return (
      <div className="h-full animate-slide-left">
        <ConversationView
          avatar={<ChatAvatar showOnline size="sm" user={user} />}
          conversationKey={key}
          entity={user}
          onBack={backToList}
          subtitle={
            <ConversationSubtitle
              lastSeen={user?.last_seen}
              online={onlineUsers.has(String(activeConversation.id)) || user?.is_online}
            />
          }
          title={getChatName(user)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-canvas animate-slide-right">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <label className="relative block">
          <span className="sr-only">Search users</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate"
          />
          <input
            className="h-9 w-full rounded-xl border-none bg-mist pl-9 pr-9 text-[13px] text-slate-900 outline-none placeholder:text-slate/50"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
            type="search"
            value={search}
          />
          {search ? (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate transition hover:bg-hairline hover:text-ink"
              onClick={() => setSearch('')}
              type="button"
            >
              <span className="sr-only">Clear user search</span>
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isBootstrapping ? (
          Array.from({ length: 5 }).map((_, index) => (
            <SkeletonRow index={index} key={index} variant="chat" />
          ))
        ) : bootstrapError ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <SearchX aria-hidden="true" className="mb-3 h-9 w-9 text-slate/30" />
            <p className="text-[14px] font-semibold text-slate-900">Chat unavailable</p>
            <p className="mt-1 text-[12px] text-slate">{bootstrapError}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 pb-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand/50">
              <Users aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-semibold text-slate-900">No users available</p>
            {liveChatUnavailable ? (
              <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-slate">
                Chat will load here when a backend session is active.
              </p>
            ) : null}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const userId = getChatUserId(user)
            const key = convKey.dm(userId)
            const conversation = conversations.get(String(userId)) || {}
            const unread = unreadCounts.get(key) || 0
            const lastMessage = conversation.last_message
            const timestamp =
              conversation.last_message_time || conversation.updated_at || user.last_seen

            return (
              <button
                className={[
                  'flex w-full items-center gap-3 border-b border-hairline px-4 py-3 text-left transition-colors duration-100 last:border-0 hover:bg-mist',
                  unread > 0 ? 'bg-brand-light/30' : '',
                ].join(' ')}
                key={userId}
                onClick={() => {
                  openConversation('dm', userId, user)
                  markAsRead(key)
                }}
                type="button"
              >
                <ChatAvatar showOnline size="md" user={user} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-900">
                      {getChatName(user)}
                    </p>
                    <span className="font-sans text-[10px] text-slate/60">
                      {formatConvTime(timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p
                      className={[
                        'min-w-0 flex-1 truncate text-[12px]',
                        lastMessage ? 'text-slate/70' : 'italic text-slate/50',
                      ].join(' ')}
                    >
                      {lastMessage || getChatRoleLabel(user.role)}
                    </p>
                    <UnreadBadge count={unread} />
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default UsersTab
