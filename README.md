# Courtside Basketball Voice Stats

Installable static web app for desktop Chrome and Chrome on Android, including Google Pixel. Open the published HTTPS site, allow microphone access, and use Chrome's Install/Add to Home screen option. Keep the app visible while listening. Background recording and offline speech recognition are not guaranteed by browser speech services.

## Features

- Configurable periods, overtime, timeouts, foul limits, team names and home/away designation.
- Rosters with stable player IDs, names, aliases and CSV import.
- Voice, keyboard and touch scoring; low-confidence voice confirmation queue.
- Append-only transaction ledger with non-destructive correction patches and undo.
- Player minutes derived from official period/clock intervals, not elapsed real time between commands.
- Full and per-period player/team box scores, timeline, printable report and CSV export.
- Device-local autosave, JSON backup/import and offline manual controls after installation.

Games do not automatically synchronize between devices. Export a backup from one device and import it on the other. The app does not store audio. Browser recognition may send audio to the browser vendor's speech service. A deterministic basketball command parser recognizes the supported examples; it is not an unrestricted language model. Unknown commands fail without changing the ledger.

## Source and verification

`dist/` is the authored static application. Serve it over HTTPS (or localhost for development) with JavaScript MIME types for `.js` files. No build or third-party JavaScript dependencies are required. Fonts have local fallbacks.

Run with Node 20 or newer:

```
node tests/pdf-scenario.mjs
node tests/game-rules.mjs
```

Verified: PDF command sequence, scoring, free throws, clock pauses, halves/overtime, player-minute calculations, corrections/undo, local reload, mobile overflow, permission-error handling, simulated speech confirmation and offline manual entry. Desktop browser automation used Chrome at desktop and 412-pixel phone widths. Physical Pixel hardware/microphone testing has not been performed. Native WebMCP registration validation was unavailable in the test browser; tools are feature-detected and optional.
