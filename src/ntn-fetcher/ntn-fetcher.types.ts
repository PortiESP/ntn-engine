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

export type T_PageIcon =
    | { type: 'emoji'; emoji: string }
    | { type: 'external'; external: { url: string } }
    | { type: 'file_upload'; file_upload: { id: string } }
    | null;

export type T_PageCover =
    | { type: 'external'; external: { url: string } }
    | { type: 'file_upload'; file_upload: { id: string } }
    | null;

/** Structured data object accepted by all page write methods. */
export type T_PageData = {
    properties?: Record<string, any>;
    icon?: T_PageIcon;
    cover?: T_PageCover;
    archived?: boolean;
    in_trash?: boolean;
};
