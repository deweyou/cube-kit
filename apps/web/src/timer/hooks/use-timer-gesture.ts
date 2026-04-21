import { useEffect, useRef, useState } from 'react'

export interface TimerGestureOptions {
  onStart: () => void
  onStop: () => void
  onCancel: () => void
  cancelZoneHeight?: number
}

export const useTimerGesture = (
  isRunning: boolean,
  { onStart, onStop, onCancel, cancelZoneHeight = 80 }: TimerGestureOptions,
): { isInCancelZone: boolean } => {
  const [isInCancelZone, setIsInCancelZone] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRunningRef = useRef(isRunning)
  const onStartRef = useRef(onStart)
  const onStopRef = useRef(onStop)
  const onCancelRef = useRef(onCancel)

  // Keep refs current so event listeners don't capture stale closures
  isRunningRef.current = isRunning
  onStartRef.current = onStart
  onStopRef.current = onStop
  onCancelRef.current = onCancel

  useEffect(() => {
    // ── Desktop: Space key ───────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (!isRunningRef.current) {
        e.preventDefault()
        onStartRef.current()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (isRunningRef.current) {
        e.preventDefault()
        onStopRef.current()
      }
    }

    // ── H5: touch events ──────────────────────────
    const handleTouchStart = (_e: TouchEvent) => {
      if (isRunningRef.current) return
      longPressTimerRef.current = setTimeout(() => {
        onStartRef.current()
      }, 300)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isRunningRef.current) return
      const touch = e.changedTouches[0]
      setIsInCancelZone(touch.clientY < cancelZoneHeight)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel pending long-press
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      if (!isRunningRef.current) return

      const touch = e.changedTouches[0]
      setIsInCancelZone(false)
      if (touch.clientY < cancelZoneHeight) {
        onCancelRef.current()
      } else {
        onStopRef.current()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      if (longPressTimerRef.current !== null) clearTimeout(longPressTimerRef.current)
    }
  }, [cancelZoneHeight])

  return { isInCancelZone }
}
