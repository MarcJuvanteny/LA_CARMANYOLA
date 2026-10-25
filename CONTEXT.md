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
  - En fer-se el carnet, el client rep **1 segell de regal**.
  - Cada comanda directa (web o local) recupera **1 paraula** del diccionari. Màxim 1 segell per comanda.
  - Amb **8 paraules** el carnet és complet: recompensa **"postres de regal"** i comença un carnet nou, buit.
  - **No hi ha cap altra recompensa**, ni nivells ni rànquings.
  - Diccionari conegut: bowl→carmanyola, topping→picada, takeaway→per emportar, brunch→esmorzar de forquilla. Les altres 4 paraules estan pendents.
  - Els segells **només es sumen demanant directe**, mai a les plataformes.
  - **Targeta del wallet:** nom, paraules recuperades (X de 8), la paraula que falta i el nombre de carnets completats.
- **L'hora del Què Queda:** l'última mitja hora de cada servei. Avís amb el que queda a **tots els clients amb carnet i consentiment comercial**.
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
  - `customers`: amb consentiment i data, ids del wallet, idioma i `simulated`.
  - `orders`: canal web, local o plataforma; QR únic d'un sol ús; `simulated`.
  - `order_items`.
- **Carnet:**
  - `words`: les 8 paraules.
  - `stamps`: una comanda dona com a màxim un segell; cada segell porta el número de carnet (1, 2, 3…).
  - `rewards`: només "postres de regal", una per carnet completat.
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

## 13. Descartat

Decisions de producte que ja no es fan. No les tornis a introduir.

- **Nivells i rànquings del carnet.**

### Pla per setmanes

# Carta · La Carmanyola

> Fuente de verdad de los platos para la web, la base de datos y el panel. Detalle de fichas, costes y gramajes en `01-carta`.
> Última actualización: 24 de octubre de 2026.

**Formato:** cuina catalana per emportar en carmanyola. El envase es redondo, como una cassola o el mortero del isotipo (Ø ≈ 18 cm, ≈ 1.000 ml), con un separador interior: el plat en la zona grande y la guarnició en la pequeña. Se cierra con la faixa "Desbowlitza aquí" y el QR único del pedido. Nunca se dice "bowl".

**Vocabulario:** plat, guarnició, acompanyaments, picada, salsa a part. La salsa va siempre aparte. La picada va en sobre para llevar y encima en el local.

**Alérgenos:** se usan los 14 de declaración obligatoria en la UE. "Sulfitos\*" significa posibles, por el vinagre de vino o el vi ranci; hay que confirmarlo con la ficha del proveedor. Cocina compartida: no se garantiza la ausencia de trazas.

---

## Carmanyoles de la casa

### La de Sempre
- **Sección:** casa
- **Precio:** 12,50 €
- **Temporada:** todo el año
- **Etiquetas:** caliente, el más contundente
- **Alérgenos:** gluten, frutos de cáscara (picada), huevo (allioli), sulfitos\* (cebolla encurtida)
- **Ingredientes principales:** mongetes de Santa Pau, botifarra esmicolada y tostada a la plancha (Cansaladeria Ferrer, Poblenou), cebolla roja encurtida. Guarnició: pimiento escalivado. Salsa: allioli. Picada.
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Botifarra de la Cansaladeria Ferrer, esmicolada i torrada a la planxa, sobre mongetes de Santa Pau. Pebrot escalivat al costat i allioli a part.
  - **ES:** Butifarra de la Cansaladeria Ferrer, desmigada y tostada a la plancha, sobre judías de Santa Pau. Pimiento escalivado al lado y allioli aparte.
  - **EN:** Butifarra sausage from Cansaladeria Ferrer, crumbled and griddled, over Santa Pau white beans. Roasted pepper on the side, allioli to add yourself.

### Pollastre de Diumenge
- **Sección:** casa
- **Precio:** 12,50 €
- **Temporada:** todo el año
- **Etiquetas:** caliente
- **Alérgenos:** gluten, frutos de cáscara (picada), sulfitos (vi ranci; vinagre de la salsa verde)
- **Ingredientes principales:** contramuslo de pollo de payés (Osona) rustido con vi ranci y deshilachado, ciruelas pasas, piñones tostados, cebolla escalivada. Guarnició: arroz del Delta. Salsa: salsa verda. Picada.
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Cuixa de pollastre de pagès rostida amb vi ranci i desfilada, amb prunes i pinyons. Arròs del Delta al costat. Diumenge, de dilluns a dissabte.
  - **ES:** Muslo de pollo de payés asado con vino rancio y deshilachado, con ciruelas y piñones. Arroz del Delta al lado. Domingo, de lunes a sábado.
  - **EN:** Free-range chicken thigh roasted with vi ranci and pulled, with prunes and pine nuts. Ebro Delta rice on the side. Sunday lunch, Monday to Saturday.

### L'Esqueixat
- **Sección:** casa
- **Precio:** 13,50 €
- **Temporada:** todo el año (en verano, el pimiento pasa a ser tomate)
- **Etiquetas:** frío, pescado
- **Alérgenos:** pescado, gluten, frutos de cáscara, sulfitos\* (romesco)
- **Ingredientes principales:** bacalao desalado esqueixat a mano, mongetes de Santa Pau, aceitunas negras, cebolleta tierna, aceite de oliva virgen extra. Guarnició: pimiento escalivado; en verano, tomate (padró: Maresme). Salsa: romesco.
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Bacallà esqueixat a mà, mongetes de Santa Pau, olives negres i ceba tendra. Entre l'esqueixada i l'empedrat. Romesco a part.
  - **ES:** Bacalao desmigado a mano, judías de Santa Pau, aceitunas negras y cebolleta. Entre la esqueixada y el empedrat. Romesco aparte.
  - **EN:** Hand-shredded salt cod with Santa Pau beans, black olives and spring onion. Halfway between esqueixada and empedrat. Romesco on the side.

### Tot Escalivat
- **Sección:** casa
- **Precio:** 11,90 €
- **Temporada:** todo el año
- **Etiquetas:** vegano, templado
- **Alérgenos:** gluten, frutos de cáscara (picada y romesco), sulfitos\*. Con anchoas: + pescado.
- **Ingredientes principales:** pimiento, berenjena y cebolla escalivados al horno cada mañana, aceitunas arbequinas (Les Garrigues), aceite de oliva en crudo. Guarnició: cigrons d'Oristà. Salsa: romesco. Picada.
- **Suplementos:** con anchoas de l'Escala +2,00 € (deja de ser vegano)
- **Descripción corta:**
  - **CA:** Pebrot, albergínia i ceba escalivats al forn cada matí, amb cigrons d'Oristà i olives arbequines. Romesco a part.
  - **ES:** Pimiento, berenjena y cebolla escalivados al horno cada mañana, con garbanzos de Oristà y aceitunas arbequinas. Romesco aparte.
  - **EN:** Peppers, aubergine and onion roasted every morning, with Oristà chickpeas and Arbequina olives. Romesco on the side.

### Fricandó amb Bolets
- **Sección:** casa
- **Precio:** 13,90 €
- **Temporada:** otoño
- **Etiquetas:** caliente, de temporada, padró
- **Alérgenos:** gluten (harina y picada), frutos de cáscara (picada), sulfitos (vi ranci)
- **Ingredientes principales:** ternera (llata) a xup-xup tres horas con moixernons, deshilachada; bolets salteados (padró: Solsonès); moniato rostit (padró: Baix Llobregat). Guarnició: arroz del Delta. Sin salsa aparte: el jugo es el plat. Picada.
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Vedella a xup-xup tres hores amb moixernons i bolets del Solsonès saltejats avui. Amb moniato rostit i arròs del Delta.
  - **ES:** Ternera a fuego lento tres horas con moixernons y setas del Solsonès salteadas hoy. Con boniato asado y arroz del Delta.
  - **EN:** Veal slow-cooked for three hours with dried St George's mushrooms, plus Solsonès mushrooms sautéed today. With roast sweet potato and Delta rice.

### La Castanyera
- **Sección:** casa
- **Precio:** 12,90 €
- **Temporada:** otoño
- **Etiquetas:** vegetariano (vegano sin el queso), sin gluten por receta, de temporada, padró
- **Alérgenos:** leche (queso)
- **Ingredientes principales:** moniato rostit (padró: Baix Llobregat), castañas de Viladrau (padró: Montseny), bolets salteados (padró: Solsonès), queso de cabra de la Garrotxa. Guarnició: mongetes de Santa Pau. Salsa: allioli de codony, sin huevo (padró: Segrià).
- **Suplementos:** sin queso, vegano (sin cambio de precio)
- **Descripción corta:**
  - **CA:** Moniato rostit, castanyes de Viladrau, bolets i formatge de cabra de la Garrotxa, amb mongetes al costat. Allioli de codony a part.
  - **ES:** Boniato asado, castañas de Viladrau, setas y queso de cabra de la Garrotxa, con judías al lado. Allioli de membrillo aparte.
  - **EN:** Roast sweet potato, Viladrau chestnuts, mushrooms and Garrotxa goat's cheese, with white beans on the side. Quince allioli on the side.

---

## Fes-te'l tu

### Fes-te'l tu
- **Sección:** Fes-te'l tu
- **Precio:** 11,90 €
- **Temporada:** todo el año (las opciones de otoño, solo en otoño)
- **Etiquetas:** configurable; con ruta vegana y ruta sin gluten
- **Alérgenos:** según la combinación. Picada: gluten y frutos de cáscara. Allioli: huevo. Romesco: gluten, frutos de cáscara y sulfitos\*. Bacalao y anchoas: pescado. Queso: leche. Fricandó: gluten y sulfitos.
- **Ingredientes principales:**
  - **Plat (1):** botifarra esmicolada, pollastre rostit desfilat, bacallà esqueixat, escalivada (vegano). En otoño: fricandó o bolets i moniato (vegetariano).
  - **Guarnició (1):** mongetes de Santa Pau, arròs de fons, cigrons d'Oristà.
  - **Acompanyaments (2):** pebrot escalivat, albergínia escalivada, ceba encurtida, olives arbequines, prunes i pinyons, formatge de cabra, anxoves de l'Escala. En otoño: moniato rostit (padró: Baix Llobregat) y castanyes (padró: Montseny).
  - **Salsa a part (1):** romesco, allioli, salsa verda. En otoño: allioli de codony (padró: Segrià).
  - **Picada** incluida (se puede pedir "sense picada").
- **Suplementos:**
  - bacallà +1,50 €
  - fricandó +2,00 €
  - formatge de cabra +1,00 €
  - anxoves +2,00 €
  - acompanyament extra +1,00 €
  - salsa extra +0,80 €
- **Descripción corta:**
  - **CA:** Tria el plat, la guarnició, dos acompanyaments i la salsa. La picada, inclosa.
  - **ES:** Elige el plat, la guarnición, dos acompañamientos y la salsa. La picada, incluida.
  - **EN:** Pick your main, a side, two extras and a sauce. Picada included.

---

## Per acompanyar

### Coca de recapte
- **Sección:** acompañar
- **Precio:** 4,50 €
- **Temporada:** todo el año
- **Etiquetas:** vegano
- **Alérgenos:** gluten
- **Ingredientes principales:** coca del Forn Can Puig (Poblenou), escalivada de la casa, aceite de Les Garrigues
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Coca del Forn Can Puig amb la nostra escalivada i oli de les Garrigues, enfornada aquí.
  - **ES:** Coca del Forn Can Puig con nuestra escalivada y aceite de les Garrigues, horneada aquí.
  - **EN:** Flatbread from Forn Can Puig topped with our roasted vegetables and Garrigues olive oil, baked here.

### Pa amb tomàquet per muntar
- **Sección:** acompañar
- **Precio:** 3,50 €
- **Temporada:** todo el año
- **Etiquetas:** vegano, kit
- **Alérgenos:** gluten
- **Ingredientes principales:** pan de coca tostado, tomate de colgar (Baix Llobregat), aceite de Les Garrigues, sal
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Pa de coca torrat, tomàquet de penjar i oli. Te'l muntes tu.
  - **ES:** Pan de coca tostado, tomate de colgar y aceite. Te lo montas tú.
  - **EN:** Toasted coca bread, hanging tomatoes and olive oil. Build it yourself.

### Olives i encurtits
- **Sección:** acompañar
- **Precio:** 3,50 €
- **Temporada:** todo el año
- **Etiquetas:** vegano, sin gluten
- **Alérgenos:** sulfitos\*
- **Ingredientes principales:** aceitunas arbequinas (Les Garrigues), pepinillos, cebolla roja encurtida de la casa
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Olives arbequines de les Garrigues, cogombrets i ceba vermella encurtida per nosaltres.
  - **ES:** Aceitunas arbequinas de les Garrigues, pepinillos y cebolla roja encurtida por nosotros.
  - **EN:** Arbequina olives, gherkins and our own pickled red onion.

---

## Postres

### Crema catalana
- **Sección:** postres
- **Precio:** 4,50 €
- **Temporada:** todo el año
- **Etiquetas:** vegetariano, frío
- **Alérgenos:** leche, huevo
- **Ingredientes principales:** leche, yema, piel de limón, canela; disco de azúcar quemado aparte
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Crema infusionada amb pell de llimona i canyella. El cremat va a part: el trenques tu.
  - **ES:** Crema infusionada con piel de limón y canela. El cremat va aparte: lo rompes tú.
  - **EN:** Custard infused with lemon peel and cinnamon. The burnt sugar comes on the side, for you to crack.

### Pa amb tomàquet i xocolata
- **Sección:** postres
- **Precio:** 4,50 €
- **Temporada:** todo el año
- **Etiquetas:** vegano, para comer con la mano, pendiente de validar con marketing
- **Alérgenos:** gluten (soja si el chocolate lleva lecitina; elegir uno sin ella)
- **Ingredientes principales:** bastones de pan de coca tostados al horno, tomate frotado al momento, chocolate negro que se endurece como una cáscara, sal en escamas. En cono de papel. Sin aceite.
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Bastonets de pa de coca torrats i fregats amb tomàquet, mig banyats en xocolata negra amb sal en escates. En con, per menjar amb la mà.
  - **ES:** Bastones de pan de coca tostados y frotados con tomate, medio bañados en chocolate negro con sal en escamas. En cono, para comer con la mano.
  - **EN:** Toasted coca bread sticks rubbed with tomato, half-dipped in dark chocolate with flaky salt. In a paper cone, to eat with your hands.

### Mel i mató
- **Sección:** postres
- **Precio:** 4,50 €
- **Temporada:** todo el año
- **Etiquetas:** vegetariano, frío, sin gluten
- **Alérgenos:** leche, frutos de cáscara (nueces)
- **Ingredientes principales:** mató fresco (Formatgeria Mas Bosc, Garrotxa), miel de romero (Moianès), nueces caramelizadas
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Mató fresc de la Formatgeria Mas Bosc amb mel de romaní i nous caramel·litzades. El postre de Montserrat, tal qual.
  - **ES:** Mató fresco de la Formatgeria Mas Bosc con miel de romero y nueces caramelizadas. El postre de Montserrat, tal cual.
  - **EN:** Fresh mató cheese from Formatgeria Mas Bosc with rosemary honey and caramelised walnuts. The Montserrat classic, as it is.

*Postres especiales, fuera de la carta fija y solo en su fecha: tortell de Reis (enero), mona (Semana Santa) y coca de Sant Joan (junio). Los panellets no forman parte de la carta.*

---

## Begudes

### Llimonada de marialluïsa
- **Sección:** bebidas
- **Precio:** 2,90 €
- **Temporada:** todo el año
- **Etiquetas:** sin alcohol, propia, hecha cada mañana
- **Alérgenos:** —
- **Ingredientes principales:** limón, hierbaluisa, azúcar de caña
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Llimona, marialluïsa i sucre de canya. Feta cada matí.
  - **ES:** Limón, hierbaluisa y azúcar de caña. Hecha cada mañana.
  - **EN:** Lemon, lemon verbena and cane sugar. Made every morning.

### Vermut de la casa sense alcohol
- **Sección:** bebidas
- **Precio:** 3,20 €
- **Temporada:** todo el año
- **Etiquetas:** sin alcohol, propia
- **Alérgenos:** sulfitos
- **Ingredientes principales:** vermut negro sin alcohol (Vermuts Vidal, Reus), naranja, aceituna
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Vermut negre sense alcohol de Vermuts Vidal (Reus), amb taronja i oliva.
  - **ES:** Vermut negro sin alcohol de Vermuts Vidal (Reus), con naranja y aceituna.
  - **EN:** Alcohol-free red vermouth from Vermuts Vidal (Reus), with orange and olive.

### Beguda de temporada
- **Sección:** bebidas
- **Precio:** 3,20 €
- **Temporada:** cambia cada temporada
  - Otoño: most del Penedès
  - Invierno: llimonada de mandarina de l'Ebre
  - Primavera: llimonada de maduixa del Maresme
  - Verano: orxata o aigua de civada
- **Etiquetas:** sin alcohol, propia, de temporada
- **Alérgenos:** —
- **Ingredientes principales:** según la temporada
- **Suplementos:** —
- **Descripción corta (otoño):**
  - **CA:** Most de raïm del Penedès, de la verema d'aquest any.
  - **ES:** Mosto de uva del Penedès, de la vendimia de este año.
  - **EN:** Penedès grape juice, from this year's harvest.

### Aigua
- **Sección:** bebidas
- **Precio:** 1,80 €
- **Temporada:** todo el año
- **Etiquetas:** sin alcohol
- **Alérgenos:** —
- **Ingredientes principales:** agua mineral
- **Suplementos:** —
- **Descripción corta:** —

### Vermut de Reus
- **Sección:** bebidas
- **Precio:** 3,50 €
- **Temporada:** todo el año
- **Etiquetas:** con alcohol, solo en el local
- **Alérgenos:** sulfitos
- **Ingredientes principales:** vermut negro de Reus (Baix Camp)
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Vermut negre de Reus, amb taronja i oliva. Només al local.
  - **ES:** Vermut negro de Reus, con naranja y aceituna. Solo en el local.
  - **EN:** Red vermouth from Reus, with orange and olive. Dine-in only.

### Cervesa artesana del Poblenou
- **Sección:** bebidas
- **Precio:** 3,90 €
- **Temporada:** todo el año
- **Etiquetas:** con alcohol, solo en el local
- **Alérgenos:** gluten
- **Ingredientes principales:** cerveza artesana del barrio
- **Suplementos:** —
- **Descripción corta:**
  - **CA:** Cervesa artesana feta al barri. Només al local.
  - **ES:** Cerveza artesana hecha en el barrio. Solo en el local.
  - **EN:** Craft beer brewed in the neighbourhood. Dine-in only.

---

## El Dinar (combo de mediodía)

Cualquier carmanyola + bebida propia sin alcohol o postre: **+2,00 €**. Entre 13,90 € y 15,90 €, siempre por debajo de los 16 € del menú del día. Suma sello en el carnet si se pide en directo. Se aceptan cheques comida.