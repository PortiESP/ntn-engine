import { DataSourceObjectResponse, PageObjectResponse, QueryDataSourceParameters } from "@notionhq/client";
import { ntn } from "./ntn-fetcher";

export class NotionFetcherDBEntity {
    id: string;

    constructor(id: string) {
        this.id = id;
    }

    async getSchema(): Promise<DataSourceObjectResponse> {
        return await ntn.getDatasourceSchema(this.id);
    }

    async getEntries(query?: QueryDataSourceParameters): Promise<PageObjectResponse[]> {
        return await ntn.getDatasourceEntries(this.id, query);
    }

    async getEntry(id: string): Promise<PageObjectResponse> {
        return await ntn.getDatasourceEntry(id);
    }

    async getEntryContent(id: string) {
        return await ntn.getPageContent(id);
    }

    // Any operation that mutates the db should fetch always from notion and invalidate any cached data.

    async deleteEntry(id: string): Promise<PageObjectResponse> {
        return await ntn.deleteDatasourceEntry(id);
    }

    async updateEntry(id: string, data: any): Promise<PageObjectResponse> {
        return await ntn.updateDatasourceEntry(id, data);
    }

    async createEntry(data: any): Promise<PageObjectResponse> {
        return await ntn.createDatasourceEntry(this.id, data);
    }

    // Utils
    async generateTSInterface() {
        return await ntn.generateTSInterface(this.id);
    }

}