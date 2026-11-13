# Web product improvements — Day 3 — November 12, 2026

Amartya authorized product work after the completed Day 2 triage report.
Day 3 branch: `day3/web-product-polish`, created from latest main `bb3d6fd` after fetching.
The completed local product change was carried onto this fresh branch. PR #3 is now merged;
the product PR targets main.

## Working changes

- History searches a selected month or all months. Each search word must match the note,
  category label, ISO date, or amount. Category and essential/discretionary filters combine
  with search. Matching counts, sums and day groups update after adds, edits, deletes and Undo.
- Web CSV download contains exactly the matching expenses, in CAD, with UTF-8 BOM,
  CRLF records, quoted fields, escaped quotes and formula-prefix protection on text cells.
  Empty results disable download. CSV is not a backup/import format; JSON restore is unchanged.
- Web expense entry uses the browser calendar for older receipts, validates calendar dates,
  and rejects future dates. Native builds retain their existing day stepper.
- Expense entry sheets have a centered 600px maximum width for desktop use.

## Validation

- `EXPO_NO_TELEMETRY=1 npm run check`: typecheck, lint and 216 tests in 14 suites pass.
  All original 203 tests remain green. Thirteen added tests cover search intersections,
  period selection, no matches, whitespace, CSV precision/escaping and formula prefixes.
- `PENNEY_WEB_BASE_URL=/penney EXPO_NO_TELEMETRY=1 npm run build:web` passes.
- Playwright/system Chromium on the exported app under `/penney/`:
  - Search `pizza takeout`, download CSV, confirm it contains only the matching purchase.
  - Search `weekly` in the selected month: no results, download disabled; switch to All
    months: the older grocery purchase appears with the correct matching total.
  - Combine grocery category with discretionary type: no results; clear filters restores all.
  - Set viewport to 375×812; add an expense, select an older calendar date, attempt a future
    date (rejected), restore today's date and save. Search results refresh immediately.
  - Reload: saved expense persists. Edit amount, delete and Undo: result count/total updates.
  - Dashboard, week, charts and settings load at narrow width without horizontal overflow.
  - Inspected History screenshots at 1280×900 and 375×812. No uncaught page errors.
- Repeated all Day 2 backup browser checks after these changes: file restore, export JSON
  contents, invalid paste, replacement confirmation, Undo, duplicate-safe merge/re-import,
  reload persistence and direct-route fallback all passed with no uncaught page errors.
- Actionlint and diff whitespace checks pass. Hosted CI results are linked from the PR/log.

## Service and release needs

No API key or external service is needed for these features. No credentials were added.
Pages settings were not changed. The maintainer confirmed the first successful deployment and
HTTP 200 at https://amartya2001-droid.github.io/penney/ in tracking issue #1. This environment's
outbound policy rejects github.io (HTTP CONNECT 403), so direct live re-verification is blocked;
local export checks and hosted PR build results do not establish that branch features are live.
Native share-sheet/document-picker verification remains unverified and needs an iOS/Android
device or simulator.
