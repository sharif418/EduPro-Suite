/**
 * Cache Service - Environment-aware export
 * 
 * This file exports the appropriate cache service implementation based on the environment:
 * - Client-side: Uses localStorage for persistence and browser-specific features
 * - Server-side: Uses in-memory cache only (no localStorage access)
 */

// Common types
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  persistent?: boolean; // Whether to persist to localStorage (client-side only)
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Cache service implementation with fallback
class FallbackCacheService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, options: CacheOptions = {}) {
    const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key: string) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

// Cache utilities with fallback
class FallbackCacheUtils {
  private cacheService: FallbackCacheService;

  constructor(cacheService: FallbackCacheService) {
    this.cacheService = cacheService;
  }

  async cacheApiResponse(key: string, fetchFn: () => Promise<any>, ttl = 5 * 60 * 1000) {
    const cached = this.cacheService.get(key);
    if (cached) return cached;

    try {
      const data = await fetchFn();
      this.cacheService.set(key, data, { ttl });
      return data;
    } catch (error) {
      console.error('Cache API response error:', error);
      throw error;
    }
  }

  cacheUserData(userId: string, dataType: string, data: any, ttl = 10 * 60 * 1000) {
    this.cacheService.set(`user:${userId}:${dataType}`, data, { ttl });
  }

  getUserData(userId: string, dataType: string) {
    return this.cacheService.get(`user:${userId}:${dataType}`);
  }

  cacheDashboardData(role: string, userId: string, data: any, ttl = 5 * 60 * 1000) {
    this.cacheService.set(`dashboard:${role}:${userId}`, data, { ttl });
  }

  invalidateDashboardByRole(role: string) {
    // Simple implementation - in production, use proper cache tagging
    console.log(`Invalidating dashboard cache for role: ${role}`);
  }
}

// Initialize services
const fallbackCacheService = new FallbackCacheService();
const fallbackCacheUtils = new FallbackCacheUtils(fallbackCacheService);

// Dynamic import and initialization
let cacheService: any = fallbackCacheService;
let cacheUtils: any = fallbackCacheUtils;

// Initialize proper cache services asynchronously
(async () => {
  try {
    if (isBrowser) {
      // Client-side: Use the full-featured cache service with localStorage support
      try {
        const clientModule = await import('./cache-service.client');
        cacheService = clientModule.cacheService;
        cacheUtils = clientModule.cacheUtils;
      } catch (error) {
        console.warn('Failed to load client cache service, using fallback:', error);
      }
    } else {
      // Server-side: Use the server-safe cache service (no localStorage)
      try {
        const serverModule = await import('./cache-service.server');
        cacheService = serverModule.cacheService;
        cacheUtils = serverModule.cacheUtils;
      } catch (error) {
        console.warn('Failed to load server cache service, using fallback:', error);
      }
    }
  } catch (error) {
    console.warn('Cache service initialization failed, using fallback:', error);
  }
})();

export { cacheService, cacheUtils };
export default cacheService;

// Documentation for usage
/**
 * Usage Examples:
 * 
 * ```typescript
 * import { cacheService, cacheUtils } from '@/app/lib/cache-service';
 * 
 * // Basic usage
 * cacheService.set('key', data, { ttl: 5 * 60 * 1000 }); // 5 minutes
 * const cachedData = cacheService.get('key');
 * 
 * // API response caching
 * const apiData = await cacheUtils.cacheApiResponse('/api/data', fetchData);
 * 
 * // User-specific caching
 * cacheUtils.cacheUserData('user123', 'preferences', userPrefs);
 * const userPrefs = cacheUtils.getUserData('user123', 'preferences');
 * 
 * // Dashboard caching with tags
 * cacheUtils.cacheDashboardData('admin', 'user123', dashboardData);
 * cacheUtils.invalidateDashboardByRole('admin'); // Invalidate all admin dashboards
 * ```
 * 
 * Environment Differences:
 * - Client: Full localStorage persistence, browser-specific cleanup
 * - Server: In-memory only, no localStorage operations, Node.js timers
 */
