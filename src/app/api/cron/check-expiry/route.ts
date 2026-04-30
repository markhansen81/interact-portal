import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, notifyAdmins } from "@/lib/notifications";
import { documentExpiringEmail } from "@/lib/email";

// This endpoint should be called daily via Vercel Cron or external scheduler
// Checks for documents expiring within 30, 60, 90 days and sends notifications

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const today = new Date();

  // Check for documents expiring in 30, 60, 90 days
  const thresholds = [30, 60, 90];
  let totalNotified = 0;

  for (const days of thresholds) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);
    const dateStr = targetDate.toISOString().split("T")[0];

    const { data: expiringDocs } = await adminClient
      .from("documents")
      .select("*, profiles!documents_ta_id_fkey(id, first_name, last_name, email)")
      .eq("expiry_date", dateStr)
      .in("status", ["uploaded", "verified"]);

    if (!expiringDocs) continue;

    for (const doc of expiringDocs) {
      const ta = doc.profiles as { id: string; first_name: string; last_name: string; email: string };
      const taName = `${ta.first_name || ""} ${ta.last_name || ""}`.trim() || ta.email;
      const emailTemplate = documentExpiringEmail(taName, doc.type, doc.expiry_date);

      // Notify TA
      await notify({
        userId: ta.id,
        type: "document_expiring",
        title: `Document expiring in ${days} days`,
        body: `Your ${doc.type} expires on ${doc.expiry_date}`,
        payload: { document_id: doc.id, days_until_expiry: days },
        email: { to: ta.email, ...emailTemplate },
      });

      // Update status to expiring if within 30 days
      if (days <= 30) {
        await adminClient
          .from("documents")
          .update({ status: "expiring" })
          .eq("id", doc.id);
      }

      totalNotified++;
    }
  }

  // Check for already expired documents
  const { data: expiredDocs } = await adminClient
    .from("documents")
    .select("id")
    .lt("expiry_date", today.toISOString().split("T")[0])
    .in("status", ["uploaded", "verified", "expiring"]);

  if (expiredDocs) {
    for (const doc of expiredDocs) {
      await adminClient
        .from("documents")
        .update({ status: "expired" })
        .eq("id", doc.id);
    }
  }

  // Notify admins of any expiring/expired docs
  if (totalNotified > 0) {
    await notifyAdmins({
      type: "documents_expiring_summary",
      title: `${totalNotified} document(s) expiring`,
      body: `${totalNotified} TA documents are expiring soon. Review in the admin panel.`,
    });
  }

  return NextResponse.json({
    success: true,
    notified: totalNotified,
    expired: expiredDocs?.length || 0,
  });
}
