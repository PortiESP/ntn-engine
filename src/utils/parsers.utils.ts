import { RichTextItemResponse } from "@notionhq/client";

const COLOR_MAP: Record<string, string> = {
    gray:               "#9B9A97",
    brown:              "#64473A",
    orange:             "#D9730D",
    yellow:             "#DFAB01",
    green:              "#0F7B6C",
    blue:               "#0B6E99",
    purple:             "#6940A5",
    pink:               "#AD1A72",
    red:                "#E03E3E",
};

const BACKGROUND_COLOR_MAP: Record<string, string> = {
    default_background: "#FFFFFF",
    gray_background:    "#F1F1EF",
    brown_background:   "#F4EEEE",
    orange_background:  "#FAEBDD",
    yellow_background:  "#FBF3DB",
    green_background:   "#EEF3ED",
    blue_background:    "#E7F3F8",
    purple_background:  "#F6F3F9",
    pink_background:    "#FAF1F5",
    red_background:     "#FDEBEC",
};

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
        const { bold, italic, strikethrough, underline, code, color } = item.annotations;

        if (code) text = `<code>${text}</code>`;
        if (bold) text = `<strong>${text}</strong>`;
        if (italic) text = `<em>${text}</em>`;
        if (strikethrough) text = `<del>${text}</del>`;
        if (underline) text = `<u>${text}</u>`;
        if (item.href) text = `<a href="${escapeAttr(item.href)}">${text}</a>`;

        const cssColor = COLOR_MAP[color];
        const cssBg    = BACKGROUND_COLOR_MAP[color];
        if (cssColor || cssBg) {
            const style = cssColor ? `color:${cssColor}` : `background-color:${cssBg}`;
            text = `<span style="${style}" data-color="${color}">${text}</span>`;
        }

        return text;
    }).join("");
}

export function escapeHTML(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function escapeAttr(text: string): string {
    return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
