# HET SYNDICAAT — Supabase-setup (online leaderboard)

Het spel praat rechtstreeks met Supabase's REST-API (kale `fetch`, geen
library). Jij hoeft drie dingen te doen: de tabel aanmaken, de sleutels
invullen, en een cache-bump deployen. Vijf minuten werk.

## 1. Maak de tabel + beveiliging (SQL Editor)

Supabase-dashboard → **SQL Editor** → New query → plak dit integraal → **Run**:

```sql
-- de scores van alle syndicaten (één rij per speler per dag, upsert)
create table public.scores (
  id        uuid primary key default gen_random_uuid(),
  gemaakt   timestamptz not null default now(),
  groep     text  not null,   -- de syndicaat-code (A-Z 0-9 -)
  naam      text  not null,   -- de strijdnaam
  dag       text  not null,   -- '2026-07-09' (dezelfde dag-sleutel als de daily)
  score     int   not null,
  held      text  not null default 'slachter',
  diepte    int   not null default 0,
  gewonnen  boolean not null default false,
  seed      text
);

-- één score per speler per dag per syndicaat (opnieuw insturen = overschrijven)
create unique index scores_uniek on public.scores (groep, naam, dag);
-- snelle borden
create index scores_bord on public.scores (groep, dag, score desc);

-- Row Level Security: iedereen mag LEZEN en (binnen grenzen) INVOEGEN;
-- niemand mag andermans rijen wijzigen of wissen. De anon-key is publiek —
-- deze policies zijn het echte slot.
alter table public.scores enable row level security;

create policy "bord lezen" on public.scores
  for select using (true);

create policy "score insturen" on public.scores
  for insert with check (
    char_length(naam)  between 1 and 20 and
    char_length(groep) between 3 and 24 and
    groep ~ '^[A-Z0-9-]+$' and
    dag   ~ '^\d{4}-\d{2}-\d{2}$' and
    score between 0 and 99999 and
    diepte between 0 and 99
  );

-- upsert (overschrijven van je eigen dagscore) heeft ook UPDATE nodig,
-- maar dan alleen via de on_conflict-route; beperk tot dezelfde grenzen
create policy "eigen dagscore verversen" on public.scores
  for update using (true) with check (
    score between 0 and 99999 and diepte between 0 and 99
  );
```

## 2. Vul de sleutels in

Dashboard → **Settings → API**. Kopieer:
- **Project URL** (bv. `https://abcdefgh.supabase.co`)
- **anon public** key

Open [js/online.js](js/online.js) en vul bovenaan de `CONFIG` in:

```js
const CONFIG = {
  url: 'https://JOUWPROJECT.supabase.co',
  anonKey: 'eyJ…'
};
```

> De anon-key is bewust publiek (zo werkt Supabase); de RLS-policies
> hierboven zijn de beveiliging. Zet er NOOIT de `service_role`-key in.

## 3. Deploy

Cache-bump in `sw.js` + commit + push, zoals altijd. Zolang `CONFIG`
leeg is, blijft de Syndicaat-sectie volledig verborgen en werkt het
lokale bord zoals voorheen.

## Testen zonder hardcoden

Console: `Online._dev('https://JOUWPROJECT.supabase.co', 'anon-key')`
en heropen het 🏆-Leaderboard — zo test je de verbinding vóór je de
sleutels in de code zet.

## Eerlijkheid & grenzen (bewuste keuzes)

- Vriendenniveau: geen accounts, geen anti-cheat — wie vals wil spelen
  in een vriendengroep, straft vooral zichzelf. De RLS-grenzen houden
  enkel het vandalisme buiten (geen deletes, geen absurde waarden).
- Eén score per dag per naam per syndicaat; opnieuw spelen op een
  ander toestel met dezelfde naam overschrijft (dat is handig, geen bug).
- Gratis Supabase-tier is ruim voldoende (dit zijn kilobytes per dag).
- Later (native app / RevenueCat-route): dit schema kan 1-op-1 mee naar
  echte auth; `naam` wordt dan een user-id-alias.
