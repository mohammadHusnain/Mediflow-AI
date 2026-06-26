# MediFlow — Chat Module
## 2 Master Prompts · Backend API & WebSocket Requirements

Design system in force: Outfit (sans), JetBrains Mono (mono), brand #4338CA,
brandDark #352E9E, slate #5B6472, mist #F6F8F9, hairline #E4E8EB, canvas #FFFFFF,
text-slate-900 for primary text. All animation classes from existing tailwind.config.js.
No new external libraries except: native WebSocket API (no socket.io client),
no placeholder code, no TODOs.

Wireframe reference (image provided): Single overlay panel, three tabs at top
(Users | Group | AI), Users selected by default, user list with avatar + search
below tabs, clicking a user slides into conversation view within same panel.

---

---

# MASTER PROMPT 1 — Foundation: Architecture, Context, WebSocket, Shell, Components

## Role
Senior frontend engineer. Build the entire chat infrastructure before any UI tab.
No visible chat UI yet — only the floating button, overlay shell, WebSocket engine,
ChatContext, and all shared components that Prompt 2 consumes.

---

## 1. NEW FILES OVERVIEW

```
src/
├── context/
│   └── ChatContext.jsx          ← global chat state, WebSocket management
├── hooks/
│   ├── useWebSocket.js          ← reusable WS hook with reconnect
│   └── useChatScroll.js         ← auto-scroll to bottom on new messages
├── lib/
│   ├── chatUtils.js             ← message formatters, time helpers
│   └── chatRbac.js              ← who can DM/group with whom
├── services/
│   └── chatApi.js               ← REST calls for chat (history, groups, users)
└── components/
    └── chat/
        ├── FloatingChatButton.jsx
        ├── ChatOverlay.jsx
        ├── ChatTabBar.jsx
        ├── MessageBubble.jsx
        ├── MessageInput.jsx
        ├── TypingIndicator.jsx
        ├── OnlineStatus.jsx
        ├── ReadReceipts.jsx
        ├── UnreadBadge.jsx
        └── ChatAvatar.jsx
```

---

## 2. WEBSOCKET HOOK — src/hooks/useWebSocket.js

```js
// Manages a single WebSocket connection with:
// - auto-reconnect (exponential backoff: 1s, 2s, 4s, 8s, max 30s)
// - connection state tracking: 'connecting' | 'connected' | 'disconnected' | 'error'
// - heartbeat ping every 30s to keep connection alive
// - clean teardown on unmount

export function useWebSocket({ url, onMessage, onOpen, onClose, enabled = true }) {
  const wsRef             = useRef(null)
  const reconnectDelay    = useRef(1000)
  const reconnectTimer    = useRef(null)
  const [status, setStatus] = useState('disconnected')

  const connect = useCallback(() => {
    if (!enabled || !url) return
    setStatus('connecting')
    const token = localStorage.getItem('access')
    // Pass token as query param — backend reads it for auth
    const fullUrl = `${url}?token=${token}`
    wsRef.current = new WebSocket(fullUrl)

    wsRef.current.onopen = () => {
      setStatus('connected')
      reconnectDelay.current = 1000  // reset backoff
      onOpen?.()
    }

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      onMessage?.(data)
    }

    wsRef.current.onclose = () => {
      setStatus('disconnected')
      onClose?.()
      // Exponential backoff reconnect
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
        connect()
      }, reconnectDelay.current)
    }

    wsRef.current.onerror = () => {
      setStatus('error')
      wsRef.current?.close()
    }
  }, [url, enabled, onMessage, onOpen, onClose])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current)
    wsRef.current?.close()
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [url, enabled])

  return { status, send, disconnect }
}
```

---

## 3. CHAT CONTEXT — src/context/ChatContext.jsx

Single global provider wrapping the entire app (add to App.jsx above all routes).
Manages ALL chat state so unread counts persist across page navigation.

```js
// State shape:
{
  isOpen:           boolean,          // overlay open/closed
  activeTab:        'users'|'groups'|'ai',
  activeConversation: {
    type:    'dm' | 'group' | null,
    id:      number | null,           // conversationId or groupId
    data:    object | null,           // user or group object
  },

  // Users
  chatUsers:        Array<ChatUser>,  // all DM-able users
  conversations:    Map<userId, Conversation>,

  // Messages per conversation key "dm_:id" or "group_:id"
  messages:         Map<string, Message[]>,
  hasMoreMessages:  Map<string, boolean>,

  // Real-time state
  onlineUsers:      Set<userId>,
  typingUsers:      Map<convKey, Set<userId>>,   // who is typing where
  unreadCounts:     Map<convKey, number>,         // badge counts
  totalUnread:      number,                       // floating button badge

  // Groups
  groups:           Array<Group>,

  // WS connection status
  wsStatus:         'connecting'|'connected'|'disconnected'|'error',
}

// Actions exposed via useChatContext():
openChat(tab?)
closeChat()
openConversation(type, id, data)
backToList()
sendMessage(convKey, content)
markAsRead(convKey)
setTyping(convKey, isTyping)
loadMoreMessages(convKey)
createGroup(name, memberIds)
```

The global WebSocket connects to `/ws/chat/` (a multiplexed connection) on mount
when the user is logged in. All message routing happens through this single
connection — not separate connections per conversation.

Multiplexed message format (all messages share this envelope):
```js
// Incoming
{ type: 'message', conversation: 'dm_5', data: MessageObject }
{ type: 'typing',  conversation: 'dm_5', user_id: 12, is_typing: true }
{ type: 'read',    conversation: 'dm_5', user_id: 12, message_id: 99 }
{ type: 'online',  user_id: 12, is_online: true }
{ type: 'group_message', conversation: 'group_3', data: MessageObject }

// Outgoing
{ type: 'send_message',  conversation: 'dm_5',    content: '...' }
{ type: 'send_message',  conversation: 'group_3', content: '...' }
{ type: 'typing_start',  conversation: 'dm_5' }
{ type: 'typing_stop',   conversation: 'dm_5' }
{ type: 'mark_read',     conversation: 'dm_5',    message_id: 99 }
```

---

## 4. CHAT RBAC — src/lib/chatRbac.js

```js
import { ROLES } from './roles'

// Who can a user send DMs to?
export function getDMableRoles(userRole) {
  // All portal roles can DM each other (admin, doctor, staff)
  // Patients are never in the system as chat users
  return [ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]
}

// Who can be added to a group?
export function getGroupableRoles(userRole) {
  const map = {
    [ROLES.ADMIN]:        [ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
    [ROLES.DOCTOR]:       [ROLES.DOCTOR, ROLES.RECEPTIONIST],
    [ROLES.RECEPTIONIST]: [ROLES.RECEPTIONIST, ROLES.DOCTOR],
  }
  return map[userRole] || []
}

// Can this user create a group?
export function canCreateGroup(user) {
  return [ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST].includes(user.role)
}

// Filter a user list to only DM-able users (exclude self, exclude patients)
export function filterDMableUsers(users, currentUser) {
  const allowedRoles = getDMableRoles(currentUser.role)
  return users.filter(u =>
    u.id !== currentUser.user_id &&
    allowedRoles.includes(u.role)
  )
}

// Filter for group member selection
export function filterGroupableUsers(users, currentUser) {
  const allowedRoles = getGroupableRoles(currentUser.role)
  return users.filter(u =>
    u.id !== currentUser.user_id &&
    allowedRoles.includes(u.role)
  )
}
```

---

## 5. CHAT API SERVICE — src/services/chatApi.js

```js
import { api } from './api'

// Users
export const getChatUsers      = ()              => api.get('/chat/users/')
export const getDMHistory      = (userId, page)  => api.get(`/chat/dm/${userId}/messages/`, { params: { page, page_size: 30 } })
export const getConversations  = ()              => api.get('/chat/conversations/')

// Groups
export const getMyGroups       = ()              => api.get('/chat/groups/')
export const getGroupMessages  = (groupId, page) => api.get(`/chat/groups/${groupId}/messages/`, { params: { page, page_size: 30 } })
export const createGroup       = (data)          => api.post('/chat/groups/', data)
export const addGroupMember    = (groupId, userId) => api.post(`/chat/groups/${groupId}/members/`, { user_id: userId })
export const removeGroupMember = (groupId, userId) => api.delete(`/chat/groups/${groupId}/members/${userId}/`)

// Search messages
export const searchMessages    = (convKey, query) => api.get(`/chat/search/`, { params: { conversation: convKey, q: query } })

// AI
export const sendAIMessage     = (message, history) => api.post('/chat/ai/', { message, history })
```

---

## 6. SHARED COMPONENTS

### 6A. src/components/chat/ChatAvatar.jsx
Avatar for chat — same avatarColor hash as existing Avatar component but with:
- Online indicator: small green dot bottom-right of avatar circle
  `absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full
   ring-2 ring-canvas`
- Props: user, size (sm=28, md=36, lg=44), showOnline=false
- Online status sourced from ChatContext onlineUsers Set

### 6B. src/components/chat/MessageBubble.jsx
```
Sent (isSelf=true):
  Flex justify-end, bubble right-aligned
  bg-brand text-white rounded-[18px] rounded-br-[4px]
  px-4 py-2 max-w-[72%]
  Outfit 400 text-[14px]

Received (isSelf=false):
  Flex justify-start, bubble left-aligned
  bg-mist text-slate-900 rounded-[18px] rounded-bl-[4px]
  px-4 py-2 max-w-[72%]

Below bubble (same side alignment):
  Timestamp: font-mono text-[10px] text-slate/60
  Read receipts (sent messages only): ReadReceipts component

Image/file messages: render a placeholder for now (text "[attachment]")
Consecutive messages from same sender within 60s: reduce gap, hide avatar
```

### 6C. src/components/chat/ReadReceipts.jsx
```js
// Props: status = 'sending' | 'sent' | 'delivered' | 'read'
// sending:   one grey clock icon (lucide Clock size-[10px] text-white/50)
// sent:      one grey check (lucide Check size-[10px] text-white/60)
// delivered: two grey checks side by side (custom SVG double-check)
// read:      two brand-light checks (same double-check, color text-brand-light)
```

### 6D. src/components/chat/TypingIndicator.jsx
Three animated dots:
```jsx
<div className="flex items-center gap-1 px-4 py-2">
  {[0,1,2].map(i => (
    <div
      key={i}
      className="w-2 h-2 bg-slate/40 rounded-full animate-bounce"
      style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
    />
  ))}
</div>
```
Wrapped in a received-style bubble (bg-mist, left-aligned).

### 6E. src/components/chat/UnreadBadge.jsx
```jsx
// Props: count (number)
// If count === 0: renders nothing
// If count > 0 and <= 99: shows count
// If count > 99: shows "99+"
// bg-rose-500 text-white rounded-full
// min-w-[18px] h-[18px] px-1 font-mono text-[10px] font-bold
// flex items-center justify-center
```

### 6F. src/hooks/useChatScroll.js
```js
export function useChatScroll(messages, hasMore) {
  const bottomRef  = useRef(null)
  const containerRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new messages arrive IF user is near bottom
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages?.length])

  // Detect if user scrolled up (disable auto-scroll) or back to bottom
  const onScroll = (e) => {
    const el = e.target
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setAutoScroll(nearBottom)
  }

  // Load more when scrolled to top
  const onScrollTop = (e) => {
    if (e.target.scrollTop === 0 && hasMore) {
      // caller triggers loadMoreMessages
    }
  }

  return { bottomRef, containerRef, onScroll, autoScroll }
}
```

### 6G. src/lib/chatUtils.js
```js
// Format timestamp for message
export function formatMessageTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

// Format conversation list timestamp (today: time, yesterday: "Yesterday", older: date)
export function formatConvTime(isoString) {
  const d     = new Date(isoString)
  const today = new Date()
  const diff  = today.getDate() - d.getDate()
  if (diff === 0) return formatMessageTime(isoString)
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Conversation key builder
export const convKey = {
  dm:    (userId)   => `dm_${userId}`,
  group: (groupId)  => `group_${groupId}`,
  ai:    ()         => 'ai',
}

// Group consecutive messages from same sender
export function groupMessages(messages) {
  return messages.map((msg, i) => ({
    ...msg,
    isGrouped: i > 0 &&
      messages[i-1].sender_id === msg.sender_id &&
      (new Date(msg.created_at) - new Date(messages[i-1].created_at)) < 60000
  }))
}
```

---

## 7. FLOATING CHAT BUTTON — src/components/chat/FloatingChatButton.jsx

```jsx
// Fixed position: bottom-6 right-6 z-[999]
// Not in sidebar. Not in topbar. Rendered in App.jsx OUTSIDE all routes,
// inside ChatProvider but outside Layout — so it appears on every page.

// Button: w-14 h-14 bg-brand hover:bg-brandDark rounded-full
//   shadow-[0_4px_24px_rgba(67,56,202,0.4)]
//   transition-all duration-200 active:scale-95
//   flex items-center justify-center cursor-pointer

// Icon: lucide MessageSquare size-[22px] text-white
//   rotate-0 when closed, subtle rotation animation on hover

// Unread badge: absolute -top-1 -right-1
//   UnreadBadge component with totalUnread from ChatContext

// Pulse ring when new message arrives (not opened yet):
//   animate-ping absolute inset-0 bg-brand/30 rounded-full
//   show for 3s then remove
```

Place in App.jsx:
```jsx
<ChatProvider>
  <BrowserRouter>
    {/* ...routes... */}
  </BrowserRouter>
  <FloatingChatButton />   {/* outside Router, renders on all pages */}
  <ChatOverlay />          {/* the overlay panel */}
</ChatProvider>
```

---

## 8. CHAT OVERLAY SHELL — src/components/chat/ChatOverlay.jsx

```jsx
// Positioning: fixed bottom-24 right-6 z-[998]
// Size: w-[380px] h-[580px] (desktop)
//       w-[calc(100vw-24px)] h-[85vh] bottom-20 right-3 (mobile < 640px)
// Appearance:
//   bg-canvas rounded-2xl overflow-hidden
//   border border-hairline
//   shadow-[0_8px_48px_rgba(20,24,31,0.18)]

// Entrance animation (when isOpen becomes true):
//   animate from: opacity-0 scale-95 translateY(12px)
//   animate to:   opacity-1 scale-100 translateY(0)
//   duration: 220ms cubic-bezier(0.16, 1, 0.3, 1)
//   Exit: reverse, 160ms

// Use CSS transition on a wrapper div, toggled by isOpen state:
// className={`... transition-all duration-200 ${isOpen
//   ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
//   : 'opacity-0 scale-95 translate-y-3 pointer-events-none'
// }`}
// Always rendered in DOM (not conditional) — prevents remount on open

// Structure (top to bottom, h-full flex flex-col):
// ┌─────────────────────────────────────┐
// │  Header (52px fixed)                │
// │  ChatTabBar (44px fixed)            │
// │  Content area (flex-1 overflow-hidden) │
// └─────────────────────────────────────┘
```

**Header (52px):**
`bg-brand flex items-center justify-between px-4 h-[52px] flex-shrink-0`
Left: "MediFlow Chat" Outfit 600 text-[15px] text-white
Right: lucide X button (hover:bg-white/10 rounded-lg p-1.5 transition-colors)
       closes overlay (setIsOpen(false))

**ChatTabBar (44px):**
`bg-brand/90 flex border-t border-white/10 flex-shrink-0`
Three tabs equal width: "Users" | "Groups" | "AI"
Active: `bg-white/15 text-white font-semibold border-b-2 border-white`
Inactive: `text-white/60 hover:text-white/90 hover:bg-white/8`
Each: `flex-1 h-full flex items-center justify-center font-sans text-[13px]
       font-medium cursor-pointer transition-all duration-150`
AI tab: lucide Bot size-[14px] mr-1 inline

**Content area:**
`flex-1 overflow-hidden relative`
Render the active tab's component. Tab switches are instant (no animation —
content is inside a fixed-size box, no layout shift).

---

## 9. QA FOR PROMPT 1

### WebSocket
[ ] Reconnects automatically after disconnect (check with network throttle in devtools)
[ ] Exponential backoff: 1s → 2s → 4s → 8s capped at 30s between retries
[ ] Single WS connection for entire app — not per conversation
[ ] Token passed as query param on connect
[ ] Clean disconnect on logout (no dangling connections)
[ ] Heartbeat ping every 30s (check in Network tab WS frames)

### ChatContext
[ ] totalUnread is sum of all unreadCounts values
[ ] onlineUsers Set updates on 'online' type messages
[ ] typingUsers clears automatically after 3s of no typing event
[ ] messages Map keyed by convKey ("dm_5", "group_3") — no collision

### Floating button
[ ] Appears on EVERY page including /login (add check: hide on /login and /change-password)
[ ] UnreadBadge shows correct total
[ ] Pulse animation fires on new message when overlay is closed, clears after 3s
[ ] Does NOT appear in sidebar or topbar anywhere

### Overlay
[ ] Opens/closes without page remount (overlay is always in DOM, visibility toggled)
[ ] Opens at bottom-right, not full screen on desktop
[ ] Full-width on mobile (< 640px)
[ ] Entrance animation smooth — no jump or flicker
[ ] X button closes overlay, floating button re-opens it

### RBAC
[ ] filterDMableUsers excludes current user from their own DM list
[ ] filterGroupableUsers respects role hierarchy (doctor cannot add admin to group)
[ ] canCreateGroup returns false for patient role (even though patients aren't in portal)

---

---

# MASTER PROMPT 2 — All Three Tabs: Users, Groups, AI

## Role
Senior frontend engineer. Build all three chat tabs in full, using all components
and context from Prompt 1. WhatsApp-style UX. Complete, production-ready code.

---

## 1. USERS TAB — src/components/chat/tabs/UsersTab.jsx

Two views managed with local state `view: 'list' | 'conversation'`:

### 1A. User List View (view === 'list')

**Layout:** `flex flex-col h-full`

**Search bar:**
`px-3 pt-3 pb-2 flex-shrink-0`
Input: `w-full bg-mist rounded-xl h-[36px] pl-9 pr-3 font-sans text-[13px]
        text-slate-900 placeholder:text-slate/50 border-none outline-none`
lucide Search size-[14px] text-slate absolute left-6 center-y

Filter: client-side filter of chatUsers array by full_name.toLowerCase()
Debounce: 200ms (fast — local filter, no API call)

**User list:**
`flex-1 overflow-y-auto`
Custom scrollbar styling from existing global CSS.

On mount: fetch getChatUsers() + getConversations()
Apply filterDMableUsers(users, currentUser) — enforce RBAC before rendering.

Each user row:
`flex items-center gap-3 px-4 py-3 cursor-pointer
 hover:bg-mist transition-colors duration-100
 border-b border-hairline last:border-0`

Left: ChatAvatar (size md=36, showOnline=true)
Center flex-col flex-1 min-w-0:
  Row 1: full_name (Outfit 500 text-[14px] text-slate-900) +
          timestamp right (font-mono text-[10px] text-slate/60)
  Row 2: last_message preview (Outfit 400 text-[12px] text-slate/70 truncate) +
          UnreadBadge right (if unread > 0)
If no last_message: show role label in italic ("Doctor", "Staff") in text-slate/50

Unread messages: row background slightly brand-tinted:
  `bg-brand-light/30` if unreadCounts.get(convKey.dm(user.id)) > 0

On click: setActiveConversation({ type: 'dm', id: user.id, data: user })
          setView('conversation')
          markAsRead(convKey.dm(user.id))

Empty state (no users to DM):
  lucide Users size-36 text-brand/20 mb-2 centered
  "No users available" text-slate text-[13px]

Loading state: 5 skeleton rows (shimmer, same SkeletonRow component)

### 1B. Conversation View (view === 'conversation')

**Header (52px fixed top):**
`bg-canvas border-b border-hairline flex items-center gap-3 px-3 h-[52px] flex-shrink-0`
Back button: lucide ChevronLeft size-[20px] text-slate hover:text-brand
             onClick: setView('list'), clear activeConversation
ChatAvatar (size sm=28, showOnline=true)
Flex col:
  full_name: Outfit 600 text-[14px] text-slate-900
  Status: OnlineStatus component — "Online" (green) or "Last seen 2h ago" (text-slate/60)
          font-sans text-[11px]
Right: lucide Search size-[16px] text-slate hover:text-brand (toggles message search)

**Message Search bar (collapsible):**
Slides down (max-h transition) when search icon clicked.
`bg-mist px-3 py-2 border-b border-hairline flex-shrink-0`
Input: same style as user list search, placeholder "Search messages…"
Sends: searchMessages(convKey, query) on debounce 400ms
Results: highlight matching messages in the list (scroll to first match)
× to close search and clear results

**Message area (flex-1 overflow-y-auto):**
`flex flex-col gap-1 px-3 py-3`
Use useChatScroll hook.

Load more: when user scrolls to top AND hasMoreMessages is true →
  button or auto-trigger: `loadMoreMessages(convKey.dm(userId))`
  Prepend older messages to top
  Loading indicator: 3 SkeletonRow instances at very top while loading

Messages rendered with groupMessages() utility (grouped consecutive from same sender).
For grouped messages: hide avatar, reduce vertical gap.

**Date separators:**
Between messages on different dates:
`flex items-center gap-3 my-2`
`flex-1 h-px bg-hairline`
Date: `bg-mist px-3 py-0.5 rounded-full font-mono text-[10px] text-slate/60`

**Typing indicator:**
Show TypingIndicator component when typingUsers.get(convKey) has the other user's id.
Auto-hide after 3s with no typing event from backend.

**Typing detection (outgoing):**
On every keystroke in input: send { type: 'typing_start', conversation: key }
On input clear or blur (after 2s of no typing): send { type: 'typing_stop', conversation: key }
Throttle typing_start: max once per 2s.

**Read receipts:**
On opening conversation: send mark_read for all unread messages.
Backend pushes 'read' event to sender → sender's MessageBubble updates to read status.

**Message input (fixed bottom):**
`border-t border-hairline px-3 py-2 flex items-end gap-2 bg-canvas flex-shrink-0`
Textarea (auto-expand, max 4 rows):
  `flex-1 bg-mist rounded-xl px-4 py-2.5 font-sans text-[14px] text-slate-900
   placeholder:text-slate/50 resize-none outline-none border-none
   max-h-[96px] overflow-y-auto`
  placeholder: "Message..."
  Enter key: send message (Shift+Enter = new line)

Send button: `w-9 h-9 bg-brand rounded-full flex items-center justify-center
              hover:bg-brandDark transition-colors active:scale-95`
             lucide Send size-[16px] text-white (rotate -45° for WhatsApp look)
             Disabled + opacity-50 when textarea is empty

**Optimistic UI:**
On send: immediately add message to local state with status='sending'
         No WS round-trip wait for display — show instantly
WS ACK received: update message status to 'sent' by message ID
Error: update status to 'failed', show retry option (tap message to retry)

---

## 2. GROUPS TAB — src/components/chat/tabs/GroupsTab.jsx

Two views: `view: 'list' | 'conversation'`

### 2A. Groups List View

**Header row:**
`px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0`
"Groups" Outfit 600 text-[14px] text-slate-900
"+ New" button (brand ghost, small): lucide Plus size-[14px] mr-1
  → opens GroupCreateModal
  Render ONLY if canCreateGroup(user)

**Search:** same pattern as Users tab search (filter group name client-side)

**Groups list (flex-1 overflow-y-auto):**
Show only groups where current user is a member (already filtered by getMyGroups()).

Each group row (same layout as user row):
Left: Group avatar — circular, brand gradient background
      `w-9 h-9 bg-gradient-to-br from-brand to-[#6366F1] rounded-full
       flex items-center justify-center`
      First letter of group name in Outfit 700 text-[14px] text-white
Center:
  Row 1: group name (Outfit 500 text-[14px] text-slate-900) +
          timestamp
  Row 2: "[Sender name]: last message preview" truncated + UnreadBadge

Empty state:
  lucide Users2 size-36 text-brand/20 mb-2
  "No groups yet"
  "+ Create a group" brand link (if canCreateGroup)

### 2B. Group Conversation View

Same structure as DM conversation view. Differences:

**Header:**
Group avatar (circle with letter) + group name + "[N] members" subtitle
Right: lucide Search + lucide Users (member list toggle — future)

**Messages:**
Each received message shows the sender's name above the bubble (not just avatar):
`Outfit 500 text-[11px] text-brand mb-0.5` — sender's full name
(same as WhatsApp group message sender label)
Only show sender name for RECEIVED messages, not self.

**Pub/Sub architecture:**
Group messages use the same multiplexed WS connection.
Outgoing: `{ type: 'send_message', conversation: 'group_3', content: '...' }`
Incoming: `{ type: 'group_message', conversation: 'group_3', data: MessageObject }`
Backend fan-out to all group members' WS connections.

### 2C. GroupCreateModal — src/components/chat/GroupCreateModal.jsx

Modal overlay (createPortal to document.body):
`fixed inset-0 bg-glass-dark backdrop-blur-xs z-[1001] flex items-end justify-end`
Panel: appears bottom-right, above the chat overlay:
`w-[380px] bg-canvas rounded-2xl shadow-2xl p-5 mr-6 mb-6 animate-scale-in`

Content:
1. Header: "Create Group" Outfit 700 text-[17px] + X close button

2. Group name field:
   Label: "Group Name" (required)
   Input: same style as form inputs
   Validation: required, min 2 chars

3. "Add Members" label + member search:
   Input: placeholder "Search users to add…"
   Debounce 300ms → filter from filterGroupableUsers(allUsers, currentUser)
   Results dropdown below input (max 5 visible, scrollable):
     Each result: ChatAvatar sm + name + role chip
     Click: adds to selected list

4. Selected members:
   Flex-wrap chip list:
   `bg-brand-light text-brand rounded-full px-2.5 py-1 text-[12px] flex items-center gap-1`
   Name + × remove button
   Min 1 member required.

5. Members excluded by RBAC (doctors cannot see admins in their member list, etc.)
   enforced by filterGroupableUsers — no mention in UI.

6. Action buttons:
   Cancel (ghost) + "Create Group" (brand solid)
   Loading on create.
   On success: close modal, add group to list, open group conversation.

---

## 3. AI TAB — src/components/chat/tabs/AITab.jsx

A standalone AI assistant chat. Not connected to DMs or groups.
Local state only — no WebSocket, no persistence (session only).

**Layout:** same as DM conversation view but without the header back button.

**Fixed header:**
`bg-canvas border-b border-hairline px-4 h-[44px] flex items-center gap-2 flex-shrink-0`
lucide Bot size-[18px] text-brand
"AI Assistant" Outfit 600 text-[14px] text-slate-900
Right: lucide Trash2 size-[15px] text-slate hover:text-rose-500 — clears conversation

**Welcome state (no messages yet):**
Centered in message area:
lucide Bot size-44 text-brand/20 mb-3
"AI Assistant" Outfit 600 text-[17px] text-slate-900
"Ask me anything about your patients, appointments, or clinic data."
Outfit 400 text-[13px] text-slate mt-1 text-center max-w-[260px]

Suggestion chips below (quick prompts):
`bg-brand-light text-brand border border-brand/20 rounded-xl px-3 py-2
 text-[12px] Outfit 500 cursor-pointer hover:bg-brand hover:text-white
 transition-all duration-150`
Chips:
- "Summarize today's appointments"
- "Who are my highest-risk patients?"
- "Show pending payments"
Clicking a chip: populates input + auto-sends

**Messages:**
AI messages: same received bubble style (bg-mist, left-aligned)
Before AI message is available: show TypingIndicator while awaiting response.
AI avatar: small Bot icon in brand circle instead of ChatAvatar

**AI call:**
On send: call `sendAIMessage(content, conversationHistory)`
conversationHistory: last 10 messages formatted as `[{role: 'user'|'assistant', content}]`
Response: stream or single response → add as AI message
Error: "AI assistant is unavailable right now." in rose-tinted bubble

**No persistence:** AI chat resets when overlay is closed.
State: local useState inside AITab, not in ChatContext.

---

## 4. EDGE CASES

| Scenario | Behaviour |
|---|---|
| WS disconnects mid-conversation | Show connection banner: `bg-amber-50 text-amber-700 text-[12px] px-4 py-2 text-center` "Reconnecting…" — auto-reconnects |
| Message send fails (WS not connected) | Message shows 'failed' status in red, tap to retry |
| User goes offline during typing | TypingIndicator auto-clears after 4s (no typing_stop event) |
| Chat opened on /login page | Hide FloatingChatButton on /login and /change-password routes |
| Doctor tries to create group with admin | Admin not in getGroupableRoles(doctor) → not visible in member search |
| Empty group name submitted | Inline validation error, no API call |
| Group with 0 members selected | "Add at least one member" blocking error |
| AI response takes > 10s | Typing indicator still showing + "This is taking longer than usual…" text after 8s |
| Overflow of messages | Auto-scroll with useChatScroll — user scrolling up pauses auto-scroll, new message indicator appears at bottom ("↓ New message") |
| Search in DM messages returns 0 results | "No messages found" in text-slate text-[13px] centered |
| Image/file attachments (future) | Not in scope — text "[attachment]" placeholder renders, not a crash |
| Two tabs open in browser | Both connect WS — messages arrive in both (backend handles multiple connections per user) |
| User blocked by RBAC from DM list | Their name simply not in the list — no "Access denied" message (silent exclusion) |
| Very long message | max-w-[72%] wraps naturally, no overflow outside bubble |
| Unread count on floating button | Sum all DM + group unreads. AI tab never contributes to unread count. |

---

## 5. RESPONSIVE (mobile < 640px)

- ChatOverlay: `w-[calc(100vw-24px)] h-[85vh]` positioned bottom-3 right-3
- FloatingChatButton: bottom-4 right-4 (slightly adjusted)
- MessageBubble max-w: 85% (more room on narrow screen)
- GroupCreateModal: full-width bottom sheet on mobile
- No horizontal scroll anywhere in chat

---

## 6. QA FOR PROMPT 2

### Users Tab
[ ] List shows only DM-able users (RBAC filtered — self excluded)
[ ] Search filters instantly (< 50ms) — no API call
[ ] Unread badge shows correct count per user row
[ ] Clicking user opens conversation view smoothly
[ ] Back button returns to user list (no page navigation)
[ ] Typing indicator appears when other user is typing, disappears after 3s
[ ] Read receipts update: grey check → double check → brand double check
[ ] Auto-scroll to bottom on new message if user is near bottom
[ ] User scrolled up → auto-scroll paused → "↓ New message" button appears
[ ] Enter sends, Shift+Enter inserts newline
[ ] Empty input → Send button disabled + opacity-50
[ ] Optimistic: message appears instantly on send, before WS ACK
[ ] Failed message shows red, tap retries

### Groups Tab
[ ] Only user's own groups shown (getMyGroups filters server-side)
[ ] "New Group" button absent for patients (no patients in portal anyway)
[ ] Group avatar shows first letter of group name
[ ] Received messages show sender name above bubble
[ ] Group create: name required, min 1 member required
[ ] Member search filtered by getGroupableRoles — doctor cannot see admin in list
[ ] Removing member chip works before submit
[ ] On group create success: group appears in list, conversation opens

### AI Tab
[ ] Welcome state shown when no messages
[ ] Suggestion chips populate input and send automatically
[ ] Typing indicator shows while awaiting AI response
[ ] "Clear" button resets conversation to welcome state
[ ] AI history sent correctly (last 10 messages as context)
[ ] AI tab unread: never increments floating button badge

### Cross-tab
[ ] Switching tabs preserves scroll position in each (conversation state not lost)
[ ] Total unread on floating button = sum of DM + group unreads only
[ ] WS reconnection banner shows/hides correctly
[ ] Chat overlay closes when X clicked, all state preserved (reopens where left off)
[ ] FloatingChatButton hidden on /login and /change-password routes

---

---

# BACKEND API & WEBSOCKET REQUIREMENTS
## Hand to backend engineer

```
# ─────────────────────────────────────────────────────────────
# WEBSOCKET — SINGLE MULTIPLEXED CONNECTION
# ─────────────────────────────────────────────────────────────

# Endpoint: ws://host/ws/chat/?token=<JWT>
# Authentication: JWT parsed from ?token= query param on connect
# Framework: Django Channels + Redis channel layer
# Protocol: JSON text frames

# Connection lifecycle:
#   On connect: validate JWT, add user to their personal channel group
#               "user_<user_id>" — receives all events for this user
#   On disconnect: remove from all groups, update last_seen

# Incoming message types (from client):
{
  type: "send_message",
  conversation: "dm_<userId>" | "group_<groupId>",
  content: string           # max 5000 chars
}
{
  type: "typing_start",
  conversation: "dm_<userId>" | "group_<groupId>"
}
{
  type: "typing_stop",
  conversation: "dm_<userId>" | "group_<groupId>"
}
{
  type: "mark_read",
  conversation: "dm_<userId>" | "group_<groupId>",
  message_id: number
}

# Outgoing message types (from server to client):
{
  type: "message",
  conversation: "dm_<userId>",
  data: MessageObject
}
{
  type: "group_message",
  conversation: "group_<groupId>",
  data: MessageObject
}
{
  type: "typing",
  conversation: string,
  user_id: number,
  is_typing: boolean
}
{
  type: "read",
  conversation: string,
  user_id: number,
  message_id: number
}
{
  type: "online",
  user_id: number,
  is_online: boolean
}
{
  type: "error",
  code: string,
  message: string
}

# DM routing:
#   send_message to "dm_<targetUserId>" →
#     backend creates Message record →
#     pushes to "user_<senderId>" (for optimistic confirmation) +
#     "user_<targetUserId>" (delivery)

# Group routing (Pub/Sub):
#   send_message to "group_<groupId>" →
#     backend creates GroupMessage record →
#     fans out to all group members' "user_<memberId>" channels
#     via Redis channel layer group "group_<groupId>"
#   On member join: add to Redis group
#   On member leave/remove: remove from Redis group

# Online status:
#   On WS connect: push { type: "online", user_id, is_online: true }
#                  to all users who share a DM or group with this user
#   On WS disconnect: push is_online: false + update user.last_seen

# ─────────────────────────────────────────────────────────────
# REST ENDPOINTS
# ─────────────────────────────────────────────────────────────

# Chat Users
GET /api/chat/users/
  → list of users the current user can DM (role-filtered, excludes self)
  → response: [{ id, full_name, role, email, is_online, last_seen }]
  → RBAC: server enforces same role rules as frontend chatRbac.js

# Conversations
GET /api/chat/conversations/
  → list of existing DM conversations with last message + unread count
  → response: [{
      user_id, user_name, user_role, last_message, last_message_time,
      unread_count, is_online
    }]

# DM History
GET /api/chat/dm/:userId/messages/
  → paginated message history (page_size=30, ordering=-created_at)
  → response: { count, next, previous, results: [MessageObject] }
  → RBAC: only participants of this DM
  → mark all as delivered on fetch

# Groups
GET /api/chat/groups/
  → groups where current user is a member
  → response: [{ id, name, member_count, last_message, unread_count, created_by }]

POST /api/chat/groups/
  → create group
  → body: { name: string, member_ids: number[] }
  → validation: name required, min 1 member, members must pass role restrictions
  → on create: add creator as member + admin of group
  → RBAC: admin, doctor, receptionist only

GET /api/chat/groups/:groupId/messages/
  → paginated group message history
  → RBAC: only group members

POST /api/chat/groups/:groupId/members/
  → body: { user_id: number }
  → RBAC: group creator or admin
  → validation: user role must pass getGroupableRoles check

DELETE /api/chat/groups/:groupId/members/:userId/
  → remove member
  → RBAC: group creator or admin, cannot remove creator

# Message Search
GET /api/chat/search/?conversation=dm_5&q=hello
  → full-text search in message content
  → returns matching MessageObject list (no pagination — max 50 results)

# AI Chat
POST /api/chat/ai/
  → body: { message: string, history: [{role, content}] (last 10) }
  → proxies to OpenAI/Claude API with clinic context system prompt
  → response: { reply: string }
  → not stored in DB (stateless)
  → rate limit: 20 requests per user per hour

# ─────────────────────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────────────────────

# Message (DM)
{
  id:           AutoField
  sender:       ForeignKey(User)
  receiver:     ForeignKey(User)
  content:      TextField (max 5000)
  created_at:   DateTimeField (auto)
  is_read:      BooleanField (default False)
  read_at:      DateTimeField (null)
  status:       CharField choices: sent|delivered|read
}

# GroupMessage
{
  id:           AutoField
  group:        ForeignKey(Group)
  sender:       ForeignKey(User)
  content:      TextField (max 5000)
  created_at:   DateTimeField (auto)
}

# Group
{
  id:           AutoField
  name:         CharField (max 200)
  created_by:   ForeignKey(User)
  created_at:   DateTimeField
  members:      ManyToManyField(User, through=GroupMembership)
}

# GroupMembership
{
  group:        ForeignKey(Group)
  user:         ForeignKey(User)
  joined_at:    DateTimeField
  is_admin:     BooleanField (True for creator)
}

# MessageObject shape (both DM and group):
{
  id:           number,
  sender_id:    number,
  sender_name:  string,
  content:      string,
  created_at:   string (ISO),
  status:       "sent"|"delivered"|"read",   # DM only
  is_read:      boolean,                     # DM only
}

# ─────────────────────────────────────────────────────────────
# RBAC ENFORCEMENT (SERVER-SIDE — mirrors frontend chatRbac.js)
# ─────────────────────────────────────────────────────────────

# DM: any authenticated non-patient user can DM any other non-patient user
# Group creation: admin, doctor, receptionist
# Group membership rules:
#   Admin     → can add: admin, doctor, receptionist
#   Doctor    → can add: doctor, receptionist
#   Receptionist → can add: receptionist, doctor
# Patients: never appear in /api/chat/users/ or any group endpoint

# ─────────────────────────────────────────────────────────────
# DEPENDENCIES TO INSTALL
# ─────────────────────────────────────────────────────────────

  channels==4.0.0
  channels-redis==4.1.0
  redis (server running)
  daphne (ASGI server to replace/wrap gunicorn for WS support)

# settings.py additions:
INSTALLED_APPS += ['channels']
ASGI_APPLICATION = 'mediflow.asgi.application'
CHANNEL_LAYERS = {
  "default": {
    "BACKEND": "channels_redis.core.RedisChannelLayer",
    "CONFIG": { "hosts": [("127.0.0.1", 6379)] }
  }
}
```
