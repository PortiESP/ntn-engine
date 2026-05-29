export class CacheService {
    private cache = new Map<string, { value: any; expiry: number }>();

    /**
     * @param defaultTTL Default Time-To-Live in seconds
     */
    constructor(private defaultTTL: number = 60) {}

    /**
     * Retrieve a value from the cache. Returns null if missing or expired.
     */
    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value as T;
    }

    /**
     * Returns the cached value if present; otherwise runs the fallback, caches the result, and returns it.
     * @param key      Unique cache key
     * @param fallback Async function that produces the value on a cache miss
     * @param ttl      Custom TTL in seconds
     */
    async tryCacheOrFallback<T>(key: string, fallback: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) return cached;

        const result = await fallback();
        this.set(key, result, ttl);
        return result;
    }

    /**
     * Store a value in the cache.
     * @param key Unique cache key
     * @param value The value to store
     * @param ttl Custom TTL in seconds. Defaults to instance defaultTTL.
     */
    set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
        this.cache.set(key, {
            value,
            expiry: Date.now() + (ttl * 1000)
        });
    }

    /**
     * Remove a specific key from the cache.
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Remove all keys that start with a specific prefix.
     */
    deleteByPrefix(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cached items.
     */
    clear(): void {
        this.cache.clear();
    }
}
