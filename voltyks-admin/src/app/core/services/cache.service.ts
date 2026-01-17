import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Cache Service - Provides in-memory caching for HTTP responses
 *
 * Features:
 * - TTL (Time-To-Live) based expiration
 * - Pattern-based cache invalidation
 * - Automatic cleanup of expired entries
 * - Type-safe get/set operations
 *
 * Usage:
 * - Cache reference data (brands, protocols, capacities) with longer TTL
 * - Cache list data with shorter TTL
 * - Invalidate related caches after mutations
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();

  // Default TTL: 5 minutes
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000;

  /**
   * Get cached data by key
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with optional TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMs Time-to-live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  /**
   * Check if a valid (non-expired) cache entry exists
   * @param key Cache key
   * @returns true if valid cache entry exists
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate cache entries
   * @param pattern Optional pattern to match keys (partial match). If not provided, clears all cache
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Delete entries matching the pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate a specific cache entry
   * @param key Exact cache key to invalidate
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all expired entries from cache
   * Call this periodically for cleanup if needed
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache size and keys
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
