export class CacheService {
    private cache = new Map<string, { value: any; expiry: number }>();
    private _skipNext: boolean = false;

    /**
     * @param defaultTTL Default Time-To-Live in seconds
     */
    constructor(private defaultTTL: number = 60) {}

    /**
     * Skips the next cache retrieval, forcing a cache miss.
     */
    skipNext(): void {
        this._skipNext = true;
    }

    /**
     * Retrieve a value from the cache. Returns null if missing or expired.
     */
    get<T>(key: string): T | null {
        if (this._skipNext) {
            this._skipNext = false;
            return null;
        }

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
     * Try to get a value from cache. If it misses, execute the fallback function, cache the result, and return it.
     * @param key Unique cache key
     * @param fallback Optional async function to execute if cache misses
     * @param ttl Custom TTL in seconds
     */
    async tryCacheOrFallback<T>(key: string, fallback?: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T | null> {
        const cached = this.get<T>(key);
        if (cached !== null) return cached;

        if (!fallback) return null;

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
