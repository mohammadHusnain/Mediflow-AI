/* src/shared/services/chatApi.js - Chat REST API helpers. */
import { api } from './api'

const CHAT_PAGE_SIZE = 30

async function unwrap(request) {
  const { data } = await request
  return data
}

export function getChatUsers() {
  return unwrap(api.get('/chat/users/'))
}

export function getDMHistory(userId, page = 1) {
  return unwrap(
    api.get(`/chat/dm/${userId}/messages/`, {
      params: { page, page_size: CHAT_PAGE_SIZE },
    }),
  )
}

export function getConversations() {
  return unwrap(api.get('/chat/conversations/'))
}

export function getMyGroups() {
  return unwrap(api.get('/chat/groups/'))
}

export function getGroupMessages(groupId, page = 1) {
  return unwrap(
    api.get(`/chat/groups/${groupId}/messages/`, {
      params: { page, page_size: CHAT_PAGE_SIZE },
    }),
  )
}

export function createGroup(data) {
  return unwrap(api.post('/chat/groups/', data))
}

export function addGroupMember(groupId, userId) {
  return unwrap(api.post(`/chat/groups/${groupId}/members/`, { user_id: userId }))
}

export function removeGroupMember(groupId, userId) {
  return unwrap(api.delete(`/chat/groups/${groupId}/members/${userId}/`))
}

export function searchMessages(convKey, query) {
  return unwrap(
    api.get('/chat/search/', {
      params: { conversation: convKey, q: query },
    }),
  )
}

export function sendAIMessage(message, history) {
  return unwrap(api.post('/chat/ai/', { message, history }))
}

export function getChatWsUrl() {
  const baseUrl = api.defaults.baseURL || window.location.origin
  const url = new URL(baseUrl, window.location.origin)

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/ws/chat/'
  url.search = ''
  url.hash = ''

  return url.toString()
}
