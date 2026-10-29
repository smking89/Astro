"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { PLATFORMS, PLATFORM_META, tryGenerateASTROLink, type PlatformType } from "../links";
import { ProfileConnectionRow, type ProfileConnection } from "./connections";

const PLACEHOLDER: Record<PlatformType, string> = {
  BEEK: "@koba",
  KOBA_GAMES: "@koba.games",
  SNAGCHAT: "@koba.reels",
  KOBABOT: "123456789012345678",
};

/** Connect and remove chips; the server component re-renders from PostgreSQL. */
export function ProfileEditor({
  accountHandle,
  connections,
}: {
  accountHandle: string;
  connections: ProfileConnection[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // Land on a product that still needs a handle so the form is never stuck on "already linked".
  const [platform, setPlatform] = useState<PlatformType>(() =>
    PLATFORMS.find((entry) => !connections.some((connection) => connection.platform === entry)) ?? PLATFORMS[0],
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();

  const alreadyLinked = connections.some((connection) => connection.platform === platform);
  const trimmed = value.trim();
  const preview = trimmed && !alreadyLinked ? tryGenerateASTROLink(platform, trimmed) : null;
  const disabled = busy || refreshing || alreadyLinked || trimmed.length === 0;

  const refresh = () => startTransition(() => router.refresh());

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/astro/accounts/${encodeURIComponent(accountHandle)}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, handle: trimmed }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "That handle could not be linked.");
        return;
      }

      setValue("");
      const linkedAfter = [...connections, { platform }];
      const nextPlatform = PLATFORMS.find(
        (entry) => !linkedAfter.some((connection) => connection.platform === entry),
      );
      if (nextPlatform) setPlatform(nextPlatform);
      refresh();
    } catch {
      setError("The ASTRO data layer is unreachable. Check the server logs.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(connection: ProfileConnection) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(
        `/api/astro/accounts/${encodeURIComponent(accountHandle)}/connections/${encodeURIComponent(connection.id)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "That link could not be removed.");
        return;
      }

      refresh();
    } catch {
      setError("The ASTRO data layer is unreachable. Check the server logs.");
    } finally {
      setBusy(false);
    }
  }

  const hint = error
    ? null
    : alreadyLinked
      ? `${PLATFORM_META[platform].label} is already linked — remove the chip first.`
      : preview
        ? `Links to ${preview}`
        : "Handles are lowercased and stored once per product.";

  return (
    <div>
      <ProfileConnectionRow
        connections={connections}
        editing
        onRemove={(connection) => void disconnect(connection)}
        onAdd={() => inputRef.current?.focus()}
        emptyLabel="Nothing linked yet — connect your first handle below."
      />

      <form onSubmit={connect} className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="astro-platform" className="sr-only">
          Product
        </label>
        <select
          id="astro-platform"
          value={platform}
          onChange={(event) => {
            setPlatform(event.target.value as PlatformType);
            setError(null);
          }}
          className="rounded-full border border-white/10 bg-[#111214] px-3 py-1.5 text-[13px] text-neutral-200 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {PLATFORMS.map((entry) => (
            <option key={entry} value={entry} className="bg-[#111214] text-neutral-200">
              {PLATFORM_META[entry].label}
            </option>
          ))}
        </select>

        <label htmlFor="astro-handle" className="sr-only">
          Handle
        </label>
        <input
          ref={inputRef}
          id="astro-handle"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder={PLACEHOLDER[platform]}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby="astro-connect-hint"
          className="w-full min-w-0 flex-1 rounded-full border border-white/10 bg-[#111214] px-3.5 py-1.5 text-[13px] text-neutral-200 outline-none placeholder:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-56"
        />

        <button
          type="submit"
          disabled={disabled}
          className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {busy || refreshing ? "Saving…" : "Connect"}
        </button>
      </form>

      <p
        id="astro-connect-hint"
        role={error ? "alert" : undefined}
        className={`mt-2 min-h-5 text-xs leading-5 ${error ? "text-red-400" : "text-neutral-500"}`}
      >
        {error ?? hint}
      </p>
    </div>
  );
}
