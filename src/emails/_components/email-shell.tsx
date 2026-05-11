import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BG, EMAIL_FONT, INK_200, INK_900, LIGHT_BLUE, NAVY } from "./email-tokens";

type EmailShellProps = {
  preview: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function EmailShell({ preview, children, footer }: EmailShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BG,
          margin: 0,
          padding: "40px 0",
          fontFamily: EMAIL_FONT,
          color: INK_900,
        }}
      >
        <Container
          style={{
            maxWidth: 520,
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: 14,
            border: `1px solid ${INK_200}`,
            overflow: "hidden",
          }}
        >
          <Section style={{ backgroundColor: NAVY, padding: "28px 32px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              Energ<span style={{ color: LIGHT_BLUE }}>ized</span>
            </Text>
          </Section>

          <Section style={{ padding: "40px 32px 8px" }}>{children}</Section>

          {footer ? (
            <>
              <Hr style={{ borderColor: INK_200, margin: 0 }} />
              <Section style={{ padding: "20px 32px" }}>{footer}</Section>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}
