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

  "English Class Trip": {
    name: "English Class Trip",
    tagline: "Eine unvergessliche Klassenfahrt auf Englisch",
    gradeRange: "Klassenstufen 5\u201313",
    duration: "5 Tage",
    studentsRange: "24\u2013200 Sch\u00fcler*innen, 2 Native Speaker pro Gruppe",
    description:
      "Die English Class Trip verbindet Klassenfahrt mit immersivem Englischunterricht. Sch\u00fcler*innen verbringen eine Woche in einer Jugendherberge und arbeiten t\u00e4glich mit Native Speaking Teaching Artists. Durch kreative Workshops in Theater, Musik, Tanz, Kunst und Sport erleben die Sch\u00fcler*innen Englisch als lebendige Kommunikationssprache. Die Kombination aus Abenteuer, Gemeinschaft und Sprachpraxis macht diese Klassenfahrt zu einem einzigartigen Erlebnis.",
    skills: [
      "Intensive Sprachpraxis in authentischen Situationen",
      "Teamarbeit und Gruppendynamik auf Englisch",
      "Kreatives Schreiben und Storytelling",
      "Pr\u00e4sentationsf\u00e4higkeiten",
      "Interkultureller Austausch",
    ],
    activities: [
      "Morning Warm-up und Team Building",
      "Theatre und Performance Workshops",
      "Art und Creative Projects",
      "Sport und Outdoor Activities",
      "Evening Programme",
      "The Big Show \u2013 Abschlusspr\u00e4sentation",
    ],
    effect: [],
    timetable: {
      daysCount: 5,
      gradeBlocks: [
        {
          label: "Klasse 5 bis 13",
          periods: 6,
          slots: [
            ["Team Building", "Speak Up", "Theatre", "Art", "Sport", "Evening Programme"],
            ["Team Building", "Speak Up", "Theatre", "Art", "Language Game", "Evening Programme"],
            ["Team Building", "Speak Up", "Theatre", "Art", "Sport", "Evening Programme"],
            ["Team Building", "Speak Up", "Theatre", "Art", "Language Game", "Evening Programme"],
            ["Team Building", "Speak Up", "Theatre", "Art", "Sport", "Presentation"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "2 Native Speaker pro Gruppe",
        "Abendprogramm in der Jugendherberge",
      ],
    },
  },

  "Shakespeare Workshop": {
    name: "Shakespeare Workshop",
    tagline: "Shakespeare lebendig erleben",
    gradeRange: "Klassenstufen 9\u201313",
    duration: "3 Tage // Unterrichtseinheiten 30 x 45 Min",
    studentsRange: "14\u201324 Sch\u00fcler*innen, 1 Native Speaker pro Gruppe",
    description:
      "Der Shakespeare Workshop bringt die Werke William Shakespeares zum Leben. Sch\u00fcler*innen erarbeiten Szenen aus Romeo und Julia, Macbeth, A Midsummer Night\u2019s Dream oder anderen St\u00fccken. Durch Theater\u00fcbungen, Textarbeit und szenische Interpretation erleben sie Shakespeares Sprache als lebendiges, emotionales Erlebnis. Der Workshop f\u00f6rdert nicht nur das Textverst\u00e4ndnis, sondern auch Selbstvertrauen und Ausdrucksf\u00e4higkeit in der englischen Sprache.",
    skills: [
      "Textverst\u00e4ndnis und -interpretation",
      "Szenisches Spiel und B\u00fchnenpr\u00e4senz",
      "Aussprache und Intonation im Englischen",
      "Analyse literarischer Texte",
      "Kreative Textarbeit",
    ],
    activities: [
      "Warm-up und Theater\u00fcbungen",
      "Textarbeit und Szenenanalyse",
      "Szenische Interpretation und Proben",
      "Improvisation mit Shakespeare-Texten",
      "Auff\u00fchrung ausgew\u00e4hlter Szenen",
    ],
    effect: [],
    timetable: {
      daysCount: 3,
      gradeBlocks: [
        {
          label: "Klasse 9 bis 13",
          periods: 6,
          slots: [
            ["Theatre", "Speak Up", "Theatre", "Language Game", "Theatre", "Language Game"],
            ["Theatre", "Theatre", "Theatre", "Art", "Theatre", "Language Game"],
            ["Theatre", "Theatre", "Theatre", "Presentation", "Presentation", "Speak Up"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "1 Native Speaker pro Gruppe",
      ],
    },
  },

  "Debating Skills Workshop": {
    name: "Debating Skills Workshop",
    tagline: "\u00dcberzeugend argumentieren auf Englisch",
    gradeRange: "Klassenstufen 9\u201313",
    duration: "3 Tage // Unterrichtseinheiten 30 x 45 Min",
    studentsRange: "14\u201324 Sch\u00fcler*innen, 1 Native Speaker pro Gruppe",
    description:
      "Der Debating Skills Workshop vermittelt Sch\u00fcler*innen die Kunst der englischsprachigen Debatte. Von der Strukturierung von Argumenten \u00fcber Rhetorik bis hin zur spontanen Reaktion auf Gegenargumente \u2013 die Sch\u00fcler*innen entwickeln ihre F\u00e4higkeit, \u00fcberzeugend und selbstbewusst auf Englisch zu argumentieren. Der Workshop bereitet auch auf offizielle Debating-Wettbewerbe vor.",
    skills: [
      "Argumentationsstruktur und -logik",
      "Rhetorische Techniken",
      "Spontanes Reagieren auf Gegenargumente",
      "\u00dcberzeugend pr\u00e4sentieren",
      "Kritisches Denken auf Englisch",
    ],
    activities: [
      "Einf\u00fchrung in Debating-Formate",
      "Argumentation Building Workshops",
      "Practice Debates",
      "Impromptu Speaking",
      "Final Debate / Tournament",
    ],
    effect: [],
    timetable: {
      daysCount: 3,
      gradeBlocks: [
        {
          label: "Klasse 9 bis 13",
          periods: 6,
          slots: [
            ["Speak Up", "Speak Up", "Language Game", "Language Game", "Theatre", "Speak Up"],
            ["Speak Up", "Speak Up", "Speak Up", "Theatre", "Theatre", "Speak Up"],
            ["Speak Up", "Speak Up", "Theatre", "Theatre", "Presentation", "Presentation"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "1 Native Speaker pro Gruppe",
      ],
    },
  },

  "Job Prep Workshop": {
    name: "Job Prep Workshop",
    tagline: "Bewerbungstraining auf Englisch",
    gradeRange: "Klassenstufen 9\u201313",
    duration: "3 Tage // Unterrichtseinheiten 30 x 45 Min",
    studentsRange: "10\u201313 Sch\u00fcler*innen, 1 Native Speaker pro Gruppe",
    description:
      "Der Job Preparation Workshop bereitet Sch\u00fcler*innen auf englischsprachige Bewerbungssituationen vor. Von der Erstellung eines englischen Lebenslaufs \u00fcber das Verfassen von Bewerbungsschreiben bis hin zu simulierten Vorstellungsgespr\u00e4chen \u2013 die Sch\u00fcler*innen sammeln praktische Erfahrungen f\u00fcr ihre berufliche Zukunft in einer globalisierten Arbeitswelt.",
    skills: [
      "Englischen Lebenslauf erstellen (CV Writing)",
      "Bewerbungsschreiben auf Englisch (Cover Letter)",
      "Vorstellungsgespr\u00e4ch auf Englisch (Interview Skills)",
      "Professionelle Selbstpr\u00e4sentation",
      "Small Talk und Business English",
    ],
    activities: [
      "CV Writing Workshop",
      "Cover Letter Workshop",
      "Mock Interviews mit Feedback",
      "Elevator Pitch \u00dcbungen",
      "Business Communication Rollenspiele",
      "Abschlusspr\u00e4sentation",
    ],
    effect: [],
    timetable: {
      daysCount: 3,
      gradeBlocks: [
        {
          label: "Klasse 9 bis 13",
          periods: 5,
          slots: [
            ["Speak Up", "Art", "Art", "Speak Up", "Speak Up"],
            ["Speak Up", "Theatre", "Theatre", "Speak Up", "Speak Up"],
            ["Speak Up", "Theatre", "Theatre", "Presentation", "Speak Up"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "1 Native Speaker pro Gruppe",
      ],
    },
  },

  "Test Prep Workshop": {
    name: "Test Prep Workshop",
    tagline: "Gezielte Pr\u00fcfungsvorbereitung auf Englisch",
    gradeRange: "Klassenstufen 9\u201313",
    duration: "3 Tage // Unterrichtseinheiten 30 x 45 Min",
    studentsRange: "10\u201313 Sch\u00fcler*innen, 1 Native Speaker pro Gruppe",
    description:
      "Der Test Preparation Workshop bereitet Sch\u00fcler*innen gezielt auf englische Sprachpr\u00fcfungen vor \u2013 ob MSA, Abitur oder Cambridge-Zertifikate. Unsere Native Speaking Teaching Artists trainieren alle Pr\u00fcfungsbereiche: Leseverstehen, H\u00f6rverstehen, Schreiben und m\u00fcndliche Pr\u00fcfung. Durch intensive \u00dcbungen und simulierte Pr\u00fcfungssituationen gewinnen die Sch\u00fcler*innen Sicherheit und Strategie f\u00fcr ihre bevorstehende Pr\u00fcfung.",
    skills: [
      "Leseverstehen (Reading Comprehension)",
      "H\u00f6rverstehen (Listening)",
      "Schriftlicher Ausdruck (Writing)",
      "M\u00fcndliche Pr\u00fcfung (Speaking)",
      "Pr\u00fcfungsstrategien und Zeitmanagement",
    ],
    activities: [
      "Diagnostic Test und Bedarfsanalyse",
      "Reading Comprehension Strategien",
      "Listening Practice Sessions",
      "Writing Workshop (Essay/Letter/Report)",
      "Speaking Practice und Mock Oral Exams",
      "Pr\u00fcfungssimulation unter Realbedingungen",
    ],
    effect: [],
    timetable: {
      daysCount: 3,
      gradeBlocks: [
        {
          label: "Klasse 9 bis 13",
          periods: 5,
          slots: [
            ["Speak Up", "Speak Up", "Speak Up", "Speak Up", "Speak Up"],
            ["Speak Up", "Speak Up", "Speak Up", "Theatre", "Speak Up"],
            ["Speak Up", "Speak Up", "Speak Up", "Speak Up", "Speak Up"],
          ],
        },
      ],
      notes: [
        "1 Schulstunde = 45 Minuten",
        "1 Native Speaker pro Gruppe",
      ],
    },
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
