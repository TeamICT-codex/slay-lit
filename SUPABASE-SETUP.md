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

## 1b. De sociale laag: leden + porren (SQL deel 2)

> Al deel 1 gedraaid? Dan alleen dit blok nog — het is los uitvoerbaar.

```sql
-- wie zit er in welk syndicaat (ook wie nog nooit een daily deed)
create table public.leden (
  groep        text not null,
  naam         text not null,
  sinds        timestamptz not null default now(),
  laatst_gezien timestamptz not null default now(),
  primary key (groep, naam)
);
alter table public.leden enable row level security;
create policy "leden lezen" on public.leden for select using (true);
create policy "lid worden" on public.leden for insert with check (
  char_length(naam) between 1 and 20 and
  char_length(groep) between 3 and 24 and groep ~ '^[A-Z0-9-]+$'
);
create policy "laatst gezien verversen" on public.leden for update using (true) with check (true);

-- het porren: por een syndicaatsgenoot om zijn dagelijkse afdaling te doen.
-- Eén por per koppel per dag (unique) = ingebouwde anti-spam.
create table public.porren (
  id      uuid primary key default gen_random_uuid(),
  gemaakt timestamptz not null default now(),
  groep   text not null,
  van     text not null,
  naar    text not null,
  dag     text not null,
  bericht text
);
create unique index porren_uniek on public.porren (groep, van, naar, dag);
create index porren_inbox on public.porren (groep, naar, dag);
alter table public.porren enable row level security;
create policy "porren lezen" on public.porren for select using (true);
create policy "por sturen" on public.porren for insert with check (
  char_length(van) between 1 and 20 and
  char_length(naar) between 1 and 20 and
  van <> naar and
  char_length(groep) between 3 and 24 and groep ~ '^[A-Z0-9-]+$' and
  dag ~ '^\d{4}-\d{2}-\d{2}$' and
  (bericht is null or char_length(bericht) <= 120)
);
```

## 1c. Het wereldbord (geen SQL nodig)

Het 🌍-wereldbord (alle posses + zwervers samen, dag- en aller-tijden-
klassement) leest **dezelfde `scores`-tabel** — er is géén extra SQL nodig.
Twee dingen om te weten:

- **Zwervers** (spelers zonder syndicaat) krijgen client-side een verborgen
  persoonlijke code (`ZW-XXXXXX`) als groep: een posse-van-één. Zo blijft
  `(groep, naam, dag)` uniek per speler zonder schema-wijziging.

**Vrije runs (v100, sept 2026).** Ook een gewone run (geen daily) gaat het
wereldbord op, met dezelfde scoreformule. Omdat de insert-policy `dag` als echte
datum eist, krijgt zo'n rij geen eigen dag-sleutel maar een eigen groep:
`<code>-RUN` (bv. `KELDER-9104-RUN`, past in de `^[A-Z0-9-]+$`-regel en de
24-tekengrens). De ascensie reist mee in `seed` als `A5:<seed>`. Gevolgen:
één vrije run per speler per dag (een lagere score van dezelfde dag overschrijft
de betere niet — de client leest eerst), de posse-borden (`groep=eq.<code>`)
blijven zuiver daily, 'Vandaag' filtert `-RUN` weg, en 'Aller tijden' dedupt op
de basisgroep zodat elke speler één rij houdt: zijn beste run, daily óf vrij.
Geen SQL nodig.
- **Possenamen** komen optioneel uit de doopakte (sectie 1h); zonder rij
  valt het bord terug op de code.
- **Dev-/testrijen** met groepen die beginnen met `TEST-`, `ETEST-` of
  `PROBE-` worden client-side van het wereldbord gefilterd. Fysiek wissen kan
  altijd via Table Editor → `scores` → filter op die groepen → delete.

## 1d. Het grafschrift (SQL deel 1d — één regel)

Gevallen spelers laten een boodschap na op hun score-rij; possegenoten
vinden op die verdieping een grafsteen. Daarvoor één extra kolom:

```sql
alter table public.scores add column if not exists boodschap text;
```

Zonder deze kolom werkt alles gewoon door — alleen het versturen van een
grafschrift meldt dan netjes dat het niet lukte.

## 1g. De Nalatenschap (SQL deel 1g — één regel)

Val je in de Dagelijkse afdaling, dan laat je je beste kaart na; de
eerstvolgende posse-genoot die afdaalt vindt haar in zijn eerste
gevechtsbeloning. Daarvoor is één extra kolom nodig:

```sql
alter table scores add column if not exists nalatenschap text;
```

Zonder deze kolom werkt alles gewoon door — het nalaten faalt dan stil
(best-effort, net als het grafschrift).

## 1h. De doopakte: je syndicaat een eigen naam (SQL deel 1h)

Een syndicaat heet standaard naar zijn code (`KELDER-9104`). Met deze tabel
krijgt het een eigen naam, een motto, een embleem en een kleur — één rij per
code. De code blijft overal de sleutel (scores, leden, porren, de
uitnodigingslink) en verandert nooit; alleen wat de spelers te zien krijgen
verandert. Het blok is additief (raakt scores/leden/porren niet), in één keer
draaibaar én herplakbaar (`if not exists` / `drop … if exists`): een tweede
keer plakken kan geen kwaad. Oude clients roepen de tabel nooit aan; de
nieuwe client valt zonder tabel stil terug op de code.

```sql
-- 1h. de doopakte: één rij per syndicaat (de code blijft de sleutel)
create table if not exists public.syndicaten (
  groep        text primary key,                 -- de syndicaat-code, zelfde regex als scores.groep
  naam         text not null,                    -- de gedoopte naam (server: 2-24 tekens; de client kapt op 20)
  motto        text,                             -- hooguit 60 tekens, mag leeg blijven
  embleem      text not null default 'vlam',     -- id uit de vaste lijst in js/online.js (onbekend → terugval 'vlam')
  kleur        text not null default 'ember',    -- idem (onbekend → terugval 'ember')
  gedoopt_door text,                             -- strijdnaam van wie het laatst doopte
  vorige_naam  text,                             -- de naam vóór de laatste herdoop („van X naar Y" in het gestoef)
  gemaakt      timestamptz not null default now(),
  gewijzigd    timestamptz not null default now()  -- door de trigger hieronder gezet, niet door de client
);

alter table public.syndicaten enable row level security;

drop policy if exists "doopakte lezen" on public.syndicaten;
create policy "doopakte lezen" on public.syndicaten
  for select using (true);

-- dopen én herdopen: alleen echte syndicaat-codes (geen zwervers 'ZW-…', geen vrije-run-groepen
-- '…-RUN'), vrije tekst zonder < en >, dezelfde grenzen op insert en update
drop policy if exists "syndicaat dopen" on public.syndicaten;
create policy "syndicaat dopen" on public.syndicaten
  for insert with check (
    char_length(groep) between 3 and 24 and groep ~ '^[A-Z0-9-]+$' and
    groep !~ '^ZW-' and groep !~ '-RUN$' and
    char_length(btrim(naam)) between 2 and 24 and naam !~ '[<>]' and
    (motto is null or (char_length(motto) <= 60 and motto !~ '[<>]')) and
    embleem ~ '^[a-z0-9_]{2,24}$' and
    kleur   ~ '^[a-z0-9_]{2,24}$' and
    (gedoopt_door is null or (char_length(gedoopt_door) between 1 and 20 and gedoopt_door !~ '[<>]')) and
    (vorige_naam is null or (char_length(vorige_naam) <= 24 and vorige_naam !~ '[<>]'))
  );

drop policy if exists "syndicaat herdopen" on public.syndicaten;
create policy "syndicaat herdopen" on public.syndicaten
  for update using (true) with check (
    char_length(groep) between 3 and 24 and groep ~ '^[A-Z0-9-]+$' and
    groep !~ '^ZW-' and groep !~ '-RUN$' and
    char_length(btrim(naam)) between 2 and 24 and naam !~ '[<>]' and
    (motto is null or (char_length(motto) <= 60 and motto !~ '[<>]')) and
    embleem ~ '^[a-z0-9_]{2,24}$' and
    kleur   ~ '^[a-z0-9_]{2,24}$' and
    (gedoopt_door is null or (char_length(gedoopt_door) between 1 and 20 and gedoopt_door !~ '[<>]')) and
    (vorige_naam is null or (char_length(vorige_naam) <= 24 and vorige_naam !~ '[<>]'))
  );
-- bewust GEEN delete-policy (consistent met de rest van het schema)

-- de bewaker: de code is onveranderlijk (een herdoop kan de sleutel niet naar een andere posse
-- verhuizen — dat zou een doopakte laten verdwijnen) en de tijdstempels komen van de server
-- (niemand pint zijn doop met een valse 'gewijzigd' eeuwig bovenaan het gestoef).
-- Upsert-veilig: op het conflict-pad is new.groep gelijk aan old.groep.
create or replace function public.syndicaten_bewaak() returns trigger
language plpgsql as $$
begin
  new.gewijzigd := now();
  if tg_op = 'UPDATE' then
    if new.groep is distinct from old.groep then
      raise exception 'de syndicaat-code is onveranderlijk' using errcode = '42501';
    end if;
    new.gemaakt := old.gemaakt;
  end if;
  return new;
end $$;
drop trigger if exists syndicaten_bewaak on public.syndicaten;
create trigger syndicaten_bewaak before insert or update on public.syndicaten
  for each row execute function public.syndicaten_bewaak();
```

**Wie mag dopen?** Technisch iedereen die de code kent — en zolang stap 0 van
het Prikbord niet live is, staan alle codes op het wereldbord. Zonder
accounts kan RLS geen lidmaatschap controleren (dezelfde grens als in sectie
1e); wie de code heeft, ís lid. De rem is sociaal, niet technisch: de laatste
doop staat zeven dagen bovenaan het gestoef van de posse („Wirinho herdoopte
de posse van KELDER-9104 tot De Nachtploeg"), en een tikfout of grap is
meteen terug te draaien. Geen wachttijd tussen twee dopen, geen unieke namen
(twee posses mogen hetzelfde heten — de code en het embleem onderscheiden),
geen woordfilter (vriendenniveau). Er is één rij per code zonder historiek:
alleen de laatste doop is zichtbaar, met `vorige_naam` als enige geheugen.

**Afspraken voor de client (js/online.js), zodat dit blok nooit een tweede
SQL-stap nodig heeft:**

- Eén schrijfroute voor doop én herdoop: `POST syndicaten?on_conflict=groep`
  met `Prefer: resolution=merge-duplicates` (het meldAan-patroon) en ALTIJD
  het volledige record `{groep, naam, motto, embleem, kleur, gedoopt_door,
  vorige_naam}` — nooit `gemaakt`/`gewijzigd` (die zet de trigger). Een
  deel-payload faalt op het insert-pad met 42501.
- `normPosseNaam`: trimmen, `<>&"'` strippen en op **codepoints** tellen en
  knippen (`[...s].slice(0, 20).join('')`), want `char_length` telt
  codepoints en `.length` UTF-16-eenheden — een emoji-naam gaat anders mis.
  Client kapt op 20 (het bord is 360px breed), de server laat 24 toe.
- Embleem- en kleur-id's zijn snake_case (`^[a-z0-9_]{2,24}$`) en komen
  ALTIJD uit een vaste lijst met terugval (`vlam`/`ember`).
- Tabel-ontbreekt (de fetch gooit) is iets anders dan geen-rij (`[]`): alleen
  in het tweede geval de doop-uitnodiging tonen.
- `wordLid`/`normCode` weigeren voortaan codes die op `ZW-` beginnen of op
  `-RUN` eindigen: die vormen zijn gereserveerd voor zwervers en vrije runs.
- `hernoem()` PATCHt best-effort ook `gedoopt_door` mee
  (`syndicaten?groep=eq.CODE&gedoopt_door=eq.OUD`), anders staat een oude
  strijdnaam nog zeven dagen als doper in het gestoef.
- De `in.()`-lijst voor het wereldbord alleen versturen als hij na het
  wegfilteren van `ZW-`/`-RUN` niet leeg is.

**Uitrollen:** eerst de client live (met cache-bump; zonder tabel verandert
er niets zichtbaars), dan dit blok draaien — klaar; de client pikt de tabel
bij de volgende bordopening op. Bestaande groepen hoeven niets te doen: een
posse zonder rij heet gewoon nog naar haar code, met in het bord één
uitnodiging om te dopen.

## 1f. Spook-leden opruimen (eenmalig, indien nodig)

Wie vóór cache v63 zijn strijdnaam wijzigde deed dat via *verlaten + opnieuw
joinen* — en werd daarmee een tweede speler. De oude naam blijft dan als
"spook" in de ledenlijst staan: geen scores, eeuwig ⏳, krijgt porren die
niemand leest. Sinds v63 kan het niet meer ontstaan (het ✏️ naast je naam
verhuist alles mee), maar bestaande spoken wis je zo:

```sql
-- toon eerst de verdachten: leden zonder enkele score
select l.groep, l.naam, l.sinds
from public.leden l
where not exists (
  select 1 from public.scores s where s.groep = l.groep and s.naam = l.naam
);

-- en wis er dan gericht één (vervang naam + groep)
delete from public.leden where groep = 'FAKKEL-9463' and naam = 'Steven Tijpels';
```

## 1e. Bekende grens: iedereen mag schrijven (vriendenniveau)

De publieke sleutel + de open `update`-policy betekenen dat iemand met wat
technische kennis via de rauwe API een score, grafschrift of doopakte van een ander kan
overschrijven. Dat is een **bewuste keuze**: echte bescherming vraagt
gebruikersaccounts (Supabase Auth), en dat is voor een vriendengroep zwaarder
dan het probleem. Het schema is er wel klaar voor — bij misbruik zet je Auth
aan en vervang je de policies door `auth.uid()`-gebaseerde regels, zonder
datamigratie.

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


## WIPE-1 — schone lei (27 aug 2026)

Eenmalig, hoort bij de client-wipe in game.js (WIPE_VERSIE 1). Draai in de
Supabase SQL-editor; wist ALLE scores, ledenrijen en porren — groepen herrijzen
vanzelf zodra een lid het bord opent (meldAan-upsert):

```sql
truncate table scores, leden, porren;
```
