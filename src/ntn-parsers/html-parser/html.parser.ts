import { BlockObjectResponse } from "@notionhq/client";
import { richText2String } from "../../utils/ntn-fetcher.utils.js";
import { escapeAttr, escapeHTML, richTextToHTML } from "../../utils/parsers.utils.js";

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
                    items.push(`<li data-block-type="bulleted_list_item">${richTextToHTML(item.bulleted_list_item.rich_text)}${childrenHTML}</li>`);
                } else if (item.type === "numbered_list_item") {
                    items.push(`<li data-block-type="numbered_list_item">${richTextToHTML(item.numbered_list_item.rich_text)}${childrenHTML}</li>`);
                }
                i++;
            }

            parts.push(`<${listTag} data-block-type="${groupType}">${items.join("")}</${listTag}>`);
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
            if (block.paragraph.rich_text.length === 0)
                return `<br data-block-type="paragraph">`;
            return `<p data-block-type="paragraph">${richTextToHTML(block.paragraph.rich_text)}</p>`;
        case "heading_1":
            return `<h1 data-block-type="heading_1">${richTextToHTML(block.heading_1.rich_text)}</h1>`;
        case "heading_2":
            return `<h2 data-block-type="heading_2">${richTextToHTML(block.heading_2.rich_text)}</h2>`;
        case "heading_3":
            return `<h3 data-block-type="heading_3">${richTextToHTML(block.heading_3.rich_text)}</h3>`;
        case "heading_4":
            return `<h4 data-block-type="heading_4">${richTextToHTML(block.heading_4.rich_text)}</h4>`;
        case "to_do": {
            const checked = block.to_do.checked ? " checked" : "";
            return `<div data-block-type="to_do" class="to-do"><input type="checkbox"${checked}> ${richTextToHTML(block.to_do.rich_text)}</div>`;
        }
        case "toggle": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<details data-block-type="toggle"><summary>${richTextToHTML(block.toggle.rich_text)}</summary>${childrenHTML}</details>`;
        }
        case "quote": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<blockquote data-block-type="quote">${richTextToHTML(block.quote.rich_text)}${childrenHTML}</blockquote>`;
        }
        case "callout": {
            const iconObj = block.callout.icon;
            const icon = iconObj?.type === "emoji" ? `<span class="callout-icon">${iconObj.emoji}</span> ` : "";
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<blockquote data-block-type="callout" class="callout">${icon}${richTextToHTML(block.callout.rich_text)}${childrenHTML}</blockquote>`;
        }
        case "code": {
            const lang = block.code.language ?? "";
            const text = richText2String(block.code.rich_text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            return `<pre data-block-type="code"><code class="language-${lang}">${text}</code></pre>`;
        }
        case "divider":
            return `<hr data-block-type="divider">`;
        case "equation":
            return `<span data-block-type="equation" class="equation">${block.equation.expression}</span>`;
        case "image": {
            const url = block.image.type === "external" ? block.image.external.url : block.image.file.url;
            const captionPlain = richText2String(block.image.caption);
            const captionHTML  = richTextToHTML(block.image.caption);
            return `<figure data-block-type="image"><img src="${escapeAttr(url)}" alt="${escapeAttr(captionPlain)}"><figcaption>${captionHTML}</figcaption></figure>`;
        }
        case "video": {
            const raw = block.video.type === "external" ? block.video.external.url : block.video.file.url;
            const captionPlain = richText2String(block.video.caption);
            const captionHTML  = richTextToHTML(block.video.caption);
            const figcaption   = captionPlain ? `<figcaption>${captionHTML}</figcaption>` : "";
            const embedUrl     = toEmbedUrl(raw);
            const media = embedUrl
                ? `<iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`
                : `<video src="${raw}" controls></video>`;
            return `<figure data-block-type="video">${media}${figcaption}</figure>`;
        }
        case "audio": {
            const url = block.audio.type === "external" ? block.audio.external.url : block.audio.file.url;
            const captionPlain = richText2String(block.audio.caption);
            const captionHTML  = richTextToHTML(block.audio.caption);
            const figcaption   = captionPlain ? `<figcaption>${captionHTML}</figcaption>` : "";
            return `<figure data-block-type="audio"><audio src="${url}" controls></audio>${figcaption}</figure>`;
        }
        case "pdf": {
            const url = block.pdf.type === "external" ? block.pdf.external.url : block.pdf.file.url;
            const caption = richText2String(block.pdf.caption);
            return `<a data-block-type="pdf" href="${url}">${caption || "PDF"}</a>`;
        }
        case "file": {
            const url = block.file.type === "external" ? block.file.external.url : block.file.file.url;
            const caption = richText2String(block.file.caption);
            return `<a data-block-type="file" href="${escapeAttr(url)}">${escapeHTML(caption || block.file.name)}</a>`;
        }
        case "bookmark": {
            const caption = richText2String(block.bookmark.caption);
            return `<a data-block-type="bookmark" href="${block.bookmark.url}">${caption || block.bookmark.url}</a>`;
        }
        case "embed": {
            const embedUrl     = toEmbedUrl(block.embed.url) ?? block.embed.url;
            const captionPlain = richText2String(block.embed.caption);
            const captionHTML  = richTextToHTML(block.embed.caption);
            const figcaption   = captionPlain ? `<figcaption>${captionHTML}</figcaption>` : "";
            return `<figure data-block-type="embed"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>${figcaption}</figure>`;
        }
        case "link_preview":
            return `<a data-block-type="link_preview" href="${block.link_preview.url}">${block.link_preview.url}</a>`;
        case "table": {
            const { has_column_header, has_row_header } = block.table;
            const rowBlocks = children.filter(c => c.type === "table_row");

            if (rowBlocks.length === 0) return "";

            const tableRows = rowBlocks.map((row, rowIdx) => {
                if (row.type !== "table_row") return "";
                const isHeaderRow = has_column_header && rowIdx === 0;
                const cells = row.table_row.cells.map((cell, colIdx) => {
                    const isHeaderCell = isHeaderRow || (has_row_header && colIdx === 0);
                    const tag = isHeaderCell ? "th" : "td";
                    return `<${tag}>${richTextToHTML(cell)}</${tag}>`;
                });
                return `<tr data-block-type="table_row">${cells.join("")}</tr>`;
            });

            return `<table data-block-type="table">${tableRows.join("")}</table>`;
        }
        case "column_list": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<div data-block-type="column_list" class="columns">${childrenHTML}</div>`;
        }
        case "column": {
            const childrenHTML = children.length ? parseHTMLBlocks(children) : "";
            return `<div data-block-type="column" class="column">${childrenHTML}</div>`;
        }
        case "tab": {
            const items = children.map((child, idx) => {
                if (child.type !== "paragraph") return parseHTMLBlock(child);
                const titleHTML = richTextToHTML(child.paragraph.rich_text);
                const tabContent: BlockObjectResponse[] = (child as any).children ?? [];
                const contentHTML = tabContent.length ? parseHTMLBlocks(tabContent) : "";
                return `<div class="tab-item" data-tab-index="${idx}"><div class="tab-title">${titleHTML}</div><div class="tab-content">${contentHTML}</div></div>`;
            });
            return `<div data-block-type="tab" class="tab">${items.join("")}</div>`;
        }
        case "synced_block":
            return children.length ? parseHTMLBlocks(children) : "";
        case "child_page":
            return `<strong data-block-type="child_page">${escapeHTML(block.child_page.title)}</strong>`;
        case "child_database":
            return `<strong data-block-type="child_database">${escapeHTML(block.child_database.title)}</strong>`;
        default:
            return "";
    }
}

// Converts known platform URLs to their embeddable equivalents.
// Returns null for direct-file URLs that don't need transformation.
function toEmbedUrl(url: string): string | null {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, "");

        // YouTube
        if (host === "youtube.com") {
            if (u.pathname === "/watch") {
                const v = u.searchParams.get("v");
                if (v) return `https://www.youtube.com/embed/${v}`;
            }
            if (u.pathname.startsWith("/embed/")) return url;
            if (u.pathname.startsWith("/shorts/")) {
                const id = u.pathname.replace("/shorts/", "");
                if (id) return `https://www.youtube.com/embed/${id}`;
            }
        }
        if (host === "youtu.be") {
            const v = u.pathname.slice(1);
            if (v) return `https://www.youtube.com/embed/${v}`;
        }

        // Vimeo
        if (host === "vimeo.com") {
            const id = u.pathname.slice(1);
            if (id) return `https://player.vimeo.com/video/${id}`;
        }
        if (host === "player.vimeo.com") return url;

        // Loom
        if (host === "loom.com" && u.pathname.startsWith("/share/")) {
            const id = u.pathname.replace("/share/", "");
            if (id) return `https://www.loom.com/embed/${id}`;
        }
        if (host === "loom.com" && u.pathname.startsWith("/embed/")) return url;

        return null;
    } catch {
        return null;
    }
}
