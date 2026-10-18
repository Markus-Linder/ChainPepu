-- ChainPepu, Teil 5 „Magnet“: TikTok/YouTube-Videos einbetten, Nutzername nach Google/Apple-Login wählen,
-- Konstellationen (wer über wen kam) und Einladungs-Prämien. Nach Teil 1–4 ausführen.

-- ---------- Eingebettete Videos ----------
alter table public.links add column if not exists embed_url text
  check (embed_url is null or embed_url ~ '^https://(www\.|m\.|vm\.)?(tiktok\.com|youtube\.com|youtu\.be|instagram\.com)/');

drop function if exists public.start_chain(text, text, text, text, text, text[], text, boolean, int);
create or replace function public.start_chain(
  p_title text, p_text text, p_image_url text, p_color text, p_video_url text default null,
  p_video_frames text[] default null, p_description text default null, p_is_topic boolean default false, p_days int default 3,
  p_embed_url text default null, p_from_link bigint default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text; v_days int := greatest(1, least(14, coalesce(p_days, 3)));
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  perform check_content(p_title); perform check_content(p_text); perform check_content(p_description);
  if p_from_link is not null and not exists (select 1 from links where id = p_from_link and status = 'sichtbar') then
    raise exception 'Glied nicht gefunden';
  end if;
  insert into chains (title, origin_user_id, description, is_topic, ends_at, branched_from_link)
    values (p_title, auth.uid(), nullif(p_description, ''), coalesce(p_is_topic, false),
            case when coalesce(p_is_topic, false) then now() + (v_days || ' days')::interval else null end, p_from_link)
    returning id into v_id;
  insert into links (chain_id, user_id, position, text, image_url, video_url, video_frames, embed_url, color, status)
    values (v_id, auth.uid(), 1, p_text, nullif(p_image_url, ''), nullif(p_video_url, ''), p_video_frames, nullif(p_embed_url, ''),
            coalesce(nullif(p_color, ''), '#7c5cff'), new_status());
  select display_name into v_name from profiles where id = auth.uid();
  insert into notifications (user_id, type, actor_id, chain_id, message, params)
    select f.follower_id, 'neue_kette', auth.uid(), v_id, v_name || ' hat eine neue Kette gestartet: „' || p_title || '“',
           jsonb_build_object('key', 'new_chain', 'actor', v_name, 'title', p_title)
    from follows f where f.creator_id = auth.uid();
  return v_id;
end $$;

-- Abzweigungen (Paket B nutzt das): eine Kette kann von einem Glied einer anderen Kette abzweigen.
alter table public.chains add column if not exists branched_from_link bigint references public.links(id) on delete set null;
create index if not exists chains_branch_idx on public.chains(branched_from_link);

drop function if exists public.add_link(bigint, text, text, text, text, text[]);
create or replace function public.add_link(p_chain_id bigint, p_text text, p_image_url text, p_color text, p_video_url text default null, p_video_frames text[] default null, p_embed_url text default null)
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
  insert into links (chain_id, user_id, position, text, image_url, video_url, video_frames, embed_url, color, status)
    values (p_chain_id, auth.uid(), v_pos, p_text, nullif(p_image_url, ''), nullif(p_video_url, ''), p_video_frames, nullif(p_embed_url, ''),
            coalesce(nullif(p_color, ''), '#7c5cff'), new_status())
    returning id into v_id;
  return v_id;
end $$;

-- ---------- Nutzername nach Google/Apple-Login ----------
create or replace function public.set_username(p_username text, p_display_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  if lower(p_username) !~ '^[a-z0-9_]{3,20}$' then raise exception 'err_username'; end if;
  if exists (select 1 from profiles where username = lower(p_username) and id <> auth.uid()) then raise exception 'err_username_taken'; end if;
  perform check_content(p_display_name);
  update profiles set username = lower(p_username), display_name = left(coalesce(nullif(p_display_name, ''), p_username), 40) where id = auth.uid();
end $$;

-- ---------- Konstellationen und Einladungs-Rangliste ----------
create or replace view public.constellation_edges with (security_invoker = true) as
select invited_by as from_user, id as to_user from public.profiles where invited_by is not null;

create or replace view public.invite_stats with (security_invoker = true) as
select p.id, p.username, p.display_name, p.planet_seed, p.planet_skin,
  (select count(*) from public.profiles i where i.invited_by = p.id)::int as invited_count
from public.profiles p;

-- Prämien: 10 Sterne pro Einladung, dazu Meilensteine bei 10, 50 und 100 eingeladenen Planeten.
create or replace function public.use_invite(p_token text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v invites%rowtype; v_count int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  select * into v from invites where token = p_token;
  if not found then raise exception 'Einladung nicht gefunden'; end if;
  if v.used_by is null and v.inviter_id <> auth.uid()
     and (select invited_by from profiles where id = auth.uid()) is null
     and (select created_at from profiles where id = auth.uid()) > now() - interval '1 hour' then
    update invites set used_by = auth.uid() where token = p_token;
    update profiles set invited_by = v.inviter_id where id = auth.uid();
    update profiles set stars = stars + 10 where id = v.inviter_id;
    select count(*) into v_count from profiles where invited_by = v.inviter_id;
    if v_count in (10, 50, 100) then
      update profiles set stars = stars + (case v_count when 10 then 100 when 50 then 500 else 1000 end) where id = v.inviter_id;
      perform notify(v.inviter_id, 'spende', null, null, 'Meilenstein: ' || v_count || ' Planeten eingeladen. Bonus-Sterne gutgeschrieben!',
        jsonb_build_object('key', 'invite_milestone', 'stars', v_count));
    end if;
  end if;
  return v.chain_id;
end $$;
