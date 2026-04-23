import { Suspense } from "react";
import { VerifyDomainClient } from "./verify-domain-client";

export const metadata = { title: "Verify company — Energized" };

export default async function VerifyDomainPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Suspense fallback={null}>
      <VerifyDomainClient token={token ?? ""} />
    </Suspense>
  );
}
