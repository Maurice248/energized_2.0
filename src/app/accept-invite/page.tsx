import { Suspense } from "react";
import { AcceptInviteClient } from "./accept-invite-client";

export const metadata = { title: "Accept invite — Energized" };

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Suspense fallback={null}>
      <AcceptInviteClient token={token ?? ""} />
    </Suspense>
  );
}
