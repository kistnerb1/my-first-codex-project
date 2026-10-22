# Privacy and security review

Reviewed on October 22, 2026. Scope: application files, build/deployment configuration, the complete non-shallow local Git history, and fetched GitHub branches/tags. At the start of the review, GitHub had one branch (`main`), no tags, and two commits (`1ed7bad`, `fc2b4d1`). All 12 unique historical file blobs were examined with source review and credential-pattern checks. Git integrity checks reported no unreachable objects. This review does not cover GitHub account settings, issues, attachments, forks, provider caches, or browser/device contents.

## Publication assessment

No actual financial records, passwords, API keys, private keys, or financial backups were found in the reviewed repository contents or history. Financial figures in the application and tests are fictional examples generated for development, not supplied personal figures.

**Remaining publication decision:** the original commits contain personal author email addresses (Gmail and Outlook). Publishing the history exposes those addresses and author names along with commit dates. They are not listed here to avoid creating further copies. Removing historical metadata requires an explicitly approved history rewrite and force-push; this review does not silently rewrite history. Subsequent privacy-fix commits use a GitHub noreply author address. Do not treat the repository as fully cleared of personal identifying information until this decision is resolved.

## Fixes made

- Removed Google Fonts. All fonts are provided by the device; no font requests go to Google.
- Fixed an HTML-injection issue in the budget editor: custom category labels are now escaped, as are descriptions and other user-controlled HTML values. A malicious category or imported backup cannot insert markup at that location.
- Added a Content Security Policy in the HTML, compatible with GitHub Pages: only same-origin application scripts and styles can load; data connections, images, frames, objects, external fonts, form submissions, and base-tag overrides are blocked. Inline CSS is allowed for chart widths; inline JavaScript is not allowed.
- Added a no-referrer policy.
- Rejected category names that conflict with JavaScript object internals.
- Expanded Git ignore rules for common private configuration, keys, backup folders, and backup-download filenames. Ignore rules are preventive, not encryption or a guarantee against forced additions.

## Financial data flow

Transactions, bills, income, category budgets, and derived balances are handled inside the browser. The application persists its data in `localStorage` under `my-money-command-center-v1`. It has no bank integration, authentication service, analytics SDK, advertising, telemetry, cookies, application API, or database server. No code sends financial data to GitHub or another service.

Export creates a JSON Blob and a local browser download. Import reads the selected file using `File.text()` and validates it in browser memory. Neither uploads data. The production build copies only `index.html`, `style.css`, `app.js`, `finance.js`, and an empty `.nojekyll` file. GitHub Actions receives application source, not users' browser storage or downloaded backups.

GitHub still serves the static website and can observe normal hosting metadata such as IP address, requested paths, and user agent under its own policies. The app does not put financial details in URLs or requests. This is not a claim that visiting a hosted website is invisible to its hosting provider.

## Validation

- Seven automated calculation, import-validation, HTML-escaping, and reserved-category tests passed.
- Production build passed and was tested at `/my-first-codex-project/` in headless Chromium, including mobile layout and persistence after reload.
- Browser network monitoring found only the four expected static page/asset requests on load and zero additional requests while adding a transaction/category, changing a bill payment, changing the what-if calculation, exporting, and importing.
- Exported JSON contained the local test record. Import restored it without a network upload.
- A category containing malicious image/onerror markup remained literal text in the editor; no image or executable handler was created.
- The browser blocked a deliberately attempted same-origin fetch under the Content Security Policy before it reached the test server.

Browser test data and downloads were kept in temporary test storage outside the repository. No real user data was used. These checks validate the reviewed build, not future modifications or a live deployment that has not yet updated.

## Remaining privacy risks

1. Browser storage and exported JSON are unencrypted. People with access to the device/browser profile, malicious extensions, malware, or a compromised browser may read them. Browser downloads may be saved or synced to a cloud folder by the user's operating-system settings.
2. GitHub Pages projects under the same `https://kistnerb1.github.io` origin share localStorage. Another page or script on that origin can potentially read the app's storage. This key is namespaced but is not a security boundary. Keep other projects on that origin trusted, or use a separate origin for sensitive use.
3. Anyone who can change the deployed code can potentially compromise future use. Protect the GitHub account with two-factor authentication, review changes, and limit repository write access. A policy in HTML cannot protect against a malicious replacement of that HTML itself.
4. Clearing browser data, private browsing, or browser/device failure can lose records. Keep private backups. Never commit backups or enter secrets into issues, screenshots, pull requests, or source code. Renamed backup files may not match ignore rules.
5. Public source, Git author metadata, and anything uploaded to public GitHub discussions can be copied. Making a repository private later does not retract copies.
6. The development server is intended for trusted networks only. Use the HTTPS GitHub Pages address for ordinary hosted use.

This is a focused source/history review and functional privacy check, not an independent penetration test or a guarantee against every future vulnerability.
