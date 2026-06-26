/* src/shared/components/chat/MessageInput.jsx - Auto-growing chat composer. */
import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

export function MessageInput({
  disabled = false,
  onSend,
  onTypingChange,
  placeholder = 'Message...',
  value: controlledValue,
}) {
  const [internalValue, setInternalValue] = useState('')
  const value = controlledValue ?? internalValue
  const textareaRef = useRef(null)
  const stopTypingTimer = useRef(null)
  const lastTypingStart = useRef(0)
  const canSend = value.trim().length > 0 && !disabled

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`
  }, [value])

  useEffect(() => {
    return () => window.clearTimeout(stopTypingTimer.current)
  }, [])

  function updateValue(nextValue) {
    if (controlledValue === undefined) {
      setInternalValue(nextValue)
    }
  }

  function notifyTyping(nextValue) {
    if (!onTypingChange) {
      return
    }

    const now = Date.now()

    if (nextValue.trim() && now - lastTypingStart.current > 2000) {
      onTypingChange(true)
      lastTypingStart.current = now
    }

    window.clearTimeout(stopTypingTimer.current)
    stopTypingTimer.current = window.setTimeout(() => {
      onTypingChange(false)
      lastTypingStart.current = 0
    }, 2000)
  }

  function handleSend() {
    if (!canSend) {
      return
    }

    onSend?.(value)
    updateValue('')
    onTypingChange?.(false)
    lastTypingStart.current = 0
    window.clearTimeout(stopTypingTimer.current)
  }

  return (
    <div className="flex shrink-0 items-end gap-2 border-t border-hairline bg-canvas px-3 py-2">
      <textarea
        className="max-h-[96px] min-h-[40px] flex-1 resize-none overflow-y-auto rounded-xl border-none bg-mist px-4 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate/50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onBlur={() => onTypingChange?.(false)}
        onChange={(event) => {
          updateValue(event.target.value)
          notifyTyping(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSend()
          }
        }}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />
      <button
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brandDark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canSend}
        onClick={handleSend}
        type="button"
      >
        <span className="sr-only">Send message</span>
        <Send aria-hidden="true" className="h-4 w-4 -rotate-45" />
      </button>
    </div>
  )
}

export default MessageInput
