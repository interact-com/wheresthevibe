-- Demo events around Braamfontein so Discover isn't empty while real hosts sign up.
-- Run after 0001_init.sql (SQL Editor → New query → paste → Run). Safe to run again:
-- it removes the previous demo events first. Demo events have no host account.

delete from public.events where host_id is null;

with demo (title, host_name, category, tags, day_offset, start_h, start_m, hours, venue, area, lat, lng, descr, color, tiers) as (
  values
  ('Rooftop Amapiano Sundowner', 'Demo host', 'Party', array['Amapiano', '18+'], 0, 17, 0, 6.0,
   '[Venue name]', 'Braamfontein', -26.1912, 28.0338,
   'Sunset sets on the roof with resident DJs. Food stalls on site. Tickets are digital only — show your QR at the door.',
   '#2A4544', '[{"name":"General","price":80,"capacity":150},{"name":"VIP · rooftop deck","price":200,"capacity":30}]'::jsonb),
  ('FIFA Night at The Den', 'Demo host', 'Gaming', array['Gaming', 'Free'], 0, 19, 0, 4.5,
   'The Den', 'Braamfontein', -26.1975, 28.0281,
   'Bring your controller. Knockout tournament from 20:00, winner takes the bragging rights.',
   '#2A2D3F', '[{"name":"Free RSVP","price":0,"capacity":60}]'::jsonb),
  ('Thursday Home Cell', 'Demo host', 'Home cell', array['Community'], 1, 18, 30, 2.0,
   '[Host home]', 'Parktown', -26.1843, 28.0389,
   'Worship, a short word and supper together. Everyone welcome.',
   '#3A2E44', '[{"name":"Free RSVP","price":0,"capacity":25}]'::jsonb),
  ('Open Mic Comedy', 'Demo host', 'Comedy', array['Comedy'], 2, 20, 0, 2.5,
   '[Venue name]', 'Braamfontein', -26.1951, 28.0352,
   'Ten new comics, five minutes each. Sign up at the door to perform.',
   '#2E3A2A', '[{"name":"General","price":60,"capacity":80}]'::jsonb),
  ('Sunday Braai Sessions', 'Demo host', 'Food & markets', array['Food', 'Live music'], 3, 13, 0, 6.0,
   '[Venue name]', 'Milpark', -26.1868, 28.0187,
   'Bring your own meat, we bring the fire and the music.',
   '#44342A', '[{"name":"Entry","price":50,"capacity":120}]'::jsonb)
),
inserted as (
  insert into public.events (host_id, host_name, title, category, tags, starts_at, ends_at,
                             venue_name, area, latitude, longitude, description, cover_color)
  select null, host_name, title, category, tags,
         (date_trunc('day', now() at time zone 'Africa/Johannesburg') + make_interval(days => day_offset, hours => start_h, mins => start_m))
           at time zone 'Africa/Johannesburg',
         (date_trunc('day', now() at time zone 'Africa/Johannesburg') + make_interval(days => day_offset, hours => start_h, mins => start_m)
           + make_interval(secs => hours * 3600)) at time zone 'Africa/Johannesburg',
         venue, area, lat, lng, descr, color
  from demo
  returning id, title
)
insert into public.ticket_tiers (event_id, name, price, capacity, sort)
select i.id, t ->> 'name', (t ->> 'price')::numeric, (t ->> 'capacity')::int, (ord - 1)::smallint
from inserted i
join demo d on d.title = i.title
cross join lateral jsonb_array_elements(d.tiers) with ordinality as x(t, ord);

-- One demo boost so the boosted look shows up on Discover.
insert into public.boosts (event_id, hours, price, starts_at, ends_at)
select id, 6, 80, now(), now() + interval '6 hours'
from public.events where host_id is null and title = 'Rooftop Amapiano Sundowner';
