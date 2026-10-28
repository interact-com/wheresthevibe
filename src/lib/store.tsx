import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  BOOST_OPTIONS,
  BRAAMFONTEIN,
  ME,
  SAMPLE_EVENTS,
  SAMPLE_NOTIFICATIONS,
  SAMPLE_RATINGS,
  SAMPLE_TICKETS,
} from '@/data/sample';
import type { AppNotification, Boost, BoostOption, Rating, Ticket, VibeEvent } from '@/data/types';
import { distanceKm, type LatLng } from './geo';

// In-memory app state for the prototype. Each action here maps to one backend
// call later (Supabase insert / RPC), so screens won't need to change.

export type ScanResult =
  | { status: 'valid'; ticket: Ticket }
  | { status: 'used'; ticket: Ticket }
  | { status: 'wrong-event' }
  | { status: 'invalid' };

type Store = {
  signedIn: boolean;
  signIn: (interests: string[]) => void;
  interests: string[];
  location: LatLng;
  locationSource: 'device' | 'default';
  events: VibeEvent[];
  tickets: Ticket[];
  boosts: Boost[];
  ratings: Rating[];
  notifications: AppNotification[];
  getEvent: (id: string) => VibeEvent | undefined;
  distanceTo: (e: VibeEvent) => number;
  activeBoost: (eventId: string) => Boost | undefined;
  /** Events sorted with active boosts first, then by distance. */
  nearbyEvents: () => VibeEvent[];
  buyTickets: (eventId: string, tierId: string, quantity: number) => Ticket[];
  boostEvent: (eventId: string, option: BoostOption) => Boost;
  rateEvent: (rating: Omit<Rating, 'createdAt' | 'byMe'>) => void;
  createEvent: (event: Omit<VibeEvent, 'id'>) => VibeEvent;
  scanTicket: (eventId: string, code: string) => ScanResult;
};

const StoreContext = createContext<Store | null>(null);

function ticketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `WTV-${pick(4)}-${pick(2)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [interests, setInterests] = useState<string[]>(ME.interests);
  const signIn = useCallback((picked: string[]) => {
    // Real version: Supabase phone OTP sign-in, then save interests to the profile.
    setInterests(picked);
    setSignedIn(true);
  }, []);
  const [location, setLocation] = useState<LatLng>(BRAAMFONTEIN);
  const [locationSource, setLocationSource] = useState<'device' | 'default'>('default');
  const [events, setEvents] = useState<VibeEvent[]>(SAMPLE_EVENTS);
  const [tickets, setTickets] = useState<Ticket[]>(SAMPLE_TICKETS);
  const [boosts, setBoosts] = useState<Boost[]>(() => {
    // One boost already running so Discover shows the boosted state.
    const start = new Date(Date.now() - 30 * 60e3);
    const opt = BOOST_OPTIONS[1]!;
    return [
      {
        eventId: 'rooftop-sundowner',
        hours: opt.hours,
        price: opt.price,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + opt.hours * 3600e3).toISOString(),
      },
    ];
  });
  const [ratings, setRatings] = useState<Rating[]>(SAMPLE_RATINGS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (cancelled || !pos) return;
        // Sample events are all in Johannesburg; only use the device position if it's nearby,
        // otherwise the map would open somewhere with no events.
        const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        if (distanceKm(here, BRAAMFONTEIN) < 50) {
          setLocation(here);
          setLocationSource('device');
        }
      } catch {
        // Keep the default location.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getEvent = useCallback((id: string) => events.find((e) => e.id === id), [events]);
  const distanceTo = useCallback((e: VibeEvent) => distanceKm(location, e), [location]);
  const activeBoost = useCallback(
    (eventId: string) => {
      const now = Date.now();
      return boosts.find(
        (b) => b.eventId === eventId && new Date(b.startsAt).getTime() <= now && new Date(b.endsAt).getTime() > now,
      );
    },
    [boosts],
  );

  const nearbyEvents = useCallback(() => {
    const now = Date.now();
    return events
      .filter((e) => new Date(e.endsAt).getTime() > now)
      .sort((a, b) => {
        const boostDiff = Number(!!activeBoost(b.id)) - Number(!!activeBoost(a.id));
        return boostDiff || distanceKm(location, a) - distanceKm(location, b);
      });
  }, [events, activeBoost, location]);

  const buyTickets = useCallback((eventId: string, tierId: string, quantity: number) => {
    const now = new Date().toISOString();
    const bought = Array.from({ length: quantity }, (_, i) => ({
      id: `${eventId}-${Date.now()}-${i}`,
      eventId,
      tierId,
      code: ticketCode(),
      holderName: ME.name,
      purchasedAt: now,
    }));
    setTickets((t) => [...bought, ...t]);
    return bought;
  }, []);

  const boostEvent = useCallback((eventId: string, option: BoostOption) => {
    const start = new Date();
    const boost: Boost = {
      eventId,
      hours: option.hours,
      price: option.price,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + option.hours * 3600e3).toISOString(),
    };
    setBoosts((b) => [boost, ...b.filter((x) => x.eventId !== eventId)]);
    return boost;
  }, []);

  const rateEvent = useCallback((rating: Omit<Rating, 'createdAt' | 'byMe'>) => {
    setRatings((r) => [{ ...rating, createdAt: new Date().toISOString(), byMe: true }, ...r]);
  }, []);

  const createEvent = useCallback((event: Omit<VibeEvent, 'id'>) => {
    const created = { ...event, id: `event-${Date.now()}` };
    setEvents((e) => [created, ...e]);
    return created;
  }, []);

  const scanTicket = useCallback(
    (eventId: string, code: string): ScanResult => {
      const ticket = tickets.find((t) => t.code === code.trim());
      if (!ticket) return { status: 'invalid' };
      if (ticket.eventId !== eventId) return { status: 'wrong-event' };
      if (ticket.scannedAt) return { status: 'used', ticket };
      const scanned = { ...ticket, scannedAt: new Date().toISOString() };
      setTickets((all) => all.map((t) => (t.id === ticket.id ? scanned : t)));
      return { status: 'valid', ticket: scanned };
    },
    [tickets],
  );

  const value = useMemo<Store>(
    () => ({
      signedIn,
      signIn,
      interests,
      location,
      locationSource,
      events,
      tickets,
      boosts,
      ratings,
      notifications: SAMPLE_NOTIFICATIONS,
      getEvent,
      distanceTo,
      activeBoost,
      nearbyEvents,
      buyTickets,
      boostEvent,
      rateEvent,
      createEvent,
      scanTicket,
    }),
    [signedIn, signIn, interests, location, locationSource, events, tickets, boosts, ratings, getEvent, distanceTo, activeBoost, nearbyEvents, buyTickets, boostEvent, rateEvent, createEvent, scanTicket],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
