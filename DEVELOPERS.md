# ASTRO developer platform

`developer.astro.io` is the single front door for developers across the ASTRO ecosystem. An app registers once and its key
works against the shared account layer — the same `User`, `AccountWallet` and `UserConnection` rows every product reads.

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

## Using the account layer directly

Keys cover HTTP access. A product inside the ecosystem can also link the package and skip the network:

```ts
import { generateASTROLink } from "@astro/core/links";
import { getAstroAccount, adjustWallet } from "@astro/core/accounts";
import { verifyAstroId } from "@astro/core/id";
```

Those calls hit the same database the portal's keys do, so a coin spent through the API and a coin spent in a product
land in one ledger.
