import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

export interface InsuranceOrderData {
  order_number: string;
  order_date: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  billing_address?: {
    line1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency: string;
  // Form fields
  insured_first_name?: string;
  insured_last_name?: string;
  school_name?: string;
  project_date?: string;
  participation_fee?: string;
  num_project_days?: string;
}

export function generateInsuranceInvoicePDF(order: InsuranceOrderData): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  function addText(
    text: string,
    x: number,
    yPos: number,
    opts?: {
      fontSize?: number;
      fontStyle?: string;
      color?: string;
      align?: string;
      maxWidth?: number;
    }
  ) {
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
    doc.text(text, x, yPos, {
      maxWidth: opts?.maxWidth || contentWidth,
      align,
    });
    return doc.getTextDimensions(text, {
      maxWidth: opts?.maxWidth || contentWidth,
    }).h;
  }

  // --- Logo (top left) ---
  try {
    const logoPath = path.join(process.cwd(), "public", "interact-logo.png");
    const logoData = fs.readFileSync(logoPath);
    const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
    doc.addImage(logoBase64, "PNG", margin, y - 5, 35, 25);
  } catch {
    // Logo not found — continue without it
  }

  // --- Company header (top right, matching work order PDF) ---
  addText("InterACT English gGmbH", pageWidth - margin, y, {
    fontSize: 8,
    align: "right",
    color: "#666666",
  });
  y += 3.5;
  addText("Planufer 92B, 10967 Berlin", pageWidth - margin, y, {
    fontSize: 8,
    align: "right",
    color: "#666666",
  });
  y += 3.5;
  addText("Tel. 030 20339702", pageWidth - margin, y, {
    fontSize: 8,
    align: "right",
    color: "#666666",
  });
  y += 3.5;
  addText("info@interactenglish.de", pageWidth - margin, y, {
    fontSize: 8,
    align: "right",
    color: "#666666",
  });
  y += 6;
  addText("Gesch\u00e4ftsf\u00fchrer:", pageWidth - margin, y, {
    fontSize: 8,
    align: "right",
    color: "#666666",
  });
  y += 3.5;
  addText(
    "Mark William Hansen & Charles Justin Beard",
    pageWidth - margin,
    y,
    { fontSize: 8, align: "right", color: "#666666" }
  );
  y += 3.5;
  addText(
    "Handelsregister - Amtsgericht Charlottenburg",
    pageWidth - margin,
    y,
    { fontSize: 8, align: "right", color: "#666666" }
  );
  y += 3.5;
  addText("HRB 188932 B", pageWidth - margin, y, {
    fontSize: 8,
    align: "right",
    color: "#666666",
  });
  y += 10;

  // --- Title ---
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  addText("Projektversicherung \u2013 Rechnung", margin, y, { fontSize: 20, fontStyle: "bold" });
  y += 10;

  addText(
    `Bestellnummer: #${order.order_number} (vom ${order.order_date})`,
    margin,
    y,
    { fontSize: 10 }
  );
  y += 6;
  addText(
    "Diese Versicherung sch\u00fctzt Ihre Investition in das Englischprojekt. Bei krankheitsbedingter Abwesenheit haben Sie Anspruch auf R\u00fcckerstattung.",
    margin,
    y,
    { fontSize: 9, color: "#666666", maxWidth: contentWidth }
  );
  y += 10;

  // --- Billed To ---
  addText("RECHNUNGSADRESSE:", margin, y, { fontSize: 10, fontStyle: "bold" });
  y += 6;
  addText(
    `${order.customer_first_name} ${order.customer_last_name}`,
    margin,
    y,
    { fontSize: 10 }
  );
  y += 5;

  if (order.billing_address) {
    const addr = order.billing_address;
    if (addr.line1) {
      addText(addr.line1, margin, y, { fontSize: 10 });
      y += 5;
    }
    if (addr.city || addr.postalCode) {
      addText(
        [addr.city, addr.postalCode].filter(Boolean).join(", "),
        margin,
        y,
        { fontSize: 10 }
      );
      y += 5;
    }
    if (addr.country) {
      addText(addr.country, margin, y, { fontSize: 10 });
      y += 5;
    }
  }

  addText(order.customer_email, margin, y, { fontSize: 10 });
  y += 10;

  // --- Order Summary table ---
  addText("Bestellübersicht", margin, y, { fontSize: 16, fontStyle: "bold" });
  y += 8;

  // Table header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  const col1 = margin;
  const col2 = margin + 80;
  const col3 = margin + 105;
  const col4 = margin + 135;

  addText("ARTIKEL", col1, y, { fontSize: 9, fontStyle: "bold" });
  addText("MENGE", col2, y, { fontSize: 9, fontStyle: "bold" });
  addText("EINZELPREIS", col3, y, { fontSize: 9, fontStyle: "bold" });
  addText("ZWISCHENSUMME", col4, y, { fontSize: 9, fontStyle: "bold" });
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Line item
  const currencySymbol = order.currency === "EUR" ? "\u20AC" : order.currency;
  addText(order.product_name, col1, y, { fontSize: 10, maxWidth: 75 });
  addText(String(order.quantity), col2, y, { fontSize: 10 });
  addText(`${currencySymbol}${order.unit_price.toFixed(2)}`, col3, y, {
    fontSize: 10,
  });
  addText(`${currencySymbol}${(order.unit_price * order.quantity).toFixed(2)}`, col4, y, {
    fontSize: 10,
  });
  y += 8;

  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Totals
  addText("Zwischensumme", col2 + 10, y, { fontSize: 10 });
  addText(`${currencySymbol}${order.total.toFixed(2)}`, col4, y, {
    fontSize: 10,
  });
  y += 5;
  addText("MwSt.", col2 + 10, y, { fontSize: 10 });
  addText(`${currencySymbol}0.00`, col4, y, { fontSize: 10 });
  y += 5;
  addText("GESAMT", col2 + 10, y, { fontSize: 10, fontStyle: "bold" });
  addText(`${currencySymbol}${order.total.toFixed(2)}`, col4, y, {
    fontSize: 10,
    fontStyle: "bold",
  });
  y += 14;

  // --- Additional Information ---
  addText("Weitere Informationen", margin, y, {
    fontSize: 16,
    fontStyle: "bold",
  });
  y += 8;

  const formFields: [string, string | undefined][] = [
    ["Vorname der versicherten Person:", order.insured_first_name],
    ["Nachname der versicherten Person:", order.insured_last_name],
    ["Schulname:", order.school_name],
    ["Datum des Projekts:", order.project_date],
    ["Teilnahmegeb\u00fchr:", order.participation_fee],
    ["Anzahl der Projekttage:", order.num_project_days],
  ];

  for (const [label, value] of formFields) {
    if (value) {
      addText(label, margin, y, { fontSize: 10, fontStyle: "bold" });
      y += 5;
      addText(`  ${value}`, margin, y, { fontSize: 10 });
      y += 6;
    }
  }

  // --- Footer info ---
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  addText("Erstattungsantrag: interactenglish.de/erstattungsantrag (innerhalb von 14 Tagen nach Projektende)", margin, y, {
    fontSize: 9, fontStyle: "bold", color: "#e6007e",
  });
  y += 5;
  addText("AGB & Versicherungsbedingungen: siehe beiliegendes Dokument oder interactenglish.de/versicherung", margin, y, {
    fontSize: 8, color: "#666666",
  });

  // Convert to Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
