"use server";

import { z } from "zod";
import { resend } from "@/lib/resend";
import { env } from "@/env";

const TOPICS = [
  "general",
  "seeker",
  "employer",
  "billing",
  "partnerships",
  "press",
] as const;

const ContactSchema = z.object({
  topic: z.enum(TOPICS),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(240),
  company: z.string().trim().max(160).optional().nullable(),
  role: z.string().trim().max(160).optional().nullable(),
  size: z.string().trim().max(60).optional().nullable(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  consent: z.literal(true),
  // honeypot — bots fill hidden fields, humans don't see this
  website: z.string().max(0).optional().default(""),
});

export type ContactInput = z.input<typeof ContactSchema>;

export type ContactResult =
  | { ok: true; ref: string }
  | { ok: false; error: string };

const TOPIC_LABEL: Record<(typeof TOPICS)[number], string> = {
  general: "General",
  seeker: "Job seekers",
  employer: "Employers & hiring",
  billing: "Billing",
  partnerships: "Partnerships",
  press: "Press",
};

export async function sendContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields look off — double-check name, email, subject, message.",
    };
  }
  const data = parsed.data;

  // honeypot trip
  if (data.website && data.website.length > 0) {
    return { ok: true, ref: "EN-DROPPED" };
  }

  const ref =
    "EN-" +
    Math.random().toString(36).slice(2, 7).toUpperCase();

  const lines = [
    `Topic: ${TOPIC_LABEL[data.topic]}`,
    `From: ${data.name} <${data.email}>`,
    data.company ? `Company: ${data.company}` : null,
    data.role ? `Role: ${data.role}` : null,
    data.size ? `Hiring volume: ${data.size}` : null,
    ``,
    data.message,
    ``,
    `—`,
    `Ref: ${ref}`,
    `Submitted via /contact`,
  ].filter((l): l is string => l !== null);

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: "dev@energized.biz",
      replyTo: data.email,
      subject: `[${TOPIC_LABEL[data.topic]}] ${data.subject} (${ref})`,
      text: lines.join("\n"),
    });
    return { ok: true, ref };
  } catch (err) {
    console.error("contact.send failed", { ref, err });
    return {
      ok: false,
      error:
        "Couldn't send right now — please email dev@energized.biz directly.",
    };
  }
}
