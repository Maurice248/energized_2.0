import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { uploadAvatar, validateAvatarFile } from "@/lib/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const raw = form.get("file");
  const file = raw instanceof File ? raw : null;

  const check = validateAvatarFile(file);
  if (!check.ok) {
    const status = check.reason === "missing_file" ? 400 : 413;
    return NextResponse.json({ error: check.reason }, { status });
  }

  const { url } = await uploadAvatar(session.user.id, check.file);
  return NextResponse.json({ url });
}
