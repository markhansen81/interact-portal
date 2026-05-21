import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const DOC_TYPE_DESCRIPTIONS: Record<string, string> = {
  right_to_work: "A passport, visa, work permit, or residence permit that proves the holder has the legal right to work in Germany",
  police_check: "An extended police check certificate (erweitertes Führungszeugnis / extended certificate of good conduct) from Germany",
  measles: "A measles vaccination certificate, immunity proof, or vaccination record showing measles (Masern) vaccination",
  first_aid: "A first aid certificate (Erste-Hilfe-Bescheinigung / first aid training certificate)",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      extracted: null,
      verification: { valid: true, message: "AI extraction not configured — please enter dates manually" },
    });
  }

  const { file_url, doc_type } = await request.json();

  if (!file_url || !doc_type) {
    return NextResponse.json({ error: "file_url and doc_type required" }, { status: 400 });
  }

  const expectedDoc = DOC_TYPE_DESCRIPTIONS[doc_type] || "An official document";

  try {
    // Fetch the file to send to Claude
    const fileRes = await fetch(file_url);
    const fileBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");
    const contentType = fileRes.headers.get("content-type") || "image/jpeg";

    // Determine media type for Claude
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg";
    if (contentType.includes("png")) mediaType = "image/png";
    else if (contentType.includes("webp")) mediaType = "image/webp";

    const isPdf = contentType.includes("pdf");

    const client = new Anthropic({ apiKey });

    const content: Anthropic.ContentBlockParam[] = [];

    if (isPdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
    }

    content.push({
      type: "text",
      text: `Analyze this document. The user claims it is: "${expectedDoc}"

Please extract the following and respond in JSON only (no markdown):
{
  "is_valid_document": true/false (does this appear to be the claimed document type?),
  "document_type_detected": "what type of document this actually appears to be",
  "holder_name": "name on the document if visible, or null",
  "issue_date": "YYYY-MM-DD format if found, or null",
  "expiry_date": "YYYY-MM-DD format if found, or null",
  "issuing_authority": "who issued it, or null",
  "document_number": "document/certificate number if visible, or null",
  "confidence": "high/medium/low",
  "notes": "any important observations about the document",
  "rejection_reason": "if is_valid_document is false, explain why"
}`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    let extracted;
    try {
      // Try to find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extracted = null;
    }

    return NextResponse.json({
      extracted,
      verification: extracted
        ? {
            valid: extracted.is_valid_document,
            message: extracted.is_valid_document
              ? `Document verified as ${extracted.document_type_detected}`
              : extracted.rejection_reason || "This does not appear to be the correct document type",
          }
        : { valid: true, message: "Could not analyze document — please verify manually" },
    });
  } catch (error) {
    return NextResponse.json({
      extracted: null,
      verification: { valid: true, message: "AI extraction failed — please enter dates manually" },
    });
  }
}
