import { BlockObjectResponse, BotUserObjectResponse, Client, DataSourceObjectResponse, isFullBlock, MultiSelectPropertyItemObjectResponse, PageObjectResponse, PartialDataSourceObjectResponse, PersonUserObjectResponse, PropertyItemObjectResponse, QueryDataSourceParameters } from "@notionhq/client";
import { T_AppendImageOptions, T_GenerateTSInterfaceOptions, T_Fetcher_Options, T_UploadFileInput } from "./ntn-fetcher.types.js";
import { config } from "dotenv";
import { richText2String } from "../utils/ntn-fetcher.utils.js";
import { generateTSInterface } from "./ts_iface_generator.utils.js";

export class NotionFetcher {
    client: Client;
    options: T_Fetcher_Options;

    /** Maps datasource ID → parent database ID. Populated automatically by `getAllDatasources()`. */
    public dsId2DbId: Record<string, string> = {};

    constructor(options: T_Fetcher_Options = {}) {
        this.options = options;
        this.client = new Client({
            auth: this.options.notionToken || process.env.NOTION_TOKEN,
        });
    }


    // ============================================================
    // METHODS
    // ============================================================


    // ---------------------- Users ----------------------

    /** ⚠️ Requires "User capabilities" to be enabled on the integration. */
    async getUsers() {
        return await this.client.users.list({
            page_size: 100,
        }).then((res) => res.results.filter((user) => user.type === 'person') as PersonUserObjectResponse[]);
    }

    /** ⚠️ Requires "User capabilities" to be enabled on the integration. */
    async getBots() {
        return await this.client.users.list({
            page_size: 100,
        }).then((res) => res.results.filter((user) => user.type === 'bot') as BotUserObjectResponse[]);
    }

    // ---------------------- Datasources ----------------------

    /**
     * Get all datasources
     */
    async getAllDatasources(): Promise<DataSourceObjectResponse[]> {
        const results: DataSourceObjectResponse[] = [];
        let cursor: string | undefined;
        do {
            const res = await this.client.search({
                filter: { property: "object", value: "data_source" },
                start_cursor: cursor,
            });
            results.push(...(res.results as DataSourceObjectResponse[]));
            cursor = res.next_cursor ?? undefined;
        } while (cursor);

        for (const ds of results) {
            const dbId = (ds as any).database_parent?.database_id;
            if (dbId) this.dsId2DbId[ds.id] = dbId;
        }

        return results;
    }

    /**
     * Get a datasource schema by title
     */
    async getDatasourceSchemaByTitle(title: string) {
        return await this.client.search({
            filter: {
                property: 'object',
                value: 'data_source',
            },
        })
            .then((res) => res.results.find((ds: any) => richText2String(ds.title) === title) as DataSourceObjectResponse);
    }

    /**
     * Get all entries in a datasource (handles pagination automatically).
     *
     * @param id    - Datasource id
     * @param query - Optional filter/sort parameters
     */
    async getDatasourceEntries(id: string, query?: QueryDataSourceParameters): Promise<PageObjectResponse[]> {
        const results: PageObjectResponse[] = [];
        let cursor: string | undefined;
        do {
            const res = await this.client.dataSources.query({
                ...query,
                data_source_id: id,
                start_cursor: cursor,
            });
            results.push(...(res.results as PageObjectResponse[]));
            cursor = res.next_cursor ?? undefined;
        } while (cursor);
        return results;
    }

    /**
     * Get a datasource row by id
     * 
     * @param id - Datasource row id
     */
    async getDatasourceEntry(id: string) {
        return await this.client.pages.retrieve({
            page_id: id,
        }) as PageObjectResponse;
    }

    /**
     * Get a datasource schema (and information such as parent, title, icon, etc) by id
     */
    async getDatasourceSchema(id: string) {
        return await this.client.dataSources.retrieve({
            data_source_id: id,
        }) as DataSourceObjectResponse;
    }

    /**
     * Delete a datasource row by id
     * 
     * @param id - Datasource row id
     */
    async deleteDatasourceEntry(id: string) {
        return await this.client.pages.update({
            page_id: id,
            in_trash: true,
        }) as PageObjectResponse;
    }

    /**
     * Update a datasource row by id
     * 
     * @param id - Datasource row id
     * @param data - Data to update
     */
    async updateDatasourceEntry(id: string, data: any) {
        return await this.client.pages.update({
            page_id: id,
            properties: data,
        }) as PageObjectResponse;
    }

    /**
     * Create a new datasource row
     * 
     * @param id - Datasource id
     * @param data - Data to create
     */
    async createDatasourceEntry(id: string, data: any) {
        return await this.client.pages.create({
            parent: {
                data_source_id: id,
            },
            properties: data,
        }) as PageObjectResponse;
    }


    // ---------------------- Pages ----------------------

    /**
     * Get all pages
     * 
     * @param query - Query parameters
     */
    async getAllPages(): Promise<PageObjectResponse[]> {
        const results: PageObjectResponse[] = [];
        let cursor: string | undefined;
        do {
            const res = await this.client.search({
                filter: { property: "object", value: "page" },
                start_cursor: cursor,
            });
            results.push(...(res.results as PageObjectResponse[]));
            cursor = res.next_cursor ?? undefined;
        } while (cursor);
        return results;
    }

    /**
     * Get a page by id
     * 
     * @param id - Page id
     */
    async getPage(id: string) {

        return await this.client.pages.retrieve({
            page_id: id,
        }) as PageObjectResponse;
    }

    /**
     * Delete a page by id
     * 
     * @param id - Page id
     */
    async deletePage(id: string) {
        return await this.client.pages.update({
            page_id: id,
            in_trash: true,
        }) as PageObjectResponse;
    }

    /**
     * Update a page by id
     * 
     * @param id - Page id
     * @param data - Data to update
     */
    async updatePage(id: string, data: any) {
        return await this.client.pages.update({
            page_id: id,
            properties: data,
        }) as PageObjectResponse;
    }

    /**
     * Create a new page
     * 
     * @param id - Page id
     * @param data - Data to create
     */
    async createPage(id: string, data: any) {
        return await this.client.pages.create({
            parent: {
                page_id: id,
            },
            properties: data,
        }) as PageObjectResponse;
    }

    // ---------------------- Page content ----------------------

    /**
     * Get a page content by id.
     *
     * @param blockId   - Page or block id
     * @param recursive - When `true` (default), nested children are pre-loaded recursively.
     *                    Pass `false` to fetch only direct children of the given block.
     */
    async getPageContent(blockId: string, recursive: boolean = true): Promise<BlockObjectResponse[]> {
        const blocks: BlockObjectResponse[] = [];
        let cursor;

        do {
            const response = await this.client.blocks.children.list({
                block_id: blockId,
                start_cursor: cursor,
                page_size: 100,
            });

            for (const block of response.results) {
                if (!isFullBlock(block)) continue;
                const item: any = { ...block };
                if (recursive && block.has_children) {
                    item.children = await this.getPageContent(block.id, recursive);
                }
                blocks.push(item);
            }

            cursor = response.next_cursor;
        } while (cursor);

        return blocks;
    }

    /**
     * Create a new page content
     * 
     * @param id - Page id
     * @param data - Data to create
     */
    async appendPageContent(id: string, data: any) {
        return await this.client.blocks.children.append({
            block_id: id,
            children: data,
        });
    }

    /**
     * Delete a page content by id
     * 
     * @param id - Page content id
     */
    async deletePageContent(id: string) {
        return await this.client.blocks.delete({
            block_id: id,
        });
    }

    /**
     * Update a page content by id
     * 
     * @param id - Page content id
     * @param data - Data to update
     */
    async updatePageContent(id: string, data: any) {
        return await this.client.blocks.update({
            block_id: id,
            ...data,
        });
    }

    // ---------------------- File uploads ----------------------

    /**
     * Upload a file to Notion and return its file upload ID.
     * Accepts binary data (Uint8Array / ArrayBuffer / Buffer), a base64 string, a Blob, or a ReadableStream.
     */
    async uploadFile(input: T_UploadFileInput): Promise<string> {
        const filename    = input.name ?? input.filename;
        const contentType = input.contentType ?? mimeFromExt(input.filename);

        let blob: Blob;

        if ("blob" in input) {
            blob = input.blob.type ? input.blob : new Blob([input.blob], { type: contentType });
        } else if ("base64" in input) {
            const binary = atob(input.base64);
            const bytes  = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            blob = new Blob([bytes], { type: contentType });
        } else if ("stream" in input) {
            blob = await new Response(input.stream).blob();
            if (blob.type !== contentType) blob = blob.slice(0, blob.size, contentType);
        } else {
            // Cast needed: TypeScript narrows Uint8Array to ArrayBufferLike which doesn't satisfy BlobPart, but Blob() accepts it fine at runtime
            blob = new Blob([input.data as ArrayBuffer], { type: contentType });
        }

        const slot = await this.client.fileUploads.create({ filename, content_type: contentType });
        await this.client.fileUploads.send({ file_upload_id: slot.id, file: { filename, data: blob } });
        return slot.id;
    }

    /**
     * Upload an image and append it as a block to a page.
     *
     * @param pageId  - Target page / block id
     * @param input   - Local file path or Buffer
     * @param options - Optional caption
     */
    async appendImageBlock(pageId: string, input: T_UploadFileInput, options?: T_AppendImageOptions): Promise<void> {
        const uploadId = await this.uploadFile(input);
        const caption  = options?.caption
            ? [{ type: "text" as const, text: { content: options.caption } }]
            : [];

        await this.appendPageContent(pageId, [{
            type: "image",
            image: { type: "file_upload", file_upload: { id: uploadId }, caption },
        }]);
    }

    /**
     * Upload one or more files and set them on a `files`-type property of a datasource entry.
     *
     * @param pageId       - Entry (page) id
     * @param propertyName - Name of the files property in the datasource
     * @param inputs       - One or more files to upload
     * @param mode         - "replace" clears existing files; "append" adds to them (default: "replace")
     */
    async setEntryFileProperty(
        pageId: string,
        propertyName: string,
        inputs: T_UploadFileInput[],
        mode: "replace" | "append" = "replace",
    ): Promise<PageObjectResponse> {
        const uploadIds = await Promise.all(inputs.map(f => this.uploadFile(f)));

        const newFiles = uploadIds.map((id, idx) => {
            const input    = inputs[idx];
            const filename = input.name ?? input.filename;
            return { type: "file_upload" as const, file_upload: { id }, name: filename };
        });

        if (mode === "append") {
            const page = await this.client.pages.retrieve({ page_id: pageId }) as PageObjectResponse;
            const prop = (page.properties as any)[propertyName];
            const existing: any[] = prop?.type === "files" ? prop.files : [];
            newFiles.unshift(...existing);
        }

        return this.updateDatasourceEntry(pageId, { [propertyName]: { files: newFiles } });
    }

    // ---------------------- Generated TS Interface ----------------------

    /**
     * Generate a TS interface for a datasource
     * 
     * @param id - Datasource id
     */
    async generateTSInterface(id: string, options?: T_GenerateTSInterfaceOptions) {
        const schema = await this.getDatasourceSchema(id);
        return generateTSInterface(schema, options);
    }

}


const MIME: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif",  webp: "image/webp", svg: "image/svg+xml",
    pdf: "application/pdf", mp4: "video/mp4", mp3: "audio/mpeg",
};
function mimeFromExt(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return MIME[ext] ?? "application/octet-stream";
}

config();

// Pre-built singleton for Node.js environments.
// Reads NOTION_TOKEN from process.env (populated by dotenv above).
// In framework environments (Astro, Vite, …) this import is safe even without NOTION_TOKEN set —
// the token is validated only when the first API call is made.
// To use a different token or env var name, instantiate directly:
//   new NotionFetcher({ notionToken: import.meta.env.NOTION_TOKEN })
export const ntn = new NotionFetcher();


