import pdfParse from "pdf-parse";

export async function extractTextFromBase64Pdf(pdfBase64: string): Promise<string> {
  const buffer = Buffer.from(pdfBase64, "base64");
  const parsed = await pdfParse(buffer);
  return parsed.text.replace(/\s+/g, " ").trim();
}