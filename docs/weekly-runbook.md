# Weekly runbook

The site is never auto-published. There is no scheduled deploy. Joey searches for fights on Friday, approves the card, and publishes it himself on Sunday by starting `pages.yml`.

The private scoring database stays outside this repo. Do not read it from the build, and do not commit it.

## Friday

1. Search for the next week's fights.
2. Scaffold the file without moving the live pointer:

```sh
node scripts/new-week.mjs 2026-11-23
```

3. Fill `data/weeks/2026-11-23.json` with the real bouts, in round order. Give each bout an id that is not already used, such as `2026-11-23-round-1`. Leave `data/current.json` on the week that is live.
4. For each bout, `publicResult` may be empty. An empty result shows one line, `Result: pending, final bell <date>`. Winner, final price, and why appear only after those fields are filled. Joey copies the public wording by hand. Do not copy the private scoring notes.
5. Open a draft pull request that adds that week file and nothing else. The homepage stays on the current week until Sunday.

## Approval

Joey reviews the draft pull request and approves the wording. Merging that pull request adds the file. It does not change the homepage, because `data/current.json` is unchanged.

## Sunday

1. In a second pull request, flip the pointer:

```sh
node scripts/set-current.mjs 2026-11-23
```

The command refuses a week that has no fights. It writes `data/current.json` and does not deploy.

2. Joey merges that pull request.
3. Joey starts `pages.yml` by hand. That is the publish step. The homepage then shows the new week. The previous week stays on `/archive/`, newest week first.

Today's three bouts stay at `/fights/round-1-silver.html`, `/fights/round-2-bitcoin.html`, and `/fights/round-3-spx.html`. A later week uses `/fights/<week>/round-<n>.html`.

## Privacy scan

`npm run check` runs `scripts/privacy-scan.mjs`. The denylist is personal and stays off this repo. Provide it in one of these ways:

- `.privacy-terms.local` in the repo root (gitignored). Copy `.privacy-terms.example` and replace the placeholders.
- `PRIVACY_TERMS`, with one term per line.
- `PRIVACY_TERMS_FILE`, a path to a file in the same format.

If none of those is set, the scan exits with an error. It does not pass. `node scripts/privacy-scan.mjs --allow-missing` skips the denylist and still checks for email addresses and phone numbers. Do not commit the term list.
