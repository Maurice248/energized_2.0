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
