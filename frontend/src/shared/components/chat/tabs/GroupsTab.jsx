/* src/shared/components/chat/tabs/GroupsTab.jsx - Group chat tab. */
import { Plus, Search, SearchX, Users2, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import ConversationView from '../ConversationView'
import GroupCreateModal from '../GroupCreateModal'
import UnreadBadge from '../UnreadBadge'
import SkeletonRow from '@shared/components/SkeletonRow'
import { useChatContext } from '@shared/context/ChatContext'
import useDebounce from '@shared/hooks/useDebounce'
import { canCreateGroup } from '@shared/lib/chatRbac'
import { convKey, formatConvTime } from '@shared/lib/chatUtils'

function GroupAvatar({ group, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-[12px]' : 'h-9 w-9 text-[14px]'

  return (
    <span
      className={[
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#6366F1] font-bold text-white',
        sizeClass,
      ].join(' ')}
    >
      {String(group?.name || 'G').trim().charAt(0).toUpperCase() || 'G'}
    </span>
  )
}

export function GroupsTab() {
  const {
    activeConversation,
    backToList,
    bootstrapError,
    canUseLiveChat,
    chatUsers,
    createGroup,
    currentUser,
    groups,
    isBootstrapping,
    liveChatUnavailable,
    markAsRead,
    openConversation,
    unreadCounts,
  } = useChatContext()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 200)
  const filteredGroups = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()

    if (!query) return groups

    return groups.filter((group) =>
      String(group.name || '').toLowerCase().includes(query),
    )
  }, [debouncedSearch, groups])
  const canStartGroup = canCreateGroup(currentUser) && canUseLiveChat

  if (activeConversation.type === 'group') {
    const group = activeConversation.data
    const key = convKey.group(activeConversation.id)

    return (
      <div className="h-full animate-slide-left">
        <ConversationView
          avatar={<GroupAvatar group={group} size="sm" />}
          conversationKey={key}
          entity={group}
          onBack={backToList}
          showGroupActions
          showSenderNames
          subtitle={`${group?.member_count ?? group?.members?.length ?? 0} members`}
          title={group?.name || 'Group'}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-canvas animate-slide-right">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3">
        <h2 className="text-[14px] font-semibold text-slate-900">Groups</h2>
        {canStartGroup ? (
          <button
            className="inline-flex h-8 items-center rounded-control px-2.5 text-[12px] font-semibold text-brand transition hover:bg-brand-light"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
            New
          </button>
        ) : null}
      </div>

      <div className="shrink-0 px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Search groups</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate"
          />
          <input
            className="h-9 w-full rounded-xl border-none bg-mist pl-9 pr-9 text-[13px] text-slate-900 outline-none placeholder:text-slate/50"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search groups"
            type="search"
            value={search}
          />
          {search ? (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate transition hover:bg-hairline hover:text-ink"
              onClick={() => setSearch('')}
              type="button"
            >
              <span className="sr-only">Clear group search</span>
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
            <p className="text-[14px] font-semibold text-slate-900">Groups unavailable</p>
            <p className="mt-1 text-[12px] text-slate">{bootstrapError}</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 pb-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand/50">
              <Users2 aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-semibold text-slate-900">No groups yet</p>
            {liveChatUnavailable ? (
              <p className="mt-1 max-w-[240px] text-[12px] leading-5 text-slate">
                Groups will load here when a backend session is active.
              </p>
            ) : null}
            {canStartGroup ? (
              <button
                className="mt-2 text-[13px] font-semibold text-brand transition hover:text-brandDark"
                onClick={() => setCreateOpen(true)}
                type="button"
              >
                Create a group
              </button>
            ) : null}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const key = convKey.group(group.id)
            const unread = unreadCounts.get(key) || 0
            const sender = group.last_message_sender || group.sender_name
            const preview = group.last_message
              ? [sender, group.last_message].filter(Boolean).join(': ')
              : `${group.member_count ?? group.members?.length ?? 0} members`

            return (
              <button
                className={[
                  'flex w-full items-center gap-3 border-b border-hairline px-4 py-3 text-left transition-colors duration-100 last:border-0 hover:bg-mist',
                  unread > 0 ? 'bg-brand-light/30' : '',
                ].join(' ')}
                key={group.id}
                onClick={() => {
                  openConversation('group', group.id, group)
                  markAsRead(key)
                }}
                type="button"
              >
                <GroupAvatar group={group} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-900">
                      {group.name}
                    </p>
                    <span className="font-sans text-[10px] text-slate/60">
                      {formatConvTime(group.last_message_time || group.updated_at)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[12px] text-slate/70">
                      {preview}
                    </p>
                    <UnreadBadge count={unread} />
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      <GroupCreateModal
        allUsers={chatUsers}
        currentUser={currentUser}
        onClose={() => setCreateOpen(false)}
        onCreate={createGroup}
        open={createOpen}
      />
    </div>
  )
}

export default GroupsTab
