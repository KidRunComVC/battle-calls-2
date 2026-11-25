# Battle Calls

Battle Calls: the unauthorized fight card. Opposing public market calls, scored against the chart. Nothing here turns hosting on.

The pages a host should publish are only the files in `site/`. README, DESIGN, `scripts/`, and `data/` stay outside that folder and must not be served.

## Pages

- The card: one public call versus THE MARKET, from `data/fight-cards.json`
- Methodology, the scoring rules for that card
- Corrections
- About
- Archive, for a week file in `data/weeks/` once it has bouts
- Fine print, linked from the footer
- 404

## Build

The site has no runtime dependency and no third-party script. Regenerate the public folder after a data edit:

```sh
node scripts/build.mjs
```

That writes `site/`. Hosting must publish only that folder. A local check serves it from there:

```sh
python3 -m http.server -d site 8765
```

Check the pages, the contrast tokens, and the denylist:

```sh
npm run check
```

Share cards, the grain tile, and the icons are already committed. Rebuild them with:

```sh
python3 scripts/make-assets.py
```

That script needs Pillow and fontTools, which are build tools, not part of the site.

## Add a round

1. Add the bout to the current week file in `data/weeks/`. See `docs/weekly-runbook.md` before adding another week.
2. Set `role` to `main` or `undercard`, and set `round` to the next ascending number. The home page, nav, and card lists show bouts from Round 1 upward.
3. Use `status` `pending` or `in_progress` until the bell. Later statuses are `ko`, `tko`, `decision`, `draw`, and `no_contest`. A `tko` is the stop-hit finish and needs `result.phrase`.
4. Quote the person exactly. If a post is deleted, note that fact in one line and do not republish the wording. Do not attach an image of the post.
5. Run the build, then `python3 scripts/make-assets.py` so the bout gets a 1200×675 share card.

`npm run check` should pass before a commit.

## Add a fight card

The card page reads `data/fight-cards.json`, newest first. Each object is one public call versus THE MARKET. The build draws it. There is no browser script. The right corner stays THE MARKET. Do not add an avatar image.

1. Copy the first object and paste the copy above it.
2. Use the caller's handle, follower line, date, and exact quote. Set `sourceUrl` to the original post.
3. Fill the tape from what they actually said. Do not invent a number. There is no stop field. If they gave a range, put only the lower number in `progress.target`, and do not mention the range on the card.
4. Set `status` to `OPEN`, `WIN`, `WIN BY KO`, `WIN BY DECISION`, `LOSS`, `LOSS BY KO`, `LOSS BY DECISION`, `UNDER REVIEW`, `VOID`, `DRAW`, or `EXPIRED`. `WIN` is an exact touch of the target. `WIN BY KO` is a penny past it. `LOSS` is an exact touch of THE MARKET's level. `LOSS BY KO` is a penny past that level. `VOID` means the target was already reached at post time. `DRAW` means both sides were touched in the same minute and finer data cannot break the tie. Add `result` when there is something to report.
5. On `progress`, set `entry` and `target`. `target` is the price that wins, not the KO. The build works in cents. A touch of the target is a win. Caller's KO is one penny past it. THE MARKET's level is the same distance the other way from entry, and a touch there is a loss. THE MARKET's KO is one penny past that level. The against-distance is the smaller of the call distance and 50% of entry, rounded down to the cent, then one more penny. The percent on the card is rounded half-up to one decimal. It is not used to price the levels. Entry is the close of the 1-minute candle that contains the post, or the last traded 1-minute candle before that minute. Time the post from its ID. Name the source on the card: Schwab, then Yahoo, then another source. Only trades after the post minute count. Set `result.caption` when the bar sentence should use the card's own words. The bar is a tug-of-war centered on the entry: THE MARKET's KO is the left end, Caller's KO is the right end, and each half is scaled to its own distance.
6. On `result`, set `scorerName`, `scorerLabel`, and `scorerUrl` when someone should get the credit. The card writes "Scored by", then the name, then links the label and a small robot icon to `scorerUrl`.
7. Run `node scripts/build.mjs`. How a bout is scored is the Methodology page.

## Privacy

Commits use a noreply identity. `.githooks/pre-push` runs `scripts/privacy-scan.mjs`. The term list is not committed. Copy `.privacy-terms.example` to `.privacy-terms.local`, or set `PRIVACY_TERMS` (one term per line) or `PRIVACY_TERMS_FILE` (a path). If none of those is set, the scan exits with an error. `node scripts/privacy-scan.mjs --allow-missing` skips only the denylist. Install the hook with:

```sh
git config core.hooksPath .githooks
```

Do not put a real name, a location, a phone number, or an email address in pages, alt text, file names, or commit messages.

## Launch TODO

Published URLs use the base path `/battle-calls-2/` on `https://kidruncomvc.github.io`. Canonical and Open Graph URLs use that origin. `noindex` and `Disallow: /` stay in place.

- [ ] Remove `noindex, nofollow` from every page.
- [ ] Replace the `Disallow: /` rule in `site/robots.txt` with `Allow: /`, and allow Twitterbot.
- [x] Set absolute `og:image` URLs for `https://kidruncomvc.github.io/battle-calls-2/`.
- [ ] Re-check the privacy scan before anything is public.
- [ ] Set Pages source to GitHub Actions, then run the workflow.
