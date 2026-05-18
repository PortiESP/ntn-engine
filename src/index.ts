import { config } from "dotenv";
import { NotionDBEngine } from "./NotionDBEngine/ndbe";
import { normalizeId } from "./NotionDBEngine/ndbe.utils";

config();

if (!process.env.NOTION_TOKEN) {
    console.error("Error: NOTION_TOKEN not found in environment variables");
    process.exit(1);
}

const ntn = new NotionDBEngine({
    notionToken: process.env.NOTION_TOKEN,
});

ntn.getAllPages()
    .then((d) => console.dir(d, { depth: null, colors: true }))
    .catch(console.error);