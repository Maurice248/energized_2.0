import { Link, Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

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

export default function SavedSearchDigestEmail({
  recipientName,
  searchName,
  searchHref,
  jobs,
  appUrl,
}: Props) {
  const count = jobs.length;
  return (
    <EmailShell
      preview={`${count} new ${count === 1 ? "role" : "roles"} for "${searchName}"`}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You&rsquo;re receiving this because you saved &ldquo;{searchName}&rdquo; on Energized. Manage saved searches from the /jobs sidebar.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy jobs that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>New for &ldquo;{searchName}&rdquo;</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {count === 1 ? "1 new role" : `${count} new roles`} posted in the last 24 hours match your saved search.
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
            <Text style={{ fontSize: 15, fontWeight: 700, color: INK_900, margin: 0 }}>
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
      <EmailButtonPrimary href={searchHref}>View all matches</EmailButtonPrimary>
    </EmailShell>
  );
}

SavedSearchDigestEmail.PreviewProps = {
  recipientName: "Mara Solis",
  searchName: "Wind tech · Alberta · 14/7",
  searchHref: "https://energized.biz/jobs?saved=preview",
  appUrl: "https://energized.biz",
  jobs: [
    {
      id: "job-1",
      title: "Wind Technician II",
      companyName: "Trillium Wind",
      location: "Pincher Creek, AB",
      sectorLabel: "Renewables",
    },
    {
      id: "job-2",
      title: "Lead Wind Tech",
      companyName: "Northern Power",
      location: "Lethbridge, AB",
      sectorLabel: "Renewables",
    },
    {
      id: "job-3",
      title: "Wind Site Supervisor",
      companyName: "Atlas Pipelines",
      location: "Calgary, AB",
      sectorLabel: "Renewables",
    },
  ],
} satisfies Props;
