import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import {
  EmailButtonPrimary,
  EmailHeading,
  EmailLead,
  EmailLinkFallback,
} from "./_components/email-ui";
import { INK_500, INK_900 } from "./_components/email-tokens";

type Props = {
  inviterName: string;
  companyName: string;
  roleLabel: string;
  acceptUrl: string;
};

export default function TeamInviteEmail({
  inviterName,
  companyName,
  roleLabel,
  acceptUrl,
}: Props) {
  return (
    <EmailShell
      preview={`${inviterName} invited you to ${companyName} on Energized`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          Invite links expire after 7 days. If you weren&rsquo;t expecting this invite, you can safely ignore it.
        </Text>
      }
    >
      <EmailHeading>Join {companyName} on Energized.</EmailHeading>
      <EmailLead>
        <strong style={{ color: INK_900 }}>{inviterName}</strong> added you as a{" "}
        <strong style={{ color: INK_900 }}>{roleLabel}</strong> for {companyName}. Accept the invite to view the team and manage hiring.
      </EmailLead>
      <EmailButtonPrimary href={acceptUrl}>Accept invite</EmailButtonPrimary>
      <EmailLinkFallback url={acceptUrl} />
    </EmailShell>
  );
}

TeamInviteEmail.PreviewProps = {
  inviterName: "Avery Tran",
  companyName: "Trillium Wind",
  roleLabel: "Recruiter",
  acceptUrl: "https://energized.biz/employer/invite?token=preview-token",
} satisfies Props;
