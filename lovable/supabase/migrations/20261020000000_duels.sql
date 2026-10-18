-- ChainPepu, Teil 4: Ketten-Duell. Zwei Ketten treten gegeneinander an, das Universum entscheidet live:
-- jedes neue Glied, jede Antwort und jeder Stern schiebt den Balken. Sterne zählen doppelt.
-- Die Gewinner-Kette bekommt eine Krone (auf der Karte sichtbar), der Creator einen Duell-Sieg im Profil.
-- Nach den ersten drei Migrationen ausführen.

-- ---------- Einstellungen ----------
insert into public.app_settings (key, value) values
  ('duel_star_multiplier', '2'),   -- Sterne zählen im Duell doppelt
  ('duel_link_points', '5'),       -- Punkte pro sichtbarem Glied
  ('duel_reply_points', '2'),      -- Punkte pro sichtbarer Antwort
  ('duel_link_cooldown_sec', '60') -- pro Planet zählt nur ein Glied pro Minute (gegen Spam)
  on conflict (key) do nothing;

-- ---------- Spalten ----------
alter table public.chains add column if not exists crowns integer not null default 0;
alter table public.profiles add column if not exists duel_wins integer not null default 0;

-- ---------- Duelle ----------
create table if not exists public.duels (
  id bigint generated always as identity primary key,
  chain_a bigint not null references public.chains(id) on delete cascade,  -- Herausforderer
  chain_b bigint not null references public.chains(id) on delete cascade,  -- Herausgeforderter
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'offen' check (status in ('offen', 'laeuft', 'beendet', 'abgelehnt')),
  duration_minutes integer not null check (duration_minutes between 10 and 1440),
  starts_at timestamptz,
  ends_at timestamptz,
  score_a integer not null default 0,
  score_b integer not null default 0,
  winner_chain bigint references public.chains(id),
  created_at timestamptz not null default now(),
  check (chain_a <> chain_b)
);
create index if not exists duels_status_idx on public.duels(status, ends_at);
create index if not exists duels_chain_a_idx on public.duels(chain_a);
create index if not exists duels_chain_b_idx on public.duels(chain_b);

-- Live-Ticker: jede Aktion, die Punkte gebracht hat.
create table if not exists public.duel_events (
  id bigint generated always as identity primary key,
  duel_id bigint not null references public.duels(id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  kind text not null check (kind in ('glied', 'antwort', 'stern')),
  points integer not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);
create index if not exists duel_events_duel_idx on public.duel_events(duel_id, created_at desc);

alter table public.duels enable row level security;
alter table public.duel_events enable row level security;
drop policy if exists "duelle lesen" on public.duels;
create policy "duelle lesen" on public.duels for select using (true);
drop policy if exists "duell ereignisse lesen" on public.duel_events;
create policy "duell ereignisse lesen" on public.duel_events for select using (true);

-- Echtzeit: Arena und Startseite bekommen Änderungen sofort.
do $$ begin
  alter publication supabase_realtime add table public.duels;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.duel_events;
exception when duplicate_object then null; end $$;

-- ---------- Sicht aktualisieren (Kronen aufnehmen) ----------
drop view if exists public.chain_stats;
create view public.chain_stats with (security_invoker = true) as
select c.*,
  (select count(*) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as link_count,
  (select count(distinct l.user_id) from public.links l where l.chain_id = c.id and l.status = 'sichtbar')::int as user_count,
  (select count(*) from public.replies r where r.chain_id = c.id and r.status = 'sichtbar')::int as reply_count,
  p.username as origin_username,
  p.display_name as origin_display_name,
  coalesce((select max(l.created_at) from public.links l where l.chain_id = c.id), c.created_at) as last_activity,
  (select d.id from public.duels d where d.status = 'laeuft' and (d.chain_a = c.id or d.chain_b = c.id) and d.ends_at > now() limit 1) as active_duel_id
from public.chains c
left join public.profiles p on p.id = c.origin_user_id;

-- ---------- Punkte ----------
-- Schreibt Punkte für eine Kette gut, wenn sie gerade in einem laufenden Duell steckt.
create or replace function public.duel_add_points(p_chain bigint, p_kind text, p_actor uuid, p_points int)
returns void language plpgsql security definer set search_path = public as $$
declare v_duel duels%rowtype; v_side text; v_name text; v_cooldown int;
begin
  select * into v_duel from duels where status = 'laeuft' and ends_at > now() and (chain_a = p_chain or chain_b = p_chain) limit 1;
  if not found or p_points <= 0 then return; end if;
  v_side := case when v_duel.chain_a = p_chain then 'a' else 'b' end;
  if p_kind = 'glied' then
    v_cooldown := setting_int('duel_link_cooldown_sec', 60);
    if exists (select 1 from duel_events where duel_id = v_duel.id and actor_id = p_actor and kind = 'glied'
               and created_at > now() - (v_cooldown || ' seconds')::interval) then
      return; -- zu schnell hintereinander: zählt nicht
    end if;
  end if;
  select display_name into v_name from profiles where id = p_actor;
  insert into duel_events (duel_id, side, kind, points, actor_id, actor_name) values (v_duel.id, v_side, p_kind, p_points, p_actor, v_name);
  if v_side = 'a' then update duels set score_a = score_a + p_points where id = v_duel.id;
  else update duels set score_b = score_b + p_points where id = v_duel.id; end if;
end $$;

-- Glied sichtbar → Punkte (ergänzt den bestehenden Trigger).
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
  perform duel_add_points(new.chain_id, 'glied', new.user_id, setting_int('duel_link_points', 5));
  return new;
end $$;

-- Antwort sichtbar → Punkte.
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
  perform duel_add_points(new.chain_id, 'antwort', new.user_id, setting_int('duel_reply_points', 2));
  return new;
end $$;

-- Spende → Punkte (Sterne × Multiplikator). Aufteilung 80/20 bleibt unverändert.
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
  perform duel_add_points(p_chain_id, 'stern', auth.uid(), p_stars * setting_int('duel_star_multiplier', 2));
end $$;

-- ---------- Duell-Ablauf ----------
-- Herausfordern: meine Kette (a) gegen eine fremde Kette (b). Der Creator von b muss annehmen.
create or replace function public.create_duel(p_chain_a bigint, p_chain_b bigint, p_minutes int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_a chains%rowtype; v_b chains%rowtype; v_id bigint; v_name text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v_a from chains where id = p_chain_a;
  if not found or v_a.origin_user_id <> auth.uid() then raise exception 'err_duel_own_chain'; end if;
  select * into v_b from chains where id = p_chain_b;
  if not found or v_b.origin_user_id is null then raise exception 'err_duel_no_creator'; end if;
  if v_b.origin_user_id = auth.uid() then raise exception 'err_duel_self'; end if;
  if exists (select 1 from duels where status in ('offen', 'laeuft') and (chain_a in (p_chain_a, p_chain_b) or chain_b in (p_chain_a, p_chain_b))) then
    raise exception 'err_duel_busy';
  end if;
  insert into duels (chain_a, chain_b, challenger_id, opponent_id, duration_minutes)
    values (p_chain_a, p_chain_b, auth.uid(), v_b.origin_user_id, greatest(10, least(1440, p_minutes))) returning id into v_id;
  select display_name into v_name from profiles where id = auth.uid();
  perform notify(v_b.origin_user_id, 'duell', auth.uid(), p_chain_b,
    v_name || ' fordert „' || v_b.title || '“ zum Duell heraus',
    jsonb_build_object('key', 'duel_challenge', 'actor', v_name, 'title', v_b.title, 'duel', v_id));
  return v_id;
end $$;

-- Annehmen oder ablehnen (nur der herausgeforderte Creator).
create or replace function public.respond_duel(p_duel_id bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v duels%rowtype; v_name text; v_title text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from duels where id = p_duel_id for update;
  if not found or v.opponent_id <> auth.uid() or v.status <> 'offen' then raise exception 'err_duel_not_allowed'; end if;
  select display_name into v_name from profiles where id = auth.uid();
  select title into v_title from chains where id = v.chain_b;
  if p_accept then
    update duels set status = 'laeuft', starts_at = now(), ends_at = now() + (v.duration_minutes || ' minutes')::interval where id = p_duel_id;
    perform notify(v.challenger_id, 'duell', auth.uid(), v.chain_a, v_name || ' hat das Duell angenommen. Es läuft jetzt!',
      jsonb_build_object('key', 'duel_accepted', 'actor', v_name, 'title', v_title, 'duel', p_duel_id));
  else
    update duels set status = 'abgelehnt' where id = p_duel_id;
    perform notify(v.challenger_id, 'duell', auth.uid(), v.chain_a, v_name || ' hat das Duell abgelehnt.',
      jsonb_build_object('key', 'duel_declined', 'actor', v_name, 'title', v_title, 'duel', p_duel_id));
  end if;
end $$;

-- Abschließen: darf jeder anstoßen, sobald die Zeit abgelaufen ist. Krone und Sieg werden vergeben.
create or replace function public.finish_duel(p_duel_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v duels%rowtype; v_winner bigint; v_loser bigint; v_winner_user uuid; v_loser_user uuid; v_title text;
begin
  select * into v from duels where id = p_duel_id for update;
  if not found or v.status <> 'laeuft' or v.ends_at > now() then return; end if;
  if v.score_a = v.score_b then
    update duels set status = 'beendet', winner_chain = null where id = p_duel_id;
    perform notify(v.challenger_id, 'duell', null, v.chain_a, 'Das Duell endete unentschieden.', jsonb_build_object('key', 'duel_draw', 'duel', p_duel_id));
    perform notify(v.opponent_id, 'duell', null, v.chain_b, 'Das Duell endete unentschieden.', jsonb_build_object('key', 'duel_draw', 'duel', p_duel_id));
    return;
  end if;
  if v.score_a > v.score_b then v_winner := v.chain_a; v_loser := v.chain_b; v_winner_user := v.challenger_id; v_loser_user := v.opponent_id;
  else v_winner := v.chain_b; v_loser := v.chain_a; v_winner_user := v.opponent_id; v_loser_user := v.challenger_id; end if;
  update duels set status = 'beendet', winner_chain = v_winner where id = p_duel_id;
  update chains set crowns = crowns + 1 where id = v_winner;
  update profiles set duel_wins = duel_wins + 1 where id = v_winner_user;
  select title into v_title from chains where id = v_winner;
  perform notify(v_winner_user, 'duell', null, v_winner, 'Deine Kette „' || v_title || '“ hat das Duell gewonnen. Krone!',
    jsonb_build_object('key', 'duel_won', 'title', v_title, 'duel', p_duel_id));
  perform notify(v_loser_user, 'duell', null, v_loser, 'Das Duell ist vorbei. „' || v_title || '“ hat gewonnen.',
    jsonb_build_object('key', 'duel_lost', 'title', v_title, 'duel', p_duel_id));
end $$;
