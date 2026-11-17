# Battle Calls

Battle Calls: the unauthorized fight card. Opposing public market calls, scored against the chart. Nothing here turns hosting on.

The pages a host should publish are only the files in `site/`. README, DESIGN, `scripts/`, and `data/` stay outside that folder and must not be served.

## Pages

- Home, listing Round 1, Round 2, and Round 3 in that order
- One fight card per bout, rendered from the current week in `data/weeks/`
- Methodology
- Corrections
- About
- Fine print
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

## Privacy

Commits use a noreply identity. `.githooks/pre-push` runs `scripts/privacy-scan.mjs`. The term list lives in `.privacy-terms.local`, which is not committed. Copy `.privacy-terms.example` to that name and replace the placeholders. If the local file is missing, the term check skips. Install the hook with:

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
