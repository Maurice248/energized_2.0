import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_200, INK_500, INK_900, NAVY } from "./_components/email-tokens";

type Props = {
  candidateName: string | null;
  orgName: string;
  requesterName: string;
  message: string | null;
  appUrl: string;
};

export default function IntroRequestedEmail(p: Props) {
  return (
    <EmailShell
      preview={`${p.orgName} would like an intro on Energized`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          You can decline anytime — your contact info stays hidden until you accept.
        </Text>
      }
    >
      <EmailHeading>{p.orgName} would like an intro</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {p.candidateName ?? "there"},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{p.requesterName}</strong> at <strong>{p.orgName}</strong> would like to be introduced to you.
      </Text>
      {p.message ? (
        <Section
          style={{
            background: "#f0f7fb",
            border: `1px solid ${INK_200}`,
            borderRadius: 12,
            padding: 14,
            margin: "16px 0",
          }}
        >
          <Text style={{ margin: 0, fontStyle: "italic", fontSize: 14, color: NAVY }}>
            {p.message}
          </Text>
        </Section>
      ) : null}
      <EmailButtonPrimary href={p.appUrl}>Review request</EmailButtonPrimary>
    </EmailShell>
  );
}

IntroRequestedEmail.PreviewProps = {
  candidateName: "Mara Solis",
  orgName: "Trillium Wind",
  requesterName: "Avery Tran",
  message: "Loved your recent project at Site-14 — would value a quick chat about a lead-tech opening.",
  appUrl: "https://energized.biz/dashboard#intros",
} satisfies Props;
