
export type T_Fetcher_Options = {
    /** Notion API Token */
    notionToken: string;
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
