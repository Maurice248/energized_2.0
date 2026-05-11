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
