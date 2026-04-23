import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc/provider";
import { OnboardingPersister } from "@/components/shared/onboarding-persister";
import "./globals.css";
import "./v2.css";

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
          <OnboardingPersister />
          {children}
        </TRPCProvider>
      </body>
    </html>
  );
}
