# Day 2 — Pages workflow and backup re-verification

Executed November 11, 2026. Fresh branch `day2/github-pages` from merged main
`0e00b94` (Day 1 PR #2).

## Deployment change

- `.github/workflows/pages.yml` checks, builds, and uploads the Pages artifact on
  main pushes and PRs; deployment runs only on main (also available by manual dispatch).
- `PENNEY_WEB_BASE_URL=/penney` opts the existing Expo config into the project path.
  The workflow smoke check verifies that bundle URLs use that prefix and files exist.
- `404.html` serves the SPA for direct routes; these fallback requests retain HTTP 404
  status, as expected on Pages. `.nojekyll` keeps the exported files intact.
- Pages write and OIDC permissions are scoped to the deploy job. No deploy secret is added.
- Pages settings were not changed. Amartya must enable GitHub Actions as the Pages source
  separately after merge; the production deployment and live URL remain unverified.

## Local validation

- Typecheck and lint passed; all 203 Jest tests across 13 suites passed.
- Pages-prefixed web export passed and its generated bundle paths/files passed the smoke check.
- Actionlint 1.7.7 accepted both workflow files; `git diff --check` passed.
- Playwright with system Chromium exercised the exported app under `/penney/`, using a
  local server that returned the exported `404.html` for missing routes and synthetic data:
  1. Fresh-context file restore: budget and expense matched browser storage.
  2. Export download: parsed JSON budget and expenses matched the restored fixture.
  3. Invalid pasted text: readable rejection; stored expenses unchanged.
  4. Valid pasted replacement: first tap preserved data; second tap replaced it.
  5. Undo restored the original budget and expense.
  6. Merge skipped both an existing ID and the same purchase under a different ID,
     added exactly one new expense, and disabled re-import when nothing was new.
  7. Reload preserved two expenses and the category limit; direct route fallback loaded.
- All browser checks passed with no uncaught page errors. No backup/restore product fix needed.

## Limits

Hosted CI results are linked in the PR/daily log. A local Pages-style server does not verify
production hosting. Native share-sheet/document-picker checks were not attempted and remain
unverified: an iOS/Android device or simulator is required.
