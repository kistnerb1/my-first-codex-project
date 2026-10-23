# Production-readiness and security review

Date: October 23, 2026. Branch: `supabase-review`. Starting revision: `051e64f`.

**Recommendation: NO-GO for public deployment until the hosted checks below are completed.**

The user confirmed successful real magic-link login and computer-to-iPhone synchronization with the **same** account. That is positive functional evidence, but does not establish isolation between two different users. No authenticated test sessions were available in this environment. I did not ask for passwords, login links or tokens in chat, create real accounts, send login emails, or read/write real financial rows.

No changes from this review were pushed, merged into `main`, or deployed. The existing website remains unchanged.

## Findings fixed locally

### 1. Samples could be included in a confirmed migration

Previously, login did not migrate data automatically and migration required a downloaded backup plus confirmation, but confirming could still include fictional examples. This was insufficient protection against accidental sample uploads.

Fixes:

- `prepareCloudMigration()` clones the original data and excludes marked samples, recognizable legacy sample transactions/bills, and marked/default example budgets before merging.
- The confirmation reports how many possible examples were excluded. The original local workspace and backup retain every original record.
- A sample-only or empty migration performs no financial write.
- `SupabaseClient.write()` rejects explicitly marked sample workspaces, entries and budgets before any financial request.
- Legacy recognition is intentionally conservative. A genuine record that exactly matches an old example may be excluded from migration; it is kept locally and can be reviewed/re-entered in the cloud. Arbitrary edited/unmarked fictional data cannot be identified with certainty: inspect the backup before importing. This is a safeguard, not automatic truth detection.

The sample matching used by the local UI and migration now shares a helper. No existing browser/cloud records were automatically modified by this review.

### 2. Sign-out with unreadable original local data

If the original local workspace failed to parse after sign-out, the old flow could leave the previous cloud workspace rendered (though interaction was blocked). The repaired flow clears the rendered cloud view, preserves the corrupt original storage without overwriting it, blocks local editing, and displays a recovery message. The user may sign back in to cloud mode; original local recovery requires restoring valid storage from a private backup. The normal sign-out path still restores the original local workspace.

### 3. Production-path validation was not part of release CI

Added `npm run test:production`: a desktop/mouse browser test under the exact origin/path `https://kistnerb1.github.io/my-first-codex-project/`. Static files and synthetic Supabase responses are intercepted, so it does not deploy, contact the live Pages app, or send real records. It verifies relative assets, magic-link `redirect_to`, callback URL cleanup, session reload and existing financial/sync features. The guarded deployment workflow now runs this simulation before upload.

## Evidence and status

| Requirement | Result | Evidence and limit |
| --- | --- | --- |
| Per-user RLS | PASS locally; HOSTED TWO-USER TEST PENDING | Exact schema tested in PostgreSQL/PGlite with two distinct user IDs and authenticated roles. Cross-user SELECT/INSERT/UPDATE/DELETE, null identities, owner reassignment and stale revisions are denied. The auth schema/claims are emulated, so this is not hosted JWT authentication proof. |
| Live anonymous denial | PASS | Current project returned HTTP 401, PostgreSQL permission code `42501`, for a zero-row table request. No financial rows requested/returned. |
| Live forged token denial | PASS | Current project returned HTTP 401, `PGRST301`, for an invalid synthetic Bearer token. |
| Live Auth availability | PASS | Health endpoint HTTP 200. |
| Two-device real sync/login | USER-CONFIRMED | User confirmed one account works on computer and iPhone; two distinct hosted accounts have not been tested. |
| Committed credentials/data | No findings | All 8 fetched reachable commits / 68 historical file blobs scanned for private keys, Supabase secret/service-role keys, GitHub/AWS credentials, credential-bearing database URLs and private-record filenames. Source/fixtures reviewed: financial examples are fictional. No actual project key is hardcoded in source. All current author/committer emails use noreply addresses. |
| Public-key handling | PASS in source and anonymous check | Only publishable/legacy anon keys accepted; secret/service-role keys rejected; public config stored per browser and verified before activation. Financial calls require a user Bearer token; the public key is not an authorization boundary. |
| Auth/session/expired links/logout | PASS automated; LIVE EDGE CASES PENDING | Server-validated callback identity, URL cleanup, session reload/refresh, bad/expired callbacks, fresh-link action, local logout cleanup even on network error, and sign-out view recovery tested. Real expired/used links, refresh/revocation and browser handoff need live confirmation. Supabase access JWTs can remain valid until expiry even after refresh-session revocation. |
| Automatic sync | PASS automated; normal live sync user-confirmed | Serialized revision-checked writes, pending cache, retry, refresh on focus, offline conflicts and recovery tested. Visible devices also poll every 15 seconds. No silent last-write-wins. |
| Sample safety | PASS after fixes | Marked/legacy filtering preserves originals; sample-only migration generates zero financial writes; transport refuses marked samples. Unknown unmarked examples still require human review. |
| Mobile + desktop UI | PASS automated; previous live use user-confirmed | 13 phone-sized Chromium setup scenarios plus full mobile-touch and desktop-mouse suites. Real iPhone Safari/Chrome must smoke-test these new local fixes. WebKit automation remains unavailable because official downloads were blocked by the environment. |
| Pages path and auth redirect construction | PASS simulation; PROJECT SETTING PENDING | Exact HTTPS production origin and `/my-first-codex-project/` tested; no hardcoded root asset paths. Actual Supabase redirect allowlist/Site URL cannot be inspected/changed with the public key. |
| Deployment controls | PASS source checks | Manual-only workflow; both jobs require `main` plus explicit `security_review_approved`; review-branch pushes cannot deploy. Source contains no financial payloads; artifact whitelist is six frontend files plus empty `.nojekyll`. |
| Dependencies | PASS at review time | `npm audit --audit-level=high`: zero reported vulnerabilities. Pinned dev dependencies are not shipped in the artifact. |

A successful same-account sync or a blank second-account UI does **not** replace direct hosted API authorization tests. Likewise, a simulation using the production origin does not verify Supabase's deployed redirect settings or actual post-deployment behavior.

## Commands run

- `npm test`: **37 passed, 0 failed, 0 skipped**.
- `MMCC_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: **13 connection scenarios passed**, plus the full synthetic mobile auth/sync/migration/financial suite. Includes expense creation/deletion syncing, automatic refresh on focus, bill paid-status changes, budgets, calculator result, offline replay, conflict backup, sample-only migration and corrupt-local sign-out behavior.
- `MMCC_CHROMIUM_PATH=/usr/bin/chromium npm run test:production`: full isolated **desktop/mouse** suite passed under the exact production origin/path.
- `npm audit --audit-level=high`: zero reported vulnerabilities.
- `git diff --check`: passed.
- Git history integrity, reachable-file credential-pattern scan, static artifact whitelist, deployment approval guards: passed.
- `npm run test:connection` is included in the browser suite; it was not redundantly rerun separately.
- `npm run test:live`: **NOT RUN**. Requires two authenticated disposable users; prerequisites absent. Not reported as a pass or silently skipped.
- WebKit/Safari automation: **NOT RUN**. Official browser-download domains were previously rejected by the environment; no physical Safari session is attached.

No current test or build failure remains in the checks that could run. Secrets scanning is a focused review, not a guarantee against arbitrary unknown secret formats. Scope is fetched Git branches/tags and current source; GitHub provider caches, forks, issue attachments and account settings are not audited. Earlier unreachable author-email copies may remain in provider caches as previously disclosed; no financial/secret credential leakage was found in the reviewed history.

## Required publishing gates

1. **Hosted two-user RLS test on the target project.** Use two new, verified, empty disposable test users. Run `npm run test:live` with the public project config and those users' access tokens supplied only through a secure local/Codespaces runtime, never chat/Git. The harness refuses existing workspaces, confirms unfiltered reads expose only the owner, attempts cross-user insert/update/delete against synthetic fixtures, checks revision conflicts, and cleans up only its fixtures. Keep result evidence and verify cleanup. Do not substitute a service-role key or your populated financial accounts. A separate test project is useful but cannot prove the production project's policies.
2. **Supabase URL configuration.** In the dashboard, verify the exact production redirect `https://kistnerb1.github.io/my-first-codex-project/` is allowed. Plan the production Site URL accordingly. Keep the review URL allowlisted while testing; do not rely on a broad wildcard or fallback. Request fresh emails after changes; old emails retain old destinations. Public config/session/browser data are separate on the Codespaces and Pages origins.
3. **Live auth edge cases and migration.** After the user approves making these local fixes available for review, test fresh and reused/expired links, reload, logout/re-login, offline recovery and the revised sample-excluding migration with synthetic data in desktop Chrome and iPhone Safari/Chrome. Verify both devices use the same intended project/email, no automatic local migration occurs, and actual local records remain unchanged. Confirm the production redirect flow with synthetic data immediately after an eventual approved deployment, before migrating real records.
4. **Final approval.** Review these fixes and the hosted results, then explicitly authorize any push/merge/deployment. None is performed by this review. The final production workflow remains manual and guarded.

## Accepted-design risks to understand

- Financial JSON exports and browser caches are unencrypted. Pending edits must successfully sync or be exported before clearing browser data. Full/unavailable storage needs immediate export.
- Signing out removes tab credentials and the cloud view, but account caches remain on the device to preserve pending work; the original separate local workspace is normally shown. This app is not a shared-device vault.
- Other projects on the same `kistnerb1.github.io` origin can potentially read origin-wide browser storage, including tab session tokens where accessible. Keep that origin trusted or use a dedicated origin for sensitive use. A compromised browser/extension or deployed script can undermine client-side privacy.
- Supabase is a cloud processor; project admins/service-role credentials can bypass ordinary RLS. Protect Supabase, GitHub and email accounts with strong access controls/MFA. This is not end-to-end encrypted storage.
- Email delivery limits/link scanners, free-tier quotas/pauses, and simultaneous offline edits can interrupt service. Maintain private backups. No analytics or external font services are used.

**Publishing decision: NO-GO today because hosted cross-user isolation is still unverified and production redirect/live edge-case checks are incomplete.** Source-level fixes and available tests are ready for review; there is no evidence here of a remaining demonstrated cross-user breach, but absence of that evidence is not a substitute for the pending test.
