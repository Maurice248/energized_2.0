# Email template unification

## Problem

There are 15 email templates in `src/emails/` and three different visual styles between them:

- **Style A (4)** — `verify-email`, `reset-password`, `employer-verify-domain`, `team-invite`. Navy header w/ "Energ"+brand-blue "ized" wordmark, white rounded card, soft-grey body, rounded brand-blue pill CTA. This is the target.
- **Style B (4)** — `application-received`, `application-status-changed`, `employer-new-applicant`, `saved-search-digest`. Tiny uppercase "ENERGIZED" eyebrow, italic black headline, black pill CTA. No navy header.
- **Style C (7)** — all 5 `interview-*` and both `intro-*`. Lato font, light-blue rectangular button, plain "— Energized" sign-off. No navy header.

Also: `pnpm email:dev` errors on at least `saved-search-digest.tsx` (and likely other templates that read array props) because the React Email dev server renders each template with **no props by default**. Line 47 in that file calls `jobs.length` on undefined.

## Goal

Unify all 15 templates to **Style A**'s visual chrome, with **no change to sending behavior or copy** beyond the chrome itself. Fix the dev-server preview so every template renders cleanly in the email:dev UI.

## Non-goals

- No new logo image. Keep the text wordmark ("Energ" white + "ized" brand-blue) as the logo treatment — universal email-client compat, no hosting needed.
- No copy rewrites. Headings, lead paragraphs, button labels, dynamic interpolations all stay exactly as they are today.
- No font change. Style A uses the system-font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif`); we'll standardize on that and drop Style C's Lato.
- No change to the React Email or Resend integration.

## Architecture

### Shared components (new, under `src/emails/_components/`)

The leading `_` keeps these files out of the React Email preview sidebar (react-email convention).

**`src/emails/_components/email-tokens.ts`** — single source of truth for colors and the font stack used in every template:

```ts
export const NAVY = "#004886";
export const LIGHT_BLUE = "#1CABE3";
export const INK_900 = "#14171F";
export const INK_500 = "#6B7280";
export const INK_200 = "#E4E7EE";
export const BG = "#F9FAFC";
export const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif";
```

**`src/emails/_components/email-shell.tsx`** — owns the entire chrome:

- `<Html>` + `<Head>` + `<Body>` with `BG` background and the font stack.
- `<Container>` styled as the rounded white card with `INK_200` border, `maxWidth: 520`.
- Top `<Section>` with navy background and the wordmark `Energ` + brand-blue `ized`.
- Children render in a body `<Section>` with consistent padding (`40px 32px 8px`).
- Optional footer slot rendered after an `<Hr>`: shows the small grey "If you didn't…" / "You can track…" message that each template supplies via a `footer` prop. If `footer` is not provided, the `<Hr>` is omitted.

Props:
```ts
type EmailShellProps = {
  preview: string;        // <Preview> text (required — drives the inbox preview line)
  children: React.ReactNode;
  footer?: React.ReactNode;
};
```

**`src/emails/_components/email-ui.tsx`** — small primitives so each template stays short. Four exports:

- `<EmailHeading>` — h1, `fontSize: 26`, `fontWeight: 600`, `INK_900`, tight letter-spacing. Accepts `children`.
- `<EmailLead>` — paragraph, `fontSize: 15`, line-height 1.55, `INK_500`. Accepts `children` and an optional `style` for spacing overrides.
- `<EmailButtonPrimary>` — react-email `<Button>` styled as the brand-blue rounded pill, `INK_900` text, `borderRadius: 999`. Accepts `href` and `children`.
- `<EmailLinkFallback>` — used by the four auth/invite templates (verify-email, reset-password, employer-verify-domain, team-invite). Renders the "Button not working? Paste this link into your browser:" small grey hint plus the raw URL as a `<Link>`. Single `url` prop.

Each primitive is ≤ 20 lines. Inline styles only (email rendering requires it).

### Per-template refactor pattern

Every template becomes roughly:

```tsx
import { Hr, Section, Text } from "@react-email/components";
import {
  EmailShell,
  EmailHeading,
  EmailLead,
  EmailButtonPrimary,
} from "./_components/email-ui";
import { INK_500, NAVY } from "./_components/email-tokens";

type Props = { /* ...unchanged... */ };

export default function ApplicationReceivedEmail(props: Props) {
  return (
    <EmailShell
      preview={`Your application to ${props.companyName} for ${props.jobTitle} is in.`}
      footer={
        <Text style={{ fontSize: 12, color: INK_500, margin: 0 }}>
          You can track all your applications anytime on Energized.
        </Text>
      }
    >
      <EmailHeading>Your application is in.</EmailHeading>
      <EmailLead>Hey {props.candidateName},</EmailLead>
      <EmailLead>
        We sent your profile and cover note to <strong>{props.companyName}</strong>{" "}
        for <strong>{props.jobTitle}</strong>. They'll reach out directly if it's a fit.
      </EmailLead>
      <Section style={{ marginTop: 24, textAlign: "center" }}>
        <EmailButtonPrimary href={props.viewUrl}>View application</EmailButtonPrimary>
      </Section>
    </EmailShell>
  );
}

ApplicationReceivedEmail.PreviewProps = {
  candidateName: "Mara Solis",
  jobTitle: "Wind Technician II",
  companyName: "Trillium Wind",
  viewUrl: "https://energized.biz/applications/preview",
} satisfies Props;
```

The interview templates (`InterviewConfirmedEmail`, etc.) keep their unique inner content — the medium-label callout box, the calendar-invite mention — they just shed the Lato body and the old "— Energized" sign-off and live inside `<EmailShell>` instead.

### Preview props

Every template gets a `Template.PreviewProps = { ... } satisfies Props` block at the bottom, populated with realistic test values:
- Names: "Mara Solis", "Jordan Wells", "Priya Singh" (matches the seeded test users in the DB).
- Companies: "Trillium Wind", "Atlas Pipelines".
- Job titles: "Wind Technician II", "Reservoir Engineer".
- URLs: `https://energized.biz/<route>/preview` form.
- Arrays: `jobs` for the digest, list of 3 entries.
- Optional fields like `recipientName: null` exercised where applicable.

This fixes the `email:dev` preview errors and means every template can be visually QA'd in the browser.

## File map

**Create:**
- `src/emails/_components/email-tokens.ts`
- `src/emails/_components/email-shell.tsx`
- `src/emails/_components/email-ui.tsx`

**Modify (chrome refactor + PreviewProps):**
- `src/emails/application-received.tsx`
- `src/emails/application-status-changed.tsx`
- `src/emails/employer-new-applicant.tsx`
- `src/emails/employer-verify-domain.tsx`
- `src/emails/interview-canceled.tsx`
- `src/emails/interview-confirmed.tsx`
- `src/emails/interview-proposed.tsx`
- `src/emails/interview-reminder.tsx`
- `src/emails/interview-time-requested.tsx`
- `src/emails/intro-accepted.tsx`
- `src/emails/intro-requested.tsx`
- `src/emails/reset-password.tsx`
- `src/emails/saved-search-digest.tsx`
- `src/emails/team-invite.tsx`
- `src/emails/verify-email.tsx`

Style A templates (verify, reset, employer-verify-domain, team-invite) also get refactored to use the shell so the chrome lives in one place — same visual output.

## Risk / failure modes

- **React Email picking up `_components/` files as templates.** If the dev server lists them in the sidebar, we'll either rename to `email-components/` (no underscore but unconventional) or move them out to `src/lib/email/`. Verified during execution.
- **`EmailShell` font inheritance.** Some email clients (Outlook) don't honor font-family on `<Body>`. We mirror the existing per-element font fallback that Style A already uses on its `<Text>` elements implicitly via react-email defaults.
- **Preview-only props leaking to production sends.** `Template.PreviewProps` is a react-email convention — it's a static property the dev tool reads, not a runtime default. Sending code still passes real props.
- **Logo image hosting (deferred).** When/if we move to a PNG/SVG logo image, the shell is the only file that changes.

## Verification

After the refactor:

1. `pnpm typecheck` clean.
2. `pnpm email:dev` boots without prompts and lists exactly 15 templates (not the shared components).
3. Open each of the 15 in the browser at http://localhost:3001 — none throws, all show the navy header with wordmark, all share the rounded white card.
4. Spot-check 3 representative templates against the production rendering by sending a test email (optional, only if Resend dev key is configured).

No new automated tests (per ship-fast working style).

## Out of scope (deferred)

- Real logo image (PNG/SVG) in the header. Keep the text wordmark today; revisit when a hosted PNG is available.
- Dark-mode email rendering. Email clients are inconsistent here; not worth fighting for now.
- Localizing email copy. English-only for now.
- Re-naming the templates or splitting any large template. Each template stays one file.
