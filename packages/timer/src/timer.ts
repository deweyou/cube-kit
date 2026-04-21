export type TimerState =
  | { status: 'idle' }
  | { status: 'running'; startTime: number }
  | { status: 'stopped'; elapsed: number }

export interface Timer {
  getState(): TimerState
  start(): void
  stop(): number
  reset(): void
}

export function createTimer(): Timer {
  let state: TimerState = { status: 'idle' }

  return {
    getState(): TimerState {
      return state
    },
    start(): void {
      if (state.status !== 'idle') return
      state = { status: 'running', startTime: performance.now() }
    },
    stop(): number {
      if (state.status !== 'running') return 0
      const elapsed = performance.now() - state.startTime
      state = { status: 'stopped', elapsed }
      return elapsed
    },
    reset(): void {
      state = { status: 'idle' }
    },
  }
}
