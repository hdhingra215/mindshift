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
