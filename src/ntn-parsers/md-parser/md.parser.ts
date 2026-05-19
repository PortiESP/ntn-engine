import { BlockObjectResponse } from "@notionhq/client";
import { richText2String } from "../../utils/ntn-fetcher.utils.js";
import { richTextToMarkdown } from "../../utils/parsers.utils.js";

export function parseMarkdown(blocks: BlockObjectResponse[], indent = ""): string {
    const lines: string[] = [];
    let numberedIndex = 0;

    for (const block of blocks) {
        const children: BlockObjectResponse[] = (block as any).children ?? [];

        if (block.type !== "numbered_list_item") numberedIndex = 0;

        switch (block.type) {
            case "paragraph": {
                const text = richTextToMarkdown(block.paragraph.rich_text);
                lines.push(`${indent}${text}`, "");
                if (children.length) lines.push(parseMarkdown(children, indent + "  "));
                break;
            }
            case "heading_1":
                lines.push(`${indent}# ${richTextToMarkdown(block.heading_1.rich_text)}`, "");
                if (children.length) lines.push(parseMarkdown(children, indent));
                break;
            case "heading_2":
                lines.push(`${indent}## ${richTextToMarkdown(block.heading_2.rich_text)}`, "");
                if (children.length) lines.push(parseMarkdown(children, indent));
                break;
            case "heading_3":
                lines.push(`${indent}### ${richTextToMarkdown(block.heading_3.rich_text)}`, "");
                if (children.length) lines.push(parseMarkdown(children, indent));
                break;
            case "heading_4":
                lines.push(`${indent}#### ${richTextToMarkdown(block.heading_4.rich_text)}`, "");
                if (children.length) lines.push(parseMarkdown(children, indent));
                break;
            case "bulleted_list_item":
                lines.push(`${indent}- ${richTextToMarkdown(block.bulleted_list_item.rich_text)}`);
                if (children.length) lines.push(parseMarkdown(children, indent + "  "));
                break;
            case "numbered_list_item":
                numberedIndex++;
                lines.push(`${indent}${numberedIndex}. ${richTextToMarkdown(block.numbered_list_item.rich_text)}`);
                if (children.length) lines.push(parseMarkdown(children, indent + "   "));
                break;
            case "to_do": {
                const check = block.to_do.checked ? "x" : " ";
                lines.push(`${indent}- [${check}] ${richTextToMarkdown(block.to_do.rich_text)}`);
                if (children.length) lines.push(parseMarkdown(children, indent + "  "));
                break;
            }
            case "toggle":
                lines.push(`${indent}${richTextToMarkdown(block.toggle.rich_text)}`);
                if (children.length) lines.push(parseMarkdown(children, indent + "  "));
                break;
            case "quote": {
                lines.push(`${indent}> ${richTextToMarkdown(block.quote.rich_text)}`);
                if (children.length) {
                    parseMarkdown(children, indent).split("\n").forEach(l => lines.push(`${indent}> ${l}`));
                }
                lines.push("");
                break;
            }
            case "callout": {
                const iconObj = block.callout.icon;
                const icon = iconObj?.type === "emoji" ? iconObj.emoji + " " : "";
                lines.push(`${indent}> ${icon}${richTextToMarkdown(block.callout.rich_text)}`);
                if (children.length) {
                    parseMarkdown(children, indent).split("\n").forEach(l => lines.push(`${indent}> ${l}`));
                }
                lines.push("");
                break;
            }
            case "code": {
                const lang = block.code.language ?? "";
                lines.push(`${indent}\`\`\`${lang}`, richText2String(block.code.rich_text), `${indent}\`\`\``, "");
                break;
            }
            case "divider":
                lines.push(`${indent}---`, "");
                break;
            case "image": {
                const url = block.image.type === "external" ? block.image.external.url : block.image.file.url;
                const caption = richText2String(block.image.caption);
                lines.push(`${indent}![${caption}](${url})`, "");
                break;
            }
            case "video": {
                const url = block.video.type === "external" ? block.video.external.url : block.video.file.url;
                const caption = richText2String(block.video.caption);
                lines.push(`${indent}[${caption || "video"}](${url})`, "");
                break;
            }
            case "audio": {
                const url = block.audio.type === "external" ? block.audio.external.url : block.audio.file.url;
                const caption = richText2String(block.audio.caption);
                lines.push(`${indent}[${caption || "audio"}](${url})`, "");
                break;
            }
            case "pdf": {
                const url = block.pdf.type === "external" ? block.pdf.external.url : block.pdf.file.url;
                const caption = richText2String(block.pdf.caption);
                lines.push(`${indent}[${caption || "PDF"}](${url})`, "");
                break;
            }
            case "file": {
                const url = block.file.type === "external" ? block.file.external.url : block.file.file.url;
                const caption = richText2String(block.file.caption);
                lines.push(`${indent}[${caption || block.file.name}](${url})`, "");
                break;
            }
            case "bookmark": {
                const url = block.bookmark.url;
                const caption = richText2String(block.bookmark.caption);
                lines.push(`${indent}[${caption || url}](${url})`, "");
                break;
            }
            case "embed": {
                const url = block.embed.url;
                const caption = richText2String(block.embed.caption);
                lines.push(`${indent}[${caption || url}](${url})`, "");
                break;
            }
            case "link_preview":
                lines.push(`${indent}[${block.link_preview.url}](${block.link_preview.url})`, "");
                break;
            case "equation":
                lines.push(`${indent}$$${block.equation.expression}$$`, "");
                break;
            case "table": {
                const rowBlocks = children.filter(c => c.type === "table_row");
                if (rowBlocks.length > 0) {
                    const rows = rowBlocks.map(row => {
                        if (row.type !== "table_row") return [] as string[];
                        return row.table_row.cells.map(cell => richTextToMarkdown(cell));
                    });
                    const colCount = rows[0].length;
                    const sep = Array(colCount).fill("---");

                    if (block.table.has_column_header) {
                        lines.push(`| ${rows[0].join(" | ")} |`);
                        lines.push(`| ${sep.join(" | ")} |`);
                        for (let r = 1; r < rows.length; r++) lines.push(`| ${rows[r].join(" | ")} |`);
                    } else {
                        lines.push(`| ${sep.join(" | ")} |`);
                        for (const row of rows) lines.push(`| ${row.join(" | ")} |`);
                    }
                    lines.push("");
                }
                break;
            }
            case "column_list":
            case "column":
            case "synced_block":
                if (children.length) lines.push(parseMarkdown(children, indent));
                break;
            case "child_page":
                lines.push(`${indent}**${block.child_page.title}**`, "");
                break;
            case "child_database":
                lines.push(`${indent}**${block.child_database.title}**`, "");
                break;
            default:
                console.log("[ntn-parser:md] Unsupported block type:", (block as any).type);
                break;
        }
    }

    return lines.join("\n");
}
