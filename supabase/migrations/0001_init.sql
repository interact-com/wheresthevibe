-- Where'z The Vibe: Phase 1 database
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this file → Run.
--
-- Design rules
-- * Anyone can read published events (Discover works before sign-in).
-- * Hosts manage only their own events and see their own guest lists.
-- * Tickets, check-ins, boosts and ratings are written ONLY through the functions at the
--   bottom of this file, so the rules (capacity, one scan per ticket, who may rate…) can't
--   be skipped by a modified app.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  -- null host = demo event from the seed file
  host_id uuid references auth.users (id) on delete set null default auth.uid(),
  host_name text not null check (char_length(host_name) between 1 and 60),
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (char_length(category) <= 40),
  tags text[] not null default '{}',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue_name text not null check (char_length(venue_name) between 1 and 120),
  area text not null default '' check (char_length(area) <= 80),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography) stored,
  description text not null default '' check (char_length(description) <= 2000),
  cover_color text not null default '#2A4544' check (cover_color ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null default 'published' check (status in ('published', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint ends_after_start check (ends_at > starts_at)
);
create index events_location_idx on public.events using gist (location);
create index events_host_idx on public.events (host_id);
create index events_ends_at_idx on public.events (ends_at);

create table public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  price numeric(10, 2) not null check (price >= 0),
  capacity integer not null check (capacity between 1 and 100000),
  sort smallint not null default 0
);
create index ticket_tiers_event_idx on public.ticket_tiers (event_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  tier_id uuid not null references public.ticket_tiers (id) on delete cascade,
  holder_id uuid not null references auth.users (id) on delete cascade,
  holder_name text not null,
  -- Shown as the QR. Random and unguessable; only valid if it exists in this table.
  code text not null unique,
  price_paid numeric(10, 2) not null,
  purchased_at timestamptz not null default now(),
  scanned_at timestamptz,
  scanned_by uuid references auth.users (id) on delete set null
);
create index tickets_event_idx on public.tickets (event_id);
create index tickets_holder_idx on public.tickets (holder_id);

create table public.boosts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  hours smallint not null check (hours in (3, 6, 12)),
  price numeric(10, 2) not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null
);
create index boosts_event_idx on public.boosts (event_id, ends_at);

create table public.ratings (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- New users get a profile automatically
-- ---------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_tiers enable row level security;
alter table public.tickets enable row level security;
alter table public.boosts enable row level security;
alter table public.ratings enable row level security;

-- profiles: you see and edit only your own
create policy "own profile: read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile: update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- events: published ones are public; hosts see and manage their own
create policy "events: read published" on public.events for select to anon, authenticated using (status = 'published');
create policy "events: host reads own" on public.events for select to authenticated using (host_id = auth.uid());
create policy "events: host creates" on public.events for insert to authenticated with check (host_id = auth.uid());
create policy "events: host updates own" on public.events for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "events: host deletes own" on public.events for delete to authenticated using (host_id = auth.uid());

-- ticket tiers: readable with their event; the event's host manages them
create policy "tiers: read" on public.ticket_tiers for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "tiers: host manages" on public.ticket_tiers for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- tickets: holders see their own, hosts see their event's guest list. Writes go through functions.
create policy "tickets: holder reads own" on public.tickets for select to authenticated using (holder_id = auth.uid());
create policy "tickets: host reads guest list" on public.tickets for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- boosts: public (they decide ranking). Writes go through boost_event().
create policy "boosts: read" on public.boosts for select to anon, authenticated using (true);

-- ratings: you see your own; hosts see ratings of their events. Writes go through rate_event().
create policy "ratings: own" on public.ratings for select to authenticated using (user_id = auth.uid());
create policy "ratings: host reads" on public.ratings for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid()));

-- Table privileges: RLS above decides rows; these decide which actions exist at all.
revoke all on public.profiles, public.events, public.ticket_tiers, public.tickets, public.boosts, public.ratings from anon, authenticated;
grant select on public.events, public.ticket_tiers, public.boosts to anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.events, public.ticket_tiers to authenticated;
grant select on public.tickets, public.boosts, public.ratings to authenticated;

-- ---------------------------------------------------------------------------
-- Functions the app calls (supabase.rpc)
-- ---------------------------------------------------------------------------

-- Event cards with distance, boost and host rating.
--   Nearby:        list_events(lat, lng)                 upcoming, published, within radius
--   Specific ones: list_events(lat, lng, p_ids => array)  any time (e.g. events you hold tickets for)
--   Hosting:       list_events(lat, lng, p_mine => true)  your own events, any status
create function public.list_events(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 25,
  p_ids uuid[] default null,
  p_mine boolean default false
) returns table (
  id uuid, host_id uuid, host_name text, title text, category text, tags text[],
  starts_at timestamptz, ends_at timestamptz, venue_name text, area text,
  latitude double precision, longitude double precision, description text, cover_color text, status text,
  distance_km double precision, boosted_until timestamptz, host_rating numeric, tiers jsonb
)
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  with here as (
    select case when p_lat is null or p_lng is null then null
           else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as g
  )
  select e.id, e.host_id, e.host_name, e.title, e.category, e.tags,
         e.starts_at, e.ends_at, e.venue_name, e.area,
         e.latitude, e.longitude, e.description, e.cover_color, e.status,
         case when here.g is null then null else st_distance(e.location, here.g) / 1000 end,
         (select max(b.ends_at) from boosts b where b.event_id = e.id and b.starts_at <= now() and b.ends_at > now()),
         (select round(avg(r.stars)::numeric, 1) from ratings r join events h on h.id = r.event_id
           where e.host_id is not null and h.host_id = e.host_id),
         coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'price', t.price, 'capacity', t.capacity)
                                    order by t.sort, t.price)
                   from ticket_tiers t where t.event_id = e.id), '[]'::jsonb)
  from events e, here
  where case
          when p_mine then e.host_id = auth.uid()
          when p_ids is not null then e.id = any (p_ids) and (e.status = 'published' or e.host_id = auth.uid())
          else e.status = 'published' and e.ends_at > now()
               and (here.g is null or st_dwithin(e.location, here.g, p_radius_km * 1000))
        end
  order by
    case when p_mine then e.starts_at end desc,
    (select max(b.ends_at) from boosts b where b.event_id = e.id and b.starts_at <= now() and b.ends_at > now()) is not null desc,
    case when here.g is null then 0 else st_distance(e.location, here.g) end,
    e.starts_at
  limit 200;
$$;

-- Unguessable ticket code like WTV-7K2Q-91XZ (40 bits of randomness, no 0/O/1/I).
create function public.new_ticket_code() returns text
language plpgsql volatile set search_path = public, extensions, pg_temp as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := gen_random_bytes(8);
  code text := 'WTV-';
begin
  for i in 0..7 loop
    if i = 4 then code := code || '-'; end if;
    code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return code;
end $$;

-- Get tickets. Payment is added in Phase 2; for now this issues them straight away.
create function public.buy_tickets(p_tier_id uuid, p_quantity integer)
returns setof public.tickets
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_tier ticket_tiers;
  v_event events;
  v_sold integer;
  v_name text;
begin
  if v_user is null then raise exception 'Please sign in first' using errcode = '28000'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 6 then
    raise exception 'You can get 1 to 6 tickets at a time' using errcode = '22023';
  end if;

  -- Lock the tier so two buyers can't both take the last spot.
  select * into v_tier from ticket_tiers where id = p_tier_id for update;
  if not found then raise exception 'That ticket type no longer exists' using errcode = 'P0002'; end if;

  select * into v_event from events where id = v_tier.event_id;
  if v_event.status <> 'published' then raise exception 'This event was cancelled' using errcode = '22023'; end if;
  if v_event.ends_at <= now() then raise exception 'This event has ended' using errcode = '22023'; end if;

  select count(*) into v_sold from tickets where tier_id = p_tier_id;
  if v_sold + p_quantity > v_tier.capacity then
    raise exception 'Only % left', greatest(v_tier.capacity - v_sold, 0) using errcode = '22023';
  end if;

  select nullif(display_name, '') into v_name from profiles where id = v_user;

  return query
    insert into tickets (event_id, tier_id, holder_id, holder_name, code, price_paid)
    select v_event.id, v_tier.id, v_user, coalesce(v_name, 'Guest'), new_ticket_code(), v_tier.price
    from generate_series(1, p_quantity)
    returning *;
end $$;

-- Door scanner. Only the event's host can check people in; each ticket works once.
create function public.check_in(p_event_id uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_ticket tickets;
begin
  if not exists (select 1 from events where id = p_event_id and host_id = v_user) then
    raise exception 'Only the host can scan tickets for this event' using errcode = '42501';
  end if;

  select * into v_ticket from tickets where code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if v_ticket.event_id <> p_event_id then return jsonb_build_object('status', 'wrong-event'); end if;
  if v_ticket.scanned_at is not null then
    return jsonb_build_object('status', 'used', 'ticket', to_jsonb(v_ticket));
  end if;

  update tickets set scanned_at = now(), scanned_by = v_user where id = v_ticket.id returning * into v_ticket;
  return jsonb_build_object('status', 'valid', 'ticket', to_jsonb(v_ticket));
end $$;

-- Vibe Boost. Prices from the business case. Payment is added in Phase 2.
create function public.boost_event(p_event_id uuid, p_hours integer)
returns public.boosts
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_price numeric := case p_hours when 3 then 50 when 6 then 80 when 12 then 120 end;
  v_until timestamptz;
  v_boost boosts;
begin
  if v_price is null then raise exception 'Boosts last 3, 6 or 12 hours' using errcode = '22023'; end if;
  if not exists (select 1 from events where id = p_event_id and host_id = v_user and status = 'published' and ends_at > now()) then
    raise exception 'You can only boost your own upcoming events' using errcode = '42501';
  end if;
  select max(ends_at) into v_until from boosts where event_id = p_event_id and ends_at > now();
  if v_until is not null then
    raise exception 'Already boosted until %', to_char(v_until at time zone 'Africa/Johannesburg', 'HH24:MI') using errcode = '22023';
  end if;

  insert into boosts (event_id, hours, price, starts_at, ends_at, created_by)
  values (p_event_id, p_hours, v_price, now(), now() + make_interval(hours => p_hours), v_user)
  returning * into v_boost;
  return v_boost;
end $$;

-- Rate the vibe: only people whose ticket was scanned at the door; one rating each (can be changed).
create function public.rate_event(p_event_id uuid, p_stars integer, p_tags text[], p_comment text)
returns public.ratings
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_rating ratings;
begin
  if not exists (select 1 from tickets where event_id = p_event_id and holder_id = v_user and scanned_at is not null) then
    raise exception 'You can rate an event after your ticket is scanned at the door' using errcode = '42501';
  end if;
  insert into ratings (event_id, user_id, stars, tags, comment)
  values (p_event_id, v_user, p_stars, coalesce(p_tags, '{}'), left(coalesce(p_comment, ''), 1000))
  on conflict (event_id, user_id) do update
    set stars = excluded.stars, tags = excluded.tags, comment = excluded.comment, created_at = now()
  returning * into v_rating;
  return v_rating;
end $$;

-- Who may call what
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.list_events(double precision, double precision, double precision, uuid[], boolean) to anon, authenticated;
grant execute on function public.buy_tickets(uuid, integer) to authenticated;
grant execute on function public.check_in(uuid, text) to authenticated;
grant execute on function public.boost_event(uuid, integer) to authenticated;
grant execute on function public.rate_event(uuid, integer, text[], text) to authenticated;
