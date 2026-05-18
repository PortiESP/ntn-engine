import { RichTextItemResponse } from "@notionhq/client";

export function normalizeId(id: string): string {
    return id.replace(/-/g, '');
}

export function richText2String(richText: RichTextItemResponse[]): string {
    return richText.map((rt) => rt.plain_text).join("");
}


export const PROPERTY_ITEM_OBJECT_RESPONSE = [
    "NumberDatabasePropertyConfigResponse",
    "FormulaDatabasePropertyConfigResponse",
    "SelectDatabasePropertyConfigResponse",
    "MultiSelectDatabasePropertyConfigResponse",
    "StatusDatabasePropertyConfigResponse",
    "RelationDatabasePropertyConfigResponse",
    "RollupDatabasePropertyConfigResponse",
    "UniqueIdDatabasePropertyConfigResponse",
    "TitleDatabasePropertyConfigResponse",
    "RichTextDatabasePropertyConfigResponse",
    "UrlDatabasePropertyConfigResponse",
    "PeopleDatabasePropertyConfigResponse",
    "FilesDatabasePropertyConfigResponse",
    "EmailDatabasePropertyConfigResponse",
    "PhoneNumberDatabasePropertyConfigResponse",
    "DateDatabasePropertyConfigResponse",
    "CheckboxDatabasePropertyConfigResponse",
    "CreatedByDatabasePropertyConfigResponse",
    "CreatedTimeDatabasePropertyConfigResponse",
    "LastEditedByDatabasePropertyConfigResponse",
    "LastEditedTimeDatabasePropertyConfigResponse"
]