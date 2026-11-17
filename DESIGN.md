# Design

## Hypothesis

A reader can tell, in one pass, which bout is the title fight, what each person said, and how the chart will score it, without mistaking the page for advice.

Success is a single primary action on the home page, WCAG 2.2 AA contrast for the text colors, a first load under two seconds on a local Lighthouse run, and a privacy scan with no personal identifiers.

## Palette

The ground is charcoal, not pure black, so a grain tile can sit in it without turning the page gray. Blood red is a bar, a stamp, and a button fill. It is not small text: a dark red on charcoal fails AA at body size. Gold is the rule and the link color because it clears AA as text. Paper white is the body color.

| Token | Hex | Role |
| --- | --- | --- |
| `--color-bg` | `#100e0c` | Page |
| `--color-bg-raised` | `#1a1714` | Card |
| `--color-bg-band` | `#241f1a` | Raised band |
| `--color-bg-worst` | `#221e1c` | Lightest grain the type must clear |
| `--color-ink` | `#f7f1e6` | Body |
| `--color-muted` | `#d9cbb6` | Secondary text |
| `--color-gold` | `#e8c56a` | Links and rules |
| `--color-focus` | `#ffe1a3` | Focus ring |
| `--color-blood` | `#8e1e24` | Button and stamp |
| `--color-blood-hot` | `#a32028` | Button hover |
| `--color-on-blood` | `#f7f1e6` | Text on blood |

Measured pairs, all above the AA bar (`node scripts/contrast.mjs`):

- Ink on the page: 17.13
- Muted on the page: 12.08
- Muted on the worst grain: 10.36
- Gold on the page: 11.58
- Gold on a raised card: 10.73
- Paper on blood: 7.91
- Paper on the hover blood: 6.68
- Focus gold on the page: 15.18

The grain tile never gets lighter than `#221e1c`, so the muted line under the site name still clears AA on top of it.

## Type

Oswald, a condensed display face, carries the poster words, the stamps, and the navigation. Source Sans 3 carries the quotes and the rules, because a tape has to be readable at 16px. Both are SIL Open Font License and subset to the characters this card uses, including the minus, the comparison signs, and the arrow in the deleted-post note. Files are woff2, self-hosted, with `font-display: swap`.

The scale is 0.875 / 1 / 1.25 / 2 / 3.5 / 6 rem. The hero word uses a clamp between 3.5rem and 6rem so the poster survives a phone without a second stylesheet. Handles are not uppercased. The poster word is.

## Space

Layout uses 8, 16, 32, and 64 pixels only: `--space-1` through `--space-4`. The focus ring is 3px. That sits outside the spacing scale on purpose, so a 1px outline is not the only thing a keyboard user gets. Borders on the poster frame are 1px. The header and footer bars are 8px, which is on the scale.

## Components

- Skip link, revealed on focus
- Site name, with the non-affiliation line directly under it
- The same blood CTA on every home bout. The tagline is the site line above the card, not one bout's line
- Tale of the tape as a description list
- Initials badge. No photo, no logo, no avatar
- Scorecard stamp for pending, in progress, KO, TKO, decision, draw, and no contest
- A deleted post is a one-line note. The wording is not reprinted.
- Fine-print notice, set in the text face inside `pre` so the dashes stay put
- Empty state for the corrections log

## Motion and edges

Corners are square. There is no entrance animation. Hover changes color, not position. `prefers-reduced-motion: reduce` turns off animation, transition, and smooth scrolling if any is added later. `prefers-contrast: more` thickens the frames. `forced-colors` keeps a border and a highlight outline.

## Poster pass

The home page is a fight poster, not a text column. Bear is the left corner, in blood. Bull is the right corner, in gold. Initials are a type badge. The name is set in condensed display type. One line gives the call, and one line gives the KO. VS sits between them, and it stacks between the corners on a phone. Round, bout label, and the instrument are the billing above the corners. First bell and final bell are a billing strip. Each home bout has the same button.

Undercard bouts use the same corner structure at a smaller size, with the same blood CTA as the title fight. The fine-print teaser is once on each poster, not repeated inside it.

The tale of the tape is one table. Rows are the tape labels. Columns are the two corners, with a color bar on the header. A long quote sits in a native disclosure labeled Full quote, so the row stays scannable and the locked wording of a live post is still on the page. A deleted post is noted in one line and is not republished.

The scorecard ring is CSS. Tick positions are percentages written into `css/meters.css` at build time, so the page has no inline style and no script. The latest close, both entries, and the KO or decision lines are marks on one SPX, silver, or bitcoin scale. The words under the ring repeat every mark, so the graphic is not the only way to read it. Exhibitions with no posted close say so.

## Why the exhibitions come before the title fight

The home page, the nav, and the round lists go Round 1, Round 2, then Round 3. Silver and Bitcoin are the exhibitions. The S&P 500 bout is last and keeps the heavier main-event frame. The tagline stays the site line above the card. Each poster links to its own card.

## Why a deleted post is only a note

The card notes that a post was deleted and points to the repost. It does not reprint the deleted wording, and it does not draw a picture of the post. The deleted post is not what gets scored.

## Why the TV call has no profile link

There is no post and no profile to link. The card quotes the broadcast headline only, names the show and the time, and says the spoken wording is pending a tape check.

## Voice

The card, the rules, and the about page stay formal. The fine print is a separate page. The teaser near each bout points there. The one-line footer is the short formal line, on every page, and it does not replace the longer disclosures.

## Definition of done

- Pages render from `data/fights.json` with no runtime fetch
- Quotes, levels, and caveats match the locked card
- Contrast pairs above pass
- Keyboard focus is visible, the skip link works, and status is not color alone
- `npm run check` passes
- Lighthouse on the local server is recorded in the pull request
- `noindex` and `Disallow: /` stay until the launch TODO in the README is done
