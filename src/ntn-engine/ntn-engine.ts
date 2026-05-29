import { PageObjectResponse } from "@notionhq/client";
import { ntn } from "../ntn-fetcher/ntn-fetcher.js";
import { T_AppendImageOptions, T_Cache_Options, T_UploadFileInput } from "../ntn-fetcher/ntn-fetcher.types.js";
import { CacheService } from "../services/cache.service.js";
import { handleWebhookVerification } from "../ntn-webhook/ntn-webhook.js";
import { richText2String } from "../utils/ntn-fetcher.utils.js";

export class NotionEngine {
    public title2Id: Record<string, string> = {};
    public id2Title: Record<string, string> = {};
    private cache?: CacheService;

    public constructor(cacheOptions?: T_Cache_Options) {
        if (cacheOptions?.enabled) {
            this.cache = new CacheService(cacheOptions.ttl ?? 60);
        }
    }

    /**
     * Resolves a database title to its Notion ID.
     * On the first call for a given title, fetches all datasources and populates
     * the title↔ID maps so subsequent calls are instant.
     */
    private async resolveId(dbName: string): Promise<string> {
        if (this.title2Id[dbName]) return this.title2Id[dbName];

        const datasources = await ntn.getAllDatasources();
        for (const ds of datasources) {
            const title = richText2String((ds as any).title);
            this.title2Id[title] = ds.id;
            this.id2Title[ds.id]  = title;
        }

        const id = this.title2Id[dbName];
        if (!id) throw new Error(`[NotionEngine] Database "${dbName}" not found in workspace`);
        return id;
    }

    private invalidate(id: string): void {
        this.cache?.deleteByPrefix(id);
    }

    /**
     * Finds an entry in the database whose title property matches `title`.
     * Fetches all entries and filters client-side — use `*ById` methods when you
     * already have the page ID to skip this lookup.
     */
    private async findEntryByTitle(dbName: string, title: string): Promise<PageObjectResponse> {
        const entries = await this.getEntries(dbName);
        const entry = entries.find(e => {
            const titleProp = Object.values(e.properties).find(p => p.type === "title");
            if (!titleProp || titleProp.type !== "title") return false;
            return richText2String(titleProp.title) === title;
        });
        if (!entry) throw new Error(`[NotionEngine] Entry "${title}" not found in "${dbName}"`);
        return entry;
    }

    // ---------------------- Read ----------------------

    /**
     * Returns all blocks of a page with nested children pre-loaded recursively.
     * Use when you have a page ID but no database context.
     */
    public async getPageContent(pageId: string) {
        return ntn.getPageContent(pageId);
    }

    public async getSchema(dbName: string) {
        const id = await this.resolveId(dbName);
        return this.cache
            ? this.cache.tryCacheOrFallback(`${id}:schema`, () => ntn.getDatasourceSchema(id))
            : ntn.getDatasourceSchema(id);
    }

    public async getEntries(dbName: string, query?: any) {
        const id  = await this.resolveId(dbName);
        const key = `${id}:entries:${JSON.stringify(query ?? null)}`;
        return this.cache
            ? this.cache.tryCacheOrFallback(key, () => ntn.getDatasourceEntries(id, query))
            : ntn.getDatasourceEntries(id, query);
    }

    /**
     * Returns a single entry whose page title matches `title`.
     * Fetches all entries first — use `getEntryById` when you have the page ID.
     */
    public async getEntry(dbName: string, title: string) {
        const entry = await this.findEntryByTitle(dbName, title);
        return this.getEntryById(dbName, entry.id);
    }

    /**
     * Returns a single entry by its Notion page ID.
     */
    public async getEntryById(dbName: string, entryId: string) {
        const id = await this.resolveId(dbName);
        return this.cache
            ? this.cache.tryCacheOrFallback(`${id}:entry:${entryId}`, () => ntn.getDatasourceEntry(entryId))
            : ntn.getDatasourceEntry(entryId);
    }

    /**
     * Returns the block content of the entry whose page title matches `title`.
     * Fetches all entries first — use `getEntryContentById` when you have the page ID.
     */
    public async getEntryContent(dbName: string, title: string) {
        const entry = await this.findEntryByTitle(dbName, title);
        return this.getEntryContentById(dbName, entry.id);
    }

    /**
     * Returns the block content of an entry by its Notion page ID.
     */
    public async getEntryContentById(dbName: string, entryId: string) {
        const id = await this.resolveId(dbName);
        return this.cache
            ? this.cache.tryCacheOrFallback(`${id}:content:${entryId}`, () => ntn.getPageContent(entryId))
            : ntn.getPageContent(entryId);
    }

    // ---------------------- Write ----------------------

    public async createEntry(dbName: string, data: any) {
        const id     = await this.resolveId(dbName);
        const result = await ntn.createDatasourceEntry(id, data);
        this.invalidate(id);
        return result;
    }

    /**
     * Updates the entry whose page title matches `title`.
     * Fetches all entries first — use `updateEntryById` when you have the page ID.
     */
    public async updateEntry(dbName: string, title: string, data: any) {
        const entry = await this.findEntryByTitle(dbName, title);
        return this.updateEntryById(dbName, entry.id, data);
    }

    /**
     * Updates an entry by its Notion page ID.
     */
    public async updateEntryById(dbName: string, entryId: string, data: any) {
        const id     = await this.resolveId(dbName);
        const result = await ntn.updateDatasourceEntry(entryId, data);
        this.invalidate(id);
        return result;
    }

    /**
     * Deletes (moves to trash) the entry whose page title matches `title`.
     * Fetches all entries first — use `deleteEntryById` when you have the page ID.
     */
    public async deleteEntry(dbName: string, title: string) {
        const entry = await this.findEntryByTitle(dbName, title);
        return this.deleteEntryById(dbName, entry.id);
    }

    /**
     * Deletes (moves to trash) an entry by its Notion page ID.
     */
    public async deleteEntryById(dbName: string, entryId: string) {
        const id     = await this.resolveId(dbName);
        const result = await ntn.deleteDatasourceEntry(entryId);
        this.invalidate(id);
        return result;
    }

    /**
     * Uploads an image and appends it as a block to the entry whose page title matches `title`.
     * Fetches all entries first — use `appendImageBlockById` when you have the page ID.
     */
    public async appendImageBlock(dbName: string, title: string, input: T_UploadFileInput, options?: T_AppendImageOptions) {
        const entry = await this.findEntryByTitle(dbName, title);
        return this.appendImageBlockById(dbName, entry.id, input, options);
    }

    /**
     * Uploads an image and appends it as a block to an entry by its Notion page ID.
     */
    public async appendImageBlockById(dbName: string, entryId: string, input: T_UploadFileInput, options?: T_AppendImageOptions) {
        const id     = await this.resolveId(dbName);
        const result = await ntn.appendImageBlock(entryId, input, options);
        this.invalidate(id);
        return result;
    }

    /**
     * Uploads files and sets them on a `files`-type property of the entry whose page title matches `title`.
     * Fetches all entries first — use `setFilePropertyById` when you have the page ID.
     */
    public async setFileProperty(dbName: string, title: string, propertyName: string, inputs: T_UploadFileInput[], mode?: "replace" | "append") {
        const entry = await this.findEntryByTitle(dbName, title);
        return this.setFilePropertyById(dbName, entry.id, propertyName, inputs, mode);
    }

    /**
     * Uploads files and sets them on a `files`-type property of an entry by its Notion page ID.
     */
    public async setFilePropertyById(dbName: string, entryId: string, propertyName: string, inputs: T_UploadFileInput[], mode?: "replace" | "append") {
        const id     = await this.resolveId(dbName);
        const result = await ntn.setEntryFileProperty(entryId, propertyName, inputs, mode);
        this.invalidate(id);
        return result;
    }

    // ---------------------- Webhook ----------------------

    public async handleWebhook(payload: any, signature: string) {
        await handleWebhookVerification(payload, signature);

        if (!["page.content_updated", "page.created", "page.deleted", "page.moved", "page.properties_updated", "page.undeleted"].includes(payload.type)) {
            return;
        }

        const datasource_id = payload.data?.parent?.data_source_id;
        if (!datasource_id) throw new Error(`[NotionEngine.handleWebhook] Datasource ID not found`);

        const dbName = this.id2Title[datasource_id];
        if (!dbName) throw new Error(`[NotionEngine.handleWebhook] Database not found for datasource_id: ${datasource_id}`);

        this.cache?.deleteByPrefix(datasource_id);
    }
}
