// Program content data for offer PDFs
// Each program type maps to its description, skills, activities, and optional timetable

export interface TimetableData {
  daysCount: number; // 1, 3, or 5
  gradeBlocks: {
    label: string; // e.g. "Klasse 1 bis 2"
    periods: number; // 4, 5, or 6
    slots: string[][]; // rows of activities per period
    rooms?: string[]; // room types per period
  }[];
  notes?: string[];
}

export interface ProgramContent {
  name: string;
  tagline: string;
  gradeRange: string;
  duration: string;
  studentsRange: string;
  description: string;
  skills: string[];
  creativeSkills?: string[];
  activities: string[];
  effect: string[];
  timetable?: TimetableData;
}

const programContentMap: Record<string, ProgramContent> = {
  "Native Speaker Week": {
    name: "Native Speaker Week",
    tagline: "Eine Woche Englisch erleben",
    gradeRange: "Klassenstufen 5\u20139",
    duration: "5 Tage",
    studentsRange: "14\u2013200 Sch\u00fcler*innen",
    description:
      "Eine Woche lang tauchen die Sch\u00fcler*innen in ein immersives englischsprachiges Projekt ein, bei dem muttersprachliche Teaching Artists in kreativen Workshops mit den Sch\u00fcler*innen arbeiten. Die Sch\u00fcler*innen entwickeln ihre Sprachf\u00e4higkeiten durch Theater, Musik, Tanz, Kunst und Pr\u00e4sentationen.",
    skills: [
      "Unterschiedliche Inhalte basierend auf Altersgruppen und Sprachlevel",
      "Ideenentwicklung einzeln und in Gruppen",
      "Diskussion und Auswertung von Themen",
      "Empathie f\u00fcr neue Kulturen",
      "Direkte Kommunikation mit Muttersprachler*innen",
    ],
    activities: [
      "Morning Mixer \u2013 Spiele und \u00dcbungen",
      "Mini-theater skits",
      "Stop-Motion-Animation",
      "Sport",
      "The Big Show \u2013 Abschlusspr\u00e4sentation f\u00fcr Freunde und Familie",
    ],
    effect: [],
    timetable: {
      daysCount: 5,
      gradeBlocks: [
        {
          label: "Klasse 5 bis 9",
          periods: 6,
          slots: [
            ["Team Building", "Speak Up", "Theatre", "Singing", "Sport", "Presentation"],
            ["Team Building", "Theatre", "Art", "Sport", "Language Game", "Presentation"],
            ["Team Building", "Speak Up", "Stop-Motion", "Theatre", "Language Game", "Presentation"],
            ["Team Building", "Theatre", "Singing", "Sport", "Art", "Presentation"],
            ["Team Building", "Speak Up", "Theatre", "Stop-Motion", "Language Game", "Presentation"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "Stundenplan kann je nach Schule angepasst werden",
      ],
    },
  },

  "Art in Action Week": {
    name: "Art in Action Week",
    tagline: "Kreativit\u00e4t trifft Sprache",
    gradeRange: "Klassenstufen 5\u20138",
    duration: "5 Tage // 30 \u00d7 45 Min",
    studentsRange: "18\u2013200 Sch\u00fcler*innen",
    description:
      "Eine Mischung aus darstellenden K\u00fcnsten und Sprachunterricht. Von kurzen Theaterst\u00fccken \u00fcber Improvisation bis hin zu Stop-Motion-Animation \u2013 die Sch\u00fcler*innen entdecken Englisch praktisch durch Performing Arts, Sport, Sprachspiele und bildende Kunst.",
    skills: [
      "Unterschiedliche Inhalte basierend auf Altersgruppen und Sprachlevel",
      "Ideenentwicklung einzeln und in Gruppen",
      "Diskussion und Auswertung von Themen",
      "Empathie f\u00fcr neue Kulturen und Blickwinkel",
      "Direkte Kommunikation mit Muttersprachler*innen",
    ],
    creativeSkills: [
      "Erlernen und Entdeckung neuer Kunstformen",
      "Arbeit in kleinen oder gro\u00dfen Gruppen",
      "Neue Erfahrungen in verschiedenen Pr\u00e4sentationsformaten",
      "Erlernen der Kunst des Geschichtenerz\u00e4hlens",
    ],
    activities: [
      "Morning Mixer",
      "Mini-theater skits \u2013 schreiben, spielen, auff\u00fchren",
      "Stop-Motion-Animation",
      "Sport",
      "The Big Show \u2013 Abschlusspr\u00e4sentation",
    ],
    effect: [],
    timetable: {
      daysCount: 5,
      gradeBlocks: [
        {
          label: "Klasse 5 bis 8",
          periods: 6,
          slots: [
            ["Team Building", "Speak Up", "Theatre", "Singing", "Sport", "Presentation"],
            ["Team Building", "Theatre", "Art", "Sport", "Language Game", "Presentation"],
            ["Team Building", "Speak Up", "Stop-Motion", "Theatre", "Language Game", "Presentation"],
            ["Team Building", "Theatre", "Singing", "Sport", "Art", "Presentation"],
            ["Team Building", "Speak Up", "Theatre", "Stop-Motion", "Language Game", "Presentation"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "Stundenplan kann je nach Schule angepasst werden",
      ],
    },
  },

  "Theatre Week": {
    name: "Theatre Week",
    tagline: "Von der Idee zur B\u00fchne",
    gradeRange: "Klassenstufen 8\u201313",
    duration: "5 Tage",
    studentsRange: "24\u2013200 Sch\u00fcler*innen, 2 Native Speaker pro Gruppe",
    description:
      "Ein intensives Theaterprojekt, bei dem die Sch\u00fcler*innen ihr eigenes englischsprachiges Theaterst\u00fcck erstellen und auff\u00fchren. Das Projekt verbindet Drehbuchschreiben, Schauspiel, Regie, B\u00fchnenbild und Auff\u00fchrung.",
    skills: [
      "Drehbuchschreiben und Geschichtenentwicklung",
      "Charakterentwicklung",
      "B\u00fchnenpr\u00e4senz und Stimmprojektion",
      "Teamarbeit und kreative Zusammenarbeit",
    ],
    activities: [
      "Script Writing Workshops",
      "Proben und Rehearsals",
      "B\u00fchnenbild- und Kost\u00fcmgestaltung",
      "The Big Show \u2013 Abschlussauff\u00fchrung",
    ],
    effect: [],
    timetable: {
      daysCount: 5,
      gradeBlocks: [
        {
          label: "Klasse 8 bis 13",
          periods: 6,
          slots: [
            ["Team Building", "Speak Up", "Theatre", "Theatre", "Language Game", "Presentation"],
            ["Team Building", "Theatre", "Theatre", "Speak Up", "Theatre", "Presentation"],
            ["Team Building", "Theatre", "Theatre", "Theatre", "Language Game", "Presentation"],
            ["Team Building", "Theatre", "Theatre", "Theatre", "Theatre", "Presentation"],
            ["Team Building", "Theatre", "Theatre", "Theatre", "Theatre", "Presentation"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "2 Native Speaker pro Gruppe",
      ],
    },
  },

  "Film Week": {
    name: "Film Week",
    tagline: "Vom Drehbuch zur Leinwand",
    gradeRange: "Klassenstufen 8\u201313",
    duration: "5 Tage",
    studentsRange: "20\u2013200 Sch\u00fcler*innen, 2 Native Speaker pro Gruppe",
    description:
      "Die Sch\u00fcler*innen produzieren ihren eigenen Kurzfilm auf Englisch. Vom Drehbuch bis zur Leinwand werden alle Aspekte des Filmemachens abgedeckt.",
    skills: [
      "Drehbuchschreiben",
      "Kameraarbeit und Filmen",
      "Grundlagen der Bearbeitung",
      "Teamrollen (Regie, Schauspiel, Kamera, Ton)",
    ],
    activities: [
      "Script Development",
      "Dreh vor Ort / Filming on Location",
      "Grundlegende Bearbeitung / Basic Editing",
      "Filmvorf\u00fchrung / Film Screening",
    ],
    effect: [],
    timetable: {
      daysCount: 5,
      gradeBlocks: [
        {
          label: "Klasse 8 bis 13",
          periods: 6,
          slots: [
            ["Team Building", "Speak Up", "Theatre", "Stop-Motion", "Language Game", "Presentation"],
            ["Team Building", "Stop-Motion", "Stop-Motion", "Speak Up", "Language Game", "Presentation"],
            ["Team Building", "Stop-Motion", "Stop-Motion", "Stop-Motion", "Language Game", "Presentation"],
            ["Team Building", "Stop-Motion", "Stop-Motion", "Stop-Motion", "Stop-Motion", "Presentation"],
            ["Team Building", "Stop-Motion", "Stop-Motion", "Stop-Motion", "Stop-Motion", "Presentation"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "2 Native Speaker pro Gruppe",
        "Stop-Motion steht hier stellvertretend f\u00fcr Film-Workshops",
      ],
    },
  },

  "Media Week": {
    name: "Media Week",
    tagline: "Digitale Geschichten erz\u00e4hlen",
    gradeRange: "Klassenstufen 5\u201313",
    duration: "5 Tage",
    studentsRange: "10\u2013100 Sch\u00fcler*innen",
    description:
      "Ein kreatives Medienprojekt, das Film, Fotografie, Podcasting und digitales Geschichtenerz\u00e4hlen kombiniert.",
    skills: [
      "Digitales Geschichtenerz\u00e4hlen",
      "Medienproduktion",
      "Kreatives Schreiben f\u00fcr verschiedene Formate",
    ],
    activities: [
      "Podcast-Erstellung",
      "Kurzfilmproduktion",
      "Fotoprojekte",
      "Digitale Pr\u00e4sentationen",
    ],
    effect: [],
  },

  Kulturtag: {
    name: "Kulturtag",
    tagline: "Ein Tag, eine Welt, eine Sprache",
    gradeRange: "Klassenstufen 1\u201313",
    duration: "Eint\u00e4giges Programm",
    studentsRange: "18\u2013450 Sch\u00fcler*innen",
    description:
      "Unser Englisch Kulturtag verwandelt die Schule f\u00fcr einen Tag in ein englischsprachiges Land. Unsere Muttersprachler*innen arbeiten mit den Sch\u00fcler*innen in verschiedenen Workshops zusammen. Die Klassen wandern dabei von Raum zu Raum und treffen jedes Mal auf eine*n neue*n Muttersprachler*in. Die Workshops decken Musik, Tanz, Theater, Sprachspiel, Kunst, Geschichtenerz\u00e4hlen, Animation und vieles mehr ab.",
    skills: [],
    activities: [],
    effect: [
      "Verbessert das Verst\u00e4ndnis f\u00fcr Englisch",
      "Zusammenarbeit mit professionellen Kunstschaffenden",
      "Sch\u00fcler*innen treffen Muttersprachler*innen aus der ganzen Welt",
      "Eine motivierende und spannende Erfahrung",
    ],
    timetable: {
      daysCount: 1,
      gradeBlocks: [
        {
          label: "Klasse 1 bis 2",
          periods: 4,
          slots: [["Dance", "Storytime", "Art", "Singing"]],
        },
        {
          label: "Klasse 3 bis 7",
          periods: 5,
          slots: [["Dance", "Theatre", "Art", "Singing", "Language Game"]],
        },
        {
          label: "Klasse 8 bis 13",
          periods: 3,
          slots: [["Stop-Motion", "Language Game", "Theatre"]],
          rooms: ["Option A (Doppelstunde)", "Sprachspiel", "Option B (Doppelstunde)"],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "Klasse 8\u201313: Optionen beinhalten Stop-Motion, Theater, Musik oder Tanz",
      ],
    },
  },

  "Monster Parade": {
    name: "Monster Parade",
    tagline: "Kreatives Englisch f\u00fcr die Kleinsten",
    gradeRange: "Klasse 1\u20132",
    duration: "2\u20133 Tage",
    studentsRange: "18\u2013100 Sch\u00fcler*innen",
    description:
      "Ein k\u00fcrzeres Workshop-Programm f\u00fcr j\u00fcngere Sch\u00fcler*innen. Die Kinder entdecken Englisch durch kreative, spielerische Workshops mit muttersprachlichen K\u00fcnstler*innen. Tanz, Geschichtenerz\u00e4hlen, Kunst und Musik stehen im Mittelpunkt.",
    skills: [
      "Spielerischer Zugang zur englischen Sprache",
      "Kreativit\u00e4t und Selbstausdruck",
      "Zusammenarbeit in Gruppen",
    ],
    activities: [
      "Dance & Movement",
      "Storytime & Singing",
      "Art & Crafts",
      "Monster Parade \u2013 Abschlusspr\u00e4sentation",
    ],
    effect: [],
  },

  "Kids Space Adventure": {
    name: "Kids Space Adventure",
    tagline: "Eine Reise durch Sprache und Fantasie",
    gradeRange: "Klasse 3\u20134",
    duration: "2\u20133 Tage",
    studentsRange: "18\u2013100 Sch\u00fcler*innen",
    description:
      "Ein k\u00fcrzeres Workshop-Programm f\u00fcr Grundsch\u00fcler*innen. Die Kinder begeben sich auf ein englischsprachiges Weltraumabenteuer mit kreativen Workshops, die Sprache, Kunst und Bewegung verbinden.",
    skills: [
      "Altersgerechte Kommunikation auf Englisch",
      "Kreativit\u00e4t und Teamarbeit",
      "Pr\u00e4sentationsf\u00e4higkeiten",
    ],
    activities: [
      "Space-themed Theatre Games",
      "Art & Crafts",
      "Language Games & Sport",
      "Space Adventure Show \u2013 Abschlusspr\u00e4sentation",
    ],
    effect: [],
  },
};

/**
 * Retrieve program content by program type name.
 * Returns undefined if the program type is not found.
 */
export function getProgramContent(
  programType: string
): ProgramContent | undefined {
  // Try exact match first, then case-insensitive
  if (programContentMap[programType]) {
    return programContentMap[programType];
  }
  const key = Object.keys(programContentMap).find(
    (k) => k.toLowerCase() === programType.toLowerCase()
  );
  return key ? programContentMap[key] : undefined;
}
