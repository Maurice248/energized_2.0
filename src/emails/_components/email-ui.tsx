import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./email-tokens";

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{
        margin: 0,
        fontSize: 26,
        lineHeight: 1.2,
        fontWeight: 600,
        color: INK_900,
        letterSpacing: "-0.015em",
      }}
    >
      {children}
    </Heading>
  );
}

export function EmailLead({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Text
      style={{
        marginTop: 16,
        fontSize: 15,
        lineHeight: 1.55,
        color: INK_500,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButtonPrimary({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Section style={{ padding: "24px 0 8px", textAlign: "center" }}>
      <Button
        href={href}
        style={{
          backgroundColor: LIGHT_BLUE,
          color: INK_900,
          fontWeight: 600,
          fontSize: 15,
          padding: "12px 24px",
          borderRadius: 999,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function EmailLinkFallback({ url }: { url: string }) {
  return (
    <Section style={{ padding: "24px 0 8px" }}>
      <Text
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: INK_500,
          margin: 0,
        }}
      >
        Button not working? Paste this link into your browser:
      </Text>
      <Link
        href={url}
        style={{ fontSize: 13, color: NAVY, wordBreak: "break-all" }}
      >
        {url}
      </Link>
    </Section>
  );
}
