import { ntn } from "../ntn-fetcher/ntn-fetcher";
import { NotionFetcherDBEntity } from "../ntn-fetcher/ntn-fetcher.entity";
import { T_AppendImageOptions, T_Cache_Options, T_UploadFileInput } from "../ntn-fetcher/ntn-fetcher.types";
import { CacheService } from "../services/cache.service";
import { handleWebhookVerification } from "../ntn-webhook/ntn-webhook";

export class NotionEngine {
    public db: Record<string, NotionFetcherDBEntity> = {};
    public title2Id: Record<string, string> = {};
    public id2Title: Record<string, string> = {};
    private cache?: CacheService;

    public constructor(dbNames?: string[]) {
        if (dbNames) this.setup(dbNames);
    }

    public async setup(dbNames: string[], cacheOptions?: T_Cache_Options) {
        this.cache = cacheOptions?.enabled
            ? new CacheService(cacheOptions.ttl ?? 60)
            : undefined;

        for (const dbName of dbNames) {
            const db = await ntn.getDatasourceSchemaByTitle(dbName);
            if (!db) throw new Error(`[NotionEngine.setup] DBName ${dbName} not found`);
            this.db[dbName] = new NotionFetcherDBEntity(db.id);
            this.title2Id[dbName] = db.id;
            this.id2Title[db.id] = dbName;
            console.log(`[NotionEngine.setup] DB [${dbName}] -> [${db.id}] initialized`);
        }
    }

    private invalidate(dbName: string) {
        this.cache?.deleteByPrefix(this.title2Id[dbName]);
    }

    // ---------------------- Read ----------------------

    public async getSchema(dbName: string) {
        const id = this.title2Id[dbName];
        return this.cache
            ? this.cache.tryCacheOrFallback(`${id}:schema`, () => this.db[dbName].getSchema())
            : this.db[dbName].getSchema();
    }

    public async getEntries(dbName: string, query?: any) {
        const id = this.title2Id[dbName];
        const key = `${id}:entries:${JSON.stringify(query ?? null)}`;
        return this.cache
            ? this.cache.tryCacheOrFallback(key, () => this.db[dbName].getEntries(query))
            : this.db[dbName].getEntries(query);
    }

    public async getEntry(dbName: string, entryId: string) {
        const id = this.title2Id[dbName];
        return this.cache
            ? this.cache.tryCacheOrFallback(`${id}:entry:${entryId}`, () => this.db[dbName].getEntry(entryId))
            : this.db[dbName].getEntry(entryId);
    }

    public async getEntryContent(dbName: string, entryId: string) {
        const id = this.title2Id[dbName];
        return this.cache
            ? this.cache.tryCacheOrFallback(`${id}:content:${entryId}`, () => this.db[dbName].getEntryContent(entryId))
            : this.db[dbName].getEntryContent(entryId);
    }

    // ---------------------- Write ----------------------

    public async createEntry(dbName: string, data: any) {
        const result = await this.db[dbName].createEntry(data);
        this.invalidate(dbName);
        return result;
    }

    public async updateEntry(dbName: string, entryId: string, data: any) {
        const result = await this.db[dbName].updateEntry(entryId, data);
        this.invalidate(dbName);
        return result;
    }

    public async deleteEntry(dbName: string, entryId: string) {
        const result = await this.db[dbName].deleteEntry(entryId);
        this.invalidate(dbName);
        return result;
    }

    public async appendImageBlock(dbName: string, entryId: string, input: T_UploadFileInput, options?: T_AppendImageOptions) {
        const result = await this.db[dbName].appendImageBlock(entryId, input, options);
        this.invalidate(dbName);
        return result;
    }

    public async setFileProperty(dbName: string, entryId: string, propertyName: string, inputs: T_UploadFileInput[], mode?: "replace" | "append") {
        const result = await this.db[dbName].setFileProperty(entryId, propertyName, inputs, mode);
        this.invalidate(dbName);
        return result;
    }

    // ---------------------- Webhook ----------------------

    public async handleWebhook(payload: any, signature: string) {
        try {
            await handleWebhookVerification(payload, signature);

            if (!["page.content_updated", "page.created", "page.deleted", "page.moved", "page.properties_updated", "page.undeleted"].includes(payload.type)) {
                return;
            }

            const datasource_id = payload.data?.parent?.data_source_id;
            if (!datasource_id) throw new Error(`[NotionEngine.handleWebhook] Datasource ID not found`);

            const dbName = this.id2Title[datasource_id];
            if (!dbName) throw new Error(`[NotionEngine.handleWebhook] DBEntity not found for datasource_id ${datasource_id}`);

            this.cache?.deleteByPrefix(datasource_id);
        } catch (error) {
            console.log(error);
        }
    }
}
