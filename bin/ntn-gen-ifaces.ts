#!/usr/bin/env npx tsx

import fs from "fs";
import path from "path";
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

type TSInterfaceResult = {
    imports: string;
    types: string[];
    interface: string;
    interfaceName: string;
    properties: string[];
};

// ==========================================================================================
// 1. Fetch & Generate Interfaces
// ==========================================================================================
async function generateInterfaces(ntn: NotionDBEngine): Promise<TSInterfaceResult[]> {
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
                }) as TSInterfaceResult;
            } catch (e) {
                console.error(`[NotionDBEngine :: GenIfaces] Error generating interface for datasource ${ds.id}:`, e);
                return null;
            }
        })
    );

    // Filter out null results
    const validResults = results.filter((r): r is TSInterfaceResult => r !== null);

    // Check if the result is empty
    if (validResults.length === 0) {
        console.log("[NotionDBEngine :: GenIfaces] No interfaces could be generated.");
        process.exit(0);
    }

    return validResults;
}

// ==========================================================================================
// 2. Write Interfaces to File
// ==========================================================================================
function writeInterfacesToFile(validResults: TSInterfaceResult[]) {
    // Collect and deduplicate all imported types
    const allTypes = Array.from(new Set(validResults.flatMap((r) => r.types)));

    // Construct combined file content
    const fileContent = [
        // Import all types from @notionhq/client
        `import { ${allTypes.join(", ")} } from "@notionhq/client";`,
        // Map each result to its interface string and join them with double newlines
        "", validResults.map((r) => r.interface).join("\n\n"), ""
    ].join("\n");

    // Ensure output directory exists recursively
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    // Write standard TypeScript file
    fs.writeFileSync(path.join(OUTPUT_DIR, OUTPUT_FILE), fileContent);

    console.log(`[NotionDBEngine :: GenIfaces] Writing ${validResults.length} interfaces to ${OUTPUT_DIR}/${OUTPUT_FILE}`);
    console.log(`[NotionDBEngine :: GenIfaces] Successfully generated all interfaces in ${OUTPUT_DIR}/${OUTPUT_FILE}!`);
}

// ==========================================================================================
// 3. Verification (Native Grep Equivalent)
// ==========================================================================================
function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllTsFiles(filePath, fileList);
        } else if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

function verifyInterfaces(validResults: TSInterfaceResult[]) {
    console.log("\n[NotionDBEngine :: GenIfaces] Starting Interface Property Verification...");

    const srcDir = path.join(process.cwd(), "src");
    const tsFiles = getAllTsFiles(srcDir);
    const codeContent = tsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

    let validationIssues = 0;

    for (const r of validResults) {
        const interfaceName = r.interfaceName;
        const generatedProps = new Set(r.properties);
        const usedProps = new Set<string>();

        // Match InterfaceName.PropName
        const dotRegex = new RegExp(`${interfaceName}\\.([a-zA-Z0-9_]+)`, "g");
        let match;
        while ((match = dotRegex.exec(codeContent)) !== null) {
            usedProps.add(match[1]);
        }

        // Match InterfaceName["PropName"] or InterfaceName['PropName']
        const bracketRegex = new RegExp(`${interfaceName}\\[["']([^"']+)["']\\]`, "g");
        while ((match = bracketRegex.exec(codeContent)) !== null) {
            usedProps.add(match[1]);
        }

        // 1. Check if generated properties are used in code
        for (const genProp of generatedProps) {
            if (!usedProps.has(genProp)) {
                console.warn(`  ⚠️  Warning: Property "${genProp}" exists in Notion schema for "${interfaceName}", but is never used in the code.`);
                validationIssues++;
            }
        }

        // 2. Check if properties used in code actually exist in the generated interface
        for (const usedProp of usedProps) {
            if (!generatedProps.has(usedProp)) {
                console.error(`  ❌ Error: The code expects "${interfaceName}" to have property "${usedProp}", but it doesn't exist in the Notion schema!`);
                validationIssues++;
            }
        }
    }

    if (validationIssues === 0) {
        console.log(`[NotionDBEngine :: GenIfaces] ✅ Verification passed! All properties map correctly.`);
    } else {
        console.log(`\n[NotionDBEngine :: GenIfaces] ⚠️  Verification finished with ${validationIssues} issues.`);
    }
}

// ==========================================================================================
// MAIN ENTRY POINT
// ==========================================================================================
async function main() {
    console.log('\n');
    const validResults = await generateInterfaces(ntn);
    writeInterfacesToFile(validResults);
    verifyInterfaces(validResults);
    console.log('');
}

main().catch((err) => {
    console.error("[NotionDBEngine :: GenIfaces] Failed to generate interfaces:", err);
    process.exit(1);
});