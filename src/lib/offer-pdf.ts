import jsPDF from "jspdf";
import fs from "fs";
import path from "path";
import { ProgramContent, TimetableData } from "./offer-program-content";

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

// Brand and UI colors
const BRAND_PINK: readonly [number, number, number] = [233, 30, 140]; // #E91E8C
const BLACK: readonly [number, number, number] = [26, 26, 26];
const GREY: readonly [number, number, number] = [102, 102, 102];
const LIGHT_GREY: readonly [number, number, number] = [200, 200, 200];
const WHITE: readonly [number, number, number] = [255, 255, 255];

// Activity color map for timetable
const ACTIVITY_COLORS: Record<string, [number, number, number]> = {
  Dance: [233, 30, 140],
  "Team Building": [233, 30, 140],
  Theatre: [0, 188, 212],
  Theater: [0, 188, 212],
  Art: [79, 195, 247],
  Singing: [156, 39, 176],
  "Language Game": [102, 187, 106],
  Storytime: [255, 112, 67],
  Sport: [55, 71, 79],
  "Stop-Motion": [255, 152, 0],
  "Speak Up": [33, 150, 243],
  Presentation: [255, 193, 7],
};

function getActivityColor(activity: string): [number, number, number] {
  if (ACTIVITY_COLORS[activity]) return ACTIVITY_COLORS[activity];
  // Partial match
  for (const [key, color] of Object.entries(ACTIVITY_COLORS)) {
    if (activity.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return [158, 158, 158]; // default grey
}

function setColor(
  doc: jsPDF,
  color: readonly [number, number, number]
): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number, marginLeft: number, marginRight: number): void {
  const footerY = pageHeight - 25;
  doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, footerY - 3, pageWidth - marginRight, footerY - 3);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);

  const col1X = marginLeft;
  const col2X = marginLeft + 40;
  const col3X = marginLeft + 80;
  const col4X = marginLeft + 130;

  doc.text("InterACT English gGmbH", col1X, footerY);
  doc.text("Planufer 92B", col1X, footerY + 3);
  doc.text("10967 Berlin", col1X, footerY + 6);
  doc.text("Deutschland", col1X, footerY + 9);

  doc.text("Tel. 030 20 33 9702", col2X, footerY);
  doc.text("E-Mail justin@interactenglish.de", col2X, footerY + 3);
  doc.text("Web www.interactenglish.de", col2X, footerY + 6);

  doc.text("Amtsgericht Handelsregister -", col3X, footerY);
  doc.text("Amtsgericht Charlottenburg", col3X, footerY + 3);
  doc.text("HR-Nr. HRB 188932 B", col3X, footerY + 6);
  doc.text("USt.-ID DE313026921", col3X, footerY + 9);
  doc.text("Steuer-Nr. 27/614/02133", col3X, footerY + 12);
  doc.text("Gesch\u00e4ftsf\u00fchrung Mark William", col3X, footerY + 15);
  doc.text("Hansen & Charles Justin Beard", col3X, footerY + 18);

  doc.text("Bank Berliner Sparkasse", col4X, footerY);
  doc.text("Konto 0190650656", col4X, footerY + 3);
  doc.text("BLZ 10050000", col4X, footerY + 6);
  doc.text("IBAN DE64100500000190650656", col4X, footerY + 9);
  doc.text("BIC BELADEBEXXX", col4X, footerY + 12);
}

function drawPageHeader(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  marginRight: number
): void {
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  setColor(doc, BRAND_PINK);
  doc.text(`Angebot f\u00fcr ${schoolName}`, pageWidth - marginRight, 12, {
    align: "right",
  });
}

function drawPageNumber(
  doc: jsPDF,
  current: number,
  total: number,
  pageWidth: number,
  pageHeight: number,
  marginRight: number
): void {
  doc.setFontSize(8);
  setColor(doc, GREY);
  doc.text(`${current}/${total}`, pageWidth - marginRight, pageHeight - 10, {
    align: "right",
  });
}

// ---------- Program Description Page ----------

function drawProgramDescriptionPage(
  doc: jsPDF,
  content: ProgramContent,
  schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number
): void {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPageHeader(doc, schoolName, pageWidth, marginRight);

  // Pink header bar
  const barY = 18;
  const barHeight = 14;
  doc.setFillColor(BRAND_PINK[0], BRAND_PINK[1], BRAND_PINK[2]);
  doc.rect(0, barY, pageWidth, barHeight, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(content.name.toUpperCase(), marginLeft, barY + 10);

  // Tagline
  let y = barY + barHeight + 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  setColor(doc, BRAND_PINK);
  doc.text(content.tagline, marginLeft, y);

  // Key details bullets
  y += 9;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bolditalic");
  setColor(doc, BLACK);
  const details = [content.gradeRange, content.duration, content.studentsRange];
  for (const detail of details) {
    doc.text("\u2022  " + detail, marginLeft, y);
    y += 5;
  }

  // Separator
  y += 3;
  doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 6;

  // Two-column layout
  const colGap = 8;
  const leftColWidth = (contentWidth - colGap) / 2;
  const rightColX = marginLeft + leftColWidth + colGap;
  const rightColWidth = leftColWidth;

  // --- Left column: Description + Sprachf\u00e4higkeiten ---
  let leftY = y;

  // Description
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);
  const descLines = doc.splitTextToSize(content.description, leftColWidth);
  doc.text(descLines, marginLeft, leftY);
  leftY += descLines.length * 4 + 6;

  if (content.skills.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, BRAND_PINK);
    doc.text("Sprachf\u00e4higkeiten", marginLeft, leftY);
    leftY += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, BLACK);
    for (const skill of content.skills) {
      const lines = doc.splitTextToSize(skill, leftColWidth - 6);
      doc.text("\u2022", marginLeft + 1, leftY);
      doc.text(lines, marginLeft + 5, leftY);
      leftY += lines.length * 3.5 + 2;
    }
  }

  // --- Right column: Creative skills (if any) + Hauptaktivit\u00e4ten ---
  let rightY = y;

  if (content.creativeSkills && content.creativeSkills.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, BRAND_PINK);
    doc.text("Kreative F\u00e4higkeiten", rightColX, rightY);
    rightY += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, BLACK);
    for (const skill of content.creativeSkills) {
      const lines = doc.splitTextToSize(skill, rightColWidth - 6);
      doc.text("\u2022", rightColX + 1, rightY);
      doc.text(lines, rightColX + 5, rightY);
      rightY += lines.length * 3.5 + 2;
    }
    rightY += 4;
  }

  if (content.activities.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, BRAND_PINK);
    doc.text("Hauptaktivit\u00e4ten", rightColX, rightY);
    rightY += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, BLACK);
    for (const activity of content.activities) {
      const lines = doc.splitTextToSize(activity, rightColWidth - 6);
      doc.text("\u2022", rightColX + 1, rightY);
      doc.text(lines, rightColX + 5, rightY);
      rightY += lines.length * 3.5 + 2;
    }
  }

  // Effect section (for Kulturtag etc.) — below both columns
  if (content.effect.length > 0) {
    let effectY = Math.max(leftY, rightY) + 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, BRAND_PINK);
    doc.text("Effekt", marginLeft, effectY);
    effectY += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, BLACK);
    for (const item of content.effect) {
      const lines = doc.splitTextToSize(item, contentWidth - 6);
      doc.text("\u2022", marginLeft + 1, effectY);
      doc.text(lines, marginLeft + 5, effectY);
      effectY += lines.length * 3.5 + 2;
    }
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft, marginRight);
}

// ---------- Timetable Page ----------

function drawTimetablePage(
  doc: jsPDF,
  timetable: TimetableData,
  schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number
): void {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPageHeader(doc, schoolName, pageWidth, marginRight);

  // Pink header bar
  const barY = 18;
  const barHeight = 14;
  doc.setFillColor(BRAND_PINK[0], BRAND_PINK[1], BRAND_PINK[2]);
  doc.rect(0, barY, pageWidth, barHeight, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("BEISPIEL STUNDENPLAN", marginLeft, barY + 10);

  let y = barY + barHeight + 10;

  for (const block of timetable.gradeBlocks) {
    // Grade block label
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setColor(doc, BLACK);
    doc.text(block.label, marginLeft, y);
    y += 7;

    const numDays = timetable.daysCount;
    const numPeriods = block.periods;

    // Table dimensions
    const headerColWidth = 22;
    const availableWidth = contentWidth - headerColWidth;
    const cellWidth = numDays > 1
      ? availableWidth / numDays
      : availableWidth / numPeriods;
    const cellHeight = 10;

    // Column headers
    if (numDays > 1) {
      // Multi-day: columns = Tag 1, Tag 2, ...
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      setColor(doc, GREY);
      for (let d = 0; d < numDays; d++) {
        const cx = marginLeft + headerColWidth + d * cellWidth;
        doc.text(`Tag ${d + 1}`, cx + cellWidth / 2, y, { align: "center" });
      }
      y += 5;

      // Row headers = Stunde 1..n, cells = activities
      for (let p = 0; p < numPeriods; p++) {
        // Row header
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        setColor(doc, GREY);
        doc.text(`${p + 1}. Std`, marginLeft, y + cellHeight / 2 + 1);

        for (let d = 0; d < numDays; d++) {
          const activity =
            block.slots[d] && block.slots[d][p] ? block.slots[d][p] : "";
          const cx = marginLeft + headerColWidth + d * cellWidth;
          const color = getActivityColor(activity);

          // Colored rectangle
          doc.setFillColor(color[0], color[1], color[2]);
          doc.roundedRect(cx + 0.5, y, cellWidth - 1, cellHeight - 1, 1, 1, "F");

          // White text
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          setColor(doc, WHITE);
          const lines = doc.splitTextToSize(activity, cellWidth - 3);
          const textY = y + (cellHeight - lines.length * 3) / 2 + 2.5;
          doc.text(lines, cx + cellWidth / 2, textY, { align: "center" });
        }
        y += cellHeight;
      }
    } else {
      // Single day: columns = periods
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      setColor(doc, GREY);
      for (let p = 0; p < numPeriods; p++) {
        const cx = marginLeft + headerColWidth + p * cellWidth;
        const label = block.rooms
          ? block.rooms[p]
          : `${p + 1}. Std`;
        const labelLines = doc.splitTextToSize(label, cellWidth - 2);
        doc.text(labelLines, cx + cellWidth / 2, y, { align: "center" });
      }
      y += 6;

      // Single row of activities
      for (let p = 0; p < numPeriods; p++) {
        const activity =
          block.slots[0] && block.slots[0][p] ? block.slots[0][p] : "";
        const cx = marginLeft + headerColWidth + p * cellWidth;
        const color = getActivityColor(activity);

        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(cx + 0.5, y, cellWidth - 1, cellHeight - 1, 1, 1, "F");

        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        setColor(doc, WHITE);
        const lines = doc.splitTextToSize(activity, cellWidth - 3);
        const textY = y + (cellHeight - lines.length * 3) / 2 + 2.5;
        doc.text(lines, cx + cellWidth / 2, textY, { align: "center" });
      }
      y += cellHeight;
    }

    y += 8;
  }

  // Notes
  if (timetable.notes && timetable.notes.length > 0) {
    y += 2;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    setColor(doc, GREY);
    for (const note of timetable.notes) {
      doc.text("* " + note, marginLeft, y);
      y += 4;
    }
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft, marginRight);
}

// ---------- Main Export ----------

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
  programContent?: ProgramContent;
  allProgramContents?: ProgramContent[];
}): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Collect all program contents (multi-program support)
  const programPages: ProgramContent[] = data.allProgramContents?.length
    ? data.allProgramContents
    : data.programContent
      ? [data.programContent]
      : [];

  let programPageCount = 0;
  for (const pc of programPages) {
    programPageCount++; // description page
    if (pc.timetable) programPageCount++; // timetable page
  }
  const totalPages = 1 + programPageCount;
  let currentPage = 1;

  // ========================================================
  // PAGE 1: Cover / Pricing Page
  // ========================================================

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
    setColor(doc, BLACK);
    doc.text("InterACT English", pageWidth - marginRight, y + 10, {
      align: "right",
    });
  }

  // --- Sender line ---
  y = 45;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);
  doc.text(
    "InterACT English gGmbH - Planufer 92B - 10967 Berlin",
    marginLeft,
    y
  );

  // --- School address ---
  y = 52;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

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
    setColor(doc, GREY);
    doc.text(label, metaX, metaY);
    doc.setFont("helvetica", "bold");
    setColor(doc, BLACK);
    doc.text(value, metaValX, metaY);
    metaY += 5;
  }

  // --- Title ---
  y = 90;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text(`Angebot_${data.offerNumber}`, marginLeft, y);

  // --- Details section ---
  y = 102;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
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
  setColor(doc, BLACK);

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
  setColor(doc, GREY);
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
  doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
  doc.setLineWidth(0.3);
  doc.line(tableLeft, y - 4, tableLeft + contentWidth, y - 4);
  doc.line(tableLeft, y + 3, tableLeft + contentWidth, y + 3);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, GREY);
  doc.text("Programme", colProgram, y);
  doc.text("Einzelpreis", colPrice, y);
  doc.text("Menge (SuS)", colQty, y);
  doc.text("Gesamtpreis", colTotal, y, { align: "right" });

  // --- Tariff 1 row ---
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

  const checkboxSize = 3;
  const cbX = colProgram;
  const labelX = colProgram + 5;

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.3);
  doc.rect(cbX, y - 2.5, checkboxSize, checkboxSize);
  if (data.tariff === 1) {
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.rect(cbX + 0.5, y - 2, checkboxSize - 1, checkboxSize - 1, "F");
  }

  doc.text(`${data.programType} \u2014 Tarif 1`, labelX, y);
  doc.text(`${formatMoney(data.pricePPTariff1)} EUR`, colPrice, y);
  doc.text(String(data.numStudents), colQty, y);
  if (data.tariff === 1) {
    doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, {
      align: "right",
    });
  }

  y += 5;
  doc.setFontSize(7);
  setColor(doc, GREY);
  const tariff1Desc =
    "Preis pro Teilnehmer*in. Reduzierter Preis f\u00fcr Schulen, die \u00dcbernachtungsm\u00f6glichkeiten (Homestays) zur Verf\u00fcgung stellen oder sofern keine \u00dcbernachtung notwendig ist.";
  const tariff1Lines = doc.splitTextToSize(tariff1Desc, colPrice - labelX - 4);
  doc.text(tariff1Lines, labelX, y);
  y += tariff1Lines.length * 3 + 4;

  // Separator
  doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
  doc.setLineWidth(0.2);
  doc.line(tableLeft, y, tableLeft + contentWidth, y);

  // --- Tariff 2 row ---
  y += 6;
  doc.setFontSize(9);
  setColor(doc, BLACK);

  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setLineWidth(0.3);
  doc.rect(cbX, y - 2.5, checkboxSize, checkboxSize);
  if (data.tariff === 2) {
    doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.rect(cbX + 0.5, y - 2, checkboxSize - 1, checkboxSize - 1, "F");
  }

  doc.text(`${data.programType} \u2014 Tarif 2`, labelX, y);
  if (data.pricePPTariff2 !== null) {
    doc.text(`${formatMoney(data.pricePPTariff2)} EUR`, colPrice, y);
  }
  doc.text(String(data.numStudents), colQty, y);
  if (data.tariff === 2) {
    doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, {
      align: "right",
    });
  }

  y += 5;
  doc.setFontSize(7);
  setColor(doc, GREY);
  const tariff2Desc =
    "Preis pro Teilnehmer*in, inklusive \u00dcbernachtungskosten";
  doc.text(tariff2Desc, labelX, y);

  // Bottom table line
  y += 6;
  doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
  doc.setLineWidth(0.3);
  doc.line(tableLeft, y, tableLeft + contentWidth, y);

  // --- Totals ---
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);
  doc.text("Gesamtbetrag Netto", marginLeft, y);
  doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });

  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("Gesamtbetrag", marginLeft, y);
  doc.text(`${formatMoney(data.total)} EUR`, colTotal, y, { align: "right" });

  // --- Rahmenbedingungen ---
  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("Rahmenbedingungen", marginLeft, y);

  y += 7;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

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

  drawFooter(doc, pageWidth, pageHeight, marginLeft, marginRight);
  drawPageNumber(doc, currentPage, totalPages, pageWidth, pageHeight, marginRight);

  // ========================================================
  // PROGRAM PAGES: Description + Timetable for each program
  // ========================================================
  for (const pc of programPages) {
    // Program Description page
    doc.addPage();
    currentPage++;
    drawProgramDescriptionPage(
      doc,
      pc,
      data.schoolName,
      pageWidth,
      pageHeight,
      marginLeft,
      marginRight
    );
    drawPageNumber(doc, currentPage, totalPages, pageWidth, pageHeight, marginRight);

    // Timetable page (if this program has one)
    if (pc.timetable) {
      doc.addPage();
      currentPage++;
      drawTimetablePage(
        doc,
        pc.timetable,
        data.schoolName,
        pageWidth,
        pageHeight,
        marginLeft,
        marginRight
      );
      drawPageNumber(doc, currentPage, totalPages, pageWidth, pageHeight, marginRight);
    }
  }

  // Convert to Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
