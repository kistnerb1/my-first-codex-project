# My Money Command Center

A phone-friendly personal finance dashboard for income, expenses, bills, budgets, available cash, and what-if calculations. Includes editable transactions, confirmed sample clearing, and JSON backups.

**Supabase sync upgrade is a review draft. It has NOT been published.** This version is being saved to `supabase-review`; `main` and the existing GitHub Pages site remain unchanged. Do not deploy until the setup and security tests have been reviewed and approved.

## Start on Windows

Install Node.js LTS, then open PowerShell in this project folder:

```powershell
npm ci
npm test
npm start
```

Open `http://localhost:5173` in Chrome. Stop with Ctrl+C. The runtime has no external JavaScript packages; pinned development packages are used for security/browser tests. `npm run build` creates the static `dist/` directory for GitHub Pages at `/my-first-codex-project/`.

## Local mode or private cloud sync

Local mode keeps records in this browser with no financial uploads. **Optional cloud mode** uses your Supabase project for verified email-code authentication and a per-user RLS-protected database. It sends financial records over HTTPS to Supabase, not GitHub. There are no ads, analytics, bank connections, or third-party font requests.

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for the free-tier project setup, email login, safe backup-and-confirm migration, sync indicators, and required live tests. See [SUPABASE_SECURITY_REVIEW.md](SUPABASE_SECURITY_REVIEW.md) for exactly what has passed and what is still pending.

Your original local browser workspace is kept separately from cloud account caches. Signing in never migrates local data automatically. Existing browser records are not erased by this update. Migration requires downloading/checking a backup and confirming the cloud account. Signing out restores the original local workspace. Unsynced account changes remain in a user-specific device cache.

Never put financial backups, passwords, SMTP credentials, Supabase secret/service-role keys, or session tokens in GitHub. The app accepts only a public publishable/anon key. GitHub Actions deploys application files, not users' records. Downloaded JSON and browser caches are unencrypted; keep your devices and backups private. Any future change to deployed code or another app on the same GitHub Pages origin may affect browser privacy.

## Everyday use

Use **Add income**, **Add transaction**, and **Add bill** for your own numbers. Tap a transaction to edit or delete it. **Edit budgets** sets repeating monthly category limits and adds categories. Paid/unpaid badges update bills. **Clear sample data** reviews examples before confirming; uncertain older samples start unchecked. Editing a sample treats the changed item as your own. **Restore sample data** is available only in local mode and asks before replacing data.

Available cash = recorded monthly income − everyday expenses − paid bills − unpaid bills. Record a bill in Bills & payments only, not again as an expense. This is a monthly cash-flow estimate, not a bank balance: it has no opening balance/carryover. Currency is USD. What-if adjustments change only the estimate.

**Export backup** downloads the current workspace locally. Imports are read locally. In cloud mode use the explicit **Import local data** flow before uploading. Each browser/address has separate original local data. Use backups to move old data from another address, and configure the same Supabase project/email on both devices for cloud sync.

## Tests and publication

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

`npm test` runs finance/import tests, auth/HTTP simulations, sync/conflict tests, and real PostgreSQL RLS tests using PGlite with an emulated Supabase auth schema. Browser tests use an intercepted synthetic Supabase HTTP service; they never contact a real project. On cloud Linux, use `MMCC_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` if a system Chromium is installed. Hosted tests require a disposable project; see the guide before `npm run test:live`.

Automatic Pages deployment is disabled in this draft. After explicit approval and live security validation, push the reviewed source to GitHub and manually run **Actions → Deploy My Money Command Center → Run workflow → main**, checking **security_review_approved** only after approval. Wait for build/deploy success, then open `https://kistnerb1.github.io/my-first-codex-project/`. No local server is needed for the published site.

The earlier local-only privacy report is preserved in [SECURITY.md](SECURITY.md) as history. The Supabase review supersedes its local-only network claims for the optional cloud mode.

## Test in your browser with GitHub Codespaces

1. Open this repository on GitHub and select the **supabase-review** branch.
2. Click **Code → Codespaces → Create codespace on supabase-review**.
3. In the browser terminal run `npm ci`, then `npm start`.
4. Open the **Ports** tab, forward **5173** if needed, keep visibility **Private**, and click **Open in Browser**.
5. Enter your Supabase project URL and public publishable key in **Connection setup**, then use email-code login. Never enter a secret/service-role key. Use synthetic records until the hosted security checklist passes.
6. Open the same private forwarded address on iPhone while signed into GitHub. Configure the same Supabase project and log in with the same email. Stop the Codespace when finished to conserve its free allowance.

This requires no Node.js installation or project download on Windows. The review branch workflow cannot deploy from `supabase-review`, even if manually requested. No merge or Pages deployment is part of review-branch creation.
