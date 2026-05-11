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
