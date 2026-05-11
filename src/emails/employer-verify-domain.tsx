import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import {
  EmailButtonPrimary,
  EmailHeading,
  EmailLead,
  EmailLinkFallback,
} from "./_components/email-ui";
import { INK_500 } from "./_components/email-tokens";

type Props = {
  companyName: string;
  verifyUrl: string;
};

export default function EmployerVerifyDomainEmail({
  companyName,
  verifyUrl,
}: Props) {
  return (
    <EmailShell
      preview={`Confirm ${companyName} on Energized`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          The link expires in 1 hour. If you didn&rsquo;t request this, nothing else happens — ignore this email.
        </Text>
      }
    >
      <EmailHeading>Confirm {companyName}.</EmailHeading>
      <EmailLead>
        Someone is setting up {companyName} on Energized and used this address to prove they work there. Clicking the link will verify the company domain.
      </EmailLead>
      <EmailButtonPrimary href={verifyUrl}>Verify company</EmailButtonPrimary>
      <EmailLinkFallback url={verifyUrl} />
    </EmailShell>
  );
}

EmployerVerifyDomainEmail.PreviewProps = {
  companyName: "Trillium Wind",
  verifyUrl: "https://energized.biz/api/employer/verify-domain?token=preview-token",
} satisfies Props;
