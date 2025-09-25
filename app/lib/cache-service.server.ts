import Redis from 'ioredis';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  persistent?: boolean; // Whether to persist to localStorage (client-side only)
}

class ServerCacheService {
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private isRedisHealthy = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  private maxMemoryCacheSize = 1000;

  constructor() {
    this.initializeRedis();
    this.startCleanupInterval();
  }

  private async initializeRedis() {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.log('[CACHE_SERVICE] Redis URL not configured, using in-memory cache only');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        reconnectOnError: (err: any) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redis.on('connect', () => {
        console.log('[CACHE_SERVICE] Redis connected');
        this.isRedisHealthy = true;
      });

      this.redis.on('ready', () => {
        console.log('[CACHE_SERVICE] Redis ready');
        this.isRedisHealthy = true;
      });

      this.redis.on('error', (err: any) => {
        console.error('[CACHE_SERVICE] Redis error:', err.message);
        this.isRedisHealthy = false;
        this.scheduleRetry();
      });

      this.redis.on('close', () => {
        console.log('[CACHE_SERVICE] Redis connection closed');
        this.isRedisHealthy = false;
        this.scheduleRetry();
      });

      this.redis.on('reconnecting', () => {
        console.log('[CACHE_SERVICE] Redis reconnecting...');
      });

      // Test connection
      await this.redis.ping();
      this.isRedisHealthy = true;
      console.log('[CACHE_SERVICE] Redis cache service initialized');

    } catch (error) {
      console.error('[CACHE_SERVICE] Failed to initialize Redis:', error);
      this.isRedisHealthy = false;
      this.redis = null;
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    if (this.retryTimeout) return;

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      console.log('[CACHE_SERVICE] Retrying Redis connection...');
      this.initializeRedis();
    }, 5000);
  }

  private startCleanupInterval() {
    // Clean up expired memory cache items every 5 minutes
    setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }

  private cleanupMemoryCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // If memory cache is too large, remove oldest items
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.memoryCache.size - this.maxMemoryCacheSize);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
      cleaned += toRemove.length;
    }

    if (cleaned > 0) {
      console.log(`[CACHE_SERVICE] Cleaned up ${cleaned} expired/excess cache items`);
    }
  }

  async set(key: string, data: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    const ttlSeconds = Math.ceil(ttl / 1000);

    // Try Redis first
    if (this.redis && this.isRedisHealthy) {
      try {
        const serialized = JSON.stringify({ data, timestamp: Date.now() });
        await this.redis.setex(key, ttlSeconds, serialized);
        return;
      } catch (error) {
        console.error('[CACHE_SERVICE] Redis set error:', error);
        this.isRedisHealthy = false;
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  async get(key: string): Promise<any> {
    // Try Redis first
    if (this.redis && this.isRedisHealthy) {
      try {
        const result = await this.redis.get(key);
        if (result) {
          const parsed = JSON.parse(result);
          return parsed.data;
        }
      } catch (error) {
        console.error('[CACHE_SERVICE] Redis get error:', error);
        this.isRedisHealthy = false;
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.data;
  }

  async delete(key: string): Promise<void> {
    // Try Redis first
    if (this.redis && this.isRedisHealthy) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('[CACHE_SERVICE] Redis delete error:', error);
        this.isRedisHealthy = false;
      }
    }

    // Also remove from memory cache
    this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    // Try Redis first
    if (this.redis && this.isRedisHealthy) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.error('[CACHE_SERVICE] Redis clear error:', error);
        this.isRedisHealthy = false;
      }
    }

    // Also clear memory cache
    this.memoryCache.clear();
  }

  async has(key: string): Promise<boolean> {
    // Try Redis first
    if (this.redis && this.isRedisHealthy) {
      try {
        const exists = await this.redis.exists(key);
        return exists === 1;
      } catch (error) {
        console.error('[CACHE_SERVICE] Redis exists error:', error);
        this.isRedisHealthy = false;
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    const item = this.memoryCache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key);
      return false;
    }

    return true;
  }

  getStats() {
    return {
      backend: this.isRedisHealthy ? 'redis' : 'memory',
      redisHealthy: this.isRedisHealthy,
      memoryCacheSize: this.memoryCache.size,
      maxMemoryCacheSize: this.maxMemoryCacheSize,
    };
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const data = await fetchFn();
    await this.set(key, data, options);
    return data;
  }

  async setWithTags(key: string, data: any, tags: string[], options: CacheOptions = {}): Promise<void> {
    await this.set(key, data, options);
    
    // Store tag associations for invalidation
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await this.get(tagKey) || [];
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await this.set(tagKey, taggedKeys, { ttl: options.ttl });
      }
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await this.get(tagKey) || [];
      
      for (const key of taggedKeys) {
        await this.delete(key);
      }
      
      await this.delete(tagKey);
    }
  }
}

class ServerCacheUtils {
  private cacheService: ServerCacheService;

  constructor(cacheService: ServerCacheService) {
    this.cacheService = cacheService;
  }

  async cacheApiResponse(key: string, fetchFn: () => Promise<any>, ttl = 5 * 60 * 1000) {
    return this.cacheService.getOrSet(key, fetchFn, { ttl });
  }

  async cacheUserData(userId: string, dataType: string, data: any, ttl = 10 * 60 * 1000) {
    await this.cacheService.set(`user:${userId}:${dataType}`, data, { ttl });
  }

  async getUserData(userId: string, dataType: string) {
    return this.cacheService.get(`user:${userId}:${dataType}`);
  }

  async cacheDashboardData(role: string, userId: string, data: any, ttl = 5 * 60 * 1000) {
    const key = `dashboard:${role}:${userId}`;
    await this.cacheService.setWithTags(key, data, [`dashboard:${role}`, `user:${userId}`], { ttl });
  }

  async invalidateDashboardByRole(role: string) {
    await this.cacheService.invalidateByTags([`dashboard:${role}`]);
  }

  async invalidateUserCache(userId: string) {
    await this.cacheService.invalidateByTags([`user:${userId}`]);
  }

  getStats() {
    return this.cacheService.getStats();
  }
}

// Initialize services
const cacheService = new ServerCacheService();
const cacheUtils = new ServerCacheUtils(cacheService);

export { cacheService, cacheUtils };
