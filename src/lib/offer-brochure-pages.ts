import jsPDF from "jspdf";

// Brand colors
const PINK: [number, number, number] = [233, 30, 140]; // #E91E8C
const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [26, 26, 26];
const GREY: [number, number, number] = [102, 102, 102];
const LIGHT_GREY: [number, number, number] = [200, 200, 200];
const GREEN: [number, number, number] = [0, 180, 130];

function setColor(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function drawPinkHeader(
  doc: jsPDF,
  title: string,
  pageWidth: number,
  marginLeft: number
) {
  // Pink bar
  doc.setFillColor(PINK[0], PINK[1], PINK[2]);
  doc.rect(0, 0, pageWidth, 30, "F");

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(title, marginLeft, 21);
}

function drawPageHeaderRight(
  doc: jsPDF,
  schoolName: string,
  pageWidth: number,
  marginRight: number
) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(doc, PINK);
  doc.text(`Angebot für ${schoolName}`, pageWidth - marginRight, 10, {
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
  doc.setFillColor(100, 100, 100);
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

  let y = 45;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLACK);
  doc.text("InterACT English", marginLeft, y);

  doc.setFont("helvetica", "normal");
  const aboutText =
    "ist eine gemeinnützige Organisation, die sich darauf spezialisiert einzigartige und kreative Lernerlebnisse in der englischen Sprache für Schüler*innen aller Altersgruppen zu schaffen. Durch den kulturellen Austausch mit internationalen Englisch Muttersprachler*innen und dem gemeinschaftlichen Erarbeiten von Projekten zu Themen, die für sie interessant sind und Spaß machen, ermöglichen wir Schüler*innen, wichtige Fähigkeiten wie Innovation, Kollaboration, Kommunikation und praktische Problemlösung in dieser Fremdsprache zu erlernen.";
  doc.text(aboutText, marginLeft + 30, y, {
    maxWidth: contentWidth - 30,
  });

  y = 80;
  const paragraph2 =
    "Wir sind seit 2010 im deutschen Bildungssystem etabliert und haben Partnerschaften mit rund 200 Schulen, durch die wir jährlich mit ca. 10.000 Schüler*innen zusammenarbeiten. Über 85% unserer Partnerschulen kommen jedes Jahr zu uns zurück. Unserer Meinung nach erreichen wir dieses Ziel dadurch, dass wir kontinuierlich danach bestrebt sind, für Schüler*innen ausgezeichnete Lernmöglichkeiten zu schaffen und ein professioneller und engagierter Kooperationspartner für Schulen zu sein.";
  doc.text(paragraph2, marginLeft, y, { maxWidth: contentWidth });

  y = 120;
  const paragraph3 =
    "Die Stärke von InterACT English liegt darin, Klassen durch einen kreativen Prozess zu leiten und Schüler*innen den Mut, die Motivation und das Selbstvertrauen zu geben, sich in der englischen Sprache auszudrücken und erste Erfolgserlebnisse zu sammeln. Die intensive Zusammenarbeit mit unserem pädagogisch erfahrenen Team aus professionellen Kunstschaffenden aus aller Welt, die diverse Kulturen und Weltanschauungen repräsentieren, vermittelt Ihren Schüler*innen gleichzeitig ein Verständnis für kulturelle Vielfalt.";
  doc.text(paragraph3, marginLeft, y, { maxWidth: contentWidth });

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}

// ─── Unsere Mission + Team Page ──────────────────────

const TEAM_MEMBERS = [
  { name: "Justin Beard (USA)", role: "Founder" },
  { name: "Mark Hansen (NZ)", role: "Founder" },
  { name: "Johanna Neumann (DE)", role: "Chief Operating Officer" },
  { name: "Hannah Alongi", role: "Team Manager" },
  { name: "Helene Altenstein (DE)", role: "Project Coordinator: Camps & Class Trips" },
  { name: "Amber Hoffman (SA)", role: "Project Coordinator: In-School" },
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

  let y = 45;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

  const missionText =
    "Die Leidenschaft unseres Teams ist es, Englischunterricht mit kreativen, künstlerischen Projekten an Schulen in ganz Deutschland zu bereichern und nachhaltig zu etablieren. Dafür bringen wir Muttersprachler*innen sowie ganze Sprachwelten, internationale Perspektiven und vielfältige Kulturen direkt an Ihre Schule. Mit diesem Ansatz ermöglichen wir Schüler*innen einzigartige Erlebnisse, die sie nicht nur sprachlich, sondern auch in ihren sozialen Kompetenzen stärken – Fähigkeiten, die in unserer globalen und vernetzten Welt unverzichtbar sind.";
  doc.text(missionText, marginLeft, y, { maxWidth: contentWidth });

  // Team section
  y = 100;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(doc, PINK);
  doc.text("THE INTERACT TEAM", marginLeft, y);

  y = 112;
  doc.setDrawColor(LIGHT_GREY[0], LIGHT_GREY[1], LIGHT_GREY[2]);

  // Draw team grid (3 columns × 2 rows)
  const colWidth = contentWidth / 3;
  for (let i = 0; i < TEAM_MEMBERS.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = marginLeft + col * colWidth;
    const memberY = y + row * 50;

    // Avatar circle placeholder
    doc.setFillColor(230, 230, 230);
    doc.circle(x + colWidth / 2, memberY + 12, 15, "F");

    // Initials in circle
    const initials = TEAM_MEMBERS[i].name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(doc, GREY);
    doc.text(initials, x + colWidth / 2, memberY + 15, { align: "center" });

    // Name
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(doc, BLACK);
    doc.text(TEAM_MEMBERS[i].name, x + colWidth / 2, memberY + 32, {
      align: "center",
    });

    // Role
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, GREY);
    doc.text(TEAM_MEMBERS[i].role, x + colWidth / 2, memberY + 37, {
      align: "center",
      maxWidth: colWidth - 5,
    });
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}

// ─── Native Speaker Page ──────────────────────────────

const TEACHING_ARTISTS = [
  "Madison aus den USA",
  "Yoyo aus Südafrika",
  "Veronica aus Kanada",
  "Ann Francis aus den USA",
  "Thulani aus Botswana",
  "Marnie aus Australien",
  "Manny aus den USA",
  "Daphne aus Nigeria",
  "Bill aus Großbritannien",
  "George aus den USA",
  "Daisy aus Neuseeland",
  "Sarah aus den USA",
  "Carl aus Irland",
  "Paule aus den USA",
  "Alma aus dem Iran",
  "Lawrence aus den USA",
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

  let y = 45;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, BLACK);

  doc.text(
    "Unser Team aus über 80 Muttersprachler*innen kommt hauptsächlich aus Großbritannien, Irland, den USA, Kanada, Australien, Südafrika und Neuseeland.",
    marginLeft,
    y,
    { maxWidth: contentWidth }
  );

  // TA grid (4 columns × 4 rows)
  y = 65;
  const cols = 4;
  const rows = 4;
  const cellW = contentWidth / cols;
  const cellH = 45;

  for (let i = 0; i < TEACHING_ARTISTS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = marginLeft + col * cellW;
    const cellY = y + row * cellH;

    // Avatar circle
    doc.setFillColor(240, 240, 240);
    doc.circle(x + cellW / 2, cellY + 12, 14, "F");

    // Initials
    const name = TEACHING_ARTISTS[i].split(" aus ")[0];
    const initial = name[0];
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(doc, PINK);
    doc.text(initial, x + cellW / 2, cellY + 16, { align: "center" });

    // Name
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, BLACK);
    doc.text(TEACHING_ARTISTS[i], x + cellW / 2, cellY + 30, {
      align: "center",
      maxWidth: cellW - 4,
    });
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

  let y = 50;

  // Testimonial 1
  doc.setFontSize(11);
  doc.setFont("helvetica", "italic");
  setColor(doc, BLACK);
  const quote1 =
    '"Our Zusammenarbeit with InterACT was fantastic again! I loved working with the Teaching-Artists! Great inspiration for me that goes beyond three days... Wonderful results, happy kids and teachers... so soll es immer sein!."';
  doc.text(quote1, pageWidth / 2, y, {
    align: "center",
    maxWidth: contentWidth - 20,
  });

  y = 85;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);
  doc.text(
    "Frau Lellow, Englischlehrerin, Elbeschule, Berlin",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // Testimonial 2
  y = 100;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  setColor(doc, BLACK);
  const quote2 =
    '"Nicht nur haben die Schüler gemeinsam eine Menge erreicht und tolle Produkte und Präsentationen kreiert. Sie haben eine Woche lang sehr viel Englisch gesprochen und sich dabei in Wortschatz und flüssigem Sprechen enorm verbessert. Das Projekt, das die Fachschaft Englisch bei einem Wettbewerb gewonnen hat, darf also als großer Erfolg bezeichnet werden."';
  doc.text(quote2, pageWidth / 2, y, {
    align: "center",
    maxWidth: contentWidth - 20,
  });

  y = 140;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GREY);
  doc.text("Johannes S. StR, Fachbetreuer Englisch", pageWidth / 2, y, {
    align: "center",
  });
  doc.text(
    "Alexander von Humboldt Schweinfurt",
    pageWidth / 2,
    y + 4,
    { align: "center" }
  );

  // Stats section
  y = 165;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, PINK);
  doc.text("INTERACT IN ZAHLEN", pageWidth / 2, y, { align: "center" });

  // 2×2 stat grid
  const statY = 180;
  const halfW = contentWidth / 2;
  const stats = [
    { value: "15.000", label: "Schüler*innen, welche in 2024 durch\nProgramme mit InterACT English\nerreicht wurden" },
    { value: "200", label: "Schulkooperationen\nin Deutschland" },
    { value: "1000", label: "Lehrer*innen, welche in 2024 durch\nBerufliche Weiterbildung mit InterACT\nEnglish erreicht wurden" },
    { value: "85%", label: "der Schulen wiederholen Programme\nmit InterACT English jedes Jahr" },
  ];

  for (let i = 0; i < stats.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginLeft + col * halfW + halfW / 2;
    const sy = statY + row * 50;

    // Big number
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    setColor(doc, i % 2 === 0 ? GREEN : PINK);
    doc.text(stats[i].value, x, sy, { align: "center" });

    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, i % 2 === 0 ? GREEN : PINK);
    doc.text(stats[i].label, x, sy + 8, {
      align: "center",
      maxWidth: halfW - 10,
    });
  }

  drawFooter(doc, pageWidth, pageHeight, marginLeft);
}
