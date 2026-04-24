import {
  Body,
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
  candidateName: string;
  jobTitle: string;
  companyName: string;
  viewUrl: string;
};

const NAVY = "#004886";
const LIGHT_BLUE = "#1CABE3";
const INK_900 = "#14171F";
const INK_500 = "#6B7280";
const INK_200 = "#E4E7EE";
const BG = "#F9FAFC";

export default function ApplicationReceivedEmail({
  candidateName,
  jobTitle,
  companyName,
  viewUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        Your application to {companyName} for {jobTitle} is in.
      </Preview>
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
            maxWidth: 560,
            margin: "0 auto",
            padding: "40px 32px",
            background: "white",
            borderRadius: 16,
            border: `1px solid ${INK_200}`,
          }}
        >
          <Section style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 12,
                color: INK_500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: 0,
                fontWeight: 700,
              }}
            >
              Energized
            </Text>
          </Section>
          <Heading
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: INK_900,
              margin: "0 0 16px",
              fontStyle: "italic",
            }}
          >
            Your application is in.
          </Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            Hey {candidateName},
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            We sent your profile and cover note to{" "}
            <strong>{companyName}</strong> for <strong>{jobTitle}</strong>.
            They&apos;ll reach out directly if it&apos;s a fit.
          </Text>
          <Section style={{ marginTop: 28 }}>
            <Link
              href={viewUrl}
              style={{
                display: "inline-block",
                backgroundColor: INK_900,
                color: "white",
                padding: "12px 22px",
                borderRadius: 999,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              View application
            </Link>
          </Section>
          <Hr style={{ borderColor: INK_200, margin: "32px 0" }} />
          <Text style={{ fontSize: 12, color: INK_500, margin: 0 }}>
            You can track all your applications anytime on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>
              energized.biz
            </Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>
              Energy jobs that actually fit.
            </span>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
