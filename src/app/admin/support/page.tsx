import { api } from "@/lib/trpc/server";
import { SupportInboxView } from "./_components/support-inbox";

export const metadata = { title: "Customer support · Admin · Energized" };

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const inbox = await api.admin.support.inbox();

  return <SupportInboxView inbox={inbox} />;
}
