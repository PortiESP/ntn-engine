/**
 * Integration tests for NotionEngine.
 * Requires NOTION_TOKEN in .env and the "Emperors" database to exist.
 *
 * Emperors schema: Name (title), Age (number), Nacimiento (date)
 * Seed entries:    Marco Aurelioo, Julio Cesar, Pablo
 */
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { NotionEngine } from "../src/index.js";

const DB = "Emperors";
const TEST_NAME = `__test_${Date.now()}`;

// ─────────────────────────────────────────────────────────────────────────────
// Lazy DB resolution
// ─────────────────────────────────────────────────────────────────────────────

describe("lazy DB resolution", () => {
    test("title2Id and id2Title start empty", () => {
        const e = new NotionEngine();
        assert.deepEqual(e.title2Id, {});
        assert.deepEqual(e.id2Title, {});
    });

    test("maps are populated after the first API call", async () => {
        const e = new NotionEngine();
        await e.getEntries(DB);
        const id = e.title2Id[DB];
        assert.ok(id, "title2Id[DB] should be set");
        assert.equal(e.id2Title[id], DB);
    });

    test("ID does not change on repeated calls", async () => {
        const e = new NotionEngine();
        await e.getEntries(DB);
        const id1 = e.title2Id[DB];
        await e.getEntries(DB);
        assert.equal(e.title2Id[DB], id1);
    });

    test("throws for a non-existent database", async () => {
        const e = new NotionEngine();
        await assert.rejects(
            () => e.getEntries("__no_such_db__"),
            /not found/i
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

describe("read", () => {
    const engine = new NotionEngine();

    describe("getEntries", () => {
        test("returns all seed entries", async () => {
            const entries = await engine.getEntries(DB);
            assert.ok(entries.length >= 3);
        });

        test("entries contain expected names", async () => {
            const entries = await engine.getEntries(DB);
            const names = entries.map(e => {
                const p = Object.values(e.properties).find(p => p.type === "title") as any;
                return p?.title?.[0]?.plain_text ?? "";
            });
            assert.ok(names.includes("Julio Cesar"), "missing Julio Cesar");
            assert.ok(names.includes("Pablo"), "missing Pablo");
        });

        test("accepts a filter query", async () => {
            const entries = await engine.getEntries(DB, {
                filter: { property: "Age", number: { equals: 80 } },
            } as any);
            assert.ok(entries.length >= 1, "at least one entry with Age=80");
        });
    });

    describe("getSchema", () => {
        test("contains expected columns", async () => {
            const schema = await engine.getSchema(DB);
            const keys = Object.keys(schema.properties);
            assert.ok(keys.includes("Name"),       "missing Name");
            assert.ok(keys.includes("Age"),        "missing Age");
            assert.ok(keys.includes("Nacimiento"), "missing Nacimiento");
        });

        test("Name column is of type title", async () => {
            const schema = await engine.getSchema(DB);
            assert.equal(schema.properties["Name"].type, "title");
        });

        test("Age column is of type number", async () => {
            const schema = await engine.getSchema(DB);
            assert.equal(schema.properties["Age"].type, "number");
        });
    });

    describe("getEntry / getEntryById", () => {
        test("getEntry finds an entry by title", async () => {
            const entry = await engine.getEntry(DB, "Julio Cesar");
            assert.ok(entry.id);
        });

        test("getEntryById returns the same entry as getEntry", async () => {
            const byTitle = await engine.getEntry(DB, "Julio Cesar");
            const byId    = await engine.getEntryById(DB, byTitle.id);
            assert.equal(byId.id, byTitle.id);
        });

        test("getEntry throws for a non-existent title", async () => {
            await assert.rejects(
                () => engine.getEntry(DB, "__no_such_entry__"),
                /not found/i
            );
        });
    });

    describe("getEntryContent / getEntryContentById / getPageContent", () => {
        test("getEntryContent returns a blocks array", async () => {
            const blocks = await engine.getEntryContent(DB, "Marco Aurelioo");
            assert.ok(Array.isArray(blocks));
        });

        test("getEntryContentById returns a blocks array", async () => {
            const entry  = await engine.getEntry(DB, "Marco Aurelioo");
            const blocks = await engine.getEntryContentById(DB, entry.id);
            assert.ok(Array.isArray(blocks));
        });

        test("getPageContent returns blocks by bare page ID", async () => {
            const entry  = await engine.getEntry(DB, "Marco Aurelioo");
            const blocks = await engine.getPageContent(entry.id);
            assert.ok(Array.isArray(blocks));
        });

        test("all three content methods return the same block count", async () => {
            const entry   = await engine.getEntry(DB, "Marco Aurelioo");
            const byTitle = await engine.getEntryContent(DB, "Marco Aurelioo");
            const byId    = await engine.getEntryContentById(DB, entry.id);
            const direct  = await engine.getPageContent(entry.id);
            assert.equal(byTitle.length, byId.length);
            assert.equal(byId.length,   direct.length);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe("CRUD", () => {
    const engine = new NotionEngine();
    let entryId  = "";

    after(async () => {
        if (entryId) {
            try { await engine.deleteEntryById(DB, entryId); } catch {}
        }
    });

    test("createEntry adds a new entry and returns its ID", async () => {
        const result = await engine.createEntry(DB, {
            Name: { title: [{ text: { content: TEST_NAME } }] },
            Age:  { number: 1 },
        });
        assert.ok(result.id, "result should have an id");
        entryId = result.id;
    });

    test("updateEntryById updates a property", async () => {
        assert.ok(entryId, "depends on createEntry");
        const result = await engine.updateEntryById(DB, entryId, {
            Age: { number: 99 },
        });
        assert.equal(result.id, entryId);
    });

    test("updateEntry updates by title", async () => {
        assert.ok(entryId, "depends on createEntry");
        const result = await engine.updateEntry(DB, TEST_NAME, { Age: { number: 100 } });
        assert.equal(result.id, entryId);
    });

    test("deleteEntry removes by title", async () => {
        assert.ok(entryId, "depends on createEntry");
        const result = await engine.deleteEntry(DB, TEST_NAME);
        assert.ok(result.id);
        entryId = ""; // mark as cleaned up
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────────────────────

describe("cache", () => {
    test("two getEntries calls with cache return the same IDs", async () => {
        const engine = new NotionEngine({ enabled: true, ttl: 30 });
        const first  = await engine.getEntries(DB);
        const second = await engine.getEntries(DB);
        assert.deepEqual(
            first.map(e => e.id).sort(),
            second.map(e => e.id).sort()
        );
    });

    test("write invalidates the entry list cache", async () => {
        const engine = new NotionEngine({ enabled: true, ttl: 30 });

        const before = await engine.getEntries(DB);

        const created = await engine.createEntry(DB, {
            Name: { title: [{ text: { content: `__cache_test_${Date.now()}` } }] },
        });

        // After createEntry the cache is invalidated — fresh fetch should see new entry
        const after = await engine.getEntries(DB);
        assert.ok(after.length > before.length || after.some(e => e.id === created.id),
            "cache should have been invalidated by createEntry");

        // Cleanup
        await engine.deleteEntryById(DB, created.id);
    });
});
