import { BlockObjectResponse } from "@notionhq/client";
import { richText2String } from "../../utils/ntn-fetcher.utils.js";
import { richTextToHTML } from "../../utils/parsers.utils.js";

export function parseHTML(blocks: BlockObjectResponse[]): string {
    return parseHTMLBlocks(blocks);
}

function parseHTMLBlocks(blocks: BlockObjectResponse[]): string {
    const parts: string[] = [];
    let i = 0;

    while (i < blocks.length) {
        const block = blocks[i];

        if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
            const listTag = block.type === "bulleted_list_item" ? "ul" : "ol";
            const groupType = block.type;
            const items: string[] = [];

            while (i < blocks.length && blocks[i].type === groupType) {
                const item = blocks[i];
                const itemChildren: BlockObjectResponse[] = (item as any).children ?? [];
                const childrenHTML = itemChildren.length ? parseHTMLBlocks(itemChildren) : "";

                if (item.type === "bulleted_list_item") {
                    items.push(`<li>${richTextToHTML(item.bulleted_list_item.rich_text)}${childrenHTML}</li>`);
                } else if (item.type === "numbered_list_item") {
                    items.push(`<li>${richTextToHTML(item.numbered_list_item.rich_text)}${childrenHTML}</li>`);
                }
                i++;
            }

            parts.push(`<${listTag}>${items.join("")}</${listTag}>`);
        } else {
            parts.push(parseHTMLBlock(block));
            i++;
        }
    }

    return parts.join("\n");
}

function parseHTMLBlock(block: BlockObjectResponse): string {
    const children: BlockObjectResponse[] = (block as any).children ?? [];

    switch (block.type) {
        case "paragraph":
            return `<p>${richTextToHTML(block.paragraph.rich_text)}</p>`;
        case "heading_1":
            return `<h1>${richTextToHTML(block.heading_1.rich_text)}</h1>`;
        case "heading_2":
            return `<h2>${richTextToHTML(block.heading_2.rich_text)}</h2>`;
        case "heading_3":
            return `<h3>${richTextToHTML(block.heading_3.rich_text)}</h3>`;
        case "heading_4":
            return `<h4>${richTextToHTML(block.heading_4.rich_text)}</h4>`;
        case "to_do": {
            const checked = block.to_do.checked ? " checked" : "";
            return `<div class="to-do"><input type="checkbox"${checked}> ${richTextToHTML(block.to_do.rich_text)}</div>`;
        }
        case "toggle": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<details><summary>${richTextToHTML(block.toggle.rich_text)}</summary>${childrenHTML}</details>`;
        }
        case "quote": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<blockquote>${richTextToHTML(block.quote.rich_text)}${childrenHTML}</blockquote>`;
        }
        case "callout": {
            const iconObj = block.callout.icon;
            const icon = iconObj?.type === "emoji" ? `${iconObj.emoji} ` : "";
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<blockquote class="callout">${icon}${richTextToHTML(block.callout.rich_text)}${childrenHTML}</blockquote>`;
        }
        case "code": {
            const lang = block.code.language ?? "";
            const text = richText2String(block.code.rich_text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            return `<pre><code class="language-${lang}">${text}</code></pre>`;
        }
        case "divider":
            return `<hr>`;
        case "equation":
            return `<span class="equation">${block.equation.expression}</span>`;
        case "image": {
            const url = block.image.type === "external" ? block.image.external.url : block.image.file.url;
            const caption = richText2String(block.image.caption);
            return `<figure><img src="${url}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;
        }
        case "video": {
            const url = block.video.type === "external" ? block.video.external.url : block.video.file.url;
            const caption = richText2String(block.video.caption);
            return `<a href="${url}">${caption || "video"}</a>`;
        }
        case "audio": {
            const url = block.audio.type === "external" ? block.audio.external.url : block.audio.file.url;
            const caption = richText2String(block.audio.caption);
            return `<a href="${url}">${caption || "audio"}</a>`;
        }
        case "pdf": {
            const url = block.pdf.type === "external" ? block.pdf.external.url : block.pdf.file.url;
            const caption = richText2String(block.pdf.caption);
            return `<a href="${url}">${caption || "PDF"}</a>`;
        }
        case "file": {
            const url = block.file.type === "external" ? block.file.external.url : block.file.file.url;
            const caption = richText2String(block.file.caption);
            return `<a href="${url}">${caption || block.file.name}</a>`;
        }
        case "bookmark": {
            const caption = richText2String(block.bookmark.caption);
            return `<a href="${block.bookmark.url}">${caption || block.bookmark.url}</a>`;
        }
        case "embed": {
            const caption = richText2String(block.embed.caption);
            return `<a href="${block.embed.url}">${caption || block.embed.url}</a>`;
        }
        case "link_preview":
            return `<a href="${block.link_preview.url}">${block.link_preview.url}</a>`;
        case "table": {
            const rowBlocks = children.filter(c => c.type === "table_row");
            const rows = rowBlocks.map(row => {
                if (row.type !== "table_row") return "";
                const cells = row.table_row.cells.map(cell => richTextToHTML(cell));
                return cells;
            });

            if (rows.length === 0) return "";

            const tableRows: string[] = [];
            rows.forEach((cells, idx) => {
                if (typeof cells === "string") return;
                const tag = block.table.has_column_header && idx === 0 ? "th" : "td";
                tableRows.push(`<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join("")}</tr>`);
            });

            return `<table>${tableRows.join("")}</table>`;
        }
        case "column_list": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<div class="columns">${childrenHTML}</div>`;
        }
        case "column": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<div class="column">${childrenHTML}</div>`;
        }
        case "synced_block": {
            return children.length ? parseHTMLBlocks(children) : "";
        }
        case "child_page":
            return `<strong>${block.child_page.title}</strong>`;
        case "child_database":
            return `<strong>${block.child_database.title}</strong>`;
        default:
            return "";
    }
}
