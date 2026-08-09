const requestStore = new Map();
const MAX_TRACKED_KEYS = 5000;

const cleanupExpiredEntries = (now) => {
  for (const [key, value] of requestStore.entries()) {
    if (value.resetAt <= now) {
      requestStore.delete(key);
    }
  }
};

export const createRateLimiter = ({
  windowMs,
  max,
  keyGenerator,
  message,
}) => {
  return (req, res, next) => {
    const now = Date.now();
    if (requestStore.size >= MAX_TRACKED_KEYS) {
      cleanupExpiredEntries(now);
    }

    const key = keyGenerator(req);

    const current = requestStore.get(key);

    if (!current || current.resetAt <= now) {
      requestStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000)
      );

      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        msg: message,
        retryAfterSeconds,
      });
    }

    current.count += 1;
    requestStore.set(key, current);

    return next();
  };
};
