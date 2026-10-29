"use client";

import {
  PLATFORM_META,
  connectionDomId,
  formatAstroHandle,
  tryGenerateASTROLink,
  type PlatformType,
} from "../links";

export type ProfileConnection = {
  id: string;
  platform: PlatformType;
  handle: string;
  verified?: boolean;
};

type ProfileConnectionRowProps = {
  connections: ProfileConnection[];
  /** Shows the dotted "+ Add" chip and inline remove buttons. */
  editing?: boolean;
  onAdd?: () => void;
  onRemove?: (connection: ProfileConnection) => void;
  emptyLabel?: string;
  className?: string;
};

const FOCUS_RING =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * The Meta-style profile link row. Renders on a #000000 surface; every chip is a
 * #111214 container with a hairline border, no glow and no gradient overlays.
 */
export function ProfileConnectionRow({
  connections,
  editing = false,
  onAdd,
  onRemove,
  emptyLabel = "No profiles linked yet",
  className = "",
}: ProfileConnectionRowProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 bg-black ${className}`}
      role="list"
      aria-label="Linked profiles"
    >
      {connections.length === 0 && !editing ? (
        <p className="text-[13px] leading-5 text-neutral-500">{emptyLabel}</p>
      ) : null}

      {connections.map((connection) => {
        const meta = PLATFORM_META[connection.platform];
        const href = tryGenerateASTROLink(connection.platform, connection.handle);
        const label = formatAstroHandle(connection.platform, connection.handle);
        const domId = connectionDomId(connection.platform, connection.handle);

        return (
          <div
            key={connection.id}
            role="listitem"
            className="flex min-w-0 max-w-[15rem] items-center gap-1 rounded-full border border-white/10 bg-[#111214] py-1 pl-1 pr-1.5 transition-colors hover:border-white/20"
          >
            <span id={domId} className="sr-only">
              {meta.label} profile link
            </span>

            {href ? (
              <a
                href={href}
                target="_blank"
                rel="me noopener noreferrer"
                title={`${meta.label} — ${label}`}
                className={`flex min-w-0 items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1.5 ${FOCUS_RING}`}
              >
                <PlatformBadge platform={connection.platform} />
                <span className="min-w-0 truncate text-[13px] font-medium leading-5 text-neutral-200">{label}</span>
                {connection.verified ? <VerifiedMark platform={connection.platform} /> : null}
              </a>
            ) : (
              <span className="flex min-w-0 items-center gap-2 py-0.5 pl-0.5 pr-1.5">
                <PlatformBadge platform={connection.platform} />
                <span className="min-w-0 truncate text-[13px] font-medium leading-5 text-neutral-500">{label}</span>
              </span>
            )}

            {editing ? (
              <button
                type="button"
                onClick={() => onRemove?.(connection)}
                aria-label={`Remove ${meta.label} link`}
                aria-describedby={domId}
                className={`ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-100 ${FOCUS_RING}`}
              >
                <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </div>
        );
      })}

      {editing ? (
        <button
          type="button"
          onClick={onAdd}
          className={`flex items-center gap-1.5 rounded-full border border-dashed border-white/25 bg-transparent px-3 py-1.5 text-[13px] font-medium leading-5 text-neutral-400 transition-colors hover:border-white/45 hover:text-neutral-100 ${FOCUS_RING}`}
        >
          <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
          </svg>
          Add
        </button>
      ) : null}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: PlatformType }) {
  return (
    <span
      aria-hidden
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[9px] font-bold uppercase tracking-wide text-neutral-300 ring-1 ring-inset ring-white/10"
    >
      {PLATFORM_META[platform].badge}
    </span>
  );
}

function VerifiedMark({ platform }: { platform: PlatformType }) {
  return (
    <span className="flex shrink-0 items-center text-neutral-400">
      <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="currentColor">
        <path d="M8 1.5l1.9 1.4 2.3-.2.7 2.2 1.9 1.4-1 2.1.4 2.3-2.2.8-1.4 1.9L8 12.6l-2.6.8-1.4-1.9-2.2-.8.4-2.3-1-2.1 1.9-1.4.7-2.2 2.3.2L8 1.5z" />
      </svg>
      <span className="sr-only">{`${PLATFORM_META[platform].label} link verified by ASTRO`}</span>
    </span>
  );
}
