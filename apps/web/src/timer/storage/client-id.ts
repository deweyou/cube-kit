const getCrypto = (): Crypto | undefined => {
  if (typeof globalThis.crypto === 'undefined') return undefined;
  return globalThis.crypto;
};

const formatBytesAsHex = (bytes: Uint8Array): string => {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const createCryptoRandomToken = (cryptoApi: Crypto): string | undefined => {
  if (typeof cryptoApi.getRandomValues !== 'function') return undefined;
  const bytes = new Uint8Array(8);
  cryptoApi.getRandomValues(bytes);
  return formatBytesAsHex(bytes);
};

const createNonCryptoRandomToken = (): string => {
  const bytes = new Uint8Array(8);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return formatBytesAsHex(bytes);
};

const formatTimestamp = (createdAt: number): string => {
  return Math.max(0, Math.floor(createdAt)).toString(36).padStart(8, '0');
};

export const createClientId = (createdAt = Date.now()): string => {
  const cryptoApi = getCrypto();
  const randomToken = cryptoApi ? createCryptoRandomToken(cryptoApi) : undefined;
  const stableRandomToken = randomToken ?? createNonCryptoRandomToken();

  return `${formatTimestamp(createdAt)}-${stableRandomToken}`;
};
