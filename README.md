# Courtside Basketball Voice Stats

Installable web app for desktop Chrome and Chrome on Android, including Google Pixel. Open the published HTTPS site, allow microphone access, and use Chrome's Install/Add to Home screen option. Keep the app visible while listening. Background recording and offline speech recognition are not guaranteed by browser speech services.

## Features

- Configurable periods, overtime, timeouts, foul limits, team names and home/away designation.
- Rosters with stable player IDs, names, aliases and CSV import.
- Voice, keyboard and touch scoring; review for low-confidence speech and unclear shot/rebound types.
- Multi-action narration first separates speech into atomic clauses and an ordered event array, preserving pass/shot, miss/rebound/putback, steal/pass/score, block/rebound, timeout/substitution/clock, and individual free-throw attempts. The expandable debug panel shows raw and cleaned speech, atomic clauses, parsed events, and any clause that needs review. Automatic assists default on for new games and credit only the last eligible passer; disable them in game setup.
- Append-only transaction ledger with non-destructive correction patches and undo.
- A frozen scoreboard clock: the first tap of Listen now or the first typed Record now play starts Q1 once five starters are selected. Starters open at the full period time; only an entered or spoken time advances minutes. End a sequence with “now it’s Q2 3:43” to space waiting plays evenly between the previous and new official times and recalculate player minutes. Twelve plays over two minutes produce ten-second spacing. Estimated times are labeled, assist credits share the shot time, and each substitution group shares one time. At quarter end the app checks that five-player minutes total five times the period length. Earlier anchored events stay unchanged; undo restores the previous checkpoint. Explicit and stopped-clock substitutions retain their supplied times. Running/stopped is an official game status, never a wall-time countdown.
- The current five stay directly below the scoreboard, updating immediately for single or multiple spoken substitutions.
- A live input meter reports RMS dBFS with one decimal place. It is an uncalibrated digital input level, not room SPL; the meter works independently of transcription and can be started with Test mic. Captured tracks and Web Audio resources stop on Stop, menu navigation, or page hiding.
- Recognition prefers an installed on-device English model where supported. Enable offline speech offers a user-triggered language-pack download. Cloud service network failures use 2/5/10/20-second retries before leaving the meter active in test-only mode; unavailable browser/provider services are explained without claiming the user’s entire network is disconnected. Missing transcripts are not invented or silently recorded.
- Switch mic selects a concrete audio input in desktop Chrome 135+. The chosen track feeds both game speech and setup dictation. Pixel/Android Chrome does not support the speech audio-track parameter, so the phone control explains device routing and restarts listening. No unsupported microphone selection is silently claimed.
- Full and per-period player/team box scores, timeline, printable report and CSV export. End-game confirmation offers an automatic whole-team or single-player PDF; reports can be downloaded again from Box score. PDF code is bundled from `client/reports.js`.
- A2/A3 transcription aliases stage shots until an outcome arrives. Only on-court players can record actions. Opp/opponent/opponet/enemy/other team context supports team steals and scores. “Moving onto the second quarter” closes the previous period and resets the clock to the configured period length.
- A main menu for creating collections (for example Wolves 2026) and browsing each season's games.
- Home screen on launch, with a three-step new-game wizard for teams/collection, period rules, and spoken or typed date/optional time; reuse the previous game’s roster within a collection.
- Account-backed collections and games, automatic migration of the old local game, JSON backup/import, and local recovery for offline manual controls.
- Revision checks prevent one device silently overwriting changes from another. Conflict recovery downloads a local backup before reopening the saved version.

Games synchronize to the signed-in user's account. Open or refresh the menu to retrieve saved games on another device; record a game on one device at a time. Active unsynced changes are preserved in a local backup and uploaded on reconnection. Full season history requires a connection. The app does not store audio. Browser recognition may send audio to the browser vendor's speech service. A deterministic basketball command parser recognizes the supported examples; it is not an unrestricted language model. Unknown commands fail without changing the ledger.

## Source and verification

`dist/` contains the authored browser application. `server/worker.js` provides authenticated account storage through the Sites D1 binding `DB`. The build embeds the browser assets and shared scoring engine in `dist/server/index.js`. Schema and generated migrations live in `db/` and `drizzle/`. Authorization uses opaque, hashed server sessions in Secure HttpOnly SameSite cookies. `server/auth.js` handles username/password signup and login with bcrypt cost 12, 30-day sessions, and database-backed rate limits. Usernames use 3–24 letters/numbers/underscores; passwords require 12 characters and at most 72 UTF-8 bytes. No email or password reset is offered. The trusted platform identity is used only to move legacy data into the first registered account. Local backups are scoped by account ID. No external runtime JavaScript dependencies are required. Fonts have local fallbacks.

Run with Node 20 or newer:

```
node tests/pdf-scenario.mjs
node tests/game-rules.mjs
node tests/schedule.mjs
node tests/natural-speech.mjs
node tests/manual-clock.mjs
node tests/audio-service.mjs
node tests/season-upgrade.mjs
npm run build
node tests/account-security.mjs
```

Verified: PDF command sequence, scoring, free throws, frozen clocks and batch time updates, halves/overtime, player-minute calculations, corrections/undo, collections, nested collection creation, spoken scheduling, optional time, roster reuse, completed-game history, two separate browser sessions retrieving shared account data, account isolation, stale-revision rejection, legacy migration, offline reload/recording/reconnection, and conflict recovery. Desktop browser automation used Chrome at desktop and 412-pixel phone widths. The level meter was tested with a synthetic Web Audio signal; online recognition failures and offline install/recognition were tested with simulated browser service responses. The user’s real speech-provider connection has not been verified. Microphone routing was checked with simulated devices for exact track selection, switching and release. Physical Pixel hardware/microphone testing has not been performed. Native WebMCP registration validation was unavailable in the test browser; tools are feature-detected and optional.

Plain rebound calls go to your team without inventing a player credit; shot context determines offensive/defensive type where available. Explicit player and opponent calls take priority. The configured opponent name is recognized as an opponent team reference. Existing games keep their saved assist setting.

Smart clock controls support spoken minutes/seconds, compact 423 shorthand, current-period inference, forward/backward sync, and confirmation for times exceeding the configured period. Substitution controls support paired/grouped swaps, arrows, complete line changes, period-start lineups, historical time/player correction, and undo of the last substitution group. Voice fragments wait briefly and incomplete groups stay in preview until completed or confirmed. Quarter, halftime, overtime, and timeout controls retain official-clock intervals without duplicate player entries.
