// Traduccions dels textos que es desen a la base de dades en català (campanyes i avisos del padró).
// Van a la columna `i18n` (jsonb) de cada fila: { es: {...}, en: {...} }. El que no hi és, es mostra en català.
// Els números {{…}} els omple el panell amb dades de SQL; {{alta}} i {{baixa}} són les dates de l'ingredient.
// Els fan servir els seeds; la migració 20261112110000_traduccions.sql en porta una còpia per a les bases ja creades.

// `type` i no `interface`: així es poden passar tal qual a sql.json().
export type TraduccioCampanya = {
  title?: string;
  chips?: string[];
  reasons?: string[];
  schedule_text?: string;
  schedule_reason?: string;
  proposed_label?: string;
  simpler_label?: string;
};

export type TraduccioAvis = {
  title?: string;
  reasons?: string[];
  /** L'anunci per als clients (web del padró). Si l'amo el reescriu, es descarta i surt el seu, en català. */
  announcement?: string;
};

export type PerIdioma<T> = { es?: T; en?: T };

export const traduccionsCampanyes: Record<string, PerIdioma<TraduccioCampanya>> = {
  "recupera-habituals": {
    es: {
      title: "Recupera {{n}} habituales",
      chips: ["{{n}} clientes", "Venían 1-2 veces por semana", "Más de 14 días sin venir", "{{a_mig}} con el carnet a medias"],
      reasons: [
        "Son el {{pct_clients}} de los clientes pero hacían el **{{pct_comandes}} de los pedidos con carnet**. Los últimos 3 meses gastaron unos {{cost}} al mes.",
        "A {{a_mig}} de los {{n}} les faltan 3 palabras o menos para completar el carnet. Es el mejor gancho: no hace falta ningún descuento.",
        "La última recuperación hizo volver al **{{tornat}}** en 14 días. Sin aviso, solo volvió el {{control}}.",
      ],
      schedule_text: "Jueves a las 11:30.",
      schedule_reason: "Es cuando este grupo suele decidir dónde come.",
      proposed_label: "Propuesta hoy a las 6:00",
      simpler_label: "Sin mencionar el padró",
    },
    en: {
      title: "Win back {{n}} regulars",
      chips: ["{{n}} customers", "Came 1-2 times a week", "Over 14 days without coming", "{{a_mig}} with the card half full"],
      reasons: [
        "They're {{pct_clients}} of customers but placed **{{pct_comandes}} of card orders**. Over the last 3 months they spent about {{cost}} a month.",
        "{{a_mig}} of the {{n}} are 3 words or fewer from completing the card. That's the best hook: no discount needed.",
        "The last win-back brought back **{{tornat}}** within 14 days. Without a message, only {{control}} came back.",
      ],
      schedule_text: "Thursday at 11:30.",
      schedule_reason: "That's when this group usually decides where to have lunch.",
      proposed_label: "Proposed today at 6:00",
      simpler_label: "Without mentioning the padró",
    },
  },
  carxofa: {
    es: {
      title: "Llega la alcachofa del Prat",
      chips: ["{{bolets_n}} clientes", "Recibieron el aviso de las setas", "Alta en el padró"],
      reasons: [
        "El aviso de las setas empadronadas hizo volver al **{{bolets_tornat}}** en 14 días.",
        "Los {{bolets_n}} que lo recibieron son el público natural de un ingrediente nuevo.",
        "No hay ninguna promoción: el alta en el padró ya es la noticia.",
      ],
      schedule_text: "El día del alta, a las 10:00.",
      schedule_reason: "Antes de que se decida la comida.",
      proposed_label: "Propuesta ayer",
    },
    en: {
      title: "The Prat artichoke is arriving",
      chips: ["{{bolets_n}} customers", "Got the mushroom message", "Joins the padró"],
      reasons: [
        "The message about the mushrooms joining the padró brought back **{{bolets_tornat}}** within 14 days.",
        "The {{bolets_n}} who got it are the natural audience for a new ingredient.",
        "There's no promotion: joining the padró is the news.",
      ],
      schedule_text: "On the day it joins, at 10:00.",
      schedule_reason: "Before people decide on lunch.",
      proposed_label: "Proposed yesterday",
    },
  },
  // Campanyes enviades (dades simulades)
  "benvinguda-estiu": { es: { title: "Bienvenida a los nuevos del verano" }, en: { title: "Welcome to summer's newcomers" } },
  "recuperacio-setembre": { es: { title: "Recuperación de septiembre" }, en: { title: "September win-back" } },
  bolets: { es: { title: "Setas empadronadas" }, en: { title: "Mushrooms join the padró" } },
};

export const traduccionsAvisos: Record<string, PerIdioma<TraduccioAvis>> = {
  "alta-carxofa": {
    es: {
      title: "La alcachofa del Prat pide empadronarse",
      reasons: [
        "En el calendario de temporada, la alcachofa del Prat entra el **{{alta}}**.",
        "Puede entrar en el Fes-te'l tu como guarnición sin tocar ningún plato de la casa.",
        "Ya tienes preparada la campaña para quienes recibieron el aviso de las setas.",
      ],
      announcement:
        "Nueva vecina en el padró: la alcachofa del Prat se empadrona en La Carmanyola a partir del {{alta}}. Viene del Baix Llobregat y se quedará hasta la primavera.",
    },
    en: {
      title: "The Prat artichoke wants to join the padró",
      reasons: [
        "On the seasonal calendar, the Prat artichoke comes in on **{{alta}}**.",
        "It can go into Fes-te'l tu as a side without changing any house dish.",
        "The campaign for people who got the mushroom message is ready.",
      ],
      announcement: "New neighbour on the padró: the Prat artichoke joins La Carmanyola from {{alta}}. It comes from the Baix Llobregat and will stay until spring.",
    },
  },
  "baixa-tomaquet": {
    es: {
      title: "El tomate se da de baja",
      reasons: [
        "La temporada de proximidad se acaba el **{{baixa}}**.",
        "Solo afecta a L'Esqueixat, que ya baja con la llegada del otoño.",
        "No hace falta avisar a nadie con una campaña: basta con el anuncio en la web.",
      ],
      announcement: "El tomate se da de baja del padró hasta el verano. Gracias por todos los servicios, vecino.",
    },
    en: {
      title: "Tomatoes leave the padró",
      reasons: [
        "The local season ends on **{{baixa}}**.",
        "It only affects L'Esqueixat, which is already dropping now that autumn is here.",
        "No campaign needed: the announcement on the website is enough.",
      ],
      announcement: "Tomatoes leave the padró until summer. Thanks for everything, neighbour.",
    },
  },
};

/** Etiquetes de les campanyes que demana l'amo (les prepara la IA, en català). */
export const etiquetesPeticio = {
  araMateix: { ca: "Demanada per tu · ara mateix", es: "Pedida por ti · ahora mismo", en: "Requested by you · just now" },
  aquestaNit: { ca: "Demanada per tu · preparada aquesta nit", es: "Pedida por ti · preparada esta noche", en: "Requested by you · prepared overnight" },
  proposadaIA: { ca: "Proposada per la IA", es: "Propuesta por la IA", en: "Proposed by the AI" },
} as const;
