const SITE_BASE = "/battle-calls-2";

const STATUSES = {
  OPEN: "open",
  EXPIRED: "expired",
  WIN: "win",
  "WIN BY KO": "win-by-ko",
  "WIN BY DECISION": "win-by-decision",
  LOSS: "loss",
  "LOSS BY KO": "loss-by-ko",
  "LOSS BY DECISION": "loss-by-decision",
  "UNDER REVIEW": "under-review",
  VOID: "void",
  DRAW: "draw",
  WON: "won",
  LOST: "lost",
};

const PRINTS = [
  ["open", "Open", "O"],
  ["high", "High", "H"],
  ["low", "Low", "L"],
  ["close", "Close", "C"],
];

const LOGO_ALT = "Battle Calls logo: crossed BC boxing gloves with VS";

function escapeText(value) {
  return String(value).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);
}

function escapeAttr(value) {
  return escapeText(value).replace(/["']/g, (ch) => (ch === '"' ? "&quot;" : "&#39;"));
}

function withBase(href) {
  if (href === "/") return `${SITE_BASE}/`;
  return `${SITE_BASE}${href}`;
}

function assertHref(href) {
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) return;
  throw new Error(`Refusing href: ${href}`);
}

function isNum(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function statusOf(value) {
  const raw = String(value || "OPEN").trim();
  const key = raw.toUpperCase();
  if (STATUSES[key]) return key;
  return raw || "OPEN";
}

function statusSlug(status) {
  return STATUSES[status] || "unknown";
}

function money(amount) {
  return `$${amount.toFixed(2)}`;
}

function toCents(amount) {
  return Math.round(amount * 100);
}

function percentText(ratio) {
  const tenths = Math.floor(Math.abs(ratio) * 1000 + 0.5);
  const pct = tenths / 10;
  const body = pct % 1 === 0 ? String(pct) : pct.toFixed(1);
  return `${body}%`;
}

export function levelsFor(card) {
  const progress = card.progress || {};
  const direction = (card.tape && card.tape.direction) || "";
  if (!isNum(progress.entry) || !isNum(progress.target) || progress.entry === 0) return null;
  const bearish = /bear|short/i.test(direction);
  const entryCents = toCents(progress.entry);
  const targetCents = toCents(progress.target);
  let distance = Math.abs(targetCents - entryCents);
  const cap = Math.floor(entryCents / 2);
  if (distance > cap) distance = cap;
  const callerTarget = targetCents / 100;
  const callerKo = (bearish ? targetCents - 1 : targetCents + 1) / 100;
  const marketLevel = (bearish ? entryCents + distance : entryCents - distance) / 100;
  const marketKo = (bearish ? entryCents + distance + 1 : entryCents - distance - 1) / 100;
  const callPct = percentText(Math.abs(targetCents - entryCents) / entryCents);
  const usedPct = percentText(distance / entryCents);
  const callerSign = bearish ? "-" : "+";
  const marketSign = bearish ? "+" : "-";
  return {
    callerPrice: callerKo,
    marketPrice: marketKo,
    callerTarget,
    marketLevel,
    callerText: `${money(callerTarget)} target, ${money(callerKo)} KO (${callerSign}${callPct})`,
    marketText: `${money(marketLevel)} level, ${money(marketKo)} KO (${marketSign}${usedPct})`,
    callerEnd: `CALLER KO ${money(callerKo)}`,
    marketEnd: `THE MARKET KO ${money(marketKo)}`,
  };
}

function asNumber(value) {
  if (isNum(value)) return value;
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return isNum(parsed) ? parsed : null;
}

export function tugCaption(card, levels) {
  if (card.result && card.result.caption) return card.result.caption;
  const progress = card.progress || {};
  const bar = card.result && card.result.bar;
  const entry = progress.entry;
  let high = asNumber(progress.mark);
  if (high == null && bar) high = asNumber(bar.high);
  const low = bar ? asNumber(bar.low) : null;
  const close = bar ? asNumber(bar.close) : null;
  const status = statusOf(card.status);
  const start = money(entry);
  const caller = money(levels.callerPrice);
  const market = money(levels.marketPrice);

  if (status === "WIN" && high != null) {
    return `Price ran from ${start} to ${money(high)}, hitting the call at ${money(levels.callerTarget)}.`;
  }
  if (status === "WIN BY KO" && high != null) {
    return `Price ran from ${start} to ${money(high)}, through the Caller's KO at ${caller}.`;
  }
  if (status === "LOSS") {
    const touched = low != null ? low : high;
    return `Price ran from ${start} to ${money(touched)}, and THE MARKET wins at ${money(levels.marketLevel)}.`;
  }
  if (status === "LOSS BY KO") {
    const broke = low != null ? low : high;
    return `Price ran from ${start} to ${money(broke)}, through THE MARKET's KO at ${market}.`;
  }
  if (status === "WIN BY DECISION" && close != null) {
    return `Price closed at ${money(close)}, past the start at ${start}, short of the Caller's KO at ${caller}.`;
  }
  if (status === "LOSS BY DECISION" && close != null) {
    return `Price closed at ${money(close)}, on THE MARKET's side of the start at ${start}.`;
  }
  if (status === "UNDER REVIEW") {
    return `Price touched the Caller's KO at ${caller} and THE MARKET's KO at ${market}.`;
  }
  if (status === "OPEN" || status === "EXPIRED") {
    if (high != null && low != null) {
      return `Since the start at ${start}, price has traded from ${money(low)} to ${money(high)}.`;
    }
    if (high != null) return `Price has run from ${start} to ${money(high)}.`;
    return `The bout is open from the start at ${start}.`;
  }
  if (high != null) return `Price ran from ${start} to ${money(high)}.`;
  return `The bout starts at ${start}.`;
}

function reachOf(entry, boundary, price) {
  const span = Math.abs(boundary - entry);
  if (!(span > 0) || !isNum(price)) return 0;
  return Math.abs(price - entry) / span;
}

export function widthTenths(ratio) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round(clamped * 1000);
}

export function meterState(card, levels = levelsFor(card)) {
  const progress = card.progress || {};
  if (!levels || !isNum(progress.entry)) return null;
  const entry = progress.entry;
  const caller = levels.callerPrice;
  const market = levels.marketPrice;
  const bearish = /bear|short/i.test((card.tape && card.tape.direction) || "");
  const bar = card.result && card.result.bar;
  let high = asNumber(progress.mark);
  if (high == null && bar) high = asNumber(bar.high);
  const low = bar ? asNumber(bar.low) : null;

  function onCaller(price) {
    if (!isNum(price) || price === entry) return false;
    return bearish ? price < entry : price > entry;
  }

  let callerReach = 0;
  let marketReach = 0;
  for (const price of [high, low]) {
    if (!isNum(price)) continue;
    if (onCaller(price)) callerReach = Math.max(callerReach, reachOf(entry, caller, price));
    else if (price !== entry) marketReach = Math.max(marketReach, reachOf(entry, market, price));
  }
  const callerBroke = callerReach >= 1;
  const marketBroke = marketReach >= 1;
  return {
    entry,
    caller,
    market,
    callerFill: Math.max(0, Math.min(1, callerReach)),
    marketFill: Math.max(0, Math.min(1, marketReach)),
    callerBroke,
    marketBroke,
    lowLabel: marketBroke && low != null && !onCaller(low) ? `LOW ${money(low)}` : "",
    highLabel: callerBroke && high != null && onCaller(high) ? `HIGH ${money(high)}` : "",
    caption: tugCaption(card, levels),
  };
}

export function renderFightFillCss(cards) {
  const tenths = new Set();
  for (const card of cards || []) {
    const meter = meterState(card);
    if (!meter) continue;
    tenths.add(widthTenths(meter.callerFill));
    tenths.add(widthTenths(meter.marketFill));
  }
  return [...tenths]
    .sort((a, b) => a - b)
    .map((n) => {
      const value = n / 10;
      const body = Number.isInteger(value) ? String(value) : value.toFixed(1);
      return `.tug-pct-${n} { width: ${body}%; }`;
    })
    .join("\n");
}

function initialOf(handle) {
  const name = String(handle || "").replace(/^@+/, "").trim();
  const ch = name.charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function note(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (clean.charAt(0) === "(") return clean;
  return `(${clean})`;
}

function robotIcon() {
  return `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10" cy="2.7" r="1.15" fill="currentColor"></circle><rect x="9.25" y="3.7" width="1.5" height="2.1" fill="currentColor"></rect><rect x="3.2" y="5.8" width="13.6" height="11.2" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"></rect><circle cx="7.3" cy="10.6" r="1.1" fill="currentColor"></circle><circle cx="12.7" cy="10.6" r="1.1" fill="currentColor"></circle><path d="M7.2 14.1h5.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path></svg>`;
}

function externalLink(href, inner, { ariaLabel = "" } = {}) {
  assertHref(href);
  const label = ariaLabel ? ` aria-label="${escapeAttr(ariaLabel)}"` : "";
  return `<a href="${escapeAttr(href)}"${label} target="_blank" rel="noopener noreferrer">${inner}</a>`;
}

function methodLink() {
  return `<p class="fight-rule-link"><a href="${withBase("/methodology.html")}">How bouts are scored</a></p>`;
}

function tapeRow(label, value, extra = "", tail = "") {
  if (!value && !tail) return "";
  const body = value
    ? `${escapeText(value)}${extra ? `<span class="fight-note"> ${escapeText(extra)}</span>` : ""}`
    : "";
  return `<dt>${escapeText(label)}</dt><dd>${body}${tail}</dd>`;
}

function renderTape(tape, levels) {
  const data = tape || {};
  return `<dl class="fight-tape">
    ${tapeRow("Asset", data.asset)}
    ${tapeRow("Post ID", data.postId)}
    ${tapeRow("Direction", data.direction)}
    ${tapeRow("Entry", data.entry, note(data.entryNote))}
    ${levels ? tapeRow("Caller", levels.callerText) : ""}
    ${levels ? tapeRow("THE MARKET", levels.marketText) : ""}
    ${tapeRow("Deadline", data.deadline)}
    ${tapeRow("Win rule", data.winRule, "", methodLink())}
  </dl>`;
}

function renderPrint(result) {
  const bar = result.bar;
  if (!bar) return "";
  const rows = PRINTS.filter((item) => bar[item[0]] != null && bar[item[0]] !== "")
    .map(
      (item) => `<div><dt class="visually-hidden">${item[1]}</dt><dd><span aria-hidden="true">${item[2]} </span>${escapeText(bar[item[0]])}</dd></div>`,
    )
    .join("");
  const label = result.barLabel ? `<p class="fight-print-date">${escapeText(result.barLabel)}</p>` : "";
  return `<div class="fight-print">${label}<dl class="fight-ohlc">${rows}</dl></div>`;
}

function renderScorer(result) {
  const name = result.scorerName || result.scoredBy;
  const label = result.scorerLabel;
  if (!name && !label) return "";
  let credit = escapeText(name || "");
  if (label) credit += ", ";
  if (result.scorerUrl && label) {
    credit += externalLink(result.scorerUrl, `${robotIcon()}${escapeText(label)}`, {
      ariaLabel: "Grok Bot website (opens in a new tab)",
    });
  } else if (label) {
    credit += escapeText(label);
  }
  return `<p class="fight-scored">Scored by ${credit}</p>`;
}

function renderResult(card) {
  const status = statusOf(card.status);
  const result = card.result || {};
  const when = result.when ? `<p class="fight-result-when">${escapeText(result.when)}</p>` : "";
  const detail = result.detail ? `<p class="fight-result-detail">${escapeText(result.detail)}</p>` : "";
  return `<div class="fight-result" data-status="${statusSlug(status)}">
    <h4 class="fight-result-line"><span class="fight-kicker">Status</span><span class="fight-status"><span class="fight-status-icon fight-status-icon-${statusSlug(status)}" aria-hidden="true"></span>${escapeText(status)}</span></h4>
    ${when}
    ${detail}
    ${renderPrint(result)}
    ${renderScorer(result)}
  </div>`;
}

function renderMeter(card, levels) {
  const meter = meterState(card, levels);
  if (!meter) return "";
  const classes = ["fight-tug-visual"];
  if (meter.callerBroke) classes.push("has-caller-over");
  if (meter.marketBroke) classes.push("has-market-over");
  const marketOver = meter.marketBroke
    ? `<div class="fight-tug-over"><span class="fight-tug-pin fight-tug-pin-left"></span></div>`
    : "";
  const callerOver = meter.callerBroke ? `<div class="fight-tug-over"><span class="fight-tug-pin"></span></div>` : "";
  const marketBurst = meter.marketBroke ? `<span class="fight-tug-burst">KO</span>` : "";
  const callerBurst = meter.callerBroke ? `<span class="fight-tug-burst">KO</span>` : "";
  const extremes =
    meter.lowLabel || meter.highLabel
      ? `<div class="fight-tug-extremes"><span class="fight-tug-extreme">${escapeText(meter.lowLabel)}</span><span class="fight-tug-extreme">${escapeText(meter.highLabel)}</span></div>`
      : "";
  return `<figure class="fight-tug">
    <div class="${classes.join(" ")}" aria-hidden="true">
      <div class="fight-tug-top"><span class="fight-tug-start">START ${escapeText(money(meter.entry))}</span></div>
      <div class="fight-tug-row">
        ${marketOver}
        <div class="fight-tug-half fight-tug-market"><span class="fight-tug-fill tug-pct-${widthTenths(meter.marketFill)}"></span>${marketBurst}</div>
        <div class="fight-tug-half fight-tug-caller"><span class="fight-tug-fill tug-pct-${widthTenths(meter.callerFill)}"></span>${callerBurst}</div>
        ${callerOver}
      </div>
      <div class="fight-tug-caps"><span class="fight-tug-cap-market">THE MARKET KO ${escapeText(money(meter.market))}</span><span class="fight-tug-cap-caller">CALLER KO ${escapeText(money(meter.caller))}</span></div>
      ${extremes}
    </div>
    <figcaption class="fight-tug-caption">${escapeText(meter.caption)}</figcaption>
  </figure>`;
}

function renderCard(card) {
  const handle = String(card.handle || "").trim();
  const levels = levelsFor(card);
  const dated = card.date
    ? `<p class="fight-date"><time${card.dateTime ? ` datetime="${escapeAttr(card.dateTime)}"` : ""}>${escapeText(card.date)}</time></p>`
    : "";
  const source = card.sourceUrl
    ? `<p class="fight-source">${externalLink(
        card.sourceUrl,
        `${escapeText("View the original post")}<span class="visually-hidden"> (opens in a new tab)</span>`,
      )}</p>`
    : "";
  const quote = `<blockquote class="fight-quote"${card.sourceUrl ? ` cite="${escapeAttr(card.sourceUrl)}"` : ""}><p>${escapeText(card.quote || "")}</p></blockquote>`;
  const logoSrc = withBase("/assets/img/bc-vs-logo-512.webp");
  const logoSet = `${withBase("/assets/img/bc-vs-logo-256.webp")} 256w, ${logoSrc} 512w`;
  return `<article class="fight-card" aria-label="${escapeAttr((handle || "Caller") + " versus THE MARKET")}">
    <header class="fight-corners">
      <div class="fight-side fight-side-caller">
        <span class="fight-badge" aria-hidden="true">${escapeText(initialOf(handle))}</span>
        <div class="fight-id">
          <h3 class="fight-handle">${escapeText(handle)}</h3>
          ${card.followers ? `<p class="fight-followers">${escapeText(card.followers)}</p>` : ""}
        </div>
      </div>
      <div class="fight-vs">
        <img class="fight-vs-logo" src="${escapeAttr(logoSrc)}" srcset="${escapeAttr(logoSet)}" sizes="(min-width: 640px) 140px, 96px" width="512" height="512" alt="${escapeAttr(LOGO_ALT)}" decoding="async">
      </div>
      <div class="fight-side fight-side-market">
        <p class="fight-market-name">THE MARKET</p>
        <span class="fight-market-mark" aria-hidden="true"></span>
      </div>
    </header>
    <h4 class="visually-hidden">The call</h4>
    ${quote}
    ${dated}
    ${source}
    <h4 class="fight-kicker fight-tape-title">Tale of the tape</h4>
    ${renderTape(card.tape, levels)}
    ${renderResult(card)}
    ${renderMeter(card, levels)}
    <p class="fight-disclaimer">Entertainment and commentary only, not financial advice, not affiliated with anyone featured.</p>
  </article>`;
}

export function renderFightSection(cards) {
  if (!Array.isArray(cards) || !cards.length) return "";
  const articles = cards
    .filter((card) => card && typeof card === "object")
    .map((card) => renderCard(card))
    .join("");
  return `<section class="fight-cards" aria-labelledby="fight-cards-heading">
    <h2 id="fight-cards-heading">Caller vs. THE MARKET</h2>
    <p class="fight-method"><a href="${withBase("/methodology.html")}">How bouts are scored</a></p>
    ${articles}
  </section>`;
}
