/** User-facing copy when resume upload succeeds but auto-fill preview does not run. */
export type ResumeAutofillSkipReason =
  | "extract_failed"
  | "too_short"
  | "no_sections"
  | "ai_not_configured";

export function resumeAutofillSkipMessage(
  reason: ResumeAutofillSkipReason | undefined,
): string {
  switch (reason) {
    case "ai_not_configured":
      return "Resume auto-fill needs OPENAI_API_KEY on the server. Your file was saved.";
    case "extract_failed":
      return "Could not read that resume (try PDF or DOCX). Your file was saved.";
    case "too_short":
      return "Very little text was extracted from that file. Your file was saved.";
    case "no_sections":
      return "No work history, education, certifications, or skills were detected. Your file was saved.";
    default:
      return "Resume analysis did not return suggestions. Your file was saved.";
  }
}
