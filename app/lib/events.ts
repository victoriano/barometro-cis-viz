// Curated political events 2020-2026. Used as:
// - markLine annotations on every time-series chart.
// - Content feed on the sidebar, filterable by ``kind``.
// ``body`` is the editorial explanation of how the event mattered for polling
// numbers; tags show up as small chips under the expanded item.

export type EventKind = "election" | "crisis" | "policy" | "moment";

export type PoliticalEvent = {
  date: string; // YYYY-MM-DD
  kind: EventKind;
  label: string;
  headline: string;
  body: string;
  tags: string[];
};

export const POLITICAL_EVENTS: PoliticalEvent[] = [
  {
    date: "2020-03-14",
    kind: "crisis",
    label: "Estado de alarma",
    headline: "Confinamiento nacional decretado",
    body:
      "Colapsa la agenda económica y empuja 'sanidad' al 45% como principal problema. El paro vuelve a subir tras años de descenso.",
    tags: ["covid", "sanidad", "paro"],
  },
  {
    date: "2020-06-21",
    kind: "policy",
    label: "Fin estado alarma",
    headline: "Fin del estado de alarma",
    body:
      "Rebote de preocupación económica; 'crisis económica' supera al paro como top concern durante el verano de 2020.",
    tags: ["economía", "pospandemia"],
  },
  {
    date: "2022-06-19",
    kind: "election",
    label: "Andalucía · PP",
    headline: "Mayoría absoluta del PP en Andalucía",
    body:
      "Primer termómetro pos-pandemia. PP +5pp en intención nacional en el mes siguiente, VOX mantiene bloque.",
    tags: ["autonómicas", "PP", "VOX"],
  },
  {
    date: "2022-10-11",
    kind: "policy",
    label: "Reforma sedición",
    headline: "Reforma del delito de sedición",
    body:
      "Polariza el debate público. 'Problemas políticos' escala en la encuesta; PSOE sufre erosión en perfiles centro.",
    tags: ["gobierno", "PSOE"],
  },
  {
    date: "2023-05-28",
    kind: "election",
    label: "Municipales 28M",
    headline: "Terremoto municipal · PP barre",
    body:
      "Sánchez adelanta generales. Caída simultánea de Sumar/Podemos — se reorganizan fuerzas a la izquierda.",
    tags: ["municipales", "adelanto"],
  },
  {
    date: "2023-07-23",
    kind: "election",
    label: "Generales 23J",
    headline: "Generales 23J · empate técnico",
    body:
      "Resultado sin mayorías claras. 'Problemas políticos' marca nuevo máximo (18%) los 3 meses siguientes.",
    tags: ["generales", "bloqueo"],
  },
  {
    date: "2023-11-16",
    kind: "policy",
    label: "Investidura · amnistía",
    headline: "Investidura Sánchez con Junts",
    body:
      "Acuerdo de amnistía dispara la preocupación por 'mal comportamiento político'. VOX recupera intención +3pp.",
    tags: ["amnistía", "Junts", "VOX"],
  },
  {
    date: "2024-02-18",
    kind: "election",
    label: "Galicia · PP",
    headline: "Autonómicas Galicia · PP revalida",
    body:
      "BNG segunda fuerza. Poca translación nacional pero consolida techo de PP en la encuesta mensual.",
    tags: ["Galicia", "BNG"],
  },
  {
    date: "2024-04-21",
    kind: "moment",
    label: "Carta Sánchez",
    headline: "Carta 'parar a pensar' de Sánchez",
    body:
      "PSOE rebota +2.5pp la semana siguiente. 'Gobierno y partidos' cae 4pp entre simpatizantes de izquierda.",
    tags: ["PSOE", "movilización"],
  },
  {
    date: "2024-06-09",
    kind: "election",
    label: "Europeas 9J",
    headline: "Europeas 9J · PP gana por poco",
    body:
      "Feijóo no despega. Sumar se desploma (~2pp) y Podemos recupera visibilidad marginal.",
    tags: ["europeas", "Sumar"],
  },
  {
    date: "2024-10-29",
    kind: "crisis",
    label: "DANA Valencia",
    headline: "DANA Valencia · catástrofe",
    body:
      "Gestión Mazón desencadena caída PP en la C. Valenciana; 'cambio climático' se duplica como preocupación.",
    tags: ["DANA", "clima", "PP"],
  },
  {
    date: "2025-06-12",
    kind: "crisis",
    label: "Caso Cerdán · UCO",
    headline: "Caso Cerdán · informe UCO",
    body:
      "Golpe reputacional al PSOE. 'Corrupción' sube 6pp en 2 oleadas, primera vez en top-5 desde 2022.",
    tags: ["corrupción", "PSOE"],
  },
  {
    date: "2025-09-20",
    kind: "policy",
    label: "Aranceles UE-US",
    headline: "Aranceles UE-US · tensión comercial",
    body:
      "Reactivación de 'crisis económica' como preocupación; techo para la narrativa de recuperación.",
    tags: ["economía", "UE"],
  },
  {
    date: "2026-02-08",
    kind: "election",
    label: "Cataluña · adelanto",
    headline: "Adelanto electoral en Cataluña",
    body:
      "ERC y Junts se enfrentan en pleno ciclo nacional. Bloque independentista se fragmenta en la pregunta de voto.",
    tags: ["Cataluña", "ERC", "Junts"],
  },
];

export const EVENT_KIND_LABEL: Record<EventKind | "all", string> = {
  all: "todos",
  election: "elecciones",
  crisis: "crisis",
  policy: "política",
  moment: "momento",
};
