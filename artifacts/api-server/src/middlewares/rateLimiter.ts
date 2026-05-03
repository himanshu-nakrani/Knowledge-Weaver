import type { Request, Response, NextFunction } from "express";

const windowMap = new Map<string, number[]>();

export function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    const now = Date.now();
    const cutoff = now - windowMs;

    const times = (windowMap.get(ip) ?? []).filter((t) => t > cutoff);

    if (times.length >= maxRequests) {
      res.status(429).json({
        error: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s.`,
        retryAfter: Math.ceil((times[0] - cutoff) / 1000),
      });
      return;
    }

    times.push(now);
    windowMap.set(ip, times);

    // Periodic cleanup to prevent memory growth
    if (Math.random() < 0.005) {
      for (const [k, v] of windowMap.entries()) {
        if (v.filter((t) => t > cutoff).length === 0) windowMap.delete(k);
      }
    }

    next();
  };
}
