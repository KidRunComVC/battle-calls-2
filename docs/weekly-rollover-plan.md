# Weekly rollover

This is a plan only. It does not change the build. The private scoring notes stay out of this repository.

Every Sunday the homepage should show that week's fights. The week that just ended should remain on a public archive. People who already have a link to a bout should still land on that same bout.

## 1. Data model

Split the card by week. One file per week, named by the week id:

```text
data/weeks/2026-11-16.json
data/weeks/2026-11-23.json
data/current.json
```

`data/current.json` is only a pointer:

```json
{ "week": "2026-11-16" }
```

Each week file holds the same fight objects that `data/fights.json` holds now: round, corners, locked quotes, rules, and the public scorecard fields. The site-wide lines (name, tagline, affiliation, footer) stay in one shared file, not copied into every week.

The week id is the date in the filename. It is not required to be the Sunday the card goes live. `2026-11-16` is the id for the card that is on the site today.

A week file may also carry two public fields once a bout is finished:

- `result`: the public finish already used on the card, such as pending, in progress, KO, TKO, decision, draw, or no contest, plus the public result phrase when there is one.
- `publicWhy`: one or two sentences that can be shown to anyone. This is the explanation that belongs on the archive page. It is written for the public card, not copied out of the private notes.

Do not add the private scoring database to these files. That database, including who won on the internal tally, what each caller got wrong, and any hedging-language analysis, lives outside this repo. If a public `result` or `publicWhy` is taken from that work, Joey copies the public wording in by hand. The build never reads the private database.

## 2. Build

`node scripts/build.mjs` reads `data/current.json`, loads that week file, and renders the homepage from it. The homepage order stays Round 1, Round 2, then Round 3.

Archive:

- `/archive/` lists every week file, newest week id first, with the week id and the three bout names.
- `/archive/2026-11-16/` is that week's card, in the same round order, with each bout's public result and public why when those fields exist.

Stable bout URLs:

The three pages already on the site stay where they are:

- `/fights/round-1-silver.html`
- `/fights/round-2-bitcoin.html`
- `/fights/round-3-spx.html`

Those paths keep serving the bouts they serve now. A later week does not reuse them.

A later bout gets a path that includes its week id, for example `/fights/2026-11-23/round-1.html`. The homepage links to the current week's paths. The archive links to each week's own paths. Old links do not start showing a different fight.

Nav and footer round links follow the current week's rounds, in round order. Archive pages link back to `/archive/` and do not replace the current-week nav.

Open Graph image and page titles stay per bout. The homepage keeps the site-wide card and a description of the current week's whole card. An archive week page uses the site card unless that week has its own image.

## 3. Sunday switch

Joey's decision: new fights are searched on Fridays. The site is never auto-published. Joey approves each card and publishes it himself on Sunday. There is no scheduled deploy workflow. The steps are in `docs/weekly-runbook.md`.

The site is static. Nothing on the server flips at midnight by itself. A new homepage appears only after a build is deployed. `pages.yml` runs only when someone starts it, and a deploy still needs Joey's go-ahead.

The card for next week can be merged early without going live. The new week file sits in `data/weeks/`. `data/current.json` still names the week that is live. The homepage does not change until the pointer changes and the site is deployed.

Three ways to move the pointer on Sunday:

1. Joey merges a one-line pointer change and starts `pages.yml` on Sunday. Nothing publishes early. It only happens if Joey is there to do both steps.
2. Joey approves next week's file in advance, with the pointer still on the old week. A scheduled workflow on Sunday updates the pointer, builds, and deploys. The card is ready before Sunday, and the site changes without Joey being at the keyboard. The schedule can deploy without a fresh look that morning, and a failed run stays on the old card until someone notices.
3. Same preparation as option 2, but the Sunday workflow only opens a pull request that changes the pointer. Joey merges that pull request and starts `pages.yml`. Sunday still needs Joey, but the diff is prepared and the new file was already reviewed.

Option 3 fits the current rule that merges and deploys wait for Joey. Option 2 is the one that actually changes the site on Sunday with no one present. It should wait until Joey explicitly allows that workflow to deploy.

Until a schedule exists, the manual path is the one that ships: merge the pointer, then run the Pages workflow.

## 4. What the public archive shows

For each fight, the archive shows:

- round number, exhibition or title fight, and the two corners
- the locked public call already on the card
- the public result, when the bout has one
- `publicWhy`, the short public reason, when it has been written

It does not show the private scoring database. It does not show an internal tally, a write-up of what each caller got wrong, or hedging-language analysis. Those stay in the external private source. Only the public result and the short public why, if Joey has copied them onto the week file, appear on the archive.
