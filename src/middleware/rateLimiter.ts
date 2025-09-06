import { Request, Response, NextFunction } from 'express';
import { RateLimitInfo } from '../types';

interface RateLimitStore {
  [key: string]: RateLimitInfo;
}

export class AdvancedRateLimiter {
  private store: RateLimitStore = {};
  private readonly maxRequestsPerMinute = 10;
  private readonly burstCapacity = 5;
  private readonly burstWindow = 10000; // 10 seconds
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = this.getClientId(req);
      const now = Date.now();
      
      let rateLimitInfo = this.store[clientId];
      
      if (!rateLimitInfo) {
        rateLimitInfo = {
          requests: 0,
          resetTime: now + 60000, // 1 minute from now
          burstRequests: 0,
          burstResetTime: now + this.burstWindow
        };
        this.store[clientId] = rateLimitInfo;
      }

      // Check if we need to reset the minute window
      if (now >= rateLimitInfo.resetTime) {
        rateLimitInfo.requests = 0;
        rateLimitInfo.resetTime = now + 60000;
      }

      // Check if we need to reset the burst window
      if (now >= rateLimitInfo.burstResetTime) {
        rateLimitInfo.burstRequests = 0;
        rateLimitInfo.burstResetTime = now + this.burstWindow;
      }

      // Check burst limit first (more restrictive)
      if (rateLimitInfo.burstRequests >= this.burstCapacity) {
        const retryAfter = Math.ceil((rateLimitInfo.burstResetTime - now) / 1000);
        return res.status(429).json({
          success: false,
          error: 'Too many requests in burst window. Please slow down.',
          retryAfter,
          limitType: 'burst'
        });
      }

      // Check minute limit
      if (rateLimitInfo.requests >= this.maxRequestsPerMinute) {
        const retryAfter = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Too many requests per minute.',
          retryAfter,
          limitType: 'minute'
        });
      }

      // Increment counters
      rateLimitInfo.requests++;
      rateLimitInfo.burstRequests++;

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': this.maxRequestsPerMinute.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.maxRequestsPerMinute - rateLimitInfo.requests).toString(),
        'X-RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
        'X-Burst-Limit': this.burstCapacity.toString(),
        'X-Burst-Remaining': Math.max(0, this.burstCapacity - rateLimitInfo.burstRequests).toString(),
        'X-Burst-Reset': new Date(rateLimitInfo.burstResetTime).toISOString()
      });

      next();
    };
  }

  private getClientId(req: Request): string {
    // Use IP address as client identifier
    // In production, you might want to use user ID or API key
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [clientId, info] of Object.entries(this.store)) {
      if (now >= info.resetTime && now >= info.burstResetTime) {
        delete this.store[clientId];
      }
    }
  }

  // Get current rate limit status for a client
  getStatus(clientId: string): RateLimitInfo | null {
    return this.store[clientId] || null;
  }

  // Clean up resources
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
