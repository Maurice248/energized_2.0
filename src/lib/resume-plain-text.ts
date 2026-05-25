import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

async function fetchResumePayload(url: string): Promise<{
  buffer: Buffer;
  contentType: string | null;
}> {
  const res = await fetch(url, { redirect: "follow", cache: "no-store" });
  if (!res.ok) {
    throw new Error(`fetch_status_${res.status}`);
  }
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type"),
  };
}

async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return normalizeWhitespace(text);
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function guessMime(filename: string, contentType: string | null): string {
  const ct = contentType?.split(";")[0].trim().toLowerCase() ?? "";
  if (ct && ct !== "application/octet-stream") return ct;
  const n = filename.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (n.endsWith(".doc")) return "application/msword";
  return "";
}

/**
 * Fetch a resume from storage and return plain text (PDF / DOCX / legacy .doc attempt).
 */
export async function extractPlainTextFromResumeStorage(opts: {
  url: string;
  filename: string;
}): Promise<string> {
  const { buffer, contentType } = await fetchResumePayload(opts.url);
  return extractPlainTextFromResumeBytes(buffer, {
    filename: opts.filename,
    contentType,
  });
}

/**
 * Pull plain text from an uploaded resume (PDF via unpdf, DOCX via mammoth).
 * Legacy `.doc` is not reliably supported; callers should treat failures as soft.
 */
export async function extractPlainTextFromResumeBytes(
  buffer: Buffer,
  opts: { filename: string; contentType: string | null },
): Promise<string> {
  const mime = guessMime(opts.filename, opts.contentType);
  const lowerName = opts.filename.toLowerCase();

  if (mime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return extractPdfTextFromBuffer(buffer);
  }

  if (lowerName.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return normalizeWhitespace(value);
  }

  if (lowerName.endsWith(".doc") || mime === "application/msword") {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      const t = normalizeWhitespace(value);
      if (t.length >= 40) return t;
    } catch {
      /* mammoth often cannot read binary .doc */
    }
    throw new Error("legacy_doc_not_supported");
  }

  throw new Error("unsupported_resume_format");
}
