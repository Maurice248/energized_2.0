import type { Metadata } from "next";
import {
  CmsMarketingPage,
  buildMarketingMetadata,
} from "@/components/marketing/cms-marketing-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata("contact");
}

export default function ContactPage() {
  return <CmsMarketingPage slug="contact" />;
}
