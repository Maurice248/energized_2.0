import { Link, Text } from "@react-email/components";
import { EmailShell } from "./_components/email-shell";
import { EmailButtonPrimary, EmailHeading } from "./_components/email-ui";
import { INK_500, INK_900, LIGHT_BLUE, NAVY } from "./_components/email-tokens";

export type StatusChangeStatus =
  | "reviewed"
  | "interview"
  | "offer"
  | "rejected";

type Props = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  status: StatusChangeStatus;
  viewUrl: string;
};

const COPY: Record<
  StatusChangeStatus,
  { preview: string; heading: string; body: (job: string, co: string) => string; cta: string }
> = {
  reviewed: {
    preview: "Your application is under review.",
    heading: "Your application is under review.",
    body: (job, co) =>
      `${co} is taking a closer look at your application for ${job}. We'll let you know when there's an update.`,
    cta: "View application",
  },
  interview: {
    preview: "You've been invited to interview.",
    heading: "Interview time.",
    body: (job, co) =>
      `${co} wants to interview you for ${job}. They'll reach out directly to schedule the next step.`,
    cta: "View application",
  },
  offer: {
    preview: "You have an offer.",
    heading: "You have an offer.",
    body: (job, co) =>
      `${co} has extended an offer for ${job}. Check your application page and watch for their direct outreach.`,
    cta: "View offer",
  },
  rejected: {
    preview: "An update on your application.",
    heading: "An update on your application.",
    body: (job, co) =>
      `${co} has decided not to move forward with your application for ${job}. Don't let it slow you down — your next role is on the board.`,
    cta: "Browse jobs",
  },
};

export default function ApplicationStatusChangedEmail({
  candidateName,
  jobTitle,
  companyName,
  status,
  viewUrl,
}: Props) {
  const copy = COPY[status];
  return (
    <EmailShell
      preview={copy.preview}
      footer={
        <>
          <Text style={{ margin: 0, fontSize: 12, color: INK_500 }}>
            You can track every update on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>energized.biz</Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy jobs that actually fit.</span>
          </Text>
        </>
      }
    >
      <EmailHeading>{copy.heading}</EmailHeading>
      <Text style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        Hey {candidateName},
      </Text>
      <Text style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: INK_900 }}>
        {copy.body(jobTitle, companyName)}
      </Text>
      <EmailButtonPrimary href={viewUrl}>{copy.cta}</EmailButtonPrimary>
    </EmailShell>
  );
}

ApplicationStatusChangedEmail.PreviewProps = {
  candidateName: "Mara Solis",
  jobTitle: "Wind Technician II",
  companyName: "Trillium Wind",
  status: "interview",
  viewUrl: "https://energized.biz/applications/preview",
} satisfies Props;
