# E2E tests (FYP2.md §75)

```bash
npm run test:e2e
```

Runs against `http://localhost:5173` by default (Playwright's `webServer`
config starts `npm run dev` automatically if nothing is already listening
there — set `E2E_BASE_URL` to point at a different environment).

## Files

- `api-failure-states.spec.js` — runs with **no credentials needed**.
  Tests wrong-password login, a network-level failure on the auth request,
  signup's real outcome (confirmation-sent or a rejected request), and the
  protected-route redirect — all against the public `/login`/`/signup`
  routes and real Supabase calls. **Passing as of this phase.**
- `journey-existing-data.spec.js` — FYP2.md §75's first journey (login →
  switch mode → Dashboard → Sentiment → Forecast → Crisis →
  Recommendation), including a `<3s` Dashboard load-time assertion.
- `journey-no-data.spec.js` — §75's second journey (Onboarding's no-data
  path → describe business → extract profile → answer missing info →
  generate/edit/regenerate scenario → generate a report).
- `helpers.js` — shared login helper.

## Why the two journey specs skip by default

Both require a **real, email-confirmed Supabase account** — `RequireAuth`
(`src/routes/RequireAuth.jsx`) has no test bypass, deliberately (adding one
would be a real security hole). Provide:

```bash
E2E_TEST_EMAIL=you@example.com E2E_TEST_PASSWORD=yourpassword npm run test:e2e
```

Without these, both journey specs `test.skip()` with a clear reason logged
— not a false pass, not a hang. As of this phase, this project's own test
account (`admin@insightaid.ai`) is still stuck on Supabase's "email not
confirmed" state (the same standing blocker documented since Phase 1 of
this project) — confirmed again during this phase by attempting a fresh
signup and observing the same "check your email" outcome, so neither
journey has actually been run end-to-end. The code is real and ready to
run the moment a confirmed account is available.
