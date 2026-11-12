# La Carmanyola · cas d'estudi (esborrany)

> Esborrany per adaptar al portfolio. Els números de la demo surten de dades simulades; digues-ho sempre.

## En una frase

Un restaurant fictici de cuina catalana per emportar al Poblenou i la seva plataforma digital: web de comandes amb pagament, un carnet de fidelitat al wallet i un panell on la IA proposa i l'amo decideix.

## El repte

Els restaurants petits de menjar per emportar depenen de les plataformes (comissions del 25-35 %) i no coneixen els seus clients. Volia demostrar que una marca petita pot tenir eines de màrqueting pròpies, amb IA, sense perdre el control ni la veu.

## Què vaig fer

- **Marca:** nom, to de veu de veïnat, l'Operació Desbowlitzar (~~bowl~~ carmanyola) i un sistema visual amb el morter com a isotip.
- **Web (mòbil primer):** carta en tres idiomes, el configurador Fes-te'l tu, cistella i pagament amb Stripe, confirmació amb tiquet en PDF.
- **Fidelitat sense app:** el carnet de desbowlitzador. Cada comanda directa recupera una paraula del diccionari (bowl → carmanyola, foodie → bona forquilla…). Amb vuit, postres de regal. El QR únic de la faixa de cada envàs suma la paraula.
- **Panell de l'amo:** vendes i franges, clients en risc, campanyes, l'hora del Què Queda (l'avís de l'última mitja hora per no llençar menjar), el padró d'ingredients de temporada i la carta editable.

## Com treballa la IA

1. **Els números els calcula SQL; la IA només redacta i explica.** Qui està en risc o quina franja va fluixa surt de consultes, no del model.
2. **L'amo sempre aprova.** Res no s'envia sense un clic seu, i es pot desfer.
3. **Cada proposta porta el seu "per què"**, amb les dades que la justifiquen.
4. **La veu de marca és el prompt**, editable des del panell, i el codi revisa les paraules prohibides.
5. **Sense IA també funciona:** si el model no respon o s'acaba la quota, el panell fa servir plantilles.

## El restaurant viu

Un simulador determinista genera unes 400 persones i sis mesos de comandes amb patrons amagats (dimarts al vespre fluix, el fricandó puja quan plou, pics a la Castanyada). Un cron l'avança cada deu minuts, així que el panell sempre té dades del dia.

## Stack

Next.js (App Router) · TypeScript · Tailwind · next-intl (ca/es/en) · Supabase (Postgres, RLS, Auth, Storage, pg_cron) · Stripe Checkout en mode de prova · Gemini · Vercel.

## Resultats per explicar

- Una comanda real de principi a fi: carta → Stripe → confirmació → paraula sumada al carnet.
- Atribució honesta de les campanyes: grup de control i finestra de 14 dies.
- Accessibilitat: botons i enllaços reals, objectius de 44 px, contrast AA, panell navegable amb teclat.

## Què faria després

Previsió de demanda amb el temps, preguntes lliures al panell i proves A/B dels missatges.

---

## Guió del vídeo (2-3 minuts)

1. **0:00 · El problema** (15 s). Pla del Poblenou o del logotip. "Un restaurant petit no coneix els seus clients."
2. **0:15 · La marca** (20 s). Desbowlitzar: el ratllat bowl → carmanyola. Faixa i envàs.
3. **0:35 · Comanda al mòbil** (40 s). Carta → Fes-te'l tu → paga amb la targeta de prova 4242 → confirmació en verd → descarrega el tiquet.
4. **1:15 · El carnet** (25 s). Escaneja el QR de la faixa → +1 paraula → el carnet al wallet. Si no tens el wallet configurat, mostra-ho gravat a part.
5. **1:40 · El panell** (50 s). Resum → Vendes (obre el calaix de la IA: "per què ho proposo") → una campanya: reescriu-la, aprova-la → Carta: canvia un preu i mira com canvia a la web → prepara l'avís del Què Queda.
6. **2:30 · Tancament** (15 s). "La IA proposa, l'amo decideix." Enllaç a la demo i al codi.

Consell: grava a 1440 px d'amplada per al panell i amb el mòbil (o l'emulador de 390 px) per a la web.
