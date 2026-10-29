import { Prisma } from "@prisma/client";
import { astroDb } from "./db";
import { AstroDataError } from "./errors";
import { generateAstroId } from "./id";
import {
  PLATFORM_META,
  cleanHandle,
  normalizeAccountHandle,
  normalizeHandle,
  type PlatformType,
} from "./links";

/** Shape every read and write returns, so clients always get the full account. */
export const ACCOUNT_SELECT = {
  id: true,
  handle: true,
  astroId: true,
  displayName: true,
  headline: true,
  bio: true,
  avatarUrl: true,
  accentColor: true,
  staffRole: true,
  staffTitle: true,
  staffSince: true,
  status: true,
  suspendedReason: true,
  handleVerifiedAt: true,
  createdAt: true,
  wallet: {
    select: { coins: true, lifetimeEarned: true, lifetimeSpent: true, version: true },
  },
  connections: {
    select: {
      id: true,
      platform: true,
      handle: true,
      isPrimary: true,
      isVerified: true,
      sortOrder: true,
      createdAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.UserSelect;

export type AstroAccount = Prisma.UserGetPayload<{ select: typeof ACCOUNT_SELECT }>;

export const CONNECTION_SELECT = {
  id: true,
  platform: true,
  handle: true,
  isPrimary: true,
  isVerified: true,
  sortOrder: true,
  createdAt: true,
} satisfies Prisma.UserConnectionSelect;

export type AstroConnection = Prisma.UserConnectionGetPayload<{ select: typeof CONNECTION_SELECT }>;

export type Wallet = NonNullable<AstroAccount["wallet"]>;

const ACCENT = /^#[0-9a-f]{6}$/i;

function accent(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!ACCENT.test(trimmed)) {
    throw new AstroDataError("accentColor must be a six-digit hex colour such as #5865f2.", 422, "INVALID_ACCENT");
  }
  return trimmed.toLowerCase();
}

/** Turns Prisma constraint failures into typed ASTRO errors; rethrows anything else. */
function translate(error: unknown, duplicateMessage: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new AstroDataError(duplicateMessage, 409, "DUPLICATE");
    if (error.code === "P2025") throw new AstroDataError("That record no longer exists.", 404, "NOT_FOUND");
  }
  throw error;
}

export type CreateAccountInput = {
  handle: string;
  displayName?: string;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  accentColor?: string | null;
  /** scrypt hash; supplied by the auth layer during registration. */
  passwordHash?: string | null;
  startingCoins?: number;
};

/** Creates the user and its wallet in one write; the wallet never exists alone. */
export async function createAstroAccount(input: CreateAccountInput): Promise<AstroAccount> {
  const handle = normalizeAccountHandle(input.handle);
  const startingCoins = Math.trunc(input.startingCoins ?? 0);

  if (!Number.isFinite(startingCoins) || startingCoins < 0 || startingCoins > 1_000_000) {
    throw new AstroDataError(
      "startingCoins must be a whole number between 0 and 1,000,000.",
      422,
      "INVALID_STARTING_COINS",
    );
  }

  const displayName = (input.displayName ?? handle).trim();

  try {
    return await astroDb().user.create({
      data: {
        handle,
        astroId: generateAstroId(),
        displayName: displayName.length > 0 ? displayName : handle,
        headline: input.headline?.trim() || null,
        bio: input.bio?.trim() || null,
        avatarUrl: input.avatarUrl?.trim() || null,
        accentColor: accent(input.accentColor),
        passwordHash: input.passwordHash ?? null,
        wallet: { create: { coins: startingCoins } },
      },
      select: ACCOUNT_SELECT,
    });
  } catch (error) {
    translate(error, `@${handle} is already registered with ASTRO.`);
  }
}

export async function getAstroAccount(handle: string): Promise<AstroAccount> {
  const normalized = normalizeAccountHandle(handle);
  const account = await astroDb().user.findUnique({ where: { handle: normalized }, select: ACCOUNT_SELECT });

  if (!account) {
    throw new AstroDataError(`@${normalized} is not an ASTRO account.`, 404, "ACCOUNT_NOT_FOUND");
  }

  // Accounts created before ASTROid existed receive one the first time a product reads them.
  if (!account.astroId) {
    return astroDb().user.update({
      where: { id: account.id },
      data: { astroId: generateAstroId() },
      select: ACCOUNT_SELECT,
    });
  }

  return account;
}

/** Removes the account; the database cascades to its wallet and connections. */
export async function deleteAstroAccount(handle: string): Promise<{ id: string; handle: string }> {
  const account = await getAstroAccount(handle);
  await astroDb().user.delete({ where: { id: account.id } });
  return { id: account.id, handle: account.handle };
}

/**
 * Links an ASTRO product handle to the account. Re-linking a handle the account
 * already owns is idempotent; claiming one owned elsewhere is a conflict.
 */
export async function connectPlatform(
  accountHandle: string,
  platform: PlatformType,
  rawHandle: string,
): Promise<AstroConnection> {
  if (!Object.hasOwn(PLATFORM_META, platform)) {
    throw new AstroDataError(`Unknown ASTRO platform: ${String(platform)}`, 422, "UNKNOWN_PLATFORM");
  }

  const account = await getAstroAccount(accountHandle);
  const normalized = normalizeHandle(platform, rawHandle);
  const db = astroDb();

  const existing = await db.userConnection.findUnique({
    where: { platform_handleNormalized: { platform, handleNormalized: normalized } },
    select: { id: true, userId: true },
  });

  if (existing) {
    if (existing.userId !== account.id) {
      throw new AstroDataError(
        `That ${PLATFORM_META[platform].label} handle is already linked to another ASTRO account.`,
        409,
        "CONNECTION_TAKEN",
      );
    }
    return db.userConnection.update({
      where: { id: existing.id },
      data: { handle: cleanHandle(rawHandle) },
      select: CONNECTION_SELECT,
    });
  }

  const highest = await db.userConnection.aggregate({
    where: { userId: account.id },
    _max: { sortOrder: true },
  });

  try {
    return await db.userConnection.create({
      data: {
        userId: account.id,
        platform,
        handle: cleanHandle(rawHandle),
        handleNormalized: normalized,
        isPrimary: account.connections.length === 0,
        sortOrder: (highest._max.sortOrder ?? -1) + 1,
      },
      select: CONNECTION_SELECT,
    });
  } catch (error) {
    translate(error, "That handle is already linked to an ASTRO account.");
  }
}

/** Deletes one chip, then promotes the next connection to primary if needed. */
export async function disconnectPlatform(
  accountHandle: string,
  connectionId: string,
): Promise<{ removed: string }> {
  const account = await getAstroAccount(accountHandle);
  const db = astroDb();

  const result = await db.userConnection.deleteMany({ where: { id: connectionId, userId: account.id } });
  if (result.count === 0) {
    throw new AstroDataError("That connection is not linked to this account.", 404, "CONNECTION_NOT_FOUND");
  }

  const primary = await db.userConnection.findFirst({
    where: { userId: account.id, isPrimary: true },
    select: { id: true },
  });

  if (!primary) {
    const next = await db.userConnection.findFirst({
      where: { userId: account.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (next) {
      await db.userConnection.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }

  return { removed: connectionId };
}

/**
 * Moves the shared coin balance. The UPDATE is guarded by the wallet version, so a
 * concurrent purchase from another ASTRO product loses the race and retries instead
 * of overwriting the balance.
 */
export async function adjustWallet(accountHandle: string, delta: number): Promise<Wallet> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new AstroDataError("delta must be a non-zero whole number.", 422, "INVALID_DELTA");
  }

  const account = await getAstroAccount(accountHandle);
  const db = astroDb();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const wallet = await db.accountWallet.findUnique({
      where: { userId: account.id },
      select: { coins: true, version: true },
    });

    if (!wallet) throw new AstroDataError("This account has no wallet.", 404, "WALLET_NOT_FOUND");

    const next = wallet.coins + delta;
    if (next < 0) {
      throw new AstroDataError(`Insufficient balance: ${wallet.coins} coins available.`, 409, "INSUFFICIENT_FUNDS");
    }

    const updated = await db.accountWallet.updateMany({
      where: { userId: account.id, version: wallet.version },
      data: {
        coins: next,
        version: { increment: 1 },
        ...(delta > 0 ? { lifetimeEarned: { increment: delta } } : { lifetimeSpent: { increment: -delta } }),
      },
    });

    if (updated.count === 1) {
      return db.accountWallet.findUniqueOrThrow({
        where: { userId: account.id },
        select: { coins: true, lifetimeEarned: true, lifetimeSpent: true, version: true },
      });
    }
  }

  throw new AstroDataError("The wallet is being updated concurrently. Retry the request.", 409, "WALLET_CONTENTION");
}
