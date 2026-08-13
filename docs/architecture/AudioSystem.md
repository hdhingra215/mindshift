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

Nine sounds for the whole product — not nine events, nine **materials** the moment table assigns to acts. Choosing a supplier on the landing page and choosing an answer in a session strike the same wood, because they are the same act.

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

**One action produces one layered event, never several sounds.** Layers are scheduled against a single audio-clock time, so a two-stage seat is one mechanism rather than two sounds that happened to be near each other. Each strike also starts at a random offset into the noise buffer — real materials are never struck in exactly the same place twice, and identical excitation is what makes repeated interface sounds feel mechanical.

**The phrase ladder.** Several surfaces arrive in the same frame after a decision. `PHRASE` (`lead → second → third → fourth → tail`) offsets them into a settling sequence in reading order: outcome → wager → Twin → mastery → XP.

## 6. Haptics

### What the platform actually supports

⚠ **Read this before promising haptics to anyone.**

| Platform | `navigator.vibrate` |
|---|---|
| Chrome / Samsung Internet / WebView on **Android** | ✅ Works |
| Chrome / Edge on **desktop** | API present, no motor — a no-op |
| **Safari, macOS and iOS — every version** | ❌ **Not implemented** |
| **Firefox 129+** | ❌ Support removed |

There is **no web API for the iPhone Taptic Engine or a Mac trackpad's haptics.** Force Touch is not exposed to the web, and the one iOS Safari haptic that does exist — the native switch control — cannot be triggered programmatically. Reaching that hardware requires a native wrapper, which is a product decision far outside this system.

So: the haptics below are real and deliberate, and on an iPhone or a Mac they do nothing at all. The engine no-ops cleanly, the Settings copy says so, and **nothing in the product depends on a pulse being felt.**

### The vocabulary

`navigator.vibrate` exposes **duration only** — no amplitude, no sharpness, no waveform. Everything a pattern can say it says with pulse lengths and the gaps between them, and perceived strength is dwell time.

That is why the 8.9 set felt weak: authored around a 60 ms ceiling with pulses as short as 4 ms, it was restrained on paper and imperceptible in the hand. Phase 8.10 roughly **doubled the scale** (2–3× motor time per pattern) and, more importantly, gave every pattern a distinct **shape** — two pulses of the same length are the same sensation however you space them.

| Pattern | Shape | Used for |
|---|---|---|
| `brush` 9 ms | single, lightest | option hover, torch sweep |
| `hairline` 16 ms | single, definite | XP, rail notches |
| `select` 26 ms | single, clean tap | choosing an option or a stake |
| `commit` 78 ms | two-stage, weight in the second | answer and wager commitment |
| `affirm` 58 ms | **rising** | correct, wager win, Twin hit |
| `discover` 58 ms | **falling** | miss, wager loss, Twin miss |
| `mark` 52 ms | symmetrical | mastery |
| `milestone` 90 ms | crescendo, three pulses | achievements |
| `reveal` 36 ms | soft rise | Twin speaking, reveals, room changes |

`affirm` and `discover` cost the motor **exactly the same** and are mirror images of each other — instantly distinguishable with the screen off, and neither is the harsher. A miss is a discovery (§12.20) in this channel too.

### Intensity

`hapticIntensity` (0–1, default **1.0**) scales pulse durations while **holding the gaps**, so a pattern keeps its rhythm and only changes weight — scaling the gaps too would turn "lighter" into "slower", which is a different sensation. Pulses are floored at 8 ms, below which a pulse is not gentler but missing. Zero is off.

The patterns are authored at the strength they are meant to be felt, so the slider **attenuates rather than boosts**: there is no hidden headroom a player has to go and find.

### Restraint

Three gates in the engine — hardware support, preferences (mute outranks the switch, and zero intensity outranks both), reduced motion — then a 90 ms global floor and a per-moment throttle where a player can produce something continuously (`choice.hover` 320 ms, `rail.notch` 260 ms, `torch.sweep` 1600 ms).

### Scroll-linked haptics

The loop rail on the landing page is the one place a reader is *moving* something rather than reading it, so it is the one place that earns scroll haptics.

Nothing is bound to scrolling. `createScrubber(stops)` divides progress into bands and fires only when the value **crosses a boundary** — a handful of times across a section, in both directions, so the rail feels like a detent rather than a one-way animation. Driven by subscribing to the `MotionValue` directly: the rail already animates without a React render per frame, and feeling it must not be the thing that adds one.

**It is silent.** A page that ticks while you scroll is unbearable; a rail you can feel moving under your thumb is the point.

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
10. **Never claim a haptic where the platform has none.** iOS and macOS cannot vibrate from the web; copy, docs and expectations must say so rather than implying the feature is merely subtle.
11. **Never fake autoplay.** If the room cannot start, say so in the interface — do not reach for a silent buffer or a muted video.
