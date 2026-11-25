import assert from "node:assert/strict";
import test from "node:test";
import { levelsFor, meterState, renderFightFillCss, renderFightSection } from "./fight-card.mjs";
import { loadCard } from "./load-card.mjs";
import { renderMeterCss } from "./render.mjs";

const root = new URL("..", import.meta.url).pathname;
const data = loadCard(root);
const card = data.fightCards[0];

test("the NVDA card prices the penny KOs from entry and target", () => {
  const levels = levelsFor(card);
  assert.equal(levels.callerText, "$166.00 target, $166.01 KO (+27.7%)");
  assert.equal(levels.marketText, "$94.02 level, $94.01 KO (-27.7%)");
  assert.equal(card.tape.entry, "$130.01");
  assert.equal(card.tape.entryNote, "1-min close, 7:59 PM ET, Yahoo");
  assert.equal(card.tape.asset, "NVDA");
  assert.equal(card.status, "WIN BY KO");
  const meter = meterState(card, levels);
  assert.equal(meter.callerBroke, true);
  assert.equal(meter.marketBroke, false);
  assert.equal(meter.callerFill, 1);
  assert.equal(meter.marketFill, 0);
  assert.equal(meter.highLabel, "HIGH $166.30");
  assert.equal(meter.lowLabel, "");
  assert.match(meter.caption, /traded to \$166\.30/);
  assert.match(meter.caption, /Yahoo 1-minute bars/);
});

test("a long from 100 to 120 mirrors THE MARKET at 80.00 and 79.99", () => {
  const levels = levelsFor({
    tape: { direction: "Bullish" },
    progress: { entry: 100, target: 120 },
  });
  assert.equal(levels.callerText, "$120.00 target, $120.01 KO (+20%)");
  assert.equal(levels.marketText, "$80.00 level, $79.99 KO (-20%)");
});

test("the against-distance caps at half the entry", () => {
  const levels = levelsFor({
    tape: { direction: "Bullish" },
    progress: { entry: 100, target: 250 },
  });
  assert.equal(levels.callerText, "$250.00 target, $250.01 KO (+150%)");
  assert.equal(levels.marketText, "$50.00 level, $49.99 KO (-50%)");
});

test("a bearish call prices the KOs the other way", () => {
  const levels = levelsFor({
    tape: { direction: "Bearish" },
    progress: { entry: 100, target: 80 },
  });
  assert.equal(levels.callerText, "$80.00 target, $79.99 KO (-20%)");
  assert.equal(levels.marketText, "$120.00 level, $120.01 KO (+20%)");
});

test("the rendered card keeps THE MARKET in caps and links out safely", () => {
  const html = renderFightSection(data.fightCards);
  assert.match(html, /aria-label="@MentoviaX versus THE MARKET"/);
  assert.match(html, /<p class="fight-market-name">THE MARKET<\/p>/);
  assert.doesNotMatch(html, /The Market/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /\sstyle=/);
  assert.match(html, /<svg viewBox="0 0 20 20"/);
  const css = renderFightFillCss(data.fightCards);
  assert.match(css, /\.tug-pct-1000 \{ width: 100%; \}/);
  assert.match(css, /\.tug-pct-0 \{ width: 0%; \}/);
  assert.match(renderMeterCss(data), /\.tug-pct-1000 \{ width: 100%; \}/);
});
