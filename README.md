# Courtside Basketball Voice Stats

Installable web app for desktop Chrome and Chrome on Android, including Google Pixel. Open the published HTTPS site, allow microphone access, and use Chrome's Install/Add to Home screen option. Keep the app visible while listening. Background recording and offline speech recognition are not guaranteed by browser speech services.

## Features

- Configurable periods, overtime, timeouts, foul limits, team names and home/away designation.
- Rosters with stable player IDs, names, aliases and CSV import.
- Voice, keyboard and touch scoring; review for low-confidence speech and unclear shot/rebound types.
- Multi-action narration with passing chains, natural shot phrases, contextual rebounds, delayed shot outcomes, raw transcripts, and an expandable parsed-events panel. Optional automatic assists credit only the last eligible passer.
- Append-only transaction ledger with non-destructive correction patches and undo.
- A frozen scoreboard clock: Start game begins tracking; only an entered or spoken time advances it. End a sequence with “now it’s Q2 3:43” to timestamp all waiting plays and substitutions at that checkpoint and recalculate player minutes. Earlier anchored events stay unchanged; undo restores the previous checkpoint.
- The current five stay directly below the scoreboard, updating immediately for single or multiple spoken substitutions.
- A live input meter reports RMS dBFS with one decimal place. It is an uncalibrated digital input level, not room SPL; the meter works independently of transcription and can be started with Test mic. Captured tracks and Web Audio resources stop on Stop, menu navigation, or page hiding.
- Recognition prefers an installed on-device English model where supported. Enable offline speech offers a user-triggered language-pack download. Cloud service network failures use 2/5/10/20-second retries before leaving the meter active in test-only mode; unavailable browser/provider services are explained without claiming the user’s entire network is disconnected. Missing transcripts are not invented or silently recorded.
- Switch mic selects a concrete audio input in desktop Chrome 135+. The chosen track feeds both game speech and setup dictation. Pixel/Android Chrome does not support the speech audio-track parameter, so the phone control explains device routing and restarts listening. No unsupported microphone selection is silently claimed.
- Full and per-period player/team box scores, timeline, printable report and CSV export.
- A main menu for creating collections (for example Wolves 2026) and browsing each season's games.
- Home screen on launch, with a three-step new-game wizard for teams/collection, period rules, and spoken or typed date/optional time; reuse the previous game’s roster within a collection.
- Account-backed collections and games, automatic migration of the old local game, JSON backup/import, and local recovery for offline manual controls.
- Revision checks prevent one device silently overwriting changes from another. Conflict recovery downloads a local backup before reopening the saved version.

Games synchronize to the signed-in user's account. Open or refresh the menu to retrieve saved games on another device; record a game on one device at a time. Active unsynced changes are preserved in a local backup and uploaded on reconnection. Full season history requires a connection. The app does not store audio. Browser recognition may send audio to the browser vendor's speech service. A deterministic basketball command parser recognizes the supported examples; it is not an unrestricted language model. Unknown commands fail without changing the ledger.

## Source and verification

`dist/` contains the authored browser application. `server/worker.js` provides authenticated account storage through the Sites D1 binding `DB`. The build embeds the browser assets and shared scoring engine in `dist/server/index.js`. Schema and generated migrations live in `db/` and `drizzle/`. Authorization is enforced per request using the platform's authenticated user ID. No external runtime JavaScript dependencies are required. Fonts have local fallbacks.

Run with Node 20 or newer:

```
node tests/pdf-scenario.mjs
node tests/game-rules.mjs
node tests/schedule.mjs
node tests/natural-speech.mjs
node tests/manual-clock.mjs
node tests/audio-service.mjs
npm run build
```

Verified: PDF command sequence, scoring, free throws, frozen clocks and batch time updates, halves/overtime, player-minute calculations, corrections/undo, collections, nested collection creation, spoken scheduling, optional time, roster reuse, completed-game history, two separate browser sessions retrieving shared account data, account isolation, stale-revision rejection, legacy migration, offline reload/recording/reconnection, and conflict recovery. Desktop browser automation used Chrome at desktop and 412-pixel phone widths. The level meter was tested with a synthetic Web Audio signal; online recognition failures and offline install/recognition were tested with simulated browser service responses. The user’s real speech-provider connection has not been verified. Microphone routing was checked with simulated devices for exact track selection, switching and release. Physical Pixel hardware/microphone testing has not been performed. Native WebMCP registration validation was unavailable in the test browser; tools are feature-detected and optional.
