import { createLayout } from "./card-layout.mjs";
import { renderFightFillCss, renderFightSection } from "./fight-card.mjs";
import { fightPageRel, fightPath, ORIGINAL_WEEK } from "./load-card.mjs";

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests";

const SITE_BASE = "/battle-calls-2";
const SITE_ORIGIN = "https://kidruncomvc.github.io";

function withBase(href) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/") return `${SITE_BASE}/`;
  return `${SITE_BASE}${href}`;
}

function publicUrl(path) {
  return `${SITE_ORIGIN}${withBase(path)}`;
}

const NAV = [
  ["/", "The card"],
  ["/methodology.html", "Methodology"],
  ["/corrections.html", "Corrections"],
  ["/about.html", "About"],
  ["/archive/", "Archive"],
];

const EMPTY_CARD_LINE = "No bout scheduled yet. New fights are coming.";

function navCurrent(href, current) {
  if (href === current) return true;
  return href === "/archive/" && current.startsWith("/archive");
}

export function escapeText(value) {
  return String(value).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);
}

function escapeAttr(value) {
  return escapeText(value).replace(/["']/g, (ch) => (ch === '"' ? "&quot;" : "&#39;"));
}

function assertHref(href) {
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) return;
  throw new Error(`Refusing href: ${href}`);
}

function link(href, text, { external = false, className = "" } = {}) {
  assertHref(href);
  const resolved = href.startsWith("/") ? withBase(href) : href;
  const cls = className ? ` class="${escapeAttr(className)}"` : "";
  const ext = external ? ` target="_blank" rel="noopener noreferrer"` : "";
  return `<a href="${escapeAttr(resolved)}"${cls}${ext}>${escapeText(text)}</a>`;
}

function rich(node) {
  if (typeof node === "string") return escapeText(node);
  if (Array.isArray(node)) return node.map(rich).join("");
  if (node && node.parts) return rich(node.parts);
  if (node && node.href) return link(node.href, node.text, { external: !node.href.startsWith("/") });
  return escapeText(node?.text ?? "");
}

function cornerTag(corner) {
  return corner.handle ? `@${corner.handle}` : corner.name;
}

function pageCorners(fight) {
  const bear = fight.corners.find((corner) => corner.side === "bear");
  const bull = fight.corners.find((corner) => corner.side === "bull");
  const ordered = [bear, bull].filter(Boolean);
  return ordered.length ? ordered : fight.corners;
}

function matchup(fight) {
  return pageCorners(fight).map(cornerTag).join(" vs. ");
}

function officialOneLiner(fight) {
  if (!fight.officialWhy) return "";
  const sentences = fight.officialWhy.match(/[^.!?]+[.!?]+/g) || [fight.officialWhy];
  return sentences.slice(0, 2).join(" ").replace(/\s+/g, " ").trim();
}

function whyOfficial(fight) {
  const line = officialOneLiner(fight);
  return line ? `<p class="why-official">${escapeText(line)}</p>` : "";
}

function quotesOf(corner) {
  if (corner.postState === "deleted") return [];
  const quotes = corner.quotes?.length
    ? corner.quotes
    : [
        {
          label: "The call",
          texts: [corner.quote],
          postUrl: corner.postUrl,
          postId: corner.postId,
          calledAtEt: corner.calledAtEt,
          calledAtUtc: corner.calledAtUtc,
          calledAtNote: corner.calledAtNote,
          postState: "live",
          linkText: `Original post by @${corner.handle}`,
        },
      ];
  return quotes.filter((quote) => quote.postState !== "deleted" && quote.kind !== "archive");
}

function timeMarkup(quote) {
  if (!quote.calledAtEt) return "";
  const clock = quote.calledAtUtc
    ? `<time datetime="${escapeAttr(quote.calledAtUtc)}">${escapeText(quote.calledAtEt)}</time>`
    : escapeText(quote.calledAtEt);
  const note = quote.calledAtNote ? ` (${escapeText(quote.calledAtNote)})` : "";
  return `<p>Date called ${clock}${note}</p>`;
}

function renderQuote(quote) {
  const texts = quote.texts || (quote.text ? [quote.text] : []);
  const body = texts.length > 1 && !quote.contiguous
    ? `<p>${texts.map((text) => escapeText(text)).join(" […] ")}</p>`
    : texts.map((text) => `<p>${escapeText(text)}</p>`).join("");
  const cite = quote.postUrl ? ` cite="${escapeAttr(quote.postUrl)}"` : "";
  const id = quote.postId ? `<p>Post ID ${escapeText(quote.postId)}.</p>` : "";
  const source = quote.postUrl
    ? `<p>${link(quote.postUrl, quote.linkText || "Original post", { external: true })}</p>`
    : "";
  const deleted = quote.kind === "archive" || quote.postState === "deleted";
  if (deleted) {
    const label = quote.deletedLabel || "since deleted";
    const archive = quote.archiveUrl
      ? `<p>${link(quote.archiveUrl, "Archive of the original post", { external: true })}</p>`
      : "";
    return `<figure class="archive-capture">
      <figcaption>
        <span class="post-state">${escapeText(label)}</span>
        <span class="archive-kicker">Archived capture. Text only.</span>
      </figcaption>
      <blockquote>${body}</blockquote>
      ${id}
      ${quote.captured ? `<p>${escapeText(quote.captured)}</p>` : ""}
      ${timeMarkup(quote)}
      ${source}
      ${archive}
      ${quote.note ? `<p>${escapeText(quote.note)}</p>` : ""}
    </figure>`;
  }
  return `<div class="call">
    ${quote.label ? `<p class="call-label">${escapeText(quote.label)}</p>` : ""}
    <blockquote${cite}>${body}</blockquote>
    ${quote.quoteNote ? `<p>${escapeText(quote.quoteNote)}</p>` : ""}
    ${timeMarkup(quote)}
    ${id}
    ${source}
  </div>`;
}

function renderAccount(corner) {
  const badge = `<span class="badge" aria-hidden="true">${escapeText(corner.initials)}</span>`;
  const name = `<span class="who">${escapeText(corner.name)}</span>`;
  const handle =
    corner.handle && corner.profileUrl
      ? link(corner.profileUrl, `@${corner.handle}`, { external: true, className: "handle" })
      : "";
  const org = corner.org ? `<span>${escapeText(corner.org)}</span>` : "";
  const noX = corner.noX ? `<p>${escapeText(corner.noX)}</p>` : "";
  return `<div class="account">${badge}${name}${org}${handle}</div>${noX}`;
}

function row(label, html) {
  return `<div class="tape-row"><dt>${escapeText(label)}</dt><dd>${html}</dd></div>`;
}

function renderCorner(fight, corner) {
  const asides = (corner.asides || [])
    .map((aside) => {
      const text = escapeText(aside.text);
      const extra = aside.href
        ? ` ${link(aside.href, aside.linkText || "Source", { external: !aside.href.startsWith("/") })}`
        : "";
      return `<p>${text}${extra}</p>`;
    })
    .join("");
  const calls = quotesOf(corner).map(renderQuote).join("");
  return `<section class="corner" aria-labelledby="${fight.id}-${corner.initials}">
    <h3 id="${fight.id}-${corner.initials}">${escapeText(corner.cornerLabel)}</h3>
    <dl class="tape">
      ${row("Corner", escapeText(corner.cornerLabel))}
      ${row("Account", renderAccount(corner))}
      ${row("The call", calls + asides)}
      ${row(
        "Date called",
        `<time datetime="${escapeAttr(corner.calledAtUtc)}">${escapeText(corner.calledAtEt)}</time>${
          corner.calledAtNote ? ` (${escapeText(corner.calledAtNote)})` : ""
        }`,
      )}
      ${row("Price at first bell", `<span class="handle">${escapeText(corner.entryDisplay)}</span> ${escapeText(corner.entryNote)}`)}
      ${row("Target, in their words", escapeText(corner.targetInWords))}
      ${row("KO line", escapeText(corner.koLine))}
      ${row("Final bell", escapeText(fight.finalBellDetail))}
      ${row("Site-only record", `${escapeText(corner.record)}. Wins, losses, and draws on this site only.`)}
    </dl>
  </section>`;
}

function renderCorners(fight) {
  const blocks = fight.corners.map((corner) => renderCorner(fight, corner));
  if (blocks.length === 2) {
    return `<div class="corners">${blocks[0]}<p class="vs-col">vs.</p>${blocks[1]}</div>`;
  }
  return `<div class="corners">${blocks.join("")}</div>`;
}

function finishCopy(fight) {
  const phrase = fight.result?.phrase;
  switch (fight.status) {
    case "pending":
      return {
        stamp: "Pending",
        stampClass: "stamp-pending",
        text: "Final bell has not rung. The card is scored weekly until then. No check-in has been posted.",
        done: false,
      };
    case "in_progress":
      return {
        stamp: fight.score?.asOf || "In progress",
        stampClass: "stamp-progress",
        text: "",
        done: false,
      };
    case "ko":
      if (!phrase) throw new Error(`Round ${fight.round} KO is missing a result phrase`);
      return { stamp: "KO", stampClass: "stamp-ko", text: `WINNER BY KO: ${phrase}.`, done: true };
    case "tko":
      if (!phrase) throw new Error(`Round ${fight.round} TKO is missing a result phrase`);
      return {
        stamp: "TKO",
        stampClass: "stamp-tko",
        note: "stop hit",
        text: `WINNER BY TKO: ${phrase}.`,
        done: true,
      };
    case "decision":
      if (!phrase) throw new Error(`Round ${fight.round} decision is missing a result phrase`);
      return {
        stamp: "Decision",
        stampClass: "stamp-decision",
        text: `WINNER BY DECISION: ${phrase}.`,
        done: true,
      };
    case "draw":
      return {
        stamp: "Draw",
        stampClass: "stamp-draw",
        text: "DRAW. The move finished inside the draw band. Neither call takes the round.",
        done: true,
      };
    case "no_contest":
      return {
        stamp: "No contest",
        stampClass: "stamp-no-contest",
        text: "NO CONTEST... still undefeated, the market.",
        done: true,
      };
    default:
      throw new Error(`Unknown bout status: ${fight.status}`);
  }
}

const layout = createLayout({
  escapeText,
  escapeAttr,
  link,
  quotesOf,
  renderQuote,
  renderAccount,
  finishCopy,
});

function renderScorecard(fight, site) {
  const finish = finishCopy(fight);
  const lines = (fight.score?.lines || []).map((line) => `<p>${escapeText(line)}</p>`).join("");
  const source = fight.score?.source ? `<p>Source: ${escapeText(fight.score.source)}</p>` : "";
  const checks = fight.checkins?.length
    ? fight.checkins
        .map(
          (row) =>
            `<tr><td>${escapeText(row.date)}</td><td>${escapeText(row.print)}</td><td>${escapeText(row.note)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3">No check-ins yet.</td></tr>`;
  const legend = (fight.finishStates || [])
    .map((state) => `<li>${escapeText(state)}</li>`)
    .join("");
  const after = finish.done ? `<p class="post-fight">${escapeText(site.postFight)}</p>` : "";
  return `<section class="panel scorecard" aria-labelledby="${fight.id}-score">
    <div class="scorecard-head">
      <h2 id="${fight.id}-score" class="display-heading">Scorecard</h2>
      <p class="stamp ${finish.stampClass}">${escapeText(finish.stamp)}</p>
    </div>
    ${finish.note ? `<p>${escapeText(finish.note)}</p>` : ""}
    ${finish.text ? `<p>${escapeText(finish.text)}</p>` : ""}
    ${lines}
    ${source}
    <table class="checkins">
      <caption>Check-ins</caption>
      <thead><tr><th scope="col">Check-in</th><th scope="col">Print</th><th scope="col">Note</th></tr></thead>
      <tbody>${checks}</tbody>
    </table>
    <h3 class="display-heading">Finish states</h3>
    <ul class="finish-list">${legend}</ul>
    ${after}
  </section>`;
}

function renderRules(fight, site) {
  const why = fight.officialWhy || fight.exhibitionWhy;
  const whyLabel = fight.officialWhy ? "Why it is official" : "Why it is an exhibition";
  const rows = [
    ["Instrument", fight.instrumentDetail],
    ["Data source", fight.dataSource],
  ];
  if (fight.entriesSentence) rows.push(["Entries", fight.entriesSentence]);
  rows.push(["KO", fight.koSummary]);
  if (fight.tkoSummary) rows.push(["TKO", fight.tkoSummary]);
  rows.push(["Decision", fight.decisionSummary], ["Draw band", fight.drawDetail || fight.drawBand], [whyLabel, why]);
  const order = fight.checkOrder
    ? `<h3 class="display-heading">Checked in this order</h3><ol class="caveats">${fight.checkOrder
        .map((item) => `<li>${escapeText(item)}</li>`)
        .join("")}</ol>`
    : "";
  return `<section class="spread" aria-labelledby="${fight.id}-rules">
    <h2 id="${fight.id}-rules" class="display-heading">Rules of the Ring</h2>
    <p class="rules-blurb">${escapeText(site.rulesBlurb)}</p>
    <dl class="rules">${rows
      .map(([label, text]) => `<div><dt>${escapeText(label)}</dt><dd>${escapeText(text)}</dd></div>`)
      .join("")}</dl>
    ${order}
    <p>${link("/fine-print.html", "Fine print")}</p>
    <p>${link("/methodology.html", "Methodology")}</p>
  </section>`;
}

function renderCaveats(fight) {
  if (!fight.caveats?.length) return "";
  return `<section class="spread" aria-labelledby="${fight.id}-caveats">
    <h2 id="${fight.id}-caveats" class="display-heading">Caveats</h2>
    ${whyOfficial(fight)}
    <ol class="caveats">${fight.caveats.map((item) => `<li>${rich(item)}</li>`).join("")}</ol>
  </section>`;
}

function renderDisclosures(fight, site) {
  return `<section class="spread" aria-labelledby="${fight.id}-disclosures">
    <h2 id="${fight.id}-disclosures" class="display-heading">Disclosures</h2>
    <ul class="disclosures">
      <li>${escapeText(fight.dataSource)}</li>
      <li>${escapeText(site.advice)}</li>
      <li>${escapeText(site.affiliation)}</li>
      <li>${escapeText(site.unauthorized)}</li>
      <li>${escapeText(site.skill)}</li>
      <li>${escapeText(site.fairUse)}</li>
      <li>${escapeText(site.shareLine)}</li>
      <li>${escapeText(site.position)}</li>
      <li>Judging rules: ${link("/methodology.html", "Methodology")}. Corrections: ${link("/corrections.html", "corrections log")}.</li>
    </ul>
  </section>`;
}

function teaser(site) {
  return `<p class="teaser">${link("/fine-print.html", site.teaser)}</p>`;
}

function copyBlock(inner) {
  return `<div class="wrap sheet-copy">${inner}</div>`;
}

function boutHead(fight, { level = "h1" } = {}) {
  const Tag = level;
  return `<p class="kicker"><span>Round ${fight.round}</span> <span class="stamp">${escapeText(fight.label)}</span></p>
    <${Tag}>
      <span class="poster-word">${escapeText(fight.posterWord)}</span>
      <span class="matchup">${escapeText(matchup(fight))}</span>
    </${Tag}>
    <p class="bells">First bell ${escapeText(fight.firstBell)}. Final bell ${escapeText(fight.finalBell)}.</p>`;
}

function ropes() {
  return `<div class="ropes" aria-hidden="true"></div>`;
}

export function renderMeterCss(data) {
  const fights = data.weeks ? data.weeks.flatMap((week) => week.fights) : data.fights;
  const fills = renderFightFillCss(data.fightCards || []);
  const meters = layout.renderMeterCss(fights);
  return fills ? `${meters}\n${fills}\n` : meters;
}

function filled(value) {
  return value != null && String(value).trim() !== "";
}

function resultRows(fight) {
  const result = fight.publicResult || {};
  return [
    ["Winner", result.winner],
    ["Final price", result.finalPrice],
    ["Why", result.why],
  ].filter(([, value]) => filled(value));
}

function pendingLine(fight) {
  const bell = filled(fight.finalBell) ? `, final bell ${fight.finalBell}` : "";
  return `Result: pending${bell}`;
}

function publicResult(fight) {
  const rows = resultRows(fight);
  const body = rows.length
    ? `<dl class="rules">${rows
        .map(([label, text]) => `<div><dt>${escapeText(label)}</dt><dd>${escapeText(text)}</dd></div>`)
        .join("")}</dl>`
    : `<p>${escapeText(pendingLine(fight))}</p>`;
  return `<section class="public-result" aria-labelledby="${fight.id}-public-result">
    <h2 id="${fight.id}-public-result" class="display-heading">Result</h2>
    ${body}
  </section>`;
}

export function renderFight(data, fight) {
  const site = data.site;
  const why = whyOfficial(fight);
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      ${layout.renderPoster(fight, { level: "h1", lede: fight.lede, extra: why, teaserHtml: teaser(site) })}
      ${ropes()}
      ${copyBlock(`<section class="spread" aria-labelledby="${fight.id}-tape">
        <h2 id="${fight.id}-tape" class="display-heading">Tale of the Tape</h2>
        ${layout.renderTape(fight)}
      </section>`)}
      ${ropes()}
      ${copyBlock(layout.renderScoreBlock(fight, site))}
      ${ropes()}
      ${copyBlock(renderRules(fight, site))}
      ${ropes()}
      ${copyBlock(renderCaveats(fight))}
      ${ropes()}
      ${copyBlock(renderDisclosures(fight, site))}
      ${ropes()}
      ${copyBlock(publicResult(fight))}
    </article>
  </main>`;
  const week = fight.weekId || ORIGINAL_WEEK;
  return document({
    title: `Round ${fight.round}: ${matchup(fight)} on ${fight.ticker} — Battle Calls`,
    description: fight.cardText,
    path: fightPath(fight),
    image: week === ORIGINAL_WEEK ? `/assets/og/${fight.id}.png` : "/assets/og/site.png",
    imageAlt: fight.ogAlt || `${data.site.fullName}. ${data.site.tagline}`,
    main,
  });
}

function orderedFights(data) {
  return [...data.fights].sort((a, b) => a.round - b.round);
}

function roundNav(data) {
  return orderedFights(data).map((fight) => [fightPath(fight), `Round ${fight.round}`]);
}

function roundList(data) {
  const fights = orderedFights(data);
  if (!fights.length) return "";
  const items = fights
    .map((fight) => `<li>${link(fightPath(fight), `Round ${fight.round}: ${fight.posterWord}`)}</li>`)
    .join("");
  const start = fights[0].round > 1 ? ` start="${fights[0].round}"` : "";
  return `<section aria-labelledby="card-order"><h2 id="card-order" class="display-heading">On this card</h2><ol class="round-list"${start}>${items}</ol></section>`;
}

function cardIntro(site) {
  return `<header class="card-intro"><h1 id="the-card">The card</h1><p class="tagline">${escapeText(site.tagline)}</p><p class="referee">${escapeText(site.referee)}</p></header>`;
}

function fightCardDescription(site, cards) {
  const bouts = cards
    .map((card) => {
      const handle = card.handle || "Caller";
      const asset = card.tape && card.tape.asset ? card.tape.asset : "the tape";
      return `${handle} versus THE MARKET on ${asset}`;
    })
    .join(". ");
  return `${bouts}. ${site.tagline}`;
}

export function renderHome(data) {
  const site = data.site;
  const cards = Array.isArray(data.fightCards) ? data.fightCards : [];
  const section = renderFightSection(cards);
  const list = section
    ? `<div class="wrap">${cardIntro(site)}${section}</div>`
    : `<div class="wrap"><section class="slot" aria-labelledby="empty-card"><h1 id="empty-card">The card</h1><p>${escapeText(EMPTY_CARD_LINE)}</p></section></div>`;
  const description = section ? fightCardDescription(site, cards) : site.tagline;
  return document({
    title: site.fullName,
    description,
    path: "/",
    image: "/assets/og/site.png",
    imageAlt: `${site.fullName}. ${site.tagline}`,
    main: `<main id="content" tabindex="-1">
      ${list}
      <section class="band wrap" aria-labelledby="rules-home">
        <h2 id="rules-home" class="display-heading">The rules, in one line</h2>
        <p class="rules-blurb">${escapeText(site.rulesBlurb)}</p>
        <p>${link("/methodology.html", "Methodology")}</p>
      </section>
    </main>`,
    fights: data.fights,
  });
}

export function renderMethodology(data) {
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      <div class="wrap sheet-copy">
      <header>
        <h1>Methodology</h1>
        <p>A bout is one public caller against THE MARKET. The entry, the target, and the deadline come from the caller's own post. Those three lines are the fight.</p>
      </header>
      <section aria-labelledby="call-size">
        <h2 id="call-size" class="display-heading">The call size</h2>
        <p>The call size is the percent move from the entry to the target. If a caller gives a range, only the lower number counts. A call from $100 to $120–$140 is a 20% call.</p>
      </section>
      <section aria-labelledby="win-ko">
        <h2 id="win-ko" class="display-heading">A win, and a KO</h2>
        <p>Hitting the call on the penny is a win. One penny past it is a knockout. A long from $100 to $120 wins at $120.00 and is a KO at $120.01.</p>
        <p>THE MARKET is the mirror. On that same call, $80.00 is a win for THE MARKET, and $79.99 is a KO. The level is the call distance taken the other way from the entry. The KO is one penny past that level.</p>
        <p>The against-distance is the smaller of the call distance and 50% of the entry, rounded down to the cent. The KO is one more penny past that. A call for a 100% move is not answered 100% the other way.</p>
        <p>There is no stop on the card. THE MARKET's KO is what ends a bout the hard way. A stop a caller named is not used for now. A side condition in the post, such as "after hitting my $130 target," is ignored. Only the main target is scored.</p>
      </section>
      <section aria-labelledby="touch">
        <h2 id="touch" class="display-heading">A touch</h2>
        <p>A level is hit when price trades there, or when the market gaps open at or past it. Pre-market, after-hours, and a gap open count, along with the regular session. It does not have to be the close.</p>
        <p>Only trades after the post minute count. The candle that sets the entry is not a touch. If the target is already reached at post time, the call is VOID.</p>
        <p>The first touch of either side's level ends the bout. A later move cannot change the result. If both sides are touched in the same minute, the tie is broken with finer tick or second data. If that finer data still cannot tell which side was first, the bout is a DRAW.</p>
      </section>
      <section aria-labelledby="endings">
        <h2 id="endings" class="display-heading">How it ends</h2>
        <ul class="endings">
          <li><strong>Win.</strong> Price hits the target on the penny, and does not go one penny past it.</li>
          <li><strong>Win by KO.</strong> Price trades one penny past the target.</li>
          <li><strong>Win by decision.</strong> No level is touched, and the deadline-day regular-session close is at or past the entry in the caller's direction. A close exactly at the entry goes to the caller.</li>
          <li><strong>Loss.</strong> Price hits THE MARKET's level on the penny, and does not go one penny past it.</li>
          <li><strong>Loss by KO.</strong> Price trades one penny past THE MARKET's level.</li>
          <li><strong>Loss by decision.</strong> No level is touched, and the deadline close is on THE MARKET's side of the entry.</li>
          <li><strong>Void.</strong> The target is already reached at post time. The bout is not scored.</li>
          <li><strong>Draw.</strong> Both sides are touched in the same minute, and finer data cannot tell which side was first.</li>
        </ul>
        <p class="rule-call">The Price Decided and THE MARKET won.</p>
      </section>
      <section aria-labelledby="clock">
        <h2 id="clock" class="display-heading">The clock</h2>
        <p>Entry is the close of the 1-minute candle that contains the post. If that minute has no trade, including extended hours, entry is the close of the last 1-minute candle traded before it. The post time comes from the post ID: shift the ID right by 22 bits and add 1288834974657. That sum is the UTC time in milliseconds. Convert it to Eastern Time and use that minute.</p>
        <p>The price source is Schwab, then Yahoo, then another named source. The card names the source that was used. Prices are never adjusted for dividends or splits. The percent on the card is rounded half-up to one decimal.</p>
        <p>If no level is touched, the deadline-day regular-session close decides the bout.</p>
        <p>This is commentary and entertainment, not investment advice.</p>
      </section>
      <section aria-labelledby="post-proof">
        <h2 id="post-proof" class="display-heading">Post proof</h2>
        <p>Each bout keeps the post ID, the UTC time from that ID, and the same time in Eastern Time. An archived copy is saved through archive.today or the Wayback Machine. A timestamped screenshot of the post is kept, and its SHA-256 hash is stored in the repo.</p>
        <p>An edited post is scored from the original version, and the card notes the edit. A deleted post is scored from the archive and labeled "deleted by caller".</p>
      </section>
      <section aria-labelledby="selection">
        <h2 id="selection" class="display-heading">How calls are picked</h2>
        <p>Every qualifying call from a tracked caller in a set window goes on the card. A call is never cherry-picked by outcome. The wording stays neutral. The card scores only what the post said.</p>
      </section>
      <section aria-labelledby="corrections-method">
        <h2 id="corrections-method" class="display-heading">Corrections</h2>
        <p>A caller can ask for a correction for seven days after the result is posted. The request names the bout, the line, and the post. No personal address is published. Accepted corrections are written on the public ${link("/corrections.html", "corrections log")}, newest first. An edit or deletion at the source does not rewrite the locked call.</p>
      </section>
      <section aria-labelledby="method-disclosures">
        <h2 id="method-disclosures" class="display-heading">Disclosures</h2>
        <ul class="disclosures">
          <li>${escapeText(data.site.advice)}</li>
          <li>${escapeText(data.site.affiliation)}</li>
          <li>${escapeText(data.site.unauthorized)}</li>
          <li>${escapeText(data.site.skill)}</li>
          <li>${escapeText(data.site.fairUse)}</li>
          <li>${escapeText(data.site.shareLine)}</li>
          <li>${escapeText(data.site.position)}</li>
          <li>The ${link("/fine-print.html", "fine print")} is a separate promotional notice. It does not replace these rules.</li>
        </ul>
      </section>
      </div>
    </article>
  </main>`;
  return document({
    title: "Methodology — Battle Calls",
    description: "How a Battle Calls bout is scored. One public caller against THE MARKET, with the caller's own entry, target, and deadline.",
    path: "/methodology.html",
    image: "/assets/og/site.png",
    imageAlt: `${data.site.fullName}. ${data.site.tagline}`,
    main,
    fights: data.fights,
  });
}

export function renderCorrections(data, corrections) {
  const entries = [...(corrections.entries || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const list = entries.length
    ? `<ol class="stack">${entries
        .map(
          (entry) =>
            `<li><p><time datetime="${escapeAttr(entry.date)}">${escapeText(entry.date)}</time> ${escapeText(entry.bout)}</p><p>${escapeText(entry.change)}</p><p>${escapeText(entry.reason)}</p></li>`,
        )
        .join("")}</ol>`
    : `<p class="empty">No corrections yet.</p>`;
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      <div class="wrap sheet-copy">
      <h1>Corrections</h1>
      <p>When this site gets a quote, a time, a level, or a print wrong, the change is written here, newest first. An edited or deleted source does not rewrite the locked call.</p>
      ${list}
      <p>A caller can ask for a correction for seven days after the result is posted. No personal address is published. Name the bout, the line, and the post. Accepted corrections are added to this page.</p>
      <p>${link("/methodology.html", "Methodology")}</p>
      </div>
    </article>
  </main>`;
  return document({
    title: "Corrections — Battle Calls",
    description: "Corrections to Battle Calls, newest first.",
    path: "/corrections.html",
    image: "/assets/og/site.png",
    imageAlt: `${data.site.fullName}. ${data.site.tagline}`,
    main,
  });
}

export function renderAbout(data) {
  const site = data.site;
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      <div class="wrap sheet-copy">
      <h1>About</h1>
      <p>${escapeText(site.fullName)} puts opposing public market calls on a card and scores them against the chart. The call wins or loses. The person is not the subject.</p>
      ${roundList(data)}
      <h2 class="display-heading">What unauthorized means</h2>
      <p>${escapeText(site.unauthorized)}</p>
      <h2 class="display-heading">What this is</h2>
      <ul class="disclosures">
        <li>${escapeText(site.advice)}</li>
        <li>${escapeText(site.affiliation)}</li>
        <li>${escapeText(site.skill)}</li>
        <li>${escapeText(site.fairUse)}</li>
        <li>${escapeText(site.shareLine)}</li>
        <li>${escapeText(site.position)}</li>
        <li>The price source and the timestamp are named on each bout. A locked print is not a live quote.</li>
        <li>A single bout can finish by KO, by TKO when the bout defines a stop-hit, by decision, by draw, or as a no contest. The rules on that card are the rules that were locked.</li>
      </ul>
      <h2 class="display-heading">What the fine print is</h2>
      <p>The ${link("/fine-print.html", "fine print")} is an additional promotional notice. It does not replace the lines on this page, the line under the site name, or the one-line footer.</p>
      <h2 class="display-heading">Corrections</h2>
      <p>The ${link("/corrections.html", "corrections log")} is newest first. No personal address is published. Name the bout, the line, and the source.</p>
      <p>Judging rules are on the ${link("/methodology.html", "methodology")} page.</p>
      <h2 class="display-heading">Type</h2>
      <p>Oswald and Source Sans 3 are self-hosted under the SIL Open Font License. ${link("/assets/fonts/OFL-Oswald.txt", "Oswald license")}. ${link("/assets/fonts/OFL-SourceSans3.txt", "Source Sans 3 license")}.</p>
      </div>
    </article>
  </main>`;
  return document({
    title: "About — Battle Calls",
    description: "What Battle Calls is, what unauthorized means, and the disclosures that sit on every bout.",
    path: "/about.html",
    image: "/assets/og/site.png",
    imageAlt: `${site.fullName}. ${site.tagline}`,
    main,
    fights: data.fights,
  });
}

export function renderFinePrint(data, notice) {
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      <div class="wrap sheet-copy">
      <h1>Fine print</h1>
      <div class="notice-frame"><pre class="notice">${escapeText(notice)}</pre></div>
      <p>This notice is in addition to the formal disclaimers. It does not replace them. See ${link("/about.html", "About")}.</p>
      </div>
    </article>
  </main>`;
  return document({
    title: "Fine print — Battle Calls",
    description: "Promotional notice for Battle Calls. Entertainment and education only, not advice.",
    path: "/fine-print.html",
    image: "/assets/og/site.png",
    imageAlt: `${data.site.fullName}. ${data.site.tagline}`,
    main,
  });
}

export function renderNotFound(data) {
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      <div class="wrap sheet-copy">
      <h1>Not on the card</h1>
      <p>That page is not a bout, a rule, or a correction.</p>
      ${roundList(data)}
      <p>${link("/", "Back to the card")}</p>
      </div>
    </article>
  </main>`;
  return document({
    title: "Not on the card — Battle Calls",
    description: "That page is not on the Battle Calls card.",
    path: "/404.html",
    image: "/assets/og/site.png",
    imageAlt: `${data.site.fullName}. ${data.site.tagline}`,
    main,
    fights: data.fights,
  });
}

function header(current, extra = []) {
  const items = [...NAV, ...extra].map(([href, label]) => {
    const currentAttr = navCurrent(href, current) ? ` aria-current="page"` : "";
    return `<li><a href="${withBase(href)}"${currentAttr}>${label}</a></li>`;
  }).join("");
  return `<header class="site-header">
    <div class="wrap">
      <div class="header-brand">
        <div class="header-copy">
          <a class="site-name" href="${withBase("/")}">
            <span class="site-name-main">Battle Calls</span>
            <span class="site-name-sub">the unauthorized fight card</span>
          </a>
          <p class="affiliation"><span class="affiliation-full">AFFILIATION_FULL</span><span class="affiliation-short">AFFILIATION_SHORT</span></p>
        </div>
        <div class="header-banner-slot">
          <img class="header-banner" src="${withBase("/assets/img/header-banner.webp")}" width="1200" height="500" alt="Bull and bear boxers squared off in a spotlit ring" loading="eager">
        </div>
      </div>
      <nav class="site-nav" aria-label="Primary"><ul>${items}</ul></nav>
    </div>
    <div class="ropes" aria-hidden="true"></div>
  </header>`;
}

function footer(site, current, extra = []) {
  const links = [
    ...NAV,
    ...extra,
    ["/fine-print.html", "Fine print"],
  ]
    .map(([href, label]) => {
      const currentAttr = navCurrent(href, current) ? ` aria-current="page"` : "";
      return `<li><a href="${withBase(href)}"${currentAttr}>${label}</a></li>`;
    })
    .join("");
  return `<footer class="site-footer">
    <div class="ropes" aria-hidden="true"></div>
    <div class="wrap">
      <p class="footer-plain">${escapeText(site.footerLine)}</p>
      <nav aria-label="Footer"><ul class="footer-links">${links}</ul></nav>
    </div>
  </footer>`;
}

function document({ title, description, path, image, imageAlt, main, fights = [] }) {
  return { title, description, path, image, imageAlt, main, fights };
}

function shell(site, page) {
  const rounds = roundNav({ fights: page.fights || [] });
  const head = header(page.path, rounds)
    .replace("AFFILIATION_FULL", escapeText(site.affiliation))
    .replace("AFFILIATION_SHORT", escapeText(site.affiliationShort || site.affiliation));
  const bodyClass = page.path === "/" ? "page-home" : "page-inner";
  const pageUrl = publicUrl(page.path);
  const imageUrl = publicUrl(page.image);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#100e0c">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<title>${escapeText(page.title)}</title>
<meta name="description" content="${escapeAttr(page.description)}">
<link rel="canonical" href="${escapeAttr(pageUrl)}">
<meta property="og:title" content="${escapeAttr(page.title)}">
<meta property="og:description" content="${escapeAttr(page.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeAttr(pageUrl)}">
<meta property="og:image" content="${escapeAttr(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta property="og:image:alt" content="${escapeAttr(page.imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(page.title)}">
<meta name="twitter:description" content="${escapeAttr(page.description)}">
<meta name="twitter:image" content="${escapeAttr(imageUrl)}">
<meta name="twitter:image:alt" content="${escapeAttr(page.imageAlt)}">
<link rel="icon" href="${withBase("/assets/favicon.svg")}" type="image/svg+xml">
<link rel="icon" href="${withBase("/assets/favicon-32.png")}" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="${withBase("/assets/apple-touch.png")}">
<link rel="preload" href="${withBase("/assets/fonts/oswald-latin-700.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${withBase("/assets/fonts/source-sans-3-latin-400.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${withBase("/css/tokens.css")}">
<link rel="stylesheet" href="${withBase("/css/site.css")}">
<link rel="stylesheet" href="${withBase("/css/fight-card.css")}">
<link rel="stylesheet" href="${withBase("/css/meters.css")}">
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#content">Skip to content</a>
${head}
${page.main}
${footer(site, page.path, rounds)}
</body>
</html>
`;
}

export function renderDocument(site, page) {
  return shell(site, page);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function humanDate(iso) {
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) return String(iso);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function weekLabel(week) {
  return `Week of ${humanDate(week.week)}`;
}

function cornerWho(corner) {
  return corner.handle ? `@${corner.handle}` : corner.name || "";
}

function orderedCorners(fight) {
  const bear = (fight.corners || []).find((corner) => corner.side === "bear");
  const bull = (fight.corners || []).find((corner) => corner.side === "bull");
  const ordered = [bear, bull].filter(Boolean);
  return ordered.length ? ordered : fight.corners || [];
}

function matchupLine(fight) {
  const names = orderedCorners(fight).map(cornerWho).filter(Boolean);
  const word = fight.posterWord ? `${fight.posterWord}: ` : "";
  return `${word}${names.join(" vs ")}`;
}

function cardTag(fight) {
  const title = fight.role === "main" || /title/i.test(fight.label || "");
  return title
    ? { text: "Title fight", className: "stamp stamp-title" }
    : { text: "Exhibition", className: "stamp" };
}

function weekStatus(week, currentWeek) {
  if (week.week === currentWeek) return "This week's card";
  if (!week.fights.length) return "No bouts yet";
  if (week.fights.some((fight) => resultRows(fight).length)) return "Results posted";
  return "No results yet";
}

function callerBlock(fight) {
  const corners = orderedCorners(fight);
  const lines = corners
    .map((corner) => {
      const quote = corner.posterCall || corner.koLine || "";
      return `<p class="archive-caller"><span class="who">${escapeText(cornerWho(corner))}</span> ${escapeText(quote)}</p>`;
    })
    .join(`<p class="archive-vs">vs</p>`);
  const names = corners.map(cornerWho).filter(Boolean).join(" vs ");
  return `<p class="archive-matchup">${escapeText(names)}</p><div class="archive-callers">${lines}</div>`;
}

function archiveResult(fight) {
  const rows = resultRows(fight);
  if (!rows.length) {
    return `<div class="archive-result"><p class="archive-result-line">${escapeText(pendingLine(fight))}</p></div>`;
  }
  return `<div class="archive-result">
    <h3 class="archive-result-label">Result</h3>
    <dl class="rules">${rows
      .map(([label, text]) => `<div><dt>${escapeText(label)}</dt><dd>${escapeText(text)}</dd></div>`)
      .join("")}</dl>
  </div>`;
}

function filedWeeks(data) {
  return [...(data.weeks || [])]
    .filter((week) => (week.fights || []).length)
    .sort((a, b) => b.week.localeCompare(a.week));
}

export function renderArchiveIndex(data) {
  const weeks = filedWeeks(data);
  const items = weeks.length
    ? `<div class="archive-index">${weeks
        .map((week) => {
          const bouts = `<ul class="week-card-bouts">${week.fights
            .map((fight) => `<li>${escapeText(matchupLine(fight))}</li>`)
            .join("")}</ul>`;
          return `<a class="week-card" href="${withBase(`/archive/${week.week}/`)}">
            <h2 class="week-card-title">${escapeText(weekLabel(week))}</h2>
            ${bouts}
            <p class="week-card-status">${escapeText(weekStatus(week, data.currentWeek))}</p>
          </a>`;
        })
        .join("")}</div>`
    : `<p class="empty">${escapeText(EMPTY_CARD_LINE)}</p>`;
  const intro = weeks.length
    ? `<p>Every week's fight card, newest first. Tap a week to see how the calls landed.</p>`
    : "";
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      <div class="wrap sheet-copy">
      <h1>Archive</h1>
      ${intro}
      ${items}
      <p>${link("/", "Back to the card")}</p>
      </div>
    </article>
  </main>`;
  return document({
    title: "Archive — Battle Calls",
    description: "Every week's fight card, newest first.",
    path: "/archive/",
    image: "/assets/og/site.png",
    imageAlt: `${data.site.fullName}. ${data.site.tagline}`,
    main,
    fights: data.fights,
  });
}

export function renderArchiveWeek(data, week) {
  const current = week.week === data.currentWeek;
  const badge = current ? `<p class="stamp stamp-title">This week's card</p>` : `<p>An earlier card.</p>`;
  const cards = week.fights.length
    ? week.fights
        .map((fight) => {
          const tag = cardTag(fight);
          return `<article class="archive-card" aria-labelledby="${fight.id}-archive">
            <p class="kicker"><span>Round ${fight.round}</span> <span class="${tag.className}">${escapeText(tag.text)}</span></p>
            <h2 id="${fight.id}-archive" class="archive-round-title">${escapeText(fight.posterWord || boutWord(fight))}</h2>
            ${callerBlock(fight)}
            ${archiveResult(fight)}
            <p class="archive-open">${link(fightPath(fight), "Open the fight card")}</p>
          </article>`;
        })
        .join("")
    : `<p class="empty">No bouts filed for this week yet.</p>`;
  const main = `<main id="content" tabindex="-1">
    <article class="sheet">
      <div class="wrap sheet-copy">
      <h1 class="archive-week-title">${escapeText(weekLabel(week))}</h1>
      ${badge}
      ${cards}
      <p>${link("/archive/", "All weeks")}</p>
      </div>
    </article>
  </main>`;
  return document({
    title: `${weekLabel(week)} — Battle Calls`,
    description: `${weekLabel(week)} on Battle Calls.`,
    path: `/archive/${week.week}/`,
    image: "/assets/og/site.png",
    imageAlt: `${data.site.fullName}. ${data.site.tagline}`,
    main,
    fights: data.fights,
  });
}

function boutWord(fight) {
  return fight.ticker || "Bout";
}

export function renderPages(data, finePrint, corrections = { entries: [] }) {
  const site = data.site;
  const pages = new Map();
  const navFights = data.fights || [];
  pages.set("index.html", shell(site, renderHome(data)));
  pages.set("methodology.html", shell(site, renderMethodology(data)));
  pages.set("corrections.html", shell(site, { ...renderCorrections(data, corrections), fights: navFights }));
  pages.set("about.html", shell(site, renderAbout(data)));
  pages.set("fine-print.html", shell(site, { ...renderFinePrint(data, finePrint), fights: navFights }));
  pages.set("404.html", shell(site, renderNotFound(data)));
  pages.set("archive/index.html", shell(site, renderArchiveIndex(data)));
  for (const week of filedWeeks(data)) {
    pages.set(`archive/${week.week}/index.html`, shell(site, renderArchiveWeek(data, week)));
    for (const fight of week.fights) {
      pages.set(fightPageRel(fight), shell(site, { ...renderFight(data, fight), fights: navFights }));
    }
  }
  if (!data.weeks) {
    for (const fight of orderedFights(data)) {
      pages.set(fightPageRel(fight), shell(site, { ...renderFight(data, fight), fights: navFights }));
    }
  }
  return pages;
}
