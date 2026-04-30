import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
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
        input: false,
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
  },
  plugins: [nextCookies()],
});

export const getSession = async () =>
  auth.api.getSession({ headers: await headers() });

export type Session = Awaited<ReturnType<typeof getSession>>;
