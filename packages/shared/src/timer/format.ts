type ElapsedDecimals = 0 | 1 | 2 | 3;

export const formatElapsed = (ms: number, decimals: 0 | 1 | 2 | 3 = 3): string => {
  const totalSeconds = Math.floor(ms / 1000);
  if (decimals === 0) return String(totalSeconds);
  const fractionStr = String(Math.floor(ms % 1000))
    .padStart(3, '0')
    .slice(0, decimals);
  return `${totalSeconds}.${fractionStr}`;
};

const formatElapsedFraction = (ms: number, decimals: ElapsedDecimals) => {
  if (decimals === 0) return '';

  return `.${String(Math.floor(ms % 1000))
    .padStart(3, '0')
    .slice(0, decimals)}`;
};

export const formatElapsedClock = (ms: number, decimals: ElapsedDecimals = 3): string => {
  const totalSeconds = Math.floor(ms / 1000);

  if (totalSeconds < 60) {
    return formatElapsed(ms, decimals);
  }

  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const fraction = formatElapsedFraction(ms, decimals);
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours === 0) {
    return `${minutes}:${paddedSeconds}${fraction}`;
  }

  return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}${fraction}`;
};
