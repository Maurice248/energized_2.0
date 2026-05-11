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
