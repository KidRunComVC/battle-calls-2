import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCard } from "./load-card.mjs";
import { renderMeterCss, renderPages } from "./render.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "site");

const stale = [
  "index.html",
  "about.html",
  "methodology.html",
  "corrections.html",
  "fine-print.html",
  "404.html",
  "css/meters.css",
  "fights/round-1-silver.html",
  "fights/round-2-bitcoin.html",
  "fights/round-3-spx.html",
];

export function build() {
  const data = loadCard(root);
  const corrections = JSON.parse(readFileSync(join(root, "data/corrections.json"), "utf8"));
  const finePrint = readFileSync(join(root, "data/fine-print.txt"), "utf8");
  const pages = renderPages(data, finePrint, corrections);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "css"), { recursive: true });
  for (const [rel, html] of pages) {
    const dest = join(out, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
  }
  writeFileSync(join(out, "css/meters.css"), renderMeterCss(data));
  cpSync(join(root, "css/tokens.css"), join(out, "css/tokens.css"));
  cpSync(join(root, "css/site.css"), join(out, "css/site.css"));
  cpSync(join(root, "assets"), join(out, "assets"), { recursive: true });
  cpSync(join(root, "robots.txt"), join(out, "robots.txt"));
  for (const rel of stale) rmSync(join(root, rel), { force: true });
  return [...pages.keys()].map((rel) => `site/${rel}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = build();
  console.log(files.join("\n"));
}
