/**
 * In-memory sliding-window rate limiter for NutriGenius AI
 * Protects endpoints and respects upstream API limits without requiring Redis.
 */
function createRateLimiter({ windowMs = 60 * 1000, maxRequests = 150, message = 'Too many requests, please try again later.' } = {}) {
  const requestLogs = new Map();

  // Periodic cleanup of stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestLogs.entries()) {
      const activeTimestamps = timestamps.filter(ts => now - ts < windowMs);
      if (activeTimestamps.length === 0) {
        requestLogs.delete(ip);
      } else {
        requestLogs.set(ip, activeTimestamps);
      }
    }
  }, 5 * 60 * 1000).unref(); // unref so it won't block process exit

  return function rateLimiter(req, res, next) {
    let ip = '127.0.0.1';
    try {
      ip = req.ip || (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || 'unknown';
    } catch {
      ip = '127.0.0.1';
    }

    const now = Date.now();
    const clientTimestamps = requestLogs.get(ip) || [];
    const validTimestamps = clientTimestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const oldestValid = validTimestamps[0];
      const retryAfterSec = Math.ceil((windowMs - (now - oldestValid)) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message,
        retryAfterSeconds: retryAfterSec
      });
    }

    validTimestamps.push(now);
    requestLogs.set(ip, validTimestamps);
    next();
  };
}

module.exports = createRateLimiter;
