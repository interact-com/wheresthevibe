import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { ME, MY_HOST_ID, SAMPLE_EVENTS, SAMPLE_NOTIFICATIONS, SAMPLE_RATINGS } from '@/data/sample';
import type { Rating, Ticket, VibeEvent } from '@/data/types';
import { distanceKm } from './geo';
import { StoreContext, type ScanResult, type Store } from './store';
import { useUserLocation } from './useLocation';

// Demo mode: everything in memory on sample data, reset on reload. Used when no
// Supabase keys are configured, so the public link keeps working as a demo.

function ticketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `WTV-${pick(4)}-${pick(4)}`;
}

const isLive = (e: VibeEvent) => !!e.boostedUntil && new Date(e.boostedUntil).getTime() > Date.now();

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [signedInState, setSignedIn] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState(ME.name);
  const [interests, setInterests] = useState<string[]>([]);
  const { location, source } = useUserLocation();
  const [events, setEvents] = useState<VibeEvent[]>(() =>
    SAMPLE_EVENTS.map((e) =>
      // One boost already running so Discover shows the boosted look.
      e.id === 'rooftop-sundowner' ? { ...e, boostedUntil: new Date(Date.now() + 5.5 * 3600e3).toISOString() } : e,
    ),
  );
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ratings, setRatings] = useState<Rating[]>(SAMPLE_RATINGS);

  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);
  const distanceTo = useCallback((e: VibeEvent) => distanceKm(location, e), [location]);
  const nearbyEvents = useCallback(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.endsAt).getTime() > now && e.status !== 'cancelled')
      .sort((a, b) => Number(isLive(b)) - Number(isLive(a)) || distanceKm(location, a) - distanceKm(location, b));
  }, [events, location]);
  const myEvents = useMemo(
    () => events.filter((e) => e.hostId === MY_HOST_ID).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [events],
  );

  const value = useMemo<Store>(
    () => ({
      mode: 'demo',
      ready: true,
      signedIn: signedInState,
      needsProfile: hasSession && !signedInState,
      email,
      userName,
      interests,
      sendCode: async (address) => {
        setEmail(address.trim());
      },
      verifyCode: async (_address, code) => {
        if (!/^\d{6,8}$/.test(code)) throw new Error('Enter the code from the email.');
        setHasSession(true);
      },
      saveProfile: async (name, picked) => {
        setUserName(name.trim() || ME.name);
        setInterests(picked);
        setSignedIn(true);
      },
      signOut: async () => {
        setSignedIn(false);
        setHasSession(false);
      },
      location,
      locationSource: source,
      events,
      nearbyEvents,
      myEvents,
      getEvent,
      loadEvents: async () => {},
      refresh: async () => {},
      loading: false,
      distanceTo,
      isBoosted: isLive,
      tickets,
      myRatingsCount: ratings.filter((r) => r.byMe).length,
      notifications: SAMPLE_NOTIFICATIONS,

      buyTickets: async (eventId, tierId, quantity) => {
        const now = new Date().toISOString();
        const bought = Array.from({ length: quantity }, (_, i) => ({
          id: `${eventId}-${Date.now()}-${i}`,
          eventId,
          tierId,
          code: ticketCode(),
          holderName: userName,
          purchasedAt: now,
        }));
        setTickets((t) => [...bought, ...t]);
        return bought;
      },
      boostEvent: async (eventId, option) => {
        const until = new Date(Date.now() + option.hours * 3600e3).toISOString();
        setEvents((all) => all.map((e) => (e.id === eventId ? { ...e, boostedUntil: until } : e)));
      },
      rateEvent: async (rating) => {
        setRatings((r) => [
          { ...rating, createdAt: new Date().toISOString(), byMe: true },
          ...r.filter((x) => !(x.byMe && x.eventId === rating.eventId)),
        ]);
      },
      createEvent: async (event) => {
        const created: VibeEvent = { ...event, id: `event-${Date.now()}`, hostId: MY_HOST_ID, hostName: userName };
        setEvents((e) => [created, ...e]);
        return created;
      },
      scanTicket: async (eventId, code): Promise<ScanResult> => {
        const ticket = tickets.find((t) => t.code === code.trim().toUpperCase());
        if (!ticket) return { status: 'invalid' };
        if (ticket.eventId !== eventId) return { status: 'wrong-event' };
        if (ticket.scannedAt) return { status: 'used', ticket };
        const scanned = { ...ticket, scannedAt: new Date().toISOString() };
        setTickets((all) => all.map((t) => (t.id === ticket.id ? scanned : t)));
        return { status: 'valid', ticket: scanned };
      },
      ticketsFor: async (eventId) => tickets.filter((t) => t.eventId === eventId),
      ratingsFor: async (eventId) => ratings.filter((r) => r.eventId === eventId),
    }),
    [signedInState, hasSession, email, userName, interests, location, source, events, nearbyEvents, myEvents, getEvent, distanceTo, tickets, ratings],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
