import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadCard } from "./load-card.mjs";
import { renderArchiveIndex, renderCorrections, renderDocument, renderFight, renderHome, renderPages } from "./render.mjs";

const root = join(import.meta.dirname, "..");
const data = loadCard(root);
const corrections = JSON.parse(readFileSync(join(root, "data/corrections.json"), "utf8"));
const finePrint = readFileSync(join(root, "data/fine-print.txt"), "utf8");
const pages = renderPages(data, finePrint, corrections);
const all = [...pages.values()].join("\n");
const home = pages.get("index.html");

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
    const nav = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0];
    assert.match(nav, /The card[\s\S]*Methodology[\s\S]*Corrections[\s\S]*About[\s\S]*Archive/);
    assert.doesNotMatch(nav, /Round [123]|\/fights\//);
    const footer = html.match(/<nav aria-label="Footer"[\s\S]*?<\/nav>/)[0];
    assert.match(footer, /The card[\s\S]*Methodology[\s\S]*Corrections[\s\S]*About[\s\S]*Archive[\s\S]*Fine print/);
    assert.doesNotMatch(footer, /Round [123]|\/fights\//);
  }
});

test("fine print is verbatim and additional", () => {
  const page = pages.get("fine-print.html");
  assert.ok(page.includes(finePrint.trimEnd()));
  assert.match(page, /^------ THE MANAGEMENT$/m);
  assert.match(page, /This notice is in addition to the formal disclaimers/);
});

test("the card, archive, and standing pages have no bouts", () => {
  assert.match(home, /<h1 id="empty-card">The card<\/h1>/);
  assert.match(home, /No bout scheduled yet\. New fights are coming\./);
  assert.doesNotMatch(home, /Open the fight card|coming soon|Undercard|\/fights\//i);
  assert.match(home, /property="og:image" content="https:\/\/kidruncomvc\.github\.io\/battle-calls-2\/assets\/og\/site\.png"/);
  assert.match(home, /Two calls enter\. One walks out\./);
  assert.match(home, new RegExp(data.site.rulesBlurb));
  assert.match(home, /href="\/battle-calls-2\/archive\/"/);
  assert.match(home, /href="\/battle-calls-2\/methodology\.html"/);
  const archive = pages.get("archive/index.html");
  assert.equal(pages.get("archive/2026-11-16/index.html"), undefined);
  assert.equal(pages.get("fights/round-1-silver.html"), undefined);
  assert.equal(pages.get("fights/round-2-bitcoin.html"), undefined);
  assert.equal(pages.get("fights/round-3-spx.html"), undefined);
  assert.match(archive, /<h1>Archive<\/h1>/);
  assert.match(archive, /No bout scheduled yet\. New fights are coming\./);
  assert.doesNotMatch(archive, /Week of Nov 16|Open the fight card|\/fights\//);
  for (const html of [pages.get("methodology.html"), pages.get("about.html"), pages.get("404.html"), pages.get("corrections.html")]) {
    assert.doesNotMatch(html, /On this card|round-list|\/fights\//);
  }
  assert.match(pages.get("corrections.html"), /No corrections yet\./);
  assert.match(pages.get("fine-print.html"), /href="\/battle-calls-2\/fine-print\.html" aria-current="page"/);
  assert.doesNotMatch(
    all,
    /PeterLBrandt|PeterSchiff|benjamincowen|DrJStrategy|markminervini|Yardeni|Minervini|Brandt|Schiff|Cowen|Thorne|round-1-silver|round-2-bitcoin|round-3-spx/,
  );
});

function sampleCorner(side, handle) {
  return {
    side,
    cornerLabel: side === "bear" ? "Bear corner" : "Bull corner",
    handle,
    name: handle,
    initials: handle.slice(0, 2).toUpperCase(),
    profileUrl: `https://x.com/${handle}`,
    postUrl: `https://x.com/${handle}/status/1`,
    postId: "1",
    calledAtEt: "1:00 PM ET, Nov 16, 2026",
    calledAtUtc: "2026-11-16T18:00:00Z",
    calledAtNote: "18:00:00 UTC",
    quote: "A sample call for the renderer.",
    postState: "live",
    entryDisplay: "$1.00",
    entryNote: "Sample print.",
    targetInWords: "A sample target.",
    koLine: "A sample line.",
    record: "0-0-0",
    asides: [],
    posterCall: "Sample call",
    posterKo: "Sample line",
  };
}

function sampleFight(patch = {}) {
  return {
    id: "sample-bout",
    weekId: "2026-11-16",
    round: 1,
    role: "undercard",
    status: "pending",
    label: "SAMPLE",
    posterWord: "Sample",
    ticker: "TEST",
    cardText: "A sample bout.",
    firstBell: "Nov 16, 2026",
    finalBell: "Dec 31, 2026",
    finalBellDetail: "Dec 31, 2026 close.",
    lede: "A sample lede.",
    instrumentDetail: "A sample instrument.",
    dataSource: "A sample source.",
    koSummary: "A sample KO.",
    decisionSummary: "A sample decision.",
    drawDetail: "A sample draw.",
    exhibitionWhy: "A sample exhibition.",
    caveats: ["A sample caveat."],
    finishStates: ["KO", "Decision"],
    corners: [sampleCorner("bear", "SampleBear"), sampleCorner("bull", "SampleBull")],
    publicResult: { winner: "", finalPrice: "", why: "" },
    ...patch,
  };
}

test("scorecard finishes and edge states", () => {
  function page(status, phrase, cornerPatch) {
    const fight = sampleFight();
    fight.status = status;
    if (phrase) fight.result = { phrase };
    if (cornerPatch) cornerPatch(fight.corners[0]);
    return renderDocument(data.site, renderFight({ ...data, fights: [fight] }, fight));
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
  assert.doesNotMatch(home, /Respect to both corners/);
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
  assert.match(empty, /No bout scheduled yet\. New fights are coming\./);
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

test("archive lists filed weeks newest first and skips an empty week", () => {
  const older = sampleFight({
    id: "older-bout",
    weekId: "2026-11-09",
    posterWord: "Older sample",
  });
  const newer = sampleFight({
    id: "newer-bout",
    weekId: "2026-11-23",
    posterWord: "Newer sample",
    publicResult: { winner: "Nobody", finalPrice: "Not a price", why: "Test fixture only." },
  });
  const fake = {
    ...data,
    currentWeek: "2026-11-23",
    fights: [newer],
    weeks: [
      { week: "2026-11-23", fights: [newer] },
      { week: "2026-11-16", fights: [] },
      { week: "2026-11-09", fights: [older] },
    ],
  };
  const rendered = renderPages(fake, finePrint, corrections);
  const archive = rendered.get("archive/index.html");
  assert.match(archive, /Every week's fight card, newest first/);
  assert.doesNotMatch(archive, /2026-11-16|current pointer/);
  assert.ok(archive.indexOf("2026-11-23") < archive.indexOf("2026-11-09"));
  assert.equal(rendered.get("archive/2026-11-16/index.html"), undefined);
  assert.match(rendered.get("fights/2026-11-23/round-1.html"), /Newer sample/);
  assert.match(rendered.get("archive/2026-11-09/index.html"), /Older sample/);
  assert.match(rendered.get("archive/2026-11-09/index.html"), /Result: pending, final bell Dec 31, 2026/);
  assert.doesNotMatch(rendered.get("archive/2026-11-09/index.html"), />Pending</);
  const indexOnly = renderDocument(data.site, renderArchiveIndex(fake));
  assert.match(indexOnly, /Newer sample/);
});
