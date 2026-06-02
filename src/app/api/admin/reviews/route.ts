import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const { data, error } = await supabase
    .from("admin_review_tasks")
    .select(`
      *,
      ta:profiles!admin_review_tasks_ta_id_fkey(id, first_name, last_name, email, photo_url)
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  // For document reviews, attach the actual document info
  if (data) {
    const docReviews = data.filter((r) => r.type === "document_upload");
    if (docReviews.length > 0) {
      const { data: docs } = await supabase
        .from("documents")
        .select("ta_id, type, file_url, status, uploaded_at, issue_date, expiry_date");

      const docMap = new Map<string, typeof docs extends (infer T)[] | null ? T : never>();
      (docs || []).forEach((d) => docMap.set(`${d.ta_id}:${d.type}`, d));

      for (const review of data) {
        if (review.type === "document_upload" && review.reference_id) {
          (review as Record<string, unknown>).document = docMap.get(`${review.ta_id}:${review.reference_id}`) || null;
        }
      }
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ reviews: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status, notes } = await request.json();

  const { error } = await supabase
    .from("admin_review_tasks")
    .update({
      status,
      review_notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Get task details for notifications
  const { data: task } = await supabase
    .from("admin_review_tasks")
    .select("type, ta_id, reference_id, title")
    .eq("id", id)
    .single();

  if (task) {
    const docLabels: Record<string, string> = {
      right_to_work: "Right to Work",
      police_check: "Police Check",
      measles: "Measles Vaccination",
      first_aid: "First Aid Certificate",
    };
    const docLabel = docLabels[task.reference_id || ""] || task.reference_id || "";

    if (status === "approved") {
      // Update document status to verified
      if (task.type === "document_upload" && task.reference_id) {
        await supabase
          .from("documents")
          .update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() })
          .eq("ta_id", task.ta_id)
          .eq("type", task.reference_id);
      }

      // Notify TA
      await notify({
        userId: task.ta_id,
        type: "review_approved",
        title: task.type === "document_upload" ? `${docLabel} verified` : "Profile approved",
        body: task.type === "document_upload"
          ? `Your ${docLabel} has been reviewed and verified.`
          : "Your onboarding profile has been reviewed and approved.",
        payload: { link: "/portal/documents" },
      });
    }

    if (status === "rejected") {
      await notify({
        userId: task.ta_id,
        type: "review_rejected",
        title: task.type === "document_upload" ? `${docLabel} rejected` : "Profile needs changes",
        body: notes || (task.type === "document_upload"
          ? `Your ${docLabel} was not accepted. Please upload a new one.`
          : "Your profile needs some changes. Please review the notes."),
        payload: { link: "/portal/documents" },
      });
    }
  }

  return NextResponse.json({ success: true });
}
