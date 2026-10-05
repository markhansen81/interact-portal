import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

function formatDateDE(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function formatMoney(amount: number): string {
  // German format: 14.036,00
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots},${decPart}`;
}

export async function generateSchoolInvoicePDF(data: {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  school: string;
  schoolAddress: string;
  customerNumber: string;
  contactPerson: string;
  programType: string;
  programDescription: string;
  serviceStart: string; // YYYY-MM-DD
  serviceEnd: string; // YYYY-MM-DD
  numStudents: number;
  pricePP: number;
  total: number;
  dueDate: string; // YYYY-MM-DD
  createdByName: string;
}): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Colors
  const black = [26, 26, 26] as const;
  const grey = [102, 102, 102] as const;
  const lightGrey = [200, 200, 200] as const;

  function setColor(color: readonly [number, number, number]) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  // --- Logo (top right) ---
  let y = 15;
  try {
    const logoPath = path.join(process.cwd(), "public", "interact-logo.png");
    const logoData = fs.readFileSync(logoPath);
    const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
    doc.addImage(logoBase64, "PNG", pageWidth - marginRight - 40, y, 40, 20);
  } catch {
    // Logo not found - add text fallback
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(black);
    doc.text("InterACT English", pageWidth - marginRight, y + 10, { align: "right" });
  }

  // --- Sender line (small, above address) ---
  y = 45;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(grey);
  doc.text(
    "InterACT English gGmbH - Planufer 92B - 10967 Berlin",
    marginLeft,
    y
  );

  // --- Bill to (left side) ---
  y = 52;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(black);

  // Parse school address: could be multi-line
  // Try to extract postcode+city from address
  const addressParts = data.schoolAddress.split(",").map((s) => s.trim());
  const street = addressParts[0] || "";
  const postcodeCity = addressParts.slice(1).join(", ") || "";

  doc.text(data.school, marginLeft, y);
  y += 5;
  if (street) {
    doc.text(street, marginLeft, y);
    y += 5;
  }
  if (postcodeCity) {
    doc.text(postcodeCity, marginLeft, y);
    y += 5;
  }
  doc.text("Deutschland", marginLeft, y);

  // --- Meta table (right side) ---
  const metaX = 120;
  const metaValX = 165;
  let metaY = 52;
  doc.setFontSize(8);

  const metaRows = [
    ["Rechnungs-Nr.", `RE-${data.invoiceNumber}`],
    ["Rechnungsdatum", formatDateDE(data.invoiceDate)],
    [
      "Leistungszeitraum",
      `${formatDateDE(data.serviceStart)} - ${formatDateDE(data.serviceEnd)}`,
    ],
    ["Ihre Kundennummer", data.customerNumber],
    ["Ihr Ansprechpartner", data.contactPerson],
  ];

  for (const [label, value] of metaRows) {
    doc.setFont("helvetica", "normal");
    setColor(grey);
    doc.text(label, metaX, metaY);
    doc.setFont("helvetica", "bold");
    setColor(black);
    doc.text(value, metaValX, metaY);
    metaY += 5;
  }

  // --- Title ---
  y = 90;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text(`Rechnung Nr. RE-${data.invoiceNumber}`, marginLeft, y);

  // --- Salutation ---
  y = 102;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text("Sehr geehrte Kundin, sehr geehrter Kunde,", marginLeft, y);
  y += 6;
  doc.text(
    "vielen Dank f\u00fcr ihren Auftrag. Das von Ihnen gebuchte Programm rechnen wir wie folgt ab:",
    marginLeft,
    y,
    { maxWidth: contentWidth }
  );

  // --- Line items table ---
  y += 12;
  const tableLeft = marginLeft;
  const colPos = [marginLeft, marginLeft + 12]; // Pos.
  const colDesc = marginLeft + 12;
  const colQty = marginLeft + 100;
  const colUnit = marginLeft + 120;
  const colTotal = pageWidth - marginRight;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(tableLeft, y - 4, contentWidth, 7, "F");
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.setLineWidth(0.3);
  doc.line(tableLeft, y - 4, tableLeft + contentWidth, y - 4);
  doc.line(tableLeft, y + 3, tableLeft + contentWidth, y + 3);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(grey);
  doc.text("Pos.", colPos[0], y);
  doc.text("Beschreibung", colDesc + 2, y);
  doc.text("Menge", colQty, y);
  doc.text("Einzelpreis", colUnit, y);
  doc.text("Gesamtpreis", colTotal, y, { align: "right" });

  // Table row 1 - main line
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text("1.", colPos[0], y);
  doc.text(data.programType, colDesc + 2, y);
  doc.text(String(data.numStudents), colQty, y);
  doc.text(`${formatMoney(data.pricePP)} EUR`, colUnit, y);
  doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });

  // Table row 2 - description line
  y += 5;
  doc.setFontSize(8);
  setColor(grey);
  doc.text(data.programDescription, colDesc + 2, y, {
    maxWidth: colQty - colDesc - 6,
  });
  doc.text("Sch\u00fcler*innen", colQty, y);

  // Bottom table line
  y += 8;
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.line(tableLeft, y, tableLeft + contentWidth, y);

  // --- Totals ---
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text("Gesamtbetrag netto", marginLeft, y);
  doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });

  y += 5;
  doc.setFontSize(8);
  setColor(grey);
  doc.text("Steuerfreie Ums\u00e4tze gem\u00e4\u00df \u00a74 UStG.", marginLeft, y);

  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text("Gesamtbetrag brutto", marginLeft, y);
  doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });

  // --- Tax note ---
  y += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(grey);
  doc.text(
    "Umsatzsteuerbefreit: Der Rechnungsbetrag ist nach \u00a74 Nr.21 a)bb)UStG umsatzsteuerfrei.",
    marginLeft,
    y,
    { maxWidth: contentWidth }
  );

  // --- Payment instructions ---
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text(
    `Bitte \u00fcberweisen Sie den Betrag bis zum ${formatDateDE(data.dueDate)} auf das angegebene Konto.`,
    marginLeft,
    y,
    { maxWidth: contentWidth }
  );

  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(grey);
  const paymentNote =
    "Bitte geben Sie als Verwendungszweck Ihre Rechnungsnummer und den Namen Ihrer Schule an. Sollten Sie den Rechnungsbetrag in mehreren Teilzahlungen \u00fcberweisen wollen, geben Sie bitte unbedingt einen Hinweis in Form von 1 von 2 o.\u00c4. im Verwendungszweck an.";
  const paymentLines = doc.splitTextToSize(paymentNote, contentWidth);
  doc.text(paymentLines, marginLeft, y);
  y += paymentLines.length * 4 + 4;

  // --- Thank you message ---
  y += 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(0, 102, 153); // Teal-ish color
  doc.text(
    "Thanks for working with InterACT English. We're looking forward to future collaborations!",
    marginLeft,
    y,
    { maxWidth: contentWidth }
  );

  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(grey);
  doc.text(
    `Diese Rechnung wurde von ${data.createdByName} erstellt.`,
    marginLeft,
    y
  );

  // --- Footer (4 columns) ---
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
  doc.text(
    "Gesch\u00e4ftsf\u00fchrung Mark William",
    col3X,
    footerY + 15
  );
  doc.text("Hansen & Charles Justin Beard", col3X, footerY + 18);

  // Column 4
  doc.text("Bank Berliner Sparkasse", col4X, footerY);
  doc.text("Konto 0190650656", col4X, footerY + 3);
  doc.text("BLZ 10050000", col4X, footerY + 6);
  doc.text("IBAN DE64100500000190650656", col4X, footerY + 9);
  doc.text("BIC BELADEBEXXX", col4X, footerY + 12);

  // Page number
  doc.setFontSize(8);
  doc.text("1/1", pageWidth - marginRight, pageHeight - 10, {
    align: "right",
  });

  // Convert to Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
