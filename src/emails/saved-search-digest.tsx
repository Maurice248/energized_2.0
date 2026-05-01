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

export type DigestJob = {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  sectorLabel: string | null;
};

type Props = {
  recipientName: string | null;
  searchName: string;
  searchHref: string;
  jobs: DigestJob[];
  appUrl: string;
};

const NAVY = "#004886";
const LIGHT_BLUE = "#1CABE3";
const INK_900 = "#14171F";
const INK_500 = "#6B7280";
const INK_200 = "#E4E7EE";
const BG = "#F9FAFC";

export default function SavedSearchDigestEmail({
  recipientName,
  searchName,
  searchHref,
  jobs,
  appUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`${jobs.length} new ${jobs.length === 1 ? "role" : "roles"} for "${searchName}"`}</Preview>
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
              Energized · Daily digest
            </Text>
          </Section>
          <Heading
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: INK_900,
              margin: "0 0 16px",
              fontStyle: "italic",
            }}
          >
            New for &ldquo;{searchName}&rdquo;
          </Heading>
          <Text style={{ fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
            Hey {recipientName ?? "there"},
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
            {jobs.length === 1
              ? "1 new role"
              : `${jobs.length} new roles`}{" "}
            posted in the last 24 hours match your saved search.
          </Text>
          <Section style={{ marginTop: 16 }}>
            {jobs.map((j) => (
              <Link
                key={j.id}
                href={`${appUrl}/jobs/${j.id}`}
                style={{
                  display: "block",
                  padding: "14px 16px",
                  border: `1px solid ${INK_200}`,
                  borderRadius: 12,
                  textDecoration: "none",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: INK_900,
                    margin: 0,
                  }}
                >
                  {j.title}
                </Text>
                <Text style={{ fontSize: 13, color: INK_500, margin: "4px 0 0" }}>
                  {j.companyName}
                  {j.location ? ` · ${j.location}` : ""}
                  {j.sectorLabel ? ` · ${j.sectorLabel}` : ""}
                </Text>
              </Link>
            ))}
          </Section>
          <Section style={{ marginTop: 20 }}>
            <Link
              href={searchHref}
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
              View all matches
            </Link>
          </Section>
          <Hr style={{ borderColor: INK_200, margin: "32px 0" }} />
          <Text style={{ fontSize: 12, color: INK_500, margin: 0 }}>
            You&rsquo;re receiving this because you saved &ldquo;{searchName}&rdquo;
            on Energized. Manage saved searches from the /jobs sidebar.
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
