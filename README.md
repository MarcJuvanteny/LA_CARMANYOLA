# La Carmanyola

Restaurant fictici de cuina catalana per emportar i el seu panell de màrqueting amb IA. Context complet a `CONTEXT.md`.

## Arrencar en local

Cal Docker i la CLI de Supabase.

```bash
npm install
npm run db:start     # Supabase local (scripts/db-start.sh)
npm run db:seed      # dades base: carta, padró, veu, amo, .env.local i secrets del Vault
npm run sim:seed     # simulació: clients, campanyes passades i totes les franges des de l'obertura
npm run dev          # http://localhost:3000 → /panel
```

Accés al panell (només local): `amo@lacarmanyola.local` / `carmanyola-local`. Studio: http://127.0.0.1:54323

> **Codespaces:** `npm run db:start` obre el trànsit IPv4 entre contenidors (l'iptables-legacy del Codespace el bloqueja) i crea la xarxa del projecte amb IPv6.

## Simulador (`src/lib/sim`)

El restaurant és fictici: totes les dades simulades porten `simulated = true`.

- **Determinista:** cada franja de 15 minuts fa servir la llavor `carmanyola:<slotISO>`. `sim_runs` impedeix duplicats.
- **Paràmetres:** tots a `src/lib/sim/config.ts`. Les dades de negoci (plats, preus, paraules) surten de la base de dades.
- **Perfils ocults:** `sim_profiles` només és accessible amb la service role; el panell no la llegeix mai.
- **Carnet:** `registra_segell()` (SQL) és la mateixa lògica que farà servir `/c/[codi]`.

| Script | Què fa |
|---|---|
| `npm run sim:seed` | Esborra només el simulat i el torna a crear |
| `npm run sim:tick` | Omple les franges pendents fins ara |
| `npm run sim:report` | Informe de coherència (criteris d'acceptació) |
| `npm run sim:reset-demo` | Desfà els canvis fets des del panell, sense tocar l'històric |
| `npm test` | Tests de Vitest |

**Execució periòdica.** `pg_cron` + `pg_net` criden l'app (`supabase/migrations/*_sim_cron.sql`):
`/api/sim/tick` cada 10 min, i `/api/sim/que-queda` i `/api/sim/nightly` cada 30 min (la ruta decideix si és l'hora a Barcelona).
Cal `Authorization: Bearer $SIM_SECRET`. **Pla B:** en obrir el panell, el servidor posa el restaurant al dia en segon pla.
`GET /api/sim/status` és públic i només retorna agregats.

**Comprovar que el cron funciona:**

```sql
select j.jobname, d.status, d.start_time from cron.job_run_details d join cron.job j using (jobid) order by d.start_time desc limit 5;
select status_code, content from net._http_response order by id desc limit 3;
```

### Producció (Vercel + Supabase)

1. `supabase link` i `supabase db push` per aplicar les migracions.
2. A Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` i `SIM_SECRET`.
3. Al SQL Editor de Supabase:
   ```sql
   select vault.create_secret('<SIM_SECRET>', 'sim_secret');
   select vault.create_secret('https://<la-teva-app>.vercel.app', 'sim_app_url');
   ```
4. Una vegada, amb `DATABASE_URL` i les claus del projecte al núvol: `npm run sim:seed`.

## Estructura

- `supabase/migrations/`: esquema amb RLS, motor de simulació i consultes del panell.
- `src/lib/db/panel.ts`: lectures del panell (sessió de l'amo, sense claus de servei).
- `src/app/panel/actions.ts`: el que l'amo aprova, descarta o edita queda desat a la base de dades.
- Textos de la interfície a `messages/ca.json` (next-intl).
- Tipografia de títols: deixa `Redgato-Regular.woff2` a `public/fonts/`. Mentrestant es fa servir Rubik 400.
