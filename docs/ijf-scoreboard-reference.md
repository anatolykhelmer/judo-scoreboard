# IJF scoreboard — design reference

What the official scoreboards at IJF World Tour events actually look like,
verified frame-by-frame against tournament footage rather than memory.
Gathered September 2026 for the judo-panel project.

**Footage used:**

- Final Block -57 kg, Dushanbe Grand Slam 2026 (Judo Cloud upload of the
  official JudoTV feed) — mat-side venue board seen in golden score.
- -100 kg, World Championships Hungary 2025 (fan recording, 타이밍선수촌
  channel, JudoTV production visible) — mat-side venue board seen clearly in
  normal time from two angles, plus every state of the broadcast overlay.
- HATTORI (JPN) vs NERY GAGO (POR), Round of 32, Men -66 kg — head-on
  closeup still of the mat-side board, supplied for this project. The
  sharpest view of the board's typography and of a single shido card found
  so far; the measurements in "Proportions" below come from it, and it
  corrects two claims an earlier revision of this document got wrong.
- ABDULAEV (RUS) vs WAIZENEGGER (SUI), Round of 16, Men -66 kg — head-on
  closeup still, supplied for this project; the cleanest frame for the size
  of the score digit. Also shows a white rounded pill with a "0" at the
  bottom right of the black band, beside the clock — not yet identified
  (see Open questions).
- BOUBA (FRA) vs MAHMADKHOJAZODA (TJK), Round of 32, Men -66 kg — head-on
  closeup still, supplied for this project. The cleanest view of the clock's
  digits, of a two-digit score ("11", waza-ari plus yuko, set in tabular
  figures so the ones stand well apart) and of the two-card shido stack
  beside it. No osaekomi pill on this board.
- CHN vs UKR, Round of 32, -66 kg — closeup still, supplied for this
  project, of a board carrying **two** shido per athlete. Shot off-axis, so
  read it for spacing rather than for angles: the cards lean, but so do the
  NOC codes and the score digits beside them.

There are two distinct designs to keep apart: the **venue scoreboard** (the
screen at the mat, what this project replicates) and the **JudoTV broadcast
overlay** (the lower-third on stream). They share data but not layout.

## Venue (mat-side) scoreboard

Three horizontal bands on a black background:

1. **White band** — big national flag, NOC code in huge dark letters
   ("SRB"), composite score digit toward the right, then yellow shido cards.
2. **Blue band** — the same mirrored for the blue judogi athlete
   (IJF blue background, white/light content).
3. **Bottom black band** — round and weight class stacked at the left
   ("ROUND OF 32" / "-100 kg"), the main match timer **centred** on the
   band (its digits sit at 55–59% of the board's width on the JPN-POR,
   RUS-SUI and FRA-TJK closeups), and, on some boards, the osaekomi pill
   at the right.

Details confirmed from the footage:

- **Names sit inside the athlete's own coloured band**, in that band's
  colours — dark on white, white on blue — each hugging the band's outer
  edge: the white athlete's name is a small line along the *top* of the
  white band, the blue athlete's along the *bottom* of the blue band.
  Format "KUKOLJ Aleksandar" — surname in caps, given name in title case.
  (An earlier revision of this document had them outside the bands on the
  black background; re-checked against the Worlds 2025 closeup below, they
  are inside.)
- **Timer**: **Compacta Black**, stretched wide. Flat-sided, squared
  digits, a stroke far heavier than the codes' and the counters inside the
  zero and the eight squeezed almost shut — Compacta, not a grotesque and
  not Impact. Compacta is a narrow face and the digits on every closeup
  stand about square (the zero on FRA-TJK is 100 × 102 px), so the
  scoreboard application is stretching it to roughly twice its natural
  width. Compacta is a commercial Letraset/Monotype face and cannot ship
  with the project; it is set in Bebas Neue, the nearest open face of the
  same cut, with size and stretch measured to the same digit height and
  zero proportion. Not the LED seven-segment type, and not a rounded face
  — earlier revisions of this document read the blur of the wide-shot
  footage as round corners, then as Arial Black, then as Impact. Minutes
  carry no leading zero ("0:20"). **Green** in normal time, counting down from 4:00. In
  **golden score** the digits turn **red**, count up, and a "GOLDEN SCORE"
  label appears under them (Dushanbe board).
  Between contests the board resets and shows green 4:00.
- **Shido**: flat yellow cards, near enough square — a touch taller than
  wide, and about as tall as the score digit beside them — with **square
  corners, a thin black stroke around the edge, and no shadow**, in a hard
  lemon yellow rather than an amber one. The block sits **flush against the
  band's outer right edge, immediately after the score digit**. (An earlier
  revision of this document said "softly rounded corners"; the JPN-POR
  closeup shows hard edges.)
  Two shido are drawn as a **stack, not a row**: the first card stands
  upright in front, the second lies behind it, turned anticlockwise by
  roughly 15° and tucked under the first's left edge by close to half its
  width, so the pair comes to about one and a half cards wide. The black stroke is what
  separates the two where they overlap. Read the CHN-UKR closeup for this
  with its camera angle discounted — the digits and NOC codes lean by the
  same amount as the cards, so the lean is the shot, not the board — and
  discard three earlier readings of it: cards standing square with a gap, a
  symmetric fan, and an italic skew on every card.
- Category text and round live in the bottom band, not in a top strip.
  **Both are white** and set at nearly the same size, stacked tight at the
  left: "ROUND OF 32" over "Men -66 kg" — not a spaced-out grey label above
  a larger white one, and the round carries no extra letter-spacing.
- **Panel shape**: the board is a wide, short panel of roughly **2.46:1** —
  not a television's 16:9. This matters for anything reproducing it on a
  hall screen: stretching the layout to fill a 16:9 display leaves every
  band about a third taller than the original relative to its type. This
  project therefore renders the board at a fixed 2.46:1 and letterboxes it
  against black, which costs nothing visible — the bars match the board's
  own bottom band.
- **Proportions**, measured off the JPN-POR closeup: the two athlete bands
  take roughly 35% of the board's height each and the black band the
  remaining 30%. The name runs at just under half the NOC code's size; the
  score digit is the tallest thing in the band — about 85% of the row under
  the name and a third taller than the code's capitals on the head-on
  RUS-SUI closeup; about 77% on FRA-TJK, which also shows air between the
  digit and the white/blue divider — the white band's digit stops some
  1.3% of the board's width short of it and the blue band's starts about
  2.1% below it (the project sets the digit at about 86% of the row and
  keeps the same two gaps, measured on the live board at 1.3% and 2.1%). The flag's left
  edge lines up with the name's on every closeup.
  The score is set **flush left in its column**: on FRA-TJK the "0" of one
  band and the "11" of the other start on the same vertical and end where
  they end. The cards are **flush against the band's right edge** on every
  closeup, and the digit stands close beside them — about 1% of the
  board's width from the two-card stack on CHN-UKR, 3.7% on FRA-TJK — so
  the slot the cards occupy is only a little wider than that stack (the
  project: 13.5% of the board, cards packed right, the digit hard against
  the slot). Vertically
  the score digit sits inside its row on both bands, and the code lines up
  with the digit's **outer** edge, the one the name does not occupy: on the
  white band the two share a bottom line, on the blue band a top line
  (FRA-TJK: "0" and "FRA" on one baseline; "TJK" level with the top of
  "1 1"). It is the smaller code that moves to meet the digit, not the
  digit that leaves its row. **The shido slot is reserved whether or not a card is
  shown**: on RUS-SUI, with no shido, the digit still stops a fifth of the
  board's width short of the right edge; on FRA-TJK, with two, the digit
  stands a few percent from the stack. The two boards disagree on the
  slot's exact width (roughly 20% against 14%); this project splits it at
  16%. The code starts about a fifth of the board's width in — there is a wide gap
  between the flag and the code, far wider than the padding at the edges.
- **No logo anywhere on the board** — the bottom band holds only the round
  and category at the left and the timer at the right. There is no IJF
  roundel and no venue mark.
- **Type**, read off the FRA-TJK closeup: the NOC code and the score digit
  are **Arial Black** (or Helvetica Black / Neue Heavy) — note the slanted
  flag on the one and the flat, straight cuts on the letters; the project
  sets them in Roboto Black. The names are **Arial**, surname in **Bold**
  and given name in **Regular** ("BOUBA Daikii"); the project sets them in
  Roboto Bold and Regular and splits the line at the first word that is
  not all capitals. The bottom band's round and category are **Arial Bold
  Condensed**, squeezed on purpose to fit stage and category into the
  field; the project sets them in Roboto Condensed Bold. The clock is Compacta
  Black, stretched (see Timer above). The score is *not* a serif face.
  (Earlier revisions had one face for everything, then Arial Bold for the
  codes and a narrow face for the names — both wrong.)

Additional venue-board states seen in footage:

- **Non-zero score**: KIM 1 : KUKOLJ 0 seen in full at Worlds 2025
  ([reference frame](https://www.youtube.com/watch?v=aFj8YsPM8ck&t=285s) —
  the cleanest full closeup of the board found). The score is one digit
  slot per band; the shido card sits in its own slot to the right of it.
- **Ippon**: displayed as the word "IPPON" in the score area of the
  winner's band (seen on the mat-side board right after KIM's
  quarter-final ippon), matching the SOR wording "100 points marked as
  ippon on the scoreboard".
- **Osaekomi**: two different placements seen on two different boards.
  At Abu Dhabi GS 2025 (-57 kg final, golden score) a counter appeared in
  the rightmost slot of the *holding* athlete's band, counting seconds
  upward from 1 ("1" at GS 2:14 → "2" at GS 2:15 next to HUH's row while
  she held CARNA). On the RUS-SUI board a **white rounded pill** with a
  black digit sits at the right end of the black band beside the clock,
  reading "0" between holds — about a seventh of the board wide and three
  quarters of the band tall. The FRA-TJK board shows no pill at all. This
  project takes the black-band placement — it does not depend on which
  athlete holds, and it leaves the athletes' bands to the score and the
  cards — but draws it as a **circle shown only while a hold runs**, by
  decision rather than from footage; its place is kept while hidden so the
  clock does not move. The main clock keeps running normally during the
  hold.
- **Golden score on the venue board**: clock counts up with a yellow
  "GOLDEN SCORE" label under the timer. Timer color in GS varied between
  events in the footage: green in Abu Dhabi 2025, red LED digits on the
  Dushanbe 2026 board — treat the GS color as venue-configurable rather
  than fixed.

Not yet verified on the venue board: the winner presentation after
sore-made (cameras always cut away).

## Scoring semantics (2025+ rules)

The score is **one composite number per athlete**, classic judo points:

| Result | Displayed value |
|---|---|
| Yuko | +1 |
| Waza-ari | +10 |
| Ippon | 100 / match over |

So "2" = two yukos, "11" = waza-ari + yuko. Verified live: the -57 kg
Dushanbe final ran to full time at 0:2 — two yukos do not stop a match.
Rules basis (in force since 22 Feb 2025): yuko is back, accumulates, never
converts upward; two waza-ari still make ippon (waza-ari-awasete-ippon);
any number of yukos loses to a single waza-ari. Sources:
[IJF — New Rules: What to Remember](https://www.ijf.org/news/show/new-rules-what-to-remember),
[British Judo — 2025 contest rules](https://www.britishjudo.org.uk/2025-contest-rules-to-be-implemented-from-22nd-february/),
[Olympics.com — LA 2028 cycle rule updates](https://www.olympics.com/en/news/ijf-announces-judo-rule-updates-la2028-cycle).

## Official IJF specification (SOR)

The IJF does publish scoreboard requirements — not a pixel design, but a
mandatory content and equipment list, in the **Sport and Organisation
Rules (SOR)**, January 2026 edition. Saved locally as
[ijf-sor-2026.pdf](ijf-sor-2026.pdf) (full 270-page document) and
[ijf-sor-2026-scoreboard-excerpt.pdf](ijf-sor-2026-scoreboard-excerpt.pdf)
(just the 14 scoreboard/scoring/osaekomi pages: 89, 97, 130-132, 155,
158-159, 164-167, 186, 199). Originals:
[PDF](https://78884ca60822a34fb0e6-082b8fd5551e97bc65e327988b444396.ssl.cf3.rackcdn.com/up/2026/01/IJF_Sport_and_Organisation_Rul-1769443746.pdf),
[ijf.org/ijf/documents](https://www.ijf.org/ijf/documents/5),
[sor.ijf.org](https://sor.ijf.org/) — check there for newer editions.

**Appendix F1.2 "Athlete Scoreboards" (p. 199)** — the scoreboards must be
visible to athletes, coaches, referee and IJF referee supervisors; they
"can be stand-alone TV screens or integrated in the LED", and must show:

- the name of the athletes;
- which athlete wears the white judogi and which the blue;
- the three-letter country code;
- the country flag;
- weight category;
- the time;
- scores and penalties;
- event phase (Rof64, Rof32, Rof16, QF, SF, F etc.) **including golden
  score**.

The verified venue design above is exactly this list, laid out — nothing
extra is mandated, so fonts/colors are the IJF software's convention, not
regulation.

**Section 8.7 "Field of Play" (p. 89)** adds the equipment rules:

- **two scoreboards per competition area**, indicating the scores
  **horizontally**, placed outside the competition area, easily seen by
  athletes, referees, officials and spectators (this is why footage shows
  two mirrored mat-side boards per tatami);
- **manual scoreboards, manual timers, a bell (or similar) and yellow and
  green flags must be available as backup**;
- with several mats running, each needs a distinct audible signal, loud
  enough over the crowd;
- the timing/scoring system integrates with the mandatory Video Replay
  (CARE) system, whose output feeds the venue's main video displays.

**Other SOR scoreboard mentions worth building for:**

- Scoring values are named directly in the refereeing articles:
  "Ippon (100 points **marked as ippon on the scoreboard**)", "Waza-ari
  (10 points on the scoreboard)", "Yuko (1 point on the scoreboard)"
  (pp. 130–132) — the composite number is official, and ippon is shown
  as a word, not as 100.
- "Shido do not give a score to the other athlete, only technical scores
  can give points on the scoreboard" (Art. 18.1).
- Golden score: existing scores and shido "are carried into the golden
  score period and **will remain on the score board**" (Art. 13).
- The 30-second no-show countdown before fusen-gachi "will start to
  count down" **on the scoreboard** (Art. 19, p. 186) — a state the
  panel needs.
- In team events byes/withdrawals are displayed on the scoreboard with
  the withdrawn team struck through (Section 2.7).

## Osaekomi — rules and display

Rule thresholds (SOR Art. 14/15/17, 2025+ cycle):

| Hold duration | Score |
|---|---|
| 5–9 s | Yuko |
| 10–19 s | Waza-ari |
| 20 s | Ippon |

- If osaekomi starts in regular time and the clock reaches 0:00, **the
  contest is extended** until ippon, toketa or mate — verified live in
  footage (main clock frozen at 00:00, hold continuing).
- **In golden score**: after 5 seconds of osaekomi tori is awarded yuko
  and the contest ends ("Yuko! Sore-made!"). Exception: in round-robin
  golden score the hold may continue to ippon.
- Uke can counterattack during the hold; the osaekomi time runs until
  ippon or sore-made.

Display, as verified in footage:

- **Venue board**: a dedicated osaekomi seconds counter appears in the
  rightmost slot of the holding athlete's band and counts up 1, 2, 3…
  The main match clock keeps running (or sits at 00:00 in the extension
  case). No progress bar was observed — just the digit.
- **JudoTV broadcast overlay**: shows **no osaekomi element at all** —
  verified across two separate active holds (Worlds 2025 R32, Abu Dhabi
  GS 2025 final); the lower-third keeps showing only clock + scores.

## JudoTV broadcast overlay (lower-third)

Compact block in the bottom-left corner:

- **Top strip** (dark charcoal): weight class in its own box ("-57 KG"),
  then a center caption that cycles between the round ("GOLD MEDAL
  CONTEST") and the event name ("DUSHANBE GRAND SLAM 2026"), then the
  match clock at the right — **white** digits here, not green.
  In golden score a yellow "GOLDEN SCORE" label sits above the clock and
  the clock counts up.
- **Two athlete rows**: white row (light background, black text) over blue
  row (blue background, white text). Each row: small flag, NOC code,
  SURNAME. At the right edge: shido as small yellow **dots** (not cards),
  then the composite score digit.
- **Medal contests** get a medal icon (gold/bronze) at the far left,
  spanning both rows.
- **Terminal states replace the score digit with text**: a yellow
  "IPPON", or "HSK" plus a red dot for hansoku-make. The clock freezes at
  the final value.
- **Pre-contest intro bar** (center-screen): flag | "S. KIM" on white |
  center badge "04:00" over "-100 KG QUARTER-FINAL" | "D. KOSTOEV" on
  blue | flag.
- **Winner banner**: white panel with the winner's full name, flag + NOC,
  and a gold "WINNER" ribbon.

## Observed score-revision behavior (CARE reviews)

Worth reproducing in the panel: scores get revised retroactively after
video review, and the display simply re-renders the recomputed composite
number. Observed live (Worlds 2025, -57 kg R32, HUH vs NASCIMENTO):
overlay went 1 → 2 (two yukos) → 11 (one yuko upgraded to waza-ari)
→ 10 (the other yuko cancelled). So the operator UI needs edit/undo of
individual scores, and the display just shows the recalculated total.

## Reference footage

- [Worlds 2025 Hungary, -100 kg (KIM Seheon)](https://www.youtube.com/watch?v=aFj8YsPM8ck)
  — full venue board at t≈4:45 ("0:21" green, score 1, shido card);
  overlay states incl. "IPPON"; venue-board "IPPON" text at t≈9:15.
- [Worlds 2025 Hungary, -57 kg (HUH Mimi R32)](https://www.youtube.com/watch?v=LS37Gxl_WFI)
  — composite score arithmetic on the overlay (1 → 2 → 11 → 10),
  clock-at-zero extension during ne-waza.
- Abu Dhabi GS 2025, -57 kg final (Judo Royal channel compilation,
  t≈9:20) — venue-board osaekomi counter during the golden-score hold;
  green GS clock + "GOLDEN SCORE" label.
- Dushanbe GS 2026, -57 kg final block (Judo Cloud) — golden-score red
  LED clock variant, HSK overlay state, golden-score overlay behavior.

## Open questions

- [ ] Venue-board winner state after sore-made (never shown on camera).
- [ ] Whether the venue-board osaekomi counter changes style at the
      5 s / 10 s score thresholds.
- [ ] Exact styling of the GS clock across venues (green vs red seen at
      different events).
- [ ] Whether the RUS-SUI pill is the osaekomi counter (assumed here) or
      something else — a frame of that board during a hold would settle it.
