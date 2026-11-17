import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { escapeText, renderCorrections, renderDocument, renderFight, renderHome, renderPages } from "./render.mjs";

const root = join(import.meta.dirname, "..");
const data = JSON.parse(readFileSync(join(root, "data/fights.json"), "utf8"));
const corrections = JSON.parse(readFileSync(join(root, "data/corrections.json"), "utf8"));
const finePrint = readFileSync(join(root, "data/fine-print.txt"), "utf8");
const pages = renderPages(data, finePrint, corrections);
const all = [...pages.values()].join("\n");
const home = pages.get("index.html");
const official = pages.get("fights/round-3-spx.html");
const silver = pages.get("fights/round-1-silver.html");
const bitcoin = pages.get("fights/round-2-bitcoin.html");

test("every page carries the required head, footer, and fine-print link", () => {
  for (const html of pages.values()) {
    assert.match(html, /noindex, nofollow/);
    assert.match(html, /name="referrer" content="no-referrer"/);
    assert.match(html, /default-src 'self'/);
    assert.match(html, /form-action 'none'/);
    assert.doesNotMatch(html, /web3forms/);
    assert.match(html, /Skip to content/);
    assert.equal(html.match(/<img\b/gi).length, 1);
    assert.match(html, /class="header-banner" src="\/battle-calls-2\/assets\/img\/header-banner\.webp" width="1200" height="500" alt="Bull and bear boxers squared off in a spotlit ring" loading="eager"/);
    assert.match(html, /twitter:card" content="summary_large_image"/);
    assert.equal(html.split(data.site.footerLine).length - 1, 1);
    assert.match(html, /href="\/battle-calls-2\/fine-print\.html"/);
    assert.match(html, /rel="canonical" href="https:\/\/kidruncomvc\.github\.io\/battle-calls-2\//);
    assert.match(html, /property="og:url" content="https:\/\/kidruncomvc\.github\.io\/battle-calls-2\//);
    assert.match(html, /property="og:image" content="https:\/\/kidruncomvc\.github\.io\/battle-calls-2\/assets\/og\//);
    assert.doesNotMatch(html, /(?:href|content)="\/(?!battle-calls-2\/)/);
    assert.doesNotMatch(html, /<script/);
    assert.doesNotMatch(html, /<style/);
    assert.doesNotMatch(html, /\sstyle=/);
    for (const tag of html.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)) {
      assert.match(tag[0], /rel="noopener noreferrer"/);
    }
  }
});

test("fine print is verbatim and additional", () => {
  const page = pages.get("fine-print.html");
  assert.ok(page.includes(finePrint.trimEnd()));
  assert.match(page, /^------ THE MANAGEMENT$/m);
  assert.match(page, /This notice is in addition to the formal disclaimers/);
  assert.match(all, new RegExp(data.site.teaser.replace(/[.]/g, "\\.")));
});

test("home lists rounds in ascending order starting at Round 1", () => {
  assert.equal(home.split('class="cta"').length - 1, 1);
  assert.match(home, /Open the fight card/);
  assert.doesNotMatch(home, /coming soon/i);
  assert.doesNotMatch(home, /Undercard/);
  assert.doesNotMatch(all, /Round 4/);
  assert.doesNotMatch(all, /round-4-spx|round-2-silver|round-3-bitcoin/);
  const silverAt = home.indexOf("fights/round-1-silver.html");
  const bitcoinAt = home.indexOf("fights/round-2-bitcoin.html");
  const officialAt = home.indexOf("fights/round-3-spx.html");
  assert.ok(silverAt >= 0 && silverAt < bitcoinAt && bitcoinAt < officialAt);
  assert.equal(home.split(data.site.teaser).length - 1, 3);
  assert.match(home, /OFFICIAL TITLE FIGHT/);
  assert.match(home, /Round 1/);
  assert.match(home, new RegExp(data.site.tagline));
  assert.match(home, new RegExp(data.site.referee));
  assert.match(home, new RegExp(data.site.rulesBlurb));
  for (const html of [pages.get("methodology.html"), pages.get("about.html"), pages.get("404.html")]) {
    const one = html.indexOf("Round 1: Silver");
    const two = html.indexOf("Round 2: Bitcoin");
    const three = html.indexOf("Round 3: S&amp;P 500");
    assert.ok(one >= 0 && one < two && two < three);
  }
  assert.match(home, /href="\/battle-calls-2\/fights\/round-1-silver\.html"/);
  assert.match(silver, /rel="canonical" href="https:\/\/kidruncomvc\.github\.io\/battle-calls-2\/fights\/round-1-silver\.html"/);
});

test("launch quotes, numbers, and caveats are verbatim", () => {
  for (const fight of data.fights) {
    const html = pages.get(`fights/${fight.id}.html`);
    assert.match(html, new RegExp(fight.label));
    assert.match(html, /0-0-0/);
    assert.ok(html.includes(escapeText(fight.instrumentDetail)));
    if (fight.entriesSentence) assert.ok(html.includes(escapeText(fight.entriesSentence)));
    if (fight.koSummary) assert.ok(html.includes(escapeText(fight.koSummary)));
    if (fight.tkoSummary) assert.ok(html.includes(escapeText(fight.tkoSummary)));
    if (fight.decisionSummary) assert.ok(html.includes(escapeText(fight.decisionSummary)));
    assert.match(html, /Tale of the Tape/);
    assert.match(html, /Rules of the Ring/);
    assert.match(html, new RegExp(fight.cardText.replace(/[.]/g, "\\.")));
    for (const corner of fight.corners) {
      for (const quote of corner.quotes || [{ texts: [corner.quote] }]) {
        for (const text of quote.texts || [quote.text]) assert.ok(html.includes(escapeText(text)), text);
      }
    }
    for (const caveat of fight.caveats) {
      if (typeof caveat === "string") assert.ok(html.includes(escapeText(caveat)), caveat);
    }
  }
  assert.match(official, /Since deleted: Minervini deleted a Nov 16 post and reposted it at 4:58 PM ET to fix a date typo; the repost is linked above\. It isn't used for scoring\./);
  assert.equal(official.match(/<img\b/gi).length, 1);
  assert.match(official, /header-banner\.webp/);
  assert.match(official, /TV CALL: CNBC Squawk Box, Thu Nov 5, 2026, 6:42 AM ET/);
  assert.match(official, /Exact spoken wording pending a tape check\./);
  assert.match(official, /as of Nov 16 close/);
  assert.match(official, /Minervini leads on the scorecard\./);
  assert.match(official, /TKO \(stop hit\)/);
  assert.match(official, /miniscule/);
  assert.doesNotMatch(official, /x\.com\/[^"']*yardeni/i);
  assert.match(official, /https:\/\/www\.cnbc\.com\/video\/2026\/11\/05\/ed-yardeni-on-his-7900-sp-500-year-end-target-santa-is-coming\.html/);
  assert.match(silver, /EXHIBITION/);
  assert.match(bitcoin, /EXHIBITION/);
  assert.match(pages.get("corrections.html"), /No corrections yet\./);
});

test("scorecard finishes and edge states", () => {
  function page(status, phrase, cornerPatch) {
    const fight = structuredClone(data.fights[0]);
    fight.status = status;
    if (phrase) fight.result = { phrase };
    if (cornerPatch) cornerPatch(fight.corners[0]);
    return renderDocument(data.site, renderFight(data, fight));
  }
  const ko = page("ko", "the $34.00 SI call");
  assert.match(ko, /WINNER BY KO: the \$34\.00 SI call\./);
  assert.match(ko, /Respect to both corners/);
  const tko = page("tko", "the stop was hit");
  assert.match(tko, />TKO</);
  assert.match(tko, /stop hit/);
  assert.match(tko, /WINNER BY TKO: the stop was hit\./);
  const decision = page("decision", "the BULL call");
  assert.match(decision, /WINNER BY DECISION: the BULL call\./);
  assert.match(page("draw"), /DRAW\. The move finished inside the draw band/);
  assert.match(page("no_contest"), /NO CONTEST\.\.\. still undefeated, the market\./);
  assert.doesNotMatch(silver, /Respect to both corners/);
  const deleted = page("pending", null, (corner) => {
    corner.handle = "A".repeat(80);
    corner.postState = "deleted";
    corner.quote = "UNIQUE-DELETED-BODY";
    corner.deletedNotice = "Since deleted.";
    corner.profileUrl = "https://x.com/" + corner.handle;
  });
  assert.match(deleted, /Since deleted\./);
  assert.doesNotMatch(deleted, /UNIQUE-DELETED-BODY/);
  assert.doesNotMatch(deleted, /Archive of the original post/);
  assert.ok(deleted.includes("A".repeat(80)));
  assert.throws(() => page("retired"));
  const empty = renderDocument(data.site, renderHome({ ...data, fights: [] }));
  assert.match(empty, /No bouts on the card yet\./);
  const logged = renderDocument(
    data.site,
    renderCorrections(data, {
      entries: [
        { date: "2026-12-01", bout: "Round 2", change: "Earlier", reason: "First" },
        { date: "2026-12-02", bout: "Round 4", change: "Later", reason: "Second" },
      ],
    }),
  );
  assert.ok(logged.indexOf("Later") < logged.indexOf("Earlier"));
});
