# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working "Forgot password?" flow accessible from `/sign-in`, per the spec at `docs/superpowers/specs/2026-04-30-forgot-password-design.md`.

**Architecture:** Two new client-component pages (`/forgot-password`, `/reset-password`) plus one Resend email template. Better Auth's built-in `forgetPassword` / `resetPassword` primitives generate and validate tokens server-side; we plug into its `sendResetPassword` callback (mirror of the existing `sendVerificationEmail` wiring) and surface the API on the existing auth client. No schema changes.

**Tech Stack:** Better Auth, Resend, React Email, Next.js App Router (RSC + client components), brand `--v2-accent` (`#1CAAE2`).

**Testing posture:** Per spec §7 and the user's working-style preference, automated tests are deferred. Each task verifies via `pnpm typecheck` + `pnpm lint`. Final task is a manual smoke test that includes clicking through a real reset email.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/emails/reset-password.tsx` | Create | React Email template — preheader + headline + CTA + fallback URL + footer |
| `src/server/auth.ts` | Modify | Add `sendResetPassword` callback inside `emailAndPassword` |
| `src/lib/auth/client.ts` | Modify | Export `forgetPassword`, `resetPassword` from `authClient` |
| `src/app/(auth)/forgot-password/page.tsx` | Create | Email-input form + "Check your inbox" success state |
| `src/app/(auth)/reset-password/page.tsx` | Create | New-password form (token from URL) + success/invalid-token states |

Sign-in page already has `<Link href="/forgot-password">` at line 137 — no change needed. The auth layout at `src/app/(auth)/layout.tsx` wraps everything in `<div className="v2">` so the brand styling tokens already work.

---

## Task 1: Reset-password email template

**Files:**
- Create: `src/emails/reset-password.tsx`

This task creates the Resend / React Email template. Mirrors `src/emails/verify-email.tsx` exactly in structure (same colors, same Container, same button shape) — only the headline + body copy + CTA label change.

- [ ] **Step 1: Create `src/emails/reset-password.tsx`**

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  name: string;
  resetUrl: string;
};

const NAVY = "#004886";
const LIGHT_BLUE = "#1CABE3";
const INK_900 = "#14171F";
const INK_500 = "#6B7280";
const INK_200 = "#E4E7EE";
const BG = "#F9FAFC";

export default function ResetPassword({ name, resetUrl }: Props) {
  const first = name?.split(" ")[0] ?? "there";
  return (
    <Html>
      <Head />
      <Preview>Reset your Energized password</Preview>
      <Body
        style={{
          backgroundColor: BG,
          margin: 0,
          padding: "40px 0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif",
          color: INK_900,
        }}
      >
        <Container
          style={{
            maxWidth: 520,
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: 14,
            border: `1px solid ${INK_200}`,
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              backgroundColor: NAVY,
              padding: "28px 32px",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              Energ<span style={{ color: LIGHT_BLUE }}>ized</span>
            </Text>
          </Section>

          <Section style={{ padding: "40px 32px 8px" }}>
            <Heading
              as="h1"
              style={{
                margin: 0,
                fontSize: 26,
                lineHeight: 1.2,
                fontWeight: 600,
                color: INK_900,
                letterSpacing: "-0.015em",
              }}
            >
              Reset your password, {first}.
            </Heading>
            <Text
              style={{
                marginTop: 16,
                fontSize: 15,
                lineHeight: 1.55,
                color: INK_500,
              }}
            >
              Click the button below to set a new password. The link is valid
              for the next hour. If you didn&rsquo;t request this, you can
              safely ignore this email — your password won&rsquo;t change.
            </Text>
          </Section>

          <Section style={{ padding: "24px 32px 8px", textAlign: "center" }}>
            <Button
              href={resetUrl}
              style={{
                backgroundColor: LIGHT_BLUE,
                color: INK_900,
                fontWeight: 600,
                fontSize: 15,
                padding: "12px 24px",
                borderRadius: 999,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Reset password
            </Button>
          </Section>

          <Section style={{ padding: "24px 32px 32px" }}>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: INK_500,
                margin: 0,
              }}
            >
              Button not working? Paste this link into your browser:
            </Text>
            <Link
              href={resetUrl}
              style={{
                fontSize: 13,
                color: NAVY,
                wordBreak: "break-all",
              }}
            >
              {resetUrl}
            </Link>
          </Section>

          <Hr style={{ borderColor: INK_200, margin: 0 }} />

          <Section style={{ padding: "20px 32px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.55,
                color: INK_500,
              }}
            >
              If you didn&rsquo;t request a password reset, you can safely
              ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass. The pre-existing lint failure in `code/trigger/example.ts` is unrelated and OK.

- [ ] **Step 3: Commit**

```bash
git add src/emails/reset-password.tsx
git commit -m "feat(emails): reset-password email template"
```

---

## Task 2: Server `sendResetPassword` callback

**Files:**
- Modify: `src/server/auth.ts`

This task wires Better Auth's `emailAndPassword.sendResetPassword` callback to dispatch via Resend using the new email template.

- [ ] **Step 1: Add the email-template import**

In `src/server/auth.ts`, find the line that imports `VerifyEmail`:

```ts
import VerifyEmail from "@/emails/verify-email";
```

Add a new line directly below it:

```ts
import ResetPassword from "@/emails/reset-password";
```

- [ ] **Step 2: Add the `sendResetPassword` callback**

Find the existing `emailAndPassword` config block:

```ts
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
```

Replace with:

```ts
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "Reset your Energized password",
        react: ResetPassword({
          name: user.name ?? "",
          resetUrl: url,
        }),
      });
      if (result.error) {
        console.error("[auth] resend rejected (reset)", result.error);
        throw new Error(`Resend: ${result.error.message}`);
      }
      console.log("[auth] resend accepted (reset)", result.data?.id);
    },
  },
```

Notes:
- `url` is passed by Better Auth — it's the full reset URL the user clicks. It already incorporates the `redirectTo` we'll pass from the client.
- Logging mirrors the existing `sendVerificationEmail` pattern for consistency.
- We deliberately don't override `resetPasswordTokenExpiresIn` here — Better Auth's default is used (typically 1 hour). If the implementer's manual smoke test shows the default differs significantly from 1h, add `resetPasswordTokenExpiresIn: 60 * 60` explicitly.

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/auth.ts
git commit -m "feat(auth): wire sendResetPassword callback to Resend"
```

---

## Task 3: Auth client exports

**Files:**
- Modify: `src/lib/auth/client.ts`

The client exports `signIn`, `signUp`, `signOut`, `useSession`. Add `forgetPassword` and `resetPassword` so the new pages can import them.

- [ ] **Step 1: Update `src/lib/auth/client.ts`**

Replace the entire content of `src/lib/auth/client.ts` with:

```ts
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : ""),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  forgetPassword,
  resetPassword,
} = authClient;
```

(The only change is adding `forgetPassword` and `resetPassword` to the destructured exports. The `authClient` object always has them; making them named exports is a convenience.)

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/client.ts
git commit -m "feat(auth): export forgetPassword and resetPassword from client"
```

---

## Task 4: `/forgot-password` page

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`

Client component. State machine: `idle → submitting → sent | error`. Layout mirrors `/sign-in`'s `<div className="v2-auth">` shell so the brand styling carries through automatically.

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Status = "idle" | "submitting" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    const { error } = await authClient.forgetPassword({
      email,
      redirectTo: "/reset-password",
    });
    if (error) {
      setStatus("error");
      setErrorMsg(
        error.message ??
          "Couldn't send the reset email. Try again or contact hello@energized.biz.",
      );
      return;
    }
    setStatus("sent");
  }

  function reset() {
    setStatus("idle");
    setErrorMsg(null);
  }

  return (
    <div className="v2-auth">
      <aside className="v2-auth-side">
        <Link
          href="/"
          style={{ cursor: "pointer", display: "inline-block" }}
        >
          <Image
            src="/energized-logo-white.svg"
            alt="Energized"
            width={180}
            height={100}
            priority
            style={{ height: "auto", width: "180px" }}
          />
        </Link>
        <div style={{ flex: 1 }} />
        <div>
          <div className="v2-eyebrow v2-eyebrow-light">Forgot it happens</div>
          <h2 style={{ marginTop: 20 }}>
            We&rsquo;ll get you back <em>in</em>.
          </h2>
          <p>
            Enter the email you signed up with and we&rsquo;ll send a reset
            link. Valid for one hour.
          </p>
        </div>
        <div style={{ flex: 1 }} />
      </aside>

      <main className="v2-auth-main">
        <div style={{ flex: 1 }} />
        <div className="v2-auth-card">
          {status === "sent" ? (
            <>
              <h1>
                Check your <em>inbox</em>.
              </h1>
              <p className="lead">
                If an account with that email exists, we&rsquo;ve sent a reset
                link. The link expires in one hour.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 32,
                  fontSize: 14,
                }}
              >
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--v2-ink-900)",
                    fontWeight: 500,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Didn&rsquo;t get it? Try again
                </button>
                <Link
                  href="/sign-in"
                  style={{
                    color: "var(--v2-ink-500)",
                  }}
                >
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1>
                Forgot <em>password</em>?
              </h1>
              <p className="lead">We&rsquo;ll send you a reset link.</p>

              <form
                onSubmit={handleSubmit}
                style={{ display: "grid", gap: 18, marginTop: 32 }}
              >
                <div>
                  <label className="v2-field-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="v2-input-block"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="alex@energy.ca"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {status === "error" && errorMsg && (
                  <div
                    role="alert"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--v2-r-md)",
                      background: "var(--v2-coral-soft)",
                      color: "#A63A20",
                      fontSize: 13,
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="v2-btn v2-btn-primary"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Sending…" : "Send reset link"}{" "}
                  <ArrowRight size={16} />
                </button>

                <div
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    color: "var(--v2-ink-500)",
                    marginTop: 8,
                  }}
                >
                  Remembered it?{" "}
                  <Link
                    href="/sign-in"
                    style={{
                      color: "var(--v2-ink-900)",
                      fontWeight: 500,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
        <div style={{ flex: 1 }} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx
git commit -m "feat(auth): /forgot-password page (email input + sent state)"
```

---

## Task 5: `/reset-password` page

**Files:**
- Create: `src/app/(auth)/reset-password/page.tsx`

Client component. Reads `token` from `useSearchParams`. State machine: `idle | password-mismatch → submitting → success | invalid-token | error`. Includes the no-token branch that fires when the URL has no `?token=`.

The page is wrapped in a `<Suspense>` boundary because `useSearchParams` triggers a deopt warning otherwise — we follow the Next.js App Router pattern of having the page export a thin shell that renders the inner client component inside Suspense.

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Status =
  | "idle"
  | "password-mismatch"
  | "submitting"
  | "success"
  | "invalid-token"
  | "error";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Branch: no token in URL
  if (!token) {
    return (
      <NoTokenView />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setStatus("password-mismatch");
      return;
    }
    if (newPassword.length < 8) {
      setStatus("error");
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setStatus("submitting");
    const { error } = await authClient.resetPassword({
      newPassword,
      token: token!,
    });

    if (error) {
      const code = (error as { code?: string }).code ?? "";
      const msg = error.message ?? "";
      const isInvalid =
        /invalid|expired|not.found/i.test(code) ||
        /invalid|expired/i.test(msg);
      if (isInvalid) {
        setStatus("invalid-token");
      } else {
        setStatus("error");
        setErrorMsg(msg || "Couldn't reset your password. Try again.");
      }
      return;
    }
    setStatus("success");
    // Note: not auto-redirecting — see spec §3.5. User clicks the CTA.
  }

  if (status === "success") {
    return (
      <>
        <h1>
          Password <em>updated</em>.
        </h1>
        <p className="lead">
          You can now sign in with your new password.
        </p>
        <button
          type="button"
          className="v2-btn v2-btn-primary"
          style={{ marginTop: 32 }}
          onClick={() => router.push("/sign-in")}
        >
          Go to sign in <ArrowRight size={16} />
        </button>
      </>
    );
  }

  if (status === "invalid-token") {
    return (
      <>
        <h1>
          Link <em>expired</em>.
        </h1>
        <p className="lead">
          This reset link is invalid or has expired. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="v2-btn v2-btn-primary"
          style={{ marginTop: 32, display: "inline-flex" }}
        >
          Request a new link <ArrowRight size={16} />
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>
        Reset <em>password</em>.
      </h1>
      <p className="lead">Choose a new password.</p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 18, marginTop: 32 }}
      >
        <div>
          <label className="v2-field-label" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            className="v2-input-block"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div
            style={{
              fontSize: 12,
              color: "var(--v2-ink-500)",
              marginTop: 6,
            }}
          >
            At least 8 characters.
          </div>
        </div>
        <div>
          <label className="v2-field-label" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            id="confirm-password"
            className="v2-input-block"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Repeat the new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {status === "password-mismatch" && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: "var(--v2-r-md)",
              background: "var(--v2-coral-soft)",
              color: "#A63A20",
              fontSize: 13,
            }}
          >
            Passwords don&rsquo;t match.
          </div>
        )}

        {status === "error" && errorMsg && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: "var(--v2-r-md)",
              background: "var(--v2-coral-soft)",
              color: "#A63A20",
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="v2-btn v2-btn-primary"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Updating…" : "Update password"}{" "}
          <ArrowRight size={16} />
        </button>

        <div
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "var(--v2-ink-500)",
            marginTop: 8,
          }}
        >
          <Link
            href="/sign-in"
            style={{
              color: "var(--v2-ink-900)",
              fontWeight: 500,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </>
  );
}

function NoTokenView() {
  return (
    <>
      <h1>
        Missing <em>token</em>.
      </h1>
      <p className="lead">
        This link doesn&rsquo;t carry a reset token. Request a new one.
      </p>
      <Link
        href="/forgot-password"
        className="v2-btn v2-btn-primary"
        style={{ marginTop: 32, display: "inline-flex" }}
      >
        Request a reset link <ArrowRight size={16} />
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="v2-auth">
      <aside className="v2-auth-side">
        <Link
          href="/"
          style={{ cursor: "pointer", display: "inline-block" }}
        >
          <Image
            src="/energized-logo-white.svg"
            alt="Energized"
            width={180}
            height={100}
            priority
            style={{ height: "auto", width: "180px" }}
          />
        </Link>
        <div style={{ flex: 1 }} />
        <div>
          <div className="v2-eyebrow v2-eyebrow-light">Almost there</div>
          <h2 style={{ marginTop: 20 }}>
            One <em>strong</em> password coming up.
          </h2>
          <p>
            Pick something you&rsquo;ll remember. Bonus points for a passphrase.
          </p>
        </div>
        <div style={{ flex: 1 }} />
      </aside>

      <main className="v2-auth-main">
        <div style={{ flex: 1 }} />
        <div className="v2-auth-card">
          <Suspense fallback={null}>
            <ResetPasswordInner />
          </Suspense>
        </div>
        <div style={{ flex: 1 }} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/reset-password/page.tsx
git commit -m "feat(auth): /reset-password page (form + success/invalid-token states)"
```

---

## Task 6: Manual smoke test

This is a verification task. The dev server runs externally on port 3000 — do not start it; ask if it isn't running.

- [ ] **Step 1: Final typecheck + lint + build**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: typecheck and build pass; lint may report the pre-existing failure in `code/trigger/example.ts` (unrelated, OK).

- [ ] **Step 2: Sanity check: confirm `/forgot-password` and `/reset-password` are in the route list**

```bash
pnpm build 2>&1 | grep -E "/forgot-password|/reset-password"
```

Expected: both routes appear.

- [ ] **Step 3: Probe routes for HTTP availability (signed out)**

```bash
/usr/bin/curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/forgot-password
/usr/bin/curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/reset-password
/usr/bin/curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/reset-password?token=bogus"
```

Expected: all three return 200.

- [ ] **Step 4: Ask the user to verify in the browser**

Send the user this checklist:

> Please run an end-to-end smoke test of the reset flow:
>
> **Happy path:**
> 1. Open `http://localhost:3000/sign-in` and click **Forgot password?**
> 2. Confirm `/forgot-password` renders with the brand layout (logo, side panel, email input, "Send reset link" CTA).
> 3. Submit your email (use one of the seeded test users like `mara.whitlock+seed@example.com` or your own).
> 4. Confirm the form transitions to "Check your inbox." with "Didn't get it? Try again" + "Back to sign in" links.
> 5. Open the email in your inbox. Confirm the headline (`Reset your password, <Name>.`), subject (`Reset your Energized password`), CTA button, fallback URL, footer.
> 6. Click the **Reset password** button in the email.
> 7. Confirm `/reset-password?token=…` renders with the new-password form.
> 8. Enter a new password (≥8 chars) twice. Submit.
> 9. Confirm "Password updated. You can now sign in with your new password." with the "Go to sign in" CTA.
> 10. Click the CTA → `/sign-in`. Sign in with the **new** password. Confirm it works.
>
> **Edge cases:**
> 11. Visit `/reset-password` with no `?token=` → confirm "Missing token" view.
> 12. Visit `/reset-password?token=garbage` and submit → confirm "Link expired." view (Better Auth rejects the token).
> 13. On `/reset-password` with a real token, enter mismatched passwords → confirm "Passwords don't match." inline error (no API call).
> 14. On `/forgot-password`, submit an email that doesn't exist in the DB → confirm you still get the same "Check your inbox" success state (we don't leak which emails are registered).
>
> Anything off, paste it.

- [ ] **Step 5: No commit (verification only)**

If a defect is found, treat the fix as a follow-up: identify the file, edit, run typecheck + lint, commit with `fix(auth): <issue>`.

---

## Self-review checklist (run after writing this plan)

- [x] **Spec coverage:**
  - §3.1 server callback → Task 2
  - §3.2 email template → Task 1
  - §3.3 client exports → Task 3
  - §3.4 `/forgot-password` page (idle/submitting/sent/error states) → Task 4
  - §3.5 `/reset-password` page (no-token / idle / submitting / success / invalid-token / password-mismatch / error states) → Task 5
  - §5 empty/loading/error states → all explicitly handled in Tasks 4 and 5
  - §6 brand & copy → applied in Tasks 4 and 5
  - §7 testing deferred → noted in plan front matter; smoke test is Task 6
  - §8 build order → followed
- [x] **No placeholders:** every code-bearing step has complete code. Smoke-test instructions are concrete.
- [x] **Type consistency:** `Status` type is local to each page (different state sets) — that's deliberate, not a typo. `forgetPassword` (one t — Better Auth's API spelling) is consistent throughout. `resetUrl` prop name in template (Task 1) matches the call site in Task 2.
- [x] **No new dependencies.** Re-uses Resend, Better Auth, React Email, Next router/searchParams.
