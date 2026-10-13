// Snapshot the gallery's business cards into docs/gallery.json, so visitors
// browse it without spending GitHub's hourly limit. Run by
// .github/workflows/gallery.yml (needs `npm run build` first for dist/).
import { readFile, writeFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { escapeHtml } from "../dist/index.js";
import { readRepo } from "../docs/source.js";

// Others' repos first (public data unless they add a .fafa), then ours.
export const REPOS = [
  "aaif-goose/goose",
  "github/github-mcp-server",
  "microsoft/playwright-mcp",
  "modelcontextprotocol/typescript-sdk",
  "agentgateway/agentgateway",
  "a2aproject/A2A",
  "react/react",
  "stripe/ai",
  "cloudflare/mcp-server-cloudflare",
  "supabase/mcp",
  "nasa/fprime",
  "Wolfe-Jam/mcp-context-card",
  "Wolfe-Jam/claude-faf-mcp",
  "Wolfe-Jam/faf-mcp",
  "Wolfe-Jam/grok-faf-mcp",
  "Wolfe-Jam/gemini-faf-mcp",
];

const OUT = new URL("../docs/gallery.json", import.meta.url);
const token = process.env.GITHUB_TOKEN;
const cards = [];
for (const full of REPOS) {
  const [owner, repo] = full.split("/");
  try {
    const { ref, card, fafaPath } = await readRepo({ owner, repo }, { parseYaml, escapeHtml, token });
    cards.push({ repo: `${ref.owner}/${ref.repo}`, claimed: Boolean(fafaPath), card });
  } catch (err) {
    console.error(`skip ${full}: ${err.message}`);
  }
}

// Only rewrite when a business card changed, so an unchanged week makes no commit.
const before = await readFile(OUT, "utf8").then(JSON.parse).catch(() => undefined);
if (before && JSON.stringify(before.cards) === JSON.stringify(cards)) {
  console.log(`unchanged: ${cards.length} business cards`);
} else {
  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), cards }, null, 2) + "\n");
  console.log(`wrote ${cards.length} business cards`);
}
