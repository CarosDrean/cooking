import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SERVER_TYPES = resolve(root, "server/src/types.ts");
const CLIENT_TYPES = resolve(root, "client/src/types.ts");

const CLIENT_ONLY_BLOCK = `
export interface OpenverseImage {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    creator: string;
    license: string;
    width: number;
    height: number;
    foreign_landing_url: string;
}
`;

function generateClientTypes() {
    let content = readFileSync(SERVER_TYPES, "utf-8");

    // Strip server-only blocks marked with @client-omit-start / @client-omit-end
    content = content.replace(/ *\/\/ @client-omit-start\n[\s\S]*?\/\/ @client-omit-end\n?/g, "");

    // Collapse multiple consecutive blank lines (max 1 blank line between blocks)
    content = content.replace(/\n{3,}/g, "\n\n");

    // Ensure exactly one trailing newline before appending
    content = content.replace(/\n+$/, "\n");

    // Append client-only types
    content += CLIENT_ONLY_BLOCK;

    return content;
}

const generated = generateClientTypes();

if (process.argv.includes("--check")) {
    const existing = readFileSync(CLIENT_TYPES, "utf-8");

    if (existing !== generated) {
        console.error("ERROR: client/src/types.ts is out of sync with server/src/types.ts");
        console.error("Run 'pnpm sync-types' to regenerate.");
        process.exit(1);
    }

    console.log("OK: client/src/types.ts is in sync with server/src/types.ts");
    process.exit(0);
}

writeFileSync(CLIENT_TYPES, generated, "utf-8");
console.log("OK: client/src/types.ts synced from server/src/types.ts");
