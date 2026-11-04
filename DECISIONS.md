# Decisions

This log records the choices behind Eternal Circles. **Part 1, the foundation**, lists what Juan
decided in the 2020 version and the remaster keeps: the concept, the AI method, the melodies, the
gestures, the drone, the influences. **Part 2, the remaster**, lists what changed or was added in 2026
and who decided each change. Most of those changes were Claude's, made after Juan's brief ("your
choice, surprise me, be very brave").

Tally: the foundation has 13 decisions, all Juan's. The remaster has 28 changes: Claude made 20, Juan
made 1, and 7 were shared.

**Review (Juan, 2026-11-04):** Juan kept all 13 foundation decisions and 26 of the 28 remaster
changes. He kept one with a change (L3, a softer magenta) and wants to test an alternative to another
(I3, the opening). Next steps are listed at the end, under *From the review*; ideas that came up
during the review are in [IDEAS.md](IDEAS.md).

## Part 1 · The foundation (2020)

The 2020 version was made for the Bitrate hackathon (https://bitrate.devpost.com/), part of Gray
Area's Bitrate series on machine learning and music.

### F1 · An instrument of four voices and eight melodies
- **What:** "an instrument in which melodies can be combined, changed, generated, mixed": 4 voices
  (discs) and 8 melodies (tiles), where the artist and the listener both shape the piece as it plays.
- **In the remaster:** unchanged; it is still the whole idea.
- **Juan's call:** Keep. It works for now; we may revisit it later through IDEAS.md.

### F2 · Melodies from MusicVAE's latent space
- **What:** the eight melodies are interpolated with MusicVAE between two seed melodies.
- **In the remaster:** the same idea; the method changed (M5).
- **Juan's call:** Keep. I love latent interpolation.

### F3 · The two seed melodies
- **What:** Juan's two melodies, in C minor, the start and end of the walk.
- **In the remaster:** set I, Origin (M3).
- **Juan's call:** Keep. The melodies sound good.

### F4 · New seeds from MusicRNN
- **What:** in the settings, either seed can be replaced by one that MusicRNN improvises over the
  chord, at a chosen temperature (0.6 to 1.4).
- **In the remaster:** Dream (M7).
- **Juan's call:** Keep. It's fine for now, but I want to revisit it later (see IDEAS.md).

### F5 · The gestures
- **What:** drag a melody from its tile onto a disc, double-click a disc to clear it, use the mouse
  wheel over it for volume.
- **In the remaster:** kept, with touch versions (I5) and clickable words under each disc (I1).
- **Juan's call:** Keep. Good for now; later we might test hand gestures (see IDEAS.md).

### F6 · Retrograde from the centre
- **What:** clicking the centre of a disc plays its melody backwards.
- **Inspiration:** a video of the Crab Canon from Bach's *Musical Offering*, shown on a Möbius strip
  (see Juan's call on L2).
- **In the remaster:** kept; the rests are now kept too, and the disc flips (M6).
- **Juan's call:** Keep. I love this idea.

### F7 · The drone, and its wave on screen
- **What:** C1, C2 and G2 sustained under everything, with the drone's waveform drawn on screen.
- **In the remaster:** the same notes with a new sound (S2); the wave still runs along the bottom.
- **Juan's call:** Keep. The pedal sounds much better now.

### F8 · Notes that circle each disc
- **What:** each disc's notes are drawn around it in order, higher notes higher up, drifting in slow
  orbits.
- **In the remaster:** became the circular score (L2) and the lantern's idle orbit (L5).
- **Juan's call:** Keep. I love this artistic direction.

### F9 · An instrument for each disc
- **What:** each disc plays piano (the Salamander samples) or xylophone (Juan's own sample), set per
  disc in the settings.
- **In the remaster:** kept, with glass and air added (S1).
- **Juan's call:** Keep. The samples sound great.

### F10 · Tempo
- **What:** 98 bpm, adjustable with a slider from 60 to 140.
- **In the remaster:** still 98 to start, with − and + buttons (S5).
- **Juan's call:** Keep. A good default, and it's nice that people can change it.

### F11 · Headphones and a start
- **What:** "Please be sure to use your headphones", and a button to start the sound.
- **In the remaster:** both are in the intro screen (I3).
- **Juan's call:** Keep. A good reminder for people.

### F12 · Pärt and Brouwer
- **What:** "in Eternal Circles I also sought to implement some of their musical characteristics."
- **In the remaster:** the tintinnabuli bells (M1, M2) and the Cantus and Espiral sets (M4).
- **Juan's call:** Keep. I love how the Cantus and Espiral sets sound. They're also a way to learn
  how well AI can compose in this kind of setting; I think Opus 5.5 did a great job here.

### F13 · All in the browser, in the open
- **What:** Magenta, Tone.js and p5.js running entirely in the browser, with no server, and the code
  on GitHub.
- **In the remaster:** still all in the browser, now without libraries (P2), on a public MIT-licensed
  repository (P3).
- **Juan's call:** Keep. Good call; I hope we can keep it in the browser.

**Open since 2020:** letting people bring their own melodies or edit the existing ones. Not built yet.

## Part 2 · The remaster (2026)

### Look

#### L1 · The cursor is a lantern
- **What:** the pointer is a point light over a dark stone floor. The discs and melodies float above
  it and cast soft shadows that swing as it moves.
- **Instead of:** a starfield or another "space" look; flat, even light with no shadows.
- **Decided by:** Claude, from Juan's brief (moving the mouse makes shadows; things floating in a
  liminal or minimal space).
- **Why:** it makes the shadow idea physical, and the light becomes something you point with.
- **Try it:** move the mouse slowly between the discs.
- **Juan's call:** Keep. I love the lantern.

#### L2 · Each disc is a circular score
- **What:** the angle is time (two bars, starting at twelve o'clock) and the distance from the centre
  is pitch; the magenta arcs are the melody. An empty disc is dark glass; a disc with a melody turns
  into lit porcelain, and a playhead sweeps around it.
- **Instead of:** the 2020 orbiting notes (F8); a piano roll.
- **Decided by:** Claude designed it; it is what Juan wanted in 2020 but couldn't build (see his call).
- **Why:** the circle becomes the score itself, so you see the melody you hear.
- **Try it:** drag a melody onto an empty disc and watch it light up.
- **Juan's call:** Keep. I love it. I think this is what I wanted in 2020 but couldn't build during
  the Bitrate hackathon: a kind of piano roll in circles. Back then I was impressed by a YouTube video,
  "J.S. Bach - Crab Canon on a Möbius Strip": the Crab Canon is one of the canons in Bach's *Musical
  Offering* (*Musikalisches Opfer*), the collection *Gödel, Escher, Bach* talks about in its first
  chapter. As far as I remember, this was the video: https://www.youtube.com/watch?v=xUHQ2ybTejU. It's
  also why the notes can turn in the other direction (F6). Today I found a video saying that the
  Möbius strip in that video is wrong as shown, although Bach does have pieces that work on a Möbius
  strip: https://www.youtube.com/watch?v=0WX_gokLiJA. The idea of Möbius discs, with research notes, is now in IDEAS.md.

#### L3 · Palette and type
- **What:** near-black ink, warm cream, magenta for melodies, gold for bells and an ember-red
  playhead. Instrument Serif for titles, DM Mono for the small labels.
- **Instead of:** a cool palette; one plain sans-serif.
- **Decided by:** Claude.
- **Why:** warm lamplight against dark stone; the serif feels like a printed score, the mono like a
  quiet instrument panel.
- **Try it:** the intro screen and the labels under the discs.
- **Juan's call:** Keep, but let's iterate a bit: the magenta of the melodies looks a little loud
  (*chillón*, as we say in Spanish), though it may still be the right colour. Let's look at a few
  alternatives as images; it isn't a high priority. Otherwise, I love the direction.

#### L4 · The melodies hang on an arc from A to B
- **What:** the eight melodies sit on a curve under the discs, with A and B at the ends and the
  caption "Eight steps through the latent space of MusicVAE". On short screens the curve flattens so
  it clears the labels.
- **Instead of:** the 2020 tiles; a straight row.
- **Decided by:** Claude.
- **Why:** the curve shows they are steps along one path from A to B.
- **Try it:** look under the discs; on a phone, turn it sideways.
- **Juan's call:** Keep. A great decision.

#### L5 · Idle mode
- **What:** after 7 seconds without input the controls fade and the lantern wanders on its own, along
  the kind of orbit the notes followed in 2020 (F8).
- **Instead of:** controls that never fade; a lantern that stays put.
- **Decided by:** Claude.
- **Why:** when you stop playing, the piece becomes something to watch.
- **Try it:** start the piece and let go of the mouse.
- **Juan's call:** Keep. I love this idea.

#### L6 · The preview card
- **What:** the image shown when the link is shared is a real frame of the piece (discs II and III
  lit, the lantern above), with no title text.
- **Instead of:** a designed poster with the title.
- **Decided by:** Claude (Juan asked for a card).
- **Why:** it shows the actual piece, and the link preview already carries the title.
- **Try it:** `assets/share-card.jpg`, or paste the link into a chat.
- **Juan's call:** Keep for now; we can revisit it later.

### Sound

#### S1 · Two new instruments, and new defaults
- **What:** glass (FM synthesis) and air (a soft pad) join the piano and xylophone (F9). The discs
  start as piano, piano, glass, air.
- **Instead of:** piano and xylophone only.
- **Decided by:** Claude.
- **Why:** two more colours that blend with the bells.
- **Try it:** click the instrument word under a disc to cycle it.
- **Juan's call:** Keep. I love it; the sound is richer.

#### S2 · A new sound for the drone
- **What:** the 2020 notes (F7) are now played by pairs of slightly detuned sawtooth waves through a
  filter that slowly opens and closes, and sent into the room's reverb. The drone follows each set's
  key.
- **Instead of:** the 2020 sound: one triangle wave per note, dry.
- **Decided by:** Claude.
- **Why:** a fuller, slowly moving bass that sits in the same space as everything else.
- **Try it:** Settings → Space → Pedal.
- **Juan's call:** Keep. It sounds much better than in 2020.

#### S3 · One stone room
- **What:** everything shares one reverb, generated in code (about five seconds, darkening as it
  fades) instead of loaded from a recording.
- **Instead of:** a recorded room; 2020's lighter reverb on the instruments, which left the drone dry.
- **Decided by:** Claude.
- **Why:** one large space ties the voices together, and generating it keeps audio files out of the
  repo.
- **Try it:** Settings → Space → Room.
- **Juan's call:** Keep. It sounds much better than in 2020.

#### S4 · The bell sound
- **What:** each bell is built from a handful of inharmonic partials, like a struck metal bar, and
  sits quietly under the melody.
- **Instead of:** a sampled bell; a pure sine tone.
- **Decided by:** Claude.
- **Why:** a metallic shimmer that rings with the melody without covering it.
- **Try it:** Settings → Bells → Bell level.
- **Juan's call:** Keep. It sounds great.

#### S5 · Tempo controls
- **What:** − and + buttons from 52 to 144 bpm, starting at the 2020 tempo of 98 (F10).
- **Instead of:** the 2020 slider from 60 to 140.
- **Decided by:** Claude.
- **Why:** slower tempos suit the bells and the room.
- **Try it:** the − and + buttons, or the arrow keys.
- **Juan's call:** Keep. Looks good to me.

### Music

#### M1 · Tintinnabuli bells
- **What:** every melody note rings a bell on a note of the key's home chord. Bells are on by
  default, alternating above and below, in first position.
- **Instead of:** no bells (2020); bells off by default; bells always above.
- **Decided by:** Claude proposed it, after Juan's Pärt influence (F12), and Juan chose it; the
  defaults are Claude's.
- **Why:** Pärt's technique gives every melody a second voice and anchors the harmony to one chord.
- **Try it:** click the gold word under a disc to cycle the bells; Settings → Bells → Position.
- **Juan's call:** Keep. I love it.

#### M2 · Diatonic bells
- **What:** a chord note spelled with the melody note's own letter doesn't count, so a G♯ is answered
  by E, never by the G a semitone away. Notes are spelled with the usual pairs: ♭2 and 2, ♭3 and 3,
  4 and ♯4, ♭6 and 6, ♭7 and 7.
- **Instead of:** answering by pitch alone (the first version); using the arvo library.
- **Decided by:** Juan found arvo and asked for the rule; Claude wrote it, including the spelling.
- **Why:** it avoids harsh same-letter clashes, as Pärt does. Only five bells in Espiral changed.
- **Try it:** Espiral, melody 1.
- **Juan's call:** Keep. It's closer to what we want here.

#### M3 · Three sets, with Origin first
- **What:** the 2020 seeds (F3) become set I, Origin, one of three sets you can switch between.
- **Instead of:** one fixed pair of seeds, as in 2020.
- **Decided by:** Claude.
- **Why:** room for other keys and characters without losing the original.
- **Try it:** Settings → Melodies.
- **Juan's call:** Keep. I love it.

#### M4 · Two new sets: Cantus and Espiral
- **What:** Cantus (A minor, after Pärt) walks from a falling A minor scale to a slow arch through the
  A minor chord. Espiral (E minor, after Brouwer) walks from a cell that widens around E to an open
  E minor arpeggio.
- **Instead of:** Origin only; seeds written by Juan.
- **Decided by:** Claude wrote the seeds, after Juan's influences (F12).
- **Why:** nods to Pärt and Brouwer, and variety in key and character.
- **Try it:** Settings → Melodies.
- **Juan's call:** Keep. I love it; again, it shows how good AI has become. Opus 5.5 did a great job
  here.

#### M5 · How the eight melodies are made
- **What:** the 2020 idea (F2), computed differently. Six evenly spaced points on the straight line
  between A and B are each decoded to their most likely notes; a point that repeats an earlier melody
  or leaves the pitch range is nudged with a little noise and decoded again; A and B themselves are
  melodies 1 and 8. All three sets were computed once and saved.
- **Instead of:** the 2020 method: Magenta's built-in interpolation, run in the browser every time the
  page loaded, which can repeat melodies near the ends.
- **Decided by:** Claude.
- **Why:** eight different melodies, the same for everyone, and a page that starts instantly.
- **Try it:** click melodies 1 to 8 in order to hear the path.
- **Juan's call:** Keep. Great for the experience.

#### M6 · Retrograde keeps the rests
- **What:** the 2020 retrograde (F6) now reverses time exactly, rests included, and the disc flips
  like a coin.
- **Instead of:** reversing only the order of the notes, as in 2020.
- **Decided by:** Juan intended it in 2020 (see his call); Claude's version made it work and added the
  coin flip.
- **Why:** a true mirror of the melody in time.
- **Try it:** click the dark centre of a playing disc.
- **Juan's call:** Keep. I think this was my intention in 2020; the old behaviour was probably just a
  bug on my end.

#### M7 · Dream
- **What:** the 2020 MusicRNN feature (F4), reworked: each dream adds a new set of eight melodies you
  can switch to, and dreamed sets last only until the page reloads.
- **Instead of:** replacing the seeds in place, as in 2020; saving dreams in the browser.
- **Decided by:** Claude.
- **Why:** earlier sets stay available, and nothing is stored on the visitor's device.
- **Try it:** Settings → Dream.
- **Juan's call:** Keep. A great decision for the experience.

### Interaction and phones

#### I1 · Clickable words under each disc
- **What:** the instrument and bells words under each disc are buttons: click to cycle them.
- **Instead of:** changing them only in the settings, as in 2020.
- **Decided by:** Claude.
- **Why:** quick changes without leaving the piece.
- **Try it:** click "PIANO" or "BELLS ALT" under a disc.
- **Juan's call:** Keep. A great call for the experience.

#### I2 · Lantern listening
- **What:** discs near the light sound closer: brighter and louder. On by default.
- **Instead of:** light that only changes the picture.
- **Decided by:** Claude.
- **Why:** where you look is what you hear.
- **Try it:** move the lantern from one playing disc to another; Settings → Space → Lantern listening.
- **Juan's call:** Keep. One of the new ideas I like most.

#### I3 · The opening
- **What:** an intro screen with the 2020 headphones note (F11) and an Enter button. After Enter,
  melody 1 starts on disc II with a hint to drag another.
- **Instead of:** starting silent and empty.
- **Decided by:** Claude.
- **Why:** you hear the idea within a second.
- **Try it:** reload the page.
- **Juan's call:** Unsure, leaning towards overrule. Let's test an opening where no disc is loaded, so
  only the pedal plays. With nothing playing yet, people might want to find out what to do and how
  to interact.

#### I4 · Phones play through the silent switch
- **What:** on iPhones the piece asks for a media-playback session, so it plays even with the
  ring/silent switch on, like a music app.
- **Instead of:** respecting the silent switch, as web pages do by default.
- **Decided by:** Claude, in the phone pass Juan asked for.
- **Why:** someone who opens the link and taps Enter expects to hear it.
- **Try it:** an iPhone with the switch on silent (not yet tested on a real phone).
- **Juan's call:** Keep for now. In my opinion it isn't a high priority.

#### I5 · Touch behaviour
- **What:** on touch screens the small targets reach further, a slightly wobbly tap still plays a
  melody, and when the controls have faded the first tap only brings them back.
- **Instead of:** the desktop behaviour everywhere.
- **Decided by:** Claude.
- **Why:** fingertips are wider than cursors, and hidden buttons shouldn't fire by accident.
- **Try it:** on a phone.
- **Juan's call:** Keep. A great decision for the experience.

### Project

#### P1 · A new repository
- **What:** the remaster lives in its own repository; the 2020 one is untouched.
- **Instead of:** remastering inside the 2020 repository.
- **Decided by:** Juan.
- **Why:** it keeps the original as it was.
- **Juan's call:** Keep. The 2020 repository stays as a relic.

#### P2 · No build step and no dependencies
- **What:** plain JavaScript modules, Web Audio and WebGL, still all in the browser (F13). Magenta
  loads only when someone dreams.
- **Instead of:** the 2020 libraries (p5.js, Tone.js, Magenta at start); a framework and bundler.
- **Decided by:** Claude.
- **Why:** the 2020 app's Glitch page is gone; with nothing to install or update, this one should
  keep working.
- **Juan's call:** Keep. A great idea!

#### P3 · Public, MIT-licensed, on GitHub Pages
- **What:** a public repository under the MIT license, served by GitHub Pages from `main`.
- **Instead of:** a private repository; Apache 2.0 or GPL.
- **Decided by:** publishing was Juan's call; the license was Claude's recommendation, which Juan
  approved.
- **Why:** anyone can play it from a link and learn from the code; MIT matches Komposair.
- **Juan's call:** Keep.

#### P4 · Claude is credited in every commit
- **What:** each commit ends with "Co-Authored-By: Claude".
- **Instead of:** no attribution.
- **Decided by:** Claude (its default).
- **Why:** an honest record of how the remaster was made.
- **Juan's call:** Keep. Let's be honest about who writes the code and who makes the decisions, as
  we're doing in this file.

#### P5 · The words: README and repository description
- **What:** Claude wrote the README and the one-line repository description.
- **Instead of:** Juan's own words.
- **Decided by:** Claude.
- **Why:** speed, and a first version to react to.
- **Juan's call:** Keep for now. We'll come back to it so it sounds more like me.

## From the review

**Changes to make.** Each one gets a short brief and Juan's go-ahead before anything is built.
- **L3 · A softer magenta.** Claude prepares images of the piece with two or three softer versions of
  the melody colour, next to the current one, and Juan picks. Low priority.
- **I3 · An opening with only the pedal.** Claude builds it on a separate branch, so Juan can compare
  it with the current opening before deciding.

**To do.**
- **P5 · The README in Juan's voice.** Juan rewrites the "why" in his own words; part of week 1.
- **I4 · A real iPhone.** Try the piece on an iPhone, including with the silent switch on. Low
  priority.

**Moved to [IDEAS.md](IDEAS.md):** Möbius discs (from L2) and Revisit Dream (from F4). Juan's notes on
F1, F5 and L6 point to ideas already there: movable discs, gesture recognition, and the drawing as a
keepsake.
