# Supabase upgrade: setup and security review

**Status: REVIEW BRANCH DRAFT — NOT MERGED OR DEPLOYED.** Prepared October 22, 2026. The current public Pages website is unchanged. The user supplied public connection details and confirmed running the schema. Limited read-only/negative checks against that project now pass; successful email sign-in and authenticated two-user tests are still pending. No live financial records were read or written.

## Architecture and privacy boundary

The static frontend talks directly over HTTPS to the user's configured Supabase project. It uses standard Auth OTP, verify, refresh, user, and logout endpoints plus the PostgREST table API. There are no runtime SDK/CDN dependencies, analytics, bank integrations, or backend secrets. The Supabase project URL and public publishable/anon key are entered in the browser and stored locally; no project credentials are hardcoded into this source.

Local mode retains the existing `my-money-command-center-v1` data key. Signing in opens a separate workspace and never uploads the local workspace automatically. Each authenticated account has its own cloud cache, scoped by project URL and server-validated user ID. Original local records remain unchanged during cloud migration. Signing out restores the original local workspace.

Cloud mode intentionally sends financial data to Supabase. Supabase Auth/email infrastructure processes login emails and codes; the database holds the financial workspace. GitHub receives application source/deployment artifacts and ordinary static hosting traffic, not users' financial payloads. This replaces the earlier local-only privacy promise only when the user explicitly chooses cloud mode.

## Authentication

- Email one-time code; no passwords collected or stored by this app.
- Supabase verifies the code. Restored session identities are checked using `/auth/v1/user`; the app does not trust an unverified cached user ID.
- Access/refresh tokens live in memory and tab `sessionStorage`, never the financial data object, JSON backup, build configuration, or Git. Expired access tokens refresh using Supabase; auth failures preserve pending financial data.
- Local-scope logout removes tab credentials even if the network request fails; a failed server revocation is clearly reported. This does not deliberately sign out the other device.
- Secret and service-role keys are rejected. Only `https://*.supabase.co` project URLs without user info, ports, query strings, or other paths are accepted. Custom domains are not supported by this version.

## Database enforcement

`supabase/schema.sql` creates one `money_workspaces` row per user, including income/expense transactions, bills and paid status, categories, and budgets inside the validated JSON document. The primary key references `auth.users`. RLS is enabled and forced. Anonymous users have no table privileges. Separate SELECT/INSERT/UPDATE/DELETE policies require `auth.uid() = user_id`, with both USING and WITH CHECK for updates. A trigger prevents owner reassignment and enforces monotonically increasing revisions.

The app does not rely on a UI filter as its security boundary. Conditional writes include the last observed revision; the database returns zero rows or a duplicate-insert error on competing updates. No client upsert blindly replaces the workspace. There are no security-definer data-access functions. Supabase project administrators and service-role credentials can bypass ordinary RLS; protect the Supabase account and keep those credentials out of the app.

## Migration, offline changes and conflicts

- Importing original browser data requires an explicit migration dialog, a local backup download, the user's checkbox that the download was saved/checked, and a final account-specific confirmation.
- No automatic writes to the old local key occur during sign-in or migration. Canceling migration makes no database write.
- Migration merges record IDs and categories, deduplicates exact records, and retains existing cloud versions of conflicting IDs/budgets. The confirmation reports the conflict count; the original browser data and backup retain local alternatives. This is a conservative import, not automatic reconciliation of differing versions.
- Signed-in edits persist to a per-user device cache before upload. Connection failures retain pending edits; reconnect retries conditional writes. Full/unavailable browser storage is clearly reported, requiring immediate export of memory-only changes.
- Simultaneous changes stop automatic writes and show a conflict. Loading the cloud copy requires downloading/checking a device backup and explicit confirmation. The app does not automatically merge simultaneous offline edits.
- Other visible devices poll every 15 seconds and when refocused/reconnected; a manual Sync now button is available. This is polling, not Supabase Realtime.

## Tests completed locally

| Area | Result | Evidence / limit |
| --- | --- | --- |
| Financial calculations/import validation/sample clearing | Passed | Existing unit tests retained |
| Email-code requests, bad login, token refresh, identity restoration, logout | Passed (simulated HTTP) | `cloud.test.js`; real email delivery and hosted JWT verification pending |
| Anonymous denial and cross-user SELECT/INSERT/UPDATE/DELETE | Passed in actual local PostgreSQL engine | `rls.test.js` loads the exact schema into PGlite; Supabase auth schema/JWT claim setting is emulated |
| Unauthenticated/null-identity access and owner reassignment | Passed locally | RLS/trigger tests |
| Offline retry, conditional revisions, simultaneous writes, account caches | Passed | Unit tests and browser HTTP simulation |
| Mandatory migration backup, cancel/confirm, original local preservation | Passed | Two isolated Chromium contexts with synthetic fixtures |
| Two-device income, bills, budget and payment-status updates | Passed (simulated service) | `npm run test:browser`; not a physical iPhone or hosted Supabase certification |
| Conflict backup before loading cloud, sign-out/account switching | Passed (simulated service) | Browser tests |
| Local-only privacy/mobile regression checks | Passed | No financial network calls in local mode; updated static imports only |
| Production build at `/my-first-codex-project/` | Passed | Whitelist contains only six frontend files plus `.nojekyll` |
| Dependency audit | Passed at review time | `npm audit --audit-level=high` found no reported vulnerabilities; not a guarantee against unknown issues |

The automated unit/RLS suite currently has **27 passing tests**. Browser tests run separately. Test records, fake tokens, and email addresses in code are deliberately fictional. No actual financial records, Supabase secret keys, passwords, or live session tokens were added. Dependency versions are pinned in `package-lock.json`; test packages are not copied into the production artifact.

## Hosted checks completed after project setup

- Auth health endpoint: HTTP 200.
- Public Auth settings: email login enabled, automatic email confirmation disabled, signups enabled.
- Anonymous table access (`select=user_id&limit=0`): HTTP 401 with PostgreSQL permission code `42501`; no financial rows requested or returned.
- A deliberately invalid code for a synthetic `example.invalid` address: HTTP 403, `otp_expired`, no session returned and no email sent.

These checks confirm connectivity and the observed denial/configuration behavior. They do not prove successful login, email delivery, complete hosted RLS isolation, synchronization, or migration. No schema administration or financial writes were performed by these checks.

## Required tests still pending — do not approve deployment yet

- [x] Project public details supplied and connectivity confirmed. User reports schema applied; hosted policy definitions and authenticated behavior still need verification.
- [ ] Apply the schema, inspect policies, and verify hosted API RLS using two disposable test users.
- [ ] Check real email delivery, correct/incorrect/expired codes, session refresh and logout.
- [ ] Verify Windows Chrome + iPhone Safari against that project with synthetic records, including deletes.
- [ ] Test the real backup/cancel/confirm migration, duplicate import, and conflicting versions.
- [ ] Check offline/reconnect/conflict behavior against the hosted project.
- [ ] Review the Network panel, Supabase configuration and remaining risks below.
- [ ] User explicitly approves publishing after reviewing the results.

`scripts/check-hosted-rls.mjs` provides an opt-in hosted RLS check for a disposable project and two empty test users. It requires runtime user access tokens, refuses existing workspaces, uses only synthetic fixture rows, and cleans up its own fixtures. It has **not been run** because two verified test-user sessions have not been provided through a secure local runtime. A hosted test failure or incomplete cleanup is reported, never called a pass. Do not use a service-role key or production financial accounts to run it.

## Remaining risks and operating limits

1. Browser data/backups are unencrypted. Session tokens are readable to trusted same-origin JavaScript and potentially extensions/device malware. Other projects under the same `kistnerb1.github.io` origin share browser storage: keep that origin trusted or use a dedicated origin for sensitive use.
2. Supabase is a cloud processor, not end-to-end encrypted storage. Its database administrators/project owner can access records. Enable two-factor authentication on Supabase, GitHub, and the login email account; restrict collaborators and review deployed changes.
3. Email codes depend on email security, provider rate limits, and SMTP configuration. The built-in sender may be limited to authorized team addresses. SMTP credentials belong only in Supabase settings. No CAPTCHA flow is included; use provider protections/limits and monitor abuse.
4. Queued edits on a device are not a cloud backup until sync succeeds. Clearing site data before syncing can lose those changes. Keep private exports. Never upload financial JSON, tokens, or screenshots of real rows to public GitHub.
5. A whole-workspace revision is used, so even simultaneous edits to different fields can conflict. Reconciliation is deliberately explicit; it favors preservation over an invisible last-write-wins strategy.
6. The CSP permits HTTPS data connections to Supabase subdomains to support per-browser configuration. Application URL validation restricts the active connection, but CSP is not a substitute for trusted code. A compromised deployed app can change its policy.
7. Free-tier services may pause or enforce quotas; verify current limits and maintain exports. The local development server is HTTP and should only be used on a trusted network with synthetic data. Hosted production must use HTTPS.
8. Deleting an Auth user cascades their cloud workspace deletion. This app has no account-deletion UI; administrators should export needed records before deleting users in Supabase.

## Publication hold

The draft removes the workflow's push trigger and retains only manual `workflow_dispatch`, gated by the explicit `security_review_approved` checkbox and restricted to `main`; the review branch cannot deploy. The user authorized saving source to `supabase-review` only. No merge into `main`, GitHub Pages deployment, live schema change by this code, real account creation, or financial migration was performed for this upgrade. Existing public deployment remains on the previously approved version. Publishing is a separate action after the pending tests and user review.
