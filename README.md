# La Carmanyola

Restaurant fictici de cuina catalana per emportar i el seu panell de màrqueting amb IA. Context complet a `CONTEXT.md`.

## Arrencar en local

Cal Docker i la CLI de Supabase.

```bash
npm install
npm run db:start   # Supabase local (Postgres, Auth, Realtime, Studio)
npm run db:seed    # 6 mesos d'història + clients + usuari amo (crea .env.local)
npm run dev        # http://localhost:3000 → /panel
```

Accés al panell (només local): `amo@lacarmanyola.local` / `carmanyola-local`.
Studio de Supabase: http://127.0.0.1:54323

`npm run db:reset` torna a aplicar les migracions i a fer el seed des de zero.

> **Codespaces:** `npm run db:start` (scripts/db-start.sh) obre el trànsit IPv4 entre contenidors, que l'iptables-legacy del Codespace bloqueja, i crea la xarxa del projecte amb IPv6.

## Com es mouen les dades

- **Història:** `scripts/seed.ts` crea ~400 clients (perfils d'oficinista, ocasional, vegà, família, els que deixen de venir i els d'estiu), carrega el temps real de Barcelona (Open-Meteo) i fa córrer el motor de simulació SQL sobre els últims 183 dies.
- **Restaurant viu:** `pg_cron` crida `posa_al_dia()` cada 2 minuts. En horari de servei (dl–ds, 12–16 h i 20–22 h) entren comandes noves amb els mateixos patrons. Si la màquina ha estat aturada, omple el forat en tornar.
- **Gràfics en directe:** el panell escolta Supabase Realtime. Qualsevol alta, canvi o baixa a comandes, carta, padró, campanyes, etc. (també fets a mà des de l'Studio) torna a calcular les xifres al servidor.
- **Els números els calcula SQL** (`supabase/migrations/*_panell.sql`, funcions `panel_*`). Els textos de les targetes grogues es redacten a partir d'aquests números (`src/lib/ia/plantilles.ts`) fins que hi hagi el model.
- Botó **"Simula una comanda"** al menú: per veure moure's els gràfics fora d'horari.

## Estructura

- `supabase/migrations/`: esquema amb RLS, motor de simulació i consultes del panell.
- `src/lib/db/panel.ts`: lectures del panell (sessió de l'amo, sense claus de servei).
- `src/app/panel/actions.ts`: el que l'amo aprova, descarta o edita queda desat a la base de dades.
- Textos de la interfície a `messages/ca.json` (next-intl).
- Tipografia de títols: deixa `Redgato-Regular.woff2` a `public/fonts/`. Mentrestant es fa servir Rubik 400.
