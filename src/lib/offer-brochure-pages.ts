import jsPDF from "jspdf";

// Brand colors
const PINK: [number, number, number] = [233, 30, 140]; // #E91E8C
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [26, 26, 26];
const GREY: [number, number, number] = [102, 102, 102];
const LIGHT_GREY: [number, number, number] = [200, 200, 200];
const GREEN: [number, number, number] = [0, 180, 130];
const LIGHT_PINK: [number, number, number] = [252, 235, 245];

function setColor(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function drawPinkHeader(
  doc: jsPDF,
  title: string,
  pageWidth: number,
  marginLeft: number
) {
  // Full-width pink bar — 40mm tall
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Title — large bold white
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(title, marginLeft, 27);
}

function drawPageHeaderRight(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  marginRight: number
) {
  // Right-aligned school name in pink italic, just below the pink bar
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  setColor(doc, PINK);
  doc.text(`Angebot für ${schoolName}`, pageWidth - marginRight, 48, {
    align: "right",
  });
}

function drawFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number
) {
  const footerY = pageHeight - 18;
  doc.setFillColor(80, 80, 80);
  doc.rect(0, footerY - 4, pageWidth, 22, "F");

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  setColor(doc, WHITE);

  const col1 = marginLeft;
  const col2 = 75;
  const col3 = 130;
  let y = footerY + 2;

  doc.text("InterACT English gGmbH", col1, y);
  doc.text("Tel: 03020339702", col2, y);
  doc.text("Handelsregister: Amtsgericht Charlottenburg", col3, y);
  y += 3.5;
  doc.text("Planufer 92B", col1, y);
  doc.text("E-Mail: info@interactenglish.de", col2, y);
  doc.text("HR Nr.: HRB 188932 B", col3, y);
  y += 3.5;
  doc.text("10967 Berlin", col1, y);
  doc.text("Web: www.interactenglish.de", col2, y);
  doc.text("Steuernummer: 27/614/02133", col3, y);
  y += 3.5;
  doc.text("Deutschland", col1, y);
  doc.text("", col2, y);
  doc.text(
    "Geschäftsführer: Mark William Hansen & Charles Justin Beard",
    col3,
    y
  );
}

// ─── Über Uns Page ──────────────────────────────────

export function drawUeberUnsPage(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number,
  overrides?: { paragraph1?: string; paragraph2?: string; paragraph3?: string; callout?: string }
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPinkHeader(doc, "ÜBER UNS", pageWidth, marginLeft);
  drawPageHeaderRight(doc, schoolName, pageWidth, marginRight);

  // Opening paragraph — "InterACT English" bold then description
  let y = 58;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("InterACT English", marginLeft, y);

  const boldWidth = doc.getTextWidth("InterACT English ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setColor(doc, BLACK);

  const aboutText = overrides?.paragraph1 ||
    "ist eine gemeinnützige Organisation, die sich darauf spezialisiert einzigartige und kreative Lernerlebnisse in der englischen Sprache für Schüler*innen aller Altersgruppen zu schaffen. Durch den kulturellen Austausch mit internationalen Englisch Muttersprachler*innen und dem gemeinschaftlichen Erarbeiten von Projekten zu Themen, die für sie interessant sind und Spaß machen, ermöglichen wir Schüler*innen, wichtige Fähigkeiten wie Innovation, Kollaboration, Kommunikation und praktische Problemlösung in dieser Fremdsprache zu erlernen.";
  const aboutLines = doc.splitTextToSize(aboutText, contentWidth - boldWidth);
  // First line next to bold name
  doc.text(aboutLines[0], marginLeft + boldWidth, y);
  // Remaining lines full width
  if (aboutLines.length > 1) {
    const remainingLines = doc.splitTextToSize(
      aboutLines.slice(1).join(" "),
      contentWidth
    );
    doc.text(remainingLines, marginLeft, y + 6, { lineHeightFactor: 1.6 });
    y += 6 + remainingLines.length * 5.5;
  } else {
    y += 8;
  }

  // Pink accent strip — visual breaker
  y += 4;
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(marginLeft, y, 40, 2, "F");
  y += 10;

  // Second paragraph — stats
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);
  const paragraph2 = overrides?.paragraph2 ||
    "Wir sind seit 2010 im deutschen Bildungssystem etabliert und haben Partnerschaften mit rund 200 Schulen, durch die wir jährlich mit ca. 10.000 Schüler*innen zusammenarbeiten. Über 85% unserer Partnerschulen kommen jedes Jahr zu uns zurück. Unserer Meinung nach erreichen wir dieses Ziel dadurch, dass wir kontinuierlich danach bestrebt sind, für Schüler*innen ausgezeichnete Lernmöglichkeiten zu schaffen und ein professioneller und engagierter Kooperationspartner für Schulen zu sein.";
  const p2Lines = doc.splitTextToSize(paragraph2, contentWidth);
  doc.text(p2Lines, marginLeft, y, { lineHeightFactor: 1.6 });
  y += p2Lines.length * 5.5 + 6;

  // Third paragraph — creative process
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);
  const paragraph3 = overrides?.paragraph3 ||
    "Die Stärke von InterACT English liegt darin, Klassen durch einen kreativen Prozess zu leiten und Schüler*innen den Mut, die Motivation und das Selbstvertrauen zu geben, sich in der englischen Sprache auszudrücken und erste Erfolgserlebnisse zu sammeln. Die intensive Zusammenarbeit mit unserem pädagogisch erfahrenen Team aus professionellen Kunstschaffenden aus aller Welt, die diverse Kulturen und Weltanschauungen repräsentieren, vermittelt Ihren Schüler*innen gleichzeitig ein Verständnis für kulturelle Vielfalt.";
  const p3Lines = doc.splitTextToSize(paragraph3, contentWidth);
  doc.text(p3Lines, marginLeft, y, { lineHeightFactor: 1.6 });
  y += p3Lines.length * 5.5 + 8;

  // Callout box at bottom — pink bordered
  const boxY = Math.max(y, 210);
  const boxHeight = 20;
  const boxPadding = 6;

  // Pink left border (3mm wide)
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(marginLeft, boxY, 3, boxHeight, "F");

  // Light pink background
  doc.setFillColor(LIGHT_PINK[0], LIGHT_PINK[1], LIGHT_PINK[2]);
  doc.rect(marginLeft + 3, boxY, contentWidth - 3, boxHeight, "F");

  // Callout text
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, PINK);
  const calloutTitle = overrides?.callout || "Seit 2010 im deutschen Bildungssystem";
  doc.text(
    calloutTitle,
    marginLeft + 3 + boxPadding,
    boxY + 8
  );
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);
  doc.text(
    "200 Partnerschulen  •  10.000 Schüler*innen jährlich  •  85% Wiederholungsrate",
    marginLeft + 3 + boxPadding,
    boxY + 15
  );

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}

// ─── Unsere Mission + Team Page ──────────────────────

const TEAM_MEMBERS = [
  { name: "Justin Beard", role: "Founder", country: "USA" },
  { name: "Mark Hansen", role: "Founder", country: "NZ" },
  { name: "Johanna Neumann", role: "Chief Operating Officer", country: "DE" },
  { name: "Hannah Alongi", role: "Team Manager", country: "DE" },
  {
    name: "Helene Altenstein",
    role: "Project Coordinator: Camps & Class Trips",
    country: "DE",
  },
  {
    name: "Amber Hoffman",
    role: "Project Coordinator: In-School",
    country: "SA",
  },
];

export function drawMissionPage(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number,
  missionOverrides?: { text?: string },
  teamOverrides?: { members?: Array<{ name: string; role: string }> }
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPinkHeader(doc, "UNSERE MISSION", pageWidth, marginLeft);
  drawPageHeaderRight(doc, schoolName, pageWidth, marginRight);

  // Mission text as elegant pull-quote style
  let y = 60;

  // Pink left border line for the pull quote
  const missionText = missionOverrides?.text ||
    "Die Leidenschaft unseres Teams ist es, Englischunterricht mit kreativen, künstlerischen Projekten an Schulen in ganz Deutschland zu bereichern und nachhaltig zu etablieren. Dafür bringen wir Muttersprachler*innen sowie ganze Sprachwelten, internationale Perspektiven und vielfältige Kulturen direkt an Ihre Schule. Mit diesem Ansatz ermöglichen wir Schüler*innen einzigartige Erlebnisse, die sie nicht nur sprachlich, sondern auch in ihren sozialen Kompetenzen stärken – Fähigkeiten, die in unserer globalen und vernetzten Welt unverzichtbar sind.";

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);
  const missionLines = doc.splitTextToSize(missionText, contentWidth - 12);
  const missionHeight = missionLines.length * 6;

  // Pink left border (3px = ~1mm)
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(marginLeft, y - 4, 1, missionHeight + 4, "F");

  // Indented mission text
  doc.text(missionLines, marginLeft + 8, y, { lineHeightFactor: 1.5 });
  y += missionHeight + 16;

  // Section header: THE INTERACT TEAM
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("THE INTERACT TEAM", marginLeft, y);

  // Pink underline decoration
  const headerWidth = doc.getTextWidth("THE INTERACT TEAM");
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(marginLeft, y + 2, headerWidth, 0.8, "F");
  y += 14;

  // Team table — 3 columns, 2 rows, clean layout
  const teamMembers = teamOverrides?.members || TEAM_MEMBERS;
  const colWidth = contentWidth / 3;
  const rowHeight = 28;

  for (let i = 0; i < teamMembers.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = marginLeft + col * colWidth;
    const memberY = y + row * rowHeight;

    // Name — bold 10pt
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, BLACK);
    doc.text(teamMembers[i].name, x + 2, memberY + 4);

    // Role — grey italic 8pt
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    setColor(doc, GREY);
    const roleLines = doc.splitTextToSize(
      teamMembers[i].role,
      colWidth - 6
    );
    doc.text(roleLines, x + 2, memberY + 10);

    // Country tag — pink 8pt (only available on default data)
    const member = TEAM_MEMBERS.find(m => m.name === teamMembers[i].name);
    if (member?.country) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(doc, PINK);
      doc.text(member.country, x + 2, memberY + 10 + roleLines.length * 3.5 + 2);
    }

    // Grey separator line between rows (under first row only)
    if (row === 0 && i < 3) {
      doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, y + rowHeight - 2, marginLeft + contentWidth, y + rowHeight - 2);
    }
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}

// ─── Native Speaker Page ──────────────────────────────

const COUNTRY_DATA = [
  { name: "USA", count: "25+" },
  { name: "Großbritannien", count: "15+" },
  { name: "Kanada", count: "8+" },
  { name: "Australien", count: "6+" },
  { name: "Südafrika", count: "5+" },
  { name: "Irland", count: "5+" },
  { name: "Neuseeland", count: "4+" },
  { name: "Nigeria", count: "3+" },
  { name: "Botswana", count: "2+" },
  { name: "Iran", count: "2+" },
];

const TEACHING_ARTISTS = [
  "Madison", "Yoyo", "Veronica", "Ann Francis", "Thulani", "Marnie",
  "Manny", "Daphne", "Bill", "George", "Daisy", "Sarah",
  "Carl", "Paule", "Alma", "Lawrence",
];

export function drawNativeSpeakerPage(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number,
  overrides?: { intro?: string; countries?: Array<{ name: string; count: number }>; teaching_artists?: string[] }
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPinkHeader(doc, "NATIVE SPEAKER", pageWidth, marginLeft);
  drawPageHeaderRight(doc, schoolName, pageWidth, marginRight);

  // Intro text
  let y = 56;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

  const introText = overrides?.intro ||
    "Unser Team aus über 80 Muttersprachler*innen kommt hauptsächlich aus Großbritannien, Irland, den USA, Kanada, Australien, Südafrika und Neuseeland. Alle unsere Teaching Artists sind pädagogisch geschult und bringen ihre einzigartigen kulturellen Perspektiven in den Unterricht ein.";
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, marginLeft, y, { lineHeightFactor: 1.5 });
  y += introLines.length * 5.5 + 10;

  // Large pink rounded rectangle — country showcase
  const boxX = marginLeft;
  const boxWidth = contentWidth;
  const boxHeight = 100;

  // Pink background
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 4, 4, "F");

  // White header inside box
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("Unser internationales Team", boxX + 12, y + 14);

  // Thin white separator line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(boxX + 12, y + 18, boxX + boxWidth - 12, y + 18);

  // Country list — 3 columns inside the pink box
  const countryStartY = y + 26;
  const countryColWidth = (boxWidth - 24) / 3;

  const countries = overrides?.countries
    ? overrides.countries.map(c => ({ name: c.name, count: String(c.count) }))
    : COUNTRY_DATA;

  for (let i = 0; i < countries.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = boxX + 12 + col * countryColWidth;
    const cy = countryStartY + row * 14;

    // White dot
    doc.setFillColor(255, 255, 255);
    doc.circle(cx + 3, cy - 1.5, 2, "F");

    // Country name in white
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(countries[i].name, cx + 8, cy);

    // TA count
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${countries[i].count} TAs`, cx + 8, cy + 5);
  }

  y += boxHeight + 12;

  // TA names in a flowing 4-column text layout
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("Einige unserer Teaching Artists:", marginLeft, y);
  y += 7;

  const taColWidth = contentWidth / 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);

  const teachingArtists = overrides?.teaching_artists || TEACHING_ARTISTS;

  for (let i = 0; i < teachingArtists.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const tx = marginLeft + col * taColWidth;
    const ty = y + row * 5;

    // Pink bullet
    doc.setFillColor(PINK[0], PINK[1], PINK[2]);
    doc.circle(tx + 1.5, ty - 1, 0.8, "F");

    setColor(doc, BLACK);
    doc.text(teachingArtists[i], tx + 4, ty);
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}

// ─── Preisliste (Price List) Page ─────────────────────

const TEAL: [number, number, number] = [0, 188, 212]; // #00BCD4
const TABLE_BORDER: [number, number, number] = [200, 200, 200];

interface WorkshopRow {
  program: string;
  grade: string;
  students: string;
  speakers: string;
  d3t1: string;
  d3t2: string;
  d2t1: string;
  d2t2: string;
  d1t1: string;
  d1t2: string;
}

interface ProjektRow {
  program: string;
  grade: string;
  students: string;
  speakers: string;
  tarif1: string;
  tarif2: string;
}

const WORKSHOP_ROWS: WorkshopRow[] = [
  { program: "Monster Parade", grade: "Klasse 1-2", students: "20-32", speakers: "2", d3t1: "79\u20AC", d3t2: "89\u20AC", d2t1: "59\u20AC", d2t2: "69\u20AC", d1t1: "-", d1t2: "-" },
  { program: "Kids Space Adventure", grade: "Klasse 3-4", students: "20-32", speakers: "2", d3t1: "79\u20AC", d3t2: "89\u20AC", d2t1: "59\u20AC", d2t2: "69\u20AC", d1t1: "-", d1t2: "-" },
  { program: "Kulturtag (Berlin/Brandenburg)", grade: "Klasse 1-13", students: "18-32", speakers: "1", d3t1: "-", d3t2: "-", d2t1: "-", d2t2: "-", d1t1: "ab 16.50\u20AC", d1t2: "auf Anfrage" },
  { program: "Shakespeare Workshop", grade: "Klasse 9-13", students: "14-24", speakers: "1", d3t1: "99\u20AC", d3t2: "109\u20AC", d2t1: "auf Anfrage", d2t2: "", d1t1: "auf Anfrage", d1t2: "" },
  { program: "Debating Skills Workshop", grade: "Klasse 9-13", students: "14-24", speakers: "1", d3t1: "99\u20AC", d3t2: "109\u20AC", d2t1: "auf Anfrage", d2t2: "", d1t1: "auf Anfrage", d1t2: "" },
  { program: "Job Prep Workshop", grade: "Klasse 9-13", students: "10-13", speakers: "1", d3t1: "99\u20AC", d3t2: "109\u20AC", d2t1: "auf Anfrage", d2t2: "", d1t1: "auf Anfrage", d1t2: "" },
  { program: "Test Prep Workshop", grade: "Klasse 9-13", students: "10-13", speakers: "1", d3t1: "99\u20AC", d3t2: "109\u20AC", d2t1: "auf Anfrage", d2t2: "", d1t1: "auf Anfrage", d1t2: "" },
];

const PROJEKT_ROWS: ProjektRow[] = [
  { program: "Native Speaker Week", grade: "Klasse 5-9", students: "14-19", speakers: "1", tarif1: "129\u20AC", tarif2: "139\u20AC" },
  { program: "Art in Action Week", grade: "Klasse 10-13", students: "20-24+", speakers: "1", tarif1: "129\u20AC", tarif2: "139\u20AC" },
  { program: "Media Week", grade: "Klasse 5-13", students: "10-13", speakers: "1", tarif1: "139\u20AC", tarif2: "149\u20AC" },
  { program: "Theatre Week", grade: "Klasse 8-13", students: "24-32", speakers: "2", tarif1: "129\u20AC", tarif2: "139\u20AC" },
  { program: "Film Week", grade: "Klasse 8-13", students: "20-32", speakers: "2", tarif1: "139\u20AC", tarif2: "149\u20AC" },
  { program: "Class Trip", grade: "Klasse 5-13", students: "24-32", speakers: "2", tarif1: "129\u20AC", tarif2: "139\u20AC" },
];

function drawTableLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number) {
  doc.setDrawColor(TABLE_BORDER[0], TABLE_BORDER[1], TABLE_BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(x1, y1, x2, y2);
}

export function drawPreislistePage(
  doc: jsPDF,
  _schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Title — no pink bar, data-sheet style
  let y = 18;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("INTERACT ENGLISH \u2014 PREISLISTE SCHULJAHR 2026/2027", pageWidth / 2, y, { align: "center" });

  // ═══════ TABLE 1: WORKSHOPS ═══════
  y += 10;

  // Table header bar
  const tableX = marginLeft;
  const tableW = contentWidth;

  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.rect(tableX, y, tableW, 6, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("WORKSHOPS", tableX + 2, y + 4.2);
  y += 6;

  // Column widths for workshops table
  const wCols = {
    program: 32,
    grade: 18,
    students: 20,
    speakers: 18,
    // 3 TAGE, 2 TAGE, 1 TAG each with T1+T2 sub-columns
    dayGroup: 0, // calculated
  };
  const fixedW = wCols.program + wCols.grade + wCols.students + wCols.speakers;
  const dayGroupW = (tableW - fixedW) / 3;
  wCols.dayGroup = dayGroupW;
  const subColW = dayGroupW / 2;

  // Column header row
  const hdrH = 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(tableX, y, tableW, hdrH, "F");

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, [80, 80, 80]);

  let cx = tableX;
  doc.text("PROGRAMM", cx + 1, y + 4);
  drawTableLine(doc, cx + wCols.program, y, cx + wCols.program, y + hdrH);
  cx += wCols.program;

  doc.text("KLASSEN-", cx + 1, y + 3);
  doc.text("STUFE", cx + 1, y + 6.5);
  drawTableLine(doc, cx + wCols.grade, y, cx + wCols.grade, y + hdrH);
  cx += wCols.grade;

  doc.text("SCH\u00dcLER*INNEN", cx + 1, y + 3);
  doc.text("PRO GRUPPE", cx + 1, y + 6.5);
  drawTableLine(doc, cx + wCols.students, y, cx + wCols.students, y + hdrH);
  cx += wCols.students;

  doc.text("NATIVE SPEAKER", cx + 1, y + 3);
  doc.text("PRO GRUPPE", cx + 1, y + 6.5);
  drawTableLine(doc, cx + wCols.speakers, y, cx + wCols.speakers, y + hdrH);
  cx += wCols.speakers;

  // Day group headers with sub-headers
  const dayLabels = ["3 TAGE", "2 TAGE", "1 TAG"];
  for (const label of dayLabels) {
    // Main day label centered
    doc.text(label, cx + dayGroupW / 2, y + 3, { align: "center" });
    // Sub-headers
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text("Tarif 1", cx + subColW / 2, y + 7, { align: "center" });
    doc.text("Tarif 2", cx + subColW + subColW / 2, y + 7, { align: "center" });
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    // Vertical separator between day groups
    if (label !== "1 TAG") {
      drawTableLine(doc, cx + dayGroupW, y, cx + dayGroupW, y + hdrH);
    }
    // Sub-column separator
    drawTableLine(doc, cx + subColW, y + 4, cx + subColW, y + hdrH);
    cx += dayGroupW;
  }

  // Bottom line of header
  drawTableLine(doc, tableX, y + hdrH, tableX + tableW, y + hdrH);
  y += hdrH;

  // Workshop data rows
  const rowH = 7;
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

  for (let r = 0; r < WORKSHOP_ROWS.length; r++) {
    const row = WORKSHOP_ROWS[r];
    if (r % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX, y, tableW, rowH, "F");
    }

    let rx = tableX;
    const textY = y + 4.5;

    doc.setFont("helvetica", "normal");
    setColor(doc, BLACK);
    doc.text(row.program, rx + 1, textY);
    drawTableLine(doc, rx + wCols.program, y, rx + wCols.program, y + rowH);
    rx += wCols.program;

    doc.text(row.grade, rx + 1, textY);
    drawTableLine(doc, rx + wCols.grade, y, rx + wCols.grade, y + rowH);
    rx += wCols.grade;

    doc.text(row.students, rx + 1, textY);
    drawTableLine(doc, rx + wCols.students, y, rx + wCols.students, y + rowH);
    rx += wCols.students;

    doc.text(row.speakers, rx + 1, textY);
    drawTableLine(doc, rx + wCols.speakers, y, rx + wCols.speakers, y + rowH);
    rx += wCols.speakers;

    // 3 TAGE
    doc.text(row.d3t1, rx + subColW / 2, textY, { align: "center" });
    drawTableLine(doc, rx + subColW, y, rx + subColW, y + rowH);
    doc.text(row.d3t2, rx + subColW + subColW / 2, textY, { align: "center" });
    drawTableLine(doc, rx + dayGroupW, y, rx + dayGroupW, y + rowH);
    rx += dayGroupW;

    // 2 TAGE
    doc.text(row.d2t1, rx + subColW / 2, textY, { align: "center" });
    drawTableLine(doc, rx + subColW, y, rx + subColW, y + rowH);
    doc.text(row.d2t2, rx + subColW + subColW / 2, textY, { align: "center" });
    drawTableLine(doc, rx + dayGroupW, y, rx + dayGroupW, y + rowH);
    rx += dayGroupW;

    // 1 TAG
    doc.text(row.d1t1, rx + subColW / 2, textY, { align: "center" });
    drawTableLine(doc, rx + subColW, y, rx + subColW, y + rowH);
    doc.text(row.d1t2, rx + subColW + subColW / 2, textY, { align: "center" });
    rx += dayGroupW;

    // Row bottom border
    drawTableLine(doc, tableX, y + rowH, tableX + tableW, y + rowH);
    y += rowH;
  }

  // ═══════ TABLE 2: PROJEKTWOCHE ═══════
  y += 8;

  // Header bar with badge
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.rect(tableX, y, tableW, 6, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("PROJEKTWOCHE", tableX + 2, y + 4.2);

  // "5 TAGE" badge
  const badgeText = "5 TAGE";
  const badgeW = doc.getTextWidth(badgeText) + 6;
  const badgeX = tableX + tableW - badgeW - 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(badgeX, y + 1, badgeW, 4, 1, 1, "F");
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, TEAL);
  doc.text(badgeText, badgeX + badgeW / 2, y + 3.8, { align: "center" });
  y += 6;

  // Column widths for Projektwoche table
  const pCols = {
    program: 32,
    grade: 18,
    students: 20,
    speakers: 18,
    tarif1: 0,
    tarif2: 0,
  };
  const pFixedW = pCols.program + pCols.grade + pCols.students + pCols.speakers;
  const pRemain = tableW - pFixedW;
  pCols.tarif1 = pRemain / 2;
  pCols.tarif2 = pRemain / 2;

  // Column header row
  const pHdrH = 7;
  doc.setFillColor(240, 240, 240);
  doc.rect(tableX, y, tableW, pHdrH, "F");

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, [80, 80, 80]);

  let px = tableX;
  doc.text("PROGRAMM", px + 1, y + 4.5);
  drawTableLine(doc, px + pCols.program, y, px + pCols.program, y + pHdrH);
  px += pCols.program;

  doc.text("KLASSENSTUFE", px + 1, y + 4.5);
  drawTableLine(doc, px + pCols.grade, y, px + pCols.grade, y + pHdrH);
  px += pCols.grade;

  doc.text("SCH\u00dcLER*INNEN", px + 1, y + 3);
  doc.text("PRO GRUPPE", px + 1, y + 6);
  drawTableLine(doc, px + pCols.students, y, px + pCols.students, y + pHdrH);
  px += pCols.students;

  doc.text("NATIVE SPEAKER", px + 1, y + 3);
  doc.text("PRO GRUPPE", px + 1, y + 6);
  drawTableLine(doc, px + pCols.speakers, y, px + pCols.speakers, y + pHdrH);
  px += pCols.speakers;

  doc.text("TARIF 1", px + pCols.tarif1 / 2, y + 4.5, { align: "center" });
  drawTableLine(doc, px + pCols.tarif1, y, px + pCols.tarif1, y + pHdrH);
  px += pCols.tarif1;

  doc.text("TARIF 2", px + pCols.tarif2 / 2, y + 4.5, { align: "center" });

  drawTableLine(doc, tableX, y + pHdrH, tableX + tableW, y + pHdrH);
  y += pHdrH;

  // Projektwoche data rows
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

  // We want the legend to sit to the right of this table
  const projektTableTopY = y;

  // Use narrower table for Projektwoche (leave room for legend)
  const pTableW = tableW * 0.62;

  for (let r = 0; r < PROJEKT_ROWS.length; r++) {
    const row = PROJEKT_ROWS[r];
    if (r % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(tableX, y, pTableW, rowH, "F");
    }

    let rx = tableX;
    const textY = y + 4.5;

    // Recalculate column widths for narrower table
    const pNarrowCols = {
      program: 28,
      grade: 16,
      students: 16,
      speakers: 14,
      tarif1: 0,
      tarif2: 0,
    };
    const pNarrowFixed = pNarrowCols.program + pNarrowCols.grade + pNarrowCols.students + pNarrowCols.speakers;
    const pNarrowRemain = pTableW - pNarrowFixed;
    pNarrowCols.tarif1 = pNarrowRemain / 2;
    pNarrowCols.tarif2 = pNarrowRemain / 2;

    doc.setFont("helvetica", "normal");
    setColor(doc, BLACK);
    doc.text(row.program, rx + 1, textY);
    drawTableLine(doc, rx + pNarrowCols.program, y, rx + pNarrowCols.program, y + rowH);
    rx += pNarrowCols.program;

    doc.text(row.grade, rx + 1, textY);
    drawTableLine(doc, rx + pNarrowCols.grade, y, rx + pNarrowCols.grade, y + rowH);
    rx += pNarrowCols.grade;

    doc.text(row.students, rx + 1, textY);
    drawTableLine(doc, rx + pNarrowCols.students, y, rx + pNarrowCols.students, y + rowH);
    rx += pNarrowCols.students;

    doc.text(row.speakers, rx + 1, textY);
    drawTableLine(doc, rx + pNarrowCols.speakers, y, rx + pNarrowCols.speakers, y + rowH);
    rx += pNarrowCols.speakers;

    doc.text(row.tarif1, rx + pNarrowCols.tarif1 / 2, textY, { align: "center" });
    drawTableLine(doc, rx + pNarrowCols.tarif1, y, rx + pNarrowCols.tarif1, y + rowH);
    rx += pNarrowCols.tarif1;

    doc.text(row.tarif2, rx + pNarrowCols.tarif2 / 2, textY, { align: "center" });

    drawTableLine(doc, tableX, y + rowH, tableX + pTableW, y + rowH);
    y += rowH;
  }

  // ═══════ LEGEND BOX (right side, next to Table 2) ═══════
  const legendX = tableX + pTableW + 4;
  const legendW = tableW - pTableW - 4;
  const legendY = projektTableTopY;

  // Light background box
  doc.setFillColor(245, 248, 250);
  doc.roundedRect(legendX, legendY, legendW, PROJEKT_ROWS.length * rowH, 2, 2, "F");
  doc.setDrawColor(TABLE_BORDER[0], TABLE_BORDER[1], TABLE_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(legendX, legendY, legendW, PROJEKT_ROWS.length * rowH, 2, 2, "S");

  let ly = legendY + 5;
  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  setColor(doc, GREY);
  const noteLines = doc.splitTextToSize("Preise p. P. Reisekosten des InterACT-Teams inklusive.", legendW - 4);
  doc.text(noteLines, legendX + 2, ly);
  ly += noteLines.length * 3 + 4;

  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.setFontSize(5.5);
  doc.text("TARIF 1:", legendX + 2, ly);
  ly += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  setColor(doc, GREY);
  const t1Lines = doc.splitTextToSize("Schule stellt Gastfamilien (Homestays) f\u00fcr InterACT Team bzw. es ist keine \u00dcbernachtung notwendig.", legendW - 4);
  doc.text(t1Lines, legendX + 2, ly);
  ly += t1Lines.length * 3 + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  setColor(doc, BLACK);
  doc.text("TARIF 2:", legendX + 2, ly);
  ly += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  setColor(doc, GREY);
  const t2Lines = doc.splitTextToSize("\u00dcbernachtungskosten werden von InterACT getragen (Hotels).", legendW - 4);
  doc.text(t2Lines, legendX + 2, ly);

  // ═══════ FOOTER ═══════
  const footerY = pageHeight - 12;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);
  doc.text(
    "InterACT English | Planufer 92B | 10967 Berlin | 030 2033 9702 | info@interactenglish.de",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
}

// ─── Einfluss (Impact) Page ──────────────────────────

export function drawEinflussPage(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number,
  overrides?: { testimonials?: Array<{ quote: string; author: string }>; stats?: Array<{ value: string; label: string }> }
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPinkHeader(doc, "EINFLUSS", pageWidth, marginLeft);
  drawPageHeaderRight(doc, schoolName, pageWidth, marginRight);

  let y = 58;

  const defaultTestimonials = [
    {
      quote: "Our Zusammenarbeit with InterACT was fantastic again! I loved working with the Teaching-Artists! Great inspiration for me that goes beyond three days... Wonderful results, happy kids and teachers... so soll es immer sein!",
      author: "Frau Lellow, Englischlehrerin, Elbeschule, Berlin",
    },
    {
      quote: "Nicht nur haben die Schüler gemeinsam eine Menge erreicht und tolle Produkte und Präsentationen kreiert. Sie haben eine Woche lang sehr viel Englisch gesprochen und sich dabei in Wortschatz und flüssigem Sprechen enorm verbessert. Das Projekt, das die Fachschaft Englisch bei einem Wettbewerb gewonnen hat, darf also als großer Erfolg bezeichnet werden.",
      author: "Johannes S. StR, Fachbetreuer Englisch\nAlexander von Humboldt Schweinfurt",
    },
  ];

  const testimonials = overrides?.testimonials || defaultTestimonials;

  for (let t = 0; t < testimonials.length; t++) {
    if (t > 0) {
      // Grey separator between testimonials
      doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, y, marginLeft + contentWidth, y);
      y += 10;
    }

    // Large pink opening quote mark
    doc.setFontSize(48);
    doc.setFont("helvetica", "bold");
    setColor(doc, PINK);
    doc.text("\u201C", marginLeft, y + 4);

    // Quote text — italic, indented
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    setColor(doc, BLACK);
    const qLines = doc.splitTextToSize(testimonials[t].quote, contentWidth - 20);
    doc.text(qLines, marginLeft + 14, y, { lineHeightFactor: 1.5 });
    y += qLines.length * 5.5 + 4;

    // Attribution with thin pink line above
    doc.setFillColor(PINK[0], PINK[1], PINK[2]);
    doc.rect(marginLeft + 14, y, 30, 0.5, "F");
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, GREY);
    const authorLines = testimonials[t].author.split("\n");
    for (let a = 0; a < authorLines.length; a++) {
      doc.text(authorLines[a], marginLeft + 14, y + a * 4);
    }
    y += authorLines.length * 4 + 8;
  }

  // INTERACT IN ZAHLEN section header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("INTERACT IN ZAHLEN", marginLeft, y);

  // Pink underline
  const zahlenWidth = doc.getTextWidth("INTERACT IN ZAHLEN");
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(marginLeft, y + 2, zahlenWidth, 0.8, "F");
  y += 14;

  // 2x2 stat grid with bordered boxes
  const halfW = (contentWidth - 8) / 2;
  const boxHeight = 36;

  const defaultStats = [
    {
      value: "15.000",
      label: "Schüler*innen, welche in 2024\ndurch Programme mit InterACT\nEnglish erreicht wurden",
    },
    {
      value: "200",
      label: "Schulkooperationen\nin Deutschland",
    },
    {
      value: "1.000",
      label: "Lehrer*innen, welche in 2024\ndurch Berufliche Weiterbildung\nmit InterACT English erreicht wurden",
    },
    {
      value: "85%",
      label: "der Schulen wiederholen\nProgramme mit InterACT English\njedes Jahr",
    },
  ];

  const stats = overrides?.stats || defaultStats;
  const statColors = [GREEN, PINK, GREEN, PINK];

  for (let i = 0; i < stats.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = marginLeft + col * (halfW + 8);
    const by = y + row * (boxHeight + 8);

    // Rounded rectangle border
    doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, by, halfW, boxHeight, 3, 3, "S");

    // Big number
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    setColor(doc, statColors[i % statColors.length]);
    doc.text(stats[i].value, bx + 8, by + 16);

    // Description
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, GREY);
    doc.text(stats[i].label, bx + 8, by + 23);
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}
