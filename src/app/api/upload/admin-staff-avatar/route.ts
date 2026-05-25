import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  deleteBlob,
  isManagedAvatarBlobUrl,
  uploadAvatar,
  validateAvatarFile,
} from "@/lib/blob";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { getSession } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const rawFile = form.get("file");
  const rawUserId = form.get("userId");
  const file = rawFile instanceof File ? rawFile : null;
  const targetUserId = typeof rawUserId === "string" ? rawUserId.trim() : "";

  if (!targetUserId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  const [target] = await db
    .select({
      id: user.id,
      role: user.role,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  if (!target || target.role !== "admin") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const check = validateAvatarFile(file);
  if (!check.ok) {
    const status =
      check.reason === "missing_file"
        ? 400
        : check.reason === "too_large"
          ? 413
          : 415;
    return NextResponse.json({ error: check.reason }, { status });
  }

  const prev = target.image;
  if (prev && isManagedAvatarBlobUrl(prev)) {
    try {
      await deleteBlob(prev);
    } catch {
      /* stale URL or external delete failure — continue */
    }
  }

  const { url } = await uploadAvatar(targetUserId, check.file);

  await db
    .update(user)
    .set({ image: url, updatedAt: new Date() })
    .where(eq(user.id, targetUserId));

  return NextResponse.json({ url });
}
