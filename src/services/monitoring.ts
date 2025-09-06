import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import logger from '../utils/logger';

// Enable default metrics collection
collectDefaultMetrics();

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits'
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses'
});

export const cacheSize = new Gauge({
  name: 'cache_size',
  help: 'Current cache size'
});

export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limit_type']
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const asyncQueueSize = new Gauge({
  name: 'async_queue_size',
  help: 'Current size of async processing queue'
});

export const asyncPendingRequests = new Gauge({
  name: 'async_pending_requests',
  help: 'Number of pending async requests'
});

// Performance tracking
export class PerformanceTracker {
  private responseTimes: number[] = [];
  private errorCount = 0;
  private requestCount = 0;

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  getStats(): {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      totalRequests: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      averageResponseTime: this.responseTimes.length > 0 
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
        : 0,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0
    };
  }

  reset(): void {
    this.responseTimes = [];
    this.errorCount = 0;
    this.requestCount = 0;
  }
}

export const performanceTracker = new PerformanceTracker();

// Health check metrics
export const healthCheck = new Gauge({
  name: 'health_check',
  help: 'Health check status (1 = healthy, 0 = unhealthy)'
});

// Set initial health status
healthCheck.set(1);

// Export metrics endpoint
export const getMetrics = async (): Promise<string> => {
  try {
    return await register.metrics();
  } catch (error) {
    logger.error('Failed to collect metrics:', error);
    throw error;
  }
};

// Update cache metrics
export const updateCacheMetrics = (hits: number, misses: number, size: number): void => {
  cacheHits.inc(hits);
  cacheMisses.inc(misses);
  cacheSize.set(size);
};

// Update rate limit metrics
export const updateRateLimitMetrics = (limitType: string): void => {
  rateLimitHits.inc({ limit_type: limitType });
};

// Update async processing metrics
export const updateAsyncMetrics = (queueSize: number, pendingRequests: number): void => {
  asyncQueueSize.set(queueSize);
  asyncPendingRequests.set(pendingRequests);
};
