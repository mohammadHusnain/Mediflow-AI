/* src/shared/components/chat/GroupCreateModal.jsx - Bottom-sheet group creation flow. */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

import ChatAvatar from './ChatAvatar'
import { useToast } from '@shared/components/Toast'
import useDebounce from '@shared/hooks/useDebounce'
import { filterGroupableUsers, getChatRoleLabel } from '@shared/lib/chatRbac'
import { getBackendError } from '@shared/lib/records'
import { getChatName, getChatUserId } from '@shared/lib/chatUtils'

export function GroupCreateModal({
  allUsers = [],
  currentUser,
  onClose,
  onCreate,
  open = false,
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debouncedSearch = useDebounce(memberSearch, 300)
  const groupableUsers = useMemo(
    () => filterGroupableUsers(allUsers, currentUser),
    [allUsers, currentUser],
  )
  const selectedIds = useMemo(
    () => new Set(selectedMembers.map((member) => String(getChatUserId(member)))),
    [selectedMembers],
  )
  const filteredUsers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()

    return groupableUsers
      .filter((user) => !selectedIds.has(String(getChatUserId(user))))
      .filter((user) => !query || getChatName(user).toLowerCase().includes(query))
      .slice(0, 5)
  }, [debouncedSearch, groupableUsers, selectedIds])

  if (!open) {
    return null
  }

  function handleAddMember(user) {
    setSelectedMembers((current) => [...current, user])
    setMemberSearch('')
    setErrors((current) => ({ ...current, members: '' }))
  }

  function handleRemoveMember(userId) {
    setSelectedMembers((current) =>
      current.filter((member) => String(getChatUserId(member)) !== String(userId)),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {}

    if (name.trim().length < 2) {
      nextErrors.name = 'Group name must be at least 2 characters.'
    }

    if (selectedMembers.length === 0) {
      nextErrors.members = 'Add at least one member.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await onCreate?.(
        name.trim(),
        selectedMembers.map((member) => getChatUserId(member)),
      )
      onClose?.()
    } catch (error) {
      toast.error(getBackendError(error, 'Group could not be created.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-end justify-end bg-glass-dark backdrop-blur-xs">
      <form
        className="mb-6 mr-6 w-[380px] max-w-[calc(100vw-24px)] rounded-2xl bg-canvas p-5 shadow-2xl animate-scale-in max-sm:mb-0 max-sm:mr-0 max-sm:w-full max-sm:rounded-b-none"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[17px] font-bold text-slate-900">Create Group</h2>
          <button
            className="rounded-lg p-1.5 text-slate transition hover:bg-mist hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <span className="sr-only">Close create group</span>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-[12px] font-semibold text-slate-900">Group Name</span>
          <input
            className="mt-1 h-10 w-full rounded-control border border-hairline bg-mist px-3 text-[13px] text-slate-900 outline-none transition focus:border-brand focus:bg-canvas focus:ring-2 focus:ring-brand/15"
            onChange={(event) => {
              setName(event.target.value)
              setErrors((current) => ({ ...current, name: '' }))
            }}
            value={name}
          />
          {errors.name ? (
            <span className="mt-1 block text-[11px] font-medium text-rose-600">
              {errors.name}
            </span>
          ) : null}
        </label>

        <div className="mt-4">
          <span className="text-[12px] font-semibold text-slate-900">Add Members</span>
          <label className="relative mt-1 block">
            <span className="sr-only">Search users to add</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate"
            />
            <input
              className="h-10 w-full rounded-control border border-hairline bg-mist pl-9 pr-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate/50 focus:border-brand focus:bg-canvas focus:ring-2 focus:ring-brand/15"
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search users to add..."
              type="search"
              value={memberSearch}
            />
          </label>
          <div className="mt-2 max-h-[216px] overflow-y-auto rounded-control border border-hairline">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-slate">No members available</p>
            ) : (
              filteredUsers.map((user) => (
                <button
                  className="flex w-full items-center gap-3 border-b border-hairline px-3 py-2 text-left transition last:border-0 hover:bg-mist"
                  key={getChatUserId(user)}
                  onClick={() => handleAddMember(user)}
                  type="button"
                >
                  <ChatAvatar size="sm" user={user} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {getChatName(user)}
                    </p>
                    <p className="text-[11px] text-slate">{getChatRoleLabel(user.role)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          {errors.members ? (
            <span className="mt-1 block text-[11px] font-medium text-rose-600">
              {errors.members}
            </span>
          ) : null}
        </div>

        {selectedMembers.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <span
                className="flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-[12px] font-medium text-brand"
                key={getChatUserId(member)}
              >
                {getChatName(member)}
                <button
                  className="rounded-full p-0.5 transition hover:bg-brand/10"
                  onClick={() => handleRemoveMember(getChatUserId(member))}
                  type="button"
                >
                  <span className="sr-only">Remove member</span>
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-10 rounded-control px-4 text-[13px] font-semibold text-slate transition hover:bg-mist"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-10 rounded-control bg-brand px-4 text-[13px] font-semibold text-white transition hover:bg-brandDark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

export default GroupCreateModal
