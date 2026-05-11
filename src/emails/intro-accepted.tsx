import { Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_900 } from "./_components/email-tokens";

type Props = {
  recipientName: string | null;
  candidateName: string;
  appUrl: string;
};

export default function IntroAcceptedEmail(p: Props) {
  return (
    <EmailShell preview={`${p.candidateName} accepted your intro request`}>
      <EmailHeading>{p.candidateName} accepted your intro request</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.recipientName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{p.candidateName}</strong> accepted your intro request. You can now see their contact info.
      </Text>
      <EmailButtonPrimary href={p.appUrl}>Open candidate</EmailButtonPrimary>
    </EmailShell>
  );
}

IntroAcceptedEmail.PreviewProps = {
  recipientName: "Avery Tran",
  candidateName: "Mara Solis",
  appUrl: "https://energized.biz/employer/intro-requests?focus=preview",
} satisfies Props;
