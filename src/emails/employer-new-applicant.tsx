import { Link, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

type Props = {
  recipientName: string | null;
  candidateName: string;
  candidateHeadline: string | null;
  jobTitle: string;
  companyName: string;
  applicantsUrl: string;
};

export default function EmployerNewApplicantEmail({
  recipientName,
  candidateName,
  candidateHeadline,
  jobTitle,
  companyName,
  applicantsUrl,
}: Props) {
  return (
    <EmailShell
      preview={`New applicant for ${jobTitle} — ${candidateName}`}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You&rsquo;re receiving this because you posted a role on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy hires that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>New applicant for {jobTitle}.</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {recipientName ? `Hey ${recipientName},` : "Heads up,"}
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{candidateName}</strong>
        {candidateHeadline ? ` — ${candidateHeadline}` : ""} just applied to{" "}
        <strong>{jobTitle}</strong>.
      </Text>
      <EmailButtonPrimary href={applicantsUrl}>Review applicants</EmailButtonPrimary>
    </EmailShell>
  );
}

EmployerNewApplicantEmail.PreviewProps = {
  recipientName: "Avery Tran",
  candidateName: "Mara Solis",
  candidateHeadline: "GWO-certified wind technician, 6 years onshore",
  jobTitle: "Wind Technician II",
  companyName: "Trillium Wind",
  applicantsUrl: "https://energized.biz/employer/applicants/preview",
} satisfies Props;
