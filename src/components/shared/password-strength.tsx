"use client";

type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

// Minimal client-side strength heuristic. Server-side enforcement still owns
// the final say — this is a hint, not a gate.
export function scorePassword(pw: string): Strength | null {
  if (pw.length === 0) return null;
  if (pw.length < 8) {
    return { score: 0, label: "Too short", color: "#A63A20" };
  }
  let s = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 14) s++;
  const score = Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
  const palette: Record<typeof score, { label: string; color: string }> = {
    0: { label: "Too short", color: "#A63A20" },
    1: { label: "Weak", color: "#A63A20" },
    2: { label: "Fair", color: "#E66020" },
    3: { label: "Good", color: "var(--v2-accent)" },
    4: { label: "Strong", color: "var(--v2-accent-deep)" },
  };
  return { score, ...palette[score] };
}

export function PasswordStrength({ value }: { value: string }) {
  const result = scorePassword(value);
  if (!result) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background:
                i <= result.score ? result.color : "var(--v2-ink-200)",
              transition: "background .15s",
            }}
          />
        ))}
      </div>
      <div
        role="status"
        aria-live="polite"
        style={{
          fontSize: 11,
          color: "var(--v2-ink-500)",
          marginTop: 4,
          fontFamily: "var(--v2-font-mono)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {result.label}
      </div>
    </div>
  );
}
