# MediFlow Chat Implementation

Short frontend summary of the chat feature work.

## Changed Existing Files

- `src/app/main.jsx`
  - Added `ChatProvider`, `FloatingChatButton`, and `ChatOverlay` globally inside the authenticated app provider stack.

- `src/shared/components/SkeletonRow.jsx`
  - Added a `chat` skeleton variant for chat user rows, group rows, and message loading states.

## Added Chat State, API, And Hooks

- `src/shared/context/ChatContext.jsx`
  - Global chat state for overlay open state, tabs, active conversation, messages, groups, users, unread counts, typing users, online users, and WebSocket status.

- `src/shared/services/chatApi.js`
  - REST helpers for chat users, conversations, DM history, groups, group messages, message search, AI chat, and WebSocket URL derivation.

- `src/shared/hooks/useWebSocket.js`
  - Native WebSocket connection with token auth, reconnect backoff, heartbeat, send helper, and clean teardown.

- `src/shared/hooks/useChatScroll.js`
  - Auto-scroll behavior, top-load trigger, and new-message indicator support.

- `src/shared/lib/chatUtils.js`
  - Conversation keys, time formatting, message grouping, message normalization helpers, and chat name/id helpers.

- `src/shared/lib/chatRbac.js`
  - Frontend DM and group-member filtering rules for admin, doctor, and receptionist roles.

## Added Chat UI Components

- `src/shared/components/chat/FloatingChatButton.jsx`
  - Global bottom-right launcher with unread badge and pulse on new unread messages.

- `src/shared/components/chat/ChatOverlay.jsx`
  - Floating chat panel with header, tabs, responsive sizing, and route hiding for `/login` and `/change-password`.

- `src/shared/components/chat/ChatTabBar.jsx`
  - Users, Groups, and AI tab switcher.

- `src/shared/components/chat/ConversationView.jsx`
  - Shared DM/group conversation UI with header, message search, reconnect banner, messages, load-more, typing indicator, and composer.

- `src/shared/components/chat/MessageInput.jsx`
  - Auto-growing textarea, Enter-to-send, Shift+Enter newline, typing events, and send button.

- `src/shared/components/chat/MessageBubble.jsx`
  - Sent/received bubbles, search highlighting, grouped-message spacing, failed-message styling, and retry affordance.

- `src/shared/components/chat/ChatAvatar.jsx`
  - Chat avatar using the existing avatar color hash plus online indicator.

- `src/shared/components/chat/ReadReceipts.jsx`
  - Sending, sent, delivered, read, and failed visual states.

- `src/shared/components/chat/TypingIndicator.jsx`
  - Animated three-dot typing bubble.

- `src/shared/components/chat/OnlineStatus.jsx`
  - Online and last-seen label.

- `src/shared/components/chat/UnreadBadge.jsx`
  - Compact unread count badge.

- `src/shared/components/chat/GroupCreateModal.jsx`
  - Group creation modal with name validation, RBAC-filtered member search, selected chips, and submit flow.

## Added Chat Tabs

- `src/shared/components/chat/tabs/UsersTab.jsx`
  - DM user list, local search, unread rows, RBAC-filtered users, and DM conversation view.

- `src/shared/components/chat/tabs/GroupsTab.jsx`
  - Group list, group search, group creation entry point, unread rows, and group conversation view.

- `src/shared/components/chat/tabs/AITab.jsx`
  - Session-only AI assistant chat with welcome state, suggestion chips, clear action, long-wait text, and AI response handling.

## Notes

- Chat is disabled gracefully in public testing or no-token mode; no fake chat data was added.
- Backend chat endpoints and `/ws/chat/` are expected to be provided separately.
- Existing modified dashboard files in the worktree were not part of this chat implementation.
