import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scaffoldWeek } from "./new-week.mjs";
import { setCurrent } from "./set-current.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "battle-weeks-"));
  mkdirSync(join(root, "data/weeks"), { recursive: true });
  writeFileSync(join(root, "data/current.json"), `${JSON.stringify({ week: "2026-11-16" }, null, 2)}\n`);
  return root;
}

test("new-week scaffolds a file and leaves the pointer alone", () => {
  const root = fixture();
  const before = readFileSync(join(root, "data/current.json"), "utf8");
  const file = scaffoldWeek(root, "2026-11-23");
  const week = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(week.week, "2026-11-23");
  assert.deepEqual(week.fights, []);
  assert.equal(readFileSync(join(root, "data/current.json"), "utf8"), before);
  assert.throws(() => scaffoldWeek(root, "2026-11-23"));
  assert.throws(() => scaffoldWeek(root, "2026-02-31"));
});

test("set-current refuses an empty week and writes the pointer when fights exist", () => {
  const root = fixture();
  scaffoldWeek(root, "2026-11-23");
  assert.throws(() => setCurrent(root, "2026-11-23"));
  writeFileSync(
    join(root, "data/weeks/2026-11-23.json"),
    `${JSON.stringify({ week: "2026-11-23", fights: [{ round: 1 }] }, null, 2)}\n`,
  );
  setCurrent(root, "2026-11-23");
  assert.deepEqual(JSON.parse(readFileSync(join(root, "data/current.json"), "utf8")), {
    week: "2026-11-23",
  });
});
