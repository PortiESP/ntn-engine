# @porti-esp/ntn-engine

A TypeScript engine for querying and managing Notion databases via the Notion API.

## Installation

```bash
npm install @porti/ntn-engine
# or
pnpm add @porti/ntn-engine
```

## Environment Variables

```env
NOTION_TOKEN=your_notion_integration_token

# Required only if you use webhooks
NOTION_WEBHOOK_VERIFICATION_TOKEN=your_webhook_verification_token
```

To get your `NOTION_TOKEN`, go to [https://www.notion.so/profile/integrations](https://www.notion.so/profile/integrations), create an integration, and copy the Internal Integration Secret. Make sure the integration has access to the databases you want to query.

## Quick Start

Import the pre-built singleton and call methods directly — no setup required.

```typescript
import { engine } from "@porti/ntn-engine";

const entries = await engine.getEntries("My Projects");
const entry   = await engine.getEntry("My Projects", "My first project");
const content = await engine.getEntryContent("My Projects", "My first project");
const schema  = await engine.getSchema("My Projects");
const blocks  = await engine.getPageContent("page-id-here");
```

If you need a custom configuration (e.g. caching), instantiate your own:

```typescript
import { NotionEngine } from "@porti/ntn-engine";

const myEngine = new NotionEngine({ enabled: true, ttl: 300 });
```

## Write Operations

```typescript
// Create an entry
await engine.createEntry("My Pages", {
    Name: { title: [{ text: { content: "New page" } }] },
    Status: { select: { name: "In progress" } },
});

// Update an entry by its page title
await engine.updateEntry("My Pages", "New page", {
    Status: { select: { name: "Done" } },
});

// Delete an entry by its page title (moves to trash)
await engine.deleteEntry("My Pages", "New page");
```

## Querying with Filters

`getEntries` accepts standard Notion query parameters:

```typescript
const filtered = await engine.getEntries("My Pages", {
    filter: {
        property: "Status",
        select: { equals: "In progress" },
    },
    sorts: [{ property: "Created", direction: "descending" }],
});
```

## Using IDs Directly

Every title-based method has a `*ById` variant. Use these when you already have the page ID to skip the title lookup:

```typescript
const pageId = "3d4f1a2b-...";

const entry   = await engine.getEntryById("My Pages", pageId);
const content = await engine.getEntryContentById("My Pages", pageId);

await engine.updateEntryById("My Pages", pageId, { Status: { select: { name: "Done" } } });
await engine.deleteEntryById("My Pages", pageId);
await engine.appendImageBlockById("My Pages", pageId, { data: buffer, filename: "photo.png" });
await engine.setFilePropertyById("My Pages", pageId, "Attachments", [{ data: buffer, filename: "doc.pdf" }]);
```

## Cache

Pass cache options to the constructor to avoid redundant API calls:

```typescript
const engine = new NotionEngine({ enabled: true, ttl: 300 }); // TTL in seconds, defaults to 60
```

Cache is invalidated automatically on any write operation (create, update, delete, file upload).

## File Uploads

```typescript
import fs from "fs";

// Append an image block to a page (by title)
await engine.appendImageBlock("My Pages", "New page", {
    data: fs.readFileSync("./photo.png"),
    filename: "photo.png",
});

// Set a files-type property on an entry (by title)
await engine.setFileProperty("My Pages", "New page", "Attachments", [
    { data: fs.readFileSync("./doc.pdf"), filename: "doc.pdf" },
]);
```

## Webhooks

`NotionEngine` has built-in webhook handling that verifies the request signature and automatically invalidates the cache for the affected database.

### 1. Add the env var

```env
NOTION_WEBHOOK_VERIFICATION_TOKEN=your_webhook_verification_token
```

### 2. Create a webhook endpoint

```typescript
// Express example
import express from "express";
import { NotionEngine } from "@porti/ntn-engine";

const app = express();
const engine = new NotionEngine();

app.post("/notion-webhook", express.json(), async (req, res) => {
    try {
        const signature = req.headers["x-notion-signature"] as string;
        await engine.handleWebhook(req.body, signature);
        res.sendStatus(200);
    } catch (err) {
        res.sendStatus(400);
    }
});
```

### 3. Register and verify the webhook in Notion

1. Go to your integration settings → **Webhooks** tab → create a new webhook pointing to your endpoint.
2. Notion sends a `POST` with a `verification_token` in the body. The engine logs it to the console:
   ```
   [NOTION VERIFICATION TOKEN]: abc123...
   ```
3. Copy that token into `NOTION_WEBHOOK_VERIFICATION_TOKEN` in your `.env`, and paste it in the Notion integration webhook settings → click **Verify**.

After verification, every incoming request is validated against the `x-notion-signature` header. Invalid signatures throw, so wrap `handleWebhook` in a try/catch and respond with `400` on failure.

## Framework Environments (Astro, Vite, Next.js, …)

In framework environments that use `import.meta.env` instead of `process.env`, instantiate `NotionFetcher` directly and pass the token explicitly:

```typescript
import { NotionFetcher } from "@porti/ntn-engine/fetcher";

const fetcher = new NotionFetcher({ notionToken: import.meta.env.NOTION_TOKEN });
```

The `NotionEngine` class is framework-safe to import — it does not read environment variables at module load time.

## CLI — Generate TypeScript Interfaces

The package ships a CLI tool that generates TypeScript interfaces for all your databases into `./generated/ntn_interfaces.ts`.

```bash
npx ntn-gen-ifaces
```

Requires `NOTION_TOKEN` in the environment. Import the generated types:

```typescript
import type { NTN_MyProjects } from "./generated/ntn_interfaces";
```
