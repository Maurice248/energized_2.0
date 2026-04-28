import type { Metadata } from "next";
import { Suspense } from "react";
import { Lato } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc/provider";
import { OnboardingPersister } from "@/components/shared/onboarding-persister";
import { PostHogProvider } from "@/components/posthog-provider";
import { env } from "@/env";
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

const TITLE = "Energized — jobs in Canadian energy";
const DESCRIPTION =
  "The specialized job network for Canada's energy sector — oil & gas, renewables, nuclear, utilities, hydrogen, power. Built around the certifications and field experience that actually matter.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: TITLE,
    template: "%s — Energized",
  },
  description: DESCRIPTION,
  applicationName: "Energized",
  keywords: [
    "energy jobs Canada",
    "oil and gas jobs",
    "renewables jobs",
    "nuclear jobs",
    "wind technician jobs",
    "controls engineer",
    "P.Eng",
    "Red Seal",
    "H2S Alive",
    "NACE",
    "Canadian energy careers",
    "hiring energy professionals",
  ],
  authors: [{ name: "Energized" }],
  creator: "Energized",
  publisher: "Energized",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "/",
    siteName: "Energized",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
