import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { ConfigureClient } from "./configure-client";

export default async function ConfigurePage({
  params,
}: {
  params: Promise<{ topicSlug: string }>;
}) {
  const { topicSlug } = await params;
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect(`/candidates?badges=${encodeURIComponent(topicSlug)}`);
  }
  const data = await api.skillTests.getTopic({ slug: topicSlug }).catch(() => null);
  if (!data) notFound();

  return (
    <ConfigureClient
      sector={data.sector}
      roles={data.roles}
      initialRoleSlug={data.currentRole?.slug ?? null}
    />
  );
}
