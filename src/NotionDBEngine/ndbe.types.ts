
export type T_NDBE_Options = {

    /** Notion API Token */
    notionToken: string;

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
