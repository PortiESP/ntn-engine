#!/usr/bin/env npx tsx

import fs from "fs";
import { NotionDBEngine } from "../src/NotionDBEngine/ndbe";
import { configDotenv } from "dotenv";
import { richText2String } from "../src/NotionDBEngine/ndbe.utils";

configDotenv();

if (!process.env.NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN is not defined");
}

const ntn = new NotionDBEngine({
    notionToken: process.env.NOTION_TOKEN,
});


const OUTPUT_DIR: string = "./generated";
const OUTPUT_FILE: string = "ntn_interfaces.ts";

// ==========================================================================================
async function main() {
    console.log("[NotionDBEngine :: GenIfaces] Fetching Notion datasources...");
    const datasources = await ntn.getAllDatasources();

    console.log(`[NotionDBEngine :: GenIfaces] Found ${datasources.length} datasources. Generating interfaces...`);

    console.log(`[NotionDBEngine :: GenIfaces] Generating interface for: ...`);
    const results = await Promise.all(
        datasources.map(async (ds) => {
            try {
                // Get the title string safely
                const title = richText2String(ds.title);
                console.log(`  - ${title}`);
                return await ntn.generateTSInterface(ds.id, {
                    prefix: "NTN_",
                });
            } catch (e) {
                console.error(`[NotionDBEngine :: GenIfaces] Error generating interface for datasource ${ds.id}:`, e);
                return null;
            }
        })
    );

    // Filter out null results
    const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

    // Check if the result is empty
    if (validResults.length === 0) {
        console.log("[NotionDBEngine :: GenIfaces] No interfaces could be generated.");
        process.exit(0);
    }

    // Collect and deduplicate all imported types
    const allTypes = Array.from(new Set(validResults.flatMap((r) => r.types)));

    // Construct combined file content
    const fileContent = [
        // Import all types from @notionhq/client
        `import { ${allTypes.join(", ")} } from "@notionhq/client";`,
        "",
        // Map each result to its interface string and join them with double newlines
        validResults.map((r) => r.interface).join("\n\n"),
        ""
    ].join("\n");

    // Ensure output directory exists recursively
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Write standard TypeScript file
    fs.writeFileSync(`${OUTPUT_DIR}/${OUTPUT_FILE}`, fileContent);

    console.log(`[NotionDBEngine :: GenIfaces] Writing ${validResults.length} interfaces to ${OUTPUT_DIR}/${OUTPUT_FILE}`);
    console.log(`[NotionDBEngine :: GenIfaces] Successfully generated all interfaces in ${OUTPUT_DIR}/${OUTPUT_FILE}!`);
}

main().catch((err) => {
    console.error("[NotionDBEngine :: GenIfaces] Failed to generate interfaces:", err);
    process.exit(1);
});