-- ChainPepu: Schema, Sicherheit (RLS) und Funktionen für Supabase.
-- In Lovable: Supabase verbinden, dann diese Datei als Migration ausführen
-- (oder im Supabase SQL-Editor einfügen und ausführen).

-- ---------- Einstellungen ----------
create table if not exists public.app_settings (
  key text primary key,
  value text not null
);
insert into public.app_settings (key, value) values ('demo_mode', 'true')
  on conflict (key) do nothing;

-- ---------- Profile (Planeten) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  planet_seed integer not null default floor(random() * 1000000000)::int,
  planet_skin text not null default 'standard',
  stars integer not null default 50,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Legt beim Registrieren automatisch das Profil an (Daten aus den Signup-Metadaten).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  v_display  text := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Planet');
begin
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := 'planet_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;
  insert into public.profiles (id, username, display_name) values (new.id, v_username, v_display);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Ketten ----------
create table if not exists public.chains (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 2 and 80),
  origin_user_id uuid references public.profiles(id) on delete set null,
  boost integer not null default 0,
  daily_day date unique,
  created_at timestamptz not null default now()
);

-- ---------- Glieder ----------
create table if not exists public.links (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.chains(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  position integer not null,
  text text not null check (char_length(text) between 1 and 500),
  image_url text,
  color text not null default '#7c5cff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (chain_id, position)
);
create index if not exists links_user_idx on public.links(user_id, created_at desc);
create index if not exists links_chain_idx on public.links(chain_id, position);

-- ---------- Einladungen ----------
create table if not exists public.invites (
  token text primary key,
  chain_id bigint not null references public.chains(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  used_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Käufe ----------
create table if not exists public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item text not null,
  stars integer not null,
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

-- ---------- Sichten ----------
create or replace view public.chain_stats with (security_invoker = true) as
select c.*,
  (select count(*) from public.links l where l.chain_id = c.id)::int as link_count,
  (select count(distinct l.user_id) from public.links l where l.chain_id = c.id)::int as user_count,
  p.username as origin_username,
  p.display_name as origin_display_name,
  coalesce((select max(l.created_at) from public.links l where l.chain_id = c.id), c.created_at) as last_activity
from public.chains c
left join public.profiles p on p.id = c.origin_user_id;

create or replace view public.map_edges with (security_invoker = true) as
select a.chain_id, a.user_id as from_user, b.user_id as to_user
from public.links a
join public.links b on b.chain_id = a.chain_id and b.position = a.position + 1
where a.user_id <> b.user_id;

-- ---------- Zeilensicherheit ----------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.chains enable row level security;
alter table public.links enable row level security;
alter table public.invites enable row level security;
alter table public.purchases enable row level security;

-- Alle dürfen lesen (das Universum ist öffentlich). Schreiben nur über Funktionen.
create policy "settings lesen" on public.app_settings for select using (true);
create policy "profile lesen" on public.profiles for select using (true);
create policy "ketten lesen" on public.chains for select using (true);
create policy "glieder lesen" on public.links for select using (true);
create policy "einladungen lesen" on public.invites for select using (true);
create policy "eigene kaeufe lesen" on public.purchases for select using (auth.uid() = user_id);
create policy "einladung erstellen" on public.invites for insert to authenticated with check (auth.uid() = inviter_id);

-- ---------- Funktionen (laufen mit erhöhten Rechten, prüfen selbst) ----------

create or replace function public.start_chain(p_title text, p_text text, p_image_url text, p_color text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  insert into chains (title, origin_user_id) values (p_title, auth.uid()) returning id into v_id;
  insert into links (chain_id, user_id, position, text, image_url, color)
    values (v_id, auth.uid(), 1, p_text, nullif(p_image_url, ''), coalesce(nullif(p_color, ''), '#7c5cff'));
  return v_id;
end $$;

create or replace function public.add_link(p_chain_id bigint, p_text text, p_image_url text, p_color text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_pos int; v_id bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if not exists (select 1 from chains where id = p_chain_id) then raise exception 'Kette nicht gefunden'; end if;
  -- Kette sperren, damit Positionen bei gleichzeitigen Beiträgen eindeutig bleiben.
  perform 1 from chains where id = p_chain_id for update;
  select coalesce(max(position), 0) + 1 into v_pos from links where chain_id = p_chain_id;
  insert into links (chain_id, user_id, position, text, image_url, color)
    values (p_chain_id, auth.uid(), v_pos, p_text, nullif(p_image_url, ''), coalesce(nullif(p_color, ''), '#7c5cff'))
    returning id into v_id;
  update profiles set stars = stars + 1 where id = auth.uid(); -- Mitmachen gibt einen Stern
  return v_id;
end $$;

create or replace function public.boost_chain(p_chain_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_cost int := 25; v_ok int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  update profiles set stars = stars - v_cost where id = auth.uid() and stars >= v_cost;
  get diagnostics v_ok = row_count;
  if v_ok = 0 then raise exception 'Dafür brauchst du % Sterne.', v_cost; end if;
  update chains set boost = boost + 1 where id = p_chain_id;
  insert into purchases (user_id, item, stars) values (auth.uid(), 'boost:' || p_chain_id, v_cost);
end $$;

create or replace function public.buy_skin(p_skin text)
returns void language plpgsql security definer set search_path = public as $$
declare v_price int; v_ok int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  v_price := case p_skin
    when 'standard' then 0 when 'lava' then 40 when 'eis' then 40
    when 'neon' then 90 when 'gold' then 120 when 'void' then 200 end;
  if v_price is null then raise exception 'Diesen Skin gibt es nicht.'; end if;
  if v_price > 0 then
    update profiles set stars = stars - v_price where id = auth.uid() and stars >= v_price;
    get diagnostics v_ok = row_count;
    if v_ok = 0 then raise exception 'Dafür brauchst du % Sterne.', v_price; end if;
    insert into purchases (user_id, item, stars) values (auth.uid(), 'skin:' || p_skin, v_price);
  end if;
  update profiles set planet_skin = p_skin where id = auth.uid();
end $$;

create or replace function public.use_invite(p_token text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from invites where token = p_token;
  if not found then raise exception 'Einladung nicht gefunden'; end if;
  if v.used_by is null and v.inviter_id <> auth.uid()
     and (select invited_by from profiles where id = auth.uid()) is null
     and (select created_at from profiles where id = auth.uid()) > now() - interval '1 hour' then
    update invites set used_by = auth.uid() where token = p_token;
    update profiles set invited_by = v.inviter_id where id = auth.uid();
    update profiles set stars = stars + 10 where id = v.inviter_id; -- Einladen lohnt sich
  end if;
  return v.chain_id;
end $$;

-- Legt die heutige Tages-Kette an (Thema kommt vom Client, Datum zählt in UTC).
create or replace function public.ensure_daily_chain(p_title text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_day date := (now() at time zone 'utc')::date; v_id bigint;
begin
  select id into v_id from chains where daily_day = v_day;
  if v_id is null then
    insert into chains (title, origin_user_id, daily_day) values (p_title, null, v_day)
      on conflict (daily_day) do nothing returning id into v_id;
    if v_id is null then select id into v_id from chains where daily_day = v_day; end if;
  end if;
  return v_id;
end $$;

-- Demo-Modus: Sterne ohne Zahlung. Abschalten, sobald Stripe läuft:
--   update app_settings set value = 'false' where key = 'demo_mode';
create or replace function public.demo_add_stars(p_pack text)
returns void language plpgsql security definer set search_path = public as $$
declare v_stars int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if coalesce((select value from app_settings where key = 'demo_mode'), 'false') <> 'true' then
    raise exception 'Demo-Modus ist aus.';
  end if;
  v_stars := case p_pack when 'pack_s' then 100 when 'pack_m' then 550 when 'pack_l' then 1500 end;
  if v_stars is null then raise exception 'Paket nicht gefunden'; end if;
  update profiles set stars = stars + v_stars where id = auth.uid();
  insert into purchases (user_id, item, stars) values (auth.uid(), 'demo:' || p_pack, -v_stars);
end $$;

-- ---------- Bilder (Objektspeicher) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('bilder', 'bilder', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
  on conflict (id) do nothing;

create policy "bilder oeffentlich lesen" on storage.objects for select using (bucket_id = 'bilder');
create policy "eigene bilder hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'bilder' and (storage.foldername(name))[1] = auth.uid()::text);
