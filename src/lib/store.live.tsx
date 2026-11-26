import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Category, Rating, RatingTag, Ticket, VibeEvent } from '@/data/types';
import { distanceKm } from './geo';
import { StoreContext, type ScanResult, type Store } from './store';
import { friendlyError } from './supabase';
import { useUserLocation } from './useLocation';

// Live mode: data and sign-in from Supabase. Rules (capacity, who may scan or rate…)
// are enforced by the database functions in supabase/migrations, not here.

type EventRow = {
  id: string;
  host_id: string | null;
  host_name: string;
  title: string;
  category: string;
  tags: string[];
  starts_at: string;
  ends_at: string;
  venue_name: string;
  area: string;
  latitude: number;
  longitude: number;
  description: string;
  cover_color: string;
  status: 'published' | 'cancelled';
  boosted_until: string | null;
  host_rating: number | string | null;
  tiers: { id: string; name: string; price: number | string; capacity: number }[];
};

type TicketRow = {
  id: string;
  event_id: string;
  tier_id: string;
  holder_id?: string;
  holder_name: string;
  code: string;
  purchased_at: string;
  scanned_at: string | null;
};

const TICKET_COLUMNS = 'id, event_id, tier_id, holder_id, holder_name, code, purchased_at, scanned_at';

function toEvent(r: EventRow): VibeEvent {
  return {
    id: r.id,
    title: r.title,
    hostName: r.host_name,
    hostId: r.host_id ?? 'demo',
    category: r.category as Category,
    tags: r.tags ?? [],
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    venueName: r.venue_name,
    area: r.area,
    latitude: r.latitude,
    longitude: r.longitude,
    description: r.description,
    tiers: (r.tiers ?? []).map((t) => ({ id: t.id, name: t.name, price: Number(t.price), capacity: t.capacity })),
    coverColor: r.cover_color,
    hostRating: r.host_rating == null ? undefined : Number(r.host_rating),
    boostedUntil: r.boosted_until ?? undefined,
    status: r.status,
  };
}

function toTicket(r: TicketRow): Ticket {
  return {
    id: r.id,
    eventId: r.event_id,
    tierId: r.tier_id,
    code: r.code,
    holderName: r.holder_name,
    purchasedAt: r.purchased_at,
    scannedAt: r.scanned_at ?? undefined,
  };
}

const isLive = (e: VibeEvent) => !!e.boostedUntil && new Date(e.boostedUntil).getTime() > Date.now();

type Profile = { display_name: string; interests: string[] };

export function LiveStoreProvider({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  const { location, source } = useUserLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [eventsById, setEventsById] = useState<Record<string, VibeEvent>>({});
  const [nearbyIds, setNearbyIds] = useState<string[]>([]);
  const [myEventIds, setMyEventIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [myRatingsCount, setMyRatingsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const userId = session?.user.id ?? null;
  const locationRef = useRef(location);
  locationRef.current = location;

  // ---- Auth -------------------------------------------------------------
  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    setProfileLoaded(false);
    client
      .from('profiles')
      .select('display_name, interests')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile((data as Profile | null) ?? { display_name: '', interests: [] });
        setProfileLoaded(true);
      });
  }, [client, userId]);

  // ---- Loading data -----------------------------------------------------
  const mergeEvents = useCallback((rows: EventRow[]) => {
    setEventsById((prev) => {
      const next = { ...prev };
      for (const r of rows) next[r.id] = toEvent(r);
      return next;
    });
  }, []);

  const listEvents = useCallback(
    async (args: { p_ids?: string[]; p_mine?: boolean } = {}) => {
      const here = locationRef.current;
      const { data, error } = await client.rpc('list_events', { p_lat: here.latitude, p_lng: here.longitude, ...args });
      if (error) throw friendlyError(error);
      const rows = (data ?? []) as EventRow[];
      mergeEvents(rows);
      return rows;
    },
    [client, mergeEvents],
  );

  const loadNearby = useCallback(async () => {
    const rows = await listEvents();
    setNearbyIds(rows.map((r) => r.id));
  }, [listEvents]);

  const loadMine = useCallback(async () => {
    if (!userId) {
      setTickets([]);
      setMyEventIds([]);
      setMyRatingsCount(0);
      return;
    }
    const [ticketRes, mineRows, ratingRes] = await Promise.all([
      client.from('tickets').select(TICKET_COLUMNS).eq('holder_id', userId).order('purchased_at', { ascending: false }),
      listEvents({ p_mine: true }),
      client.from('ratings').select('event_id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    if (ticketRes.error) throw friendlyError(ticketRes.error);
    const mine = ((ticketRes.data ?? []) as TicketRow[]).map(toTicket);
    setTickets(mine);
    setMyEventIds(mineRows.map((r) => r.id));
    setMyRatingsCount(ratingRes.count ?? 0);
    const ticketEventIds = [...new Set(mine.map((t) => t.eventId))];
    if (ticketEventIds.length) await listEvents({ p_ids: ticketEventIds });
  }, [client, userId, listEvents]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadNearby(), loadMine()]);
    } finally {
      setLoading(false);
    }
  }, [loadNearby, loadMine]);

  // Reload when the location settles or someone signs in or out.
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh, location.latitude, location.longitude]);

  // ---- Store ------------------------------------------------------------
  const events = useMemo(() => Object.values(eventsById), [eventsById]);
  const getEvent = useCallback((id: string) => eventsById[id], [eventsById]);
  const distanceTo = useCallback((e: VibeEvent) => distanceKm(location, e), [location]);
  const nearbyEvents = useCallback(() => {
    const now = Date.now();
    return nearbyIds
      .map((id) => eventsById[id])
      .filter((e): e is VibeEvent => !!e && e.status !== 'cancelled' && new Date(e.endsAt).getTime() > now);
  }, [nearbyIds, eventsById]);
  const myEvents = useMemo(() => myEventIds.map((id) => eventsById[id]).filter((e): e is VibeEvent => !!e), [myEventIds, eventsById]);

  const needsProfile = !!session && profileLoaded && (!profile || !profile.display_name || profile.interests.length === 0);
  const signedIn = !!session && profileLoaded && !needsProfile;

  const value = useMemo<Store>(
    () => ({
      mode: 'live',
      ready: sessionChecked && (!session || profileLoaded),
      signedIn,
      needsProfile,
      email: session?.user.email ?? null,
      userName: profile?.display_name || session?.user.email?.split('@')[0] || '',
      interests: profile?.interests ?? [],

      sendCode: async (email) => {
        const { error } = await client.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true, emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
        });
        if (error) throw friendlyError(error);
      },
      verifyCode: async (email, code) => {
        const { error } = await client.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (error) throw friendlyError(error);
      },
      saveProfile: async (name, interests) => {
        if (!userId) throw new Error('Please sign in first');
        const { error } = await client.from('profiles').update({ display_name: name.trim(), interests }).eq('id', userId);
        if (error) throw friendlyError(error);
        setProfile({ display_name: name.trim(), interests });
      },
      signOut: async () => {
        await client.auth.signOut();
      },

      location,
      locationSource: source,
      events,
      nearbyEvents,
      myEvents,
      getEvent,
      loadEvents: async (ids) => {
        const missing = ids.filter((id) => !eventsById[id]);
        if (missing.length) await listEvents({ p_ids: missing });
      },
      refresh,
      loading,
      distanceTo,
      isBoosted: isLive,
      tickets,
      myRatingsCount,
      notifications: [], // Phase 3: real notifications (boost alerts, rate-the-vibe prompts)

      buyTickets: async (eventId, tierId, quantity) => {
        const { data, error } = await client.rpc('buy_tickets', { p_tier_id: tierId, p_quantity: quantity });
        if (error) throw friendlyError(error);
        const bought = ((data ?? []) as TicketRow[]).map(toTicket);
        setTickets((t) => [...bought, ...t]);
        if (!eventsById[eventId]) await listEvents({ p_ids: [eventId] });
        return bought;
      },
      boostEvent: async (eventId, option) => {
        const { error } = await client.rpc('boost_event', { p_event_id: eventId, p_hours: option.hours });
        if (error) throw friendlyError(error);
        await listEvents({ p_ids: [eventId] });
        loadNearby().catch(() => {});
      },
      rateEvent: async (rating) => {
        const { error } = await client.rpc('rate_event', {
          p_event_id: rating.eventId,
          p_stars: rating.stars,
          p_tags: rating.tags,
          p_comment: rating.comment,
        });
        if (error) throw friendlyError(error);
        const { count } = await client.from('ratings').select('event_id', { count: 'exact', head: true }).eq('user_id', userId ?? '');
        setMyRatingsCount(count ?? 0);
      },
      createEvent: async (event) => {
        const { data, error } = await client
          .from('events')
          .insert({
            host_name: profile?.display_name || 'Host',
            title: event.title,
            category: event.category,
            tags: event.tags,
            starts_at: event.startsAt,
            ends_at: event.endsAt,
            venue_name: event.venueName,
            area: event.area,
            latitude: event.latitude,
            longitude: event.longitude,
            description: event.description,
            cover_color: event.coverColor,
          })
          .select('id')
          .single();
        if (error) throw friendlyError(error);
        const id = (data as { id: string }).id;
        const tiers = event.tiers.map((t, i) => ({ event_id: id, name: t.name, price: t.price, capacity: t.capacity, sort: i }));
        const tierRes = await client.from('ticket_tiers').insert(tiers);
        if (tierRes.error) {
          await client.from('events').delete().eq('id', id);
          throw friendlyError(tierRes.error);
        }
        const [row] = await listEvents({ p_ids: [id] });
        setMyEventIds((ids) => [id, ...ids.filter((x) => x !== id)]);
        loadNearby().catch(() => {});
        return toEvent(row!);
      },
      scanTicket: async (eventId, code): Promise<ScanResult> => {
        const { data, error } = await client.rpc('check_in', { p_event_id: eventId, p_code: code });
        if (error) throw friendlyError(error);
        const res = data as { status: ScanResult['status']; ticket?: TicketRow };
        if ((res.status === 'valid' || res.status === 'used') && res.ticket) return { status: res.status, ticket: toTicket(res.ticket) };
        return { status: res.status === 'wrong-event' ? 'wrong-event' : 'invalid' };
      },
      ticketsFor: async (eventId) => {
        const { data, error } = await client.from('tickets').select(TICKET_COLUMNS).eq('event_id', eventId).order('purchased_at');
        if (error) throw friendlyError(error);
        return ((data ?? []) as TicketRow[]).map(toTicket);
      },
      ratingsFor: async (eventId) => {
        const { data, error } = await client
          .from('ratings')
          .select('event_id, user_id, stars, tags, comment, created_at')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (error) throw friendlyError(error);
        return ((data ?? []) as { event_id: string; user_id: string; stars: number; tags: string[]; comment: string; created_at: string }[]).map(
          (r) => ({ eventId: r.event_id, stars: r.stars, tags: r.tags as RatingTag[], comment: r.comment, createdAt: r.created_at, byMe: r.user_id === userId }),
        );
      },
    }),
    [client, session, sessionChecked, profile, profileLoaded, signedIn, needsProfile, userId, location, source, events, eventsById, nearbyEvents, myEvents, getEvent, listEvents, loadNearby, refresh, loading, distanceTo, tickets, myRatingsCount],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
