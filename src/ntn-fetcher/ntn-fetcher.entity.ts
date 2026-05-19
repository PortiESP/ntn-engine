import { DataSourceObjectResponse, PageObjectResponse, QueryDataSourceParameters } from "@notionhq/client";
import { ntn } from "./ntn-fetcher";
import { T_AppendImageOptions, T_UploadFileInput } from "./ntn-fetcher.types";

export class NotionFetcherDBEntity {
    id: string;

    constructor(id: string) {
        this.id = id;
    }

    async getSchema(): Promise<DataSourceObjectResponse> {
        return ntn.getDatasourceSchema(this.id);
    }

    async getEntries(query?: QueryDataSourceParameters): Promise<PageObjectResponse[]> {
        return ntn.getDatasourceEntries(this.id, query);
    }

    async getEntry(id: string): Promise<PageObjectResponse> {
        return ntn.getDatasourceEntry(id);
    }

    async getEntryContent(id: string) {
        return ntn.getPageContent(id);
    }

    async createEntry(data: any): Promise<PageObjectResponse> {
        return ntn.createDatasourceEntry(this.id, data);
    }

    async updateEntry(id: string, data: any): Promise<PageObjectResponse> {
        return ntn.updateDatasourceEntry(id, data);
    }

    async deleteEntry(id: string): Promise<PageObjectResponse> {
        return ntn.deleteDatasourceEntry(id);
    }

    async appendImageBlock(id: string, input: T_UploadFileInput, options?: T_AppendImageOptions) {
        return ntn.appendImageBlock(id, input, options);
    }

    async setFileProperty(entryId: string, propertyName: string, inputs: T_UploadFileInput[], mode?: "replace" | "append") {
        return ntn.setEntryFileProperty(entryId, propertyName, inputs, mode);
    }

    async generateTSInterface() {
        return ntn.generateTSInterface(this.id);
    }
}
