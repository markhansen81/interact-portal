import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

const doc = new jsPDF({ unit: "mm", format: "a4" });
const pageWidth = 210;
const pageHeight = 297;
const margin = 20;
const contentWidth = pageWidth - margin * 2;
let y = 0;

// Colors
const magenta = "#e6007e";
const darkGrey = "#333333";
const midGrey = "#666666";
const lightGrey = "#e8e8e8";
const white = "#ffffff";

function hexToRgb(hex: string) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ] as [number, number, number];
}

function setColor(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

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
  doc.setFontSize(opts?.fontSize || 10);
  doc.setFont("helvetica", opts?.fontStyle || "normal");
  setColor(opts?.color || darkGrey);
  const align = opts?.align as "left" | "center" | "right" | undefined;
  doc.text(text, x, yPos, {
    maxWidth: opts?.maxWidth || contentWidth,
    align,
  });
  return doc.getTextDimensions(text, {
    maxWidth: opts?.maxWidth || contentWidth,
  }).h;
}

function checkPageBreak(needed: number) {
  if (y + needed > pageHeight - 30) {
    // Footer on current page
    addFooter();
    doc.addPage();
    y = 25;
    // Light grey top border on new page
    doc.setDrawColor(...hexToRgb(lightGrey));
    doc.setLineWidth(0.5);
    doc.line(margin, 20, pageWidth - margin, 20);
  }
}

function addFooter() {
  const footerY = pageHeight - 15;
  doc.setDrawColor(...hexToRgb(lightGrey));
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  addText(
    "InterACT English gGmbH | Planufer 92B, 10967 Berlin | Tel. 030 20339702 | info@interactenglish.de",
    pageWidth / 2,
    footerY,
    { fontSize: 7, color: midGrey, align: "center" }
  );
  addText(
    "HRB 188932 B \u2013 Amtsgericht Charlottenburg | Steuernummer: 27/614/02133 | Gesch\u00e4ftsf\u00fchrer: Mark William Hansen & Charles Justin Beard",
    pageWidth / 2,
    footerY + 3.5,
    { fontSize: 7, color: midGrey, align: "center" }
  );
}

function addSection(title: string) {
  checkPageBreak(15);
  y += 4;
  // Magenta left accent bar
  doc.setFillColor(...hexToRgb(magenta));
  doc.rect(margin, y - 4, 2, 7, "F");
  addText(title, margin + 6, y, {
    fontSize: 13,
    fontStyle: "bold",
    color: darkGrey,
  });
  y += 8;
}

function addParagraph(text: string, opts?: { italic?: boolean }) {
  const h = doc.getTextDimensions(text, { maxWidth: contentWidth - 4 }).h;
  checkPageBreak(h + 4);
  addText(text, margin + 2, y, {
    fontSize: 9.5,
    color: darkGrey,
    maxWidth: contentWidth - 4,
    fontStyle: opts?.italic ? "italic" : "normal",
  });
  y += h + 3;
}

function addBullet(text: string) {
  const bulletIndent = margin + 6;
  const bulletWidth = contentWidth - 10;
  const h = doc.getTextDimensions(text, { maxWidth: bulletWidth }).h;
  checkPageBreak(h + 3);
  addText("\u2022", margin + 2, y, { fontSize: 9.5, color: magenta });
  addText(text, bulletIndent, y, {
    fontSize: 9.5,
    color: darkGrey,
    maxWidth: bulletWidth,
  });
  y += h + 2.5;
}

function addNumbered(num: string, text: string) {
  const numIndent = margin + 10;
  const numWidth = contentWidth - 14;
  const h = doc.getTextDimensions(text, { maxWidth: numWidth }).h;
  checkPageBreak(h + 3);
  addText(num, margin + 2, y, {
    fontSize: 9.5,
    fontStyle: "bold",
    color: midGrey,
  });
  addText(text, numIndent, y, {
    fontSize: 9.5,
    color: darkGrey,
    maxWidth: numWidth,
  });
  y += h + 2.5;
}

// ============================
// PAGE 1 - HEADER
// ============================

// Magenta header bar
doc.setFillColor(...hexToRgb(magenta));
doc.rect(0, 0, pageWidth, 45, "F");

// Logo
try {
  const logoPath = path.join(process.cwd(), "public", "interact-logo-black.png");
  const logoData = fs.readFileSync(logoPath);
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
  // White logo would be better but we use what we have
  doc.addImage(logoBase64, "PNG", margin, 8, 30, 21);
} catch {
  // fallback
}

// Title on magenta
addText("Projektversicherung", margin + 35, 18, {
  fontSize: 22,
  fontStyle: "bold",
  color: white,
});
addText("f\u00fcr Ihr Englischprojekt", margin + 35, 27, {
  fontSize: 14,
  color: white,
});
addText("InterACT English gGmbH", pageWidth - margin, 38, {
  fontSize: 8,
  color: white,
  align: "right",
});

y = 55;

// Light grey border around content area
doc.setDrawColor(...hexToRgb(lightGrey));
doc.setLineWidth(0.5);
doc.roundedRect(margin - 2, 50, contentWidth + 4, pageHeight - 75, 2, 2);

// ============================
// INTRO
// ============================

addParagraph(
  "Liebe Eltern und Erziehungsberechtigte,"
);
y += 1;
addParagraph(
  "um Ihre finanzielle Investition in das anstehende Englischprojekt mit InterACT English zu sichern, m\u00f6chten wir Ihnen eine optionale Versicherung anbieten. Durch den Abschluss dieser Versicherung haben Sie Anspruch auf eine teilweise oder vollst\u00e4ndige R\u00fcckerstattung, falls Ihr Kind krank wird oder aufgrund anderer Umst\u00e4nde nicht in der Lage ist, an allen oder einzelnen Tagen des Englischprojekts teilzunehmen."
);
addParagraph(
  "Als gemeinn\u00fctzige Organisation ist es unser Ziel, unsere Kosten so niedrig wie m\u00f6glich zu halten. Diese Versicherung sch\u00fctzt sowohl Ihren finanziellen Beitrag als auch unsere Organisation vor den finanziellen Problemen, die durch die Abwesenheit von Sch\u00fcler*innen entstehen."
);
addParagraph(
  "Diese Projektversicherung ist optional. Ohne diese zus\u00e4tzliche Versicherung k\u00f6nnen wir Ihnen jedoch keine R\u00fcckerstattung anbieten, falls Ihr Kind krank wird und nicht wie geplant am Programm teilnehmen kann."
);

// ============================
// KEY INFO
// ============================

addSection("Wichtige Informationen");

addBullet(
  "Der Preis f\u00fcr die Versicherung h\u00e4ngt von der H\u00f6he des individuell gezahlten Beitrags der Eltern ab und liegt zwischen 4,\u2013 und 8,\u2013 Euro."
);
addBullet(
  "Damit die Versicherung g\u00fcltig ist, m\u00fcssen Sie Ihr Antragsformular sp\u00e4testens 14 Tage vor dem ersten Tag des Projekts einreichen."
);
addBullet(
  "Die Versicherung deckt nur den Teil der Programmkosten, den Sie selbst bezahlen. Wird Ihr Projekt \u00fcber Drittmittel, den F\u00f6rderverein oder die Schule bezuschusst, k\u00f6nnen Sie nur den von Ihnen selbst gezahlten Betrag geltend machen."
);
addBullet(
  "Die Versicherung und die Programmgeb\u00fchr werden separat abgerechnet. F\u00fcr den Erwerb der Versicherung m\u00fcssen Sie sich separat \u00fcber unsere sichere Website anmelden und bezahlen."
);
addBullet(
  "Im Falle eines Erstattungsanspruchs reichen Sie bitte Ihren Erstattungsantrag innerhalb von 14 Tagen nach Projektende unter interactenglish.de/erstattungsantrag ein. Wir \u00fcberweisen Ihnen den Betrag innerhalb von 30 Tagen."
);
addBullet(
  "Es werden nur volle Abwesenheitstage erstattet. Teilerstattungen f\u00fcr halbe Tage sind nicht m\u00f6glich."
);

// ============================
// EXAMPLE CALC
// ============================

addSection("Berechnungsbeispiel");

addParagraph(
  "Der Erstattungsbetrag basiert anteilig auf dem Tagessatz:"
);

// Grey box for example
checkPageBreak(35);
doc.setFillColor(245, 245, 245);
doc.roundedRect(margin + 2, y - 2, contentWidth - 4, 32, 1, 1, "F");

addText("Kosten f\u00fcr eine Englisch Projektwoche: 109,00 \u20AC", margin + 6, y + 2, { fontSize: 9, color: darkGrey });
addText("F\u00f6rderverein bezuschusst jedes Kind mit: 10,00 \u20AC", margin + 6, y + 6.5, { fontSize: 9, color: darkGrey });
addText("Programmdauer: 5 Tage", margin + 6, y + 11, { fontSize: 9, color: darkGrey });
addText("Tagessatz: (109,00 \u20AC \u2013 10,00 \u20AC) / 5 = 19,80 \u20AC pro Tag", margin + 6, y + 15.5, { fontSize: 9, color: darkGrey });
addText("Versicherte Person hat 2 volle Tage vers\u00e4umt", margin + 6, y + 20, { fontSize: 9, color: darkGrey });
addText("Erstattung: 19,80 \u20AC x 2 = 39,60 \u20AC", margin + 6, y + 25, { fontSize: 10, fontStyle: "bold", color: magenta });

y += 36;

// ============================
// PAGE 2 - AGB
// ============================

addSection("Allgemeine Gesch\u00e4ftsbedingungen (Stand 04.01.2021)");

addText("Begrifflichkeiten", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addNumbered("1.", "Die versicherte Person ist die am Projekt teilnehmende Sch\u00fclerin / der Sch\u00fcler.");
addNumbered("2.", "Der Versicherungsnehmer ist das Elternteil oder die gesetzliche Vertretung der versicherten Person, wenn diese unter 18 Jahre alt ist.");
addNumbered("3.", "Der Versicherer / Veranstalter ist InterACT English gGmbH, Planufer 92B, 10967 Berlin.");

y += 2;
addText("1 Gegenstand der Versicherung", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addNumbered("1.1", "Bei Nichtantritt des Englischprojekts / der Klassenfahrt erstattet der Versicherer bis zur H\u00f6he der vertraglich vereinbarten Versicherungssumme.");
addNumbered("1.2", "Die Versicherung muss sp\u00e4testens 14 Tage vor dem ersten Tag des Projekts abgeschlossen werden, um g\u00fcltig zu sein.");
addNumbered("1.3", "F\u00fcr jede*n teilnehmende*n Sch\u00fcler*in ist eine eigene Versicherungspolice erforderlich. Dies gilt auch f\u00fcr Geschwisterkinder.");
addNumbered("1.4", "Eine vollst\u00e4ndige oder teilweise R\u00fcckerstattung ist nur f\u00fcr vollst\u00e4ndig vers\u00e4umte Projekttage m\u00f6glich. Teilweise abgeschlossene Projekttage sind von der Erstattung ausgenommen.");
addNumbered("1.5", "Eine Stornierung der Versicherung ist nicht m\u00f6glich. Die Versicherungsgeb\u00fchr ist nicht erstattungsf\u00e4hig.");

y += 2;
addText("2 Versicherte Ereignisse", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addParagraph("Versicherungsschutz besteht, wenn die planm\u00e4\u00dfige Durchf\u00fchrung des Englischprojekts nicht zumutbar ist, weil die versicherte Person von einem der nachstehenden Ereignisse betroffen wird:");
addBullet("Unerwartete Erkrankung");
addBullet("Schwere Unfallverletzung");
addBullet("Offizielle Quarant\u00e4neanordnung des zust\u00e4ndigen Gesundheitsamtes");
addBullet("Erheblicher Schaden am Eigentum der versicherten Person durch Feuer, Explosion, Elementarereignisse oder vors\u00e4tzliche Straftat eines Dritten");
addBullet("Tod");

y += 2;
addText("3 Ausschl\u00fcsse", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addParagraph("Kein Versicherungsschutz besteht:");
addNumbered("3.1", "F\u00fcr Sch\u00fcler*innen, die aufgrund von disziplinarischen oder verhaltensbedingten Problemen aufgefordert werden, das Projekt zu verlassen.");
addNumbered("3.2", "F\u00fcr Sch\u00fcler*innen, die sich angemeldet haben, aber ohne einen der in 2.1 genannten Gr\u00fcnde nicht teilnehmen.");
addNumbered("3.3", "F\u00fcr Abwesenheiten, die nicht unter 2.1 genannt werden.");
addNumbered("3.4", "F\u00fcr alle weiteren Sch\u00fcler*innen oder Geschwister, die nicht namentlich im Versicherungsschein genannt sind (nicht \u00fcbertragbar).");
addNumbered("3.5", "F\u00fcr Sch\u00fcler*innen, die auf Anfrage kein \u00e4rztliches Attest vorlegen k\u00f6nnen.");
addNumbered("3.6", "F\u00fcr teilweise abgeschlossene Projekttage.");
addNumbered("3.7", "F\u00fcr Sch\u00fcler*innen, deren Versicherungspolice weniger als 14 Tage vor dem ersten Tag des Projekts abgeschlossen wurde.");
addNumbered("3.8", "F\u00fcr zus\u00e4tzliche Projektkosten, die eigenst\u00e4ndig mit Dritten vereinbart wurden (z.B. Unterkunftskosten bei Klassenfahrten).");

y += 2;
addParagraph(
  "**Um die Unannehmlichkeiten f\u00fcr Familien so gering wie m\u00f6glich zu halten, ist ein \u00e4rztliches Attest in der Regel nicht erforderlich. Der Versicherer beh\u00e4lt sich jedoch das Recht vor, in besonderen F\u00e4llen ein solches zu verlangen.",
  { italic: true }
);

y += 2;
addText("4 Obliegenheiten nach Eintritt des Versicherungsfalls", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addParagraph("Der Versicherungsnehmer / die versicherte Person ist verpflichtet:");
addNumbered("4.1", "Im Falle einer Abwesenheit die Schule und die Klassenlehrkraft zu informieren und einen Grund anzugeben.");
addNumbered("4.2", "Den Erstattungsantrag innerhalb von 14 Tagen nach dem letzten Projekttag einzureichen unter interactenglish.de/erstattungsantrag.");
addNumbered("4.3", "Auf Verlangen des Versicherers ein \u00e4rztliches Attest vorzulegen.");
addNumbered("4.4", "Bei Schaden am Eigentum geeignete Nachweise (z.B. Polizeiprotokoll) einzureichen.");

y += 2;
addText("5 Rechtsfolgen bei Verletzungen von Obliegenheiten", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addNumbered("5.1", "Die Nichtvorlage der erforderlichen Dokumente oder die Nichtbeachtung der Obliegenheiten f\u00fchrt zum Erl\u00f6schen der Stornoversicherung.");
addNumbered("5.2", "Das Erl\u00f6schen der Versicherung hat zur Folge, dass kein Anspruch auf Erstattung besteht.");

y += 2;
addText("6 Versicherungswert", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addNumbered("6.1", "Im Falle einer Abwesenheit gem\u00e4\u00df Abs. 2 kann eine teilweise oder vollst\u00e4ndige R\u00fcckerstattung verlangt werden.");
addNumbered("6.2", "Nur der tats\u00e4chlich gezahlte Betrag ist erstattungsf\u00e4hig.");
addNumbered("6.3", "Der maximale Erstattungsbetrag richtet sich nach der bei der Buchung gew\u00e4hlten Versicherungskategorie.");
addNumbered("6.4", "F\u00fcr Teilerstattungen: Berechnung basiert auf dem anteiligen Tagessatz (siehe Berechnungsbeispiel).");
addNumbered("6.5", "Nach Eingang des Erstattungsantrags erfolgt die Auszahlung innerhalb von 30 Tagen per \u00dcberweisung.");

y += 2;
addText("7 Datenschutz", margin + 2, y, { fontSize: 10, fontStyle: "bold", color: darkGrey });
y += 5;
addParagraph(
  "Zum Zwecke der Verwaltung der Projektversicherung werden mit der Anmeldung folgende Daten erfasst: Name, Vorname, Kursnummer, Schulname, Jahrgangsstufe/Klasse, Kurstitel und individuell bezahlter Betrag. Vom Versicherungsnehmer werden Name, E-Mail-Adresse und Zahlungsinformationen erfasst. Mit dem Abschluss des Online-Kaufs stimmt der Versicherungsnehmer der Verarbeitung der Daten zu. Die Daten werden ausschlie\u00dflich bei InterACT English gGmbH hinterlegt und nur an zur Abwicklung erforderliche Drittanbieter weitergegeben."
);

// Contact
y += 4;
checkPageBreak(20);
doc.setFillColor(245, 245, 245);
doc.roundedRect(margin + 2, y - 2, contentWidth - 4, 16, 1, 1, "F");
addText("Bei Fragen kontaktieren Sie uns:", margin + 6, y + 2, { fontSize: 9, color: midGrey });
addText("info@interactenglish.de | Tel. 030 2033 9702", margin + 6, y + 7, { fontSize: 10, fontStyle: "bold", color: darkGrey });
addText("interactenglish.de/versicherung", margin + 6, y + 12, { fontSize: 10, fontStyle: "bold", color: magenta });
y += 20;

// Copyright
y += 4;
addText(
  "Berlin, 2026 \u00a9 InterACT English gGmbH, HRB 188932 \u2013 Amtsgericht Charlottenburg, Planufer 92B, 10967 Berlin",
  pageWidth / 2,
  y,
  { fontSize: 7, color: midGrey, align: "center" }
);

// Add footer to last page
addFooter();

// Save
const outputPath = path.join(process.cwd(), "public", "Projektversicherung_InterACT_English.pdf");
const buffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outputPath, buffer);
console.log(`PDF saved to ${outputPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
