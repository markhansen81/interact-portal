import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

/**
 * POST: Upload the static company brochure PDF.
 * Stores in both Supabase Storage and local public/brochures/ as fallback.
 */
export async function POST(req: NextRequest) {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Please upload a PDF file" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload("brochures/company-brochure.pdf", buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  // Also save locally as fallback
  try {
    const localPath = path.join(
      process.cwd(),
      "public",
      "brochures",
      "company-brochure.pdf"
    );
    fs.writeFileSync(localPath, buffer);
  } catch {
    // Local save is optional
  }

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    size: buffer.length,
    message: "Brochure uploaded successfully",
  });
}

/**
 * GET: Check if a brochure exists
 */
export async function GET() {
  const profile = await requireAuth(["admin"]);
  if (!profile)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check Supabase Storage
  const adminClient = createAdminClient();
  const { data } = await adminClient.storage
    .from("documents")
    .list("brochures");

  const hasStorageBrochure = data?.some(
    (f) => f.name === "company-brochure.pdf"
  );

  // Check local file
  const localPath = path.join(
    process.cwd(),
    "public",
    "brochures",
    "company-brochure.pdf"
  );
  const hasLocalBrochure = fs.existsSync(localPath);

  return NextResponse.json({
    exists: hasStorageBrochure || hasLocalBrochure,
    source: hasStorageBrochure
      ? "storage"
      : hasLocalBrochure
        ? "local"
        : "none",
  });
}
