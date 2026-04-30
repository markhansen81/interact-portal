"use client";

import { useCallback } from "react";
import jsPDF from "jspdf";

interface WorkOrderData {
  project_id_internal: string;
  project_name: string;
  school: string;
  school_address: string;
  school_state: string;
  start_date: string;
  end_date: string;
  days: number;
  program_type: string;
  special_conditions: string;
  co_taught: boolean;
  grade: string;
  accommodation: string;
  total: number;
  created_at: string;
}

interface SignatureData {
  signature_png: string;
  timestamp: string;
}

export function useGenerateSignedPDF() {
  const generate = useCallback(
    async (
      wo: WorkOrderData,
      taName: string,
      signature: SignatureData
    ): Promise<Blob> => {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = 210;
      const margin = 25;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // Helper
      function addText(text: string, x: number, yPos: number, opts?: { fontSize?: number; fontStyle?: string; color?: string; align?: string; maxWidth?: number }) {
        doc.setFontSize(opts?.fontSize || 11);
        doc.setFont("helvetica", opts?.fontStyle || "normal");
        if (opts?.color) {
          const hex = opts.color;
          doc.setTextColor(
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16)
          );
        } else {
          doc.setTextColor(26, 26, 26);
        }
        const align = opts?.align as "left" | "center" | "right" | undefined;
        doc.text(text, x, yPos, { maxWidth: opts?.maxWidth || contentWidth, align });
        return doc.getTextDimensions(text, { maxWidth: opts?.maxWidth || contentWidth }).h;
      }

      function newPage() {
        doc.addPage();
        y = 20;
      }

      // --- PAGE 1: Work Order ---

      // Header
      addText("InterACT English gGmbH", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 3.5;
      addText("Planufer 92B, 10967 Berlin", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 3.5;
      addText("Tel. 030 20339702", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 3.5;
      addText("info@interactenglish.de", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 6;
      addText("Geschäftsführer:", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 3.5;
      addText("Mark William Hansen & Charles Justin Beard", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 3.5;
      addText("Handelsregister - Amtsgericht Charlottenburg", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 3.5;
      addText("HRB 188932 B", pageWidth - margin, y, { fontSize: 8, align: "right", color: "#666666" });
      y += 8;

      // Project ID
      addText(`Project ID: ${wo.project_id_internal}`, pageWidth - margin, y, { fontSize: 9, align: "right", color: "#16a34a", fontStyle: "bold" });
      y += 8;

      // Line
      doc.setDrawColor(51, 51, 51);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // WORK ORDER title
      addText("WORK ORDER", margin, y, { fontSize: 28, fontStyle: "bold" });
      y += 14;

      // Parties
      addText("By and between", margin, y, { fontSize: 11 });
      y += 7;
      addText("InterACT English gGmbH", margin, y, { fontSize: 11, fontStyle: "bold" });
      y += 5;
      addText('(referred to in the following as "the Company")', margin, y, { fontSize: 9, color: "#666666" });
      y += 8;
      addText(`and: ${taName}`, margin, y, { fontSize: 11, fontStyle: "bold" });
      y += 5;
      addText('(referred to in the following as "the Contractor")', margin, y, { fontSize: 9, color: "#666666" });
      y += 10;

      // Line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Project Details
      addText("Project Details", margin, y, { fontSize: 13, fontStyle: "bold" });
      y += 8;
      addText("The Contractor shall be teaching on the following project:", margin, y, { fontSize: 9, color: "#666666" });
      y += 8;

      const details = [
        ["Date of project / Time period:", `${wo.start_date} — ${wo.end_date}, ${wo.days} day${wo.days > 1 ? "s" : ""}`],
        ["Organisation (workplace):", wo.school || "—"],
        ["", wo.school_address || ""],
        ["", wo.school_state || ""],
        ["Project type:", wo.program_type || "—"],
        ["Special conditions:", wo.special_conditions || "None"],
        ["Co taught / Not co taught:", wo.co_taught ? "Co taught" : "Not co taught"],
        ["Grade:", wo.grade || "—"],
        ["Accommodation:", wo.accommodation || "—"],
      ];

      for (const [label, value] of details) {
        if (label) {
          addText(label, margin, y, { fontSize: 10, fontStyle: "bold", maxWidth: 55 });
          addText(value, margin + 57, y, { fontSize: 10, maxWidth: contentWidth - 57 });
        } else if (value) {
          addText(value, margin + 57, y, { fontSize: 10, maxWidth: contentWidth - 57 });
        }
        y += 5.5;
      }

      // Remuneration
      if (wo.total) {
        y += 4;
        addText("Remuneration:", margin, y, { fontSize: 10, fontStyle: "bold" });
        addText(`€${Number(wo.total).toFixed(2)}`, margin + 57, y, { fontSize: 14, fontStyle: "bold" });
        y += 10;
      }

      // --- PAGE 2: Signature ---
      newPage();

      addText("With this signature I accept the Work Order:", margin, y, { fontSize: 11 });
      y += 25;

      // TA Signature
      if (signature.signature_png) {
        try {
          doc.addImage(signature.signature_png, "PNG", margin, y - 15, 60, 20);
        } catch {
          // Skip if image fails
        }
      }

      // Signature line
      doc.setDrawColor(51, 51, 51);
      doc.line(margin, y + 8, margin + 70, y + 8);
      y += 12;

      addText(taName, margin, y, { fontSize: 11, fontStyle: "bold" });
      y += 5;
      addText("Teaching Artist (Contractor)", margin, y, { fontSize: 9, fontStyle: "italic", color: "#666666" });
      y += 5;
      addText(`Signed: ${new Date(signature.timestamp).toLocaleString()}`, margin, y, { fontSize: 8, color: "#999999" });

      // Company signature (right side)
      const rightX = pageWidth / 2 + 10;
      let ry = y - 22;
      addText(`Berlin, ${new Date(wo.created_at).toLocaleDateString("de-DE")}`, rightX, ry, { fontSize: 11, fontStyle: "bold" });
      ry += 10;
      addText("C. Justin Beard", rightX, ry, { fontSize: 11, fontStyle: "bold" });
      ry += 5;
      addText("Chief Executive Officer", rightX, ry, { fontSize: 9 });
      ry += 4;
      addText("InterACT English gGmbH", rightX, ry, { fontSize: 9 });

      // Footer
      y = 270;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      addText("InterACT English gGmbH, Planufer 92B, 10967 Berlin", margin, y, { fontSize: 7, color: "#999999" });
      y += 3;
      addText("Tel. 030 20339702 / www.interactenglish.de / info@interactenglish.de", margin, y, { fontSize: 7, color: "#999999" });

      return doc.output("blob");
    },
    []
  );

  return generate;
}
