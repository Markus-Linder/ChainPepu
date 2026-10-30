-- Profiangebot Plattform: Schema, RLS, RPC, Seed
create extension if not exists pgcrypto;

-- =========================
-- Tabellen
-- =========================
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  street text,
  plz text,
  city text,
  trades text[] not null default '{}',
  regions text[] not null default '{}', -- PLZ-Präfixe (2-stellig), z.B. {'74','91'}
  website text,
  handwerksrolle_nr text,
  verified boolean not null default false,
  stripe_customer_id text unique,
  subscription_status text not null default 'none', -- none | active | past_due | canceled
  subscription_current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  trade text not null,
  project_title text,
  file_path text,
  file_name text,
  mime_type text,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  error text,
  premium boolean not null default false,
  premium_paid_at timestamptz,
  email text,
  plz text,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_analyses (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references public.quotes(id) on delete cascade,
  result jsonb not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  trade text not null,
  title text,
  description text,
  plz text,
  result jsonb,
  status text not null default 'done',
  created_at timestamptz not null default now()
);

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  quote_ids uuid[] not null,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  trade text not null,
  plz text not null,
  region text generated always as (left(plz, 2)) stored,
  city text,
  title text not null,
  summary text not null,
  budget_min numeric,
  budget_max numeric,
  existing_quote_total numeric,
  timeframe text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  preferred_contact text default 'phone',
  status text not null default 'open' check (status in ('open','sold_out','closed')),
  max_buyers integer not null default 3,
  buyers_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists leads_trade_region_idx on public.leads(trade, region, status);

create table if not exists public.lead_purchases (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  stripe_session_id text unique,
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  unique (lead_id, business_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('premium_report','lead','subscription')),
  stripe_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  amount_cents integer,
  currency text default 'eur',
  status text not null default 'paid',
  quote_id uuid references public.quotes(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.price_benchmarks (
  id uuid primary key default gen_random_uuid(),
  trade text not null,
  position text not null,
  unit text not null,
  price_min numeric not null,
  price_typ numeric not null,
  price_max numeric not null,
  note text,
  source text default 'Richtwert 2026',
  created_at timestamptz not null default now()
);
create index if not exists price_benchmarks_trade_idx on public.price_benchmarks(trade);

-- Preisdatenbank aus echten Angeboten (anonymisiert, wächst mit jedem Upload)
create table if not exists public.observed_prices (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  trade text not null,
  region text,
  position text not null,
  unit text,
  quantity numeric,
  unit_price numeric,
  total numeric,
  created_at timestamptz not null default now()
);
create index if not exists observed_prices_trade_idx on public.observed_prices(trade);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.processed_stripe_events (
  event_id text primary key,
  created_at timestamptz not null default now()
);

-- =========================
-- Storage
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotes', 'quotes', false, 26214400, array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- =========================
-- updated_at Trigger
-- =========================
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists businesses_updated_at on public.businesses;
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();

-- =========================
-- RLS
-- =========================
alter table public.businesses enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_analyses enable row level security;
alter table public.projects enable row level security;
alter table public.comparisons enable row level security;
alter table public.leads enable row level security;
alter table public.lead_purchases enable row level security;
alter table public.payments enable row level security;
alter table public.price_benchmarks enable row level security;
alter table public.observed_prices enable row level security;
alter table public.contact_messages enable row level security;
alter table public.processed_stripe_events enable row level security;

-- Betriebe: eigene Zeile lesen/anlegen/ändern
drop policy if exists "businesses_select_own" on public.businesses;
create policy "businesses_select_own" on public.businesses for select to authenticated using (user_id = auth.uid());
drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own" on public.businesses for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own" on public.businesses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lead-Käufe: eigene lesen
drop policy if exists "lead_purchases_select_own" on public.lead_purchases;
create policy "lead_purchases_select_own" on public.lead_purchases for select to authenticated
  using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- Richtwerte: öffentlich lesbar
drop policy if exists "benchmarks_public_read" on public.price_benchmarks;
create policy "benchmarks_public_read" on public.price_benchmarks for select to anon, authenticated using (true);

-- Alles andere nur über Edge Functions (Service Role) oder RPC.

-- =========================
-- RPC: Zugriff per Token (ohne Login)
-- =========================
create or replace function public.get_quote_report(p_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quotes; a public.quote_analyses; l public.leads;
begin
  select * into q from public.quotes where id = p_id and access_token = p_token;
  if not found then return null; end if;
  select * into a from public.quote_analyses where quote_id = q.id;
  select * into l from public.leads where quote_id = q.id order by created_at desc limit 1;
  return jsonb_build_object(
    'id', q.id,
    'trade', q.trade,
    'project_title', q.project_title,
    'file_name', q.file_name,
    'status', q.status,
    'error', q.error,
    'premium', q.premium,
    'plz', q.plz,
    'city', q.city,
    'created_at', q.created_at,
    'analysis', a.result,
    'lead_released', (l.id is not null)
  );
end $$;
grant execute on function public.get_quote_report(uuid, text) to anon, authenticated;

create or replace function public.get_project(p_id uuid, p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select to_jsonb(p) - 'access_token' from public.projects p where p.id = p_id and p.access_token = p_token;
$$;
grant execute on function public.get_project(uuid, text) to anon, authenticated;

create or replace function public.get_comparison(p_id uuid, p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select to_jsonb(c) - 'access_token' from public.comparisons c where c.id = p_id and c.access_token = p_token;
$$;
grant execute on function public.get_comparison(uuid, text) to anon, authenticated;

-- =========================
-- RPC: Lead-Marktplatz für Betriebe
-- =========================
create or replace function public.list_marketplace_leads()
returns table (
  id uuid, trade text, region text, city text, title text, summary text,
  budget_min numeric, budget_max numeric, existing_quote_total numeric, timeframe text,
  buyers_count integer, max_buyers integer, created_at timestamptz, purchased boolean
) language plpgsql security definer set search_path = public as $$
declare b public.businesses;
begin
  select * into b from public.businesses where user_id = auth.uid();
  if not found then return; end if;
  return query
    select l.id, l.trade, l.region, l.city, l.title, l.summary,
           l.budget_min, l.budget_max, l.existing_quote_total, l.timeframe,
           l.buyers_count, l.max_buyers, l.created_at,
           exists(select 1 from public.lead_purchases lp where lp.lead_id = l.id and lp.business_id = b.id) as purchased
    from public.leads l
    where l.status = 'open'
      and l.expires_at > now()
      and (cardinality(b.trades) = 0 or l.trade = any(b.trades))
      and (cardinality(b.regions) = 0 or l.region = any(b.regions))
    order by l.created_at desc
    limit 200;
end $$;
grant execute on function public.list_marketplace_leads() to authenticated;

create or replace function public.get_purchased_leads()
returns table (
  id uuid, trade text, plz text, city text, title text, summary text,
  budget_min numeric, budget_max numeric, existing_quote_total numeric, timeframe text,
  customer_name text, customer_email text, customer_phone text, preferred_contact text,
  purchased_at timestamptz, created_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare b public.businesses;
begin
  select * into b from public.businesses where user_id = auth.uid();
  if not found then return; end if;
  return query
    select l.id, l.trade, l.plz, l.city, l.title, l.summary,
           l.budget_min, l.budget_max, l.existing_quote_total, l.timeframe,
           l.customer_name, l.customer_email, l.customer_phone, l.preferred_contact,
           lp.created_at as purchased_at, l.created_at
    from public.lead_purchases lp
    join public.leads l on l.id = lp.lead_id
    where lp.business_id = b.id
    order by lp.created_at desc;
end $$;
grant execute on function public.get_purchased_leads() to authenticated;

-- Statistik für die Startseite (öffentlich, aggregiert)
create or replace function public.public_stats()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'quotes_checked', (select count(*) from public.quotes where status = 'done'),
    'businesses', (select count(*) from public.businesses),
    'benchmarks', (select count(*) from public.price_benchmarks) + (select count(*) from public.observed_prices)
  );
$$;
grant execute on function public.public_stats() to anon, authenticated;

-- =========================
-- Seed: Richtwerte
-- =========================
insert into public.price_benchmarks (trade, position, unit, price_min, price_typ, price_max, note) values
('badsanierung', 'Komplettsanierung Bad 6–8 m² (Standard)', 'pauschal', 15000, 24000, 35000, null),
('badsanierung', 'Demontage und Entsorgung Altbad', 'pauschal', 800, 1500, 2500, null),
('badsanierung', 'Abdichtung Nassbereich (DIN 18534)', 'm²', 25, 40, 60, null),
('badsanierung', 'Bodengleiche Dusche inkl. Rinne', 'Stk', 1800, 2800, 4500, null),
('badsanierung', 'Sanitärinstallation neu (Leitungen, 1 Bad)', 'pauschal', 3000, 5000, 8000, null),
('badsanierung', 'Elektroinstallation Bad (FI, Leitungen, Auslässe)', 'pauschal', 1200, 2000, 3500, null),
('dach', 'Neueindeckung Tonziegel inkl. Lattung', 'm²', 90, 120, 160, null),
('dach', 'Aufsparrendämmung inkl. Material', 'm²', 90, 130, 190, null),
('dach', 'Zwischensparrendämmung', 'm²', 40, 60, 90, null),
('dach', 'Gerüst inkl. 4 Wochen Standzeit', 'm²', 8, 12, 18, null),
('dach', 'Dachrinne Zink inkl. Montage', 'lfm', 35, 50, 80, null),
('dach', 'Entsorgung Altziegel (ohne Asbest)', 'm²', 8, 12, 20, null),
('dach', 'Dachfenster inkl. Einbau (Standardgröße)', 'Stk', 1500, 2200, 3500, null),
('fenster', 'Kunststofffenster 3-fach, 1,2 × 1,4 m, inkl. Montage', 'Stk', 700, 1000, 1400, null),
('fenster', 'Holz-Alu-Fenster 3-fach, 1,2 × 1,4 m, inkl. Montage', 'Stk', 1200, 1800, 2500, null),
('fenster', 'Haustür Aluminium inkl. Montage', 'Stk', 3000, 5000, 9000, null),
('fenster', 'Demontage und Entsorgung Altfenster', 'Stk', 60, 100, 150, null),
('fenster', 'Fensterbank innen (Kunststein) inkl. Einbau', 'Stk', 80, 130, 200, null),
('fenster', 'Beiputz und Laibung innen', 'Stk', 80, 130, 200, null),
('heizung', 'Luft-Wasser-Wärmepumpe EFH inkl. Einbau (vor Förderung)', 'pauschal', 25000, 33000, 45000, null),
('heizung', 'Gas-Brennwerttherme inkl. Einbau', 'pauschal', 7000, 10000, 14000, null),
('heizung', 'Hydraulischer Abgleich (Verfahren B, EFH)', 'pauschal', 600, 900, 1500, null),
('heizung', 'Heizlastberechnung DIN EN 12831', 'pauschal', 300, 500, 900, null),
('heizung', 'Pufferspeicher 300–500 l inkl. Einbau', 'Stk', 1500, 2500, 4000, null),
('heizung', 'Heizkörper tauschen inkl. Montage', 'Stk', 400, 650, 1000, null),
('elektrik', 'Komplettinstallation EFH 140 m² (Sanierung)', 'pauschal', 12000, 18000, 25000, null),
('elektrik', 'Zählerschrank neu nach TAB inkl. Montage', 'Stk', 2000, 3200, 5000, null),
('elektrik', 'Wallbox 11 kW inkl. Montage und Anmeldung', 'Stk', 1500, 2200, 3000, null),
('elektrik', 'Steckdose/Schalter setzen inkl. Leitung (Unterputz)', 'Stk', 90, 140, 220, null),
('elektrik', 'Stromkreis neu inkl. Sicherung', 'Stk', 250, 400, 600, null),
('elektrik', 'E-Check mit Protokoll', 'pauschal', 150, 250, 400, null),
('maler', 'Innenanstrich Wand/Decke (Dispersion, 2 Anstriche)', 'm² Wandfläche', 8, 11, 15, null),
('maler', 'Tapezieren Raufaser inkl. Streichen', 'm²', 12, 16, 20, null),
('maler', 'Spachteln Q3', 'm²', 12, 18, 28, null),
('maler', 'Fassadenanstrich inkl. Gerüst', 'm²', 25, 40, 60, null),
('maler', 'Türen/Zargen lackieren', 'Stk', 150, 250, 400, null),
('fliesen', 'Fliesen verlegen Standardformat (Arbeitslohn)', 'm²', 45, 65, 90, null),
('fliesen', 'Fliesen verlegen Großformat ab 60×120 (Arbeitslohn)', 'm²', 90, 115, 150, null),
('fliesen', 'Untergrund ausgleichen/spachteln', 'm²', 15, 25, 40, null),
('fliesen', 'Alte Fliesen entfernen inkl. Entsorgung', 'm²', 20, 30, 45, null),
('fliesen', 'Silikonfugen', 'lfm', 6, 9, 14, null),
('boden', 'Parkett verlegt inkl. Material (Eiche, verklebt)', 'm²', 60, 95, 140, null),
('boden', 'Vinyl verlegt inkl. Material', 'm²', 35, 50, 70, null),
('boden', 'Laminat verlegt inkl. Material', 'm²', 25, 35, 50, null),
('boden', 'Untergrund spachteln/schleifen', 'm²', 10, 16, 25, null),
('boden', 'Sockelleisten inkl. Montage', 'lfm', 8, 12, 20, null),
('boden', 'Altbelag entfernen inkl. Entsorgung', 'm²', 8, 14, 25, null),
('garten', 'Pflasterarbeiten inkl. Unterbau (Betonstein)', 'm²', 80, 115, 160, null),
('garten', 'Terrassenplatten Feinsteinzeug inkl. Unterbau', 'm²', 120, 160, 220, null),
('garten', 'Aushub inkl. Entsorgung', 'm³', 40, 60, 90, null),
('garten', 'Randeinfassung Betonbord inkl. Fundament', 'lfm', 25, 40, 60, null),
('garten', 'Rollrasen inkl. Vorbereitung', 'm²', 12, 18, 28, null),
('garten', 'Doppelstabmattenzaun 1,6 m inkl. Montage', 'lfm', 70, 100, 150, null),
('photovoltaik', 'PV-Anlage schlüsselfertig ohne Speicher', 'kWp', 1300, 1550, 1900, null),
('photovoltaik', 'Batteriespeicher inkl. Einbau', 'kWh', 600, 800, 1000, null),
('photovoltaik', 'Gerüst für PV-Montage', 'pauschal', 800, 1300, 2000, null),
('photovoltaik', 'Zählerschrank-Umbau für PV', 'pauschal', 1000, 1800, 3000, null),
('photovoltaik', 'Balkonkraftwerk 800 W inkl. Montage', 'Stk', 600, 900, 1400, null);
