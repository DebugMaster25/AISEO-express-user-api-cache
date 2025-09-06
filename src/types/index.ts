export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  averageResponseTime: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RateLimitInfo {
  requests: number;
  resetTime: number;
  burstRequests: number;
  burstResetTime: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  responseTime?: number;
}
