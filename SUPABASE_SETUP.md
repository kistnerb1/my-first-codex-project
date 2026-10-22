# Set up private sync with Supabase (free tier)

**Review version — not published.** The existing public website has not been changed. The source may be pushed to `supabase-review` for review. Do not merge into `main` or run a deployment until the setup and security results have been approved. Automatic deploy-on-push is removed in this draft; deployment is manual after approval.

## 1. Create your project

1. Open https://supabase.com and create an account.
2. Create a **new project** on the **Free** plan. Choose a region close to you and a strong database password. Save that password in your password manager; never enter it in this app or GitHub source.
3. Wait until the project finishes starting. In **Project Settings → API** (or **Connect → API Keys**), locate the **Project URL** (`https://…supabase.co`) and **publishable key** (`sb_publishable_…`). A legacy **anon** key also works.
4. These two project details are designed to be public. They do not grant access to financial records without a valid user login and the RLS policies below. **Never copy the secret key, service-role key, or database connection string into the app.**

This app uses standard `*.supabase.co` project addresses, not custom domains. No subscription or paid application service is required. Supabase free-tier limits, inactivity pauses, storage, and email limits still apply; review the current Free plan before entering important data. Provider pricing and dashboard labels can change.

## 2. Create the protected database

1. In Supabase, open **SQL Editor → New query**.
2. Open [supabase/schema.sql](supabase/schema.sql) in this project and copy its entire contents into the editor.
3. Click **Run**. Use a new project: this script deliberately fails rather than overwriting an existing table or policies. Do not repeatedly run it if the table already exists.
4. Open **Table Editor → money_workspaces** and verify RLS is enabled. This is one private workspace row per authenticated user. Its JSON includes transactions, income, bills, payment statuses, categories, and budgets.
5. In the SQL Editor, you can run `select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'money_workspaces';` to inspect the four owner-only policies. Do not post screenshots containing real financial rows.

You can also run [supabase/verify-setup.sql](supabase/verify-setup.sql) in a new SQL Editor query. It reads configuration only, returns seven PASS/FAIL checks and the four policy definitions, and does not read financial records or credentials. This does not replace the two-user hosted tests.

Every read, insert, update, and delete is restricted by `auth.uid() = user_id`. Anonymous users receive no table privileges. Changing the owner is forbidden. A database trigger advances revisions; the app sends conditional updates to detect simultaneous device edits. There is no frontend bypass key and no security-definer data-access function.

## 3. Enable email code login

1. Open **Authentication → Sign In / Providers → Email** (dashboard wording may vary). Enable email sign-in and keep email verification enabled.
2. Open **Authentication → Email Templates**. For **Magic Link** and, if shown separately, **Confirm Signup**, include the one-time token `{{ .Token }}` in the email body, for example: `Your My Money login code is: {{ .Token }}`. The app accepts 6–10 digit codes. Keep the token short-lived (the default is acceptable; prefer 10 minutes if available).
3. Under **Authentication → URL Configuration**, set **Site URL** to `https://kistnerb1.github.io/my-first-codex-project/`. Add this address and `http://localhost:5173/` as allowed redirect URLs for testing. The app uses manually entered codes, so it does not put tokens in URL fragments or require a redirect handler.
4. Review Supabase's email rate limits. Its built-in test email sender may deliver only to authorized organization/team addresses. Start with your Supabase account email. For other addresses, configure SMTP using a provider's suitable free allowance; enter SMTP credentials **only in Supabase's dashboard**, never in this repository. Email providers process login email/code messages, not financial records. Do not disable verification to work around delivery failures.

The first verified email code can create an account. There is no password field in the app. Never share a login code: whoever has it can access that account. Standard email-code authentication relies on your email account's security; protect it with two-factor authentication.

## 4. Preview the review version on Windows

1. Install Node.js LTS if needed. Open PowerShell in this project folder.
2. Run:

   ```powershell
   npm ci
   npm test
   npm start
   ```

3. Open `http://localhost:5173` in Chrome. If another old server already uses this port, stop that server with Ctrl+C and start this version again.
4. Expand **Connection setup** on the dashboard. Enter your **Project URL** and **public publishable/anon key**, then tap **Save connection setup**. They are stored in this browser, not sent to GitHub.
5. Enter your email and tap **Send login code**. Retrieve the code from your email, enter it, and tap **Sign in with code**.
6. An empty cloud account shows an empty workspace. **Signing in does not upload or erase your original local data.** Signing out shows that original local workspace again.

Each browser needs the project URL and public key entered once. The app stores access/refresh tokens in that tab's sessionStorage; after the tab's session ends, sign in again. Tokens never appear in backups or build output. Do not put browser session tokens in screenshots, chat, issues, or source files.

Before public deployment, you can preview on an iPhone over the same trusted Wi-Fi using the Windows machine's IPv4 address and port 5173 (see `ipconfig`). Use this only for synthetic tests: the local development address is HTTP. **Use the HTTPS GitHub Pages website for normal cloud use.**

## 5. Safely migrate your existing browser data

1. Export a backup from the original website/browser **before** switching to the review version. Each URL/browser has its own storage, so the Windows localhost copy may not contain your existing Pages data.
2. If needed, in **local mode**, import that backup into this app's local workspace. Export the current local workspace first if it contains anything you want to keep; backup-file import replaces local data only after confirmation.
3. Sign in to the intended email account. Check the email shown in the dashboard.
4. Tap **Import local data**. Review the counts; fictional examples may be included. You can cancel, sign out, clear known samples locally, and return if desired.
5. Tap **Download local backup**. Open the downloaded JSON file and keep it privately. Then check the confirmation box.
6. Tap **Review & import into cloud** and confirm the account and upload. The import merges records by ID. It keeps existing cloud versions for conflicting IDs/budgets and reports how many conflicts there are. The original local data and backup are unchanged, so you can review and re-enter any missing conflicting changes.
7. Wait for **Up to date** before switching devices. A queued or failed migration is not a confirmed cloud import. If a revision conflict appears, retain your backups and resolve it before retrying.

Migrations are never run automatically. Already signed-in cloud edits are queued locally and then uploaded automatically. Keep using the same email account on both devices. The generic backup import button is disabled from uploading directly in cloud mode: use the explicit backup-and-confirm migration flow instead.

## 6. Read sync indicators

- **Local mode:** no authentication or financial network traffic unless a previously configured tab session is being restored.
- **Checking cloud / Synchronizing:** a request is in progress.
- **Saved on this device / Waiting to sync:** changes are queued under this project and user ID.
- **Up to date:** the latest operation succeeded. The other device checks about every 15 seconds while visible; tap **Sync now** to check immediately.
- **Error / expired sign-in:** device changes stay queued. Check your connection/project, sign in again if necessary, and retry. A full/unavailable browser cache requires an immediate backup; memory-only changes can be lost when the tab closes.
- **Conflict:** both devices edited different versions of the same workspace. Neither copy is silently discarded. Download and check the device backup, then explicitly load the cloud copy. Keep both backups and re-enter the differences you need. This app does not automatically merge simultaneous offline edits.

Signing out restores the separate local workspace and removes this tab's session. User-specific financial caches remain on the device to preserve pending edits, accessible again only after that account signs in through the app. They are **not encrypted**; other code/extensions or people with access to your browser profile may read them. This is not a shared-device security vault. Offline pending changes are not synchronized until successfully uploaded.

## 7. Required live security checks BEFORE approval

The automated tests currently cover local PostgreSQL RLS and a simulated Supabase Auth/HTTP service. They are not proof your hosted project is correctly configured. Use only synthetic numbers for these checks. Record the results in [SUPABASE_SECURITY_REVIEW.md](SUPABASE_SECURITY_REVIEW.md).

1. **Authentication:** correct email code logs in; an incorrect/expired code is rejected; sign-out removes access. Close the tab and confirm that a new session requires login when no saved session is available. Verify email delivery with the addresses you will use.
2. **Two devices, same account:** enter a synthetic income, expense, bill, and budget on Windows. On iPhone, use the same project and email account. Confirm all values appear; change a bill's paid status on iPhone and confirm it changes on Windows. Confirm deletions sync too.
3. **Different accounts:** use a second test email in a separate browser profile/private window. Its cloud workspace must be empty and must never show the first user's cloud records. The app's separate pre-existing local workspace is not the cloud account.
4. **Direct database restrictions:** use the optional live test script described below to check reads without owner filters and attempted cross-user inserts, updates, and deletes. A blank UI alone is not proof of RLS.
5. **Migration:** export a local backup. Cancel once and verify nothing uploads. Then import with backup and confirmation; verify both cloud data and unchanged local data after sign-out. Try a repeated import and a conflicting ID/budget with synthetic data; existing cloud values must remain intact.
6. **Offline/conflict:** disconnect one device, change a synthetic transaction, then change the cloud from the other device. Reconnect: the first device must show a conflict and preserve its edits. Download its backup before explicitly loading the cloud copy.
7. **Network/secrets:** in Chrome DevTools → Network, confirm financial requests go only to your configured HTTPS `*.supabase.co` project. GitHub serves static application files. Check no database password/service-role key is present in source, build files, or request headers. The public `apikey` and the signed-in user's Bearer token are expected for Supabase.

### Optional automated hosted RLS check

Use a **separate disposable test project** with the supplied schema and two verified synthetic users. Never use real financial workspaces: the test creates and removes fixture rows. From a secure local terminal, set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MMCC_TEST_USER_A_ACCESS_TOKEN`, and `MMCC_TEST_USER_B_ACCESS_TOKEN` as environment variables. Access tokens can be retrieved from your own test sessions in browser DevTools → Application → Session Storage. These are credentials: do not paste them into chat, commit them, or leave them in terminal history. Set `MMCC_ALLOW_TEST_WRITES=yes`, then run `npm run test:live`. It refuses to run against accounts with existing data and reports results without printing tokens or records. Remove those variables afterward. If you are uncomfortable handling test session tokens, ask for help with this step; do not replace them with a service-role key.

## 8. Review, then publish only when you approve

Do **not** merge into `main` or deploy until all live checks above pass and you have approved the setup/security report. The source is being saved to the separate `supabase-review` branch for browser-based review; `main` remains unchanged. After live checks pass and you approve merging the reviewed changes into `main`, the manual **Deploy My Money Command Center** workflow can be run with **security_review_approved** checked. It no longer triggers automatically on push in this draft. The deployed files contain application code only; project setup is entered per browser, and financial records remain in Supabase and device caches.

After the approved deployment succeeds, open `https://kistnerb1.github.io/my-first-codex-project/` in Windows Chrome and iPhone Safari, refresh, configure the same project URL/public key, and log in with the same email. Run the final same-account test on the deployed HTTPS site before migrating actual records.
