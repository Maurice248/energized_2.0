# Email template unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all 15 React Email templates to Style A's visual chrome (navy header w/ Energized wordmark, soft body, blue rounded CTA), and add `PreviewProps` defaults so every template renders cleanly in `pnpm email:dev`.

**Architecture:** Extract Style A's chrome into a shared `<EmailShell>` component plus 4 small primitives (`<EmailHeading>`, `<EmailLead>`, `<EmailButtonPrimary>`, `<EmailLinkFallback>`). Refactor each of the 15 templates to use the shared components. Preserve all dynamic props and copy. Centralize color/font tokens.

**Tech Stack:** React Email v6, TypeScript strict. No new runtime dependencies; `@react-email/ui` (already added) provides the dev preview.

**Spec:** [`docs/superpowers/specs/2026-05-11-email-template-unification-design.md`](../specs/2026-05-11-email-template-unification-design.md)

**Working style:** ship-fast; no unit tests; verification = typecheck + browser walk-through of all 15 templates in the email:dev preview.

---

## File map

**Create:**
- `src/emails/_components/email-tokens.ts`
- `src/emails/_components/email-shell.tsx`
- `src/emails/_components/email-ui.tsx`

**Modify (refactor + add `PreviewProps`):** all 15 files under `src/emails/`.

---

## Task 1: Shared tokens + shell + primitives

**Files:**
- Create: `src/emails/_components/email-tokens.ts`
- Create: `src/emails/_components/email-shell.tsx`
- Create: `src/emails/_components/email-ui.tsx`

- [ ] **Step 1: Create `email-tokens.ts`**

```ts
// src/emails/_components/email-tokens.ts
// Shared color + font tokens for all email templates.
export const NAVY = "#004886";
export const LIGHT_BLUE = "#1CABE3";
export const INK_900 = "#14171F";
export const INK_500 = "#6B7280";
export const INK_200 = "#E4E7EE";
export const BG = "#F9FAFC";
export const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif";
```

- [ ] **Step 2: Create `email-shell.tsx`**

```tsx
// src/emails/_components/email-shell.tsx
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BG, EMAIL_FONT, INK_200, INK_900, LIGHT_BLUE, NAVY } from "./email-tokens";

type EmailShellProps = {
  preview: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function EmailShell({ preview, children, footer }: EmailShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BG,
          margin: 0,
          padding: "40px 0",
          fontFamily: EMAIL_FONT,
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
          <Section style={{ backgroundColor: NAVY, padding: "28px 32px" }}>
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

          <Section style={{ padding: "40px 32px 8px" }}>{children}</Section>

          {footer ? (
            <>
              <Hr style={{ borderColor: INK_200, margin: 0 }} />
              <Section style={{ padding: "20px 32px" }}>{footer}</Section>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Create `email-ui.tsx`**

```tsx
// src/emails/_components/email-ui.tsx
import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./email-tokens";

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </Heading>
  );
}

export function EmailLead({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Text
      style={{
        marginTop: 16,
        fontSize: 15,
        lineHeight: 1.55,
        color: INK_500,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButtonPrimary({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Section style={{ padding: "24px 0 8px", textAlign: "center" }}>
      <Button
        href={href}
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
        {children}
      </Button>
    </Section>
  );
}

export function EmailLinkFallback({ url }: { url: string }) {
  return (
    <Section style={{ padding: "24px 0 8px" }}>
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
        href={url}
        style={{ fontSize: 13, color: NAVY, wordBreak: "break-all" }}
      >
        {url}
      </Link>
    </Section>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/emails/_components/email-tokens.ts' \
        'src/emails/_components/email-shell.tsx' \
        'src/emails/_components/email-ui.tsx'
git commit -m "feat(emails): shared shell + ui primitives for unified template chrome"
```

---

## Task 2: Refactor 4 Style-A templates (verify, reset, employer-verify-domain, team-invite)

These already look right; we're moving their chrome into `<EmailShell>` so it lives in one place. Same visual output.

**Files:**
- Modify: `src/emails/verify-email.tsx`
- Modify: `src/emails/reset-password.tsx`
- Modify: `src/emails/employer-verify-domain.tsx`
- Modify: `src/emails/team-invite.tsx`

- [ ] **Step 1: Replace `verify-email.tsx` with**

```tsx
import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import {
  EmailButtonPrimary,
  EmailHeading,
  EmailLead,
  EmailLinkFallback,
} from "./_components/email-ui";
import { INK_500 } from "./_components/email-tokens";

type Props = {
  name: string;
  verifyUrl: string;
};

export default function VerifyEmail({ name, verifyUrl }: Props) {
  const first = name?.split(" ")[0] ?? "there";
  return (
    <EmailShell
      preview="Confirm your email to activate your Energized account"
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          If you didn&rsquo;t create an Energized account, you can safely ignore this email.
        </Text>
      }
    >
      <EmailHeading>Confirm your email, {first}.</EmailHeading>
      <EmailLead>
        Click the button below to activate your Energized account. The link is valid for the next hour.
      </EmailLead>
      <EmailButtonPrimary href={verifyUrl}>Confirm email</EmailButtonPrimary>
      <EmailLinkFallback url={verifyUrl} />
    </EmailShell>
  );
}

VerifyEmail.PreviewProps = {
  name: "Mara Solis",
  verifyUrl: "https://energized.biz/api/auth/verify-email?token=preview-token",
} satisfies Props;
```

- [ ] **Step 2: Replace `reset-password.tsx` with**

```tsx
import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import {
  EmailButtonPrimary,
  EmailHeading,
  EmailLead,
  EmailLinkFallback,
} from "./_components/email-ui";
import { INK_500 } from "./_components/email-tokens";

type Props = {
  name: string;
  resetUrl: string;
};

export default function ResetPassword({ name, resetUrl }: Props) {
  const first = name?.split(" ")[0] ?? "there";
  return (
    <EmailShell
      preview="Reset your Energized password"
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          If you didn&rsquo;t request a password reset, you can safely ignore this email.
        </Text>
      }
    >
      <EmailHeading>Reset your password, {first}.</EmailHeading>
      <EmailLead>
        Click the button below to set a new password. The link is valid for the next hour. If you didn&rsquo;t request this, you can safely ignore this email — your password won&rsquo;t change.
      </EmailLead>
      <EmailButtonPrimary href={resetUrl}>Reset password</EmailButtonPrimary>
      <EmailLinkFallback url={resetUrl} />
    </EmailShell>
  );
}

ResetPassword.PreviewProps = {
  name: "Jordan Wells",
  resetUrl: "https://energized.biz/api/auth/reset-password?token=preview-token",
} satisfies Props;
```

- [ ] **Step 3: Replace `employer-verify-domain.tsx` with**

```tsx
import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import {
  EmailButtonPrimary,
  EmailHeading,
  EmailLead,
  EmailLinkFallback,
} from "./_components/email-ui";
import { INK_500 } from "./_components/email-tokens";

type Props = {
  companyName: string;
  verifyUrl: string;
};

export default function EmployerVerifyDomainEmail({
  companyName,
  verifyUrl,
}: Props) {
  return (
    <EmailShell
      preview={`Confirm ${companyName} on Energized`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          The link expires in 1 hour. If you didn&rsquo;t request this, nothing else happens — ignore this email.
        </Text>
      }
    >
      <EmailHeading>Confirm {companyName}.</EmailHeading>
      <EmailLead>
        Someone is setting up {companyName} on Energized and used this address to prove they work there. Clicking the link will verify the company domain.
      </EmailLead>
      <EmailButtonPrimary href={verifyUrl}>Verify company</EmailButtonPrimary>
      <EmailLinkFallback url={verifyUrl} />
    </EmailShell>
  );
}

EmployerVerifyDomainEmail.PreviewProps = {
  companyName: "Trillium Wind",
  verifyUrl: "https://energized.biz/api/employer/verify-domain?token=preview-token",
} satisfies Props;
```

- [ ] **Step 4: Replace `team-invite.tsx` with**

```tsx
import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import {
  EmailButtonPrimary,
  EmailHeading,
  EmailLead,
  EmailLinkFallback,
} from "./_components/email-ui";
import { INK_500, INK_900 } from "./_components/email-tokens";

type Props = {
  inviterName: string;
  companyName: string;
  roleLabel: string;
  acceptUrl: string;
};

export default function TeamInviteEmail({
  inviterName,
  companyName,
  roleLabel,
  acceptUrl,
}: Props) {
  return (
    <EmailShell
      preview={`${inviterName} invited you to ${companyName} on Energized`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          Invite links expire after 7 days. If you weren&rsquo;t expecting this invite, you can safely ignore it.
        </Text>
      }
    >
      <EmailHeading>Join {companyName} on Energized.</EmailHeading>
      <EmailLead>
        <strong style={{ color: INK_900 }}>{inviterName}</strong> added you as a{" "}
        <strong style={{ color: INK_900 }}>{roleLabel}</strong> for {companyName}. Accept the invite to view the team and manage hiring.
      </EmailLead>
      <EmailButtonPrimary href={acceptUrl}>Accept invite</EmailButtonPrimary>
      <EmailLinkFallback url={acceptUrl} />
    </EmailShell>
  );
}

TeamInviteEmail.PreviewProps = {
  inviterName: "Avery Tran",
  companyName: "Trillium Wind",
  roleLabel: "Recruiter",
  acceptUrl: "https://energized.biz/employer/invite?token=preview-token",
} satisfies Props;
```

- [ ] **Step 5: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/verify-email.tsx src/emails/reset-password.tsx \
        src/emails/employer-verify-domain.tsx src/emails/team-invite.tsx && \
git commit -m "refactor(emails): use shared EmailShell for the 4 auth/invite templates"
```

---

## Task 3: Refactor `application-received.tsx`

**Files:**
- Modify: `src/emails/application-received.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Link, Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

type Props = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  viewUrl: string;
};

export default function ApplicationReceivedEmail({
  candidateName,
  jobTitle,
  companyName,
  viewUrl,
}: Props) {
  return (
    <EmailShell
      preview={`Your application to ${companyName} for ${jobTitle} is in.`}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You can track all your applications anytime on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy jobs that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>Your application is in.</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {candidateName},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        We sent your profile and cover note to <strong>{companyName}</strong> for{" "}
        <strong>{jobTitle}</strong>. They&apos;ll reach out directly if it&rsquo;s a fit.
      </Text>
      <EmailButtonPrimary href={viewUrl}>View application</EmailButtonPrimary>
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

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/application-received.tsx && \
git commit -m "refactor(emails): unify application-received chrome + add PreviewProps"
```

---

## Task 4: Refactor `application-status-changed.tsx`

**Files:**
- Modify: `src/emails/application-status-changed.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Link, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

export type StatusChangeStatus =
  | "reviewed"
  | "interview"
  | "offer"
  | "rejected";

type Props = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  status: StatusChangeStatus;
  viewUrl: string;
};

const COPY: Record<
  StatusChangeStatus,
  { preview: string; heading: string; body: (job: string, co: string) => string; cta: string }
> = {
  reviewed: {
    preview: "Your application is under review.",
    heading: "Your application is under review.",
    body: (job, co) =>
      `${co} is taking a closer look at your application for ${job}. We'll let you know when there's an update.`,
    cta: "View application",
  },
  interview: {
    preview: "You've been invited to interview.",
    heading: "Interview time.",
    body: (job, co) =>
      `${co} wants to interview you for ${job}. They'll reach out directly to schedule the next step.`,
    cta: "View application",
  },
  offer: {
    preview: "You have an offer.",
    heading: "You have an offer.",
    body: (job, co) =>
      `${co} has extended an offer for ${job}. Check your application page and watch for their direct outreach.`,
    cta: "View offer",
  },
  rejected: {
    preview: "An update on your application.",
    heading: "An update on your application.",
    body: (job, co) =>
      `${co} has decided not to move forward with your application for ${job}. Don't let it slow you down — your next role is on the board.`,
    cta: "Browse jobs",
  },
};

export default function ApplicationStatusChangedEmail({
  candidateName,
  jobTitle,
  companyName,
  status,
  viewUrl,
}: Props) {
  const copy = COPY[status];
  return (
    <EmailShell
      preview={copy.preview}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You can track every update on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy jobs that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>{copy.heading}</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {candidateName},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {copy.body(jobTitle, companyName)}
      </Text>
      <EmailButtonPrimary href={viewUrl}>{copy.cta}</EmailButtonPrimary>
    </EmailShell>
  );
}

ApplicationStatusChangedEmail.PreviewProps = {
  candidateName: "Mara Solis",
  jobTitle: "Wind Technician II",
  companyName: "Trillium Wind",
  status: "interview",
  viewUrl: "https://energized.biz/applications/preview",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/application-status-changed.tsx && \
git commit -m "refactor(emails): unify application-status-changed chrome + add PreviewProps"
```

---

## Task 5: Refactor `employer-new-applicant.tsx`

**Files:**
- Modify: `src/emails/employer-new-applicant.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Link, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

type Props = {
  recipientName: string | null;
  candidateName: string;
  candidateHeadline: string | null;
  jobTitle: string;
  companyName: string;
  applicantsUrl: string;
};

export default function EmployerNewApplicantEmail({
  recipientName,
  candidateName,
  candidateHeadline,
  jobTitle,
  companyName,
  applicantsUrl,
}: Props) {
  return (
    <EmailShell
      preview={`New applicant for ${jobTitle} — ${candidateName}`}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You&rsquo;re receiving this because you posted a role on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy hires that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>New applicant for {jobTitle}.</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {recipientName ? `Hey ${recipientName},` : "Heads up,"}
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{candidateName}</strong>
        {candidateHeadline ? ` — ${candidateHeadline}` : ""} just applied to{" "}
        <strong>{jobTitle}</strong>.
      </Text>
      <EmailButtonPrimary href={applicantsUrl}>Review applicants</EmailButtonPrimary>
    </EmailShell>
  );
}

EmployerNewApplicantEmail.PreviewProps = {
  recipientName: "Avery Tran",
  candidateName: "Mara Solis",
  candidateHeadline: "GWO-certified wind technician, 6 years onshore",
  jobTitle: "Wind Technician II",
  companyName: "Trillium Wind",
  applicantsUrl: "https://energized.biz/employer/applicants/preview",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/employer-new-applicant.tsx && \
git commit -m "refactor(emails): unify employer-new-applicant chrome + add PreviewProps"
```

---

## Task 6: Refactor `saved-search-digest.tsx` (also fixes the preview error)

**Files:**
- Modify: `src/emails/saved-search-digest.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Link, Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

export type DigestJob = {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  sectorLabel: string | null;
};

type Props = {
  recipientName: string | null;
  searchName: string;
  searchHref: string;
  jobs: DigestJob[];
  appUrl: string;
};

export default function SavedSearchDigestEmail({
  recipientName,
  searchName,
  searchHref,
  jobs,
  appUrl,
}: Props) {
  const count = jobs.length;
  return (
    <EmailShell
      preview={`${count} new ${count === 1 ? "role" : "roles"} for "${searchName}"`}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You&rsquo;re receiving this because you saved &ldquo;{searchName}&rdquo; on Energized. Manage saved searches from the /jobs sidebar.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy jobs that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>New for &ldquo;{searchName}&rdquo;</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {count === 1 ? "1 new role" : `${count} new roles`} posted in the last 24 hours match your saved search.
      </Text>
      <Section style={{ marginTop: 16 }}>
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`${appUrl}/jobs/${j.id}`}
            style={{
              display: "block",
              padding: "14px 16px",
              border: `1px solid ${INK_200}`,
              borderRadius: 12,
              textDecoration: "none",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: 700, color: INK_900, margin: 0 }}>
              {j.title}
            </Text>
            <Text style={{ fontSize: 13, color: INK_500, margin: "4px 0 0" }}>
              {j.companyName}
              {j.location ? ` · ${j.location}` : ""}
              {j.sectorLabel ? ` · ${j.sectorLabel}` : ""}
            </Text>
          </Link>
        ))}
      </Section>
      <EmailButtonPrimary href={searchHref}>View all matches</EmailButtonPrimary>
    </EmailShell>
  );
}

SavedSearchDigestEmail.PreviewProps = {
  recipientName: "Mara Solis",
  searchName: "Wind tech · Alberta · 14/7",
  searchHref: "https://energized.biz/jobs?saved=preview",
  appUrl: "https://energized.biz",
  jobs: [
    {
      id: "job-1",
      title: "Wind Technician II",
      companyName: "Trillium Wind",
      location: "Pincher Creek, AB",
      sectorLabel: "Renewables",
    },
    {
      id: "job-2",
      title: "Lead Wind Tech",
      companyName: "Northern Power",
      location: "Lethbridge, AB",
      sectorLabel: "Renewables",
    },
    {
      id: "job-3",
      title: "Wind Site Supervisor",
      companyName: "Atlas Pipelines",
      location: "Calgary, AB",
      sectorLabel: "Renewables",
    },
  ],
} satisfies Props;
```

- [ ] **Step 2: Typecheck + verify preview no longer errors**

```bash
pnpm typecheck
```

Then in the browser open http://localhost:3001 and click the saved-search-digest template — it should render the three sample jobs without throwing.

- [ ] **Step 3: Commit**

```bash
git add src/emails/saved-search-digest.tsx && \
git commit -m "refactor(emails): unify saved-search-digest chrome + add PreviewProps (fixes preview error)"
```

---

## Task 7: Refactor `interview-confirmed.tsx`

**Files:**
- Modify: `src/emails/interview-confirmed.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_500, INK_900, NAVY } from "./_components/email-tokens";

type Props = {
  recipientName: string | null;
  companyName: string;
  jobTitle: string;
  startsAtLabel: string;
  durationMin: number;
  medium: "video" | "phone" | "in_person";
  details: string;
  detailUrl: string;
  appUrl: string;
};

const MEDIUM_LABEL: Record<Props["medium"], string> = {
  video: "Join via video",
  phone: "Call this number",
  in_person: "Meet at",
};

export default function InterviewConfirmedEmail(p: Props) {
  return (
    <EmailShell
      preview={`Interview confirmed — ${p.startsAtLabel}`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          Need to cancel or reschedule? Use the same link above. The in-app action is cleaner than replying.
        </Text>
      }
    >
      <EmailHeading>Interview confirmed</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Your interview for <strong>{p.jobTitle}</strong> at <strong>{p.companyName}</strong> is confirmed for{" "}
        <strong>{p.startsAtLabel}</strong> ({p.durationMin} min). The calendar invite is attached.
      </Text>
      <Section
        style={{
          background: "#f0f7fb",
          border: `1px solid ${INK_200}`,
          borderRadius: 12,
          padding: 16,
          margin: "16px 0",
        }}
      >
        <Text style={{ margin: 0, fontWeight: 700, fontSize: 13, color: NAVY }}>
          {MEDIUM_LABEL[p.medium]}
        </Text>
        <Text style={{ margin: "4px 0 0", wordBreak: "break-all", fontSize: 14, color: INK_900 }}>
          {p.details}
        </Text>
      </Section>
      <EmailButtonPrimary href={p.detailUrl}>View in Energized</EmailButtonPrimary>
    </EmailShell>
  );
}

InterviewConfirmedEmail.PreviewProps = {
  recipientName: "Mara Solis",
  companyName: "Trillium Wind",
  jobTitle: "Wind Technician II",
  startsAtLabel: "Tue, May 19 · 2:00 PM (America/Edmonton)",
  durationMin: 45,
  medium: "video",
  details: "https://meet.example.com/abc-defg-hij",
  detailUrl: "https://energized.biz/applications/preview",
  appUrl: "https://energized.biz",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/interview-confirmed.tsx && \
git commit -m "refactor(emails): unify interview-confirmed chrome + add PreviewProps"
```

---

## Task 8: Refactor `interview-canceled.tsx`

**Files:**
- Modify: `src/emails/interview-canceled.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_500, INK_900 } from "./_components/email-tokens";

export type CancelVariant = "canceled" | "expired" | "rescheduled";

type Props = {
  variant: CancelVariant;
  recipientName: string | null;
  companyName: string;
  jobTitle: string;
  cancelReason?: string | null;
  appUrl: string;
};

const HEADING: Record<CancelVariant, string> = {
  canceled: "Interview canceled",
  expired: "Interview proposal expired",
  rescheduled: "Interview rescheduled",
};

const BODY: Record<CancelVariant, (companyName: string, jobTitle: string) => string> = {
  canceled: (co, j) => `The interview for ${j} at ${co} has been canceled.`,
  expired: (co, j) =>
    `The proposed times for your ${j} interview at ${co} expired without a response. The employer can still propose new times.`,
  rescheduled: (co, j) =>
    `${co} updated the times for your ${j} interview. Check your inbox for the new proposal email.`,
};

export default function InterviewCanceledEmail(p: Props) {
  return (
    <EmailShell preview={`${HEADING[p.variant]} — ${p.jobTitle}`}>
      <EmailHeading>{HEADING[p.variant]}</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {BODY[p.variant](p.companyName, p.jobTitle)}
      </Text>
      {p.variant === "canceled" && p.cancelReason ? (
        <Section
          style={{
            background: "#fff5f5",
            borderRadius: 12,
            padding: 14,
            margin: "16px 0",
          }}
        >
          <Text style={{ margin: 0, fontStyle: "italic", fontSize: 14, color: "#742a2a" }}>
            &ldquo;{p.cancelReason}&rdquo;
          </Text>
        </Section>
      ) : null}
      <EmailButtonPrimary href={p.appUrl}>Open Energized</EmailButtonPrimary>
      <Text style={{ marginTop: 16, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
        You can manage interviews from your dashboard at any time.
      </Text>
    </EmailShell>
  );
}

InterviewCanceledEmail.PreviewProps = {
  variant: "canceled",
  recipientName: "Mara Solis",
  companyName: "Trillium Wind",
  jobTitle: "Wind Technician II",
  cancelReason: "Position is on hold pending Q3 budget review.",
  appUrl: "https://energized.biz/dashboard",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/interview-canceled.tsx && \
git commit -m "refactor(emails): unify interview-canceled chrome + add PreviewProps"
```

---

## Task 9: Refactor `interview-proposed.tsx`

**Files:**
- Modify: `src/emails/interview-proposed.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_500, INK_900, NAVY } from "./_components/email-tokens";

type Props = {
  candidateName: string | null;
  companyName: string;
  jobTitle: string;
  proposerName: string;
  notes?: string | null;
  slots: { startsAt: Date; label: string }[];
  durationMin: number;
  applicationUrl: string;
  expiresAtLabel: string;
  wasRescheduled?: boolean;
};

export default function InterviewProposedEmail(p: Props) {
  const heading = p.wasRescheduled
    ? `${p.companyName} rescheduled your interview`
    : `Pick a time for your interview at ${p.companyName}`;

  return (
    <EmailShell
      preview={`${p.wasRescheduled ? "Updated times for your" : "Pick a time for your"} interview (${p.jobTitle})`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          Offer expires {p.expiresAtLabel}. If none of these times work, you can request a different time from the same screen.
        </Text>
      }
    >
      <EmailHeading>{heading}</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.candidateName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {p.proposerName} from <strong>{p.companyName}</strong> has proposed the following times for your{" "}
        <strong>{p.jobTitle}</strong> interview ({p.durationMin} min). Pick one in the app.
      </Text>
      {p.notes ? (
        <Section
          style={{
            background: "#f0f7fb",
            border: `1px solid ${INK_200}`,
            borderRadius: 12,
            padding: 14,
            margin: "16px 0",
          }}
        >
          <Text style={{ margin: 0, fontStyle: "italic", fontSize: 14, color: NAVY }}>
            {p.notes}
          </Text>
        </Section>
      ) : null}
      <Section style={{ margin: "16px 0" }}>
        {p.slots.map((s, i) => (
          <Text key={i} style={{ margin: "4px 0", fontSize: 15, color: INK_900 }}>
            • {s.label}
          </Text>
        ))}
      </Section>
      <EmailButtonPrimary href={p.applicationUrl}>Pick a time</EmailButtonPrimary>
    </EmailShell>
  );
}

InterviewProposedEmail.PreviewProps = {
  candidateName: "Mara Solis",
  companyName: "Trillium Wind",
  jobTitle: "Wind Technician II",
  proposerName: "Avery Tran",
  notes: "Happy to do video or phone — whichever's easier for you.",
  slots: [
    { startsAt: new Date(), label: "Tue, May 19 · 2:00 PM (America/Edmonton)" },
    { startsAt: new Date(), label: "Wed, May 20 · 10:30 AM (America/Edmonton)" },
    { startsAt: new Date(), label: "Thu, May 21 · 4:00 PM (America/Edmonton)" },
  ],
  durationMin: 45,
  applicationUrl: "https://energized.biz/applications/preview",
  expiresAtLabel: "May 18, 2026",
  wasRescheduled: false,
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/interview-proposed.tsx && \
git commit -m "refactor(emails): unify interview-proposed chrome + add PreviewProps"
```

---

## Task 10: Refactor `interview-reminder.tsx`

**Files:**
- Modify: `src/emails/interview-reminder.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_900, NAVY } from "./_components/email-tokens";

type Props = {
  recipientName: string | null;
  companyName: string;
  jobTitle: string;
  startsAtLabel: string;
  medium: "video" | "phone" | "in_person";
  details: string;
  detailUrl: string;
};

const MEDIUM_LABEL: Record<Props["medium"], string> = {
  video: "Join via video",
  phone: "Call this number",
  in_person: "Meet at",
};

export default function InterviewReminderEmail(p: Props) {
  return (
    <EmailShell preview={`Reminder: interview tomorrow at ${p.startsAtLabel}`}>
      <EmailHeading>Interview tomorrow</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        This is a reminder: your <strong>{p.jobTitle}</strong> interview at{" "}
        <strong>{p.companyName}</strong> is tomorrow at <strong>{p.startsAtLabel}</strong>.
      </Text>
      <Section
        style={{
          background: "#f0f7fb",
          border: `1px solid ${INK_200}`,
          borderRadius: 12,
          padding: 16,
          margin: "16px 0",
        }}
      >
        <Text style={{ margin: 0, fontWeight: 700, fontSize: 13, color: NAVY }}>
          {MEDIUM_LABEL[p.medium]}
        </Text>
        <Text style={{ margin: "4px 0 0", wordBreak: "break-all", fontSize: 14, color: INK_900 }}>
          {p.details}
        </Text>
      </Section>
      <EmailButtonPrimary href={p.detailUrl}>View in Energized</EmailButtonPrimary>
    </EmailShell>
  );
}

InterviewReminderEmail.PreviewProps = {
  recipientName: "Mara Solis",
  companyName: "Trillium Wind",
  jobTitle: "Wind Technician II",
  startsAtLabel: "Tue, May 19 · 2:00 PM (America/Edmonton)",
  medium: "video",
  details: "https://meet.example.com/abc-defg-hij",
  detailUrl: "https://energized.biz/applications/preview",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/interview-reminder.tsx && \
git commit -m "refactor(emails): unify interview-reminder chrome + add PreviewProps"
```

---

## Task 11: Refactor `interview-time-requested.tsx`

**Files:**
- Modify: `src/emails/interview-time-requested.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_900, NAVY } from "./_components/email-tokens";

type Props = {
  recipientName: string | null;
  candidateName: string;
  jobTitle: string;
  message?: string | null;
  applicantUrl: string;
};

export default function InterviewTimeRequestedEmail(p: Props) {
  return (
    <EmailShell preview={`${p.candidateName} asked for a different interview time`}>
      <EmailHeading>{p.candidateName} asked for a different interview time</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{p.candidateName}</strong> couldn&rsquo;t make any of the proposed times for the{" "}
        <strong>{p.jobTitle}</strong> role.
      </Text>
      {p.message ? (
        <Section
          style={{
            background: "#f0f7fb",
            border: `1px solid ${INK_200}`,
            borderRadius: 12,
            padding: 14,
            margin: "16px 0",
          }}
        >
          <Text style={{ margin: 0, fontStyle: "italic", fontSize: 14, color: NAVY }}>
            &ldquo;{p.message}&rdquo;
          </Text>
        </Section>
      ) : null}
      <EmailButtonPrimary href={p.applicantUrl}>Propose new times</EmailButtonPrimary>
    </EmailShell>
  );
}

InterviewTimeRequestedEmail.PreviewProps = {
  recipientName: "Avery Tran",
  candidateName: "Mara Solis",
  jobTitle: "Wind Technician II",
  message: "I'm on rotation through May 22 — could we look at the following week?",
  applicantUrl: "https://energized.biz/employer/applicants/preview",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/interview-time-requested.tsx && \
git commit -m "refactor(emails): unify interview-time-requested chrome + add PreviewProps"
```

---

## Task 12: Refactor `intro-requested.tsx`

**Files:**
- Modify: `src/emails/intro-requested.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_500, INK_900, NAVY } from "./_components/email-tokens";

type Props = {
  candidateName: string | null;
  orgName: string;
  requesterName: string;
  message: string | null;
  appUrl: string;
};

export default function IntroRequestedEmail(p: Props) {
  return (
    <EmailShell
      preview={`${p.orgName} would like an intro on Energized`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          You can decline anytime — your contact info stays hidden until you accept.
        </Text>
      }
    >
      <EmailHeading>{p.orgName} would like an intro</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.candidateName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{p.requesterName}</strong> at <strong>{p.orgName}</strong> would like to be introduced to you.
      </Text>
      {p.message ? (
        <Section
          style={{
            background: "#f0f7fb",
            border: `1px solid ${INK_200}`,
            borderRadius: 12,
            padding: 14,
            margin: "16px 0",
          }}
        >
          <Text style={{ margin: 0, fontStyle: "italic", fontSize: 14, color: NAVY }}>
            {p.message}
          </Text>
        </Section>
      ) : null}
      <EmailButtonPrimary href={p.appUrl}>Review request</EmailButtonPrimary>
    </EmailShell>
  );
}

IntroRequestedEmail.PreviewProps = {
  candidateName: "Mara Solis",
  orgName: "Trillium Wind",
  requesterName: "Avery Tran",
  message: "Loved your recent project at Site-14 — would value a quick chat about a lead-tech opening.",
  appUrl: "https://energized.biz/dashboard#intros",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/intro-requested.tsx && \
git commit -m "refactor(emails): unify intro-requested chrome + add PreviewProps"
```

---

## Task 13: Refactor `intro-accepted.tsx`

**Files:**
- Modify: `src/emails/intro-accepted.tsx`

- [ ] **Step 1: Replace the whole file with**

```tsx
import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_900 } from "./_components/email-tokens";

type Props = {
  recipientName: string | null;
  candidateName: string;
  appUrl: string;
};

export default function IntroAcceptedEmail(p: Props) {
  return (
    <EmailShell preview={`${p.candidateName} accepted your intro request`}>
      <EmailHeading>{p.candidateName} accepted your intro request</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{p.candidateName}</strong> accepted your intro request. You can now see their contact info.
      </Text>
      <EmailButtonPrimary href={p.appUrl}>Open candidate</EmailButtonPrimary>
    </EmailShell>
  );
}

IntroAcceptedEmail.PreviewProps = {
  recipientName: "Avery Tran",
  candidateName: "Mara Solis",
  appUrl: "https://energized.biz/employer/intro-requests?focus=preview",
} satisfies Props;
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && \
git add src/emails/intro-accepted.tsx && \
git commit -m "refactor(emails): unify intro-accepted chrome + add PreviewProps"
```

---

## Task 14: Verify all 15 in `email:dev` + lint

- [ ] **Step 1: Restart the email dev server**

```bash
pkill -f "email dev" 2>/dev/null; sleep 1; (pnpm email:dev > /tmp/emaildev.log 2>&1 &)
sleep 6 && tail -10 /tmp/emaildev.log
```

Expected: `React Email 6.0.0 · Running preview at: http://localhost:3001 · Ready in 0.3s`.

- [ ] **Step 2: Confirm sidebar lists exactly 15 templates**

```bash
curl -s http://localhost:3001 | grep -oE '"[a-z][a-z0-9-]+"' | sort -u | grep -E '^"(application|employer|intro|interview|reset|saved|team|verify)' | head -20
```

The shared components in `_components/` should not appear in this list. If they do (some react-email versions scan recursively without honoring the `_` prefix), move them to `src/lib/email/` and update the import paths in every template (search/replace `from "./_components/` → `from "@/lib/email/`).

- [ ] **Step 3: Walk through each template in the browser**

Open http://localhost:3001 and click through all 15 templates. For each, confirm:
- The navy header with the "Energ"/"ized" wordmark renders.
- The heading, body, and CTA show.
- No error overlay (the red bar from React's error boundary).

If any throws, the cause is almost always a missing `PreviewProps` field — open the file and add the missing key.

- [ ] **Step 4: Lint**

```bash
pnpm lint 2>&1 | grep -E "src/emails" | head -30
```

Expected: no new errors in `src/emails/`. Pre-existing errors in `src/emails/interview-canceled.tsx` and `src/emails/interview-time-requested.tsx` (unescaped quotes) should now be gone — the refactor replaced raw `"` with `&ldquo;`/`&rdquo;`.

- [ ] **Step 5: Push branch (if on a feature branch) or stay on master**

This refactor is a single coherent change; user prefers ship-fast on a feature branch with a PR. From a fresh state on master:

```bash
git checkout -b feat/email-template-unification
# Tasks 1–13 commits accumulate on this branch.
git push -u origin feat/email-template-unification
gh pr create --title "feat(emails): unify all 15 templates to Style A chrome" --body "$(cat <<'EOF'
## Summary

- Extracts Style A's chrome (navy header + wordmark, soft body, blue pill CTA) into a shared \`<EmailShell>\` + 4 small primitives under \`src/emails/_components/\`.
- Refactors all 15 templates to use them — same dynamic props and copy, only chrome unified.
- Adds \`Template.PreviewProps\` to every template so \`pnpm email:dev\` renders all 15 without errors. Fixes the \`saved-search-digest.tsx:47:24\` \`Cannot read properties of undefined\` error.
- No new runtime dependencies. No change to Resend sending paths.

## Test plan

- [ ] \`pnpm typecheck\` clean
- [ ] \`pnpm email:dev\` boots cleanly
- [ ] Open http://localhost:3001 — sidebar lists exactly 15 templates (no \`_components\` leakage)
- [ ] Click each of the 15 templates: navy header with wordmark, no red error overlay
- [ ] Spot-check that one auth template (verify-email) still routes to \`/api/auth/verify-email\` from a real signup (manual)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

If the user prefers committing straight to master (the current branch is master), skip the branch + PR steps.

---

## Out of scope (do NOT implement)

- Real PNG/SVG logo image in the header (deferred — text wordmark stays).
- Dark-mode email rendering.
- Localizing email copy.
- Refactoring how `EmailButtonPrimary` is rendered (e.g. mso-friendly VML for Outlook bullet-proof buttons). The existing react-email `<Button>` is already best-effort.
- Renaming or merging any of the 15 template files.
