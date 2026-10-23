# Live two-user isolation test procedure

The user has now reported a successful live two-user isolation test (PASS). This environment did not independently rerun it and has no two-user authenticated sessions. This procedure is retained for safe future retesting, not as a remaining uncompleted isolation gate. See PRODUCTION_READINESS.md for the current publishing decision. No service-role key or database password is needed.

## 1. Open the review version

Use your existing Codespace on `supabase-review`, not the public website. Keep the app running with `npm start` and open its forwarded preview. In Supabase **Authentication → URL Configuration → Redirect URLs**, allow that exact HTTPS preview address, including its trailing slash. Do not merge or deploy anything.

## 2. Create two disposable users

Use two separate email addresses whose inboxes you control. Never use your personal finance account. Supabase must create two different user IDs; two devices signed into one email are not two users. If the default email sender restricts recipients, use permitted test recipients; do not disable verification to bypass this.

On Windows Chrome, use two separate Chrome profiles (or a normal window and an Incognito window). In each, open the review preview, save the same Supabase project URL and **public publishable key**, and sign in with a different test email. Open each email link in its matching browser profile. Keep both signed-in app tabs open. Do not add financial records, import a backup, or migrate local data. The test refuses accounts that already have a cloud workspace.

## 3. Obtain the two short-lived test access tokens privately

In each signed-in app tab, press **F12**, select **Application → Session storage**, and select the preview origin. Find the entry:

`mmcc-auth:https://nbngszwevcnmuchgudky.supabase.co`

Its JSON value contains `access_token`. Copy only that field's value, without quotation marks. Use A's value at the A prompt below, then B's at B's prompt. Do not copy the `refresh_token`, the entire JSON, or an email link. Do not paste tokens into chat, GitHub, source files, screenshots, or terminal commands. These tokens grant access to the disposable account while valid. If the entry is absent, sign in again in that same tab.

## 4. Run from the Codespaces terminal

The existing `scripts/check-hosted-rls.mjs` runner is used; no new guide files need to be pushed to execute it. Open a second terminal in your repository, leaving the app server running. Run `bash` first if your terminal is not Bash. Then paste this entire block. Values are entered at prompts, not as shell commands; token input is hidden. The subshell discards variables when finished. Do not enable shell tracing or terminal recording.

```bash
(
  set +x
  read -r -p 'Supabase project URL: ' SUPABASE_URL
  read -r -s -p 'Public publishable key: ' SUPABASE_PUBLISHABLE_KEY
  printf '\n'
  read -r -s -p 'User A access token (hidden): ' MMCC_TEST_USER_A_ACCESS_TOKEN
  printf '\n'
  read -r -s -p 'User B access token (hidden): ' MMCC_TEST_USER_B_ACCESS_TOKEN
  printf '\n'
  export SUPABASE_URL SUPABASE_PUBLISHABLE_KEY
  export MMCC_TEST_USER_A_ACCESS_TOKEN MMCC_TEST_USER_B_ACCESS_TOKEN
  MMCC_ALLOW_TEST_WRITES=yes npm run test:live
)
```

Use `https://nbngszwevcnmuchgudky.supabase.co` at the URL prompt and your existing public publishable key at the key prompt. No Node.js installation on Windows is necessary; this runs inside Codespaces. Clear your clipboard afterward.

## 5. Interpret results and clean up

The runner validates both tokens against Supabase, requires distinct authenticated user IDs, and refuses writes if either user already has visible workspace data. It creates only temporary empty fictional workspaces and a fictional Groceries budget of 123. It tests anonymous denial, unfiltered own-only reads, and direct attempts to read, insert, update, and delete the other user's row **in both directions**. It also checks an own-record update and stale-revision rejection. It never loads or imports browser financial data.

Expect `PASS: hosted JWT-authenticated identities...` and a successful command exit. A PASS line followed by a cleanup error is **not** a complete pass. Cross-user reads/updates/deletes normally return zero rows rather than a permission error; the runner checks that behavior. Cross-user insertion must be denied.

If it reports existing data, stop and create genuinely new disposable accounts; do not delete or repurpose your personal account's data. If a token has expired, sign in again and repeat with fresh tokens. If any isolation assertion fails, do not publish. Share only the generic failure message, never tokens or financial records.

The runner attempts to delete its marked fixtures in `finally`, including after failure. Abruptly closing the terminal, network failure, or broken policies can prevent cleanup. In Supabase **Table Editor → money_workspaces**, inspect only the two disposable users' IDs and confirm their fixture rows are absent. If manual cleanup is necessary, delete only their marked test rows. Then in **Authentication → Users**, delete only the two disposable accounts and sign out of their browser profiles. Never bulk-delete users or table rows. Share only PASS/FAIL and whether cleanup succeeded.

## Production redirect configuration

Add this exact address to Supabase **Authentication → URL Configuration → Redirect URLs**:

`https://kistnerb1.github.io/my-first-codex-project/`

Include the repository path and trailing slash. Keep the review preview address allowed during testing. Once production publication has been approved, use the same production address for **Site URL**. Adding an allowlist entry does not deploy the app; do not use the current public local-only website to test the unpublished authentication code. Request a fresh sign-in email after changing redirect settings.

## Remaining release gates

A successful local PostgreSQL policy test or same-account device sync does not substitute for this hosted two-user test. A future rerun must confirm hosted two-user isolation and fixture cleanup; the current live isolation PASS is user-reported. Production magic-link redirects also need a live check after an approved deployment. Follow the other release gates in PRODUCTION_READINESS.md; this procedure does not authorize a push, merge, or deployment.
