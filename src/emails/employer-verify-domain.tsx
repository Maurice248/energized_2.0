import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  companyName: string;
  verifyUrl: string;
};

const NAVY = "#004886";
const LIGHT_BLUE = "#1CABE3";
const INK_900 = "#14171F";
const INK_500 = "#6B7280";
const INK_200 = "#E4E7EE";
const BG = "#F9FAFC";

export default function EmployerVerifyDomainEmail({
  companyName,
  verifyUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Confirm {companyName} on Energized</Preview>
      <Body
        style={{
          backgroundColor: BG,
          margin: 0,
          padding: "40px 0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif",
          color: INK_900,
        }}
      >
        <Container
          style={{
            maxWidth: 520,
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: 14,
            border: `1px solid ${INK_200}`,
            overflow: "hidden",
          }}
        >
          <Section style={{ backgroundColor: NAVY, padding: "28px 32px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              Energ<span style={{ color: LIGHT_BLUE }}>ized</span>
            </Text>
          </Section>

          <Section style={{ padding: "40px 32px 8px" }}>
            <Heading
              as="h1"
              style={{
                margin: 0,
                fontSize: 26,
                lineHeight: 1.2,
                fontWeight: 600,
                color: INK_900,
                letterSpacing: "-0.015em",
              }}
            >
              Confirm {companyName}.
            </Heading>
            <Text
              style={{
                marginTop: 16,
                fontSize: 15,
                lineHeight: 1.55,
                color: INK_500,
              }}
            >
              Someone is setting up {companyName} on Energized and used this
              address to prove they work there. Clicking the link will verify
              the company domain.
            </Text>
          </Section>

          <Section style={{ padding: "24px 32px 8px", textAlign: "center" }}>
            <Button
              href={verifyUrl}
              style={{
                backgroundColor: LIGHT_BLUE,
                color: INK_900,
                fontWeight: 600,
                fontSize: 15,
                padding: "12px 24px",
                borderRadius: 999,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Verify company
            </Button>
          </Section>

          <Section style={{ padding: "24px 32px 32px" }}>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: INK_500,
                margin: 0,
              }}
            >
              Button not working? Paste this link into your browser:
            </Text>
            <Link
              href={verifyUrl}
              style={{ fontSize: 13, color: NAVY, wordBreak: "break-all" }}
            >
              {verifyUrl}
            </Link>
          </Section>

          <Hr style={{ borderColor: INK_200, margin: 0 }} />

          <Section style={{ padding: "20px 32px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.55,
                color: INK_500,
              }}
            >
              The link expires in 1 hour. If you didn&rsquo;t request this,
              nothing else happens — ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
