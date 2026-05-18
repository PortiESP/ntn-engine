import { BlockObjectResponse, BotUserObjectResponse, Client, DataSourceObjectResponse, isFullBlock, MultiSelectPropertyItemObjectResponse, PageObjectResponse, PartialDataSourceObjectResponse, PersonUserObjectResponse, PropertyItemObjectResponse, QueryDataSourceParameters } from "@notionhq/client";
import { T_GenerateTSInterfaceOptions, T_Fetcher_Options } from "./ntn-fetcher.types";
import { config } from "dotenv";
import { richText2String } from "./ntn-fetcher.utils";
import { generateTSInterface } from "./ts_iface_generator.utils";

export class NotionFetcher {
    client: Client;
    options: T_Fetcher_Options;

    constructor(options: T_Fetcher_Options) {
        this.options = options;
        this.client = new Client({
            auth: this.options.notionToken || process.env.NOTION_TOKEN,
        });

        if (!this.client) {
            throw new Error("[NotionDBEngine] Error al inicializar el cliente de Notion.");
        }

    }


    // ============================================================
    // METHODS
    // ============================================================


    // ---------------------- Users ----------------------

    /**
     * Get all users
     * 
     * ⚠️ This method depends on the "User capabilities" configuration to be enabled.
     * 
     */
    async getUsers() {
        return await this.client.users.list({
            page_size: 100,
        }).then((res) => res.results.filter((user) => user.type === 'person') as PersonUserObjectResponse[]);
    }

    /**
     * Get all bots
     * 
     * ⚠️ This method depends on the "User capabilities" configuration to be enabled.
     * 
     */
    async getBots() {
        return await this.client.users.list({
            page_size: 100,
        }).then((res) => res.results.filter((user) => user.type === 'bot') as BotUserObjectResponse[]);
    }

    // ---------------------- Datasources ----------------------

    /**
     * Get all datasources
     */
    async getAllDatasources() {
        return await this.client.search({
            filter: {
                property: 'object',
                value: 'data_source',
            },
        })
            // Parse the results (if callback is provided)
            .then((res) => res.results as DataSourceObjectResponse[]);
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
     * Get a datasource rows by id
     * 
     * @param id - Datasource id
     * @param query - Query parameters
     * 
     * ---
     * 
     * @example
     * 
     * ```typescript
     * const data = await ntn.getDatasourceData('123', {
     *     filter: {
     *         property: 'name',
     *         rich_text: {
     *             equals: 'John',
     *         },
     *     },
     * });
     * ```
     * 
     * @example
     * 
     * ```typescript
     *      const response = await notion.dataSources.query({
     *          data_source_id: "d9824bdc-8445-4327-be8b-5b47500af6ce",
     *          filter: {
     *              property: "Status",
     *              select: { equals: "Done" }
     *          },
     *          sorts: [
     *              {
     *                  property: "Created",
     *                  direction: "descending"
     *              }
     *          ]
     *      })
     * ```
     * 
     * @example Using AND logic in filters
     * 
     * ```typescript
     *      const response = await notion.dataSources.query({
     *          data_source_id: "d9824bdc-8445-4327-be8b-5b47500af6ce",
     *          filter: {
     *              and: [
     *                  {
     *                      property: "Status",
     *                      select: { equals: "Done" }
     *                  },
     *                  {
     *                      property: "Priority",
     *                      select: { equals: "High" }
     *                  }
     *              ]
     *          }
     *      })
     * ```
     * 
     */
    async getDatasourceEntries(id: string, query?: QueryDataSourceParameters) {
        return await this.client.dataSources.query({
            ...query,
            data_source_id: id,
        }).then((res) => res.results) as PageObjectResponse[];
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
    async getAllPages() {
        return await this.client.search({
            filter: {
                property: 'object',
                value: 'page',
            },
        }).then((res) => res.results as PageObjectResponse[]);
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
     * Get a page content by id
     * 
     * @param id - Page id
     */
    async getPageContent(blockId: string) {
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
                if (block.has_children) {
                    item.children = await this.getPageContent(block.id);
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


config()
if (!process.env.NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN not found in environment variables");
}

export const ntn = new NotionFetcher({ notionToken: process.env.NOTION_TOKEN, });


