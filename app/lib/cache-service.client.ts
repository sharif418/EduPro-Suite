'use client';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  persistent?: boolean; // Whether to persist to localStorage
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.startCleanup();
    
    // Load persistent cache from localStorage if available
    if (typeof window !== 'undefined') {
      this.loadPersistentCache();
    }
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const timestamp = Date.now();

    const cacheItem: CacheItem<T> = {
      data,
      timestamp,
      ttl,
      key,
    };

    // Check cache size limit
    if (this.cache.size >= (options.maxSize || this.maxSize)) {
      this.evictOldest();
    }

    this.cache.set(key, cacheItem);

    // Persist to localStorage if requested
    if (options.persistent && typeof window !== 'undefined') {
      try {
        const persistentData = {
          ...cacheItem,
          persistent: true,
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(persistentData));
      } catch (error) {
        console.warn('Failed to persist cache item to localStorage:', error);
      }
    }
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Get or set a value (useful for caching API responses)
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch new data
    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      console.error(`Failed to fetch data for cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a specific cache item
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    // Remove from localStorage if it exists
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cache_${key}`);
      } catch (error) {
        console.warn('Failed to remove cache item from localStorage:', error);
      }
    }

    return deleted;
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    this.cache.clear();
    
    // Clear persistent cache from localStorage
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear persistent cache:', error);
      }
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
    oldestItem: string | null;
    newestItem: string | null;
  } {
    const items = Array.from(this.cache.values());
    const now = Date.now();
    
    // Calculate memory usage (approximate)
    const memoryUsage = JSON.stringify(Array.from(this.cache.entries())).length;
    
    // Find oldest and newest items
    const sortedByTime = items.sort((a, b) => a.timestamp - b.timestamp);
    const oldestItem = sortedByTime[0]?.key || null;
    const newestItem = sortedByTime[sortedByTime.length - 1]?.key || null;

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      memoryUsage,
      oldestItem,
      newestItem,
    };
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Invalidate cache items matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Refresh a cache item by re-fetching its data
   */
  async refresh<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    this.delete(key);
    return this.getOrSet(key, fetcher, options);
  }

  /**
   * Set cache with tags for group invalidation
   */
  setWithTags<T>(key: string, data: T, tags: string[], options: CacheOptions = {}): void {
    this.set(key, data, options);
    
    // Store tag associations
    tags.forEach(tag => {
      const tagKey = `tag_${tag}`;
      const taggedKeys = this.get<string[]>(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        this.set(tagKey, taggedKeys, { ttl: 24 * 60 * 60 * 1000 }); // Tags live for 24 hours
      }
    });
  }

  /**
   * Invalidate all cache items with specific tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;

    tags.forEach(tag => {
      const tagKey = `tag_${tag}`;
      const taggedKeys = this.get<string[]>(tagKey) || [];
      
      taggedKeys.forEach(key => {
        if (this.delete(key)) {
          invalidated++;
        }
      });

      // Remove the tag itself
      this.delete(tagKey);
    });

    return invalidated;
  }

  /**
   * Private method to evict oldest cache item
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Start automatic cleanup of expired items
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Cleanup every minute
  }

  /**
   * Clean up expired cache items
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`[CACHE_CLEANUP] Removed ${expiredKeys.length} expired items`);
    }
  }

  /**
   * Load persistent cache from localStorage
   */
  private loadPersistentCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          const cacheKey = key.replace('cache_', '');
          const itemData = localStorage.getItem(key);
          
          if (itemData) {
            const item = JSON.parse(itemData);
            
            // Check if item is still valid
            if (Date.now() - item.timestamp <= item.ttl) {
              this.cache.set(cacheKey, item);
            } else {
              // Remove expired persistent item
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }

  /**
   * Destroy the cache service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Export cache service and utility functions
export { cacheService };

// Utility functions for common caching patterns
export const cacheUtils = {
  /**
   * Cache API response with automatic key generation
   */
  cacheApiResponse: async <T>(
    url: string, 
    fetcher: () => Promise<T>, 
    ttl: number = 5 * 60 * 1000
  ): Promise<T> => {
    const key = `api_${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
    return cacheService.getOrSet(key, fetcher, { ttl });
  },

  /**
   * Cache user-specific data
   */
  cacheUserData: <T>(
    userId: string, 
    dataType: string, 
    data: T, 
    ttl: number = 10 * 60 * 1000
  ): void => {
    const key = `user_${userId}_${dataType}`;
    cacheService.set(key, data, { ttl, persistent: true });
  },

  /**
   * Get user-specific cached data
   */
  getUserData: <T>(userId: string, dataType: string): T | null => {
    const key = `user_${userId}_${dataType}`;
    return cacheService.get<T>(key);
  },

  /**
   * Cache dashboard data with role-based keys
   */
  cacheDashboardData: <T>(
    role: string, 
    userId: string, 
    data: T, 
    ttl: number = 2 * 60 * 1000
  ): void => {
    const key = `dashboard_${role}_${userId}`;
    cacheService.setWithTags(key, data, [`dashboard`, `role_${role}`, `user_${userId}`], { ttl });
  },

  /**
   * Invalidate all dashboard cache for a role
   */
  invalidateDashboardByRole: (role: string): number => {
    return cacheService.invalidateByTags([`role_${role}`]);
  },

  /**
   * Invalidate all dashboard cache for a user
   */
  invalidateDashboardByUser: (userId: string): number => {
    return cacheService.invalidateByTags([`user_${userId}`]);
  },

  /**
   * Cache form data temporarily
   */
  cacheFormData: <T>(formId: string, data: T, ttl: number = 30 * 60 * 1000): void => {
    const key = `form_${formId}`;
    cacheService.set(key, data, { ttl, persistent: true });
  },

  /**
   * Get cached form data
   */
  getFormData: <T>(formId: string): T | null => {
    const key = `form_${formId}`;
    return cacheService.get<T>(key);
  },
};

export default cacheService;
