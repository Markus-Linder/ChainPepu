-- ChainPepu – initial schema (Postgres / Supabase)
-- All money amounts are integer cents (EUR). Credits are integers (1 credit = 1 cent face value).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'visitor' check (role in ('visitor','creator','admin')),
  handle text not null unique,
  display_name text not null,
  avatar_url text,
  locale text not null default 'en',
  credits integer not null default 0 check (credits >= 0),
  subscription_status text not null default 'none' check (subscription_status in ('none','trialing','active','past_due','canceled')),
  subscription_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tiktok_open_id text unique,
  tiktok_username text,
  payout_details jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Auto-create a profile for every auth user (email, OAuth or anonymous).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'handle', split_part(coalesce(new.email, ''), '@', 1), ''), '[^a-z0-9_]', '', 'g'));
  if base = '' then base := 'guest_' || substr(replace(new.id::text, '-', ''), 1, 6); end if;
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    n := n + 1; candidate := base || n::text;
  end loop;
  insert into public.profiles (id, handle, display_name, avatar_url, locale)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', initcap(replace(candidate, '_', ' '))),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'locale', 'en')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- tiktok connections (tokens, service-role only)
create table if not exists public.tiktok_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  open_id text not null unique,
  username text,
  display_name text,
  avatar_url text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- creatures
create table if not exists public.creatures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  species text not null,
  genesis_source text not null default 'tiktok' check (genesis_source in ('tiktok','prompt','photo','sandbox')),
  dna jsonb not null,
  dna_hash text not null unique,
  persona jsonb not null,
  content_profile jsonb not null,
  cosmetics text[] not null default '{}',
  satiety real not null default 80,
  energy real not null default 80,
  happiness real not null default 70,
  hygiene real not null default 80,
  health real not null default 100,
  alive boolean not null default true,
  sleeping boolean not null default false,
  xp integer not null default 0,
  level integer not null default 1,
  elo integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  battle_boost real not null default 0,
  accepts_battles boolean not null default true,
  lifetime_gross_cents bigint not null default 0,
  visit_count integer not null default 0,
  born_at timestamptz not null default now(),
  died_at timestamptz,
  last_tick_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  last_battle_at timestamptz,
  last_free_play_at timestamptz
);
create index if not exists creatures_elo_idx on public.creatures(elo desc);

-- ---------------------------------------------------------------- memories
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  creature_id uuid not null references public.creatures(id) on delete cascade,
  kind text not null check (kind in ('episodic','fact','relationship','lesson','preference')),
  content text not null,
  importance integer not null default 3,
  about_user_id uuid,
  about_creature_id uuid,
  created_at timestamptz not null default now(),
  last_recalled_at timestamptz
);
create index if not exists memories_creature_idx on public.memories(creature_id, created_at desc);

-- ---------------------------------------------------------------- chat
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  creature_id uuid not null references public.creatures(id) on delete cascade,
  user_id uuid,
  user_name text,
  role text not null check (role in ('user','creature','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_creature_idx on public.chat_messages(creature_id, created_at desc);

-- ---------------------------------------------------------------- inventory (owner-stocked items)
create table if not exists public.inventory (
  creature_id uuid not null references public.creatures(id) on delete cascade,
  item_slug text not null,
  qty integer not null default 0 check (qty >= 0),
  primary key (creature_id, item_slug)
);

-- ---------------------------------------------------------------- ledger
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('credit_purchase','subscription','gift','action_spend','battle_stake','battle_reward','quest_reward','payout','revive','bonus')),
  user_id uuid,
  creature_id uuid,
  credits integer not null default 0,
  gross_cents integer not null default 0,
  creator_cents integer not null default 0,
  platform_cents integer not null default 0,
  status text not null default 'completed' check (status in ('completed','pending','failed')),
  stripe_ref text unique,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tx_creature_idx on public.transactions(creature_id, created_at desc);
create index if not exists tx_user_idx on public.transactions(user_id, created_at desc);

-- ---------------------------------------------------------------- gifts (live feed)
create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  creature_id uuid not null references public.creatures(id) on delete cascade,
  item_slug text not null,
  sender_id uuid,
  sender_name text not null,
  price_credits integer not null,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists gifts_creature_idx on public.gifts(creature_id, created_at desc);

-- ---------------------------------------------------------------- battles
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.creatures(id) on delete cascade,
  defender_id uuid not null references public.creatures(id) on delete cascade,
  winner_id uuid,
  stake_credits integer not null default 0,
  log jsonb not null,
  challenger_elo_delta integer not null default 0,
  defender_elo_delta integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists battles_created_idx on public.battles(created_at desc);

-- ---------------------------------------------------------------- creature conversations
create table if not exists public.creature_conversations (
  id uuid primary key default gen_random_uuid(),
  creature_a_id uuid not null references public.creatures(id) on delete cascade,
  creature_b_id uuid not null references public.creatures(id) on delete cascade,
  topic text not null,
  transcript jsonb not null,
  summary text not null,
  relationship text,
  created_at timestamptz not null default now()
);
create index if not exists convo_created_idx on public.creature_conversations(created_at desc);

-- ---------------------------------------------------------------- quests
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  creature_id uuid not null references public.creatures(id) on delete cascade,
  audience text not null check (audience in ('creator','community')),
  template_key text not null,
  event_type text not null,
  goal integer not null,
  progress integer not null default 0,
  reward_credits integer not null default 0,
  reward_xp integer not null default 0,
  day_key text not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (creature_id, day_key, template_key, audience)
);

-- ---------------------------------------------------------------- visits (daily uniques)
create table if not exists public.visits (
  creature_id uuid not null references public.creatures(id) on delete cascade,
  visitor_key text not null,
  day_key text not null,
  created_at timestamptz not null default now(),
  primary key (creature_id, visitor_key, day_key)
);

-- ---------------------------------------------------------------- webhook idempotency
create table if not exists public.processed_events (
  id text primary key,
  processed_at timestamptz not null default now()
);

-- ================================================================ RLS
alter table public.profiles enable row level security;
alter table public.tiktok_connections enable row level security;
alter table public.creatures enable row level security;
alter table public.memories enable row level security;
alter table public.chat_messages enable row level security;
alter table public.inventory enable row level security;
alter table public.transactions enable row level security;
alter table public.gifts enable row level security;
alter table public.battles enable row level security;
alter table public.creature_conversations enable row level security;
alter table public.quests enable row level security;
alter table public.visits enable row level security;
alter table public.processed_events enable row level security;

-- profiles: everyone may read public columns through the view below; owners read/update their own row.
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles p where p.id = auth.uid()) and credits = (select credits from public.profiles p where p.id = auth.uid()));

create or replace view public.public_profiles
  with (security_invoker = false) as
  select id, handle, display_name, avatar_url, role, tiktok_username, created_at from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- creatures: public read; owner may update settings columns only (enforced by trigger below).
create policy "creatures public read" on public.creatures for select using (true);
create policy "creatures owner update" on public.creatures for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.guard_creature_owner_update()
returns trigger language plpgsql as $$
begin
  -- Only edge functions (service role) may change game state. Owners may only rename / toggle battles.
  if current_user <> 'service_role'
     and coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') <> 'service_role' then
    if new.satiety <> old.satiety or new.energy <> old.energy or new.happiness <> old.happiness or new.hygiene <> old.hygiene
       or new.health <> old.health or new.alive <> old.alive or new.xp <> old.xp or new.level <> old.level or new.elo <> old.elo
       or new.wins <> old.wins or new.losses <> old.losses or new.dna <> old.dna or new.dna_hash <> old.dna_hash
       or new.lifetime_gross_cents <> old.lifetime_gross_cents or new.owner_id <> old.owner_id or new.slug <> old.slug
       or new.battle_boost <> old.battle_boost or new.cosmetics <> old.cosmetics or new.persona <> old.persona then
      raise exception 'Only name and accepts_battles can be changed by the owner';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists creatures_guard_owner_update on public.creatures;
create trigger creatures_guard_owner_update before update on public.creatures
  for each row execute function public.guard_creature_owner_update();

create policy "memories public read" on public.memories for select using (true);
create policy "chat public read" on public.chat_messages for select using (true);
create policy "inventory owner read" on public.inventory for select
  using (exists (select 1 from public.creatures c where c.id = creature_id and c.owner_id = auth.uid()));
create policy "transactions own read" on public.transactions for select
  using (auth.uid() = user_id or exists (select 1 from public.creatures c where c.id = creature_id and c.owner_id = auth.uid()));
create policy "gifts public read" on public.gifts for select using (true);
create policy "battles public read" on public.battles for select using (true);
create policy "conversations public read" on public.creature_conversations for select using (true);
create policy "quests public read" on public.quests for select using (true);
-- visits, tiktok_connections, processed_events: service role only (no policies).

-- ================================================================ Realtime
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.gifts, public.chat_messages, public.battles, public.creatures;

-- ================================================================ Lifecycle tick (source of truth for decay)
create or replace function public.tick_creature(p_creature_id uuid)
returns public.creatures
language plpgsql security definer set search_path = public as $$
declare
  c public.creatures%rowtype;
  hours double precision;
  crit int := 0;
  v_sat real; v_en real; v_hap real; v_hyg real; v_hp real; v_sleep boolean;
begin
  select * into c from public.creatures where id = p_creature_id for update;
  if not found then return null; end if;
  if not c.alive then return c; end if;
  hours := greatest(0, extract(epoch from (now() - c.last_tick_at)) / 3600.0);
  if hours < 0.001 then return c; end if;

  v_sat := greatest(0, least(100, c.satiety - 3.2 * hours));
  v_en := greatest(0, least(100, c.energy - (case when c.sleeping then -9 else 2.4 end) * hours));
  v_hap := greatest(0, least(100, c.happiness - 2.0 * hours * (case when c.sleeping then 0.4 else 1 end)));
  v_hyg := greatest(0, least(100, c.hygiene - 1.6 * hours));
  v_sleep := c.sleeping;
  if v_sleep and v_en >= 100 then v_sleep := false; end if;
  if not v_sleep and v_en <= 5 then v_sleep := true; end if;
  if v_sat < 20 then v_hap := greatest(0, v_hap - 1.5 * hours); end if;
  if v_hyg < 20 then v_hap := greatest(0, v_hap - 1.0 * hours); end if;

  crit := (v_sat < 15)::int + (v_hyg < 10)::int + (v_hap < 10)::int + (v_en < 5 and not v_sleep)::int;
  v_hp := c.health;
  if crit > 0 then
    v_hp := greatest(0, v_hp - 4 * crit * hours);
  elsif v_sat > 50 and v_hyg > 40 and v_hap > 40 then
    v_hp := least(100, v_hp + 1.5 * hours);
  end if;

  update public.creatures set
    satiety = v_sat, energy = v_en, happiness = v_hap, hygiene = v_hyg, health = v_hp, sleeping = v_sleep,
    alive = (v_hp > 0), died_at = case when v_hp <= 0 then now() else died_at end,
    last_tick_at = now()
  where id = p_creature_id
  returning * into c;
  return c;
end $$;

-- Public RPC: fetch a creature by slug with decay applied.
create or replace function public.get_creature(p_slug text)
returns public.creatures
language plpgsql security definer set search_path = public as $$
declare cid uuid; begin
  select id into cid from public.creatures where slug = p_slug;
  if cid is null then return null; end if;
  return public.tick_creature(cid);
end $$;
grant execute on function public.get_creature(text) to anon, authenticated;

-- Tick every creature (called by cron / tick edge function).
create or replace function public.tick_all_creatures()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; begin
  for r in select id from public.creatures where alive loop
    perform public.tick_creature(r.id); n := n + 1;
  end loop;
  return n;
end $$;

-- Leaderboard
create or replace function public.leaderboard(p_limit int default 50)
returns table (id uuid, slug text, name text, species text, dna jsonb, level int, elo int, wins int, losses int, alive boolean,
               care_score int, owner_handle text, owner_display_name text, owner_avatar_url text)
language sql security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.species, c.dna, c.level, c.elo, c.wins, c.losses, c.alive,
         case when c.alive then round((c.satiety + c.energy + c.happiness + c.hygiene + c.health * 2) / 6)::int else 0 end,
         p.handle, p.display_name, p.avatar_url
  from public.creatures c join public.profiles p on p.id = c.owner_id
  order by c.elo desc, c.level desc limit p_limit;
$$;
grant execute on function public.leaderboard(int) to anon, authenticated;

-- Creator earnings aggregated per day (owner only).
create or replace function public.my_earnings(p_days int default 30)
returns table (day date, creator_cents bigint, gross_cents bigint, gifts bigint)
language sql security definer set search_path = public as $$
  select d::date as day,
         coalesce(sum(t.creator_cents), 0), coalesce(sum(t.gross_cents), 0), coalesce(count(t.id), 0)
  from generate_series((current_date - (p_days - 1)), current_date, interval '1 day') d
  left join public.transactions t
    on t.created_at::date = d::date and t.type = 'gift' and t.status = 'completed'
    and t.creature_id = (select id from public.creatures where owner_id = auth.uid())
  group by d order by d;
$$;
grant execute on function public.my_earnings(int) to authenticated;

-- Record a visit (anon allowed), increments visit_count once per visitor per day.
create or replace function public.record_visit(p_slug text, p_visitor_key text)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid; begin
  select id into cid from public.creatures where slug = p_slug;
  if cid is null then return; end if;
  insert into public.visits (creature_id, visitor_key, day_key) values (cid, left(p_visitor_key, 120), to_char(now(), 'YYYY-MM-DD'))
  on conflict do nothing;
  if found then
    update public.creatures set visit_count = visit_count + 1 where id = cid;
    update public.quests set progress = least(goal, progress + 1) where creature_id = cid and event_type = 'visitors' and completed_at is null and expires_at > now();
  end if;
end $$;
grant execute on function public.record_visit(text, text) to anon, authenticated;

-- Storage bucket for photo genesis uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('genesis-uploads', 'genesis-uploads', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "users upload own genesis photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'genesis-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own genesis photos" on storage.objects for select to authenticated
  using (bucket_id = 'genesis-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- Atomic credit adjustment; fails when the balance would go negative.
create or replace function public.adjust_credits(p_user_id uuid, p_delta integer)
returns integer language plpgsql security definer set search_path = public as $$
declare cur integer; begin
  select credits into cur from public.profiles where id = p_user_id for update;
  if cur is null then raise exception 'profile not found'; end if;
  if cur + p_delta < 0 then raise exception 'insufficient_credits'; end if;
  update public.profiles set credits = cur + p_delta where id = p_user_id;
  return cur + p_delta;
end $$;
