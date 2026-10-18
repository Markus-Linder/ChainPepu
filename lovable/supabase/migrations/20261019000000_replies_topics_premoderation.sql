-- ChainPepu, Teil 3: Antworten in Ketten, Creator-Themen, Prüfung VOR der Veröffentlichung,
-- übersetzbare Mitteilungen. Nach den ersten beiden Migrationen ausführen.

-- ---------- Einstellungen ----------
insert into public.app_settings (key, value) values
  ('premoderation', 'ki')            -- 'ki' = jeder Beitrag wartet auf die KI-Prüfung; 'aus' = sofort sichtbar (nur Wortfilter)
  on conflict (key) do nothing;

-- ---------- Spalten ----------
alter table public.links drop constraint if exists links_status_check;
alter table public.links add constraint links_status_check
  check (status in ('sichtbar', 'gemeldet', 'gesperrt', 'pruefung'));
alter table public.links add column if not exists moderation_note text;
alter table public.links add column if not exists video_frames text[];   -- Standbilder aus dem Video für die Prüfung

alter table public.chains add column if not exists description text check (description is null or char_length(description) <= 300);
alter table public.chains add column if not exists is_topic boolean not null default false;
alter table public.chains add column if not exists ends_at timestamptz;

alter table public.notifications add column if not exists params jsonb;  -- {key, actor, title, stars, share, reason}

-- ---------- Antworten (Gespräch unter jedem Glied) ----------
create table if not exists public.replies (
  id bigint generated always as identity primary key,
  link_id bigint not null references public.links(id) on delete cascade,
  chain_id bigint not null references public.chains(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  status text not null default 'sichtbar' check (status in ('sichtbar', 'gesperrt', 'pruefung')),
  moderation_note text,
  created_at timestamptz not null default now()
);
create index if not exists replies_chain_idx on public.replies(chain_id, created_at);
create index if not exists replies_link_idx on public.replies(link_id, created_at);

alter table public.replies enable row level security;
drop policy if exists "antworten lesen" on public.replies;
create policy "antworten lesen" on public.replies for select using (
  status = 'sichtbar'
  or user_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and is_moderator)
);

-- ---------- Sichten neu anlegen (neue Spalten der Ketten aufnehmen) ----------
drop view if exists public.chain_stats;
create view public.chain_stats with (security_invoker = true) as
select c.*,
  (select count(*) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as link_count,
  (select count(distinct l.user_id) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as user_count,
  (select count(*) from public.replies r where r.chain_id = c.id and r.status = 'sichtbar')::int as reply_count,
  p.username as origin_username,
  p.display_name as origin_display_name,
  coalesce((select max(l.created_at) from public.links l where l.chain_id = c.id), c.created_at) as last_activity
from public.chains c
left join public.profiles p on p.id = c.origin_user_id;

-- ---------- Hilfsfunktionen ----------
create or replace function public.new_status()
returns text language sql stable security definer set search_path = public as $$
  select case when coalesce((select value from app_settings where key = 'premoderation'), 'ki') = 'ki'
              then 'pruefung' else 'sichtbar' end
$$;

drop function if exists public.notify(uuid, text, uuid, bigint, text);
create or replace function public.notify(p_user uuid, p_type text, p_actor uuid, p_chain bigint, p_message text, p_params jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, actor_id, chain_id, message, params)
  values (p_user, p_type, p_actor, p_chain, p_message, p_params)
$$;

-- Wird ein Glied sichtbar (sofort oder nach Prüfung): Stern fürs Mitmachen, Ursprung informieren.
create or replace function public.on_link_visible()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_origin uuid; v_title text; v_name text;
begin
  if new.status <> 'sichtbar' then return new; end if;
  if tg_op = 'UPDATE' and old.status <> 'pruefung' then return new; end if;
  update profiles set stars = stars + 1 where id = new.user_id;
  select origin_user_id, title into v_origin, v_title from chains where id = new.chain_id;
  select display_name into v_name from profiles where id = new.user_id;
  if v_origin is not null and v_origin <> new.user_id then
    perform notify(v_origin, 'glied', new.user_id, new.chain_id,
      v_name || ' hat ein Glied an „' || v_title || '“ gehängt',
      jsonb_build_object('key', 'link', 'actor', v_name, 'title', v_title));
  end if;
  if tg_op = 'UPDATE' then
    perform notify(new.user_id, 'moderation', null, new.chain_id,
      'Dein Beitrag wurde geprüft und ist jetzt online.', jsonb_build_object('key', 'approved'));
  end if;
  return new;
end $$;
drop trigger if exists link_visible on public.links;
create trigger link_visible after insert or update of status on public.links
  for each row execute function public.on_link_visible();

-- Wird eine Antwort sichtbar: Autor des Glieds informieren.
create or replace function public.on_reply_visible()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_name text;
begin
  if new.status <> 'sichtbar' then return new; end if;
  if tg_op = 'UPDATE' and old.status <> 'pruefung' then return new; end if;
  select l.user_id, c.title into v_owner, v_title from links l join chains c on c.id = l.chain_id where l.id = new.link_id;
  select display_name into v_name from profiles where id = new.user_id;
  if v_owner is not null and v_owner <> new.user_id then
    perform notify(v_owner, 'antwort', new.user_id, new.chain_id,
      v_name || ' hat auf dein Glied in „' || v_title || '“ geantwortet',
      jsonb_build_object('key', 'reply', 'actor', v_name, 'title', v_title));
  end if;
  return new;
end $$;
drop trigger if exists reply_visible on public.replies;
create trigger reply_visible after insert or update of status on public.replies
  for each row execute function public.on_reply_visible();

-- ---------- Ketten starten (mit Thema) und Glieder anhängen ----------
drop function if exists public.start_chain(text, text, text, text, text);
create or replace function public.start_chain(
  p_title text, p_text text, p_image_url text, p_color text, p_video_url text default null,
  p_video_frames text[] default null, p_description text default null, p_is_topic boolean default false, p_days int default 3)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text; v_days int := greatest(1, least(14, coalesce(p_days, 3)));
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_title); perform check_content(p_text); perform check_content(p_description);
  insert into chains (title, origin_user_id, description, is_topic, ends_at)
    values (p_title, auth.uid(), nullif(p_description, ''), coalesce(p_is_topic, false),
            case when coalesce(p_is_topic, false) then now() + (v_days || ' days')::interval else null end)
    returning id into v_id;
  insert into links (chain_id, user_id, position, text, image_url, video_url, video_frames, color, status)
    values (v_id, auth.uid(), 1, p_text, nullif(p_image_url, ''), nullif(p_video_url, ''), p_video_frames,
            coalesce(nullif(p_color, ''), '#7c5cff'), new_status());
  select display_name into v_name from profiles where id = auth.uid();
  insert into notifications (user_id, type, actor_id, chain_id, message, params)
    select f.follower_id, 'neue_kette', auth.uid(), v_id, v_name || ' hat eine neue Kette gestartet: „' || p_title || '“',
           jsonb_build_object('key', 'new_chain', 'actor', v_name, 'title', p_title)
    from follows f where f.creator_id = auth.uid();
  return v_id;
end $$;

drop function if exists public.add_link(bigint, text, text, text, text);
create or replace function public.add_link(p_chain_id bigint, p_text text, p_image_url text, p_color text, p_video_url text default null, p_video_frames text[] default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_pos int; v_id bigint; v_ends timestamptz;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_text);
  select ends_at into v_ends from chains where id = p_chain_id;
  if not found then raise exception 'Kette nicht gefunden'; end if;
  if v_ends is not null and v_ends < now() then raise exception 'Dieses Thema ist beendet.'; end if;
  perform 1 from chains where id = p_chain_id for update;
  select coalesce(max(position), 0) + 1 into v_pos from links where chain_id = p_chain_id;
  insert into links (chain_id, user_id, position, text, image_url, video_url, video_frames, color, status)
    values (p_chain_id, auth.uid(), v_pos, p_text, nullif(p_image_url, ''), nullif(p_video_url, ''), p_video_frames,
            coalesce(nullif(p_color, ''), '#7c5cff'), new_status())
    returning id into v_id;
  return v_id;
end $$;

-- ---------- Antworten ----------
create or replace function public.add_reply(p_link_id bigint, p_text text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_chain bigint; v_id bigint;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_text);
  select chain_id into v_chain from links where id = p_link_id and status = 'sichtbar';
  if not found then raise exception 'Glied nicht gefunden'; end if;
  insert into replies (link_id, chain_id, user_id, text, status)
    values (p_link_id, v_chain, auth.uid(), p_text, new_status()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.moderate_reply(p_reply_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_chain bigint;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then raise exception 'Nur für Moderation.'; end if;
  if p_status not in ('sichtbar', 'gesperrt') then raise exception 'Ungültiger Status.'; end if;
  update replies set status = p_status where id = p_reply_id returning user_id, chain_id into v_owner, v_chain;
  if p_status = 'gesperrt' then
    perform notify(v_owner, 'moderation', null, v_chain, 'Eine Antwort von dir wurde wegen Regelverstoß gesperrt.', jsonb_build_object('key', 'blocked'));
  end if;
end $$;

-- ---------- Bestehende Funktionen: Mitteilungen mit Parametern ----------
create or replace function public.follow_creator(p_creator uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if p_creator = auth.uid() then raise exception 'Du kannst dir nicht selbst folgen.'; end if;
  insert into follows (follower_id, creator_id) values (auth.uid(), p_creator) on conflict do nothing;
  if found then
    select display_name into v_name from profiles where id = auth.uid();
    perform notify(p_creator, 'neuer_follower', auth.uid(), null, v_name || ' folgt dir jetzt', jsonb_build_object('key', 'follower', 'actor', v_name));
  end if;
end $$;

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
    v_name || ' hat dir ' || p_stars || ' Sterne für „' || v_title || '“ gespendet (' || v_creator_part || ' für dich)',
    jsonb_build_object('key', 'donation', 'actor', v_name, 'title', v_title, 'stars', p_stars, 'share', v_creator_part));
end $$;

create or replace function public.report_link(p_link_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_count int; v_owner uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select user_id into v_owner from links where id = p_link_id;
  if not found then raise exception 'Glied nicht gefunden'; end if;
  if v_owner = auth.uid() then raise exception 'Eigene Glieder kannst du nicht melden.'; end if;
  insert into reports (link_id, reporter_id, reason) values (p_link_id, auth.uid(), left(coalesce(p_reason, ''), 300)) on conflict do nothing;
  select count(*) into v_count from reports where link_id = p_link_id;
  update links set report_count = v_count where id = p_link_id;
  if v_count >= setting_int('report_threshold', 3) then
    update links set status = 'gemeldet' where id = p_link_id and status = 'sichtbar';
    if found then
      perform notify(v_owner, 'moderation', null, (select chain_id from links where id = p_link_id),
        'Ein Glied von dir wurde mehrfach gemeldet und ist bis zur Prüfung verborgen.', jsonb_build_object('key', 'reported'));
    end if;
  end if;
end $$;

create or replace function public.moderate_link(p_link_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_chain bigint;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then raise exception 'Nur für Moderation.'; end if;
  if p_status not in ('sichtbar', 'gesperrt') then raise exception 'Ungültiger Status.'; end if;
  update links set status = p_status where id = p_link_id returning user_id, chain_id into v_owner, v_chain;
  if p_status = 'gesperrt' then
    perform notify(v_owner, 'moderation', null, v_chain, 'Ein Glied von dir wurde wegen Regelverstoß gesperrt.', jsonb_build_object('key', 'blocked'));
  else
    delete from reports where link_id = p_link_id;
    update links set report_count = 0 where id = p_link_id;
  end if;
end $$;
