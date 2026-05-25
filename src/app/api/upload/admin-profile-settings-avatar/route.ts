import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  deleteBlob,
  isManagedAvatarBlobUrl,
  uploadAvatar,
  validateStaffProfileAvatarFile,
} from "@/lib/blob";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { getSession } from "@/server/auth";

export const runtime = "nodejs";

/** Avatar upload for the signed-in admin from `/admin/profile-settings` (5MB cap). */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const raw = form.get("file");
  const file = raw instanceof File ? raw : null;

  const check = validateStaffProfileAvatarFile(file);
  if (!check.ok) {
    const status =
      check.reason === "missing_file"
        ? 400
        : check.reason === "too_large"
          ? 413
          : 415;
    return NextResponse.json({ error: check.reason }, { status });
  }

  const userId = session.user.id;

  const [target] = await db
    .select({
      id: user.id,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const prev = target.image;
  if (prev && isManagedAvatarBlobUrl(prev)) {
    try {
      await deleteBlob(prev);
    } catch {
      /* continue */
    }
  }

  const { url } = await uploadAvatar(userId, check.file);

  await db
    .update(user)
    .set({ image: url, updatedAt: new Date() })
    .where(eq(user.id, userId));

  return NextResponse.json({ url });
}
