import { ntn } from "../ntn-fetcher/ntn-fetcher";
import { NotionFetcherDBEntity } from "../ntn-fetcher/ntn-fetcher.entity";
import { handleWebhookVerification } from "../ntn-webhook/ntn-webhook";

export class NotionEngine {
    public db: Record<string, NotionFetcherDBEntity> = {};
    public title2Id: Record<string, string> = {};
    public id2Title: Record<string, string> = {};

    public constructor(dbNames?: string[]) {
        if (dbNames) this.setup(dbNames);
    }

    public async setup(dbNames: string[]) {

        // [Initialized the ID:Entity map]
        for (const dbName of dbNames) {
            const db = await ntn.getDatasourceSchemaByTitle(dbName)
            if (!db) throw new Error(`[NotionEngine.setup] DBName ${dbName} not found`);
            this.db[dbName] = new NotionFetcherDBEntity(db.id);
            this.title2Id[dbName] = db.id;
            this.id2Title[db.id] = dbName;

            console.log(`[NotionEngine.setup] DB [${dbName}] -> [${db.id}] initialized`);
        }
    }

    public async handleWebhook(payload: any, signature: string) {

        try {
            // [1. Verificating the webhook]
            await handleWebhookVerification(payload, signature);

            // [2. Check event type] Only page events are allowed
            if (!["page.content_updated", "page.created", "page.deleted", "page.moved", "page.properties_updated", "page.undeleted"].includes(payload.type)) {
                return;
            }

            // [3. Handling the webhook] Invalidate respective DB cache
            const datasource_id = payload.data?.parent?.data_source_id
            if (!datasource_id) throw new Error(`[NotionEngine.handleWebhook] Datasource ID not found`);

            const dbEntity = this.db[this.id2Title[datasource_id]];
            if (!dbEntity) throw new Error(`[NotionEngine.handleWebhook] DBEntity not found for datasource_id ${datasource_id}`);

            // Cache has been removed, so no need to skip or invalidate it here anymore.

        } catch (error) {
            console.log(error)
        }

    }

}