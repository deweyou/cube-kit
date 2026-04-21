import { useState, useCallback } from 'react'
import { getScramble } from '@cubekit/scramble'
import type { WcaEventId } from '@cubekit/scramble'
import { useTimer } from './hooks/use-timer'
import { useTimerGesture } from './hooks/use-timer-gesture'
import { ScrambleView } from './views/scramble-view'
import { TimingView } from './views/timing-view'
import { ResultView } from './views/result-view'

type PageState = 'scramble' | 'timing' | 'result'

const generateScramble = (eventId: WcaEventId) => getScramble(eventId)

export const TimerPage = () => {
  const [eventId, setEventId] = useState<WcaEventId>('333')
  const [scramble, setScramble] = useState(() => generateScramble('333'))
  const [pageState, setPageState] = useState<PageState>('scramble')
  const [finalElapsed, setFinalElapsed] = useState(0)

  const { elapsed, start, stop, reset } = useTimer()

  const handleStart = useCallback(() => {
    start()
    setPageState('timing')
  }, [start])

  const handleStop = useCallback(() => {
    const ms = stop()
    setFinalElapsed(ms)
    setPageState('result')
  }, [stop])

  const handleCancel = useCallback(() => {
    reset()
    setPageState('scramble')
    // Same scramble — user returns to review it
  }, [reset])

  const handleContinue = useCallback(() => {
    reset()
    setScramble(generateScramble(eventId))
    setPageState('scramble')
  }, [reset, eventId])

  const handleDiscard = useCallback(() => {
    reset()
    setScramble(generateScramble(eventId))
    setPageState('scramble')
  }, [reset, eventId])

  const handleRefresh = useCallback(() => {
    setScramble(generateScramble(eventId))
  }, [eventId])

  const handleEventChange = useCallback((id: WcaEventId) => {
    setEventId(id)
    setScramble(generateScramble(id))
  }, [])

  const { isInCancelZone } = useTimerGesture(pageState === 'timing', {
    onStart: handleStart,
    onStop: handleStop,
    onCancel: handleCancel,
  })

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {pageState === 'scramble' && (
        <ScrambleView
          eventId={eventId}
          scramble={scramble}
          onEventChange={handleEventChange}
          onRefresh={handleRefresh}
        />
      )}
      {pageState === 'timing' && (
        <TimingView elapsed={elapsed} isInCancelZone={isInCancelZone} />
      )}
      {pageState === 'result' && (
        <ResultView
          elapsed={finalElapsed}
          scramble={scramble}
          onContinue={handleContinue}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  )
}
