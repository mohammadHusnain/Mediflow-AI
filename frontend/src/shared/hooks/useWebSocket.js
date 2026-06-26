/* src/shared/hooks/useWebSocket.js - Native WebSocket hook with reconnect and heartbeat. */
import { useCallback, useEffect, useRef, useState } from 'react'

const INITIAL_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000
const HEARTBEAT_MS = 30000

function getAccessToken() {
  return localStorage.getItem('access_token') || localStorage.getItem('access') || ''
}

export function useWebSocket({
  enabled = true,
  onClose,
  onError,
  onMessage,
  onOpen,
  url,
}) {
  const wsRef = useRef(null)
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY)
  const reconnectTimer = useRef(null)
  const heartbeatTimer = useRef(null)
  const shouldReconnect = useRef(true)
  const connectRef = useRef(null)
  const callbacks = useRef({ onClose, onError, onMessage, onOpen })
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    callbacks.current = { onClose, onError, onMessage, onOpen }
  }, [onClose, onError, onMessage, onOpen])

  const clearTimers = useCallback(() => {
    window.clearTimeout(reconnectTimer.current)
    window.clearInterval(heartbeatTimer.current)
    reconnectTimer.current = null
    heartbeatTimer.current = null
  }, [])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }

    return false
  }, [])

  const connect = useCallback(() => {
    if (!enabled || !url) {
      setStatus('disconnected')
      return
    }

    clearTimers()
    shouldReconnect.current = true
    setStatus('connecting')

    const token = getAccessToken()
    const fullUrl = new URL(url)

    if (token) {
      fullUrl.searchParams.set('token', token)
    }

    const socket = new WebSocket(fullUrl.toString())
    wsRef.current = socket

    socket.onopen = () => {
      setStatus('connected')
      reconnectDelay.current = INITIAL_RECONNECT_DELAY
      callbacks.current.onOpen?.()
      heartbeatTimer.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }))
        }
      }, HEARTBEAT_MS)
    }

    socket.onmessage = (event) => {
      try {
        callbacks.current.onMessage?.(JSON.parse(event.data))
      } catch (error) {
        callbacks.current.onError?.(error)
      }
    }

    socket.onclose = (event) => {
      window.clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
      setStatus('disconnected')
      callbacks.current.onClose?.(event)

      if (!shouldReconnect.current || !enabled) {
        return
      }

      const delay = reconnectDelay.current

      reconnectTimer.current = window.setTimeout(() => {
        reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_DELAY)
        connectRef.current?.()
      }, delay)
    }

    socket.onerror = (event) => {
      setStatus('error')
      callbacks.current.onError?.(event)
      socket.close()
    }
  }, [clearTimers, enabled, url])

  const disconnect = useCallback(() => {
    shouldReconnect.current = false
    clearTimers()
    wsRef.current?.close()
    wsRef.current = null
    setStatus('disconnected')
  }, [clearTimers])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    const timer = window.setTimeout(() => connect(), 0)

    return () => {
      window.clearTimeout(timer)
      disconnect()
    }
  }, [connect, disconnect])

  return { disconnect, send, status }
}

export default useWebSocket
