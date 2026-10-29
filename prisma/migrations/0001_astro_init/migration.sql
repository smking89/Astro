-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('BEEK', 'KOBA_GAMES', 'SNAGCHAT');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('MODERATOR', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "astroId" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "accentColor" CHAR(7),
    "passwordHash" TEXT,
    "staffRole" "StaffRole",
    "staffTitle" TEXT,
    "staffSince" TIMESTAMP(3),
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "handleVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "handle" TEXT NOT NULL,
    "handleNormalized" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_astroId_key" ON "users"("astroId");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_displayName_idx" ON "users"("displayName");

-- CreateIndex
CREATE INDEX "users_staffRole_idx" ON "users"("staffRole");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_handleVerifiedAt_idx" ON "users"("handleVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "account_wallets_userId_key" ON "account_wallets"("userId");

-- CreateIndex
CREATE INDEX "user_connections_userId_sortOrder_idx" ON "user_connections"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "user_connections_platform_idx" ON "user_connections"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "user_connections_platform_handleNormalized_key" ON "user_connections"("platform", "handleNormalized");

-- AddForeignKey
ALTER TABLE "account_wallets" ADD CONSTRAINT "account_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_connections" ADD CONSTRAINT "user_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

