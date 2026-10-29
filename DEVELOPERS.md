# Astrocan developer platform

Astrocan is the single front door for developers across the ASTRO ecosystem, and it answers on two hosts:
`astrocan.io` is the landing page and serves the account screen at `/account`, and `developer.astrocan.io` is the portal
where apps and keys are managed. An app registers once and its key works against the shared account layer — the same
`User`, `AccountWallet` and `UserConnection` rows every product reads.

Products do not ship their own portals. Bleek's former `/developers` routes now redirect to `/astro`; its deployment keeps
serving the metered API those keys call, and its staff console keeps a read-only view of issued keys.

## Registering an app

1. Sign in to the portal with an ASTRO account.
2. Create an app: a name, an environment (`DEVELOPMENT` or `PRODUCTION`) and the scopes it needs.
3. Copy the secret once. It is shown a single time.

The portal returns a public `clientId` and a secret that starts with `astro_sk_`. Only a SHA-256 hash, the display prefix
and the last four characters are stored, so a lost secret means rotating it, never recovering it.

## Authentication

```http
Authorization: Bearer astro_sk_…
```

A missing header is `401 MISSING_KEY`. Unknown, revoked and rotated keys all return `401 INVALID_KEY`, so a response
never confirms whether a key exists. A key owned by a suspended account returns `403 ACCOUNT_SUSPENDED`.

## Signing users in

Every sign-in happens on `https://astrocan.io/account`, where the member either signs in with an ASTRO account or
registers a new one. No integration collects an ASTRO password, and no integration needs to build a login form: you
choose one of two shapes and hand the browser over.

| Shape | Use it when | What the member sees |
| --- | --- | --- |
| Redirect | Server-rendered apps, mobile web, anything that already owns a callback route | Your app leaves the screen, the account page loads, and the browser returns to your `redirect_uri` |
| Popup | Desktop shells and single-page apps that must keep the current screen mounted | A small window over your app, which closes itself when the member is done |

Both shapes carry the same two parameters: the exact `redirect_uri` you registered for the app, and a `state` value you
generate and later compare. The account page refuses an unregistered `redirect_uri` instead of forwarding to it.

### Redirect

```ts
const state = crypto.randomUUID();
await storeStateInSession(state);

const url = new URL("https://astrocan.io/account");
url.searchParams.set("redirect_uri", "https://koba.games/auth/astro/callback");
url.searchParams.set("state", state);
return Response.redirect(url, 303);
```

On the callback, compare the returned `state` with the stored one before trusting anything else, then exchange the
result for a session of your own. A return that does not match the stored `state` is a dropped sign-in, not a user.

The return is your registered URL with three query parameters: `state` (the value you sent), `handle` and `astroId`.
Nothing else is appended, and no other account field travels in the URL.

### Popup

Add `mode=popup` to the same URL. The account page posts one message to the opener and closes itself. The message is
`{ source: "astrocan", state, account: { handle, astroId } }` — without an `error` key, because a failed sign-in closes
the window without posting at all.

```ts
const url = new URL("https://astrocan.io/account");
url.searchParams.set("redirect_uri", "https://snag.chat/auth/astro/callback");
url.searchParams.set("state", state);
url.searchParams.set("mode", "popup");

const popup = window.open(url.toString(), "astro-signin", "width=520,height=720");
if (!popup) return startRedirectSignIn(state); // blocked: fall back instead of showing a dead button

const onMessage = (event: MessageEvent) => {
  if (event.origin !== "https://astrocan.io") return;
  if (event.data?.source !== "astrocan" || event.data?.state !== state) return;
  window.removeEventListener("message", onMessage);
  if (event.data.error) return showSignInError(event.data.error);
  acceptAccount(event.data.account);
};
window.addEventListener("message", onMessage);
```

Check `event.origin` before reading the payload, and match `state` before accepting it — a popup message is untrusted
input like any other. Remove the listener once it fires, and treat a closed popup without a message as a cancellation
rather than an error.

## Scopes

| Scope | Unlocks |
| --- | --- |
| `profile:read` | `GET /api/v1/me` — handle, display name, ASTROid, staff role, status |
| `connections:read` | `GET /api/v1/connections` — the profile chip row, in display order |
| `wallet:read` | `GET /api/v1/wallet` — coins, lifetime earned and spent, version |
| `wallet:write` | `POST /api/v1/wallet/adjust` — move coins on the key owner's own wallet |

A key without the scope a route needs gets `403 MISSING_SCOPE` before any work runs. Scopes are per key, not per app, so
a read-only integration cannot be widened by adding a second key to the same account.

## Endpoints

The ASTRO account host serves them today from the Bleek deployment at `/api/v1`. Every response is JSON with
`Cache-Control: no-store`.

| Method | Route | Scope | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/me` | `profile:read` | Use it to verify a key after rotating it. |
| GET | `/api/v1/connections` | `connections:read` | Chips render in the same order the profile does. |
| GET | `/api/v1/wallet` | `wallet:read` | The same balance every ASTRO product reads. |
| POST | `/api/v1/wallet/adjust` | `wallet:write` | Guarded by a wallet version, so concurrent calls retry instead of clobbering. |

`wallet:write` only ever touches the wallet owned by the key. There is no route that reads or moves another account's
balance, and none is planned.

## Quota

Each key is capped at 10,000 requests per UTC day, counted in `api_usage_daily` rather than memory, so a restart never
resets it. Crossing the cap returns `429 QUOTA_EXCEEDED`, and the call still appears in the key's request history.

## Rotation and revocation

- Rotating replaces the stored hash; the previous secret fails on its next call.
- Revoking and restoring are separate from rotation.
- Deleting an app removes its usage rows and request rows by cascade.
- A rotated, revoked or unknown key always fails the same way, so a caller learns nothing from the error.

## Errors

Failures return `{ error, code }` with a real status. Branch on `code`, never on the message.

| Status | Code | Meaning |
| --- | --- | --- |
| 401 | `MISSING_KEY` | No `Authorization` header |
| 401 | `INVALID_KEY` | Unknown, revoked or rotated key |
| 403 | `MISSING_SCOPE` | The key lacks the scope this route requires |
| 403 | `ACCOUNT_SUSPENDED` | The key's account is suspended |
| 409 | `INSUFFICIENT_FUNDS` | A wallet adjustment would go below zero |
| 409 | `WALLET_CONTENTION` | Concurrent writes lost four retries; retry the request |
| 422 | `INVALID_BODY` | The payload failed validation; the message names the field |
| 429 | `QUOTA_EXCEEDED` | The daily cap for this key is spent |

## Knowledge base

Short, copyable answers to the questions integrations actually run into. Every recipe below uses the key rules from the
sections above, and every field named here is one the live routes return.

### 1. Prove a key works before shipping

`GET /api/v1/me` is the cheapest key check: one request, one scope, and it echoes which app and environment the key
belongs to. Assert on `app.environment` so a production build cannot quietly run on a development key.

```http
GET /api/v1/me
Authorization: Bearer astro_sk_…

200 {
  "account": { "handle": "koba", "astroId": "ASTRO-…", "displayName": "Koba", "verified": true },
  "app": { "clientId": "astro_cl_…", "name": "Koba.games", "environment": "PRODUCTION" }
}
```

If the call returns `401 INVALID_KEY`, the key was mistyped, rotated or revoked — all three look identical on purpose.
Create a new key rather than editing the old string.

### 2. Resolve a signed-in ASTROid on your own server

Verify the signature locally first, then resolve it. A forged value never reaches your database, and a genuine value that
no account holds gets a distinct answer.

```ts
import { verifyAstroId } from "@astro/core/id";

if (!verifyAstroId(claimedId)) return unauthorized();
const res = await fetch(`/api/astro/ids/${encodeURIComponent(claimedId)}`);
const body = await res.json();
// 200 → { valid: true, astroId, account: { handle, displayName, status, verified } }
// 404 → the signature is genuine but no account holds it
// 422 → not an ASTROid ASTRO ever issued
```

The resolve route takes no key, so any product can validate an identifier without holding a secret. Treat `status` as
authoritative: `SUSPENDED` means stop, even when the signature checks out.

### 3. Credit coins from a match or a purchase

`POST /api/v1/wallet/adjust` moves the wallet owned by the key. Send a whole, non-zero delta; positive credits, negative
debits.

```http
POST /api/v1/wallet/adjust
Authorization: Bearer astro_sk_…
Content-Type: application/json

{ "delta": 250 }

200 { "delta": 250, "wallet": { "coins": 1250, "lifetimeEarned": 1500, "lifetimeSpent": 250, "version": 41 } }
```

The response is the wallet after the write, so store it instead of re-reading. `delta` of `0`, a fractional value or a
string returns `422 INVALID_DELTA` (`422 INVALID_BODY` when the body itself is not JSON).

### 4. Handle a busy wallet instead of losing coins

The wallet is guarded by a version column and four optimistic retries. Under concurrent writes the fifth attempt fails
with `409 WALLET_CONTENTION` — that is a signal to back off and retry, not a permanent error. Retry with jitter, and cap
the attempts so a hot wallet cannot loop forever.

```ts
for (let attempt = 0; attempt < 5; attempt += 1) {
  const res = await adjust(delta);
  if (res.status !== 409) return res;
  const { code } = await res.clone().json();
  if (code !== "WALLET_CONTENTION") return res; // INSUFFICIENT_FUNDS will never succeed on retry
  await sleep(2 ** attempt * 50 + Math.random() * 50);
}
```

A debit that would cross zero returns `409 INSUFFICIENT_FUNDS` with the balance in the message. Show that balance; do not
retry it.

### 5. Make repeated adjustments safe

There is no idempotency key, so a retried request after a timeout can double-credit. Record the operation in your own
database before calling ASTRO, carry the wallet `version` from the last response, and only call again when the stored
version proves the first write never landed. Read `GET /api/v1/wallet` once on startup to learn the current version.

### 6. Render the profile chip row exactly as the profile does

`GET /api/v1/connections` returns the row in display order. Do not sort it yourself, and do not rebuild the URLs from
scratch — `url` is already the canonical deep link, and it is `null` when a platform has no link schema.

```json
{ "connections": [ { "platform": "KOBA_GAMES", "handle": "koba.games", "url": "https://koba.games/@koba.games", "primary": true, "verified": true } ] }
```

`primary` marks the chip the account chose to lead with; `verified` is ASTRO's confirmation, not a client claim. In a
product, the ready-made row is `ProfileConnectionRow` from `@astro/core/react/connections`, which already handles
wrapping and truncation on narrow screens.

### 7. Link a KOBAbot member

KOBAbot links a Discord numeric user ID as a `KOBABOT` connection. Resolve that ID to an account, then verify the
account's ASTROid before acting on a command — a Discord nickname is never proof of identity.

```ts
const account = await byKobabotId(interaction.user.id);
if (!account || !verifyAstroId(account.astroId)) return deny(interaction);
```

Store the numeric ID, never the display name, and re-check on every privileged command rather than caching the result
for the life of the process.

### 8. Budget the daily quota

The cap is 10,000 requests per key per UTC day, counted in the database. A dashboard that polls per browser tab will
spend it by lunchtime, so cache reads server-side and refresh on a timer instead of on every request.

- Cache `connections` and `me` for the length of a page render; both change only when the member edits them.
- Read `wallet` once per user action, not per widget.
- Keep a second key only if you genuinely need a separate budget; scopes are per key, so a second key is also a second
  grant to audit.
- `429 QUOTA_EXCEEDED` still writes a request row, so the history shows exactly when the cap was hit.

### 9. Keep the account's private fields private

No route returns an email address, a password hash, a session token or another account's wallet. `wallet:write` can only
touch the wallet the key belongs to, and there is no route to move coins between accounts. If a feature needs any of
that, it is not an integration — it is an account feature request.

### 10. Debug in this order

| Symptom | Almost always | Fix |
| --- | --- | --- |
| `401 MISSING_KEY` | The header was not sent, or a proxy stripped it | Log the outgoing `Authorization` header name, not its value |
| `401 INVALID_KEY` on a key that just worked | Rotated, revoked, or copied with a trailing newline | Issue a new key, trim the secret at the edge |
| `403 MISSING_SCOPE` | The route needs a scope the key was not granted | Add a key with that scope; existing keys are never widened |
| `403 ACCOUNT_SUSPENDED` | The key's owner is suspended | Surface the state to the member; do not retry |
| `422 INVALID_BODY` | Body was sent as form data, or `delta` was a string | Send JSON with `Content-Type: application/json` |
| `422 INVALID_DELTA` | `0`, a float, or an empty value | Send a non-zero integer |
| `409 INSUFFICIENT_FUNDS` | A debit larger than the balance | Show the balance; do not retry |
| `409 WALLET_CONTENTION` | Concurrent writes on one wallet | Exponential backoff, then retry |
| `429 QUOTA_EXCEEDED` | Daily cap spent | Cache, and wait for the UTC rollover |
| `500 INTERNAL` | A bug, not a caller mistake | Retry once, then report it with the timestamp |

Branch on `code`, never on the message text: messages are written for humans and can change. Every failure is
`Cache-Control: no-store`, so a retry always reaches the server.

### 11. Test against a development key

Create a second app with `environment: DEVELOPMENT` and keep its secret in your local environment only. Production keys
belong in your host's secret store, never in a repository, a client bundle or a log line. Because every key is metered
and attributed, a stray development key shows up in the portal's request history before it shows up in production.

### 12. Ask where the answer will be kept

Questions, permission requests and bug reports go to the ASTRO repository's issue tracker
(`github.com/smking89/Astro`). When an answer changes how the API behaves, it is written into this file in the same
commit, so this page — not a chat thread — stays the source of truth.

### 13. Pick a sign-in shape and know how it fails

Both shapes start at `https://astrocan.io/account`, and both need the exact `redirect_uri` registered against the app in
`developer.astrocan.io`. Choose the popup only when the screen must stay mounted: a server-rendered app is simpler with
the redirect, and the redirect still works when a browser blocks the popup.

| Symptom | Almost always | Fix |
| --- | --- | --- |
| "This sign-in could not start" | The `redirect_uri` differs from the registered value by a trailing slash, a query string, `www`, or `http` instead of `https` | Register the exact URL; matching is exact, never a prefix |
| "missing its state value" | The link was built without `state` | Generate one value per attempt, store it in the session, send it |
| The popup opens, then closes with nothing handed back | The opener was lost, or the listener was attached after the message arrived | Attach the listener before `window.open`, and fall back to the redirect when it returns `null` |
| A message arrives but is ignored | The origin or `source` check rejected it | Compare `event.origin` with the registered origin, and require `event.data.source === "astrocan"` |
| The callback renders a blank page | The callback route reads the request body instead of the query string | Read `state`, `handle` and `astroId` from the URL |
| Signed in, but the app never received the account | The account is suspended, so nothing is handed back on purpose | Show the suspension to the member; do not retry |
| Works locally, refused in production | A loopback `redirect_uri` is registered for the production app | Loopback is accepted only for `localhost` and `127.0.0.1` over `http`; everything else must be `https` |

A failed sign-in never posts to the opener: the window closes and the app keeps waiting. Treat a popup that closes
without a message as a cancellation, and keep a visible "Sign in with ASTRO" button so the member can start again.

## Using the account layer directly

Keys cover HTTP access. A product inside the ecosystem can also link the package and skip the network:

```ts
import { generateASTROLink } from "@astro/core/links";
import { getAstroAccount, adjustWallet } from "@astro/core/accounts";
import { verifyAstroId } from "@astro/core/id";
```

Those calls hit the same database the portal's keys do, so a coin spent through the API and a coin spent in a product
land in one ledger.
