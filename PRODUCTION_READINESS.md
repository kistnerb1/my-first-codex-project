# Production release readiness — October 23, 2026

Branch: `supabase-review`. Application baseline: local commit `cf6bb8c`, including the latest security and production-readiness fixes. No merge into `main` is needed to prepare or test this candidate. This preparation changes documentation only; the application fixes are already incorporated in the branch.

**Recommendation: GO on the application checks; deployment is blocked by environment access to GitHub’s API.** The user confirmed the exact production Site URL and Redirect URL, retained the Codespaces allowlist entry, and explicitly approved publishing. All automated suites were rerun successfully after approval. No failing automated test or newly demonstrated application security defect remains. Actual production-origin authentication/sync still requires a post-deployment smoke test. The environment proxy returns HTTP 403 for `api.github.com`, even after a network permission grant, preventing workflow dispatch/status verification. Git fetch works. The reviewed release is being committed on `supabase-review`; do not change `main` or claim deployment success while API access is blocked.

## Current evidence

The user reports successful hosted two-user isolation (PASS), computer-to-iPhone cloud synchronization, magic-link sign-in/sign-out/sign-in again, and saving a fictional transaction, refreshing, then deleting it. These are accepted as **user-confirmed live results**, not tests rerun by this environment. No passwords, tokens, login links, or personal financial records were requested or captured. The environment still has no two-user authenticated sessions; it did not rerun the opt-in hosted write test.

| Release check | Current result |
| --- | --- |
| `npm test` | 37 passed, zero failures/skips, including exact-schema local PostgreSQL RLS checks |
| `MMCC_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` | All 13 mobile connection scenarios and the complete synthetic mobile-touch auth/sync/migration/financial suite passed |
| `MMCC_CHROMIUM_PATH=/usr/bin/chromium npm run test:production` | Complete desktop/mouse suite passed at the isolated exact permanent origin/path |
| `npm audit --audit-level=high` | Zero reported vulnerabilities |
| Current source and available Git history scan | No credential-pattern or private backup filename findings across 9 reachable commits / 81 historical blobs; current source also checked |
| Hosted two-user isolation | PASS, reported by user; not independently rerun here |
| Live device sync, login/logout/re-login, fictional transaction save/reload/delete | PASS, reported by user |
| Actual Supabase production URL allowlist / Site URL | Exact production URL saved and confirmed by user; Codespaces URL remains allowed |
| Actual permanent-URL email callback and device synchronization | Not yet live-tested against this unpublished candidate; post-deployment smoke test required |

The scan covers reachable local Git objects, current source, and available refs; it does not inspect un-fetched remote objects, GitHub caches/forks/issues, or arbitrary external systems. Pattern scanning cannot establish that every unknown secret format is absent. Source and fixture review found only fictional financial examples, no actual financial records. No project-specific public key is hardcoded. No analytics, remote scripts, banks, or third-party fonts were found in runtime code. Financial requests go to the configured HTTPS Supabase project only when cloud mode is used; exports use local Blob downloads.

## Exact permanent URL and authentication behavior

The user confirmed both **Supabase → Authentication → URL Configuration → Redirect URLs** and **Site URL** are saved as this exact address, including the repository path and trailing slash:

`https://kistnerb1.github.io/my-first-codex-project/`

Keep that production **Site URL** and the exact Codespaces review URL allowlisted during review. The public publishable key cannot inspect or modify these dashboard settings. Do not rely on a broad wildcard or email links generated before a configuration change.

The production-origin browser suite verifies relative assets/imports, the exact `redirect_to`, auth callback validation and URL cleanup, expired-link recovery, same-tab session restoration after refresh, logout, conditional sync, and account separation. Responses are synthetic and intercepted; this does not test Supabase's real redirect allowlist or the deployed public website.

Access/refresh tokens use tab `sessionStorage`, so reload restoration is supported; closing a tab/browser session may require signing in again. The app is not configured for indefinite login persistence. Pending financial changes remain in per-account local caches. Codespaces and GitHub Pages are different origins: public connection setup, local records, and login sessions do not transfer automatically. Each production browser must save its public project URL/key and sign in. Existing Pages-origin local financial data is retained; do not import it until a private backup has been checked.

## Included security and migration fixes

- Default Supabase magic-link sign-in, validated callback handling, expired/used-link guidance, session restoration/refresh, and logout cleanup.
- Mobile connection saving with case-preserving clipboard normalization, explicit validation, storage readback, and visible failure messages.
- Marked and recognizable legacy sample filtering before confirmed migration; original local records remain unchanged. Sample-only migration performs no financial write; the transport rejects marked samples.
- Signing in opens a separate account workspace and performs **no automatic local migration**. Migration requires a downloaded backup, saved/checked acknowledgement, and account-specific confirmation. Edited/unmarked fictional records cannot always be distinguished from genuine entries; review the backup before confirming any import.
- Sign-out clears the cloud view even if original local storage is corrupt, preserves original bytes, and blocks unsafe local editing.
- Owner-scoped RLS schema, owner-change protection, revision-checked writes, pending/offline cache, and explicit conflict backup/recovery remain intact. No schema modification is part of this release preparation.

## Exact approved website artifact

The website artifact is **only** these seven files, generated in `dist/`:

- `index.html`: dashboard, account setup/login, migration and recovery dialogs.
- `style.css`: desktop and phone layouts.
- `app.js`: financial dashboard, charts, CRUD, calculator, local storage and backup controls, fictional example generator.
- `finance.js`: calculations, validation, escaping, and sample identification/clearing.
- `cloud.js`: public config validation, auth/session handling, migration preparation, revision-checked synchronization.
- `cloud-ui.js`: authentication/sync UI, explicit migration confirmation, status/error indicators.
- `.nojekyll`: empty GitHub Pages marker.

This would replace the existing local-only public app at the permanent URL with the optional Supabase-enabled version. The fictional sample amounts are included in source; actual browser records, cloud database contents, session tokens, backup files, service-role keys, passwords, tests, documentation, schema SQL, and `node_modules` are not in the website artifact. No personal financial records are packaged.

The user-approved repository push/merge would also make the source, tests, documentation, guarded GitHub Actions workflow, and schema/setup SQL available in the repository. These support files are not served in the Pages artifact. The SQL is setup documentation and is not executed automatically by deployment. No merge or deployment was attempted while GitHub API access remained blocked.

The workflow is manual-only. Both jobs require `main` and the explicit `security_review_approved` input. It runs unit, mobile browser, and production-origin checks before uploading only `dist/`. A review-branch push cannot deploy through this workflow; dependency lockfile and pinned development dependencies are retained.

## Remaining release steps and limits

1. Restore this cloud environment’s permitted access to `api.github.com` so the existing workflow can be dispatched and its completion verified. No credentials need to be pasted into chat.
2. With the existing user approval, push the reviewed release, merge into `main`, and dispatch `deploy-pages.yml` on `main` with `security_review_approved=true`. Stop if a check or deployment job fails. Production URL configuration and publishing approval are already confirmed; do not request them again.
3. Immediately after an approved deployment, use fictional data to test a fresh production magic link, refresh/session restoration, sign-out/re-login, and computer-to-iPhone synchronization. Confirm no automatic local migration, then delete the fictional test record. If callbacks fail, inspect the exact URL settings before migrating real records.

Real iPhone use is user-confirmed; automation here uses Chromium mobile emulation and desktop Chromium, not Safari/WebKit. Reused/expired-link behavior, offline replay and migration guards pass simulation; real email scanning/expiry, free-tier availability and browser-specific behavior can still differ.

Accepted design risks remain: local caches/JSON exports are unencrypted; account caches survive logout to protect pending edits; Supabase administrators can bypass ordinary RLS; access JWTs may remain valid until expiry after logout; browser extensions or compromised code can access browser data. Other applications hosted on the same `kistnerb1.github.io` origin share its storage security boundary. This is not end-to-end encrypted cloud storage. Keep device, email, GitHub, Supabase access, and private backups protected.
