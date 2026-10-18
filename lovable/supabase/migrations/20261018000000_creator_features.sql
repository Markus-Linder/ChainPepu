-- ChainPepu, Teil 2: Videos, Folgen, Mitteilungen, Spenden (80/20), Auszahlungen, Inhaltsregeln.
-- Nach der ersten Migration ausführen.

-- ---------- Einstellungen ----------
insert into public.app_settings (key, value) values
  ('creator_share_percent', '80'),   -- Anteil des Creators an Spenden
  ('star_cents', '1'),               -- Auszahlungswert: 1 Stern = 1 Cent
  ('payout_min_stars', '1000'),      -- Mindestbetrag für eine Auszahlung
  ('report_threshold', '3')          -- ab so vielen Meldungen wird ein Glied verborgen
  on conflict (key) do nothing;

-- ---------- Spaltenerweiterungen ----------
alter table public.links add column if not exists video_url text;
alter table public.links add column if not exists status text not null default 'sichtbar'
  check (status in ('sichtbar', 'gemeldet', 'gesperrt'));
alter table public.links add column if not exists report_count integer not null default 0;
alter table public.chains add column if not exists donated_stars integer not null default 0;
alter table public.profiles add column if not exists earned_stars integer not null default 0;
alter table public.profiles add column if not exists is_moderator boolean not null default false;
alter table public.profiles add column if not exists accepted_rules_at timestamptz;

-- ---------- Folgen ----------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);
create index if not exists follows_creator_idx on public.follows(creator_id);

-- ---------- Mitteilungen ----------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,                    -- neue_kette | spende | neuer_follower | glied | moderation
  actor_id uuid references public.profiles(id) on delete set null,
  chain_id bigint references public.chains(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

-- ---------- Spenden, Plattform-Buch, Auszahlungen ----------
create table if not exists public.donations (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.chains(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  stars integer not null check (stars > 0),
  creator_share integer not null,
  platform_share integer not null,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists donations_chain_idx on public.donations(chain_id, created_at desc);

create table if not exists public.platform_ledger (
  id bigint generated always as identity primary key,
  source text not null,
  stars integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stars integer not null,
  cents integer not null,
  status text not null default 'angefordert' check (status in ('angefordert', 'bezahlt', 'abgelehnt')),
  created_at timestamptz not null default now()
);

-- ---------- Meldungen und Wortfilter ----------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  link_id bigint not null references public.links(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (link_id, reporter_id)
);

create table if not exists public.banned_terms (
  term text primary key
);
-- Startliste; im Supabase-Dashboard beliebig erweitern.
insert into public.banned_terms (term) values
  ('kill yourself'), ('bring dich um'), ('heil hitler'), ('sieg heil'),
  ('child porn'), ('kinderporno'), ('cp link'), ('nigger'), ('kanake')
  on conflict do nothing;

-- ---------- Sichten aktualisieren ----------
drop view if exists public.chain_stats;
create view public.chain_stats with (security_invoker = true) as
select c.*,
  (select count(*) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as link_count,
  (select count(distinct l.user_id) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as user_count,
  p.username as origin_username,
  p.display_name as origin_display_name,
  coalesce((select max(l.created_at) from public.links l where l.chain_id = c.id), c.created_at) as last_activity
from public.chains c
left join public.profiles p on p.id = c.origin_user_id;

drop view if exists public.map_edges;
create view public.map_edges with (security_invoker = true) as
select a.chain_id, a.user_id as from_user, b.user_id as to_user
from public.links a
join public.links b on b.chain_id = a.chain_id and b.position = a.position + 1
where a.user_id <> b.user_id and a.status = 'sichtbar' and b.status = 'sichtbar';

create or replace view public.creator_stats with (security_invoker = true) as
select p.id,
  (select count(*) from public.follows f where f.creator_id = p.id)::int as follower_count,
  (select coalesce(sum(d.stars), 0) from public.donations d where d.to_user = p.id)::int as donated_total
from public.profiles p;

-- ---------- Zeilensicherheit ----------
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.donations enable row level security;
alter table public.platform_ledger enable row level security;
alter table public.payouts enable row level security;
alter table public.reports enable row level security;
alter table public.banned_terms enable row level security;

create policy "follows lesen" on public.follows for select using (true);
create policy "eigene mitteilungen lesen" on public.notifications for select using (auth.uid() = user_id);
create policy "eigene mitteilungen aendern" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "spenden lesen" on public.donations for select using (true);
create policy "eigene auszahlungen lesen" on public.payouts for select using (auth.uid() = user_id);
create policy "moderatoren lesen meldungen" on public.reports for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_moderator));
-- banned_terms und platform_ledger: keine Richtlinie, nur Funktionen und Service-Role.

-- Gesperrte Glieder sieht nur der Autor und die Moderation.
drop policy if exists "glieder lesen" on public.links;
create policy "glieder lesen" on public.links for select using (
  status = 'sichtbar'
  or user_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and is_moderator)
);

-- ---------- Hilfsfunktionen ----------
create or replace function public.setting_int(p_key text, p_default int)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select value::int from app_settings where key = p_key), p_default)
$$;

-- Wortfilter: bricht ab, wenn ein gesperrter Begriff vorkommt.
create or replace function public.check_content(p_text text)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_term text;
begin
  if p_text is null then return; end if;
  for v_term in select term from banned_terms loop
    if position(lower(v_term) in lower(p_text)) > 0 then
      raise exception 'Dieser Inhalt verstößt gegen die Regeln von ChainPepu.';
    end if;
  end loop;
end $$;

create or replace function public.notify(p_user uuid, p_type text, p_actor uuid, p_chain bigint, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, actor_id, chain_id, message)
  values (p_user, p_type, p_actor, p_chain, p_message)
$$;

-- ---------- Ketten und Glieder: neue Signaturen mit Video ----------
drop function if exists public.start_chain(text, text, text, text);
create or replace function public.start_chain(p_title text, p_text text, p_image_url text, p_color text, p_video_url text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_title); perform check_content(p_text);
  insert into chains (title, origin_user_id) values (p_title, auth.uid()) returning id into v_id;
  insert into links (chain_id, user_id, position, text, image_url, video_url, color)
    values (v_id, auth.uid(), 1, p_text, nullif(p_image_url, ''), nullif(p_video_url, ''), coalesce(nullif(p_color, ''), '#7c5cff'));
  -- Follower informieren
  select display_name into v_name from profiles where id = auth.uid();
  insert into notifications (user_id, type, actor_id, chain_id, message)
    select f.follower_id, 'neue_kette', auth.uid(), v_id, v_name || ' hat eine neue Kette gestartet: „' || p_title || '“'
    from follows f where f.creator_id = auth.uid();
  return v_id;
end $$;

drop function if exists public.add_link(bigint, text, text, text);
create or replace function public.add_link(p_chain_id bigint, p_text text, p_image_url text, p_color text, p_video_url text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_pos int; v_id bigint; v_origin uuid; v_name text; v_title text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_text);
  select origin_user_id, title into v_origin, v_title from chains where id = p_chain_id;
  if not found then raise exception 'Kette nicht gefunden'; end if;
  perform 1 from chains where id = p_chain_id for update;
  select coalesce(max(position), 0) + 1 into v_pos from links where chain_id = p_chain_id;
  insert into links (chain_id, user_id, position, text, image_url, video_url, color)
    values (p_chain_id, auth.uid(), v_pos, p_text, nullif(p_image_url, ''), nullif(p_video_url, ''), coalesce(nullif(p_color, ''), '#7c5cff'))
    returning id into v_id;
  update profiles set stars = stars + 1 where id = auth.uid();
  if v_origin is not null and v_origin <> auth.uid() then
    select display_name into v_name from profiles where id = auth.uid();
    perform notify(v_origin, 'glied', auth.uid(), p_chain_id, v_name || ' hat ein Glied an „' || v_title || '“ gehängt');
  end if;
  return v_id;
end $$;

-- ---------- Folgen ----------
create or replace function public.follow_creator(p_creator uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_creator = auth.uid() then raise exception 'Du kannst dir nicht selbst folgen.'; end if;
  insert into follows (follower_id, creator_id) values (auth.uid(), p_creator) on conflict do nothing;
  if found then
    select display_name into v_name from profiles where id = auth.uid();
    perform notify(p_creator, 'neuer_follower', auth.uid(), null, v_name || ' folgt dir jetzt');
  end if;
end $$;

create or replace function public.unfollow_creator(p_creator uuid)
returns void language sql security definer set search_path = public as $$
  delete from follows where follower_id = auth.uid() and creator_id = p_creator
$$;

-- ---------- Spenden: Creator 80 %, Plattform 20 % ----------
create or replace function public.donate_stars(p_chain_id bigint, p_stars int, p_message text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_creator uuid; v_title text; v_share int; v_creator_part int; v_platform_part int; v_ok int; v_name text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_stars < 1 or p_stars > 100000 then raise exception 'Ungültiger Betrag.'; end if;
  perform check_content(p_message);
  select origin_user_id, title into v_creator, v_title from chains where id = p_chain_id;
  if v_creator is null then raise exception 'Für diese Kette gibt es keinen Creator.'; end if;
  if v_creator = auth.uid() then raise exception 'Du kannst dir nicht selbst spenden.'; end if;

  update profiles set stars = stars - p_stars where id = auth.uid() and stars >= p_stars;
  get diagnostics v_ok = row_count;
  if v_ok = 0 then raise exception 'Dafür brauchst du % Sterne.', p_stars; end if;

  v_share := setting_int('creator_share_percent', 80);
  v_creator_part := floor(p_stars * v_share / 100.0);
  v_platform_part := p_stars - v_creator_part;

  update profiles set earned_stars = earned_stars + v_creator_part where id = v_creator;
  insert into platform_ledger (source, stars) values ('spende:' || p_chain_id, v_platform_part);
  insert into donations (chain_id, from_user, to_user, stars, creator_share, platform_share, message)
    values (p_chain_id, auth.uid(), v_creator, p_stars, v_creator_part, v_platform_part, nullif(p_message, ''));
  update chains set donated_stars = donated_stars + p_stars where id = p_chain_id;

  select display_name into v_name from profiles where id = auth.uid();
  perform notify(v_creator, 'spende', auth.uid(), p_chain_id,
    v_name || ' hat dir ' || p_stars || ' Sterne für „' || v_title || '“ gespendet (' || v_creator_part || ' für dich)');
end $$;

-- ---------- Auszahlung ----------
create or replace function public.request_payout()
returns bigint language plpgsql security definer set search_path = public as $$
declare v_stars int; v_min int; v_cents int; v_id bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  v_min := setting_int('payout_min_stars', 1000);
  select earned_stars into v_stars from profiles where id = auth.uid() for update;
  if v_stars < v_min then raise exception 'Auszahlung ab % verdienten Sternen möglich.', v_min; end if;
  v_cents := v_stars * setting_int('star_cents', 1);
  update profiles set earned_stars = 0 where id = auth.uid();
  insert into payouts (user_id, stars, cents) values (auth.uid(), v_stars, v_cents) returning id into v_id;
  return v_id;
end $$;

-- Verdiente Sterne wieder als normale Sterne nutzen (statt Auszahlung).
create or replace function public.convert_earnings(p_stars int)
returns void language plpgsql security definer set search_path = public as $$
declare v_ok int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_stars < 1 then raise exception 'Ungültiger Betrag.'; end if;
  update profiles set earned_stars = earned_stars - p_stars, stars = stars + p_stars
    where id = auth.uid() and earned_stars >= p_stars;
  get diagnostics v_ok = row_count;
  if v_ok = 0 then raise exception 'So viele verdiente Sterne hast du nicht.'; end if;
end $$;

-- ---------- Meldungen und Moderation ----------
create or replace function public.report_link(p_link_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_count int; v_owner uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select user_id into v_owner from links where id = p_link_id;
  if not found then raise exception 'Glied nicht gefunden'; end if;
  if v_owner = auth.uid() then raise exception 'Eigene Glieder kannst du nicht melden.'; end if;
  insert into reports (link_id, reporter_id, reason) values (p_link_id, auth.uid(), left(coalesce(p_reason, ''), 300))
    on conflict do nothing;
  select count(*) into v_count from reports where link_id = p_link_id;
  update links set report_count = v_count where id = p_link_id;
  if v_count >= setting_int('report_threshold', 3) then
    update links set status = 'gemeldet' where id = p_link_id and status = 'sichtbar';
    if found then
      perform notify(v_owner, 'moderation', null, (select chain_id from links where id = p_link_id),
        'Ein Glied von dir wurde mehrfach gemeldet und ist bis zur Prüfung verborgen.');
    end if;
  end if;
end $$;

create or replace function public.moderate_link(p_link_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_chain bigint;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception 'Nur für Moderation.';
  end if;
  if p_status not in ('sichtbar', 'gesperrt') then raise exception 'Ungültiger Status.'; end if;
  update links set status = p_status where id = p_link_id returning user_id, chain_id into v_owner, v_chain;
  if p_status = 'gesperrt' then
    perform notify(v_owner, 'moderation', null, v_chain, 'Ein Glied von dir wurde wegen Regelverstoß gesperrt.');
  else
    delete from reports where link_id = p_link_id;
    update links set report_count = 0 where id = p_link_id;
  end if;
end $$;

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $$
  update notifications set read = true where user_id = auth.uid() and read = false
$$;

create or replace function public.accept_rules()
returns void language sql security definer set search_path = public as $$
  update profiles set accepted_rules_at = now() where id = auth.uid()
$$;

-- ---------- Videos (Objektspeicher) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('videos', 'videos', true, 104857600, array['video/mp4','video/webm','video/quicktime'])
  on conflict (id) do nothing;

create policy "videos oeffentlich lesen" on storage.objects for select using (bucket_id = 'videos');
create policy "eigene videos hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
