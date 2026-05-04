import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  candidateName: string | null;
  companyName: string;
  jobTitle: string;
  proposerName: string;
  notes?: string | null;
  slots: { startsAt: Date; label: string }[]; // label is pre-formatted in viewer-tz friendly form
  durationMin: number;
  applicationUrl: string;
  expiresAtLabel: string; // "May 9, 2026"
  wasRescheduled?: boolean;
};

export default function InterviewProposedEmail(p: Props) {
  const heading = p.wasRescheduled
    ? `${p.companyName} rescheduled your interview`
    : `Pick a time for your interview at ${p.companyName}`;

  return (
    <Html>
      <Head />
      <Preview>
        {p.wasRescheduled ? "Updated times for your" : "Pick a time for your"} interview ({p.jobTitle})
      </Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>{heading}</Heading>
          <Text>Hey {p.candidateName ?? "there"},</Text>
          <Text>
            {p.proposerName} from <strong>{p.companyName}</strong> has proposed the following times for your <strong>{p.jobTitle}</strong> interview ({p.durationMin} min). Pick one in the app.
          </Text>
          {p.notes && (
            <Section style={{ background: "#f0f7fb", borderRadius: 8, padding: 12, margin: "16px 0" }}>
              <Text style={{ margin: 0, fontStyle: "italic", color: "#004984" }}>{p.notes}</Text>
            </Section>
          )}
          <Section style={{ margin: "16px 0" }}>
            {p.slots.map((s, i) => (
              <Text key={i} style={{ margin: "4px 0", color: "#101820" }}>• {s.label}</Text>
            ))}
          </Section>
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.applicationUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Pick a time
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "#666" }}>
            Offer expires {p.expiresAtLabel}. If none of these times work, you can request a different time from the same screen.
          </Text>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
