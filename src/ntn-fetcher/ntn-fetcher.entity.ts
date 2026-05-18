import { DataSourceObjectResponse, PageObjectResponse, QueryDataSourceParameters } from "@notionhq/client";
import { ntn } from "./ntn-fetcher";
import { T_Cache_Options } from "./ntn-fetcher.types";
import { CacheService } from "../services/cache.service";

export class NotionFetcherDBEntity {
    id: string;

    // Cache
    private cacheService?: CacheService;

    constructor(id: string, cache?: T_Cache_Options) {
        this.id = id;

        if (cache?.enabled) {
            // Instantiate cache class with provided TTL or default 60s
            this.cacheService = new CacheService(cache.ttl || 60);
        }
    }


    async getSchema(): Promise<DataSourceObjectResponse> {
        return this.executeWithCache(`schema_${this.id}`, () => ntn.getDatasourceSchema(this.id));
    }

    async getEntries(query?: QueryDataSourceParameters): Promise<PageObjectResponse[]> {
        const cacheKey = `entries_${this.id}_${query ? JSON.stringify(query) : 'all'}`;
        // Skip cache if user passes a specific query
        return this.executeWithCache(cacheKey, () => ntn.getDatasourceEntries(this.id, query), !!query);
    }

    async getEntry(id: string): Promise<PageObjectResponse> {
        return this.executeWithCache(`entry_${id}`, () => ntn.getDatasourceEntry(id));
    }

    // Any operation that mutates the db should fetch always from notion and invalidate any cached data.

    async deleteEntry(id: string): Promise<PageObjectResponse> {
        this.cacheService?.delete("entry_" + id);
        this.cacheService?.deleteByPrefix("entries_" + this.id);
        return await ntn.deleteDatasourceEntry(id);
    }

    async updateEntry(id: string, data: any): Promise<PageObjectResponse> {
        this.cacheService?.delete("entry_" + id);
        this.cacheService?.deleteByPrefix("entries_" + this.id);
        return await ntn.updateDatasourceEntry(id, data);
    }

    async createEntry(data: any): Promise<PageObjectResponse> {
        this.cacheService?.deleteByPrefix("entries_" + this.id);
        return await ntn.createDatasourceEntry(this.id, data);
    }

    // Utils
    async generateTSInterface() {
        return await ntn.generateTSInterface(this.id);
    }

    // ================================ Cache ====================================

    skipCache(): this {
        this.cacheService?.skipNext();
        return this;
    }

    private async executeWithCache<T>(key: string, fetchFn: () => Promise<T>, skipNextCache: boolean = false): Promise<T> {
        if (this.cacheService) {
            if (skipNextCache) this.cacheService.skipNext();
            return await this.cacheService.tryCacheOrFallback(key, fetchFn) as T;
        }
        return await fetchFn();
    }

}