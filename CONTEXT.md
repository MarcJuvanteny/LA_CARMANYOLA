# CLAUDE.md · La Carmanyola

Context del projecte per a qualsevol agent que treballi en aquest repositori. Llegeix-lo sencer abans de tocar codi.

---

## 1. Què és

Projecte de portfolio d'un Frontend Developer (perfil creatiu i tècnic). Consisteix en un **restaurant fictici, La Carmanyola**, i la seva **plataforma digital amb eines de màrqueting amb IA**.

- El restaurant és fictici, però tot ha de ser **creïble i viable**, com si obrís demà.
- **Tota la programació és real.** Pagaments amb Stripe en mode de prova, targetes reals d'Apple i Google Wallet, enviament real de correus i panell amb IA sobre dades simulades.
- Només són maquetes les peces de disseny gràfic (faixa, bossa, carta impresa, aparador).
- Termini: 4-6 setmanes.

**Concepte:** cuina tradicional catalana per emportar al Poblenou (22@, Barcelona). El format es diu **carmanyola**, la fiambrera catalana. L'envàs és rodó, com una cassola o un morter, amb un separador: la zona gran és el plat i la petita, la guarnició.

---

## 2. Regles de marca (no negociables)

- **Mai la paraula "bowl"** ni el vocabulari del poke ("base + proteïna + toppings"), tampoc en codi visible, textos alternatius o metadades. Vocabulari propi: **carmanyola, plat, guarnició, acompanyaments, picada, salsa a part**.
- **No ens definim contra el poke.** Ni "el poke català" ni superioritat ni purisme.
- **Tres idiomes:** català per defecte, castellà i anglès. Els noms dels plats sempre en català.
- **Ni "fit" ni "healthy".** No fem reclams nutricionals regulats (Reglament UE 1924/2006). La informació nutricional es mostra amb transparència, en un segon nivell.
- **Ni descomptes ni percentatges de rebaixa.** Les recompenses són producte, paraules i privilegis.
- **To:** proper, amb humor de veïnat; mai pretensiós, nostàlgic ni sarcàstic. Es tuteja sempre.
- **El Què Queda mai són "restes" ni "sobres".**

---

## 3. Identitat visual

### Colors (tokens)

| Token | Hex | Ús |
|---|---|---|
| `granat` | `#77160E` | Color principal, botons, fons de marca |
| `granat-clar` | `#8F2C29` | Patró sobre granat |
| `groc` | `#FFEA80` | Groc mantega: fons, text sobre granat, **tot el que proposa la IA** |
| `groc-intens` | `#F7D21E` | Patró sobre groc |
| `paper` | `#F7F2E9` | Fons general |
| `tinta` | `#38383A` | **Tot el text.** Negre o gris molt fosc, mai verd ni altres colors |

- Línies i vores: `#E6DCCB`. Text secundari: `#6E6259`.
- El groc **mai** és text sobre un fons clar.

### Tipografies

- **Redgato**, per a títols. **Sempre en pes Regular (400)**: amb negreta és il·legible. Tipografia de reserva: Rubik 400.
- **Gwendolyn**, la cursiva de la "La" del logotip. Només al logo.
- **Acumin Variable Concept**, per al cos de text (Adobe Fonts). Tipografia de reserva: Archivo.

### Logotip i recursos (`public/brand/`)

- **Imagotip:** "La" en cursiva i "Carmanyola" a sota, en versió granat i en versió groga.
- **Isotip:** un morter vist des de dalt, amb una C a dins, en versió granat i en versió groga.
- **Textura:** el morter repetit to sobre to; sembla unes estovalles. Hi ha versió granat i versió groga.
- **Fotos dels plats:** webp transparents de 900 px.
- **Header de la web:** l'imagotip gran i centrat; en fer scroll (més de 120 px) es converteix en l'isotip.
- Estil general: elegant, minimalista i modern, amb molt de color corporatiu i molt d'aire.

---

## 4. La carta (font de veritat: `docs/CARTA.md`)

**Carmanyoles de la casa**

| Plat | Preu | Notes |
|---|---|---|
| La de Sempre | 12,50 € | Botifarra amb mongetes de Santa Pau |
| Pollastre de Diumenge | 12,50 € | Pollastre amb prunes i pinyons |
| L'Esqueixat | 13,50 € | Plat fred |
| Tot Escalivat | 11,90 € | Vegà (amb anxoves, +2,00 €) |
| Fricandó amb Bolets | 13,90 € | Tardor |
| La Castanyera | 12,90 € | Tardor, vegetarià |

- **Fes-te'l tu:** 11,90 €. Plat, guarnició, 2 acompanyaments i salsa a part; la picada és inclosa. Té suplements.
- **Per acompanyar:**
  - Coca de recapte: 4,50 €
  - Pa amb tomàquet per muntar: 3,50 €
  - Olives i encurtits: 3,50 €
- **Postres (4,50 € cadascun):**
  - Crema catalana
  - Pa amb tomàquet i xocolata
  - Mel i mató

  Els panellets **no** són a la carta.
- **Begudes:**
  - Llimonada de marialluïsa: 2,90 €
  - Vermut sense alcohol: 3,20 €
  - Beguda de temporada: 3,20 €
  - Aigua: 1,80 €
- **El Dinar:** qualsevol carmanyola + beguda o postre per **+2 €**.
- **Salses sempre a part.** No hi ha fregidora.

---

## 5. Màrqueting que el codi ha de suportar

- **Operació Desbowlitzar:** campanya de llançament. Fa servir el recurs del ratllat (~~bowl~~ carmanyola).
- **La faixa "Desbowlitza aquí":** tanca l'envàs i porta un **QR únic per comanda** que porta a `/c/[codi]`.
- **El carnet de desbowlitzador:** una targeta a Apple i Google Wallet, sense app.
  - Cada comanda directa recupera una paraula del diccionari. Amb 8 paraules el carnet és complet.
  - Diccionari conegut: bowl→carmanyola, topping→picada, takeaway→per emportar, brunch→esmorzar de forquilla. Les altres 4 paraules estan pendents.
  - Nivells:
    - Aprenent: en registrar-se, amb un segell de regal.
    - Desbowlitzador: 1 carnet complet; regal, el postre.
    - Mestre de la carmanyola: 3 carnets; carmanyola reutilitzable i accés al Què Queda.
    - Desbowlitzador d'honor.
  - Els segells **només es sumen demanant directe**, mai a les plataformes.
- **L'hora del Què Queda:** l'última mitja hora de cada servei. Avís als nivells alts amb el que queda.
- **Padró d'ingredients:** els ingredients de temporada "s'empadronen" i "es donen de baixa".
  - Tardor: bolets (Solsonès), moniato (Baix Llobregat), castanyes (Montseny), codony (Segrià).
  - Hivern: calçots.
  - Primavera: pèsols i faves.
  - Estiu: tomàquet.

---

## 6. Stack

- **Web i panell:** Next.js (App Router) + TypeScript.
- **Estils:** Tailwind CSS amb els tokens de la secció 3.
- **Idiomes:** next-intl (`ca` per defecte, `es`, `en`).
- **Base de dades:** Supabase (Postgres, Auth per al panell, Storage, RLS).
- **Pagaments:** Stripe Checkout en **mode de prova** + webhook.
- **Wallet:** Apple Wallet (`.pkpass` amb passkit-generator + servei web de PassKit) i Google Wallet API.
- **Correu:** Resend o similar.
- **IA:** API d'un model de llenguatge, **cridada només des del servidor**.
- **Tasques programades:** Vercel Cron o funcions programades de Supabase.
- **Desplegament:** Vercel.

---

## 7. Mapa de pàgines

### Web pública

- `/`: inici.
- `/carta`: la carta.
- `/carta/[slug]`: fitxa de plat.
- `/fes-te-l-tu`: configurador del Fes-te'l tu.
- `/comanda`: cistella, hora de recollida i pagament amb Stripe.
- `/comanda/[id]`: confirmació, QR i botó "Afegeix al wallet".
- `/carnet`: alta al carnet, amb consentiment RGPD.
- `/c/[codi]`: destí del QR de la faixa; suma la paraula al carnet.
- `/padro`: el padró d'ingredients.
- `/desbowlitzador`: opcional.
- `/legal/...`: textos legals.

### Panell de l'amo (`/panel`, protegit)

- Resum
- Vendes
- Clients
- Franges
- Campanyes
- Què Queda
- Padró
- Carta
- Veu de marca

Al panell, **tot el que proposa o escriu la IA va en targetes grogues (`#FFEA80`) amb l'isotip**, i el que ja és de l'amo va en blanc.

---

## 8. Model de dades (resum)

- **Carta:**
  - `dishes`: preus en cèntims, textos ca/es/en, al·lèrgens, temporada, `que_queda_ok`.
  - `ingredients`: empadronat, comarca, proveïdor, alta, baixa, referència BEDCA.
  - `dish_ingredients`.
  - `build_options`.
- **Clients i comandes:**
  - `customers`: amb consentiment i data, nivell, ids del wallet, idioma i `simulated`.
  - `orders`: canal web, local o plataforma; QR únic d'un sol ús; `simulated`.
  - `order_items`.
- **Carnet:**
  - `words`: les 8 paraules.
  - `stamps`: una comanda dona com a màxim un segell.
  - `rewards`.
- **Màrqueting:**
  - `campaigns`: tipus, segment, missatge ca/es/en, canal, estat (esborrany, aprovada, enviada) i **raonament de la IA**.
  - `campaign_recipients`: amb la comanda de tornada.
  - `leftovers`.
  - `brand_voice`.
- **Atribució:** un client "torna gràcies a una campanya" si demana dins dels **14 dies** següents a l'enviament. Es compara amb un grup de control sense avís.

---

## 9. IA: principis

1. **Els números els calcula el codi (SQL); la IA redacta i explica.** Qui està en risc, quina franja és fluixa o què sobrarà surt de consultes, no del model.
2. **L'amo sempre aprova.** La IA proposa; no s'envia res sense aprovació.
3. **Cada proposta porta el seu "per què"**, amb les dades que la justifiquen.
4. **La veu de marca és el prompt.** Es guarda a `brand_voice` i s'edita des del panell.
5. **A la IA només li arriben les dades imprescindibles.** Res de dades personals que no calguin.

**Funcions base:**
- clients que deixen de venir, amb el missatge per recuperar-los;
- franges fluixes, amb la proposta de segell doble;
- previsió del Què Queda i ajust de la producció;
- avisos d'altes i baixes del padró;
- veu de marca, amb una zona per provar-la.

Hi ha una llista més llarga d'idees (Pregunta al panell, previsió de demanda amb el temps, Desbowlitzador, etc.). L'autor triarà quines es fan: **no n'implementis cap que no estigui demanada**.

---

## 10. Dades simulades

El restaurant no té clients reals. Les dades es generen amb `scripts/seed.ts`:

- **Unes 400 persones i 6 mesos de comandes**, totes amb `simulated = true`. Els noms es generen amb Faker.
- **Perfils de client:**
  - oficinistes (de dimarts a dijous al migdia);
  - ocasionals;
  - vegans;
  - famílies de dissabte;
  - clients que **deixen de venir**.
- **Patrons amagats a propòsit**, perquè la IA els pugui trobar:
  - dimarts i dimecres al vespre fluixos, divendres forts;
  - el fricandó puja quan plou, els plats freds baixen a la tardor;
  - pics a la Castanyada.
- **Fonts reals:** el temps històric de Barcelona (Open-Meteo), els festius (Open Data BCN), el calendari de temporada i BEDCA.
- **Restaurant viu:** una tasca diària afegeix comandes noves. Les comandes de prova fetes amb Stripe també entren.

---

## 11. Seguretat

- RLS a totes les taules: els clients només veuen les seves dades i només l'amo veu el panell.
- **Claus només al servidor** (`.env.local`, mai al client ni al repositori).
- Verificar la signatura dels webhooks de Stripe.
- QR d'un sol ús, amb límit de peticions a `/c/[codi]`.
- Consentiment RGPD amb data. La baixa de comunicacions es fa amb un clic.

---

## 12. Com treballar en aquest repo

- **Mòbil primer:** el client arriba des d'un QR. Tot ha de funcionar a 390 px.
- **Accessibilitat:**
  - `<button>` i `<a>` reals;
  - contrast AA;
  - `alt` als plats;
  - objectius tàctils de 44 px com a mínim.
- **Textos:** van als fitxers de traducció, mai escrits dins dels components.
- **Preus:** en cèntims a la base de dades, formatats com `12,50 €`.
- **Disseny de referència:** els dissenys aprovats són a Claude, en dos llenços:
  - "La Carmanyola · Web": la web pública;
  - "La Carmanyola · App del dueny": el panell amb IA.

  Si l'autor te'n passa captures o enllaços, segueix-los.
- **Documentació a `docs/`:** document mestre, carta, estratègia de màrqueting, branding, producte i tecnologia, i pla de treball.
- **Si un document contradiu aquest fitxer, mana el document mestre**, i avisa'n l'autor.
- **Per decidir, pregunta:** no inventis plats, preus, proveïdors ni paraules del diccionari.
- **Commits** petits i descriptius. No publiquis ni facis push a `main` sense que t'ho demanin.

### Pla per setmanes

1. Next.js + Supabase, tokens, idiomes i la carta llegida de la base de dades.
2. Cistella, Fes-te'l tu, Stripe en mode de prova i confirmació amb QR.
3. Carnet: alta, Apple i Google Wallet, i el QR de la faixa que suma paraules.
4. Dades simulades i panell: resum, vendes, clients i franges.
5. IA: veu de marca, campanyes, enviament, atribució, Què Queda i padró.
6. Poliment, accessibilitat, rendiment, cas d'estudi i vídeo.