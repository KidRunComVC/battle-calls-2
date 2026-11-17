import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertWeekId, weekFile } from "./load-card.mjs";

export function scaffoldWeek(root, week) {
  const id = assertWeekId(week);
  const file = weekFile(root, id);
  if (existsSync(file)) throw new Error(`Week file already exists: ${file}`);
  mkdirSync(dirname(file), { recursive: true });
  const body = {
    week: id,
    fights: [],
  };
  writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`);
  return file;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const week = process.argv[2];
  if (!week) {
    console.error("Usage: node scripts/new-week.mjs YYYY-MM-DD");
    process.exit(1);
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const file = scaffoldWeek(root, week);
  console.log(file);
}
