// Traduccions del contingut de la web que no és a la base de dades (fitxes i padró il·lustrat).
// El català és a contingut.ts i és la font: aquí només hi ha el castellà i l'anglès.
// Els noms dels plats no es tradueixen mai (CONTEXT.md §2).

import type { CartaPadro, FitxaWeb } from "./contingut";

type TextosFitxa = Partial<Pick<FitxaWeb, "lema" | "resum" | "descripcio" | "nota" | "notaAlergens">> & {
  zones?: FitxaWeb["zones"];
  empadronats?: string[];
};
type TextosPadro = Pick<CartaPadro, "ingredient" | "origen" | "fins" | "cita" | "qui" | "foto">;

export const fitxesIdiomes: Record<"es" | "en", Record<string, TextosFitxa>> = {
  es: {
    "fricando-amb-bolets": {
      lema: "Otoño",
      resum: "Ternera a fuego lento, setas, boniato y arroz.",
      descripcio: "Ternera a fuego lento tres horas con moixernons y setas del Solsonès salteadas hoy. Con boniato asado y arroz del Delta.",
      zones: { gran: "Fricandó con su jugo, setas y boniato", petita: "Arroz del Delta" },
      nota: "Aparte, la picada en sobre. Sin salsa: el jugo del guiso es el plato.",
      empadronats: ["Setas", "Boniato"],
      notaAlergens: "Sin la picada, no lleva frutos de cáscara.",
    },
    "la-castanyera": {
      lema: "Otoño · vegetariano",
      resum: "Boniato, castañas, setas y queso de cabra.",
      descripcio: "Boniato asado con castañas del Montseny, setas salteadas y queso de cabra. Con un toque de miel y romero.",
      zones: { gran: "Boniato, castañas y setas", petita: "Queso de cabra" },
      nota: "Aparte, la picada en sobre y la vinagreta de miel.",
      empadronats: ["Castañas", "Boniato", "Setas"],
    },
    "la-de-sempre": {
      lema: "La más contundente",
      resum: "Butifarra tostada con judías de Santa Pau.",
      descripcio: "Butifarra tostada a la plancha con judías de Santa Pau salteadas con ajo y perejil.",
      zones: { gran: "Butifarra tostada", petita: "Judías de Santa Pau" },
      nota: "Aparte, el allioli. Como siempre.",
    },
    "pollastre-de-diumenge": {
      lema: "De domingo, cada día",
      resum: "Pollo de payés, ciruelas, piñones y arroz.",
      descripcio: "Pollo de payés asado a fuego lento con ciruelas y piñones, como el de la abuela. Con arroz blanco.",
      zones: { gran: "Pollo con ciruelas y piñones", petita: "Arroz blanco" },
      nota: "El jugo del asado, aparte, para que el arroz no se ablande.",
    },
    "l-esqueixat": {
      lema: "Plato frío",
      resum: "Bacalao desmigado, judías y aceitunas negras.",
      descripcio: "Bacalao desmigado a mano con tomate, cebolla, pimiento, aceitunas negras y judías del ganxet.",
      zones: { gran: "Esqueixada de bacalao", petita: "Judías del ganxet" },
      nota: "Aparte, la vinagreta. Se come frío.",
    },
    "tot-escalivat": {
      lema: "Vegano",
      resum: "Escalivada, garbanzos de Oristà y aceitunas.",
      descripcio: "Berenjena, pimiento y cebolla escalivados a la brasa, con garbanzos de Oristà y aceitunas arbequinas.",
      zones: { gran: "Escalivada", petita: "Garbanzos de Oristà" },
      nota: "Aparte, el romesco. Si lo quieres con anchoas, pídelo.",
    },
    "fes-te-l-tu": {
      resum: "Un principal, una base y tres complementos. La picada, incluida.",
      descripcio: "Elige un principal, una base (arroz, garbanzos o alubias) y tres complementos. La picada va incluida.",
      zones: { gran: "El principal y los complementos", petita: "La base" },
    },
    "crema-catalana": {
      resum: "El quemado, aparte.",
      descripcio: "Crema catalana hecha cada mañana. El azúcar lo quemamos al recogerla.",
      zones: { gran: "Crema", petita: "Azúcar para quemar" },
    },
  },
  en: {
    "fricando-amb-bolets": {
      lema: "Autumn",
      resum: "Slow-cooked veal, mushrooms, sweet potato and rice.",
      descripcio: "Veal slow-cooked for three hours with dried St George's mushrooms, plus Solsonès mushrooms sautéed today. With roast sweet potato and Delta rice.",
      zones: { gran: "Fricandó in its own juices, mushrooms and sweet potato", petita: "Delta rice" },
      nota: "Picada on the side in a sachet. No sauce: the stew's juices are the dish.",
      empadronats: ["Mushrooms", "Sweet potato"],
      notaAlergens: "Without the picada, it has no tree nuts.",
    },
    "la-castanyera": {
      lema: "Autumn · vegetarian",
      resum: "Sweet potato, chestnuts, mushrooms and goat's cheese.",
      descripcio: "Roast sweet potato with Montseny chestnuts, sautéed mushrooms and goat's cheese. With a touch of honey and rosemary.",
      zones: { gran: "Sweet potato, chestnuts and mushrooms", petita: "Goat's cheese" },
      nota: "Picada in a sachet and honey vinaigrette on the side.",
      empadronats: ["Chestnuts", "Sweet potato", "Mushrooms"],
    },
    "la-de-sempre": {
      lema: "The hearty one",
      resum: "Griddled butifarra sausage with Santa Pau beans.",
      descripcio: "Butifarra sausage griddled and served with Santa Pau beans sautéed with garlic and parsley.",
      zones: { gran: "Griddled butifarra", petita: "Santa Pau beans" },
      nota: "Allioli on the side. As always.",
    },
    "pollastre-de-diumenge": {
      lema: "Sunday lunch, every day",
      resum: "Free-range chicken, prunes, pine nuts and rice.",
      descripcio: "Free-range chicken slow-roasted with prunes and pine nuts, just like grandma's. With white rice.",
      zones: { gran: "Chicken with prunes and pine nuts", petita: "White rice" },
      nota: "The roasting juices come on the side so the rice stays just right.",
    },
    "l-esqueixat": {
      lema: "Served cold",
      resum: "Shredded salt cod, beans and black olives.",
      descripcio: "Hand-shredded salt cod with tomato, onion, pepper, black olives and ganxet beans.",
      zones: { gran: "Salt cod esqueixada", petita: "Ganxet beans" },
      nota: "Vinaigrette on the side. Eaten cold.",
    },
    "tot-escalivat": {
      lema: "Vegan",
      resum: "Roasted vegetables, Oristà chickpeas and olives.",
      descripcio: "Aubergine, peppers and onion roasted over embers, with Oristà chickpeas and Arbequina olives.",
      zones: { gran: "Escalivada", petita: "Oristà chickpeas" },
      nota: "Romesco on the side. Ask if you'd like anchovies.",
    },
    "fes-te-l-tu": {
      resum: "One main, one base and three extras. Picada included.",
      descripcio: "Pick a main, a base (rice, chickpeas or beans) and three extras. Picada included.",
      zones: { gran: "The main and the extras", petita: "The base" },
    },
    "crema-catalana": {
      resum: "Burnt sugar on the side.",
      descripcio: "Crema catalana made every morning. We burn the sugar when you pick it up.",
      zones: { gran: "Custard", petita: "Sugar to burn" },
    },
  },
};

export const padroIdiomes: Record<"es" | "en", TextosPadro[]> = {
  es: [
    { ingredient: "Setas", origen: "Solsonès · recogidas a mano", fins: "Empadronadas hasta diciembre", cita: "«La seta no se cultiva: se busca.»", qui: "Montse, setera del Solsonès", foto: "Montse en el bosque" },
    { ingredient: "Castañas", origen: "Montseny · de castaño viejo", fins: "Empadronadas hasta noviembre", cita: "«Cuando caen solas, es que están a punto.»", qui: "Ramon, castañero del Montseny", foto: "Ramon bajo el castaño" },
    { ingredient: "Boniato", origen: "Baix Llobregat · tierra del delta", fins: "Empadronado hasta enero", cita: "«Del campo a tu carmanyola hay quince kilómetros.»", qui: "Pau, payés del delta", foto: "Pau en el campo" },
    { ingredient: "Membrillo", origen: "Segrià · para el allioli de membrillo", fins: "Empadronado hasta diciembre", cita: "«El membrillo huele a otoño todo el año.»", qui: "Núria, de la huerta del Segrià", foto: "Núria en la huerta" },
  ],
  en: [
    { ingredient: "Mushrooms", origen: "Solsonès · hand-picked", fins: "Registered until December", cita: "“You don't grow mushrooms: you go looking for them.”", qui: "Montse, mushroom forager from the Solsonès", foto: "Montse in the woods" },
    { ingredient: "Chestnuts", origen: "Montseny · from old chestnut trees", fins: "Registered until November", cita: "“When they fall on their own, they're ready.”", qui: "Ramon, chestnut grower from the Montseny", foto: "Ramon under the chestnut tree" },
    { ingredient: "Sweet potato", origen: "Baix Llobregat · delta soil", fins: "Registered until January", cita: "“It's fifteen kilometres from the field to your carmanyola.”", qui: "Pau, farmer from the delta", foto: "Pau in the field" },
    { ingredient: "Quince", origen: "Segrià · for the quince allioli", fins: "Registered until December", cita: "“Quince smells of autumn all year round.”", qui: "Núria, from the Segrià orchards", foto: "Núria in the orchard" },
  ],
};
