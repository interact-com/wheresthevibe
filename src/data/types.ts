// Shapes mirror the tables we plan to create in Supabase (events, ticket_tiers,
// tickets, boosts, ratings), so swapping sample data for real queries is a
// data-layer change, not a screen rewrite.

export type Category =
  | 'Party'
  | 'House party'
  | 'Home cell'
  | 'Gaming'
  | 'Umsebenzi'
  | 'Food & markets'
  | 'Comedy'
  | 'Sport';

export type TicketTier = {
  id: string;
  name: string;
  /** Price in rand. 0 means free RSVP. */
  price: number;
  capacity: number;
};

export type VibeEvent = {
  id: string;
  title: string;
  hostName: string;
  hostId: string;
  category: Category;
  tags: string[];
  startsAt: string; // ISO
  endsAt: string; // ISO
  venueName: string;
  area: string;
  latitude: number;
  longitude: number;
  description: string;
  tiers: TicketTier[];
  coverColor: string;
  /** Host's average vibe rating across past events, if any. */
  hostRating?: number;
};

export type Ticket = {
  id: string;
  eventId: string;
  tierId: string;
  /** Value encoded in the QR. In production this is a signed token issued by the server. */
  code: string;
  holderName: string;
  purchasedAt: string;
  scannedAt?: string;
};

export type BoostOption = { hours: 3 | 6 | 12; price: number };

export type Boost = {
  eventId: string;
  hours: BoostOption['hours'];
  price: number;
  startsAt: string;
  endsAt: string;
};

export type RatingTag =
  | 'Music'
  | 'Crowd'
  | 'Venue'
  | 'Safety'
  | 'Value for money'
  | 'Queue at the door';

export type Rating = {
  eventId: string;
  stars: number;
  tags: RatingTag[];
  comment: string;
  createdAt: string;
  /** True for ratings the signed-in user wrote. */
  byMe?: boolean;
};

export type AppNotification = {
  id: string;
  kind: 'boost' | 'rate' | 'ticket' | 'host';
  title: string;
  body: string;
  at: string;
  eventId?: string;
};
