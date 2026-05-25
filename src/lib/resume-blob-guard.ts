import { TRPCError } from "@trpc/server";

/**
 * Ensures a Blob URL was uploaded by this user (path prefix resumes/{userId}/).
 */
export function assertResumeBlobUrlForUser(url: string, userId: string) {
  let path: string;
  try {
    path = new URL(url).pathname.replace(/^\/+/, "");
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid resume URL.",
    });
  }
  const prefix = `resumes/${userId}/`;
  if (!path.startsWith(prefix)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "That file is not your resume upload.",
    });
  }
}
