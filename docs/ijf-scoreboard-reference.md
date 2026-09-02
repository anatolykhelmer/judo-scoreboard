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
   ("ROUND OF 32" / "-100 kg"), the main match timer at the right.

Details confirmed from the footage:

- **Names sit outside the colored bands**, white text on black:
  the white athlete's name in a strip *above* the white band, the blue
  athlete's name *below* the blue band. Format "KUKOLJ Aleksandar" —
  surname in caps, given name in title case.
- **Timer**: LED-segment style digits. **Green** in normal time, counting
  down from 4:00. In **golden score** the digits turn **red**, count up,
  and a "GOLDEN SCORE" label appears under them (Dushanbe board).
  Between contests the board resets and shows green 4:00.
- **Shido**: small tilted yellow cards, placed to the right of the score
  digit inside the athlete's band.
- Category text and round live in the bottom band, not in a top strip.

Additional venue-board states seen in footage:

- **Non-zero score**: KIM 1 : KUKOLJ 0 seen in full at Worlds 2025
  ([reference frame](https://www.youtube.com/watch?v=aFj8YsPM8ck&t=285s) —
  the cleanest full closeup of the board found). The score is one digit
  slot per band; the shido card sits in its own slot to the right of it.
- **Ippon**: displayed as the word "IPPON" in the score area of the
  winner's band (seen on the mat-side board right after KIM's
  quarter-final ippon), matching the SOR wording "100 points marked as
  ippon on the scoreboard".
- **Osaekomi**: a dedicated counter in the rightmost slot of the
  *holding* athlete's band, counting seconds upward from 1 (verified at
  Abu Dhabi GS 2025, -57 kg final, golden score: "1" at GS 2:14 → "2" at
  GS 2:15 next to HUH's row while she held CARNA). The main clock keeps
  running normally during the hold.
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
