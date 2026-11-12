# La Carmanyola · cas d'estudi

> Text per al portfolio. Els números del panell surten de dades simulades: digues-ho sempre que els ensenyis.

## En una frase

Un restaurant fictici de cuina catalana per emportar al Poblenou i tota la seva plataforma digital: la web de comandes amb pagament, un carnet de fidelitat al wallet del mòbil i un panell on la IA proposa i l'amo decideix.

**Rol:** marca, disseny de producte i desenvolupament frontend i de producte, de principi a fi.
**Durada:** sis setmanes (octubre i novembre del 2026).
**Enllaços:** [demo] · [codi]

---

## El repte

Un restaurant petit de menjar per emportar viu de les plataformes de repartiment: comissions del 25 al 35 % i cap dada dels seus clients. No sap qui ha deixat de venir, quina franja va fluixa ni què li sobrarà avui.

Em vaig plantejar una pregunta: **pot un negoci de barri tenir eines de màrqueting pròpies, amb IA, sense perdre ni el control ni la veu?** Per respondre-la calia un negoci creïble, així que el vaig inventar sencer, des del nom fins a la carta.

## La marca

- **El nom i el format.** La *carmanyola* és la fiambrera catalana. L'envàs és rodó, com una cassola o un morter, i el morter vist des de dalt és l'isotip.
- **L'Operació Desbowlitzar.** La campanya de llançament ratlla l'anglicisme i hi posa la paraula d'aquí: ~~bowl~~ carmanyola. Sense anar contra ningú: amb humor de veïnat.
- **Regles que el codi també compleix.** No hi ha "bowl", ni "healthy", ni descomptes. La veu de marca és un document editable des del panell que fa de prompt per a la IA, amb una zona per provar-la abans de desar.

## Què vaig construir

### La web (mòbil primer)
El client arriba des del QR de la faixa de l'envàs, així que tot està pensat per a 390 px.
- Carta en català, castellà i anglès. Els noms dels plats sempre en català.
- **Fes-te'l tu**: un configurador pas a pas amb suplements, opcions de temporada i els al·lèrgens de cada tria.
- Cistella, hora de recollida i **pagament real amb Stripe** en mode de prova, amb webhook verificat.
- Confirmació amb tiquet en PDF i un QR únic d'un sol ús per comanda.

### Fidelitat sense app
El **carnet de desbowlitzador** és una targeta d'Apple Wallet i de Google Wallet. Cada comanda directa recupera una paraula del diccionari (bowl → carmanyola, foodie → bona forquilla…). Amb vuit paraules, postres de regal, i el carnet torna a començar. Ni nivells ni rànquings: una sola recompensa, fàcil d'explicar al taulell.

La targeta s'actualitza sola: quan escaneges la faixa, el servei web de PassKit avisa el mòbil i hi apareix la paraula nova.

### El panell de l'amo
Resum del dia, vendes i franges, clients en risc, campanyes, **l'hora del Què Queda** (l'avís de l'última mitja hora per no llençar menjar), el **padró d'ingredients** de temporada, la carta editable amb fotos i la veu de marca. En català, castellà i anglès.

## Com treballa la IA

El més interessant del projecte no és fer servir IA, sinó **on no la fa servir**.

1. **Els números els calcula SQL; la IA només redacta.** Qui està en risc, quina franja va fluixa o quantes racions sobraran surt de funcions de Postgres. Al model només li arriben fets ja calculats i formatats.
2. **L'amo sempre aprova.** Res no s'envia sense un clic seu, i tot es pot desfer.
3. **Cada proposta porta el seu "per què"**, amb les dades que la justifiquen, plegat dins de la mateixa targeta.
4. **Cap dada personal.** Al model hi arriben agregats, mai noms ni correus de clients.
5. **Funciona sense IA.** Cada targeta té una plantilla amb els números bons. El panell la mostra a l'instant i la IA la redacta en segon pla; el text es desa i no es torna a demanar fins que les dades canvien. Si el model falla o s'acaba la quota, l'amo ni se n'adona.

Al panell, tot el que proposa la IA va en targetes grogues amb l'isotip; el que ja és de l'amo, en blanc. La diferència es veu d'un cop d'ull.

## El restaurant viu

Un restaurant fictici no té clients, així que en vaig simular uns 400, amb sis mesos de comandes. El simulador és determinista i hi amaga patrons perquè el panell els pugui trobar:
- dimarts i dimecres al vespre fluixos i divendres forts;
- el fricandó puja quan plou (amb el temps real de Barcelona, d'Open-Meteo);
- els plats freds baixen a la tardor i hi ha un pic a la Castanyada (amb els festius d'Open Data BCN).

Un `pg_cron` l'avança cada deu minuts, així que el panell sempre té dades d'avui. Les comandes de prova reals, pagades amb Stripe, entren al mateix flux.

## Decisions tècniques

- **Next.js (App Router) amb Server Components i Server Actions.** Les claus i les crides a la IA no surten mai del servidor.
- **Supabase**: Postgres amb RLS a totes les taules, Auth per al panell, Storage per a les fotos i `pg_cron` + `pg_net` per a les tasques programades. Hi ha 22 migracions versionades.
- **next-intl sense prefix a l'URL**, perquè el QR de la faixa funcioni igual per a tothom. La web pren l'idioma del navegador; el panell, el seu.
- **Atribució honesta.** Cada campanya té un grup de control que no rep l'avís, i un client "torna" si demana en els 14 dies següents. El panell compara tots dos grups en lloc de presumir de xifres.
- **Tests** del simulador, de les comandes i de la capa d'IA (memòria, quota i validació de les respostes), amb Vitest.

## Accessibilitat

- Botons i enllaços reals, objectius tàctils de 44 px i el panell navegable amb teclat. El calaix de la IA es tanca amb Esc i torna el focus on era.
- Contrast AA comprovat per a tots els parells de colors de la marca. El groc mantega mai no és text sobre fons clar.
- Text alternatiu a tots els plats i les dades dels gràfics també en taula per als lectors de pantalla.

## Què n'he après

- **La IA és més útil com a redactora que com a analista.** Quan els números surten de SQL, la IA no s'equivoca de dades i el text és més bo.
- **Una plantilla per defecte ho canvia tot.** Pensar el panell perquè funcioni sense model el va fer més ràpid i més robust.
- **La marca és una restricció de producte**, no només de disseny: les regles de to i vocabulari es van convertir en codi.

## Què faria després

Previsió de demanda amb el temps, preguntes lliures al panell ("què va passar dimarts?") i proves A/B dels missatges de les campanyes.

---

## Guió del vídeo (2-3 minuts)

1. **0:00 · El problema** (15 s). Pla del Poblenou o del logotip. "Un restaurant petit no coneix els seus clients."
2. **0:15 · La marca** (20 s). Desbowlitzar: el ratllat bowl → carmanyola. Faixa i envàs.
3. **0:35 · Comanda al mòbil** (40 s). Carta → Fes-te'l tu → paga amb la targeta de prova 4242 → confirmació en verd → descarrega el tiquet.
4. **1:15 · El carnet** (25 s). Escaneja el QR de la faixa → +1 paraula → el carnet al wallet. Si no tens el wallet configurat, mostra-ho gravat a part.
5. **1:40 · El panell** (50 s). Resum → Vendes (obre el calaix de la IA: "per què ho proposo") → una campanya: reescriu-la, aprova-la → Carta: canvia un preu i mira com canvia a la web → prepara l'avís del Què Queda. Canvia l'idioma del panell a l'anglès un moment.
6. **2:30 · Tancament** (15 s). "La IA proposa, l'amo decideix." Enllaç a la demo i al codi.

Consell: grava a 1440 px d'amplada per al panell i amb el mòbil (o l'emulador de 390 px) per a la web.
