/* src/shared/components/chat/tabs/AITab.jsx - Session-only AI assistant chat tab. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Trash2 } from 'lucide-react'

import MessageBubble from '../MessageBubble'
import MessageInput from '../MessageInput'
import TypingIndicator from '../TypingIndicator'
import { useChatContext } from '@shared/context/ChatContext'
import { sendAIMessage } from '@shared/services/chatApi'

const SUGGESTIONS = [
  "Summarize today's appointments",
  'Who are my highest-risk patients?',
  'Show pending payments',
]

function BotAvatar() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">
      <Bot aria-hidden="true" className="h-3.5 w-3.5" />
    </span>
  )
}

function makeMessage(role, content) {
  return {
    content,
    created_at: new Date().toISOString(),
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sender_id: role === 'user' ? 'user' : 'ai',
    sender_name: role === 'user' ? 'You' : 'AI Assistant',
    status: 'sent',
  }
}

export function AITab() {
  const { liveChatUnavailable } = useChatContext()
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [longWait, setLongWait] = useState(false)
  const requestIdRef = useRef(0)
  const history = useMemo(
    () =>
      messages.slice(-10).map((message) => ({
        content: message.content,
        role: message.sender_id === 'ai' ? 'assistant' : 'user',
      })),
    [messages],
  )

  useEffect(() => {
    if (!isThinking) return undefined

    const timer = window.setTimeout(() => setLongWait(true), 8000)

    return () => window.clearTimeout(timer)
  }, [isThinking])

  async function handleSend(content) {
    const trimmedContent = content.trim()

    if (!trimmedContent || isThinking) {
      return
    }

    const userMessage = makeMessage('user', trimmedContent)

    setMessages((current) => [...current, userMessage])

    if (liveChatUnavailable) {
      setMessages((current) => [
        ...current,
        makeMessage('ai', 'AI assistant is available when a backend session is active.'),
      ])
      return
    }

    setIsThinking(true)
    setLongWait(false)
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    try {
      const response = await sendAIMessage(trimmedContent, history)
      if (requestIdRef.current !== requestId) return

      const reply =
        response?.reply ||
        response?.message ||
        response?.content ||
        'AI assistant is unavailable right now.'

      setMessages((current) => [...current, makeMessage('ai', reply)])
    } catch {
      if (requestIdRef.current !== requestId) return

      setMessages((current) => [
        ...current,
        {
          ...makeMessage('ai', 'AI assistant is unavailable right now.'),
          status: 'failed',
        },
      ])
    } finally {
      if (requestIdRef.current === requestId) {
        setIsThinking(false)
        setLongWait(false)
      }
    }
  }

  function handleClear() {
    requestIdRef.current += 1
    setMessages([])
    setIsThinking(false)
    setLongWait(false)
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline bg-canvas px-4">
        <Bot aria-hidden="true" className="h-[18px] w-[18px] text-brand" />
        <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-900">
          AI Assistant
        </h2>
        <button
          className="rounded-lg p-1.5 text-slate transition hover:bg-mist hover:text-rose-500"
          onClick={handleClear}
          type="button"
        >
          <span className="sr-only">Clear AI conversation</span>
          <Trash2 aria-hidden="true" className="h-[15px] w-[15px]" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !isThinking ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <Bot aria-hidden="true" className="mb-3 h-11 w-11 text-brand/20" />
            <p className="text-[17px] font-semibold text-slate-900">AI Assistant</p>
            <p className="mt-1 max-w-[260px] text-[13px] text-slate">
              Ask me anything about your patients, appointments, or clinic data.
            </p>
            <div className="mt-4 flex max-w-[280px] flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  className="rounded-xl border border-brand/20 bg-brand-light px-3 py-2 text-[12px] font-medium text-brand transition-all duration-150 hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isThinking}
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageBubble
                avatar={<BotAvatar />}
                isSelf={message.sender_id === 'user'}
                key={message.id}
                message={message}
                retryable={false}
                showAvatar={message.sender_id === 'ai'}
              />
            ))}
            {isThinking ? (
              <div className="mt-2">
                <TypingIndicator />
                {longWait ? (
                  <p className="mt-1 px-10 text-[11px] text-slate/60">
                    This is taking longer than usual...
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <MessageInput
        disabled={isThinking}
        onSend={handleSend}
        placeholder="Ask AI..."
      />
    </div>
  )
}

export default AITab
