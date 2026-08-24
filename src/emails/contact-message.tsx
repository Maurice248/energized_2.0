import { Section, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailHeading } from "./_components/email-ui";
import { INK_200, INK_500, INK_900, NAVY } from "./_components/email-tokens";

type Props = {
  name: string;
  email: string;
  message: string;
};

export default function ContactMessageEmail({ name, email, message }: Props) {
  return (
    <EmailShell
      preview={`${name} sent a message via Energized`}
      footer={
        <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: INK_500 }}>
          Reply directly to this email to reach {name} at {email}.
        </Text>
      }
    >
      <EmailHeading>New contact message</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        <strong>{name}</strong> ({email}) wrote via the Energized contact form.
      </Text>
      <Section
        style={{
          background: "#f0f7fb",
          border: `1px solid ${INK_200}`,
          borderRadius: 12,
          padding: 14,
          margin: "16px 0",
        }}
      >
        <Text style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: NAVY, whiteSpace: "pre-wrap" }}>
          {message}
        </Text>
      </Section>
    </EmailShell>
  );
}

ContactMessageEmail.PreviewProps = {
  name: "Mara Solis",
  email: "mara@example.com",
  message: "Do you have roles in Fort McMurray on a 14/7 rotation?",
} satisfies Props;
