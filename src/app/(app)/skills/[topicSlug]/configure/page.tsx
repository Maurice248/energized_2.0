import { notFound } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { ConfigureClient } from "./configure-client";

export default async function ConfigurePage({
  params,
}: {
  params: Promise<{ topicSlug: string }>;
}) {
  const { topicSlug } = await params;
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
