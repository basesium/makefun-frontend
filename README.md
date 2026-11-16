# Fast make.fun board

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, light frontend for [make.fun](https://make.fun) — a live bounty
board, bounty pages, leaderboards and hunter profiles, built only from
static files and the make.fun public API. No sign-in, nothing is written,
no framework, no external code.

## What it shows

- **Board** (`#/`): live bounties with live pot, entry fee, time left and
  entry count. Filter by text, sort by pot / deadline / entries, and
  filter to open or ending-soon bounties. Whether a bounty still takes
  entries is judged by its deadline, not its status alone.
- **Bounty** (`#/bounty/<slug>`): summary, live pot, entry fee, deadline,
  sponsor, skills, a rewards table (prize + fee share + total) and the
  full rules.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`): judge win rate with
  its 90% interval, validity and entry size, paginated 25 a page.
- **Profile** (`#/u/<handle>`): avatar, bio, links, career record and
  every entry, with place, prize and win rate.
- **Rankings** (`#/rankings`): all-time hunter rankings.
- **Live** (`#/live`): the newest entries as they land.

## Speed

- One tiny first load: `index.html`, one stylesheet and five small ES
  modules, system fonts, no images except API avatars.
- API answers are cached in memory for 60 seconds and revalidated with
  the ETag the API returns; in-flight requests are shared, and stale
  renders are cancelled when the route changes.
- Leaderboards are paginated; views update without rebuilding the page
  on every keystroke (board filtering re-renders only the board).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-frontend.ts`.
