export { NotionEngine } from "./ntn-engine/ntn-engine.js";
export type { T_ParsedBlock } from "./ntn-parsers/index.js";

import { NotionEngine } from "./ntn-engine/ntn-engine.js";

/** Pre-built singleton. Import and call methods directly without instantiating. */
export const engine = new NotionEngine();
