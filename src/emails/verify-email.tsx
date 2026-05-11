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
  verifyUrl: string;
};

export default function VerifyEmail({ name, verifyUrl }: Props) {
  const first = name?.split(" ")[0] ?? "there";
  return (
    <EmailShell
      preview="Confirm your email to activate your Energized account"
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          If you didn&rsquo;t create an Energized account, you can safely ignore this email.
        </Text>
      }
    >
      <EmailHeading>Confirm your email, {first}.</EmailHeading>
      <EmailLead>
        Click the button below to activate your Energized account. The link is valid for the next hour.
      </EmailLead>
      <EmailButtonPrimary href={verifyUrl}>Confirm email</EmailButtonPrimary>
      <EmailLinkFallback url={verifyUrl} />
    </EmailShell>
  );
}

VerifyEmail.PreviewProps = {
  name: "Mara Solis",
  verifyUrl: "https://energized.biz/api/auth/verify-email?token=preview-token",
} satisfies Props;
