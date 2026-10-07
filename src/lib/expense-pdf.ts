import jsPDF from "jspdf";

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

export interface ExpensePDFData {
  taProfile: {
    first_name: string;
    last_name: string;
    tax_number: string | null;
    iban: string | null;
    bic: string | null;
  };
  items: Array<{
    description: string;
    amount: number;
    category: string;
    receipt_date?: string;
  }>;
  projectName: string;
  belegNumber: string;
  belegDate: string; // ISO date string
}

const MATERIAL_CATEGORIES = ["materialien", "lebensmittel", "druck", "sonstiges"];
const TRAVEL_CATEGORIES = ["transport", "unterkunft"];

export async function generateExpensePDF(
  data: ExpensePDFData
): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Colors
  const black = [26, 26, 26] as const;
  const grey = [102, 102, 102] as const;
  const lightGrey = [200, 200, 200] as const;
  const headerBg = [240, 240, 240] as const;

  function setColor(color: readonly [number, number, number]) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  // === HEADER ===
  let y = 15;

  // Company name (top right)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text("INTERACT ENGLISH", pageWidth - marginRight, y + 5, {
    align: "right",
  });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(grey);
  doc.text("InterACT English gGmbH", pageWidth - marginRight, y + 10, {
    align: "right",
  });

  // Title
  y = 20;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text("AUSLAGENERSTATTUNG", marginLeft, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(grey);
  doc.text("COST REIMBURSEMENT FORM", marginLeft, y + 6);

  // Beleg info (right-aligned, below company name)
  y = 35;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(grey);
  doc.text("Belegdatum:", pageWidth - marginRight - 45, y);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text(formatDateDE(data.belegDate), pageWidth - marginRight, y, {
    align: "right",
  });

  y += 5;
  doc.setFont("helvetica", "normal");
  setColor(grey);
  doc.text("Belegnummer:", pageWidth - marginRight - 45, y);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text(data.belegNumber, pageWidth - marginRight, y, { align: "right" });

  // === TA INFO BOX ===
  y = 50;
  const boxHeight = 32;
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.setLineWidth(0.4);
  doc.rect(marginLeft, y, contentWidth, boxHeight);

  // Box header
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(marginLeft, y, contentWidth, 7, "F");
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.line(marginLeft, y + 7, marginLeft + contentWidth, y + 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text("ANGABEN ZUR PERSON / TA INFORMATION", marginLeft + 3, y + 5);

  // Info rows
  const infoStartY = y + 12;
  const labelX = marginLeft + 3;
  const valueX = marginLeft + 40;
  const label2X = marginLeft + contentWidth / 2 + 3;
  const value2X = marginLeft + contentWidth / 2 + 25;

  doc.setFontSize(8);

  // Row 1: Name
  doc.setFont("helvetica", "bold");
  setColor(grey);
  doc.text("NAME:", labelX, infoStartY);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text(
    `${data.taProfile.first_name} ${data.taProfile.last_name}`,
    valueX,
    infoStartY
  );

  // Row 1 right: Tax number
  doc.setFont("helvetica", "bold");
  setColor(grey);
  doc.text("(TAX NR.) ST.NR.:", label2X, infoStartY);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text(data.taProfile.tax_number || "—", value2X + 10, infoStartY);

  // Row 2: IBAN
  const row2Y = infoStartY + 6;
  doc.setFont("helvetica", "bold");
  setColor(grey);
  doc.text("IBAN:", labelX, row2Y);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text(data.taProfile.iban || "—", valueX, row2Y);

  // Row 2 right: BIC
  doc.setFont("helvetica", "bold");
  setColor(grey);
  doc.text("BIC:", label2X, row2Y);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text(data.taProfile.bic || "—", value2X + 10, row2Y);

  // Separate items into material and travel
  const materialItems = data.items.filter((item) =>
    MATERIAL_CATEGORIES.includes(item.category)
  );
  const travelItems = data.items.filter((item) =>
    TRAVEL_CATEGORIES.includes(item.category)
  );

  // Table column positions
  const colDate = marginLeft;
  const colDesc = marginLeft + 28;
  const colProject = marginLeft + 95;
  const colAmount = marginLeft + contentWidth;
  const tableRowHeight = 6;

  function drawTableHeader(startY: number, title: string): number {
    let ty = startY;

    // Section title
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(black);
    doc.text(title, marginLeft, ty);
    ty += 6;

    // Column header background
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(marginLeft, ty - 4, contentWidth, 7, "F");
    doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, ty - 4, marginLeft + contentWidth, ty - 4);
    doc.line(marginLeft, ty + 3, marginLeft + contentWidth, ty + 3);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(grey);
    doc.text("Belegdatum", colDate, ty);
    doc.text("Beschreibung", colDesc, ty);
    doc.text("Projektname", colProject, ty);
    doc.text("Bruttobetrag in \u20AC", colAmount, ty, { align: "right" });

    return ty + 6;
  }

  function drawTableRows(
    items: ExpensePDFData["items"],
    startY: number
  ): { endY: number; subtotal: number } {
    let ty = startY;
    let subtotal = 0;

    if (items.length === 0) {
      // Empty row
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      setColor(grey);
      doc.text("Keine Eintr\u00e4ge", colDesc, ty);
      ty += tableRowHeight;
    } else {
      for (const item of items) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        setColor(black);

        // Receipt date
        const dateStr = item.receipt_date
          ? formatDateDE(item.receipt_date)
          : "—";
        doc.text(dateStr, colDate, ty);

        // Description (truncate if too long)
        const descMaxWidth = colProject - colDesc - 3;
        const descLines = doc.splitTextToSize(item.description, descMaxWidth);
        doc.text(descLines[0], colDesc, ty);

        // Project name
        const projMaxWidth = colAmount - colProject - 25;
        const projLines = doc.splitTextToSize(data.projectName, projMaxWidth);
        doc.text(projLines[0], colProject, ty);

        // Amount
        doc.text(`${formatMoney(item.amount)} \u20AC`, colAmount, ty, {
          align: "right",
        });

        subtotal += item.amount;
        ty += tableRowHeight;
      }
    }

    // Subtotal line
    doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, ty, marginLeft + contentWidth, ty);
    ty += 5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(black);
    doc.text("Zwischensumme:", colProject, ty);
    doc.text(`${formatMoney(subtotal)} \u20AC`, colAmount, ty, {
      align: "right",
    });

    return { endY: ty + 4, subtotal };
  }

  // === MATERIALKOSTEN TABLE ===
  y = 90;
  y = drawTableHeader(y, "MATERIALKOSTEN / MATERIAL COSTS");
  const materialResult = drawTableRows(materialItems, y);
  y = materialResult.endY;

  // === REISEKOSTEN TABLE ===
  y += 6;
  y = drawTableHeader(y, "REISEKOSTEN / TRAVEL COSTS");
  const travelResult = drawTableRows(travelItems, y);
  y = travelResult.endY;

  // === GRAND TOTAL ===
  y += 6;
  const grandTotal = materialResult.subtotal + travelResult.subtotal;

  // Total box
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(marginLeft, y - 4, contentWidth, 10, "F");
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, y - 4, contentWidth, 10);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text("GESAMTSUMME IN \u20AC / GRAND TOTAL IN \u20AC", marginLeft + 3, y + 2);
  doc.text(`${formatMoney(grandTotal)} \u20AC`, colAmount, y + 2, {
    align: "right",
  });

  // === FOOTER ===
  const footerY = pageHeight - 25;
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, footerY - 3, pageWidth - marginRight, footerY - 3);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  setColor(grey);

  const col1X = marginLeft;
  const col2X = marginLeft + 40;
  const col3X = marginLeft + 80;
  const col4X = marginLeft + 130;

  // Column 1
  doc.text("InterACT English gGmbH", col1X, footerY);
  doc.text("Planufer 92B", col1X, footerY + 3);
  doc.text("10967 Berlin", col1X, footerY + 6);
  doc.text("Deutschland", col1X, footerY + 9);

  // Column 2
  doc.text("Tel. 030 20 33 9702", col2X, footerY);
  doc.text("E-Mail justin@interactenglish.de", col2X, footerY + 3);
  doc.text("Web www.interactenglish.de", col2X, footerY + 6);

  // Column 3
  doc.text("Amtsgericht Handelsregister -", col3X, footerY);
  doc.text("Amtsgericht Charlottenburg", col3X, footerY + 3);
  doc.text("HR-Nr. HRB 188932 B", col3X, footerY + 6);
  doc.text("USt.-ID DE313026921", col3X, footerY + 9);
  doc.text("Steuer-Nr. 27/614/02133", col3X, footerY + 12);

  // Column 4
  doc.text("Bank Berliner Sparkasse", col4X, footerY);
  doc.text("Konto 0190650656", col4X, footerY + 3);
  doc.text("BLZ 10050000", col4X, footerY + 6);
  doc.text("IBAN DE64100500000190650656", col4X, footerY + 9);
  doc.text("BIC BELADEBEXXX", col4X, footerY + 12);

  // Convert to Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
