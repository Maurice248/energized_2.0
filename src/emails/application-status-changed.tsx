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

export type StatusChangeStatus =
  | "reviewed"
  | "interview"
  | "offer"
  | "rejected";

type Props = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  status: StatusChangeStatus;
  viewUrl: string;
};

const NAVY = "#004886";
const LIGHT_BLUE = "#1CABE3";
const INK_900 = "#14171F";
const INK_500 = "#6B7280";
const INK_200 = "#E4E7EE";
const BG = "#F9FAFC";

const COPY: Record<
  StatusChangeStatus,
  { preview: string; heading: string; body: (job: string, co: string) => string; cta: string }
> = {
  reviewed: {
    preview: "Your application is under review.",
    heading: "Your application is under review.",
    body: (job, co) =>
      `${co} is taking a closer look at your application for ${job}. We'll let you know when there's an update.`,
    cta: "View application",
  },
  interview: {
    preview: "You've been invited to interview.",
    heading: "Interview time.",
    body: (job, co) =>
      `${co} wants to interview you for ${job}. They'll reach out directly to schedule the next step.`,
    cta: "View application",
  },
  offer: {
    preview: "You have an offer.",
    heading: "You have an offer.",
    body: (job, co) =>
      `${co} has extended an offer for ${job}. Check your application page and watch for their direct outreach.`,
    cta: "View offer",
  },
  rejected: {
    preview: "An update on your application.",
    heading: "An update on your application.",
    body: (job, co) =>
      `${co} has decided not to move forward with your application for ${job}. Don't let it slow you down — your next role is on the board.`,
    cta: "Browse jobs",
  },
};

export default function ApplicationStatusChangedEmail({
  candidateName,
  jobTitle,
  companyName,
  status,
  viewUrl,
}: Props) {
  const copy = COPY[status];
  return (
    <Html>
      <Head />
      <Preview>{copy.preview}</Preview>
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
              Energized · {companyName}
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
            {copy.heading}
          </Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            Hey {candidateName},
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            {copy.body(jobTitle, companyName)}
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
              {copy.cta}
            </Link>
          </Section>
          <Hr style={{ borderColor: INK_200, margin: "32px 0" }} />
          <Text style={{ fontSize: 12, color: INK_500, margin: 0 }}>
            You can track every update on Energized.
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
