# Eternal Circles — remastered

*Four voices, eight melodies, a pedal, and Arvo Pärt's tintinnabuli.*

A remaster of [Eternal Circles](https://github.com/juancopi81/eternal-circles) (2020), an instrument in
which melodies from [MusicVAE](https://magenta.tensorflow.org/music-vae)'s latent space turn forever on
four discs. The original idea is kept intact: drag a melody onto a disc and it loops, click its
centre to hear it backwards, layer four of them over a low pedal. Everything around that idea is new.

**Your cursor is a lantern.** The piece sits on a dark stone floor. Everything that floats above it
casts a soft shadow away from the light, dust drifts through the beam, and every bell sends a ripple
of light across the floor. The voices you light also sound closer: farther discs grow a little softer
and duller. Leave the mouse alone for a few seconds and the interface steps back while the lantern
wanders on its own, along the kind of Lissajous orbit the notes followed in 2020.

**Each disc is a circular score.** The angle is time (two bars, starting at twelve o'clock) and the
distance from the centre is pitch. The magenta arcs are the melody.

**Tintinnabuli.** Every note of the melody (Pärt's *M-voice*) is answered by a bell (the *T-voice*) on
a note of the tonic triad: the nearest triad note above it, below it, or alternating. The golden
circles on each disc are the triad's notes, so you can watch each bell land on one. Choose first or
second position in the settings.

## Play

| gesture | what happens |
| --- | --- |
| drag a melody onto a disc | it loops there |
| click a melody | listen to it once |
| click the dark centre of a disc | retrograde: the disc turns over like a coin and the melody runs backwards, rests included |
| double-click (or double-tap) a disc | let it go quiet |
| scroll over a disc | its volume |
| click the words under a disc | cycle its instrument, or how its bells answer |
| <kbd>space</kbd> · <kbd>←</kbd> <kbd>→</kbd> · <kbd>S</kbd> · <kbd>H</kbd> | play/pause · tempo · settings · help |

The settings drawer holds the three melody sets, per-voice instrument, bells and volume, the
pedal, the room, and **Dream**: as in 2020, MusicRNN improvises two seed melodies from single notes
over the set's chord, and MusicVAE walks between them. Dreams become new sets you can switch between.

## Run it

No build step and no dependencies. You need Node (for the tiny dev server) or any static file server.

```bash
npm start      # http://localhost:5180
npm test       # tintinnabuli and retrograde rules
```

Opening `index.html` straight from disk won't work, because browsers don't load ES modules from
`file://` URLs.

## How it is made

```
index.html, styles.css   the page: intro, controls, help, settings drawer
src/main.js              state, gestures and the frame loop
src/audio/engine.js      audio graph, four voice buses, a lookahead transport timed by a worker
src/audio/instruments.js piano (Salamander samples, synth fallback), glass (FM), air, the 2020
                         xylophone sample, and the bell (inharmonic partials of a struck bar)
src/audio/pedal.js       root, octave and fifth (C1, C2, G2 in the first set), breathing through a filter
src/audio/reverb.js      a generated impulse response: a stone room with no files
src/music/tintinnabuli.js the T-voice rules
src/music/latent-walk.js eight stations through MusicVAE's latent space
src/music/sets.js        the shipped melody sets, precomputed
src/render/floor.js      one WebGL2 shader: floor, lantern, soft shadows, raked rings, ripples
src/render/scene.js      2D canvas: discs, melodies, dust, the lantern
tools/precompute.html    regenerates sets.js from the seeds in src/music/seeds.js
```

**Melodies without a model download.** The three sets (*Origin*, the 2020 seeds; *Cantus*, a falling A
minor scale after Pärt; *Espiral*, a cell widening around E after Brouwer) were generated once with
MusicVAE (`mel_2bar_small`) and are stored in `src/music/sets.js`, so the piece starts instantly and
keeps working if the model is ever unavailable. Plain interpolation repeats melodies near the two
ends, so the walk nudges any repeated station: it adds a little noise to that station's latent code
and decodes it greedily again until the melody is new. To change the seeds, edit
`src/music/seeds.js`, serve the repo, open `/tools/precompute.html`, and paste the output into
`sets.js`. Magenta is loaded only when someone asks for a dream.

**Shadows.** The lantern is a point light at a fixed height over the pointer. A disc floating at
height *h* casts a circular shadow scaled by *H / (H − h)* and pushed away from the light by the same
factor, with a penumbra that widens with height. The floor shader evaluates this per pixel for every
disc and melody, so a melody you pick up casts a larger, softer shadow.

## Credits

- The 2020 *Eternal Circles* by Juan Carlos Piñeros, and its xylophone sample (`assets/xylophone-A6.wav`)
- [Magenta.js](https://github.com/magenta/magenta-js): MusicVAE and MusicRNN (Apache 2.0)
- [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm (CC BY 3.0), streamed from the Tone.js sample host
- [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) and [DM Mono](https://fonts.google.com/specimen/DM+Mono) (SIL Open Font License)
- Musical inspiration from Arvo Pärt and Leo Brouwer
