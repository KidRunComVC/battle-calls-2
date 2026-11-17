import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readWeek } from "./load-card.mjs";

export function setCurrent(root, week) {
  const data = readWeek(root, week);
  if (!Array.isArray(data.fights) || data.fights.length === 0) {
    throw new Error(`Week ${week} has no fights. Fill the card before making it current.`);
  }
  const file = join(root, "data/current.json");
  writeFileSync(file, `${JSON.stringify({ week: data.week }, null, 2)}\n`);
  return file;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const week = process.argv[2];
  if (!week) {
    console.error("Usage: node scripts/set-current.mjs YYYY-MM-DD");
    process.exit(1);
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const file = setCurrent(root, week);
  console.log(file);
}
