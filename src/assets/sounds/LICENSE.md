# Bundled audio — provenance and licence

Every audio file in this directory is recorded material with a licence that
permits redistribution inside a shipped product. Nothing here may be added
without recording its provenance below and confirming the licence allows
bundling and commercial use.

---

## `ambience-observatory.mp3`

| | |
|---|---|
| **Title** | Guitar C Note Transformed into an Ambient Texture |
| **Author** | bassimat |
| **Source** | https://freesound.org/s/866229/ |
| **Licence** | **Creative Commons 0 1.0 Universal (CC0) — public domain dedication** |
| **Licence text** | https://creativecommons.org/publicdomain/zero/1.0/ |
| **Retrieved** | 2026-08-13 |

**What CC0 permits.** The author has waived all copyright and related rights
worldwide. The work may be copied, modified, distributed and used commercially,
without permission and **without attribution**. Bundling it in this repository
and shipping it to browsers is therefore unambiguously allowed. The attribution
above is recorded because knowing where an asset came from is good engineering,
not because the licence demands it.

**What we ship.** Not the original file. The source is 1:25 of 24-bit/48 kHz
stereo WAV; what is bundled is a 20-second seamless loop derived from it:

1. the 24 s–48 s region taken (the most level section, no transients);
2. the last 4 s crossfaded over the first 4 s, so the loop point is continuous
   in the material rather than merely quiet at the seam;
3. high-passed at 45 Hz and low-passed at 11 kHz — the rumble is inaudible on
   the devices players actually use and the top end only costs bitrate;
4. loudness-normalised to −20 LUFS, so the bed's level is a property of the
   asset and the mixer's numbers mean the same thing on any machine;
5. encoded to 64 kbps joint-stereo MP3 at 44.1 kHz → **157 kB**.

MP3 rather than Opus or Vorbis because it decodes everywhere including Safari,
and this is the one asset that must never silently fail to load.

The exact command is recorded in `docs/architecture/AudioSystem.md` §2 so the
asset can be rebuilt from source rather than treated as a binary nobody can
regenerate.

---

## `soundcn-switch-001.mp3` · `soundcn-drop-003.mp3` · `soundcn-fish-reel-in.mp3`

| | |
|---|---|
| **Titles** | Switch 001 · Drop 003 · Fish Reel In |
| **Author** | Kenney — https://kenney.nl |
| **Source** | the Soundcn registry: `@soundcn/switch-001`, `@soundcn/drop-003`, `@soundcn/fish-reel-in` |
| **Licence** | **Creative Commons 0 1.0 Universal (CC0) — public domain dedication** |
| **Licence text** | https://creativecommons.org/publicdomain/zero/1.0/ |
| **Retrieved** | 2026-08-13 |

**What CC0 permits.** As above: copy, modify, distribute and use commercially,
with no permission required and no attribution obligation. The credit is
recorded because knowing where an asset came from is good engineering.

**What we ship, and how it was obtained.** Soundcn distributes each sound inside
a shadcn registry item as a **base64 data URI**, alongside its own
`lib/sound-engine.ts` (a second `AudioContext`, playing straight to
`ctx.destination`) and a `useSound` hook. Installing those files would have put a
second audio graph in the product — outside the mixer, the room, the limiter and
the mute switch. So only the asset was taken:

```sh
npx shadcn view @soundcn/switch-001    # and drop-003, fish-reel-in
# the `dataUri` field of registry/soundcn/sounds/<name>/<name>.ts,
# base64-decoded to src/assets/sounds/soundcn-<name>.mp3
```

The bytes are the registry's bytes, unmodified — 5.5 kB, 2.1 kB and 15.1 kB of
MP3. Files rather than inlined base64 so they stay out of the JS bundle, and
trimming/rate-shifting happens at playback in `lib/audio/cues.ts` rather than in
the assets, so what is on disk is exactly what was downloaded.

Each one plays as a `sample` layer of an ordinary cue (`enter`, `stake`, `reel`),
through the same sfx bus, room send and limiter as every synthesised material.
See `docs/architecture/AudioSystem.md` §8.
