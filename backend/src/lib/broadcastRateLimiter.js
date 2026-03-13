const RATE_LIMIT_MAX_MESSAGES = 3;
const RATE_LIMIT_WINDOW_MS = 30 * 1000;

const broadcastMessageTimestamps = new Map();

export const checkBroadcastRateLimit = (userId) => {
  const now = Date.now();
  const key = String(userId);
  const timestamps = broadcastMessageTimestamps.get(key) || [];

  const withinWindow = timestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (withinWindow.length >= RATE_LIMIT_MAX_MESSAGES) {
    const earliestTimestamp = withinWindow[0];
    const retryAfterMs = Math.max(
      0,
      RATE_LIMIT_WINDOW_MS - (now - earliestTimestamp)
    );

    return {
      allowed: false,
      retryAfterMs,
      limit: RATE_LIMIT_MAX_MESSAGES,
      windowMs: RATE_LIMIT_WINDOW_MS,
    };
  }

  withinWindow.push(now);
  broadcastMessageTimestamps.set(key, withinWindow);

  return {
    allowed: true,
    retryAfterMs: 0,
    limit: RATE_LIMIT_MAX_MESSAGES,
    windowMs: RATE_LIMIT_WINDOW_MS,
  };
};
