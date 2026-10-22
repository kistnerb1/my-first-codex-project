# My Money Command Center

A free, responsive personal finance dashboard for today's money. No signup, bank connection, subscription, or backend database. Includes editable income and expense transactions, bills with payment status, custom spending categories and budgets, cash flow charts, a what-if calculator, and JSON backups.

## Preview on Windows

Install the free current Node.js LTS release from https://nodejs.org. Open this project folder in PowerShell, then run:

```powershell
npm start
```

Open **http://localhost:5173** in Edge, Chrome, or Firefox. No `npm install` is required: the application and server use no third-party packages. Stop the server with Ctrl+C. Run calculation and backup validation tests with `npm test`.

## Preview on iPhone

Keep the Windows server running, connect both devices to the same trusted Wi-Fi, and run `ipconfig` in PowerShell to find your computer's Wi-Fi IPv4 address. In Safari, open `http://YOUR-PC-IP:5173`. If Windows asks, allow Node.js on your private network. The computer must remain awake; do not expose this development server to the public Internet. Alternatively, use the free GitHub Pages deployment below to access the app without your computer running.

## Using your own numbers

Sample entries use the month when the application first opens. Edit or delete them and add your real income, transactions, and bills; select another month to see or add entries there. Use **Edit budgets** to change category limits and add categories. Category budgets repeat monthly. Use **All transactions** to filter income or expenses. Click a bill's paid/unpaid badge to change its status, or use its edit/delete buttons.

Available cash = recorded monthly income − everyday expenses − paid bills − unpaid bills. This reserves money for unpaid bills. Record a bill only in Bills & payments, not again as an expense. This is a monthly cash flow estimate: it does not include bank balances, opening balances, or money carried over from other months. Enter income when appropriate for your own monthly tracking. The what-if calculator changes the estimate only; a negative adjustment models savings and a positive adjustment models increased spending or payments. Currency is USD.

## Storage and backups

Financial data is saved in this browser's localStorage. It is not sent to a server. It is not encrypted; anyone with access to your browser profile may access it. Private browsing, clearing site data, or switching browsers/addresses can remove or separate saved data. The application requires JavaScript and a local or hosted web server; don't open index.html with a file:// URL. The app uses system fonts and has no third-party font, analytics, or tracking requests.

Use **Export backup** regularly, especially before replacing data. Store the JSON file privately. **Import data** validates a backup and asks before replacing your current data. Export on one device and import on another to transfer numbers; devices do not automatically sync. Localhost, a Wi-Fi address, and GitHub Pages each have separate browser storage. Never commit financial backups to GitHub.

## Save the project to GitHub

From this existing repository folder:

```powershell
git status
git add index.html style.css app.js finance.js finance.test.js server.mjs package.json README.md .gitignore
git commit -m "Build My Money Command Center"
git push origin HEAD:main
```

These commands explicitly update `main` from your current branch. If you prefer a pull request, use `git push -u origin HEAD` and open a pull request on GitHub. Authenticate through Git's normal GitHub sign-in if prompted. Review `git status` first and keep personal backup files out of commits.

## Publish your free website (beginner steps)

The production site is designed for **https://kistnerb1.github.io/my-first-codex-project/**. All stylesheets, scripts, and module imports use relative paths, so they load correctly under `/my-first-codex-project/`. No bank data is uploaded. The workflow uploads only the four application files and `.nojekyll` from `dist/`, never your development server, Git history, or financial backups.

1. Open https://github.com/kistnerb1/my-first-codex-project in Chrome.
2. Click **Settings**, then **Pages** in the left sidebar.
3. Under **Build and deployment**, change **Source** to **GitHub Actions**. You do not need to choose a branch or paste a workflow: it is already included in `.github/workflows/deploy-pages.yml`.
4. Click the repository's **Actions** tab. Choose **Deploy My Money Command Center** on the left, then **Run workflow**, select **main**, and click the green **Run workflow** button. If GitHub asks you to enable Actions, enable them for this repository first.
5. Open the new run and wait for both **build** and **deploy** to show green check marks. This usually takes a few minutes. If a run failed before Pages was enabled, rerun it after step 3.
6. Open **https://kistnerb1.github.io/my-first-codex-project/** in Chrome. Include the repository name and trailing slash. Bookmark that address; no localhost or running Windows server is needed.

Later pushes to `main` automatically test, build, and deploy updates. A manual run must use a branch containing the workflow. If the address shows 404, confirm the deployment finished and check **Settings → Pages** for the published address. Free Pages is available for public repositories. Private-repository Pages requires an eligible GitHub plan; if yours is private, use a public source-only repository for free hosting after reviewing what is published.

Your browser data is separate at the Pages address. To move existing numbers there, export from your old copy and import on the published site. Chrome and iPhone Safari keep separate data. Regularly export backups.

## Production build

Run `npm test` and `npm run build` from the project folder. There are no packages to install. `dist/` contains only deployable static files. Do not commit it: GitHub Actions rebuilds it. The Node.js server is for development only; GitHub Pages serves the production files directly over HTTPS.

## Privacy and security

See [SECURITY.md](SECURITY.md) for the review, fixes, test evidence, and remaining risks. Financial records and backups stay in the browser; ordinary website hosting requests still reach GitHub. Browser storage and JSON backups are unencrypted, and GitHub Pages projects on the same username domain share an origin. Never commit financial records or backups.
