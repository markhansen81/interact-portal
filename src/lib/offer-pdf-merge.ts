import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

/**
 * Merges the dynamically generated offer PDF with static brochure pages.
 *
 * Final document order:
 *   1. Pricing/Cover page (dynamic — from jsPDF)
 *   2. Static company brochure pages (Über Uns, Mission, Team, Native Speakers, Einfluss)
 *   3. Program description + timetable pages (dynamic — from jsPDF, one set per program)
 *
 * Static brochure PDF is loaded from:
 *   - Supabase Storage: "documents/brochures/company-brochure.pdf" (preferred)
 *   - Local fallback: public/brochures/company-brochure.pdf
 *
 * If no brochure PDF is found, returns the dynamic PDF as-is.
 */
export async function mergeOfferWithBrochure(
  dynamicPdfBuffer: Buffer,
  options?: {
    /** Override brochure PDF bytes instead of loading from file/storage */
    brochureBytes?: Uint8Array;
    /** Supabase admin client for fetching from storage */
    supabaseAdmin?: {
      storage: {
        from: (bucket: string) => {
          download: (
            path: string
          ) => Promise<{ data: Blob | null; error: unknown }>;
        };
      };
    };
  }
): Promise<Buffer> {
  // Try to load the static brochure PDF
  let brochureBytes: Uint8Array | null = options?.brochureBytes || null;

  if (!brochureBytes) {
    // Try Supabase Storage first
    if (options?.supabaseAdmin) {
      try {
        const { data } = await options.supabaseAdmin.storage
          .from("documents")
          .download("brochures/company-brochure.pdf");
        if (data) {
          const ab = await data.arrayBuffer();
          brochureBytes = new Uint8Array(ab);
        }
      } catch {
        // Fall through to local file
      }
    }

    // Fallback: local file
    if (!brochureBytes) {
      try {
        const localPath = path.join(
          process.cwd(),
          "public",
          "brochures",
          "company-brochure.pdf"
        );
        if (fs.existsSync(localPath)) {
          const fileBuffer = fs.readFileSync(localPath);
          brochureBytes = new Uint8Array(fileBuffer);
        }
      } catch {
        // No brochure available
      }
    }
  }

  // If no brochure found, return the dynamic PDF as-is
  if (!brochureBytes) {
    return dynamicPdfBuffer;
  }

  // Load both PDFs
  const dynamicDoc = await PDFDocument.load(dynamicPdfBuffer);
  const brochureDoc = await PDFDocument.load(brochureBytes);

  // Create the merged document
  const mergedDoc = await PDFDocument.create();

  // 1. Copy the first page from dynamic PDF (pricing/cover letter)
  const [coverPage] = await mergedDoc.copyPages(dynamicDoc, [0]);
  mergedDoc.addPage(coverPage);

  // 2. Copy all brochure pages (static company info)
  const brochurePageCount = brochureDoc.getPageCount();
  const brochureIndices = Array.from(
    { length: brochurePageCount },
    (_, i) => i
  );
  const brochurePages = await mergedDoc.copyPages(
    brochureDoc,
    brochureIndices
  );
  for (const page of brochurePages) {
    mergedDoc.addPage(page);
  }

  // 3. Copy remaining dynamic pages (program descriptions + timetables)
  const dynamicPageCount = dynamicDoc.getPageCount();
  if (dynamicPageCount > 1) {
    const programIndices = Array.from(
      { length: dynamicPageCount - 1 },
      (_, i) => i + 1
    );
    const programPages = await mergedDoc.copyPages(
      dynamicDoc,
      programIndices
    );
    for (const page of programPages) {
      mergedDoc.addPage(page);
    }
  }

  // Save merged PDF
  const mergedBytes = await mergedDoc.save();
  return Buffer.from(mergedBytes);
}
