# iPhone connection setup repair — local review only

Branch: `supabase-review`. No push, merge, deployment, live emails, or financial migration was performed for this repair.

## Findings and limits

The original setup handler works with an ordinary valid touch tap in a phone-sized Chromium browser. I could not establish a universal touch-handler failure or capture the user's actual iPhone console/storage state. The exact trigger on that device is therefore **not confirmed**.

Reproduced defects in the original version:

- A capitalized `Sb_publishable_…` key was rejected, with no field-level explanation. The text field did not disable iPhone autocapitalization/autocorrect. This is a plausible mobile-only input difference, not proof that the user's keyboard changed their key.
- Clipboard line wrapping/invisible formatting could fail validation; keys are case-sensitive and must not be lowercased to “fix” them.
- Error feedback appeared only above the long setup controls. There was no inline Save feedback, so rejection or a raw storage exception could look like an inert button when the keyboard was open.
- The active in-memory config was assigned before persistence succeeded. A storage failure could leave inconsistent saved/active state. Storage was not read back to verify success.
- Prior integration tests preloaded public connection config directly and never tested saving it through the actual setup UI.

## Changes

- A dedicated native submit form handles mouse clicks, touch-generated clicks, and keyboard submission. No touchstart/preventDefault hacks or duplicate click listeners are used.
- Explicitly disabled capitalization, autocorrection, and spellcheck on URL/key fields; retained 16px phone input text and a 48px Save target.
- Custom validation gives field-specific, inline accessible error messages instead of relying on browser validation bubbles. Setup stays open after success or failure. Invalid fields are marked; error feedback is brought into view. Busy sign-in requests now explain why Save is temporarily disabled.
- Removes whitespace/zero-width clipboard formatting from public keys, and zero-width formatting/outer whitespace from URLs. Actual key characters and capitalization are preserved; changed-case keys remain invalid. Service-role/secret keys, unsafe endpoints, and non-anon legacy JWTs are still rejected.
- Validates, writes, and reads back the public config before assigning it as active. Denied/full/unreadable/silently failing storage produces a plain-language error and cannot activate a new config. Unsaved input changes also require saving before login.
- Original financial storage, account caches, RLS/schema, magic-link callbacks, and explicit backup/confirmation migration remain unchanged.

## Validation performed

- **35 unit/PostgreSQL tests passed**, including new normalization, field-specific errors, read-back verification, and financial-storage preservation tests.
- **13 mobile setup browser scenarios passed in Chromium**: touch while input focused, keyboard Enter, save/reload/login, formatted clipboard content, malformed/empty URL, changed-case/secret key rejection, storage denied/quota/silent-write/readback failures, corrupt saved config recovery, and unsaved changes. All check original financial data is unchanged and runtime error collection remains empty.
- Full simulated magic-link/two-device synchronization, migration, sign-out/isolation, offline retry, conflict recovery, bills/payment-status/budgets, and mobile layout browser regressions passed.
- Production build and `git diff --check` passed.

The tests use synthetic keys, email addresses, and financial fixtures. No real login email was sent and no financial data was sent to GitHub or a real Supabase project.

## Safari and real-device follow-up

I attempted to install Playwright WebKit, but the environment proxy rejected the official browser-download hosts with HTTP 403. **WebKit/Safari automation did not run.** Chromium mobile emulation is not proof of behavior in physical iPhone Safari or Chrome.

After the user approves pushing the fix:

1. Pull the review branch in Codespaces, restart the dev server, and reload the private preview in Safari and Chrome on the iPhone. Open the forwarded address directly in the normal browser rather than an embedded viewer. Do not change global browser privacy settings just to work around this app.
2. Enter/copy the HTTPS Supabase URL and original public key. With the key field focused, tap Save. Confirm a green saved-and-verified message appears immediately below the fields.
3. Reload and confirm the fields remain populated. Existing local financial numbers must remain unchanged.
4. Test an invalid URL/key and confirm a readable nearby error appears. If storage is blocked, use the error guidance; no login should proceed with a newly unsaved config.
5. Request a fresh magic link using the allowlisted review URL, open it in the same browser, and verify login/sync with synthetic data. No local financial import should happen automatically.

Optional automated WebKit rerun on a machine with browser downloads available: `npx playwright install webkit`, then set `MMCC_BROWSER=webkit` and run `npm run test:connection`. Keep the existing full browser regression suite as well.
