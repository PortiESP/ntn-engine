/**
 * Parser tests — run all four output formats against real blocks fetched from
 * the "Marco Aurelioo" page in the Emperors database.
 * The parsers are pure functions, so this also serves as a regression guard
 * for each format.
 */
import { describe, test, before } from "node:test";
import assert from "node:assert/strict";
import { BlockObjectResponse } from "@notionhq/client";
import { parseHTML, parseMarkdown, parsePlainJSON, parsePlainText } from "../src/ntn-parsers/index.js";
import { NotionEngine } from "../src/index.js";

let blocks: BlockObjectResponse[] = [];

// Fetch real page blocks once before all parser tests
before(async () => {
    const engine = new NotionEngine();
    blocks = await engine.getEntryContent("Emperors", "Marco Aurelioo") as BlockObjectResponse[];
});

// ─────────────────────────────────────────────────────────────────────────────
// parsePlainJSON
// ─────────────────────────────────────────────────────────────────────────────

describe("parsePlainJSON", () => {
    test("returns an array", () => {
        const result = parsePlainJSON(blocks);
        assert.ok(Array.isArray(result));
    });

    test("every item has a `type` field", () => {
        const result = parsePlainJSON(blocks);
        for (const item of result) {
            assert.ok(typeof item.type === "string", `item missing type: ${JSON.stringify(item)}`);
        }
    });

    test("list grouping: consecutive list items are wrapped in a list object", () => {
        // Build minimal mock blocks to test list grouping deterministically
        const listBlocks = [
            makeBlock("bulleted_list_item", { rich_text: [rt("item A")] }),
            makeBlock("bulleted_list_item", { rich_text: [rt("item B")] }),
            makeBlock("paragraph", { rich_text: [rt("paragraph")] }),
        ] as unknown as BlockObjectResponse[];

        const result = parsePlainJSON(listBlocks);
        assert.equal(result[0].type, "bulleted_list");
        assert.equal((result[0] as any).items.length, 2);
        assert.equal(result[1].type, "paragraph");
    });

    test("list grouping disabled: items are kept flat", () => {
        const listBlocks = [
            makeBlock("bulleted_list_item", { rich_text: [rt("item A")] }),
            makeBlock("bulleted_list_item", { rich_text: [rt("item B")] }),
        ] as unknown as BlockObjectResponse[];

        const result = parsePlainJSON(listBlocks, false);
        assert.equal(result.length, 2);
        assert.equal(result[0].type, "bulleted_list_item");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseMarkdown
// ─────────────────────────────────────────────────────────────────────────────

describe("parseMarkdown", () => {
    test("returns a string", () => {
        assert.equal(typeof parseMarkdown(blocks), "string");
    });

    test("headings use # syntax", () => {
        const input = [
            makeBlock("heading_1", { rich_text: [rt("Title")] }),
            makeBlock("heading_2", { rich_text: [rt("Sub")] }),
        ] as unknown as BlockObjectResponse[];
        const md = parseMarkdown(input);
        assert.ok(md.includes("# Title"),  "h1 not rendered");
        assert.ok(md.includes("## Sub"),   "h2 not rendered");
    });

    test("bulleted list items use - syntax", () => {
        const input = [makeBlock("bulleted_list_item", { rich_text: [rt("point")] })] as unknown as BlockObjectResponse[];
        assert.ok(parseMarkdown(input).includes("- point"));
    });

    test("checked to-do uses [x] syntax", () => {
        const input = [makeBlock("to_do", { rich_text: [rt("done")], checked: true })] as unknown as BlockObjectResponse[];
        assert.ok(parseMarkdown(input).includes("[x] done"));
    });

    test("unchecked to-do uses [ ] syntax", () => {
        const input = [makeBlock("to_do", { rich_text: [rt("todo")], checked: false })] as unknown as BlockObjectResponse[];
        assert.ok(parseMarkdown(input).includes("[ ] todo"));
    });

    test("divider renders as ---", () => {
        const input = [makeBlock("divider", {})] as unknown as BlockObjectResponse[];
        assert.ok(parseMarkdown(input).includes("---"));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseHTML
// ─────────────────────────────────────────────────────────────────────────────

describe("parseHTML", () => {
    test("returns a string", () => {
        assert.equal(typeof parseHTML(blocks), "string");
    });

    test("paragraphs render as <p> tags", () => {
        const input = [makeBlock("paragraph", { rich_text: [rt("hello")] })] as unknown as BlockObjectResponse[];
        assert.ok(parseHTML(input).includes("<p"));
    });

    test("headings render as <h1>–<h4> tags", () => {
        const input = [
            makeBlock("heading_1", { rich_text: [rt("H1")] }),
            makeBlock("heading_3", { rich_text: [rt("H3")] }),
        ] as unknown as BlockObjectResponse[];
        const html = parseHTML(input);
        assert.ok(html.includes("<h1"), "missing h1");
        assert.ok(html.includes("<h3"), "missing h3");
    });

    test("bulleted list renders as <ul>", () => {
        const input = [
            makeBlock("bulleted_list_item", { rich_text: [rt("x")] }),
            makeBlock("bulleted_list_item", { rich_text: [rt("y")] }),
        ] as unknown as BlockObjectResponse[];
        assert.ok(parseHTML(input).includes("<ul"));
    });

    test("numbered list renders as <ol>", () => {
        const input = [
            makeBlock("numbered_list_item", { rich_text: [rt("1")] }),
        ] as unknown as BlockObjectResponse[];
        assert.ok(parseHTML(input).includes("<ol"));
    });

    test("escapes HTML in child_page title", () => {
        const input = [makeBlock("child_page", { title: "<script>xss</script>" })] as unknown as BlockObjectResponse[];
        const html = parseHTML(input);
        assert.ok(!html.includes("<script>"), "XSS not escaped");
        assert.ok(html.includes("&lt;script&gt;"), "expected escaped output");
    });

    test("escapes HTML in file name", () => {
        const input = [makeBlock("file", {
            type: "external",
            external: { url: "https://example.com/f.pdf" },
            caption: [],
            name: "<b>evil</b>",
        })] as unknown as BlockObjectResponse[];
        const html = parseHTML(input);
        assert.ok(!html.includes("<b>"), "file name not escaped");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// parsePlainText
// ─────────────────────────────────────────────────────────────────────────────

describe("parsePlainText", () => {
    test("returns a string", () => {
        assert.equal(typeof parsePlainText(blocks), "string");
    });

    test("extracts paragraph text", () => {
        const input = [makeBlock("paragraph", { rich_text: [rt("plain content")] })] as unknown as BlockObjectResponse[];
        assert.ok(parsePlainText(input).includes("plain content"));
    });

    test("strips formatting — no HTML or markdown syntax", () => {
        const input = [makeBlock("heading_1", { rich_text: [rt("Title Text")] })] as unknown as BlockObjectResponse[];
        const text = parsePlainText(input);
        assert.ok(!text.includes("#"),  "should not contain markdown #");
        assert.ok(!text.includes("<"),  "should not contain HTML <");
        assert.ok(text.includes("Title Text"));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function rt(content: string) {
    return {
        type: "text",
        text: { content, link: null },
        plain_text: content,
        href: null,
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
    };
}

let _blockSeq = 0;
function makeBlock(type: string, content: Record<string, any>) {
    return {
        id: `mock-${++_blockSeq}`,
        object: "block",
        type,
        [type]: content,
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "",
        last_edited_time: "",
        created_by:      { id: "u", object: "user" },
        last_edited_by:  { id: "u", object: "user" },
        parent:          { type: "page_id", page_id: "p" },
    };
}
