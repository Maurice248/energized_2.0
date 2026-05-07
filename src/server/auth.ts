import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { waitUntil } from "@vercel/functions";
import { db } from "@/server/db";
import { env } from "@/env";
import { resend } from "@/lib/resend";
import VerifyEmail from "@/emails/verify-email";
import ResetPassword from "@/emails/reset-password";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "Reset your Energized password",
        react: ResetPassword({
          name: user.name ?? "",
          resetUrl: url,
        }),
      });
      if (result.error) {
        console.error("[auth] resend rejected (reset)", result.error);
        throw new Error(`Resend: ${result.error.message}`);
      }
      console.log("[auth] resend accepted (reset)", result.data?.id);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      // `url` already carries the caller's callbackURL (or Better Auth's
      // default baseURL). Don't override it — sign-up passes a role-aware
      // destination so jobseekers land on /onboarding.
      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: user.email,
        subject: "Confirm your Energized email",
        react: VerifyEmail({
          name: user.name ?? "",
          verifyUrl: url,
        }),
      });
      if (result.error) {
        console.error("[auth] resend rejected", result.error);
        throw new Error(`Resend: ${result.error.message}`);
      }
      console.log("[auth] resend accepted", result.data?.id);
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "jobseeker",
        required: true,
        // Allow the sign-up form to pass role so an employer signup is
        // role: "employer" from creation rather than briefly being
        // "jobseeker" until the OnboardingPersister flips it client-side.
        // databaseHooks.user.create below clamps the value to a safe enum.
        input: true,
      },
      onboardedAt: {
        type: "date",
        required: false,
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async (data: {
        user: { email: string; name?: string | null };
        newEmail: string;
        url: string;
      }) => {
        const result = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: data.user.email,
          subject: `Approve email change to ${data.newEmail}`,
          react: VerifyEmail({
            name: data.user.name ?? "",
            verifyUrl: data.url,
          }),
        });
        if (result.error) {
          console.error("[auth] resend rejected (changeEmail)", result.error);
          throw new Error(`Resend: ${result.error.message}`);
        }
      },
    },
  },
  advanced: {
    cookiePrefix: "better-auth",
    // Run Better Auth's send-email callbacks in the background so they don't
    // block API responses. On Vercel `waitUntil` extends function lifetime so
    // the email actually sends; in dev (long-running Node) the promise just
    // runs to completion in the background. Without this, Better Auth `await`s
    // each callback and the user sees a long "Sending…" delay.
    backgroundTasks: { handler: waitUntil },
  },
  databaseHooks: {
    user: {
      create: {
        // Clamp `role` to a safe enum on signup. Without this, opening
        // additionalFields.role.input lets a signup body set arbitrary
        // strings (e.g. "admin"), so any future role-gated route would be
        // bypassable via crafted requests.
        before: async (data) => {
          const incoming = (data as { role?: unknown }).role;
          const role = incoming === "employer" ? "employer" : "jobseeker";
          return { data: { ...data, role } };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export const getSession = async () =>
  auth.api.getSession({ headers: await headers() });

export type Session = Awaited<ReturnType<typeof getSession>>;
