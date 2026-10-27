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
  marginRight: number
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

  const aboutText =
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
  const paragraph2 =
    "Wir sind seit 2010 im deutschen Bildungssystem etabliert und haben Partnerschaften mit rund 200 Schulen, durch die wir jährlich mit ca. 10.000 Schüler*innen zusammenarbeiten. Über 85% unserer Partnerschulen kommen jedes Jahr zu uns zurück. Unserer Meinung nach erreichen wir dieses Ziel dadurch, dass wir kontinuierlich danach bestrebt sind, für Schüler*innen ausgezeichnete Lernmöglichkeiten zu schaffen und ein professioneller und engagierter Kooperationspartner für Schulen zu sein.";
  const p2Lines = doc.splitTextToSize(paragraph2, contentWidth);
  doc.text(p2Lines, marginLeft, y, { lineHeightFactor: 1.6 });
  y += p2Lines.length * 5.5 + 6;

  // Third paragraph — creative process
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);
  const paragraph3 =
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
  doc.text(
    "Seit 2010 im deutschen Bildungssystem",
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
  marginRight: number
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPinkHeader(doc, "UNSERE MISSION", pageWidth, marginLeft);
  drawPageHeaderRight(doc, schoolName, pageWidth, marginRight);

  // Mission text as elegant pull-quote style
  let y = 60;

  // Pink left border line for the pull quote
  const missionText =
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
  const colWidth = contentWidth / 3;
  const rowHeight = 28;

  for (let i = 0; i < TEAM_MEMBERS.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = marginLeft + col * colWidth;
    const memberY = y + row * rowHeight;

    // Name — bold 10pt
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, BLACK);
    doc.text(TEAM_MEMBERS[i].name, x + 2, memberY + 4);

    // Role — grey italic 8pt
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    setColor(doc, GREY);
    const roleLines = doc.splitTextToSize(
      TEAM_MEMBERS[i].role,
      colWidth - 6
    );
    doc.text(roleLines, x + 2, memberY + 10);

    // Country tag — pink 8pt
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(doc, PINK);
    doc.text(TEAM_MEMBERS[i].country, x + 2, memberY + 10 + roleLines.length * 3.5 + 2);

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
  marginRight: number
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPinkHeader(doc, "NATIVE SPEAKER", pageWidth, marginLeft);
  drawPageHeaderRight(doc, schoolName, pageWidth, marginRight);

  // Intro text
  let y = 56;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

  const introText =
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

  for (let i = 0; i < COUNTRY_DATA.length; i++) {
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
    doc.text(COUNTRY_DATA[i].name, cx + 8, cy);

    // TA count
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${COUNTRY_DATA[i].count} TAs`, cx + 8, cy + 5);
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

  for (let i = 0; i < TEACHING_ARTISTS.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const tx = marginLeft + col * taColWidth;
    const ty = y + row * 5;

    // Pink bullet
    doc.setFillColor(PINK[0], PINK[1], PINK[2]);
    doc.circle(tx + 1.5, ty - 1, 0.8, "F");

    setColor(doc, BLACK);
    doc.text(TEACHING_ARTISTS[i], tx + 4, ty);
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}

// ─── Einfluss (Impact) Page ──────────────────────────

export function drawEinflussPage(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  pageHeight: number,
  marginLeft: number,
  marginRight: number
) {
  const contentWidth = pageWidth - marginLeft - marginRight;

  drawPinkHeader(doc, "EINFLUSS", pageWidth, marginLeft);
  drawPageHeaderRight(doc, schoolName, pageWidth, marginRight);

  let y = 58;

  // Testimonial 1
  // Large pink opening quote mark
  doc.setFontSize(48);
  doc.setFont("helvetica", "bold");
  setColor(doc, PINK);
  doc.text("\u201C", marginLeft, y + 4);

  // Quote text — italic, indented
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  setColor(doc, BLACK);
  const quote1 =
    "Our Zusammenarbeit with InterACT was fantastic again! I loved working with the Teaching-Artists! Great inspiration for me that goes beyond three days... Wonderful results, happy kids and teachers... so soll es immer sein!";
  const q1Lines = doc.splitTextToSize(quote1, contentWidth - 20);
  doc.text(q1Lines, marginLeft + 14, y, { lineHeightFactor: 1.5 });
  y += q1Lines.length * 5.5 + 4;

  // Attribution with thin pink line above
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(marginLeft + 14, y, 30, 0.5, "F");
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);
  doc.text(
    "Frau Lellow, Englischlehrerin, Elbeschule, Berlin",
    marginLeft + 14,
    y
  );
  y += 12;

  // Grey separator
  doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, marginLeft + contentWidth, y);
  y += 10;

  // Testimonial 2
  doc.setFontSize(48);
  doc.setFont("helvetica", "bold");
  setColor(doc, PINK);
  doc.text("\u201C", marginLeft, y + 4);

  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  setColor(doc, BLACK);
  const quote2 =
    "Nicht nur haben die Schüler gemeinsam eine Menge erreicht und tolle Produkte und Präsentationen kreiert. Sie haben eine Woche lang sehr viel Englisch gesprochen und sich dabei in Wortschatz und flüssigem Sprechen enorm verbessert. Das Projekt, das die Fachschaft Englisch bei einem Wettbewerb gewonnen hat, darf also als großer Erfolg bezeichnet werden.";
  const q2Lines = doc.splitTextToSize(quote2, contentWidth - 20);
  doc.text(q2Lines, marginLeft + 14, y, { lineHeightFactor: 1.5 });
  y += q2Lines.length * 5.5 + 4;

  // Attribution 2
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(marginLeft + 14, y, 30, 0.5, "F");
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);
  doc.text("Johannes S. StR, Fachbetreuer Englisch", marginLeft + 14, y);
  doc.text(
    "Alexander von Humboldt Schweinfurt",
    marginLeft + 14,
    y + 4
  );
  y += 16;

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

  const stats = [
    {
      value: "15.000",
      label: "Schüler*innen, welche in 2024\ndurch Programme mit InterACT\nEnglish erreicht wurden",
      color: GREEN,
    },
    {
      value: "200",
      label: "Schulkooperationen\nin Deutschland",
      color: PINK,
    },
    {
      value: "1.000",
      label: "Lehrer*innen, welche in 2024\ndurch Berufliche Weiterbildung\nmit InterACT English erreicht wurden",
      color: GREEN,
    },
    {
      value: "85%",
      label: "der Schulen wiederholen\nProgramme mit InterACT English\njedes Jahr",
      color: PINK,
    },
  ];

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
    setColor(doc, stats[i].color);
    doc.text(stats[i].value, bx + 8, by + 16);

    // Description
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, GREY);
    doc.text(stats[i].label, bx + 8, by + 23);
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}
