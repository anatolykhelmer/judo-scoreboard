# Judo Scoreboard

A free scoreboard for running a single judo contest, under current IJF rules.
It runs entirely in the browser — no server, no database, no account, no
internet connection at contest time. Point two browser tabs at it, one on the
table and one on the wall, and it runs a contest end to end: hajime, scores,
penalties, osaekomi, golden score, the final gong.

**Screenshot:** *(not yet captured — a picture of the hall scoreboard belongs
here, expected at `screenshots/scoreboard.png`)*

## How it works

One computer, two browser tabs. The **control panel** is what the operator
sits at — it has the buttons and hotkeys for hajime, scores, shido and
osaekomi. The **scoreboard** is a plain read-only display, meant for a second
monitor, TV or projector facing the hall. The panel is the only tab that ever
changes anything; the scoreboard just mirrors it, staying in sync over a
`BroadcastChannel` between the two tabs — or, on a browser too old to have
one, over `localStorage` events instead. Separately from either, the panel
saves the contest to `localStorage` after every change, which is what lets a
reloaded or crashed tab pick it up again.

If the panel is closed or reloaded mid-contest, it notices a saved contest on
the way back up and asks whether to resume it or start fresh, rather than
guessing — so an accidental refresh in front of the hall doesn't cost you the
match. Resuming picks the clock up where it stood at the last thing that
happened in the contest, and it stays stopped until you call hajime again, so
the crash and the time you spend deciding aren't deducted from the contest.
The seconds between the last score or hajime and the crash can't be
reconstructed, so they're given back to the athletes rather than taken off the
clock; the referee is holding the real one either way.

## Run it at your club

1. Open the site's URL (see your repository's GitHub Pages address, or
   whoever set this up for your club) once, while connected to the internet.
   That first visit downloads and caches everything the app needs. After
   that, it keeps working with no network at all — turn on airplane mode and
   it doesn't care.
2. Pick **Control panel** on the first screen you see. Fill in the two
   athletes' names, category and contest duration, and start. The same form
   also sets the board theme, the tournament round and each athlete's
   country.
3. From the same device, open the site again in a second tab and pick
   **Scoreboard** this time. Drag that tab's window to the display facing the
   hall — a second monitor, a TV, a projector — and click it once to go
   fullscreen (a browser will only enter fullscreen after a click, so this
   step can't be automated).
4. Run the contest from the control panel, using its buttons or the hotkeys
   below. The scoreboard updates itself; you never touch it again once it's
   in place.

Both tabs have to be opened from the same web address (`http://` or
`https://`, not a file opened from disk — see below) so they can talk to each
other.

## The rules it implements

This follows the IJF rules for the 2026–28 cycle, including yuko's return to
contest scoring:

- **Ippon** ends the contest outright.
- **Waza-ari** — two in one contest combine into *waza-ari-awasete-ippon* and
  end the contest.
- **Yuko** is counted individually and never combines into a waza-ari, no
  matter how many are scored. Ten yuko still lose to one waza-ari.
- **Osaekomi** (a hold) is scored by duration: 5–9 s is a yuko, 10–19 s a
  waza-ari, 20 s an ippon. A hold earns exactly one score — the highest level
  it reaches — not each threshold along the way.
- **Shido** (penalty): a third shido is hansoku-make and the opponent wins.
  Direct hansoku-make (for a serious foul, without three shido) is not
  implemented — see *Not included* below.
- If regulation time runs out level, the contest goes to **golden score**:
  sudden death, no time limit, and *any* score — even a single yuko — ends it
  immediately in favour of whoever scored it. A hold in golden score therefore
  never gets past 5 seconds.

Sources: [IJF — New Rules: What to Remember](https://www.ijf.org/news/show/new-rules-what-to-remember),
[JudgeMate — Judo Scoring Explained](https://www.judgemate.com/en/guides/how-judo-is-scored),
[British Judo — 2026 Contest Rules](https://www.britishjudo.org.uk/2026-contest-rules-to-be-implemented-from-21-february/).

## Scoreboard themes

The board facing the hall comes in two designs, chosen on the setup form:

- **TV** — the default. A 16:9 layout: the two athletes' panels side by side
  in the judogi colours, one composite score each (yuko 1, waza-ari 10, ippon
  shown as the word), yellow shido cards, the clock and the osaekomi counter
  in the band below. The clock turns gold in golden score and red at mate.
- **IJF** — the mat-side board used at IJF World Tour events: a white band,
  a blue band and a black band, the same composite score, and the osaekomi
  shown as a counter beside the clock and a wash across the holding
  athlete's band.

A third design, **Modern**, with a cell each for ippon, waza-ari and yuko,
is still in the code but not offered on the form.

Both boards show each athlete's flag and three-letter code and the
tournament round, all set on the same form. Athletes who represent no nation
have codes of their own — `IJF` for those competing under the federation's
flag, `IRT` for the IJF Refugee Team, `AIN` for individual neutral athletes —
and those three are what the form offers first.

## Hotkeys

The control panel responds to these keys whenever no text field has focus
(the moment you click into the setup form, for example, they stop). Numbers
follow the **colour** of the athlete, not which side of the screen they're on
— so if you've swapped sides, the keys don't move.

| Key | Action |
|---|---|
| `Space` | Hajime / Mate (toggles the clock) |
| `1` | White — yuko |
| `2` | White — waza-ari |
| `3` | White — ippon |
| `4` | White — shido |
| `5` | White — start/stop osaekomi |
| `6` | Blue — yuko |
| `7` | Blue — waza-ari |
| `8` | Blue — ippon |
| `9` | Blue — shido |
| `0` | Blue — start/stop osaekomi |

Every score and shido also has a plus/minus button on the panel for
correcting a referee's call.

## Development

```
npm install
npm run dev
npm test
```

`npm run dev` starts a local dev server (Vite will print the address, usually
`http://localhost:5173`) — open it in two tabs as described above, choosing
one as the panel and one as the scoreboard. `npm test` runs the unit test
suite (Vitest) for the rules engine. `npm run typecheck` and `npm run build`
are also available; continuous integration runs all three on every pull
request and on every push to `main`.

## A note on `file://`

Don't try to run this by double-clicking `index.html` (or a built copy of it)
and opening it straight from disk. Pages loaded via `file://` get what
browsers call an *opaque origin*, and an opaque origin can't share
`localStorage` or a `BroadcastChannel` with another tab — which is the entire
mechanism the panel and scoreboard use to stay in sync. The two tabs simply
won't talk to each other. Serve the app over `http://` or `https://` — a dev
server (`npm run dev`), a static file server, or the GitHub Pages deployment
all work.

## The gong

The final-time and end-of-contest sound isn't a recording — it's synthesised
from scratch by `scripts/make-gong.mjs` (run `node scripts/make-gong.mjs` to
regenerate `src/assets/gong.wav`), so it's this project's own work, covered
by the same MIT licence as the rest of the code. No external audio file was
downloaded or licensed. If you'd rather use a real gong recording at your
club, it's a single file to swap out — just replace `src/assets/gong.wav`
with your own `.wav`.

## Deploying your own copy (GitHub Pages)

`vite.config.ts` sets `base: '/judo-panel/'` — this has to match the name of
your GitHub repository exactly, because GitHub Pages serves a project site
from `https://<user>.github.io/<repo-name>/`. If you fork or rename this
repository to something other than `judo-panel`, change that `base` value (or
set a `VITE_BASE` environment variable, which the config already reads) to
`/<your-repo-name>/` before deploying.

Get this wrong and the symptom is confusing: the site works perfectly on
`localhost` and then shows a blank page on Pages, with every asset 404ing in
the browser console. That mismatch is the first thing to check if that
happens to you.

The included `.github/workflows/ci.yml` builds and deploys to Pages
automatically on every push to `main`, once Pages is switched on for the
repository (Settings → Pages → Source → GitHub Actions).

## Not included

This covers one mat, one contest at a time. Deliberately left out of this
version, none of it requiring changes to the scoring engine to add later:

- undo beyond the plus/minus correction buttons (no full history/redo);
- a queue of upcoming contests;
- support for more than one mat at once;
- direct hansoku-make (disqualification for a serious foul without three
  shido) — only the third-shido route to hansoku-make is implemented;
- automatically placing the scoreboard window on a second monitor (this would
  use the browser's Window Management API) — you drag the tab yourself;
- exporting results.
