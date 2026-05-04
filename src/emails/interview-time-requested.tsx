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
  candidateName: string;
  jobTitle: string;
  message?: string | null;
  applicantUrl: string;
};

export default function InterviewTimeRequestedEmail(p: Props) {
  return (
    <Html>
      <Head />
      <Preview>{p.candidateName} asked for a different interview time</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>{p.candidateName} asked for a different interview time</Heading>
          <Text>Hey {p.recipientName ?? "there"},</Text>
          <Text>
            <strong>{p.candidateName}</strong> couldn't make any of the proposed times for the <strong>{p.jobTitle}</strong> role.
          </Text>
          {p.message && (
            <Section style={{ background: "#f0f7fb", borderRadius: 8, padding: 12, margin: "16px 0" }}>
              <Text style={{ margin: 0, fontStyle: "italic", color: "#004984" }}>"{p.message}"</Text>
            </Section>
          )}
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.applicantUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Propose new times
            </Button>
          </Section>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
