import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { uploadOrgCover, validateCoverFile } from "@/lib/blob";

export const runtime = "nodejs";

const CAN_EDIT_ROLES = ["owner", "admin"] as const;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [membership] = await db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(
        or(
          eq(orgMembers.userId, session.user.id),
          eq(orgMembers.email, session.user.email.toLowerCase()),
        ),
        eq(orgMembers.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "no_org" }, { status: 403 });
  }
  if (!CAN_EDIT_ROLES.includes(membership.role as (typeof CAN_EDIT_ROLES)[number])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const raw = form.get("file");
  const file = raw instanceof File ? raw : null;

  const check = validateCoverFile(file);
  if (!check.ok) {
    const status = check.reason === "missing_file" ? 400 : 413;
    return NextResponse.json({ error: check.reason }, { status });
  }

  const { url } = await uploadOrgCover(membership.orgId, check.file);
  return NextResponse.json({ url });
}
