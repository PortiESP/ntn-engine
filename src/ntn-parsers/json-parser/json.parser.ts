import { BlockObjectResponse } from "@notionhq/client";
import { richText2String } from "../../utils/ntn-fetcher.utils.js";
import { T_ParsedBlock } from "../ntn-parsers.types.js";

export function parsePlainJSON(blocks: BlockObjectResponse[], groupLists = true): T_ParsedBlock[] {
    const result: T_ParsedBlock[] = [];
    let i = 0;

    while (i < blocks.length) {
        const block = blocks[i];

        // Group consecutive list items into a single object
        if (groupLists && (block.type === "bulleted_list_item" || block.type === "numbered_list_item")) {
            const groupType  = block.type;
            const listType   = groupType === "bulleted_list_item" ? "bulleted_list" as const : "numbered_list" as const;
            const items: T_ParsedBlock[] = [];

            while (i < blocks.length && blocks[i].type === groupType) {
                const item = blocks[i];
                const itemChildren: BlockObjectResponse[] = (item as any).children ?? [];
                // Children of a list item are already implicitly nested — no need to re-wrap in bulleted_list/numbered_list
                const parsedChildren = itemChildren.length > 0 ? parsePlainJSON(itemChildren, false) : undefined;

                if (item.type === "bulleted_list_item") {
                    items.push({ type: "bulleted_list_item", text: richText2String(item.bulleted_list_item.rich_text), children: parsedChildren });
                } else if (item.type === "numbered_list_item") {
                    items.push({ type: "numbered_list_item", text: richText2String(item.numbered_list_item.rich_text), children: parsedChildren });
                }
                i++;
            }

            result.push({ type: listType, items });
            continue;
        }

        const children: BlockObjectResponse[] = (block as any).children ?? [];
        const parsedChildren = children.length > 0 ? parsePlainJSON(children) : undefined;

        switch (block.type) {
            case "bulleted_list_item":
                result.push({ type: "bulleted_list_item", text: richText2String(block.bulleted_list_item.rich_text), children: children.length > 0 ? parsePlainJSON(children, false) : undefined });
                break;
            case "numbered_list_item":
                result.push({ type: "numbered_list_item", text: richText2String(block.numbered_list_item.rich_text), children: children.length > 0 ? parsePlainJSON(children, false) : undefined });
                break;
            case "paragraph":
                result.push({ type: "paragraph", text: richText2String(block.paragraph.rich_text), children: parsedChildren });
                break;
            case "heading_1":
                result.push({ type: "heading_1", text: richText2String(block.heading_1.rich_text), level: 1, children: parsedChildren });
                break;
            case "heading_2":
                result.push({ type: "heading_2", text: richText2String(block.heading_2.rich_text), level: 2, children: parsedChildren });
                break;
            case "heading_3":
                result.push({ type: "heading_3", text: richText2String(block.heading_3.rich_text), level: 3, children: parsedChildren });
                break;
            case "heading_4":
                result.push({ type: "heading_4", text: richText2String(block.heading_4.rich_text), level: 4, children: parsedChildren });
                break;
            case "to_do":
                result.push({ type: "to_do", text: richText2String(block.to_do.rich_text), checked: block.to_do.checked, children: parsedChildren });
                break;
            case "toggle":
                result.push({ type: "toggle", text: richText2String(block.toggle.rich_text), children: parsedChildren });
                break;
            case "quote":
                result.push({ type: "quote", text: richText2String(block.quote.rich_text), children: parsedChildren });
                break;
            case "callout": {
                const iconObj = block.callout.icon;
                const icon = iconObj?.type === "emoji" ? iconObj.emoji : undefined;
                result.push({ type: "callout", text: richText2String(block.callout.rich_text), icon, children: parsedChildren });
                break;
            }
            case "code":
                result.push({ type: "code", text: richText2String(block.code.rich_text), language: block.code.language });
                break;
            case "equation":
                result.push({ type: "equation", expression: block.equation.expression });
                break;
            case "divider":
                result.push({ type: "divider" });
                break;
            case "image": {
                const url = block.image.type === "external" ? block.image.external.url : block.image.file.url;
                const caption = richText2String(block.image.caption) || undefined;
                result.push({ type: "image", url, caption });
                break;
            }
            case "video": {
                const url = block.video.type === "external" ? block.video.external.url : block.video.file.url;
                const caption = richText2String(block.video.caption) || undefined;
                result.push({ type: "video", url, caption });
                break;
            }
            case "audio": {
                const url = block.audio.type === "external" ? block.audio.external.url : block.audio.file.url;
                const caption = richText2String(block.audio.caption) || undefined;
                result.push({ type: "audio", url, caption });
                break;
            }
            case "pdf": {
                const url = block.pdf.type === "external" ? block.pdf.external.url : block.pdf.file.url;
                const caption = richText2String(block.pdf.caption) || undefined;
                result.push({ type: "pdf", url, caption });
                break;
            }
            case "file": {
                const url = block.file.type === "external" ? block.file.external.url : block.file.file.url;
                const caption = richText2String(block.file.caption) || undefined;
                result.push({ type: "file", url, caption });
                break;
            }
            case "bookmark": {
                const caption = richText2String(block.bookmark.caption) || undefined;
                result.push({ type: "bookmark", url: block.bookmark.url, caption });
                break;
            }
            case "embed": {
                const caption = richText2String(block.embed.caption) || undefined;
                result.push({ type: "embed", url: block.embed.url, caption });
                break;
            }
            case "link_preview":
                result.push({ type: "link_preview", url: block.link_preview.url });
                break;
            case "table": {
                const rows = children
                    .filter(c => c.type === "table_row")
                    .map(row => {
                        if (row.type !== "table_row") return [] as string[];
                        return row.table_row.cells.map(cell => richText2String(cell));
                    });
                result.push({ type: "table", has_column_header: block.table.has_column_header, has_row_header: block.table.has_row_header, rows });
                break;
            }
            case "table_row": {
                const cells = block.table_row.cells.map(cell => richText2String(cell));
                result.push({ type: "table_row", cells });
                break;
            }
            case "column_list":
                result.push({ type: "column_list", children: parsedChildren });
                break;
            case "column":
                result.push({ type: "column", children: parsedChildren });
                break;
            case "child_page":
                result.push({ type: "child_page", title: block.child_page.title, children: parsedChildren });
                break;
            case "child_database":
                result.push({ type: "child_database", title: block.child_database.title, children: parsedChildren });
                break;
            case "synced_block":
                result.push({ type: "synced_block", children: parsedChildren });
                break;
            case "template":
                result.push({ type: "template", children: parsedChildren });
                break;
            case "breadcrumb":
                result.push({ type: "breadcrumb" });
                break;
            case "table_of_contents":
                result.push({ type: "table_of_contents" });
                break;
            case "tab":
                result.push({ type: "tab" });
                break;
            case "link_to_page":
                result.push({ type: "link_to_page" });
                break;
            case "meeting_notes":
                result.push({ type: "meeting_notes" });
                break;
            case "transcription":
                result.push({ type: "transcription" });
                break;
            default:
                result.push({ type: "unsupported" });
                break;
        }

        i++;
    }

    return result;
}
