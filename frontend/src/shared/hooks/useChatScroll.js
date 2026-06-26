/* src/shared/hooks/useChatScroll.js - Keeps active chat views near the latest message. */
import { useCallback, useEffect, useRef, useState } from 'react'

export function useChatScroll(messages, hasMore, onLoadMore) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [hasNewBelow, setHasNewBelow] = useState(false)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
    setHasNewBelow(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (autoScroll) {
        bottomRef.current?.scrollIntoView({
          behavior: messages?.length > 1 ? 'smooth' : 'auto',
          block: 'end',
        })
        setHasNewBelow(false)
      } else if (messages?.length) {
        setHasNewBelow(true)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [autoScroll, messages?.length])

  const onScroll = useCallback(
    (event) => {
      const element = event.target
      const nearBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight < 80

      setAutoScroll(nearBottom)

      if (nearBottom) {
        setHasNewBelow(false)
      }

      if (element.scrollTop <= 4 && hasMore) {
        onLoadMore?.()
      }
    },
    [hasMore, onLoadMore],
  )

  return {
    autoScroll,
    bottomRef,
    containerRef,
    hasNewBelow,
    onScroll,
    scrollToBottom,
  }
}

export default useChatScroll
