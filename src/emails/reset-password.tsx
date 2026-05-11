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
  name: string;
  resetUrl: string;
};

export default function ResetPassword({ name, resetUrl }: Props) {
  const first = name?.split(" ")[0] ?? "there";
  return (
    <EmailShell
      preview="Reset your Energized password"
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          If you didn&rsquo;t request a password reset, you can safely ignore this email.
        </Text>
      }
    >
      <EmailHeading>Reset your password, {first}.</EmailHeading>
      <EmailLead>
        Click the button below to set a new password. The link is valid for the next hour. If you didn&rsquo;t request this, you can safely ignore this email — your password won&rsquo;t change.
      </EmailLead>
      <EmailButtonPrimary href={resetUrl}>Reset password</EmailButtonPrimary>
      <EmailLinkFallback url={resetUrl} />
    </EmailShell>
  );
}

ResetPassword.PreviewProps = {
  name: "Jordan Wells",
  resetUrl: "https://energized.biz/api/auth/reset-password?token=preview-token",
} satisfies Props;
