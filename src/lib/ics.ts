type IcsInput = {
  interviewId: string;
  startsAtUtc: Date;
  durationMin: number;
  jobTitle: string;
  companyName: string;
  proposerName: string;
  proposerEmail: string;
  candidateName: string;
  candidateEmail: string;
  notes?: string;
  details: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

function fmtUtc(d: Date): string {
  return (
    String(d.getUTCFullYear()) +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

// RFC 5545 §3.3.11 — escape \n , ; \\ inside TEXT values.
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildInterviewIcs(input: IcsInput): string {
  const end = new Date(input.startsAtUtc.getTime() + input.durationMin * 60_000);
  const dtStamp = fmtUtc(new Date());
  const dtStart = fmtUtc(input.startsAtUtc);
  const dtEnd = fmtUtc(end);

  const summary = escapeText(
    `Interview — ${input.jobTitle} at ${input.companyName}`,
  );
  const description = escapeText(input.notes ?? "");
  const location = escapeText(input.details);
  const organizerCn = escapeText(input.proposerName);
  const attendeeCn = escapeText(input.candidateName);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Energized//Interview//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${input.interviewId}@energized.biz`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${organizerCn}:mailto:${input.proposerEmail}`,
    `ATTENDEE;CN=${attendeeCn};RSVP=TRUE:mailto:${input.candidateEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 line endings: CRLF.
  return lines.join("\r\n") + "\r\n";
}
