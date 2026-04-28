import type { Metadata } from "next";
import { Suspense } from "react";
import { Lato } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc/provider";
import { OnboardingPersister } from "@/components/shared/onboarding-persister";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";
import "./v2.css";
import "./v2-dashboard.css";
import "./v2-about.css";
import "./v2-contact.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Energized — jobs in Canadian energy",
  description:
    "A specialized job-search platform for the Canadian energy sector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TRPCProvider>
          <Suspense fallback={null}>
            <PostHogProvider>
              <OnboardingPersister />
              {children}
            </PostHogProvider>
          </Suspense>
        </TRPCProvider>
      </body>
    </html>
  );
}
