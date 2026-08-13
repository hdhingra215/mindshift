# Audio & Haptics

**Read this before writing any code that makes a sound or vibrates a device.** It is the counterpart to [MotionSystem.md](./MotionSystem.md) and holds the same kind of rule: one engine, one vocabulary, no parallel implementations.

Shipped in Phase 8.8, **redesigned in Phase 8.9**, **haptics rebuilt in Phase 8.10**. §2 records what was wrong each time, because the failure modes are not obvious and are easy to walk back into.

---

## 1. The three layers

```
@/lib/audio      materials — what things are made of
@/lib/haptics    patterns  — what things feel like
@/lib/feedback   moments   — which acts in MindShift are worth marking
```

> **A component imports `@/lib/feedback` and nothing below it.** It names an act — `signal('answer.commit')`, `useSignalOnMount('outcome.miss')`, `useSoundscape('archive', momentum)` — and never a sound, a vibration, a gain or a throttle.

That indirection is what made the 8.9 redesign possible: every sound in the product was replaced and **every call site stayed exactly as it was.**

`navigator.vibrate` and `new AudioContext` each appear in precisely one file, and a test fails the build if that changes.

## 2. What 8.8 got wrong

Three failures, all worth remembering.

**The environment was oscillators, and it sounded like a fan.** A sub, two detuned bodies, a fifth, filtered noise and an LFO. On paper: a slow evolving room tone. Through a speaker: a blower. The problem is not tuning — a steady bank of oscillators has no irregularity in it, and irregularity is the whole difference between a *place* and a *machine*. **The environment is now a recording** (§3) and nothing synthesises it.

**The discrete sounds were notes, so they read as an interface.** Sine and square voices arranged into intervals. A beep is a beep however tastefully tuned. The vocabulary is now **materials**: an excitation through a resonator, sometimes over a body that falls in pitch the way a struck object does. There is no sustained pitch anywhere in the catalogue, and a test enforces it.

**Everything was marked, so nothing meant anything.** Every `Button` made a sound by default; navigation whooshed. Marking traversal is what makes an interface chatter. Now **sound marks consequence only** — `Button` is silent unless what it does is an act, and navigation has no cue at all because each room already sounds different and the retune *is* the feedback.

A fourth, from the phase before: **the whole system once shipped inaudible** at −32 dBFS, because three conservative attenuations multiplied. Gain staging is not a safety mechanism; the buses run at unity and a limiter protects the output. Six assertions hold the levels.

## 3. The environment

A **CC0 field recording** — a guitar note stretched into an atmospheric texture — bundled at `src/assets/sounds/ambience-observatory.mp3`. Full provenance and licence in [`src/assets/sounds/LICENSE.md`](../../src/assets/sounds/LICENSE.md). CC0 permits bundling and commercial use with no attribution required; the attribution is recorded anyway because knowing where an asset came from is good engineering.

**157 kB**, a separate hashed asset — not in the JS bundle, fetched only when a room is first declared. The JS cost of the entire audio + haptics system is **+1.8 kB gzip** over 8.8.

Rebuild it from source with:

```sh
ffmpeg -i source.mp3 -filter_complex "\
[0:a]atrim=24:48,asetpts=N/SR/TB[seg];\
[seg]asplit=2[s1][s2];\
[s1]atrim=0:20,asetpts=N/SR/TB[a];\
[s2]atrim=20:24,asetpts=N/SR/TB[b];\
[b][a]acrossfade=d=4:c1=tri:c2=tri[x];\
[x]highpass=f=45,lowpass=f=11000,loudnorm=I=-20:TP=-3:LRA=11[out]" \
 -map "[out]" -ar 44100 -c:a libmp3lame -b:a 64k -joint_stereo 1 ambience-observatory.mp3
```

The last four seconds are crossfaded over the first four, so the loop point is continuous **in the material** rather than merely quiet at the seam. MP3 carries encoder padding, so `loopStart`/`loopEnd` trim 40 ms off each end — cheap inside a four-second crossfade, and it removes the once-per-revolution tick that a naive full-buffer loop produces.

### Rooms are filters, not tracks

One decoded buffer, **one** looping source for the life of the session. A room is a level, a lowpass, a highpass, a playback rate and a reverb send applied to that source. Moving between rooms retunes; it never crossfades two recordings and never allocates a second source — which is why duplicate ambience is structurally impossible however many surfaces declare a room. `bedCount()` is asserted to stay at 1.

| Room | Character |
|---|---|
| `observatory` | Open, present, unhurried. The reference tuning — the room as recorded. Also the landing page. |
| `play` | Close and focused. Darker and further off, so the decision is the event. |
| `archive` | Restrained and archival: thinner, drier, more distant. |
| `twin` | Sparse and strange. Thin, slowed to 0.92×, well back in the room. |
| `silent` | Auth, and any surface that declares nothing. |

**The declaration stack.** The most recently mounted declaration wins, so the Twin can take the room while it speaks and hand it straight back on unmount. ⚠ React runs child effects before parent effects, so a transient declaration already present at the parent's first render would lose. Safe today for a structural reason: the Twin's prediction is fetched after the scenario renders (§4.6).

### Starting — and the ceiling on what is possible

The context is constructed **when the app mounts** and `resume()` is attempted immediately, unprompted. Where the browser allows it, the room is simply there when the page opens. Where it does not, listeners resume on the first genuine interaction and then **remove themselves**, because after that the question is settled.

⚠ **Truly automatic first-visit playback is not achievable, in any browser, by design.** This is a platform limit, not an implementation gap:

| Browser | First visit | Repeat visits |
|---|---|---|
| **Chrome / Edge** | Blocked unless the origin's Media Engagement Index is already high | **Usually starts on open** — MEI accumulates as the player uses the site |
| **Safari** (macOS + iOS) | Blocked | Blocked, unless the site is installed to the Home Screen or the user allows autoplay for the site in Settings |
| **Firefox** | Blocked | Blocked, unless the user allows autoplay for the site |

Every technique that appears to beat this — a silent buffer, a muted `<video>`, a zero-length ping — is either detected and blocked or "works" only by lying about a gesture that did not happen. **None is used here.** What the code does instead: attempt at mount; ask `getAutoplayPolicy()` where it exists (Chromium only) so the interface can say *waiting for you* rather than looking broken; resume at the first real interaction.

The practical result: **a returning Chrome visitor usually gets the room on open; a first-time visitor in any browser gets it on their first click.** The mute control's label reflects which of the two is happening.

## 4. Momentum → the room

A longer run makes the world **richer and more resolved — never louder and never faster.** With a recording, the two things carrying resolution are *openness* and *space*: the texture's upper detail comes through, and it sits in more room.

| Moves | Never moves |
|---|---|
| `cutoff` ↑ · `space` ↑ | `level` · `rate` |

Asserted for every room, in both directions. A louder or busier world under a long streak is pressure dressed up as atmosphere (§12.22), and "make a streak feel bigger" is the plausible edit that would quietly turn this into an engagement mechanic.

## 5. The materials

Thirteen sounds for the whole product — not nine events, nine **materials** the moment table assigns to acts. Choosing a supplier on the landing page and choosing an answer in a session strike the same wood, because they are the same act.

| | |
|---|---|
| `graze` | Presence. A fingertip crossing felt. |
| `wood` | A choice takes. A small wooden object set down. |
| `seat` | A commitment. A mechanism seating in two stages. |
| `bloom` | Something resolves. Air opening into the room. |
| `shade` | The same event, darker. Layer-for-layer identical to `bloom`. |
| `ring` | A milestone. Glass struck once. The only material over a second. |
| `tick` | A mark on an instrument. A hairline. |
| `air` | Movement through the space. |
| `veil` | The torch. Air, reversed and much smaller. |
| `glint` | 8.11 · A blind spot lighting up. Two hairlines of glass, well into the room. The quietest thing in the product. |
| `enter` | 8.11 · Entering the product. A switch closing (recording) over the commitment body. |
| `stake` | 8.11 · Insight on the line. `seat` with a weight landing on it (recording). Heavier than committing an answer. |
| `reel` | 8.11 · The progression rail advancing. The first third of a reel winding in (recording), rate-shifted down. |

**Three of them carry a recording.** `enter`, `stake` and `reel` each include one `sample` layer — a short CC0 file from the Soundcn registry (`switch-001`, `drop-003`, `fish-reel-in`), provenance in `src/assets/sounds/LICENSE.md`. Soundcn also ships its own `AudioContext` and `useSound` hook; **those were not installed.** Only the asset was taken, and it plays as a layer of an ordinary cue through the same sfx bus, room send and limiter as everything synthesised — trimmed and rate-shifted at playback so one file can serve a gesture. Every cue with a recording also has synthesised layers, so a sample that has not finished decoding costs richness on the first use of a session and never silence or lateness.

**The first nine are unchanged and stay unchanged.** 8.11 added materials; it retuned nothing. A unit test pins the original nine's layer counts, peaks and throttles for exactly that reason.

**One action produces one layered event, never several sounds.** Layers are scheduled against a single audio-clock time, so a two-stage seat is one mechanism rather than two sounds that happened to be near each other. Each strike also starts at a random offset into the noise buffer — real materials are never struck in exactly the same place twice, and identical excitation is what makes repeated interface sounds feel mechanical.

**The phrase ladder.** Several surfaces arrive in the same frame after a decision. `PHRASE` (`lead → second → third → fourth → tail`) offsets them into a settling sequence in reading order: outcome → wager → Twin → mastery → XP.

## 6. Haptics

### What the platform actually supports

⚠ **Read this before promising haptics to anyone.**

| Platform | `navigator.vibrate` | Fallback backend |
|---|---|---|
| Chrome / Samsung Internet / WebView on **Android** | ✅ Works | — |
| Chrome / Edge on **desktop** | API present, no motor — a no-op | — (no motor exists) |
| **Safari on iOS/iPadOS 17.4+** | ❌ Not implemented | ⚠ `switch` control tap (below) |
| **Safari on macOS** | ❌ Not implemented | — (Force Touch is not exposed to the web) |
| **Firefox 129+** | ❌ Support removed | — |

There is still **no web API for the Taptic Engine.** But since Safari 17.4 a `<input type="checkbox" switch>` produces a genuine system haptic when it is toggled, and that toggle can be driven from script inside a user gesture. Since 8.11 the engine uses it as a **second backend**: one hidden control, clicked once for a light pattern and twice for a decisive one.

Its limits are real and are not worked around:

- **No shape and no duration.** One system tap is all the platform gives, so every pattern collapses to one or two taps there. The intensity slider still gates it (zero is off) but cannot scale it.
- **User gesture only.** A pulse that lands on mount — a reveal, a phrase beat — feels nothing on this backend. That is correct: the alternative is a phone tapping you while you read.
- **Preferred last.** Where `navigator.vibrate` exists, this code never runs.

So the haptics below are fully expressed on Android, reduced to a tap on a recent iPhone, and absent on desktop. The engine no-ops cleanly in every case and **nothing in the product depends on a pulse being felt.**

### The vocabulary

`navigator.vibrate` exposes **duration only** — no amplitude, no sharpness, no waveform. Everything a pattern can say it says with pulse lengths and the gaps between them, and perceived strength is dwell time.

8.9 authored the set under a 60 ms ceiling with pulses as short as 4 ms. 8.10 doubled it to a 90 ms ceiling and an 8 ms floor. **Both were still imperceptible**, because the numbers were chosen against a design intention rather than against a motor. An LRA has a real spin-up cost:

| Pulse | What actually reaches the hand |
|---|---|
| ≤ 10 ms | nothing. The pulse is a rumour. |
| ~15 ms | detectable if you are holding the phone still and expecting it. |
| ~25 ms | a definite, light tap. |
| ~45 ms | a confident tap — the right weight for taking a decision. |
| ~90 ms | weighted. Reads as a mechanism seating. |
| > 180 ms | no longer an event. A buzz. |

So 8.11 set the floor at **14 ms**, the ceiling on total motor time at **220 ms**, and the ceiling on any *single* pulse at **100 ms** — weight comes from a second, heavier stage after a gap, never from holding one pulse longer.

| Pattern | Shape | Used for |
|---|---|---|
| `brush` 18 ms | single, lightest | option hover, CTA hover, torch sweep, rail return |
| `glint` 36 ms | two light glints | a blind spot lighting up |
| `hairline` 26 ms | single, definite | XP, rail advance |
| `select` 45 ms | single, clean tap | choosing an option or a stake |
| `commit` 130 ms | two-stage, weight in the second | answer commitment, Start Training |
| `stake` 186 ms | three-stage, longest last | wager commitment |
| `affirm` 142 ms | **rising** | correct, wager win, Twin hit |
| `discover` 142 ms | **falling** | miss, wager loss, Twin miss |
| `mark` 128 ms | symmetrical | mastery |
| `milestone` 156 ms | crescendo | achievements |
| `reveal` 64 ms | soft rise | Twin speaking, reveals, room changes |

### Weight classes

Patterns are `light` or `decisive`. **Only light patterns queue behind the anti-buzz floor.** That distinction is the fix for the defect 8.11 was reported for: the floor is an anti-*repetition* device, and applying it to everything meant a hover pulse 40 ms before a click could swallow the commitment that followed — the interface felt dead at the exact moment it should have felt certain. Anything the player deliberately did now always reaches the motor.

`affirm` and `discover` cost the motor **exactly the same** and are mirror images of each other — instantly distinguishable with the screen off, and neither is the harsher. A miss is a discovery (§12.20) in this channel too.

### Intensity

`hapticIntensity` (0–1, default **1.0**) scales pulse durations while **holding the gaps**, so a pattern keeps its rhythm and only changes weight — scaling the gaps too would turn "lighter" into "slower", which is a different sensation. Pulses are floored at 14 ms, below which a pulse is not gentler but missing. Zero is off.

The patterns are authored at the strength they are meant to be felt, so the slider **attenuates rather than boosts**: there is no hidden headroom a player has to go and find.

### Restraint

Three gates in the engine — backend support, preferences (mute outranks the switch, and zero intensity outranks both), reduced motion — then a **70 ms floor on light patterns** and a per-moment throttle where a player can produce something continuously (`bias.spark` 220 ms, `choice.hover` 320 ms, `rail.advance`/`rail.return` 420 ms, `torch.sweep` 1600 ms).

Throttles are keyed by **moment**, not by pattern. Keying them by pattern meant the torch sweeping the hero (a `brush` every 1.6 s) also silenced the next option hover — a different event that happens to feel similar.

**Phrase offsets apply to touch as well as sound.** A reveal screen mounts the outcome, the wager result, mastery and XP in one frame; haptics used to ignore the `PHRASE` ladder, so the floor kept the first pulse and dropped the rest. Each is now scheduled at its own beat, and its gates are re-evaluated when it lands — muting mid-phrase stops the pulses still to come.

### Scroll-linked haptics

The loop rail on the landing page is the one place a reader is *moving* something rather than reading it, so it is the one place that earns scroll haptics.

Nothing is bound to scrolling. `createScrubber(stops)` divides progress into bands and fires only when the value **crosses a boundary** — a handful of times across a section, in both directions, so the rail feels like a detent rather than a one-way animation. Driven by subscribing to the `MotionValue` directly: the rail already animates without a React render per frame, and feeling it must not be the thing that adds one.

**Direction is the design.** Scrolling down *advances* the rail: `rail.advance` — a reel winding in, plus a mark to feel. Scrolling back up only re-arms it: `rail.return` — the lightest pattern, and **silent**, because re-reading a section is not progress. A page that ticks continuously while you scroll is unbearable, which is why the sound is attached to a threshold crossing (three per section), throttled at 420 ms at the moment and 520 ms at the material.

## 7. Accessibility

- **Nothing is required.** Every moment marks something already stated on screen. Remove all sound and all vibration and the product tells the whole story — the same contract §12.17 holds for motion.
- **Reduced motion** cuts the ambience entirely and suppresses every haptic. Discrete materials survive: brief, tied to an action just taken, never drifting.
- **No autoplay hacks.** See §3.
- **Mute is global and immediate**, in the top bar at every breakpoint, and silences haptics too.
- **Three audio channels, a vibration switch, a vibration-strength slider and a reset** on `/settings`, so "the interface is useful but the room is distracting" is a preference that can be expressed rather than resolved as silence.
- Preferences persist in one `localStorage` record, hydrated before first paint. Storage failure degrades to "works this session".

## 8. Rules for future work

1. **Never create an `AudioContext` or call `navigator.vibrate` outside their engines.** A test enforces it.
2. **Never add a second sound for one action.** Add a layer to the existing material.
3. **Never synthesise the environment.** It is a recording. If it needs to change, change the recording.
4. **No sustained pitch in the catalogue.** A tonal layer is a body, and a body always falls.
5. **Do not mark traversal.** Hover, navigation and ordinary buttons stay silent. If a new moment is not a consequence, it does not belong in the table.
6. **Momentum may never change a level or a rate.**
7. **A miss, a shortfall and a Twin's error stay the same size as their counterparts** — in both channels. Asserted; do not weaken it to ship a punchier failure.
8. **Gain staging is not a safety mechanism.** To make things quieter, lower a preference default — never a ceiling.
9. **No new audio dependency.** Adding a library or a second asset format is a stack change (CLAUDE.md §3).
10. **The recorded materials are assets, not an engine.** If another Soundcn (or any other) sound is wanted, take the file and add it as a `sample` layer. Never install a registry item's audio engine, hook or context.
11. **Never claim a haptic where the platform has none.** iOS and macOS cannot vibrate from the web; copy, docs and expectations must say so rather than implying the feature is merely subtle.
12. **Never fake autoplay.** If the room cannot start, say so in the interface — do not reach for a silent buffer or a muted video.
