export type T_UploadFileInput =
    | { data: Uint8Array | ArrayBuffer | Buffer; filename: string; name?: string; contentType?: string }
    | { base64: string;                          filename: string; name?: string; contentType?: string }
    | { blob: Blob;                              filename: string; name?: string; contentType?: string }
    | { stream: ReadableStream<Uint8Array>;      filename: string; name?: string; contentType?: string }

export type T_AppendImageOptions = {
    caption?: string;
}

export type T_Fetcher_Options = {
    /** Notion API Token. If omitted, falls back to process.env.NOTION_TOKEN. */
    notionToken?: string;
}

export type T_Cache_Options = {
    /** Enable cache (wether to instantiate cache or not)*/
    enabled?: boolean;
    /** Cache time to live (in seconds) */
    ttl?: number;
}


export type T_GenerateTSInterfaceOptions = {

    /** Prefix to add to the interface name */
    prefix?: string;
    /** Suffix to add to the interface name */
    suffix?: string;

    /** Exclude properties */
    excludeProperties?: string[];

    /** Include only properties */
    includeProperties?: string[];

}
