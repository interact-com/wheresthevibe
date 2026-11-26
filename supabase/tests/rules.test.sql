-- Exercises every rule in 0001_init.sql as anon, a host (H), a guest (G) and an outsider (O).
\set ON_ERROR_STOP 1
\set QUIET 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'host@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'guest@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'other@example.com');

-- helper: expect an error containing some text
create function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'EXPECTED ERROR containing "%" but statement succeeded: %', needle, sql;
exception when others then
  if position(needle in sqlerrm) = 0 then
    raise exception 'Wrong error for %: got "%", expected "%"', sql, sqlerrm, needle;
  end if;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;

\echo '1. profiles created by trigger'
do $$ begin assert (select count(*) from public.profiles) = 3, 'profiles not created'; end $$;
update public.profiles set display_name = 'Thandi' where id = '00000000-0000-0000-0000-00000000000b';

\echo '2. anon: Discover works, buying does not'
begin;
set local role anon;
do $$
declare n int; first_title text;
begin
  select count(*) into n from public.list_events(-26.1929, 28.0305);
  assert n between 1 and 5, format('anon sees %s demo events', n);
  select title into first_title from public.list_events(-26.1929, 28.0305) limit 1;
  assert first_title = 'Rooftop Amapiano Sundowner' or n < 5, 'boosted event should be first';
  -- far away (Cape Town): nothing within 25 km
  select count(*) into n from public.list_events(-33.92, 18.42);
  assert n = 0, 'radius filter failed';
end $$;
select pg_temp.expect_error($q$select public.buy_tickets(gen_random_uuid(), 1)$q$, 'permission denied');
select pg_temp.expect_error($q$select * from public.tickets$q$, 'permission denied');
rollback;

\echo '3. host creates an event with a 2-person tier'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
insert into public.events (id, host_name, title, category, starts_at, ends_at, venue_name, latitude, longitude)
values ('11111111-1111-1111-1111-111111111111', 'Host H', 'Test Party', 'Party', now() + interval '1 hour', now() + interval '5 hours', 'Test venue', -26.19, 28.03);
insert into public.events (id, host_name, title, category, starts_at, ends_at, venue_name, latitude, longitude)
values ('22222222-2222-2222-2222-222222222222', 'Host H', 'Other Party', 'Party', now() + interval '1 hour', now() + interval '5 hours', 'Test venue', -26.19, 28.03);
insert into public.ticket_tiers (id, event_id, name, price, capacity)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'General', 80, 2),
       ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'General', 0, 10);
do $$ begin
  assert (select host_id from public.events where id = '11111111-1111-1111-1111-111111111111') = '00000000-0000-0000-0000-00000000000a', 'host_id default';
  assert (select count(*) from public.list_events(-26.19, 28.03, p_mine => true)) = 2, 'p_mine';
end $$;
commit;

\echo '4. guest cannot create events as someone else or edit the host''s'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select pg_temp.expect_error($q$insert into public.events (host_id, host_name, title, category, starts_at, ends_at, venue_name, latitude, longitude)
  values ('00000000-0000-0000-0000-00000000000a', 'Fake', 'Fake event', 'Party', now(), now() + interval '1 hour', 'x', 0, 0)$q$, 'row-level security');
do $$ declare n int; begin
  update public.events set title = 'Hacked' where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  assert n = 0, 'guest updated host event';
  update public.ticket_tiers set price = 0 where id = '33333333-3333-3333-3333-333333333333';
  get diagnostics n = row_count;
  assert n = 0, 'guest changed price';
end $$;
select pg_temp.expect_error($q$insert into public.tickets (event_id, tier_id, holder_id, holder_name, code, price_paid)
  values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-00000000000b', 'x', 'WTV-FAKE-CODE', 0)$q$, 'permission denied');
rollback;

\echo '5. guest buys tickets; capacity is enforced'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
do $$ declare t public.tickets; begin
  select * into t from public.buy_tickets('33333333-3333-3333-3333-333333333333', 1);
  assert t.code ~ '^WTV-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$', 'code format ' || t.code;
  assert t.holder_name = 'Thandi', 'holder name from profile';
  assert t.price_paid = 80, 'price';
end $$;
select pg_temp.expect_error($q$select public.buy_tickets('33333333-3333-3333-3333-333333333333', 2)$q$, 'Only 1 left');
select pg_temp.expect_error($q$select public.buy_tickets('33333333-3333-3333-3333-333333333333', 7)$q$, '1 to 6');
select count(*) as other_event_ticket from public.buy_tickets('44444444-4444-4444-4444-444444444444', 1) \gset
do $$ begin assert (select count(*) from public.tickets) = 2, 'guest sees own 2 tickets'; end $$;
commit;

\echo '6. who can see tickets'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$ begin assert (select count(*) from public.tickets) = 0, 'outsider sees tickets'; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$ begin assert (select count(*) from public.tickets) = 2, 'host sees guest list'; end $$;
rollback;

\echo '7. door scanner'
select code as g_code from public.tickets where tier_id = '33333333-3333-3333-3333-333333333333' \gset
select code as other_code from public.tickets where tier_id = '44444444-4444-4444-4444-444444444444' \gset
select set_config('wtv.g_code', :'g_code', false), set_config('wtv.other_code', :'other_code', false) \gset
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select pg_temp.expect_error(format($q$select public.check_in('11111111-1111-1111-1111-111111111111', %L)$q$, :'g_code'), 'Only the host');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$ declare r jsonb; begin
  r := public.check_in('11111111-1111-1111-1111-111111111111', lower(' ' || current_setting('wtv.g_code') || ' '));
  assert r ->> 'status' = 'valid', 'first scan ' || r::text;
  r := public.check_in('11111111-1111-1111-1111-111111111111', current_setting('wtv.g_code'));
  assert r ->> 'status' = 'used', 'second scan ' || r::text;
  r := public.check_in('11111111-1111-1111-1111-111111111111', 'WTV-NOPE-NOPE');
  assert r ->> 'status' = 'invalid', 'bad code';
  r := public.check_in('11111111-1111-1111-1111-111111111111', current_setting('wtv.other_code'));
  assert r ->> 'status' = 'wrong-event', 'wrong event';
end $$;
commit;

\echo '8. ratings: only after a scan; hosts read them, outsiders do not'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
select pg_temp.expect_error($q$select public.rate_event('11111111-1111-1111-1111-111111111111', 5, '{}', '')$q$, 'after your ticket is scanned');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select pg_temp.expect_error($q$select public.rate_event('22222222-2222-2222-2222-222222222222', 5, '{}', '')$q$, 'after your ticket is scanned');
select (public.rate_event('11111111-1111-1111-1111-111111111111', 3, array['Music'], 'Good')).stars as first_rating \gset
select (public.rate_event('11111111-1111-1111-1111-111111111111', 5, array['Music','Crowd'], 'Great')).stars as changed_rating \gset
select pg_temp.expect_error($q$select public.rate_event('11111111-1111-1111-1111-111111111111', 9, '{}', '')$q$, 'check constraint');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$ begin assert (select count(*) from public.ratings) = 0, 'outsider reads ratings'; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
do $$ begin
  assert (select count(*) from public.ratings) = 1, 'one rating per person';
  assert (select stars from public.ratings) = 5, 'rating updated';
  assert (select host_rating from public.list_events(-26.19, 28.03, p_ids => array['22222222-2222-2222-2222-222222222222'::uuid])) = 5.0,
         'host rating shows on host''s other events';
end $$;
commit;

\echo '9. boosts'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
select pg_temp.expect_error($q$select public.boost_event('11111111-1111-1111-1111-111111111111', 6)$q$, 'only boost your own');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select pg_temp.expect_error($q$select public.boost_event('11111111-1111-1111-1111-111111111111', 5)$q$, '3, 6 or 12');
do $$ declare b public.boosts; begin
  b := public.boost_event('11111111-1111-1111-1111-111111111111', 12);
  assert b.price = 120 and b.ends_at > now() + interval '11 hours', 'boost row';
  assert (select boosted_until from public.list_events(-26.19, 28.03, p_ids => array['11111111-1111-1111-1111-111111111111'::uuid])) is not null, 'boosted_until';
end $$;
select pg_temp.expect_error($q$select public.boost_event('11111111-1111-1111-1111-111111111111', 3)$q$, 'Already boosted');
select pg_temp.expect_error($q$insert into public.boosts (event_id, hours, price, ends_at) values ('22222222-2222-2222-2222-222222222222', 12, 0, now() + interval '12 hours')$q$, 'permission denied');
commit;

\echo '10. cancelled events disappear except for their host'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
update public.events set status = 'cancelled' where id = '22222222-2222-2222-2222-222222222222';
do $$ begin assert (select count(*) from public.list_events(-26.19, 28.03, p_mine => true)) = 2, 'host still sees it'; end $$;
select pg_temp.expect_error($q$select public.buy_tickets('44444444-4444-4444-4444-444444444444', 1)$q$, 'cancelled');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
do $$ begin
  assert (select count(*) from public.list_events(-26.19, 28.03, p_ids => array['22222222-2222-2222-2222-222222222222'::uuid])) = 0, 'guest sees cancelled';
  assert not exists (select 1 from public.list_events(-26.19, 28.03) where id = '22222222-2222-2222-2222-222222222222'), 'cancelled in Discover';
end $$;
rollback;

\echo '11. profiles are private'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
do $$ declare n int; begin
  assert (select count(*) from public.profiles) = 1, 'sees only own profile';
  update public.profiles set display_name = 'x' where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'edited someone else''s profile';
end $$;
rollback;

\echo 'ALL TESTS PASSED'
