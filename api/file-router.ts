import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { logger } from "./logger";

// ─── Helper: Parse text content for card codes ───
function extractCardCodes(content: string): string[] {
  // Split by new lines, commas, spaces
  const lines = content
    .split(/[\n\r,;\t]+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 3);

  // Remove duplicates while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const line of lines) {
    // Clean the code - remove spaces and common separators
    const cleaned = line
      .replace(/\s+/g, "")
      .replace(/[|\-_#@]/g, "")
      .trim();

    if (cleaned.length >= 3 && !seen.has(cleaned)) {
      seen.add(cleaned);
      unique.push(cleaned);
    }
  }

  return unique;
}

// ─── Helper: Parse CSV content ───
function parseCSV(content: string): string[] {
  const lines = content.split(/[\n\r]+/).filter((l) => l.trim());
  const codes: string[] = [];

  for (const line of lines) {
    // Try to find the card code - usually the longest alphanumeric value
    const cells = line.split(",").map((c) => c.trim().replace(/["']/g, ""));
    for (const cell of cells) {
      if (cell.length >= 3 && /^[a-zA-Z0-9]+$/.test(cell)) {
        codes.push(cell);
      }
    }
  }

  // Remove duplicates
  const seen = new Set<string>();
  return codes.filter((code) => {
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

// ─── Helper: Parse PDF text (simulated) ───
function parsePDFText(content: string): string[] {
  // PDF content often has special formatting
  // Extract alphanumeric sequences that look like card codes
  const codes: string[] = [];
  const lines = content.split(/[\n\r]+/);

  for (const line of lines) {
    // Look for patterns like: Card: XXXXX, Code: XXXXX, or just XXXXX
    const matches = line.match(/[a-zA-Z0-9]{5,50}/g);
    if (matches) {
      for (const match of matches) {
        if (match.length >= 5) {
          codes.push(match);
        }
      }
    }
  }

  // Remove duplicates
  const seen = new Set<string>();
  return codes.filter((code) => {
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

export { extractCardCodes, parseCSV, parsePDFText };

export const fileRouter = createRouter({
  // ─── Parse file content (admin only) ───
  parse: adminQuery
    .input(
      z.object({
        content: z.string(),
        fileType: z.enum(["txt", "csv", "xlsx", "pdf"]),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let codes: string[] = [];

      switch (input.fileType) {
        case "txt":
          codes = extractCardCodes(input.content);
          break;
        case "csv":
          codes = parseCSV(input.content);
          break;
        case "xlsx":
          // For xlsx, content would be pre-parsed as text
          codes = extractCardCodes(input.content);
          break;
        case "pdf":
          codes = parsePDFText(input.content);
          break;
      }

      logger.info("File parsed", {
        fileName: input.fileName,
        fileType: input.fileType,
        codesFound: codes.length,
        by: ctx.user.name,
      });

      return {
        fileName: input.fileName,
        fileType: input.fileType,
        totalRecords: codes.length,
        codes: codes.map((code) => ({ cardCode: code })),
        preview: codes.slice(0, 10),
      };
    }),

  // ─── Validate card codes ───
  validate: adminQuery
    .input(
      z.object({
        codes: z.array(z.object({ cardCode: z.string() })),
      })
    )
    .mutation(async ({ input }) => {
      const valid: Array<{ cardCode: string }> = [];
      const invalid: Array<{ cardCode: string; reason: string }> = [];

      for (const item of input.codes) {
        const code = item.cardCode.trim();
        if (code.length < 3) {
          invalid.push({ cardCode: code, reason: "Too short (min 3 chars)" });
        } else if (!/^[a-zA-Z0-9]+$/.test(code)) {
          invalid.push({ cardCode: code, reason: "Invalid characters" });
        } else {
          valid.push({ cardCode: code });
        }
      }

      return {
        valid,
        invalid,
        validCount: valid.length,
        invalidCount: invalid.length,
      };
    }),
});
