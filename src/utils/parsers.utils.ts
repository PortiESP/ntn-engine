import { RichTextItemResponse } from "@notionhq/client";

export function richTextToMarkdown(richText: RichTextItemResponse[]): string {
    return richText.map((item) => {
        let text = item.plain_text;
        const { bold, italic, strikethrough, code } = item.annotations;

        if (code) text = `\`${text}\``;
        if (bold) text = `**${text}**`;
        if (italic) text = `*${text}*`;
        if (strikethrough) text = `~~${text}~~`;
        if (item.href) text = `[${text}](${item.href})`;

        return text;
    }).join("");
}

export function richTextToHTML(richText: RichTextItemResponse[]): string {
    return richText.map((item) => {
        let text = escapeHTML(item.plain_text);
        const { bold, italic, strikethrough, underline, code } = item.annotations;

        if (code) text = `<code>${text}</code>`;
        if (bold) text = `<strong>${text}</strong>`;
        if (italic) text = `<em>${text}</em>`;
        if (strikethrough) text = `<del>${text}</del>`;
        if (underline) text = `<u>${text}</u>`;
        if (item.href) text = `<a href="${escapeAttr(item.href)}">${text}</a>`;

        return text;
    }).join("");
}

function escapeHTML(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
    return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
