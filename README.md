# Courtside Basketball Voice Stats

Installable web app for desktop Chrome and Chrome on Android, including Google Pixel. Open the published HTTPS site, allow microphone access, and use Chrome's Install/Add to Home screen option. Keep the app visible while listening. Background recording and offline speech recognition are not guaranteed by browser speech services.

## Features

- Configurable periods, overtime, timeouts, foul limits, team names and home/away designation.
- Rosters with stable player IDs, names, aliases and CSV import.
- Voice, keyboard and touch scoring; low-confidence voice confirmation queue.
- Append-only transaction ledger with non-destructive correction patches and undo.
- Player minutes derived from official period/clock intervals, not elapsed real time between commands.
- Full and per-period player/team box scores, timeline, printable report and CSV export.
- A main menu for creating collections (for example Wolves 2026) and browsing each season's games.
- New games with spoken or typed opponent/date and an optional start time; reuse the previous game’s roster and rules within a collection.
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
npm run build
```

Verified: PDF command sequence, scoring, free throws, clock pauses, halves/overtime, player-minute calculations, corrections/undo, collections, nested collection creation, spoken scheduling, optional time, roster reuse, completed-game history, two separate browser sessions retrieving shared account data, account isolation, stale-revision rejection, legacy migration, offline reload/recording/reconnection, and conflict recovery. Desktop browser automation used Chrome at desktop and 412-pixel phone widths. Physical Pixel hardware/microphone testing has not been performed. Native WebMCP registration validation was unavailable in the test browser; tools are feature-detected and optional.
