# @porti-esp/ntn-engine

A TypeScript engine for querying and managing Notion databases via the Notion API.

## Installation

```bash
npm install @porti/ntn-engine
# or
pnpm add @porti/ntn-engine
```

## Environment Variables

Create a `.env` file in your project root:

```env
NOTION_TOKEN=your_notion_integration_token

# Required only if you use webhooks
NOTION_WEBHOOK_VERIFICATION_TOKEN=your_webhook_verification_token
```

To get your `NOTION_TOKEN`, go to [https://www.notion.so/profile/integrations](https://www.notion.so/profile/integrations), create an integration, and copy the Internal Integration Secret. Make sure the integration has access to the databases you want to query.

## Quick Start

```typescript
import { NotionEngine } from "@porti/ntn-engine";

const engine = new NotionEngine();

// Initialize with the exact names of your Notion databases
await engine.setup(["My Projects", "Tasks"]);

// Read entries
const entries = await engine.getEntries("My Projects");

// Read a single entry
const entry = await engine.getEntry("My Projects", "page-id-here");

// Read a page's block content
const content = await engine.getEntryContent("My Projects", "page-id-here");

// Read the database schema
const schema = await engine.getSchema("My Projects");
```

## Write Operations

```typescript
// Create an entry
await engine.createEntry("Tasks", {
    Name: { title: [{ text: { content: "New task" } }] },
    Status: { select: { name: "In progress" } },
});

// Update an entry
await engine.updateEntry("Tasks", "page-id-here", {
    Status: { select: { name: "Done" } },
});

// Delete an entry (moves to trash)
await engine.deleteEntry("Tasks", "page-id-here");
```

## Querying with Filters

The `getEntries` method accepts the standard Notion query parameters:

```typescript
const filtered = await engine.getEntries("Tasks", {
    filter: {
        property: "Status",
        select: { equals: "In progress" },
    },
    sorts: [
        { property: "Created", direction: "descending" },
    ],
});
```

## Cache

Pass cache options to `setup` to avoid redundant API calls:

```typescript
await engine.setup(["My Projects", "Tasks"], {
    enabled: true,
    ttl: 60, // seconds — defaults to 60
});
```

Cache is invalidated automatically on any write operation (create, update, delete, file upload) for that database.

## File Uploads

```typescript
import fs from "fs";

// Append an image block to a page
await engine.appendImageBlock("Tasks", "page-id-here", {
    data: fs.readFileSync("./photo.png"),
    filename: "photo.png",
});

// Set a files-type property on an entry
await engine.setFileProperty("Tasks", "page-id-here", "Attachments", [
    { data: fs.readFileSync("./doc.pdf"), filename: "doc.pdf" },
]);
```

## Webhooks

`NotionEngine` has built-in webhook handling that verifies the request signature and automatically invalidates the cache for the affected database.

### 1. Set up the env var

Add the webhook verification token to your `.env`:

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
await engine.setup(["My Projects", "Tasks"]);

app.post("/notion-webhook", express.json(), async (req, res) => {
    const signature = req.headers["x-notion-signature"] as string;
    await engine.handleWebhook(req.body, signature);
    res.sendStatus(200);
});
```

### 3. Register and verify the webhook in Notion

1. Go to your integration settings → **Webhooks** tab → create a new webhook pointing to your endpoint.
2. Notion will send a `POST` with a `verification_token` in the body. The engine will log it to the console:
   ```
   [NOTION VERIFICATION TOKEN]: abc123...
   ```
3. Copy that token and:
   - Paste it into `NOTION_WEBHOOK_VERIFICATION_TOKEN` in your `.env`
   - Paste it in the Notion integration webhook settings and click **Verify**

After verification, the engine will validate the `x-notion-signature` header on every incoming request and invalidate the relevant database cache when page events are received.

## CLI — Generate TypeScript Interfaces

The package ships a CLI tool that connects to your Notion workspace and generates TypeScript interfaces for all your databases into `./generated/ntn_interfaces.ts`.

```bash
npx ntn-gen-ifaces
```

Requires `NOTION_TOKEN` in the environment. You can then import the generated types:

```typescript
import type { NTN_MyProjects } from "./generated/ntn_interfaces";
```
