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
  recipientName: string | null;
  companyName: string;
  jobTitle: string;
  startsAtLabel: string;     // "Tue, May 6 · 2:00 PM (America/Edmonton)"
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
    <Html>
      <Head />
      <Preview>Interview confirmed — {p.startsAtLabel}</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>Interview confirmed</Heading>
          <Text>Hey {p.recipientName ?? "there"},</Text>
          <Text>
            Your interview for <strong>{p.jobTitle}</strong> at <strong>{p.companyName}</strong> is confirmed for <strong>{p.startsAtLabel}</strong> ({p.durationMin} min). The calendar invite is attached.
          </Text>
          <Section style={{ background: "#f0f7fb", borderRadius: 8, padding: 16, margin: "16px 0" }}>
            <Text style={{ margin: 0, fontWeight: 700, color: "#004984" }}>{MEDIUM_LABEL[p.medium]}</Text>
            <Text style={{ margin: "4px 0 0", wordBreak: "break-all", color: "#101820" }}>{p.details}</Text>
          </Section>
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.detailUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              View in Energized
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "#666" }}>
            Need to cancel or reschedule? Use the same link above. (Or reply to this email — but the in-app action is cleaner.)
          </Text>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
