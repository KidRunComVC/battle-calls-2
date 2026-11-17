import { createLayout } from "./card-layout.mjs";

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
];

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

function cardDescription(data) {
  const bouts = orderedFights(data)
    .map((fight) => `Round ${fight.round} ${fight.label}: ${matchup(fight)} on ${fight.ticker}`)
    .join(". ");
  return `${bouts}. ${data.site.tagline}`;
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
  return layout.renderMeterCss(data.fights);
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
    </article>
  </main>`;
  return document({
    title: `Round ${fight.round}: ${matchup(fight)} on ${fight.ticker} — Battle Calls`,
    description: fight.cardText,
    path: `/fights/${fight.id}.html`,
    image: `/assets/og/${fight.id}.png`,
    imageAlt: fight.ogAlt,
    main,
  });
}

function orderedFights(data) {
  return [...data.fights].sort((a, b) => a.round - b.round);
}

function roundNav(data) {
  return orderedFights(data).map((fight) => [`/fights/${fight.id}.html`, `Round ${fight.round}`]);
}

function roundList(data) {
  const items = orderedFights(data)
    .map((fight) => `<li>${link(`/fights/${fight.id}.html`, `Round ${fight.round}: ${fight.posterWord}`)}</li>`)
    .join("");
  return `<section aria-labelledby="card-order"><h2 id="card-order" class="display-heading">On this card</h2><ol class="round-list">${items}</ol></section>`;
}

function renderListedFight(fight, site, { lead = false } = {}) {
  const poster = layout.renderPoster(fight, {
    level: lead ? "h1" : "h2",
    tile: true,
    cta: `<p>${link(`/fights/${fight.id}.html`, "Open the fight card", { className: "cta" })}</p>`,
    teaserHtml: teaser(site),
  });
  const headliner = fight.role === "main" ? " card-headliner" : "";
  const role = lead ? "card-lead" : "undercard-bout";
  return `<article class="${role}${headliner}" id="${fight.id}">${poster}</article>`;
}

export function renderHome(data) {
  const site = data.site;
  const ordered = orderedFights(data);
  const intro = `<div class="wrap card-intro"><p class="tagline">${escapeText(site.tagline)}</p><p class="referee">${escapeText(site.referee)}</p></div>`;
  const list = ordered.length
    ? `<section class="card-list" aria-label="The card, in round order">
        ${intro}
        ${ordered.map((fight, index) => renderListedFight(fight, site, { lead: index === 0 })).join("")}
      </section>`
    : `<section class="slot"><h1>No bouts on the card yet.</h1></section>`;
  const description = ordered.length ? cardDescription(data) : site.tagline;
  return document({
    title: site.fullName,
    description,
    path: "/",
    image: "/assets/og/site.png",
    imageAlt: `${site.fullName}. ${site.tagline}`,
    main: `<main id="content" tabindex="-1">
      ${list}
      ${ordered.length ? ropes() : ""}
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
        <p>Battle Calls locks a call before it is judged. The market is the referee. The horizon is chosen before the result, and it is not moved afterward.</p>
      </header>
      ${roundList(data)}
      <section aria-labelledby="lock">
        <h2 id="lock" class="display-heading">Lock the call</h2>
        <p>Each call is archived before judging: the URL when one exists, the post ID, the time in UTC and in ET, and the wording copied exactly. If the post is edited later, the locked wording is what gets judged. A deleted post is noted on the card and is not republished. The note says it was deleted, and it is not used for scoring in place of the repost.</p>
      </section>
      <section aria-labelledby="entry">
        <h2 id="entry" class="display-heading">Entry price</h2>
        <p>Posted during regular hours: the open of the first 1-minute bar after the post. Posted outside regular hours: the next regular-session open. For a venue that trades through the weekend, the card names the bar it used. Each person is scored from that person's own entry.</p>
      </section>
      <section aria-labelledby="source">
        <h2 id="source" class="display-heading">Price source and timestamp</h2>
        <p>Every bout names its price source and the timestamp of the print. A locked historical print is labeled as such. It is not a live quote. For crypto, one venue is named before judging. The default reference is the official close. A call that names a target or a stop is a touch call, judged on the intraday high or low, and the first to touch wins, unless the bout says it uses daily settles or daily closes only.</p>
      </section>
      <section aria-labelledby="horizon">
        <h2 id="horizon" class="display-heading">Horizons</h2>
        <p>Today means that day's close. This week means Friday's close. When no horizon is stated, the horizon is five trading days, and that choice is announced before judging. The horizon is never picked after the fact. When Battle Calls sets the horizon, the card says so.</p>
      </section>
      <section aria-labelledby="types">
        <h2 id="types" class="display-heading">Call types</h2>
        <p>A call is a direction, a target, or a relative comparison. A clean opposite is the same asset, an overlapping horizon, and opposite directions. A hedged or untimed call cannot be an official bout. It may run as a labeled EXHIBITION, with the rules set in advance. No contest is the result when a bout cannot be judged, for example when the data is unavailable or a call is withdrawn before the first bell.</p>
        <p>When a bout defines a stop-hit that ends it before the bell, that finish is a TKO, not a KO. The card lists the checks in order, before any of them can hit. KO, TKO (stop hit), and decision are separate finishes.</p>
      </section>
      <section aria-labelledby="scoring">
        <h2 id="scoring" class="display-heading">How a result is named</h2>
        <p>Results are reported in percent and in points, to two decimals. A KO is the level named on the card. A decision is the bigger favorable move from each entry when no KO lands, using the rule that bout locked. A draw is a move smaller than the larger of 0.25% and half the 20-day average daily move, unless the bout has already published a tighter or wider band. The band on the card is the band that is used. If both targets hit, the first to touch wins, unless the bout is settle-only or close-only.</p>
        <p>The scorecard is updated on a weekly check-in until the final bell. A lead on a check-in is not a winner.</p>
      </section>
      <section aria-labelledby="tape-rules">
        <h2 id="tape-rules" class="display-heading">Tale of the tape</h2>
        <p>The tape shows the corner, the name, the handle as text when there is a public handle, a profile link when there is one, the exact call, the link to the original post or broadcast, the time in ET, the price at the first bell, the KO line, the final bell, and a site-only record that starts at 0-0-0.</p>
        <p>Account age and follower counts are shown only when a primary-source figure was archived with a timestamp. This launch card does not show them, because those figures were not archived that way. They are not estimated. A credential is shown only when it is verifiable at a primary source: the CMT directory, the CFA designation, BrokerCheck, or IAPD. Claimed returns, hit rates, and AUM are not shown.</p>
        <p>A television call with no post is labeled as a TV call. The card quotes only the wording it has, and it says when the spoken wording is still pending a tape check. No profile link is invented.</p>
      </section>
      <section aria-labelledby="corrections-method">
        <h2 id="corrections-method" class="display-heading">Corrections</h2>
        <p>Mistakes by this site are listed on the ${link("/corrections.html", "corrections log")}, newest first. A correction names the bout, what changed, and why. An edit or deletion at the source does not rewrite the locked call.</p>
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
    description: "How Battle Calls locks a call, names a price, and scores a bout. Entertainment and education only, not advice.",
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
      <p>When this site gets a quote, a time, a level, or a print wrong, the change is written here, newest first. An edited or deleted source does not change the locked wording.</p>
      ${list}
      <p>Corrections contact: coming at launch.</p>
      <p>No personal address is published. A correction request should name the bout, the line, and the original post or broadcast. Accepted corrections are added to this page.</p>
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
    const currentAttr = href === current ? ` aria-current="page"` : "";
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
      const currentAttr = href === current ? ` aria-current="page"` : "";
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

export function renderPages(data, finePrint, corrections = { entries: [] }) {
  const site = data.site;
  const pages = new Map();
  pages.set("index.html", shell(site, renderHome(data)));
  pages.set("methodology.html", shell(site, renderMethodology(data)));
  pages.set("corrections.html", shell(site, { ...renderCorrections(data, corrections), fights: data.fights }));
  pages.set("about.html", shell(site, renderAbout(data)));
  pages.set("fine-print.html", shell(site, { ...renderFinePrint(data, finePrint), fights: data.fights }));
  pages.set("404.html", shell(site, renderNotFound(data)));
  for (const fight of orderedFights(data)) {
    pages.set(`fights/${fight.id}.html`, shell(site, { ...renderFight(data, fight), fights: data.fights }));
  }
  return pages;
}
