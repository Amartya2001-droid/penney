# Penney

A gamified savings companion. Penney is a sentient coin whose mood and deadpan daily commentary
track your discretionary spending against your monthly savings goal. Essentials such as rent and
groceries never hurt his mood; takeout, shopping, and other non-essentials do.

Runs on iOS, Android, and web from one Expo + TypeScript codebase. All data stays on the device.

## Features

- **Budget setup**: monthly net income, savings goal, and fixed essentials (rent, utilities,
  insurance, groceries), editable any time in Settings
- **Expense logging** with an Essential vs Discretionary toggle, category, date, and note.
  Tap any expense to edit it; deleting can be undone
- **Mood engine**: Thriving, Neutral, Concerned, Deadpan Disappointed
- **Pace bar** comparing discretionary spending so far with the target to date
- **Unplanned essentials** (emergency repairs, going over a fixed budget) lower the daily target
  for the rest of the month without hurting Penney's mood
- **Daily quote**: one line a day from the AI, with an offline line bank as the fallback
- **History**: month-by-month summary (totals, top categories), grouped by day, with filters
- **Weekly summary**: Monday–Sunday spending against daily targets, a day-by-day chart, a
  like-for-like comparison with last week, no-spend days, and Penney's verdict on the week
- **Demo presets** that show every mood instantly
- **Light and dark themes**: follows the device by default, or pick Light or Dark in Settings
- **Data safety**: saved data is validated on load, a crash screen offers recovery, and a JSON
  backup can be exported from Settings

## Requirements

- Node.js 20 LTS or newer
- For devices: the Expo Go app, or Xcode / Android Studio for simulators

## Run it

```bash
npm install
npm start          # then press i (iOS), a (Android), or w (web)
```

Or start one platform directly with `npm run ios`, `npm run android`, or `npm run web`.

To see every mood without entering data, tap **Just looking? Try a demo preset** on the first
screen, or go to **Settings → Load a demo preset** later.

## Scripts

| Script               | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `npm start`          | Start the Expo dev server                       |
| `npm run ios`        | Open in the iOS simulator                       |
| `npm run android`    | Open in the Android emulator                    |
| `npm run web`        | Open in the browser                             |
| `npm test`           | Run the Jest test suite                         |
| `npm run typecheck`  | Type-check the whole project                    |
| `npm run lint`       | Lint with the Expo ESLint config                |
| `npm run check`      | Typecheck, lint, and test (run before shipping) |
| `npm run build:web`  | Build a static web app into `dist/`             |

## AI commentary

Penney's daily line can be written by an AI model through the Anthropic Messages API. Without
configuration, or whenever a call fails or times out (8 s), he uses a built-in offline line bank,
so the app always works.

**How it behaves**

- One API call per day, plus one more only if Penney's mood changes that day. A failed call is
  retried once on the next app launch.
- The prompt includes today's date, mood, pace, the per-day budget left this month, whether an
  unplanned essential happened recently, and the **last 3 days of discretionary purchases,
  including their notes** (flattened to one line, at most 60 characters each).
- Replies are cleaned to 1–2 sentences and at most 140 characters before display.
- The persona and rules live in `src/constants/persona.ts` and
  `src/services/penney/buildPenneyPrompt.ts`.

**Configure it**

Copy `.env.example` to `.env` and set one of the following, then restart with
`npm start -- --clear`:

| Variable                          | Purpose                                                       |
| --------------------------------- | ------------------------------------------------------------- |
| `EXPO_PUBLIC_PENNEY_AI_API_KEY`   | Anthropic API key, read directly by the app (quickest)        |
| `EXPO_PUBLIC_PENNEY_AI_BASE_URL`  | Your own proxy URL; enables AI without any key in the app     |
| `EXPO_PUBLIC_PENNEY_AI_MODEL`     | Model ID (default in `src/config/aiConfig.ts`)                |
| `EXPO_PUBLIC_PENNEY_AI_ENABLED`   | `false` forces the offline line bank                          |
| `PENNEY_AI_*` (same four names)   | Same settings via `app.config.ts` → `extra` (e.g. EAS builds) |

`EXPO_PUBLIC_*` values win over `extra`.

**Before you share a build: use a proxy.** Anything in `EXPO_PUBLIC_*` or `extra` is embedded
in the app bundle, so anyone with the app can extract the key. For a build other people use,
leave the key out of the app and run a small server that:

1. accepts `POST /v1/messages` with the JSON body the app sends,
2. adds the `x-api-key` and `anthropic-version` headers on the server,
3. forwards the request to `https://api.anthropic.com/v1/messages`, and returns the response.

Then set only `PENNEY_AI_BASE_URL` (or `EXPO_PUBLIC_PENNEY_AI_BASE_URL`) to that server's
origin. Add rate limiting there, since the endpoint is public.

## Demo presets

| Preset               | Penney's mood        | Scenario                                         |
| -------------------- | -------------------- | ------------------------------------------------ |
| Saving Streak        | Thriving             | 40% under the discretionary pace                 |
| On Track             | Neutral              | Exactly on pace                                  |
| 4 Takeouts Deep      | Concerned            | Four takeouts in a row, 15% over pace            |
| Unplanned Car Repair | Neutral              | Repair yesterday; daily target drops, mood holds |
| Retail Spiral        | Deadpan Disappointed | Non-essentials 6 days running, 45% over pace     |

Presets are dated relative to today and scaled from the engine's own allowance, so they land in
the same mood on any day of any month. Loading one replaces your data (after a confirming
second tap). Hide the demo entry points with `EXPO_PUBLIC_PENNEY_DEMO_ENABLED=false`.

## How the mood engine works

1. **Daily target** = (income − savings goal − fixed essentials) / days in month.
2. Discretionary spending to date is compared with the allowance earned to date:
   - more than 5% under: Ahead → Thriving
   - within ±5%: On track → Neutral
   - up to 25% over: Slightly over → Concerned
   - more than 25% over: Over → Deadpan Disappointed
3. Frequent non-essential purchases (on 5+ days, or 8+ purchases, in the last 7 days) shift the
   mood one step worse.
4. Unplanned essentials are spread over the remaining days of the month, starting the day after
   they happen. Days already passed are never re-judged.

The weekly summary uses the same bands, comparing the week's discretionary spending with the sum
of the engine's daily targets for the days so far. Weeks run Monday to Sunday (`WEEK_STARTS_ON` in
`src/utils/weekSummary.ts`), and a week in progress is compared with the same days of last week.

Thresholds are in `src/constants/thresholds.ts`. The engine (`src/engine/`) is pure TypeScript
with no React, and is covered by tests in `src/__tests__/`.

## Project structure

```
app/                      Screens (expo-router)
  _layout.tsx             Root stack and crash screen
  index.tsx               Dashboard: Penney, quote, pace, recent expenses
  onboarding.tsx          First-run budget setup
  transactions.tsx        History: month summary, grouped list, edit/delete
  week.tsx                Weekly summary: day-by-day chart, comparison, verdict
  settings.tsx            Budget, AI status, backup, demo, reset
  demo.tsx                Demo presets
  +not-found.tsx          Unknown routes
assets/images/            App icon, adaptive icon, splash, favicon
scripts/generate-icons.py Regenerates the icons in assets/images/
src/types/                Data model and engine result types
src/constants/            Categories, thresholds, theme palettes, mood visuals, persona
src/theme/                Theme hook and themed styles
src/engine/               Pace and mood calculations
src/store/                Zustand store, persistence, load-time validation
src/hooks/                Snapshot, daily quote, today's date, undo
src/services/penney/      Prompt builder, AI provider, offline fallback
src/config/               AI and demo settings
src/demo/                 Demo presets
src/components/           UI components
src/utils/                Dates, money, parsing, validation, month and week summaries, export
src/__tests__/            Jest tests
```

## Theming

Both palettes live in `src/constants/theme.ts` and share the same tokens. Components read them
through `makeStyles` and `useTheme` in `src/theme/useTheme.ts`, so nothing hard-codes a colour.
Penney's own artwork (the gold coin and his face) is the same in both themes.

`src/__tests__/theme.test.ts` checks WCAG contrast for every text and background pair in both
palettes (4.5:1 for body text), so a palette change that hurts readability fails the tests.

## Data and privacy

- Budget, expenses, and quotes are stored locally with AsyncStorage (browser storage on web).
  There's no account and no server.
- Saved data is validated when the app loads. Unreadable records are skipped and the user is
  told, instead of the app crashing.
- **Settings → Export backup** produces a JSON file (download on web, share sheet on mobile).
- The only data that leaves the device is the AI commentary prompt described above, and only
  when AI is configured.

## Building and releasing

**App icons.** The PNGs in `assets/images/` are generated by `scripts/generate-icons.py`
(requires Python 3 and Pillow: `pip install pillow`). Run `python3 scripts/generate-icons.py`
from the project root to recreate them, or replace them with your own artwork at the same sizes.

**Web.** `npm run build:web` outputs a static single-page app to `dist/`. Configure your host
to serve `index.html` for unknown paths (an SPA rewrite) so deep links like `/settings` work.

**iOS and Android** with [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npm install -g eas-cli
eas login
eas init                                   # links the project; writes the project ID
eas build --profile preview --platform android    # installable APK for testing
eas build --profile production --platform all     # store builds
eas submit --platform ios                         # or android
```

Build numbers are managed remotely and auto-increment on production builds (`eas.json`). Bump
`version` in `app.json` for each user-facing release.

**Before the first store release**

- Change `ios.bundleIdentifier` and `android.package` in `app.json` if you want a different ID.
  They can't be changed after the first store release.
- Write a privacy policy. Both stores require one, and it should mention the AI prompt data.
- Fill in App Store privacy labels and the Google Play data-safety form to match.
- Set up the AI proxy (see above) instead of shipping a key.

## Roadmap

- [x] Data model, store, and calculation engine
- [x] Character dashboard, pace bar, daily quote, Add Expense
- [x] AI daily commentary with offline fallback
- [x] Demo presets
- [x] Settings, history with edit/delete, empty states, error handling, tests, release config
- [x] Dark mode
- [ ] Backup import
- [ ] Recurring expenses and reminders
- [ ] Multi-currency (currently CAD)

## License

Private. All rights reserved.
