import { config } from "dotenv";
import { NotionDBEngine } from "./NotionDBEngine/ndbe";
import { NotionDBEntity } from "./NotionDBEngine/db_entity";

config();

if (!process.env.NOTION_TOKEN) {
    console.error("Error: NOTION_TOKEN not found in environment variables");
    process.exit(1);
}

const ntn = new NotionDBEngine({
    notionToken: process.env.NOTION_TOKEN,
});

const entity = new NotionDBEntity("3643f965-507d-802d-b642-000b392aa766");

// console.dir(listAllPropertyTypes(), { depth: null, colors: true });

entity.generateTSInterface()
    .then((d) => console.dir(d.interface, { depth: null, colors: true }))
    .catch(console.error);