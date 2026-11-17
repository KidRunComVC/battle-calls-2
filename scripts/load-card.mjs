import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const ORIGINAL_WEEK = "2026-11-16";

export function assertWeekId(week) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    throw new Error(`Week id must be YYYY-MM-DD: ${week}`);
  }
  const [year, month, day] = week.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Week id is not a real date: ${week}`);
  }
  return week;
}

export function fightPath(fight) {
  const week = fight.weekId || ORIGINAL_WEEK;
  if (week === ORIGINAL_WEEK) return `/fights/${fight.id}.html`;
  return `/fights/${week}/round-${fight.round}.html`;
}

export function fightPageRel(fight) {
  return fightPath(fight).slice(1);
}

function stamp(week) {
  const fights = [...(week.fights || [])]
    .map((fight) => ({ ...fight, weekId: week.week }))
    .sort((a, b) => a.round - b.round);
  return { ...week, fights };
}

export function loadWeeks(root) {
  const dir = join(root, "data/weeks");
  const names = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const weeks = names.map((name) => {
    const week = JSON.parse(readFileSync(join(dir, name), "utf8"));
    const id = name.slice(0, -".json".length);
    if (week.week !== id) throw new Error(`Week id mismatch in ${name}`);
    assertWeekId(week.week);
    return stamp(week);
  });
  weeks.sort((a, b) => b.week.localeCompare(a.week));
  return weeks;
}

export function loadCard(root) {
  const site = JSON.parse(readFileSync(join(root, "data/site.json"), "utf8"));
  const pointer = JSON.parse(readFileSync(join(root, "data/current.json"), "utf8"));
  assertWeekId(pointer.week);
  const weeks = loadWeeks(root);
  const current = weeks.find((week) => week.week === pointer.week);
  if (!current) throw new Error(`Current week ${pointer.week} has no file`);
  return {
    site,
    currentWeek: pointer.week,
    weeks,
    fights: current.fights,
  };
}

export function weekFile(root, week) {
  return join(root, "data/weeks", `${assertWeekId(week)}.json`);
}

export function readWeek(root, week) {
  const file = weekFile(root, week);
  if (!existsSync(file)) throw new Error(`No week file for ${week}`);
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (data.week !== week) throw new Error(`Week id mismatch in ${file}`);
  return data;
}
