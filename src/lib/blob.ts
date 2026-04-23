import { del, put } from "@vercel/blob";

export const RESUME_MAX_BYTES = 10 * 1024 * 1024;
export const RESUME_ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type ResumeValidationError =
  | { ok: false; reason: "missing_file" }
  | { ok: false; reason: "too_large"; size: number }
  | { ok: false; reason: "bad_mime"; mime: string };

export function validateResumeFile(
  file: File | null,
): { ok: true; file: File } | ResumeValidationError {
  if (!file) return { ok: false, reason: "missing_file" };
  if (file.size > RESUME_MAX_BYTES) {
    return { ok: false, reason: "too_large", size: file.size };
  }
  if (!RESUME_ALLOWED_MIME.includes(file.type as (typeof RESUME_ALLOWED_MIME)[number])) {
    return { ok: false, reason: "bad_mime", mime: file.type };
  }
  return { ok: true, file };
}

export async function uploadResume(userId: string, file: File) {
  const sanitized = file.name.replace(/[^\w.\-]+/g, "_");
  const { url } = await put(
    `resumes/${userId}/${crypto.randomUUID()}-${sanitized}`,
    file,
    {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    },
  );
  return { url, filename: file.name };
}

export const deleteBlob = (url: string) => del(url);

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function validateAvatarFile(
  file: File | null,
): { ok: true; file: File } | ResumeValidationError {
  if (!file) return { ok: false, reason: "missing_file" };
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, reason: "too_large", size: file.size };
  }
  if (
    !AVATAR_ALLOWED_MIME.includes(
      file.type as (typeof AVATAR_ALLOWED_MIME)[number],
    )
  ) {
    return { ok: false, reason: "bad_mime", mime: file.type };
  }
  return { ok: true, file };
}

export async function uploadAvatar(userId: string, file: File) {
  const sanitized = file.name.replace(/[^\w.\-]+/g, "_");
  const { url } = await put(
    `avatars/${userId}/${crypto.randomUUID()}-${sanitized}`,
    file,
    {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    },
  );
  return { url };
}

export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function validateCoverFile(
  file: File | null,
): { ok: true; file: File } | ResumeValidationError {
  if (!file) return { ok: false, reason: "missing_file" };
  if (file.size > COVER_MAX_BYTES) {
    return { ok: false, reason: "too_large", size: file.size };
  }
  if (
    !COVER_ALLOWED_MIME.includes(
      file.type as (typeof COVER_ALLOWED_MIME)[number],
    )
  ) {
    return { ok: false, reason: "bad_mime", mime: file.type };
  }
  return { ok: true, file };
}

export async function uploadOrgCover(orgId: string, file: File) {
  const sanitized = file.name.replace(/[^\w.\-]+/g, "_");
  const { url } = await put(
    `org-covers/${orgId}/${crypto.randomUUID()}-${sanitized}`,
    file,
    {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    },
  );
  return { url };
}
