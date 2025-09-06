import { CacheEntry, CacheStats } from '../types';

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    averageResponseTime: 0
  };
  private responseTimes: number[] = [];
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttl: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }

    // Update access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
    
    this.stats.hits++;
    return entry.data;
  }

  set(key: string, value: T, customTtl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl: customTtl || this.ttl
    };

    // If key already exists, update it
    if (this.cache.has(key)) {
      this.cache.set(key, entry);
      this.removeFromAccessOrder(key);
      this.accessOrder.push(key);
      return;
    }

    // If cache is full, remove least recently used item
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.size = this.cache.size;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for average calculation
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    
    this.stats.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  // Background cleanup of expired entries
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleanedCount++;
      }
    }
    
    this.stats.size = this.cache.size;
    return cleanedCount;
  }

  // Get all keys for debugging
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}
