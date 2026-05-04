import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type CancelVariant = "canceled" | "expired" | "rescheduled";

type Props = {
  variant: CancelVariant;
  recipientName: string | null;
  companyName: string;
  jobTitle: string;
  cancelReason?: string | null;   // ignored when variant !== 'canceled'
  appUrl: string;
};

const HEADING: Record<CancelVariant, string> = {
  canceled: "Interview canceled",
  expired: "Interview proposal expired",
  rescheduled: "Interview rescheduled",
};

const BODY: Record<CancelVariant, (companyName: string, jobTitle: string) => string> = {
  canceled: (co, j) => `The interview for ${j} at ${co} has been canceled.`,
  expired: (co, j) => `The proposed times for your ${j} interview at ${co} expired without a response. The employer can still propose new times.`,
  rescheduled: (co, j) => `${co} updated the times for your ${j} interview. Check your inbox for the new proposal email.`,
};

export default function InterviewCanceledEmail(p: Props) {
  return (
    <Html>
      <Head />
      <Preview>{HEADING[p.variant]} — {p.jobTitle}</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>{HEADING[p.variant]}</Heading>
          <Text>Hey {p.recipientName ?? "there"},</Text>
          <Text>{BODY[p.variant](p.companyName, p.jobTitle)}</Text>
          {p.variant === "canceled" && p.cancelReason && (
            <Section style={{ background: "#fff5f5", borderRadius: 8, padding: 12, margin: "16px 0" }}>
              <Text style={{ margin: 0, fontStyle: "italic", color: "#742a2a" }}>"{p.cancelReason}"</Text>
            </Section>
          )}
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.appUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Open Energized
            </Button>
          </Section>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
