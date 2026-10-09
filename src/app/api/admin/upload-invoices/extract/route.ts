import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;

  return profile;
}

export async function POST(request: Request) {
  const profile = await getAdminUser();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI extraction not configured" },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "A PDF file is required" },
      { status: 400 }
    );
  }

  try {
    const fileBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");

    const client = new Anthropic({
      apiKey,
      defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID
        ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
        : undefined,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6-20250131",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Extract the following from this invoice/receipt PDF:
- supplier: company/person name who issued this
- amount: total amount (number only, no currency symbol)
- invoice_number: invoice/receipt number
- invoice_date: date of invoice (YYYY-MM-DD format)
- due_date: payment due date if visible (YYYY-MM-DD format)
- document_type: one of "eingangsrechnung", "ausgangsrechnung", "beleg", "vertrag", "sonstiges"
- description: brief one-line description of what this invoice is for

Return as JSON only, no explanation. Use null for any field you cannot find.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    let extracted;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extracted = null;
    }

    if (!extracted) {
      return NextResponse.json(
        { error: "Could not parse invoice data from AI response" },
        { status: 422 }
      );
    }

    return NextResponse.json({ extracted });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[EXTRACT] AI extraction failed:", errMsg);
    return NextResponse.json(
      { error: `AI extraction failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
