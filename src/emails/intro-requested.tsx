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
  orgName: string;
  requesterName: string;
  message: string | null;
  appUrl: string; // -> /dashboard#intros
};

export default function IntroRequestedEmail(p: Props) {
  return (
    <Html>
      <Head />
      <Preview>{p.orgName} would like an intro on Energized</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>
            {p.orgName} would like an intro
          </Heading>
          <Text>Hey {p.candidateName ?? "there"},</Text>
          <Text>
            <strong>{p.requesterName}</strong> at <strong>{p.orgName}</strong> would like to be introduced to you.
          </Text>
          {p.message && (
            <Section style={{ background: "#f0f7fb", borderRadius: 8, padding: 12, margin: "16px 0" }}>
              <Text style={{ margin: 0, fontStyle: "italic", color: "#004984" }}>{p.message}</Text>
            </Section>
          )}
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.appUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Review request
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "#666" }}>
            You can decline anytime — your contact info stays hidden until you accept.
          </Text>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
