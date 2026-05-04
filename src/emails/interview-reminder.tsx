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
    <Html>
      <Head />
      <Preview>Reminder: interview tomorrow at {p.startsAtLabel}</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>Interview tomorrow</Heading>
          <Text>Hey {p.recipientName ?? "there"},</Text>
          <Text>
            This is a reminder: your <strong>{p.jobTitle}</strong> interview at <strong>{p.companyName}</strong> is tomorrow at <strong>{p.startsAtLabel}</strong>.
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
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
