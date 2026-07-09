import { BlockObjectResponse } from "@notionhq/client";
import { isRichTextCode, richText2String } from "../../utils/ntn-fetcher.utils.js";
import { richTextToHTML } from "../../utils/parsers.utils.js";
import { T_ParsedBlock } from "../ntn-parsers.types.js";

export function parsePlainJSON(blocks: BlockObjectResponse[], groupLists = true): T_ParsedBlock[] {
    const result: T_ParsedBlock[] = [];
    let i = 0;

    while (i < blocks.length) {
        const block = blocks[i];

        // Group consecutive list items into a single object
        if (groupLists && (block.type === "bulleted_list_item" || block.type === "numbered_list_item")) {
            const groupType = block.type;
            const listType = groupType === "bulleted_list_item" ? "bulleted_list" as const : "numbered_list" as const;
            const items: T_ParsedBlock[] = [];

            while (i < blocks.length && blocks[i].type === groupType) {
                const item = blocks[i];
                const itemChildren: BlockObjectResponse[] = (item as any).children ?? [];
                const parsedChildren = itemChildren.length > 0 ? parsePlainJSON(itemChildren, false) : undefined;

                if (item.type === "bulleted_list_item") {
                    items.push({ id: item.id, type: "bulleted_list_item", text: richText2String(item.bulleted_list_item.rich_text), html: richTextToHTML(item.bulleted_list_item.rich_text), children: parsedChildren });
                } else if (item.type === "numbered_list_item") {
                    items.push({ id: item.id, type: "numbered_list_item", text: richText2String(item.numbered_list_item.rich_text), html: richTextToHTML(item.numbered_list_item.rich_text), children: parsedChildren });
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
                result.push({ id: block.id, type: "bulleted_list_item", text: richText2String(block.bulleted_list_item.rich_text), html: richTextToHTML(block.bulleted_list_item.rich_text), children: children.length > 0 ? parsePlainJSON(children, false) : undefined });
                break;
            case "numbered_list_item":
                result.push({ id: block.id, type: "numbered_list_item", text: richText2String(block.numbered_list_item.rich_text), html: richTextToHTML(block.numbered_list_item.rich_text), children: children.length > 0 ? parsePlainJSON(children, false) : undefined });
                break;
            case "paragraph":
                result.push({ id: block.id, type: "paragraph", text: richText2String(block.paragraph.rich_text), html: richTextToHTML(block.paragraph.rich_text), children: parsedChildren });
                break;
            case "heading_1":
                result.push({ id: block.id, type: "heading_1", text: richText2String(block.heading_1.rich_text), level: 1, children: parsedChildren });
                break;
            case "heading_2":
                result.push({ id: block.id, type: "heading_2", text: richText2String(block.heading_2.rich_text), level: 2, children: parsedChildren });
                break;
            case "heading_3":
                result.push({ id: block.id, type: "heading_3", text: richText2String(block.heading_3.rich_text), level: 3, children: parsedChildren });
                break;
            case "heading_4":
                result.push({ id: block.id, type: "heading_4", text: richText2String(block.heading_4.rich_text), level: 4, children: parsedChildren });
                break;
            case "to_do":
                result.push({ id: block.id, type: "to_do", text: richText2String(block.to_do.rich_text), checked: block.to_do.checked, children: parsedChildren });
                break;
            case "toggle":
                result.push({ id: block.id, type: "toggle", text: richText2String(block.toggle.rich_text), html: richTextToHTML(block.toggle.rich_text), children: parsedChildren, isCode: isRichTextCode(block.toggle.rich_text) });
                break;
            case "quote":
                result.push({ id: block.id, type: "quote", text: richText2String(block.quote.rich_text), html: richTextToHTML(block.quote.rich_text), children: parsedChildren, isCode: isRichTextCode(block.quote.rich_text) });
                break;
            case "callout": {
                const iconObj = block.callout.icon;
                const icon = iconObj?.type === "emoji" ? iconObj.emoji : undefined;
                result.push({ id: block.id, type: "callout", text: richText2String(block.callout.rich_text), icon, children: parsedChildren });
                break;
            }
            case "code":
                result.push({ id: block.id, type: "code", text: richText2String(block.code.rich_text), language: block.code.language });
                break;
            case "equation":
                result.push({ id: block.id, type: "equation", expression: block.equation.expression });
                break;
            case "divider":
                result.push({ id: block.id, type: "divider" });
                break;
            case "image": {
                const url = block.image.type === "external" ? block.image.external.url : block.image.file.url;
                const caption = richText2String(block.image.caption) || undefined;
                result.push({ id: block.id, type: "image", url, caption });
                break;
            }
            case "video": {
                const url = block.video.type === "external" ? block.video.external.url : block.video.file.url;
                const caption = richText2String(block.video.caption) || undefined;
                result.push({ id: block.id, type: "video", url, caption });
                break;
            }
            case "audio": {
                const url = block.audio.type === "external" ? block.audio.external.url : block.audio.file.url;
                const caption = richText2String(block.audio.caption) || undefined;
                result.push({ id: block.id, type: "audio", url, caption });
                break;
            }
            case "pdf": {
                const url = block.pdf.type === "external" ? block.pdf.external.url : block.pdf.file.url;
                const caption = richText2String(block.pdf.caption) || undefined;
                result.push({ id: block.id, type: "pdf", url, caption });
                break;
            }
            case "file": {
                const url = block.file.type === "external" ? block.file.external.url : block.file.file.url;
                const caption = richText2String(block.file.caption) || undefined;
                result.push({ id: block.id, type: "file", url, caption });
                break;
            }
            case "bookmark": {
                const caption = richText2String(block.bookmark.caption) || undefined;
                result.push({ id: block.id, type: "bookmark", url: block.bookmark.url, caption });
                break;
            }
            case "embed": {
                const caption = richText2String(block.embed.caption) || undefined;
                result.push({ id: block.id, type: "embed", url: block.embed.url, caption });
                break;
            }
            case "link_preview":
                result.push({ id: block.id, type: "link_preview", url: block.link_preview.url });
                break;
            case "table": {
                const rowBlocks = children.filter(c => c.type === "table_row");
                const rows = rowBlocks.map(row => {
                    if (row.type !== "table_row") return [] as string[];
                    return row.table_row.cells.map(cell => richText2String(cell));
                });
                // HTML representation of each cell — preserves links/formatting (e.g. <a href>)
                const rows_html = rowBlocks.map(row => {
                    if (row.type !== "table_row") return [] as string[];
                    return row.table_row.cells.map(cell => richTextToHTML(cell));
                });
                result.push({ id: block.id, type: "table", has_column_header: block.table.has_column_header, has_row_header: block.table.has_row_header, rows, rows_html });
                break;
            }
            case "table_row": {
                const cells = block.table_row.cells.map(cell => richText2String(cell));
                const cells_html = block.table_row.cells.map(cell => richTextToHTML(cell));
                result.push({ id: block.id, type: "table_row", cells, cells_html });
                break;
            }
            case "column_list":
                result.push({ id: block.id, type: "column_list", children: parsedChildren });
                break;
            case "column":
                result.push({ id: block.id, type: "column", children: parsedChildren });
                break;
            case "child_page":
                result.push({ id: block.id, type: "child_page", title: block.child_page.title, children: parsedChildren });
                break;
            case "child_database":
                result.push({ id: block.id, type: "child_database", title: block.child_database.title, children: parsedChildren });
                break;
            case "synced_block":
                result.push({ id: block.id, type: "synced_block", children: parsedChildren });
                break;
            case "template":
                result.push({ id: block.id, type: "template", children: parsedChildren });
                break;
            case "breadcrumb":
                result.push({ id: block.id, type: "breadcrumb" });
                break;
            case "table_of_contents":
                result.push({ id: block.id, type: "table_of_contents" });
                break;
            case "tab":
                result.push({ id: block.id, type: "tab" });
                break;
            case "link_to_page":
                result.push({ id: block.id, type: "link_to_page" });
                break;
            case "meeting_notes":
                result.push({ id: block.id, type: "meeting_notes" });
                break;
            case "transcription":
                result.push({ id: block.id, type: "transcription" });
                break;
            default:
                result.push({ id: block.id, type: "unsupported" });
                break;
        }

        i++;
    }

    return result;
}
