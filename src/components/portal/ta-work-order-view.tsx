"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignaturePad } from "@/components/shared/signature-pad";
import { useGenerateSignedPDF } from "@/components/shared/pdf-generator";
import { createClient } from "@/lib/supabase/client";

interface WorkOrder {
  id: string;
  project_id_internal: string;
  project_name: string;
  school: string;
  school_address: string;
  school_state: string;
  location: string;
  start_date: string;
  end_date: string;
  days: number;
  program_type: string;
  special_conditions: string;
  co_taught: boolean;
  grade: string;
  accommodation: string;
  total: number;
  status: string;
  sign_by: string | null;
  created_at: string;
}

export function TAWorkOrderView({
  workOrder: wo,
  taName,
}: {
  workOrder: WorkOrder;
  taName: string;
}) {
  const router = useRouter();
  const [showSign, setShowSign] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [signing, setSigning] = useState(false);
  const generatePDF = useGenerateSignedPDF();

  async function handleSign(signatureData: {
    signature_png: string;
    signature_type: string;
    typed_name?: string;
    timestamp: string;
  }) {
    setSigning(true);

    // 1. Generate signed PDF
    const pdfBlob = await generatePDF(wo, taName, {
      signature_png: signatureData.signature_png,
      timestamp: signatureData.timestamp,
    });

    // 2. Upload PDF to Supabase storage
    const supabase = createClient();
    const fileName = `signed-work-orders/${wo.id}-${Date.now()}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("documents")
      .upload(fileName, pdfBlob, { contentType: "application/pdf" });

    let pdfUrl = null;
    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(uploadData.path);
      pdfUrl = urlData.publicUrl;
    }

    // 3. Sign the work order with PDF URL
    await fetch(`/api/portal/work-orders/${wo.id}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...signatureData, pdf_url: pdfUrl }),
    });

    setSigning(false);
    router.push("/portal/work-orders");
    router.refresh();
  }

  async function handleDecline() {
    setDeclining(true);
    await fetch(`/api/portal/work-orders/${wo.id}/decline`, {
      method: "POST",
    });
    router.push("/portal/work-orders");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/portal/work-orders"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; Back to Work Orders
      </Link>

      {/* Work Order Document */}
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            WORK ORDER
          </h1>
          <p className="mt-1 text-sm text-zinc-500">InterACT English gGmbH</p>
        </div>

        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">By and between</p>
          <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">
            InterACT English gGmbH
          </p>
          <p className="mt-4 text-sm text-zinc-500">and:</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {taName}
          </p>
        </div>

        <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Project Details
          </h3>
          <dl className="mt-4 space-y-2">
            <Row label="Date" value={`${wo.start_date} — ${wo.end_date}, ${wo.days} day${wo.days > 1 ? "s" : ""}`} />
            <Row label="Organisation" value={wo.school} />
            {wo.school_address && <Row label="Address" value={wo.school_address} />}
            {wo.school_state && <Row label="State" value={wo.school_state} />}
            <Row label="Project type" value={wo.program_type} />
            {wo.special_conditions && <Row label="Special conditions" value={wo.special_conditions} />}
            <Row label="Co taught" value={wo.co_taught ? "Co taught" : "Not co taught"} />
            {wo.grade && <Row label="Grade" value={wo.grade} />}
            {wo.accommodation && <Row label="Accommodation" value={wo.accommodation} />}
          </dl>
        </div>

        {wo.total && (
          <div className="border-b border-zinc-200 p-8 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Remuneration
            </h3>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              €{Number(wo.total).toFixed(2)}
            </p>
          </div>
        )}

        {/* Important Notes — full text */}
        <div className="border-b border-zinc-200 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p className="font-bold text-zinc-900 dark:text-zinc-50">
            IMPORTANT: Before signing this work order please do and consider the following:
          </p>
          <ol className="mt-3 list-decimal space-y-3 pl-5">
            <li><strong>We require all TAs to travel the day before the project</strong> if the program is outside of their home city. This has the obvious reason that we must ensure that teaching staff arrives on time to run the program. Same day travel may be organised by InterACT in some exceptions, but it remains in the companies judgment if this is warranted/possible or not. Travel the day before is included in the flat-fee paid for every program. Accommodation for the evening before is always provided. <strong>Please do not sign this work order if travel the day before is an issue.</strong></li>
            <li>Check the address of the school/hostel you will travel to. Some projects require longer travel time. Please consider this before signing the work order.</li>
            <li>Check the area/city/village you are traveling to. <strong>Most projects will have you arriving in the evening and often on Sunday. Finding food, or a supermarket can be difficult in rural locations. Please be prepared before you travel.</strong> This might mean packing some food, or bringing essentials.</li>
            <li>Please CAREFULLY read the project notes prepared for you in the project folder <u>the week before traveling</u>. These notes have critical information that impacts the project and your travel plans. If anything is unclear contact the project coordinator during working hours (M-F) and we can answer your questions.</li>
            <li><strong>We strongly recommend that you double check all connections, transfers and your way from the train station to hotel and hotel to the school in advance of your project.</strong> We always endeavour to provide accurate information but mistakes do happen. You can prevent complications and frustration by double checking all details of this project before you travel. Details can be found in your project notes.</li>
          </ol>
        </div>

        {/* Decline note */}
        <div className="border-b border-zinc-200 p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <p><strong>If you like to decline this work order, but are still available and wanting to work this week,</strong> feel free to send us any reason(s) you would like to share to why you are declining the work order.</p>
          <p className="mt-3">We may have open positions available and would love to find the right project for you.</p>
          <p className="mt-3">Reasons include: needing a project closer to your hometown, that you can only work certain days, or that you are looking for a certain type of project for the week. In some cases we may be able to provide alternative projects in this period that meet your requirements.</p>
          <p className="mt-3">We thank you for all of your input and wish you a successful projects!</p>
        </div>

        {/* Signature / Actions */}
        <div className="p-8">
          {wo.status === "sent" && !showSign && (
            <div className="space-y-4">
              {wo.sign_by && (
                <div className={`rounded-lg p-3 ${
                  new Date(wo.sign_by) < new Date()
                    ? "bg-red-50 dark:bg-red-900/10"
                    : "bg-yellow-50 dark:bg-yellow-900/10"
                }`}>
                  <p className={`text-sm font-medium ${
                    new Date(wo.sign_by) < new Date()
                      ? "text-red-700 dark:text-red-400"
                      : "text-yellow-700 dark:text-yellow-400"
                  }`}>
                    {new Date(wo.sign_by) < new Date()
                      ? `Overdue — was due ${wo.sign_by}`
                      : `Please sign by ${wo.sign_by}`}
                  </p>
                </div>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Please review the work order above carefully before signing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSign(true)}
                  className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
                >
                  Accept & Sign
                </button>
                <button
                  onClick={handleDecline}
                  disabled={declining}
                  className="rounded-lg border border-red-300 px-6 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  {declining ? "Declining..." : "Decline"}
                </button>
              </div>
            </div>
          )}

          {wo.status === "sent" && showSign && (
            <div className="space-y-4">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Sign Work Order
              </h3>
              <SignaturePad onSign={handleSign} signerName={taName} />
              <button
                onClick={() => setShowSign(false)}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
            </div>
          )}

          {wo.status === "signed" && (
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/10">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                This work order has been signed.
              </p>
            </div>
          )}

          {wo.status === "declined" && (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                This work order was declined.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <dt className="w-48 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}:
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}
