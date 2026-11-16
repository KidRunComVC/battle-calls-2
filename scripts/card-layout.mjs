export function createLayout(h) {
  const { escapeText, escapeAttr, link, quotesOf, renderQuote, renderAccount, finishCopy } = h;

  function ordered(fight) {
    const bear = fight.corners.find((corner) => corner.side === "bear");
    const bull = fight.corners.find((corner) => corner.side === "bull");
    return [bear, bull].filter(Boolean);
  }

  function scale(meter) {
    const values = meter.marks.map((mark) => mark.value);
    if (meter.current != null) values.push(meter.current);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.12 || 1;
    const lo = min - pad;
    const hi = max + pad;
    return (value) => ((value - lo) / (hi - lo)) * 100;
  }

  function cornerName(corner) {
    const text = corner.handle ? `@${corner.handle}` : corner.name;
    if (corner.profileUrl) {
      return link(corner.profileUrl, text, { external: true, className: "poster-name handle" });
    }
    return `<span class="poster-name handle">${escapeText(text)}</span>`;
  }

  function posterCorner(corner) {
    return `<div class="poster-corner poster-${corner.side}">
      <p class="poster-badge badge-${corner.side}" aria-hidden="true">${escapeText(corner.initials)}</p>
      ${cornerName(corner)}
      <p class="poster-call">${escapeText(corner.posterCall || corner.koLine)}</p>
      <p class="poster-ko">${escapeText(corner.posterKo || corner.koLine)}</p>
    </div>`;
  }

  function bells(fight) {
    return `<p class="bell-row">
      <span><span class="bell-kicker">First bell</span> ${escapeText(fight.firstBell)}</span>
      <span><span class="bell-kicker">Final bell</span> ${escapeText(fight.finalBell)}</span>
    </p>`;
  }

  function renderPoster(fight, { level = "h1", lede = "", extra = "", cta = "", teaserHtml = "" } = {}) {
    const [bear, bull] = ordered(fight);
    const Tag = level;
    return `<header class="poster${level === "h1" ? " poster-main" : " poster-tile"}">
      <${Tag} class="billing">
        <span class="billing-round">Round ${fight.round}</span>
        <span class="stamp">${escapeText(fight.label)}</span>
        <span class="poster-word">${escapeText(fight.posterWord)}</span>
      </${Tag}>
      <div class="poster-ring">
        ${posterCorner(bear)}
        <p class="poster-vs">VS</p>
        ${posterCorner(bull)}
      </div>
      ${bells(fight)}
      ${lede ? `<p class="lede">${escapeText(lede)}</p>` : ""}
      ${extra}
      ${cta}
      ${teaserHtml}
    </header>`;
  }

  function callCell(corner) {
    const quotes = quotesOf(corner);
    const archived = quotes.filter((quote) => quote.kind === "archive" || quote.postState === "deleted");
    const live = quotes.filter((quote) => !(quote.kind === "archive" || quote.postState === "deleted"));
    const line = corner.posterCall || (live[0]?.texts || [live[0]?.text || ""])[0] || "";
    const notes = [...new Set(quotes.map((quote) => quote.quoteNote).filter(Boolean))];
    const asides = (corner.asides || [])
      .map((aside) => {
        const extra = aside.href
          ? ` ${link(aside.href, aside.linkText || "Source", { external: !aside.href.startsWith("/") })}`
          : "";
        return `<p>${escapeText(aside.text)}${extra}</p>`;
      })
      .join("");
    const headlines = live.filter((quote) => quote.kind === "headline");
    const spoken = live.filter((quote) => quote.kind !== "headline");
    const headlineBlocks = headlines
      .map((quote) => {
        const texts = quote.texts || (quote.text ? [quote.text] : []);
        const cite = quote.postUrl ? ` cite="${escapeAttr(quote.postUrl)}"` : "";
        const source = quote.postUrl
          ? `<p>${link(quote.postUrl, quote.linkText || "CNBC video", { external: true })}</p>`
          : "";
        return `<p class="call-label">CNBC headline:</p>
          <blockquote${cite}>${texts.map((text) => `<p>${escapeText(text)}</p>`).join("")}</blockquote>
          ${quote.quoteNote ? `<p>${escapeText(quote.quoteNote)}</p>` : ""}
          ${source}`;
      })
      .join("");
    const full = spoken.length
      ? `<details class="full-quote"><summary>Full quote</summary>${spoken.map(renderQuote).join("")}</details>`
      : "";
    const notices = [];
    if (corner.deletedNotice) notices.push(corner.deletedNotice);
    for (const quote of archived) {
      if (quote.notice) notices.push(quote.notice);
    }
    const deleted = notices.map((notice) => `<p class="deleted-note">${escapeText(notice)}</p>`).join("");
    return `<p class="call-line">${escapeText(line)}</p>
      ${corner.spacingNote ? `<p>${escapeText(corner.spacingNote)}</p>` : ""}
      ${corner.tvLabel ? `<p class="call-label">${escapeText(corner.tvLabel)}</p>` : ""}
      ${notes.filter((note) => !headlines.some((quote) => quote.quoteNote === note)).map((note) => `<p>${escapeText(note)}</p>`).join("")}
      ${asides}
      ${headlineBlocks}
      ${full}
      ${deleted}`;
  }

  function dateCell(corner) {
    const clock = corner.calledAtUtc
      ? `<time datetime="${escapeAttr(corner.calledAtUtc)}">${escapeText(corner.calledAtEt)}</time>`
      : escapeText(corner.calledAtEt || "");
    return `${clock}${corner.calledAtNote ? ` (${escapeText(corner.calledAtNote)})` : ""}`;
  }

  function renderTape(fight) {
    const [bear, bull] = ordered(fight);
    const rows = [
      ["Corner", escapeText(bear.cornerLabel), escapeText(bull.cornerLabel)],
      ["Account", renderAccount(bear), renderAccount(bull)],
      ["The call", callCell(bear), callCell(bull)],
      ["Date called", dateCell(bear), dateCell(bull)],
      ["Price at first bell", `<span class="handle">${escapeText(bear.entryDisplay)}</span> ${escapeText(bear.entryNote)}`, `<span class="handle">${escapeText(bull.entryDisplay)}</span> ${escapeText(bull.entryNote)}`],
      ["Target", escapeText(bear.targetInWords), escapeText(bull.targetInWords)],
      ["Line in the sand", escapeText(bear.koLine), escapeText(bull.koLine)],
      ["Final bell", escapeText(fight.finalBellDetail), escapeText(fight.finalBellDetail)],
      ["Site-only record", `${escapeText(bear.record)}. Wins, losses, and draws on this site only.`, `${escapeText(bull.record)}. Wins, losses, and draws on this site only.`],
    ];
    const body = rows
      .map(
        ([label, left, right]) => `<tr>
          <th scope="row">${escapeText(label)}</th>
          <td data-side="Bear">${left}</td>
          <td data-side="Bull">${right}</td>
        </tr>`,
      )
      .join("");
    return `<div class="tape-scroll">
      <table class="tape-table">
        <caption class="visually-hidden">Tale of the tape. Bear on the left, bull on the right.</caption>
        <thead>
          <tr>
            <th class="tape-corner" scope="col">Tape</th>
            <th class="col-bear" scope="col">Bear</th>
            <th class="col-bull" scope="col">Bull</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
  }

  function renderMeter(fight) {
    const meter = fight.meter;
    if (!meter) return "";
    const marks = meter.marks
      .map(
        (mark, index) =>
          `<span class="ring-mark ring-mark-${mark.side} ring-mark-${mark.kind} mk-${fight.id}-${index}"></span>`,
      )
      .join("");
    const now =
      meter.current == null
        ? ""
        : `<span class="ring-mark ring-mark-now mk-${fight.id}-now"></span>`;
    const legend = meter.marks
      .map(
        (mark) =>
          `<li><span class="legend-swatch legend-${mark.side}" aria-hidden="true"></span>${escapeText(mark.name)} ${escapeText(mark.label)}</li>`,
      )
      .join("");
    const nowItem =
      meter.current == null
        ? `<li>No close posted yet.</li>`
        : `<li><span class="legend-swatch legend-now" aria-hidden="true"></span>Latest close ${escapeText(meter.currentLabel)}</li>`;
    return `<figure class="ring-meter">
      <div class="ring-track" aria-hidden="true">${marks}${now}</div>
      <figcaption>
        <p>${escapeText(meter.caption)}</p>
        <p>${escapeText(meter.source)}</p>
      </figcaption>
      <ul class="ring-legend">${legend}${nowItem}</ul>
    </figure>`;
  }

  function renderMeterCss(fights) {
    const rules = [];
    for (const fight of fights) {
      if (!fight.meter) continue;
      const x = scale(fight.meter);
      fight.meter.marks.forEach((mark, index) => {
        rules.push(`.mk-${fight.id}-${index} { left: ${x(mark.value).toFixed(2)}%; }`);
      });
      if (fight.meter.current != null) {
        rules.push(`.mk-${fight.id}-now { left: ${x(fight.meter.current).toFixed(2)}%; }`);
      }
    }
    return `${rules.join("\n")}\n`;
  }

  function renderScoreBlock(fight, site) {
    const finish = finishCopy(fight);
    const lines = (fight.score?.lines || []).map((line) => `<p class="score-line">${escapeText(line)}</p>`).join("");
    const source = fight.score?.source ? `<p>Source: ${escapeText(fight.score.source)}</p>` : "";
    const checks = fight.checkins?.length
      ? fight.checkins
          .map(
            (row) =>
              `<tr><td>${escapeText(row.date)}</td><td>${escapeText(row.print)}</td><td>${escapeText(row.note)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="3">No check-ins yet.</td></tr>`;
    const legend = (fight.finishStates || []).map((state) => `<li>${escapeText(state)}</li>`).join("");
    const after = finish.done ? `<p class="post-fight">${escapeText(site.postFight)}</p>` : "";
    return `<section class="spread scorecard" aria-labelledby="${fight.id}-score">
      <div class="scorecard-head">
        <h2 id="${fight.id}-score" class="display-heading">Scorecard</h2>
        <p class="stamp ${finish.stampClass}">${escapeText(finish.stamp)}</p>
      </div>
      ${finish.note ? `<p>${escapeText(finish.note)}</p>` : ""}
      ${finish.text ? `<p>${escapeText(finish.text)}</p>` : ""}
      ${renderMeter(fight)}
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

  return { renderPoster, renderTape, renderMeterCss, renderScoreBlock, ordered };
}
