import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../css/tokens.css"), "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));

function lin(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function lum(hex) {
  const n = hex.slice(1);
  const r = lin(parseInt(n.slice(0, 2), 16));
  const g = lin(parseInt(n.slice(2, 4), 16));
  const b = lin(parseInt(n.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = [
  ["color-ink", "color-bg", 4.5],
  ["color-ink", "color-bg-raised", 4.5],
  ["color-ink", "color-bg-band", 4.5],
  ["color-ink", "color-bg-worst", 4.5],
  ["color-muted", "color-bg", 4.5],
  ["color-muted", "color-bg-raised", 4.5],
  ["color-muted", "color-bg-band", 4.5],
  ["color-muted", "color-bg-worst", 4.5],
  ["color-gold", "color-bg", 4.5],
  ["color-gold", "color-bg-raised", 4.5],
  ["color-gold", "color-bg-worst", 4.5],
  ["color-focus", "color-bg", 3],
  ["color-on-blood", "color-blood", 4.5],
  ["color-on-blood", "color-blood-hot", 4.5],
  ["color-bg", "color-gold", 4.5],
];

let failed = false;
for (const [fg, bg, min] of pairs) {
  const ratio = contrast(tokens[fg], tokens[bg]);
  const ok = ratio >= min;
  console.log(`${ok ? "pass" : "FAIL"} ${ratio.toFixed(2)} ${fg} on ${bg} (need ${min})`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
