/**
 * 🛡️ Nexus Mind Vault - Serverless Cloud Functions Rate Limiting Engine
 * 
 * Provides high-performance, sliding-window rate limiting directly within Cloud Functions
 * to defend Gemini API quotas against direct HTTPS invocation bypass and denial-of-service.
 */

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

// In-memory sliding-window token storage
const rateLimitStore = new Map<string, RateLimitBucket>();

// Periodic garbage collection for expired buckets
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredBuckets() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

/**
 * Checks rate limit for an incoming Cloud Function request.
 * 
 * @param req The Cloud Function Request object
 * @param uid Optional authenticated user ID
 * @param maxRequests Maximum allowed requests within window
 * @param windowMs Time window in milliseconds (default: 60s)
 */
export function checkCloudRateLimit(
  req: any,
  uid?: string,
  maxRequests = 30,
  windowMs = 60 * 1000
): RateLimitResult {
  cleanupExpiredBuckets();

  // Extract client IP address from standard headers
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : req.ip || req.connection?.remoteAddress || 'unknown-client';

  // Key prioritizes authenticated UID, falling back to client IP
  const rateLimitKey = uid ? `uid:${uid}` : `ip:${clientIp}`;

  const now = Date.now();
  let bucket = rateLimitStore.get(rateLimitKey);

  if (!bucket || now > bucket.resetTime) {
    bucket = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(rateLimitKey, bucket);
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: bucket.resetTime,
      retryAfterSeconds: 0,
    };
  }

  bucket.count += 1;
  const remaining = Math.max(0, maxRequests - bucket.count);
  const retryAfterSeconds = Math.ceil((bucket.resetTime - now) / 1000);

  if (bucket.count > maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: bucket.resetTime,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  return {
    allowed: true,
    limit: maxRequests,
    remaining,
    resetTime: bucket.resetTime,
    retryAfterSeconds: 0,
  };
}

/**
 * Applies standard HTTP rate-limit response headers and returns true if request was blocked.
 */
export function applyRateLimitGuard(
  req: any,
  res: any,
  uid?: string,
  maxRequests = 30,
  windowMs = 60 * 1000
): boolean {
  const result = checkCloudRateLimit(req, uid, maxRequests, windowMs);

  res.setHeader('X-RateLimit-Limit', result.limit.toString());
  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfterSeconds.toString());
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please retry after ${result.retryAfterSeconds} seconds.`,
      code: 'rate-limit-exceeded',
      retryAfter: result.retryAfterSeconds,
    });
    return true;
  }

  return false;
}
