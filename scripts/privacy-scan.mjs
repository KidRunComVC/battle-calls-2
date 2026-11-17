import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const textExt = new Set([".html", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".svg", ".py", ".sh"]);
const skipDir = new Set([".git", "node_modules", "tests"]);
const allowMissing = process.argv.includes("--allow-missing");

function parseTerms(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function loadTerms() {
  if (process.env.PRIVACY_TERMS && process.env.PRIVACY_TERMS.trim()) {
    return parseTerms(process.env.PRIVACY_TERMS);
  }
  const fromEnv = process.env.PRIVACY_TERMS_FILE;
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      console.error(`privacy term file not found: ${fromEnv}`);
      process.exit(1);
    }
    return parseTerms(readFileSync(fromEnv, "utf8"));
  }
  const termsPath = join(root, ".privacy-terms.local");
  if (existsSync(termsPath)) return parseTerms(readFileSync(termsPath, "utf8"));
  return null;
}

const terms = loadTerms();
if (!terms) {
  const message =
    "privacy term list missing. Add .privacy-terms.local, or set PRIVACY_TERMS or PRIVACY_TERMS_FILE. Pass --allow-missing to skip the denylist.";
  if (!allowMissing) {
    console.error(message);
    process.exit(1);
  }
  console.error(`${message} Denylist skipped because --allow-missing was passed.`);
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (skipDir.has(name) || name.startsWith(".privacy-terms")) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

const hits = [];

function consider(label, text) {
  if (terms) {
    for (const term of terms) {
      const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) hits.push(`${label}: denylist term`);
    }
  }
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  for (const email of emails) {
    if (!/noreply/i.test(email)) hits.push(`${label}: email ${email}`);
  }
  if (/\b\d{3}[-.)]\s*\d{3}[-.]\d{4}\b/.test(text)) hits.push(`${label}: phone pattern`);
}

for (const path of walk(root)) {
  const rel = relative(root, path);
  consider(rel, rel);
  if (!textExt.has(path.slice(path.lastIndexOf(".")))) continue;
  consider(rel, readFileSync(path, "utf8"));
}

let log = "";
try {
  log = execSync("git log -p --all --format=%an%x1f%ae%x1f%cn%x1f%ce%x1f%B%x1e", {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch {
  hits.push("git log could not be read");
}

for (const record of log.split("\x1e").filter(Boolean)) {
  const [name, email, committer, committerEmail, body] = record.split("\x1f");
  for (const value of [email, committerEmail]) {
    if (value && !/noreply/i.test(value)) hits.push("git author email is not noreply");
  }
  consider("git log", `${name}\n${committer}\n${body}`);
}

if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log(terms ? "privacy scan: clean" : "privacy scan: clean (denylist skipped, --allow-missing)");
