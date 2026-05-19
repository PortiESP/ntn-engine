import { BlockObjectResponse } from "@notionhq/client";
import { richText2String } from "../../utils/ntn-fetcher.utils.js";

export function parsePlainText(blocks: BlockObjectResponse[], indent = ""): string {
    const lines: string[] = [];

    for (const block of blocks) {
        const children: BlockObjectResponse[] = (block as any).children ?? [];

        switch (block.type) {
            case "paragraph":
                lines.push(`${indent}${richText2String(block.paragraph.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent + "  "));
                break;
            case "heading_1":
                lines.push(`${indent}${richText2String(block.heading_1.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent));
                break;
            case "heading_2":
                lines.push(`${indent}${richText2String(block.heading_2.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent));
                break;
            case "heading_3":
                lines.push(`${indent}${richText2String(block.heading_3.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent));
                break;
            case "heading_4":
                lines.push(`${indent}${richText2String(block.heading_4.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent));
                break;
            case "bulleted_list_item":
                lines.push(`${indent}${richText2String(block.bulleted_list_item.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent + "  "));
                break;
            case "numbered_list_item":
                lines.push(`${indent}${richText2String(block.numbered_list_item.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent + "  "));
                break;
            case "to_do":
                lines.push(`${indent}${richText2String(block.to_do.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent + "  "));
                break;
            case "toggle":
                lines.push(`${indent}${richText2String(block.toggle.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent + "  "));
                break;
            case "quote":
                lines.push(`${indent}${richText2String(block.quote.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent));
                break;
            case "callout":
                lines.push(`${indent}${richText2String(block.callout.rich_text)}`);
                if (children.length) lines.push(parsePlainText(children, indent));
                break;
            case "code":
                lines.push(`${indent}${richText2String(block.code.rich_text)}`);
                break;
            case "equation":
                lines.push(`${indent}${block.equation.expression}`);
                break;
            case "divider":
                lines.push(`${indent}---`);
                break;
            case "image": {
                const caption = richText2String(block.image.caption);
                lines.push(`${indent}[image${caption ? `: ${caption}` : ""}]`);
                break;
            }
            case "video": {
                const caption = richText2String(block.video.caption);
                lines.push(`${indent}[video${caption ? `: ${caption}` : ""}]`);
                break;
            }
            case "audio": {
                const caption = richText2String(block.audio.caption);
                lines.push(`${indent}[audio${caption ? `: ${caption}` : ""}]`);
                break;
            }
            case "pdf": {
                const caption = richText2String(block.pdf.caption);
                lines.push(`${indent}[pdf${caption ? `: ${caption}` : ""}]`);
                break;
            }
            case "file": {
                const caption = richText2String(block.file.caption);
                lines.push(`${indent}[${block.file.name}${caption ? `: ${caption}` : ""}]`);
                break;
            }
            case "bookmark":
                lines.push(`${indent}${block.bookmark.url}`);
                break;
            case "embed":
                lines.push(`${indent}${block.embed.url}`);
                break;
            case "link_preview":
                lines.push(`${indent}${block.link_preview.url}`);
                break;
            case "table": {
                for (const row of children) {
                    if (row.type !== "table_row") continue;
                    lines.push(`${indent}${row.table_row.cells.map(cell => richText2String(cell)).join("\t")}`);
                }
                break;
            }
            case "column_list":
            case "column":
            case "synced_block":
                if (children.length) lines.push(parsePlainText(children, indent));
                break;
            case "child_page":
                lines.push(`${indent}${block.child_page.title}`);
                break;
            case "child_database":
                lines.push(`${indent}${block.child_database.title}`);
                break;
        }
    }

    return lines.join("\n");
}
