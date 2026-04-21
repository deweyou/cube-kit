export function formatElapsed(ms: number, decimals: 0 | 1 | 2 | 3 = 3): string {
  const totalSeconds = Math.floor(ms / 1000)
  if (decimals === 0) return String(totalSeconds)
  const fractionStr = String(Math.floor(ms % 1000)).padStart(3, '0').slice(0, decimals)
  return `${totalSeconds}.${fractionStr}`
}
