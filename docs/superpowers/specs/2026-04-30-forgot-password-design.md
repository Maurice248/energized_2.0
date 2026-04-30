# Forgot Password Flow

**Status:** Design accepted 2026-04-30
**Scope:** Add a working "Forgot password?" flow accessible from `/sign-in`. Two new pages (`/forgot-password`, `/reset-password`), one new email template, one new server-side Better Auth config callback, two new auth-client exports. No schema changes — Better Auth's built-in token machinery handles tokens internally.
**Out of scope:** account-deletion confirmations, password-strength meter / live hints (we enforce min 8 only), MFA / 2FA, application-level rate limiting (relies on existing Vercel Firewall plans for `/api/auth/*`), tests (deferred per established pattern).

---

## 1. Goal

The sign-in page already has a `<Link href="/forgot-password">Forgot password?</Link>` (`src/app/(auth)/sign-in/page.tsx:137`), but the destination doesn't exist — the link 404s. This work makes that link land on a real page and gives users a complete password-reset flow:

1. User enters their email.
2. We email them a time-limited reset link.
3. They click the link, set a new password.
4. They sign in normally.

We use Better Auth's built-in `forgetPassword` and `resetPassword` primitives rather than building custom token tables. Better Auth generates and validates the tokens; we plug into its `sendResetPassword` callback to dispatch the email via Resend (the same wiring pattern as the existing `sendVerificationEmail`).

## 2. User flow

```
[/sign-in]
    │ click "Forgot password?"
    ▼
[/forgot-password]   form: email input
    │ submit → authClient.forgetPassword({ email, redirectTo: "/reset-password" })
    │
    │ (Better Auth: generates token, calls our sendResetPassword callback,
    │  Resend dispatches email to the user with link to /reset-password?token=…)
    │
    ▼
[/forgot-password]   "Check your inbox" success state on same page
                     copy: "If an account with that email exists, we've sent a
                     reset link. The link expires in 1 hour."

(user clicks email link)
    ▼
[/reset-password?token=…]   form: new password + confirm password
    │ submit → authClient.resetPassword({ newPassword, token })
    │
    ▼
[/reset-password]    "Password updated. Sign in below." → CTA → /sign-in

Failure paths:
- token missing in URL → "This link is missing the reset token. Request a new one." → /forgot-password
- token invalid/expired → inline error → CTA back to /forgot-password
- new ≠ confirm → client-side inline error
- Resend dispatch fails → caught in callback, user sees generic success ("if an account exists…") to avoid leaking which addresses are registered
```

**Privacy:** the success state on `/forgot-password` is non-committal ("if an account exists") so we don't reveal which emails are registered. Better Auth supports this — its `forgetPassword` always succeeds at the API level; the email sends only if the address matches a real user.

## 3. Architecture

### 3.1 Server: `src/server/auth.ts`

Add a `sendResetPassword` callback to the existing `emailAndPassword` config. Mirrors the existing `sendVerificationEmail` callback exactly in structure (Resend send + result-error handling).

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  sendResetPassword: async ({ user, url, token }) => {
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

Token expiry stays at Better Auth's default (we don't override). At implementation time, confirm the exact default by reading Better Auth's `emailAndPassword` options — if it's not ~1 hour, set `resetPasswordTokenExpiresIn: 60 * 60` explicitly to match the verify-email flow.

### 3.2 Email: `src/emails/reset-password.tsx`

New React Email template. Same structural shape as `src/emails/verify-email.tsx` (preheader → header logo → headline → body copy → big CTA button → fallback URL → footer). Brand voice: terse, professional, sector-aware. Uses brand colors (`#1CAAE2` blue accent on the CTA).

Content shape:
- Preheader: "Reset your Energized password."
- Headline: "Reset your password."
- Body: "Click the button below to set a new password. The link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change."
- CTA button: "Reset password" → resetUrl
- Fallback: "Or copy this link into your browser:" + resetUrl
- Footer: existing Energized footer block (mirror verify-email.tsx).

Props: `{ name: string; resetUrl: string }`. Same shape as `VerifyEmail`.

### 3.3 Client: `src/lib/auth/client.ts`

Add `forgetPassword` and `resetPassword` to the destructured exports:

```ts
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  forgetPassword,
  resetPassword,
} = authClient;
```

### 3.4 Page: `src/app/(auth)/forgot-password/page.tsx`

Client component (`"use client"`). State machine: `idle → submitting → sent | error`.

Layout matches the existing `/sign-in` and `/sign-up` pages — same `<div className="v2">` wrapper from `(auth)/layout.tsx`, same `v2-field-*` class conventions for inputs, same `v2-btn v2-btn-primary` for the CTA.

```
Header: "Forgot your password?"
Subhead: "We'll send you a reset link."
Form:
  Email input
  Submit button: "Send reset link"
Footer:
  Link: "Back to sign in" → /sign-in

Success state (replaces form):
  "Check your inbox."
  "If an account with that email exists, we've sent a reset link.
   The link expires in 1 hour."
  Link: "Didn't get it? Try again." → resets to idle
  Link: "Back to sign in" → /sign-in
```

On submit: call `forgetPassword({ email, redirectTo: "/reset-password" })`. Better Auth always resolves; we transition to `sent` state regardless of whether the email actually went out (that's the point of the privacy posture).

If the call itself throws (e.g., network error), transition to `error` state — inline error message, form stays editable.

### 3.5 Page: `src/app/(auth)/reset-password/page.tsx`

Client component. Reads `token` from `useSearchParams`. State machine: `idle → submitting → success | error`.

```
Header: "Reset your password."
Subhead: "Choose a new password."
Form:
  New password input (type=password, minLength=8)
  Confirm password input (type=password)
  Submit button: "Update password"
Footer:
  Link: "Back to sign in" → /sign-in

If no token in URL:
  Render error card: "This link is missing the reset token. Request a new one."
  Link: "Request a reset link" → /forgot-password

Success state:
  "Password updated."
  "You can now sign in with your new password."
  Big CTA: "Go to sign in" → /sign-in

Error state (token invalid or expired):
  Inline error card: "This reset link is invalid or has expired."
  Link: "Request a new link" → /forgot-password
```

On submit:
- Client-side: confirm password matches; if not, inline error, no API call.
- API: `resetPassword({ newPassword, token })`. On success → `success` state. On error → check error code; if "invalid token" or "expired" → "error" state with the dedicated copy.

**Auto-sign-in question for implementation:** Better Auth may or may not auto-sign-in the user after a successful `resetPassword` call. At implementation time, test the actual behavior. If it does auto-sign-in, redirect to `/dashboard` (or role-aware target) instead of `/sign-in`. Default for this spec is **not auto-sign-in** — direct user to `/sign-in` so they prove the new password works.

Password rules: min 8 chars (Better Auth's default; enforced by both `minLength` HTML attribute and the API). Inline hint under the input: "At least 8 characters."

## 4. File manifest

| Path | Status | Responsibility |
|---|---|---|
| `src/server/auth.ts` | Modify | Add `sendResetPassword` callback inside `emailAndPassword` |
| `src/emails/reset-password.tsx` | Create | React Email template, shape mirrors `verify-email.tsx` |
| `src/lib/auth/client.ts` | Modify | Export `forgetPassword`, `resetPassword` |
| `src/app/(auth)/forgot-password/page.tsx` | Create | Email-input form + success state |
| `src/app/(auth)/reset-password/page.tsx` | Create | New-password form + success/error states |
| `src/app/(auth)/sign-in/page.tsx` | (no change) | Already links to `/forgot-password` at line 137 |

Total: 3 created, 2 modified.

## 5. Empty / loading / error states

**`/forgot-password`:**

| State | UI |
|---|---|
| idle | Form with email input, submit button enabled |
| submitting | Submit disabled, label "Sending…" |
| sent (success) | Form replaced by "Check your inbox" card + "Didn't get it? Try again" link (resets to idle) |
| error | Inline error under the form: "Couldn't send the reset email. Try again or contact hello@energized.biz." Form stays editable. |

**`/reset-password`:**

| State | UI |
|---|---|
| no-token (in URL) | Error card: "This link is missing the reset token." → CTA `/forgot-password` |
| idle | Form with new + confirm password, submit enabled |
| password-mismatch | Client-side inline error: "Passwords don't match." (no API call) |
| submitting | Submit disabled, label "Updating…" |
| success | "Password updated. Sign in below." + CTA `/sign-in` |
| invalid-token | Inline error card: "This reset link is invalid or has expired." → CTA `/forgot-password` |

## 6. Brand & copy

- Headlines use Lato Black; subheads Lato Regular. No serif italic.
- Primary CTA classes: `v2-btn v2-btn-primary` (matches sign-in).
- Form fields use existing `v2-field` / `v2-field-label` / `v2-field-input` conventions from sign-in.
- Email template uses `#1CAAE2` for the CTA button background (brand blue).
- Error message tone: factual, no apology stacking. ("Couldn't send the reset email. Try again or contact hello@energized.biz.")
- Success message tone: confirming, brief. ("Password updated. You can now sign in with your new password.")

## 7. Testing

Deferred to a follow-up step. Test inventory to add when test infrastructure is set up:

- **Vitest:** test the `sendResetPassword` callback in isolation by mocking Resend (assert correct subject, react template props, error-throw behavior on Resend failure).
- **Playwright E2E:** happy-path flow — request reset on `/forgot-password`, intercept the email (via a mailcatcher or test-mode Resend stub), follow the link to `/reset-password`, set a new password, confirm sign-in works with the new password.
- **Playwright edge cases:** missing token → no-token state; expired token → invalid-token state; mismatched confirm → client-side error.
- **Snapshot tests for empty/success copy** on both pages.

## 8. Build order

1. New email template `src/emails/reset-password.tsx`.
2. Server `sendResetPassword` callback in `src/server/auth.ts`.
3. Auth client export additions in `src/lib/auth/client.ts`.
4. `/forgot-password` page (form + success state).
5. `/reset-password` page (form + success/error states).
6. Manual smoke test: request reset on a seeded user, click email link, set new password, sign in with new password.
