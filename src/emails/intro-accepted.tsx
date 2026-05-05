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
  appUrl: string; // -> /employer/intro-requests?focus={id}
};

export default function IntroAcceptedEmail(p: Props) {
  return (
    <Html>
      <Head />
      <Preview>{p.candidateName} accepted your intro request</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>
            {p.candidateName} accepted your intro request
          </Heading>
          <Text>Hey {p.recipientName ?? "there"},</Text>
          <Text>
            <strong>{p.candidateName}</strong> accepted your intro request. You can now see their contact info.
          </Text>
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.appUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Open candidate
            </Button>
          </Section>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
