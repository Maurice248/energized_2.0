import Link from "next/link";
import { Icon } from "@/components/shared/icon";

const DEFAULT_TZ = "America/Edmonton";

function capitalizeLocal(email: string): string {
  const local = email.split("@")[0]?.trim();
  if (!local) return "there";
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

export function firstNameFromSession(
  name: string | null | undefined,
  email: string,
): string {
  const n = name?.trim();
  if (n) {
    const part = n.split(/\s+/).filter(Boolean)[0];
    if (part) return part;
  }
  return capitalizeLocal(email);
}

function formatOverviewDatetime(now: Date, timeZone: string): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" })
    .format(now)
    .toUpperCase();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(now);
  const pick = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  const month = pick("month").toUpperCase();
  const day = pick("day");
  const year = pick("year");
  const hour = pick("hour");
  const minute = pick("minute");
  const tz = pick("timeZoneName");
  return `${weekday} · ${month} ${day}, ${year} · ${hour}:${minute} ${tz}`;
}

function greetingForTimezone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "12";
  const h = Number.parseInt(hourRaw, 10);
  const hour24 = Number.isFinite(h) ? h % 24 : 12;
  if (hour24 < 12) return "Good morning";
  if (hour24 < 17) return "Good afternoon";
  return "Good evening";
}

function formatStripeDegradedDuration(since: Date): string {
  const mins = Math.max(1, Math.round((Date.now() - since.getTime()) / 60_000));
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"}`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

type Props = {
  displayName: string;
  stripeDegradedSince: Date | null;
  clock?: Date;
  timeZone?: string;
};

export function AdminOverviewHeader({
  displayName,
  stripeDegradedSince,
  clock = new Date(),
  timeZone = DEFAULT_TZ,
}: Props) {
  return (
    <header className="v2-ahead">
      <div>
        <div className="v2-ahead-overview-datetime">
          <span className="v2-ahead-overview-dot" aria-hidden />
          <time dateTime={clock.toISOString()}>{formatOverviewDatetime(clock, timeZone)}</time>
        </div>
        <h1 className="v2-ahead-overview-greet">
          {greetingForTimezone(clock, timeZone)}, <em>{displayName}.</em>
        </h1>
        <p className="v2-ahead-overview-status">
          {stripeDegradedSince ? (
            <>
              Stripe webhooks have been running degraded for{" "}
              <strong>{formatStripeDegradedDuration(stripeDegradedSince)}</strong>.
              Otherwise the platform is healthy.
            </>
          ) : (
            <>The platform is healthy.</>
          )}
        </p>
      </div>
      <div className="v2-ahead-actions">
        <div className="v2-ahead-range">
          <button type="button">24h</button>
          <button type="button">7d</button>
          <button type="button" className="active">
            30d
          </button>
          <button type="button">90d</button>
        </div>
        <button type="button" className="v2-btn v2-btn-ghost v2-btn-sm">
          <Icon name="download" size={14} /> Export
        </button>
        <Link href="/admin/audit" className="v2-btn v2-btn-primary v2-btn-sm">
          <Icon name="shield" size={14} /> Audit log
        </Link>
      </div>
    </header>
  );
}
