import Link from "next/link";

export const metadata = { title: "Role not found — Energized" };

export default function JobNotFound() {
  return (
    <div
      className="v2"
      style={{
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        padding: 40,
        background: "var(--v2-ink-50)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div
          className="v2-eyebrow"
          style={{ justifyContent: "center", marginBottom: 14 }}
        >
          404 · Role not found
        </div>
        <h1 className="v2-h2" style={{ fontStyle: "italic", marginBottom: 14 }}>
          This role has moved on.
        </h1>
        <p style={{ color: "var(--v2-ink-600)", marginBottom: 24 }}>
          It may have been unpublished, closed, or the link might be off. Have a
          look at what&apos;s open.
        </p>
        <Link href="/jobs" className="v2-btn v2-btn-primary">
          Browse open roles
        </Link>
      </div>
    </div>
  );
}
