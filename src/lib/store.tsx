import { createContext, useContext, type ReactNode } from 'react';

import type { AppNotification, BoostOption, Rating, Ticket, VibeEvent } from '@/data/types';
import type { LatLng } from './geo';
import { supabase } from './supabase';

// One interface, two implementations:
//   store.live.tsx  — Supabase (when EXPO_PUBLIC_SUPABASE_URL / _KEY are set)
//   store.demo.tsx  — in-memory sample data (no keys: the public demo keeps working)
// Screens only talk to this interface.

export type ScanResult =
  | { status: 'valid'; ticket: Ticket }
  | { status: 'used'; ticket: Ticket }
  | { status: 'wrong-event' }
  | { status: 'invalid' };

export type NewEvent = Omit<VibeEvent, 'id' | 'hostName' | 'hostId' | 'hostRating' | 'boostedUntil' | 'status'>;

export type Store = {
  mode: 'demo' | 'live';
  /** False until we know whether someone is signed in. */
  ready: boolean;
  /** Signed in AND finished the profile step. */
  signedIn: boolean;
  /** Signed in but hasn't chosen a name and interests yet. */
  needsProfile: boolean;
  email: string | null;
  userName: string;
  interests: string[];
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  saveProfile: (name: string, interests: string[]) => Promise<void>;
  signOut: () => Promise<void>;

  location: LatLng;
  locationSource: 'device' | 'default';

  /** Every event the app has loaded (Discover, your tickets, your hosted events). */
  events: VibeEvent[];
  /** Upcoming events near you, boosted first. */
  nearbyEvents: () => VibeEvent[];
  /** Your own hosted events, newest first. */
  myEvents: VibeEvent[];
  getEvent: (id: string) => VibeEvent | undefined;
  /** Fetches events that aren't loaded yet (e.g. opened from a shared link). */
  loadEvents: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
  distanceTo: (e: VibeEvent) => number;
  isBoosted: (e: VibeEvent) => boolean;

  /** Your tickets. */
  tickets: Ticket[];
  myRatingsCount: number;
  notifications: AppNotification[];

  buyTickets: (eventId: string, tierId: string, quantity: number) => Promise<Ticket[]>;
  boostEvent: (eventId: string, option: BoostOption) => Promise<void>;
  rateEvent: (rating: Omit<Rating, 'createdAt' | 'byMe'>) => Promise<void>;
  createEvent: (event: NewEvent) => Promise<VibeEvent>;
  scanTicket: (eventId: string, code: string) => Promise<ScanResult>;
  /** Host only: the event's guest list. */
  ticketsFor: (eventId: string) => Promise<Ticket[]>;
  /** Host only: the event's ratings. */
  ratingsFor: (eventId: string) => Promise<Rating[]>;
};

export const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Required lazily so the demo bundle path doesn't need Supabase and vice versa.
  if (supabase) {
    const { LiveStoreProvider } = require('./store.live') as typeof import('./store.live');
    return <LiveStoreProvider client={supabase}>{children}</LiveStoreProvider>;
  }
  const { DemoStoreProvider } = require('./store.demo') as typeof import('./store.demo');
  return <DemoStoreProvider>{children}</DemoStoreProvider>;
}
