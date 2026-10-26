import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

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

export async function generateOfferPDF(data: {
  offerNumber: string;
  offerDate: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD
  schoolName: string;
  schoolAddress: string;
  contactName: string;
  programType: string;
  startDate?: string;
  endDate?: string;
  numStudents: number;
  numGroups: number;
  numTas: number;
  tariff: 1 | 2;
  pricePPTariff1: number;
  pricePPTariff2: number | null;
  total: number;
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

  // --- School address (left side) ---
  y = 52;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(black);

  const addressParts = data.schoolAddress.split(",").map((s) => s.trim());
  const street = addressParts[0] || "";
  const postcodeCity = addressParts.slice(1).join(", ") || "";

  doc.text(data.schoolName, marginLeft, y);
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

  // --- Meta table (top right) ---
  const metaX = 120;
  const metaValX = 165;
  let metaY = 52;
  doc.setFontSize(8);

  const metaRows: [string, string][] = [
    ["Angebots-Nr.", data.offerNumber],
    ["Datum", formatDateDE(data.offerDate)],
    ["Ihre Ansprechperson", "InterACT School Partnerships"],
  ];
  if (data.validUntil) {
    metaRows.push(["G\u00fcltig bis", formatDateDE(data.validUntil)]);
  }

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
  doc.text(`Angebot_${data.offerNumber}`, marginLeft, y);

  // --- Details section ---
  y = 102;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(black);
  if (data.startDate && data.endDate) {
    doc.text(
      `Details: ${formatDateDE(data.startDate)} - ${formatDateDE(data.endDate)}`,
      marginLeft,
      y
    );
  } else {
    doc.text("Details:", marginLeft, y);
  }

  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(black);

  const bulletX = marginLeft + 4;
  const textX = marginLeft + 8;

  doc.text("\u2022", bulletX, y);
  doc.text(`${data.numStudents} Teilnehmer*innen`, textX, y);
  y += 5;

  doc.text("\u2022", bulletX, y);
  doc.text(`${data.numGroups} Gruppen*`, textX, y);
  y += 5;

  doc.text("\u2022", bulletX, y);
  doc.text(`${data.numTas} Native Speaker*`, textX, y);
  y += 6;

  doc.setFontSize(7);
  setColor(grey);
  doc.text(
    "*Basierend auf der gesch\u00e4tzten Teilnehmendenanzahl",
    marginLeft,
    y
  );

  // --- Pricing table ---
  y += 10;
  const tableLeft = marginLeft;
  const colProgram = marginLeft;
  const colPrice = marginLeft + 70;
  const colQty = marginLeft + 105;
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
  doc.text("Programme", colProgram, y);
  doc.text("Einzelpreis", colPrice, y);
  doc.text("Menge (SuS)", colQty, y);
  doc.text("Gesamtpreis", colTotal, y, { align: "right" });

  // --- Tariff 1 row ---
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(black);

  // Checkbox for Tariff 1
  const checkboxSize = 3;
  const cbX = colProgram;
  const labelX = colProgram + 5;

  doc.setDrawColor(black[0], black[1], black[2]);
  doc.setLineWidth(0.3);
  doc.rect(cbX, y - 2.5, checkboxSize, checkboxSize);
  if (data.tariff === 1) {
    // Filled checkbox
    doc.setFillColor(black[0], black[1], black[2]);
    doc.rect(cbX + 0.5, y - 2, checkboxSize - 1, checkboxSize - 1, "F");
  }

  doc.text(`${data.programType} \u2014 Tarif 1`, labelX, y);
  doc.text(`${formatMoney(data.pricePPTariff1)} EUR`, colPrice, y);
  doc.text(String(data.numStudents), colQty, y);
  if (data.tariff === 1) {
    doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });
  }

  y += 5;
  doc.setFontSize(7);
  setColor(grey);
  const tariff1Desc =
    "Preis pro Teilnehmer*in. Reduzierter Preis f\u00fcr Schulen, die \u00dcbernachtungsm\u00f6glichkeiten (Homestays) zur Verf\u00fcgung stellen oder sofern keine \u00dcbernachtung notwendig ist.";
  const tariff1Lines = doc.splitTextToSize(tariff1Desc, colPrice - labelX - 4);
  doc.text(tariff1Lines, labelX, y);
  y += tariff1Lines.length * 3 + 4;

  // Separator line between tariffs
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.setLineWidth(0.2);
  doc.line(tableLeft, y, tableLeft + contentWidth, y);

  // --- Tariff 2 row ---
  y += 6;
  doc.setFontSize(9);
  setColor(black);

  doc.setDrawColor(black[0], black[1], black[2]);
  doc.setLineWidth(0.3);
  doc.rect(cbX, y - 2.5, checkboxSize, checkboxSize);
  if (data.tariff === 2) {
    doc.setFillColor(black[0], black[1], black[2]);
    doc.rect(cbX + 0.5, y - 2, checkboxSize - 1, checkboxSize - 1, "F");
  }

  doc.text(`${data.programType} \u2014 Tarif 2`, labelX, y);
  if (data.pricePPTariff2 !== null) {
    doc.text(`${formatMoney(data.pricePPTariff2)} EUR`, colPrice, y);
  }
  doc.text(String(data.numStudents), colQty, y);
  if (data.tariff === 2) {
    doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });
  }

  y += 5;
  doc.setFontSize(7);
  setColor(grey);
  const tariff2Desc =
    "Preis pro Teilnehmer*in, inklusive \u00dcbernachtungskosten";
  doc.text(tariff2Desc, labelX, y);

  // Bottom table line
  y += 6;
  doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.setLineWidth(0.3);
  doc.line(tableLeft, y, tableLeft + contentWidth, y);

  // --- Totals ---
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(black);
  doc.text("Gesamtbetrag Netto", marginLeft, y);
  doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });

  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text("Gesamtbetrag", marginLeft, y);
  doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });

  // --- Rahmenbedingungen ---
  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(black);
  doc.text("Rahmenbedingungen", marginLeft, y);

  y += 7;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(black);

  const conditions = [
    "Dieses Angebot gilt ausschlie\u00dflich unter Einbeziehung unserer Allgemeinen Gesch\u00e4ftsbedingungen, zu finden unter http://interactenglish.de/agb/",
    "Umsatzsteuerbefreit: Der Rechnungsbetrag ist nach \u00a74 Nr.21 a)bb)UStG umsatzsteuerfrei.",
    "Die Programmgeb\u00fchren basieren auf der Teilnehmeranzahl inklusive einer vereinbarten Mindestverg\u00fctung im Fall von Krankheit oder Abwesenheit der Sch\u00fcler*innen.",
    "Wir freuen uns auf Ihre Antwort!",
  ];

  for (const condition of conditions) {
    const lines = doc.splitTextToSize(condition, contentWidth - 4);
    doc.text("\u2022", marginLeft, y);
    doc.text(lines, marginLeft + 4, y);
    y += lines.length * 4 + 3;
  }

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
  doc.text("Gesch\u00e4ftsf\u00fchrung Mark William", col3X, footerY + 15);
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
