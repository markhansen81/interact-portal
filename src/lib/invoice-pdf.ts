import jsPDF from "jspdf";

// --- Utility functions ---

function formatDateDE(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function formatMoney(amount: number): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots},${decPart}`;
}

function computeSeed(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return sum;
}

// --- Style options ---

const FONTS = ["helvetica", "times", "courier"] as const;
type FontName = (typeof FONTS)[number];

const ACCENT_COLORS: Array<readonly [number, number, number]> = [
  [25, 50, 100], // dark blue
  [30, 80, 50], // dark green
  [130, 30, 30], // dark red
  [80, 40, 110], // purple
  [20, 90, 90], // teal
  [100, 65, 30], // brown
];

const HEADER_TITLES = ["RECHNUNG", "Rechnung", "Invoice / Rechnung"];

type LayoutVariant = "A" | "B" | "C";
const LAYOUTS: LayoutVariant[] = ["A", "B", "C"];

type TableStyle = "lined" | "minimal" | "boxed";
const TABLE_STYLES: TableStyle[] = ["lined", "minimal", "boxed"];

type FooterStyle = "single-line" | "two-columns" | "centered";
const FOOTER_STYLES: FooterStyle[] = ["single-line", "two-columns", "centered"];

// --- Interface ---

export interface InvoicePDFData {
  taProfile: {
    id: string;
    first_name: string;
    last_name: string;
    street: string | null;
    city: string | null;
    postal_code: string | null;
    email: string;
    phone: string | null;
    tax_number: string | null;
    vat_registered: boolean | null;
    iban: string | null;
    bic: string | null;
    bank_name: string | null;
    pay_level: number;
    camp_level: number;
  };
  workOrder: {
    project_name: string;
    school: string;
    program_type: string;
    start_date: string;
    end_date: string;
    days: number;
  };
  invoiceNumber: string;
  invoiceDate: string;
  lineItems: Array<{
    description: string;
    amount: number;
  }>;
  total: number;
}

// --- PDF Generation ---

export async function generateInvoicePDF(
  data: InvoicePDFData
): Promise<Buffer> {
  const seed = computeSeed(data.taProfile.id);

  // Derive style choices from seed
  const font: FontName = FONTS[seed % FONTS.length];
  const layout: LayoutVariant = LAYOUTS[(seed + 1) % LAYOUTS.length];
  const accent = ACCENT_COLORS[seed % ACCENT_COLORS.length];
  const headerTitle = HEADER_TITLES[(seed + 2) % HEADER_TITLES.length];
  const tableStyle: TableStyle =
    TABLE_STYLES[(seed + 3) % TABLE_STYLES.length];
  const footerStyle: FooterStyle =
    FOOTER_STYLES[(seed + 4) % FOOTER_STYLES.length];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Colors
  const black: readonly [number, number, number] = [26, 26, 26];
  const grey: readonly [number, number, number] = [102, 102, 102];
  const lightGrey: readonly [number, number, number] = [200, 200, 200];

  function setColor(color: readonly [number, number, number]) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  function setDrawClr(color: readonly [number, number, number]) {
    doc.setDrawColor(color[0], color[1], color[2]);
  }

  function setFillClr(color: readonly [number, number, number]) {
    doc.setFillColor(color[0], color[1], color[2]);
  }

  const taName = `${data.taProfile.first_name} ${data.taProfile.last_name}`;
  const taAddress = [
    data.taProfile.street,
    [data.taProfile.postal_code, data.taProfile.city]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const level =
    data.workOrder.program_type === "camp"
      ? data.taProfile.camp_level
      : data.taProfile.pay_level;

  let y = 20;

  // ============================================================
  // HEADER — TA info block (varies by layout)
  // ============================================================

  if (layout === "A") {
    // Classic: TA info top-right, logo area top-left
    doc.setFontSize(10);
    doc.setFont(font, "bold");
    setColor(accent);
    doc.text("InterACT English", marginLeft, y);
    doc.setFontSize(7);
    doc.setFont(font, "normal");
    setColor(grey);
    doc.text("gGmbH", marginLeft + doc.getTextWidth("InterACT English "), y);

    // TA info top-right
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    setColor(black);
    doc.text(taName, pageWidth - marginRight, y, { align: "right" });
    y += 5;
    doc.setFontSize(8);
    doc.setFont(font, "normal");
    setColor(grey);
    if (data.taProfile.street) {
      doc.text(data.taProfile.street, pageWidth - marginRight, y, {
        align: "right",
      });
      y += 4;
    }
    const cityLine = [data.taProfile.postal_code, data.taProfile.city]
      .filter(Boolean)
      .join(" ");
    if (cityLine) {
      doc.text(cityLine, pageWidth - marginRight, y, { align: "right" });
      y += 4;
    }
    if (data.taProfile.phone) {
      doc.text(`Tel. ${data.taProfile.phone}`, pageWidth - marginRight, y, {
        align: "right",
      });
      y += 4;
    }
    doc.text(data.taProfile.email, pageWidth - marginRight, y, {
      align: "right",
    });
    y += 4;
    if (data.taProfile.tax_number) {
      doc.text(
        `St.Nr. ${data.taProfile.tax_number}`,
        pageWidth - marginRight,
        y,
        { align: "right" }
      );
      y += 4;
    }
  } else if (layout === "B") {
    // Modern minimal: everything left-aligned
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    setColor(black);
    doc.text(taName, marginLeft, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont(font, "normal");
    setColor(grey);
    if (data.taProfile.street) {
      doc.text(data.taProfile.street, marginLeft, y);
      y += 4;
    }
    const cityLine = [data.taProfile.postal_code, data.taProfile.city]
      .filter(Boolean)
      .join(" ");
    if (cityLine) {
      doc.text(cityLine, marginLeft, y);
      y += 4;
    }
    const contactLine = [
      data.taProfile.phone ? `Tel. ${data.taProfile.phone}` : null,
      data.taProfile.email,
    ]
      .filter(Boolean)
      .join(" | ");
    doc.text(contactLine, marginLeft, y);
    y += 4;
    if (data.taProfile.tax_number) {
      doc.text(`Steuernummer: ${data.taProfile.tax_number}`, marginLeft, y);
      y += 4;
    }
  } else {
    // C: Centered
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    setColor(black);
    doc.text(taName, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(8);
    doc.setFont(font, "normal");
    setColor(grey);
    if (taAddress) {
      doc.text(taAddress, pageWidth / 2, y, { align: "center" });
      y += 4;
    }
    const contactParts = [
      data.taProfile.phone ? `Tel. ${data.taProfile.phone}` : null,
      data.taProfile.email,
      data.taProfile.tax_number
        ? `St.Nr. ${data.taProfile.tax_number}`
        : null,
    ]
      .filter(Boolean)
      .join(" | ");
    doc.text(contactParts, pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  // ============================================================
  // Accent line separator
  // ============================================================
  y += 4;
  setDrawClr(accent);
  doc.setLineWidth(0.6);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 10;

  // ============================================================
  // Invoice title
  // ============================================================
  doc.setFontSize(18);
  doc.setFont(font, "bold");
  setColor(accent);
  if (layout === "C") {
    doc.text(headerTitle, pageWidth / 2, y, { align: "center" });
  } else {
    doc.text(headerTitle, marginLeft, y);
  }
  y += 10;

  // ============================================================
  // Invoice details
  // ============================================================
  doc.setFontSize(9);
  doc.setFont(font, "normal");
  setColor(black);

  const detailLabelX = marginLeft;
  const detailValueX = marginLeft + 45;

  doc.setFont(font, "bold");
  doc.text("Rechnungsnummer:", detailLabelX, y);
  doc.setFont(font, "normal");
  doc.text(data.invoiceNumber, detailValueX, y);
  y += 5;

  doc.setFont(font, "bold");
  doc.text("Rechnungsdatum:", detailLabelX, y);
  doc.setFont(font, "normal");
  doc.text(formatDateDE(data.invoiceDate), detailValueX, y);
  y += 10;

  // ============================================================
  // Billing To
  // ============================================================
  doc.setFontSize(9);
  doc.setFont(font, "bold");
  setColor(grey);
  doc.text("Kunde:", detailLabelX, y);
  y += 5;
  doc.setFont(font, "normal");
  setColor(black);
  doc.text("InterACT English gGmbH", detailLabelX, y);
  y += 4;
  doc.text("Planufer 92B", detailLabelX, y);
  y += 4;
  doc.text("10967 Berlin", detailLabelX, y);
  y += 10;

  // ============================================================
  // Project reference
  // ============================================================
  doc.setFontSize(9);
  doc.setFont(font, "bold");
  setColor(grey);
  doc.text("Projektdetails:", detailLabelX, y);
  y += 5;
  doc.setFont(font, "normal");
  setColor(black);

  doc.setFont(font, "bold");
  doc.text("Projekt:", detailLabelX, y);
  doc.setFont(font, "normal");
  doc.text(
    `${data.workOrder.project_name} – ${data.workOrder.school}`,
    detailValueX,
    y
  );
  y += 5;

  doc.setFont(font, "bold");
  doc.text("TA Level:", detailLabelX, y);
  doc.setFont(font, "normal");
  doc.text(String(level), detailValueX, y);
  y += 5;

  doc.setFont(font, "bold");
  doc.text("Projektzeitraum:", detailLabelX, y);
  doc.setFont(font, "normal");
  doc.text(
    `${formatDateDE(data.workOrder.start_date)} – ${formatDateDE(data.workOrder.end_date)}`,
    detailValueX,
    y
  );
  y += 10;

  // ============================================================
  // Line items table
  // ============================================================
  const colDesc = marginLeft;
  const colAmount = pageWidth - marginRight;
  const tableHeaderY = y;

  if (tableStyle === "lined") {
    // Header with background
    setFillClr(accent);
    doc.rect(marginLeft, tableHeaderY - 4, contentWidth, 7, "F");
    doc.setFontSize(8);
    doc.setFont(font, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Dienstleistung", colDesc + 2, tableHeaderY);
    doc.text("Betrag", colAmount - 2, tableHeaderY, { align: "right" });
    y = tableHeaderY + 6;

    // Rows
    doc.setFont(font, "normal");
    setColor(black);
    for (const item of data.lineItems) {
      doc.setFontSize(8);
      const descLines = doc.splitTextToSize(item.description, contentWidth - 40);
      doc.text(descLines[0], colDesc + 2, y);
      doc.text(`${formatMoney(item.amount)} €`, colAmount - 2, y, {
        align: "right",
      });
      // Row separator line
      setDrawClr(lightGrey);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, y + 2, pageWidth - marginRight, y + 2);
      y += 6;
    }

    // Total row
    setDrawClr(accent);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    setColor(black);
    doc.text("Gesamtbetrag:", colDesc + 2, y);
    doc.text(`${formatMoney(data.total)} €`, colAmount - 2, y, {
      align: "right",
    });
    y += 3;
    setDrawClr(accent);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
  } else if (tableStyle === "minimal") {
    // Minimal: just top/bottom lines, no fill
    setDrawClr(accent);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, tableHeaderY - 4, pageWidth - marginRight, tableHeaderY - 4);
    doc.setFontSize(8);
    doc.setFont(font, "bold");
    setColor(accent);
    doc.text("Dienstleistung", colDesc, tableHeaderY);
    doc.text("Betrag", colAmount, tableHeaderY, { align: "right" });
    setDrawClr(accent);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, tableHeaderY + 2, pageWidth - marginRight, tableHeaderY + 2);
    y = tableHeaderY + 7;

    doc.setFont(font, "normal");
    setColor(black);
    for (const item of data.lineItems) {
      doc.setFontSize(8);
      const descLines = doc.splitTextToSize(item.description, contentWidth - 40);
      doc.text(descLines[0], colDesc, y);
      doc.text(`${formatMoney(item.amount)} €`, colAmount, y, {
        align: "right",
      });
      y += 6;
    }

    // Total
    setDrawClr(accent);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, y - 2, pageWidth - marginRight, y - 2);
    y += 4;
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    setColor(black);
    doc.text("Gesamtbetrag:", colDesc, y);
    doc.text(`${formatMoney(data.total)} €`, colAmount, y, {
      align: "right",
    });
    y += 2;
    setDrawClr(accent);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
  } else {
    // Boxed: full border around everything
    const boxStartY = tableHeaderY - 5;
    // Header
    doc.setFontSize(8);
    doc.setFont(font, "bold");
    setColor(accent);
    doc.text("Dienstleistung", colDesc + 3, tableHeaderY);
    doc.text("Betrag", colAmount - 3, tableHeaderY, { align: "right" });
    y = tableHeaderY + 2;

    // Header bottom line
    setDrawClr(accent);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 5;

    doc.setFont(font, "normal");
    setColor(black);
    for (const item of data.lineItems) {
      doc.setFontSize(8);
      const descLines = doc.splitTextToSize(item.description, contentWidth - 40);
      doc.text(descLines[0], colDesc + 3, y);
      doc.text(`${formatMoney(item.amount)} €`, colAmount - 3, y, {
        align: "right",
      });
      y += 6;
    }

    // Total inside box
    setDrawClr(accent);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y - 2, pageWidth - marginRight, y - 2);
    y += 4;
    doc.setFontSize(9);
    doc.setFont(font, "bold");
    setColor(black);
    doc.text("Gesamtbetrag:", colDesc + 3, y);
    doc.text(`${formatMoney(data.total)} €`, colAmount - 3, y, {
      align: "right",
    });
    y += 4;

    // Outer box
    setDrawClr(accent);
    doc.setLineWidth(0.5);
    doc.rect(marginLeft, boxStartY, contentWidth, y - boxStartY);
  }

  y += 12;

  // ============================================================
  // Legal clauses
  // ============================================================
  doc.setFontSize(8);
  doc.setFont(font, "normal");
  setColor(black);

  if (!data.taProfile.vat_registered) {
    const vatText =
      "Gemäß § 19 UStG (Umsatzsteuergesetz) wird keine Umsatzsteuer berechnet, da die Kleinunternehmerregelung Anwendung findet.";
    const vatLines = doc.splitTextToSize(vatText, contentWidth);
    doc.text(vatLines, marginLeft, y);
    y += vatLines.length * 4 + 4;
  }

  const paymentText =
    "Ich bitte um Überweisung des Rechnungsbetrages innerhalb von 30 Tagen auf folgendes Konto:";
  const paymentLines = doc.splitTextToSize(paymentText, contentWidth);
  doc.text(paymentLines, marginLeft, y);
  y += paymentLines.length * 4 + 6;

  // ============================================================
  // Bank details
  // ============================================================
  doc.setFontSize(9);
  const bankLabelX = marginLeft;
  const bankValueX = marginLeft + 35;

  doc.setFont(font, "bold");
  setColor(grey);
  doc.text("Kontoinhaber:", bankLabelX, y);
  doc.setFont(font, "normal");
  setColor(black);
  doc.text(taName, bankValueX, y);
  y += 5;

  if (data.taProfile.bank_name) {
    doc.setFont(font, "bold");
    setColor(grey);
    doc.text("Bank:", bankLabelX, y);
    doc.setFont(font, "normal");
    setColor(black);
    doc.text(data.taProfile.bank_name, bankValueX, y);
    y += 5;
  }

  if (data.taProfile.iban) {
    doc.setFont(font, "bold");
    setColor(grey);
    doc.text("IBAN:", bankLabelX, y);
    doc.setFont(font, "normal");
    setColor(black);
    doc.text(data.taProfile.iban, bankValueX, y);
    y += 5;
  }

  if (data.taProfile.bic) {
    doc.setFont(font, "bold");
    setColor(grey);
    doc.text("BIC:", bankLabelX, y);
    doc.setFont(font, "normal");
    setColor(black);
    doc.text(data.taProfile.bic, bankValueX, y);
    y += 5;
  }

  // ============================================================
  // Footer
  // ============================================================
  const footerY = pageHeight - 20;
  setDrawClr(accent);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);

  doc.setFontSize(6);
  doc.setFont(font, "normal");
  setColor(grey);

  const footerParts = [
    taName,
    taAddress,
    data.taProfile.phone ? `Tel. ${data.taProfile.phone}` : null,
    data.taProfile.email,
    data.taProfile.tax_number
      ? `Steuernummer: ${data.taProfile.tax_number}`
      : null,
  ].filter(Boolean) as string[];

  if (footerStyle === "single-line") {
    const footerLine = footerParts.join(" | ");
    const footerLines = doc.splitTextToSize(footerLine, contentWidth);
    doc.text(footerLines, marginLeft, footerY);
  } else if (footerStyle === "two-columns") {
    const mid = Math.ceil(footerParts.length / 2);
    const col1 = footerParts.slice(0, mid);
    const col2 = footerParts.slice(mid);
    let fy = footerY;
    for (const line of col1) {
      doc.text(line, marginLeft, fy);
      fy += 3;
    }
    fy = footerY;
    for (const line of col2) {
      doc.text(line, pageWidth / 2, fy);
      fy += 3;
    }
  } else {
    // centered
    let fy = footerY;
    for (const line of footerParts) {
      doc.text(line, pageWidth / 2, fy, { align: "center" });
      fy += 3;
    }
  }

  // Convert to Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
