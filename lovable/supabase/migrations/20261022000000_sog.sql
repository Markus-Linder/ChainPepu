-- ChainPepu, Teil 6 „Sog“: Planeten-Entwicklung (XP, Level, Streaks), Wochen-Challenge mit Preis-Topf,
-- Push-Mitteilungen. Nach Teil 1–5 ausführen.

-- ---------- Einstellungen ----------
insert into public.app_settings (key, value) values
  ('xp_link', '10'),               -- XP pro sichtbarem Glied
  ('xp_reply', '3'),               -- XP pro sichtbarer Antwort
  ('xp_star', '1'),                -- XP pro erhaltenem Stern (Creator-Anteil)
  ('weekly_prize_percent', '25')   -- Anteil des Plattform-Anteils der Woche, der in den Preis-Topf geht
  on conflict (key) do nothing;

-- ---------- Planeten-Entwicklung ----------
alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists streak_days integer not null default 0;
alter table public.profiles add column if not exists last_active_day date;

-- XP gutschreiben, Level berechnen, Tages-Streak pflegen (UTC-Tage).
create or replace function public.award_xp(p_user uuid, p_points int)
returns void language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'utc')::date; v_last date; v_streak int;
begin
  if p_user is null then return; end if;
  select last_active_day, streak_days into v_last, v_streak from profiles where id = p_user for update;
  if v_last is null or v_last < v_today - 1 then v_streak := 1;
  elsif v_last = v_today - 1 then v_streak := v_streak + 1;
  end if;
  update profiles set xp = xp + greatest(0, p_points), level = floor(sqrt((xp + greatest(0, p_points)) / 50.0))::int + 1,
    streak_days = v_streak, last_active_day = v_today where id = p_user;
end $$;

create or replace function public.on_link_visible()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_origin uuid; v_title text; v_name text;
begin
  if new.status <> 'sichtbar' then return new; end if;
  if tg_op = 'UPDATE' and old.status <> 'pruefung' then return new; end if;
  update profiles set stars = stars + 1 where id = new.user_id;
  perform award_xp(new.user_id, setting_int('xp_link', 10));
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

create or replace function public.on_reply_visible()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_name text;
begin
  if new.status <> 'sichtbar' then return new; end if;
  if tg_op = 'UPDATE' and old.status <> 'pruefung' then return new; end if;
  perform award_xp(new.user_id, setting_int('xp_reply', 3));
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
  perform award_xp(v_creator, v_creator_part * setting_int('xp_star', 1));
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

-- ---------- Wochen-Challenge ----------
create table if not exists public.weekly_challenges (
  week_start date primary key,
  pool_stars integer not null default 0,
  winner_chain bigint references public.chains(id),
  winner_user uuid references public.profiles(id),
  settled_at timestamptz not null default now()
);
alter table public.weekly_challenges enable row level security;
drop policy if exists "wochen lesen" on public.weekly_challenges;
create policy "wochen lesen" on public.weekly_challenges for select using (true);

create or replace function public.week_start(p_at timestamptz default now())
returns date language sql immutable as $$ select date_trunc('week', p_at at time zone 'utc')::date $$;

-- Punkte je Kette in einer Woche: Glieder × 5 + gespendete Sterne.
create or replace function public.week_points(p_week date)
returns table (chain_id bigint, points int) language sql stable security definer set search_path = public as $$
  select x.chain_id, sum(x.p)::int as points from (
    select l.chain_id, 5 as p from links l where l.status = 'sichtbar' and l.created_at >= p_week and l.created_at < p_week + 7
    union all
    select d.chain_id, d.stars from donations d where d.created_at >= p_week and d.created_at < p_week + 7
  ) x group by x.chain_id
$$;

-- Preis-Topf einer Woche: Anteil des Plattform-Anteils dieser Woche.
create or replace function public.week_pool(p_week date default null)
returns int language sql stable security definer set search_path = public as $$
  select floor(coalesce(sum(stars), 0) * setting_int('weekly_prize_percent', 25) / 100.0)::int
  from platform_ledger where created_at >= coalesce(p_week, week_start()) and created_at < coalesce(p_week, week_start()) + 7
$$;

-- Rangliste der laufenden Woche (für Startseite und Ranglisten).
create or replace view public.week_leaderboard with (security_invoker = true) as
select cs.*, wp.points as week_points
from public.chain_stats cs join public.week_points(public.week_start()) wp on wp.chain_id = cs.id;

-- Vorwoche abschließen: Gewinner-Creator bekommt den Topf als verdiente Sterne. Darf jeder anstoßen, läuft nur einmal.
create or replace function public.settle_week()
returns void language plpgsql security definer set search_path = public as $$
declare v_week date := week_start() - 7; v_chain bigint; v_user uuid; v_pool int; v_title text;
begin
  if exists (select 1 from weekly_challenges where week_start = v_week) then return; end if;
  select wp.chain_id into v_chain from week_points(v_week) wp join chains c on c.id = wp.chain_id
    where c.origin_user_id is not null order by wp.points desc, wp.chain_id limit 1;
  v_pool := week_pool(v_week);
  if v_chain is null then
    insert into weekly_challenges (week_start, pool_stars) values (v_week, v_pool) on conflict do nothing;
    return;
  end if;
  select origin_user_id, title into v_user, v_title from chains where id = v_chain;
  insert into weekly_challenges (week_start, pool_stars, winner_chain, winner_user) values (v_week, v_pool, v_chain, v_user) on conflict do nothing;
  if found and v_pool > 0 then
    update profiles set earned_stars = earned_stars + v_pool where id = v_user;
    update chains set crowns = crowns + 1 where id = v_chain;
    perform notify(v_user, 'spende', null, v_chain, 'Wochen-Challenge gewonnen: „' || v_title || '“. ' || v_pool || ' Sterne aus dem Topf sind deine.',
      jsonb_build_object('key', 'weekly_won', 'title', v_title, 'stars', v_pool));
  end if;
end $$;

-- ---------- Push-Mitteilungen ----------
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "eigene push lesen" on public.push_subscriptions;
create policy "eigene push lesen" on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "eigene push anlegen" on public.push_subscriptions;
create policy "eigene push anlegen" on public.push_subscriptions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "eigene push loeschen" on public.push_subscriptions;
create policy "eigene push loeschen" on public.push_subscriptions for delete using (auth.uid() = user_id);
