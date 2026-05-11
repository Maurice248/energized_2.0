import { Link, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

type Props = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  viewUrl: string;
};

export default function ApplicationReceivedEmail({
  candidateName,
  jobTitle,
  companyName,
  viewUrl,
}: Props) {
  return (
    <EmailShell
      preview={`Your application to ${companyName} for ${jobTitle} is in.`}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You can track all your applications anytime on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy jobs that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>Your application is in.</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {candidateName},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        We sent your profile and cover note to <strong>{companyName}</strong> for{" "}
        <strong>{jobTitle}</strong>. They&apos;ll reach out directly if it&rsquo;s a fit.
      </Text>
      <EmailButtonPrimary href={viewUrl}>View application</EmailButtonPrimary>
    </EmailShell>
  );
}

ApplicationReceivedEmail.PreviewProps = {
  candidateName: "Mara Solis",
  jobTitle: "Wind Technician II",
  companyName: "Trillium Wind",
  viewUrl: "https://energized.biz/applications/preview",
} satisfies Props;
