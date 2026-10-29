# ASTRO

The account layer behind Bleek, Koba.games, SnagChat and KOBAbot: one identity, one coin wallet, and a Meta-style
row of profile connections pointing at each product.

This repository owns the shared pieces. The products own their own UI, servers and moderation; they all read the same
`User`, `AccountWallet` and `UserConnection` rows.

## What lives here

| Export | Purpose |
| --- | --- |
| `@astro/core/links` | `generateASTROLink(platform, handle)`, normalization, formatting and chip ids. Client-safe: it never imports Prisma. |
| `@astro/core/accounts` | `createAstroAccount`, `getAstroAccount`, `deleteAstroAccount`, `connectPlatform`, `disconnectPlatform`, `adjustWallet`, `ACCOUNT_SELECT`. |
| `@astro/core/auth` | scrypt password hashing, HMAC session tokens, `registerAccount`, `authenticate`, `accountForToken`. No framework imports. |
| `@astro/core/id` | `generateAstroId`, `verifyAstroId`, `normalizeAstroId` — the signed, tamper-evident account identifier every product can validate. |
| `@astro/core/db` | The cached Prisma client factory and `astroConfigured()`. |
| `@astro/core/errors` | `AstroDataError` with an HTTP status and a machine-readable code. |
| `@astro/core/http` | `readJson` and `astroErrorResponse` for route handlers. |
| `@astro/core/react/connections` | `ProfileConnectionRow`, the wrapping pill row with verified marks and the dotted `+ Add` chip. |
| `@astro/core/react/editor` | `ProfileEditor`, the connect/remove form that writes through the consuming app's routes. |

## KOBAbot

KOBAbot is the Discord bot. A member links their Discord user ID as a `KOBABOT` connection, and the bot resolves that
ID to an ASTRO account and checks the account's ASTROid before acting on a command. The chip deep-links to
`https://discord.com/users/<id>`, so it points at the real Discord profile rather than a guessable username.

```ts
import { verifyAstroId } from "@astro/core/id";
```

Nothing in the bot trusts a Discord nickname on its own: the identifier is the numeric ID, and the ASTROid signature
proves ASTRO issued it.

## Schema

`prisma/astro.prisma` is the canonical definition of the account models. It is not a complete Prisma schema on its
own: the `generator` and `datasource` blocks live between the `<astro:standalone>` markers so a product can strip them
when it composes its own schema.

A consuming product copies the models into its schema directory and injects whatever back-relations it needs on `User`
(Bleek, for example, adds its developer apps, moderation cases and audit log). Bleek does this with
`scripts/sync-astro-schema.mjs`, which reads the installed package, strips the standalone block and replaces the
`// @astro:user-relations` marker with its own relation lines.

`prisma/migrations/0001_astro_init/migration.sql` is the baseline for a new product. It is generated, not hand-edited:

```bash
npm run db:baseline > prisma/migrations/0001_astro_init/migration.sql
```

Products that already have their own history keep it. Bleek's applied migrations predate this split and are untouched.

## Using it

```bash
npm install github:smking89/Astro
```

```ts
import { generateASTROLink } from "@astro/core/links";
import { ProfileConnectionRow } from "@astro/core/react/connections";
import { authenticate } from "@astro/core/auth";
```

The package ships TypeScript source, so a Next.js consumer needs it transpiled:

```ts
// next.config.ts
transpilePackages: ["@astro/core"],
```

Tailwind v4 ignores `node_modules` when scanning, so register the source explicitly:

```css
@source "../../node_modules/@astro/core/src";
```

## Environment

- `DATABASE_URL` — PostgreSQL connection string.
- `ASTRO_AUTH_SECRET` — 32+ random characters, used to sign session tokens.

## Development

```bash
npm install
npx prisma generate --schema prisma/astro.prisma
npm run typecheck
```

The React exports assume Tailwind classes are available in the host app; they ship no CSS of their own.

## ASTROid

Every account carries one ASTROid, minted at registration and never edited:

```
ASTRO-4K7Q-9WTM-2XHB-8NDR-3FVC-6PZS
```

It is 80 random bits in Crockford base32 plus a 40-bit HMAC-SHA256 signature over those bits, keyed by
`ASTRO_ID_SECRET` (falling back to `ASTRO_AUTH_SECRET`). A product verifies it locally with `verifyAstroId()` — edited,
extended or invented values fail the signature check — and can resolve it to an account with
`GET /api/astro/ids/[astroId]` on the ASTRO host. Rotating the secret invalidates every existing ASTROid, so set a
dedicated `ASTRO_ID_SECRET` before the first production registration.
