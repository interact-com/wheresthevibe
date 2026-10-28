import type { AppNotification, BoostOption, Rating, RatingTag, Ticket, VibeEvent } from './types';

// Pricing from the business case.
export const BOOST_OPTIONS: BoostOption[] = [
  { hours: 3, price: 50 },
  { hours: 6, price: 80 },
  { hours: 12, price: 120 },
];
export const TICKET_COMMISSION = 0.07;

/** Pilot area. Used as the map's starting point and when location is denied. */
export const BRAAMFONTEIN = { latitude: -26.1929, longitude: 28.0305 };

export const RATING_TAGS: RatingTag[] = [
  'Music',
  'Crowd',
  'Venue',
  'Safety',
  'Value for money',
  'Queue at the door',
];

/** ISO time `days` from today at `hour`:`minute` local time. */
function at(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Sample content for the prototype. Names in [brackets] are placeholders.
export const SAMPLE_EVENTS: VibeEvent[] = [
  {
    id: 'rooftop-sundowner',
    title: 'Rooftop Amapiano Sundowner',
    hostName: '[Host name]',
    hostId: 'host-1',
    category: 'Party',
    tags: ['Amapiano', '18+'],
    startsAt: at(0, 17),
    endsAt: at(0, 23),
    venueName: '[Venue name]',
    area: 'Braamfontein',
    latitude: -26.1912,
    longitude: 28.0338,
    description:
      'Sunset sets on the roof with resident DJs. Food stalls on site. Tickets are digital only — show your QR at the door.',
    tiers: [
      { id: 'general', name: 'General', price: 80, capacity: 150 },
      { id: 'vip', name: 'VIP · rooftop deck', price: 200, capacity: 30 },
    ],
    coverColor: '#2A4544',
    hostRating: 4.6,
  },
  {
    id: 'fifa-night',
    title: 'FIFA Night at The Den',
    hostName: '[Host name]',
    hostId: 'host-2',
    category: 'Gaming',
    tags: ['Gaming', 'Free'],
    startsAt: at(0, 19),
    endsAt: at(0, 23, 30),
    venueName: 'The Den',
    area: 'Braamfontein',
    latitude: -26.1975,
    longitude: 28.0281,
    description: 'Bring your controller. Knockout tournament from 20:00, winner takes the bragging rights.',
    tiers: [{ id: 'rsvp', name: 'Free RSVP', price: 0, capacity: 60 }],
    coverColor: '#2A2D3F',
  },
  {
    id: 'home-cell',
    title: 'Thursday Home Cell',
    hostName: '[Host name]',
    hostId: 'host-3',
    category: 'Home cell',
    tags: ['Community'],
    startsAt: at(1, 18, 30),
    endsAt: at(1, 20, 30),
    venueName: '[Host home]',
    area: 'Parktown',
    latitude: -26.1843,
    longitude: 28.0389,
    description: 'Worship, a short word and supper together. Everyone welcome.',
    tiers: [{ id: 'rsvp', name: 'Free RSVP', price: 0, capacity: 25 }],
    coverColor: '#3A2E44',
  },
  {
    id: 'braai-sessions',
    title: 'Sunday Braai Sessions',
    hostName: '[Host name]',
    hostId: 'host-1',
    category: 'Food & markets',
    tags: ['Food', 'Live music'],
    startsAt: at(3, 13),
    endsAt: at(3, 19),
    venueName: '[Venue name]',
    area: 'Milpark',
    latitude: -26.1868,
    longitude: 28.0187,
    description: 'Bring your own meat, we bring the fire and the music.',
    tiers: [{ id: 'entry', name: 'Entry', price: 50, capacity: 120 }],
    coverColor: '#44342A',
    hostRating: 4.6,
  },
  {
    id: 'comedy-open-mic',
    title: 'Open Mic Comedy',
    hostName: '[Host name]',
    hostId: 'host-4',
    category: 'Comedy',
    tags: ['Comedy'],
    startsAt: at(2, 20),
    endsAt: at(2, 22, 30),
    venueName: '[Venue name]',
    area: 'Braamfontein',
    latitude: -26.1951,
    longitude: 28.0352,
    description: 'Ten new comics, five minutes each. Sign up at the door to perform.',
    tiers: [{ id: 'general', name: 'General', price: 60, capacity: 80 }],
    coverColor: '#2E3A2A',
    hostRating: 4.2,
  },
];

/** The signed-in user. Sample only. */
export const ME = { id: 'me', name: '[Your name]', interests: ['Amapiano', 'Gaming', 'House parties'] };

/** The host account the Host tab manages in the prototype. */
export const MY_HOST_ID = 'host-1';

export const SAMPLE_TICKETS: Ticket[] = [];

/** Pre-existing ratings so the host report has something to show. */
export const SAMPLE_RATINGS: Rating[] = [
  ...Array.from({ length: 44 }, (_, i) => r('rooftop-sundowner', 5, i % 3 === 0 ? ['Music', 'Crowd'] : ['Music'])),
  ...Array.from({ length: 12 }, (_, i) => r('rooftop-sundowner', 4, i % 2 ? ['Venue', 'Crowd'] : ['Venue'])),
  ...Array.from({ length: 5 }, () => r('rooftop-sundowner', 3, ['Queue at the door'])),
  ...Array.from({ length: 2 }, () => r('rooftop-sundowner', 2, ['Queue at the door', 'Value for money'])),
  r('rooftop-sundowner', 1, ['Value for money']),
].map((x, i) =>
  i === 0
    ? { ...x, comment: 'Best sunset set this year. Bring that DJ back.' }
    : i === 58
      ? { ...x, comment: 'Great vibe, but we queued 40 minutes to get in.' }
      : x,
);

function r(eventId: string, stars: number, tags: RatingTag[]): Rating {
  return { eventId, stars, tags, comment: '', createdAt: at(-1, 23) };
}

export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    kind: 'boost',
    title: 'Vibe nearby · 600 m away',
    body: 'Rooftop Amapiano Sundowner starts at 17:00. Tickets from R80.',
    at: new Date(Date.now() - 2 * 60e3).toISOString(),
    eventId: 'rooftop-sundowner',
  },
  {
    id: 'n2',
    kind: 'rate',
    title: 'How was FIFA Night?',
    body: 'Rate the vibe and help the host do better next time.',
    at: new Date(Date.now() - 60 * 60e3).toISOString(),
    eventId: 'fifa-night',
  },
  {
    id: 'n3',
    kind: 'host',
    title: '[Host name] posted a new event',
    body: 'A host you follow: Sunday Braai Sessions.',
    at: new Date(Date.now() - 2 * 24 * 60 * 60e3).toISOString(),
    eventId: 'braai-sessions',
  },
];
