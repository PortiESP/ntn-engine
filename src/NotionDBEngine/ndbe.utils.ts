import { RichTextItemResponse } from "@notionhq/client";

export function normalizeId(id: string): string {
    return id.replace(/-/g, '');
}

export function richText2String(richText: RichTextItemResponse[]): string {
    return richText.map((rt) => rt.plain_text).join("");
}


export const PROPERTY_ITEM_OBJECT_RESPONSE = [
    "NumberPropertyItemObjectResponse",
    "FormulaPropertyItemObjectResponse",
    "SelectPropertyItemObjectResponse",
    "MultiSelectPropertyItemObjectResponse",
    "StatusPropertyItemObjectResponse",
    "RelationPropertyItemObjectResponse",
    "RollupPropertyItemObjectResponse",
    "UniqueIdPropertyItemObjectResponse",
    "TitlePropertyItemObjectResponse",
    "RichTextPropertyItemObjectResponse",
    "UrlPropertyItemObjectResponse",
    "PeoplePropertyItemObjectResponse",
    "FilesPropertyItemObjectResponse",
    "EmailPropertyItemObjectResponse",
    "PhoneNumberPropertyItemObjectResponse",
    "DatePropertyItemObjectResponse",
    "CheckboxPropertyItemObjectResponse",
    "CreatedByPropertyItemObjectResponse",
    "CreatedTimePropertyItemObjectResponse",
    "LastEditedByPropertyItemObjectResponse",
    "LastEditedTimePropertyItemObjectResponse"
]