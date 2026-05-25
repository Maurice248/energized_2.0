import type { Metadata } from "next";
import {
  CmsMarketingPage,
  buildMarketingMetadata,
} from "@/components/marketing/cms-marketing-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata("terms");
}

export default function TermsPage() {
  return <CmsMarketingPage slug="terms" />;
}
