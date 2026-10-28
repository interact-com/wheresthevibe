# Where’z The Vibe

A geosocial events app: find what’s happening near you, buy a QR ticket, get scanned in, rate the vibe. Hosts create events, sell tickets, boost them to nearby users and see feedback.

This is the **MVP prototype**: an Expo (React Native) app with all the core screens working on sample data. There is no backend yet; everything lives in memory and resets when the app restarts.

## Run it

You need Node.js 20+ and the **Expo Go** app on your phone.

```bash
npm install
npm start
```

Scan the QR code in the terminal with Expo Go (Android) or the Camera app (iOS). Your phone and computer must be on the same Wi‑Fi.

- Sign in with any phone number and any 6 digits.
- `npm run typecheck` checks types.

## What works

| Flow | Screens |
| --- | --- |
| Attendee | Sign up + interests → Discover (map + list, search, filters) → Event → Checkout → QR ticket → Rate the vibe |
| Host | Host tab → Create event → Dashboard (sales, payout after 7%, Vibe Boost, guest list) → Door scanner → Vibe report |
| Other | Notifications, Profile |

To test the door scanner on one phone, buy a ticket, copy its code from the ticket screen (e.g. `WTV-7K2Q-91`) and type it into the scanner’s code box. Scanning the same ticket twice shows “Already used”.

Location: the app asks for your location. If you’re more than 50 km from Johannesburg, it falls back to Braamfontein so the sample events show up.

## Project layout

```
src/
  app/                 Screens (Expo Router: every file is a route)
    (tabs)/            Discover, Tickets, Host, Profile
    event/[id].tsx     Event detail
    checkout/[id].tsx  Checkout
    ticket/[id].tsx    QR ticket
    rate/[id].tsx      Rate the vibe
    host/[id]/         Host dashboard, door scanner, vibe report
    onboarding.tsx     Sign up
    notifications.tsx
  components/          Shared UI (buttons, chips, cards, icons)
  data/                Types and sample data
  lib/store.tsx        App state and actions (buy, boost, rate, scan…)
  theme.ts             Colours, fonts, spacing
```

## Next steps

1. **Backend (Supabase).** Create tables matching `src/data/types.ts` (events with a PostGIS location, ticket_tiers, tickets, boosts, ratings) and replace the actions in `src/lib/store.tsx` with Supabase queries. Phone OTP login replaces the onboarding stub.
2. **Payments.** Pick Paystack, Yoco or PayFast. Tickets should be issued by the server after a successful payment webhook, with a signed code in the QR.
3. **Push notifications** for Vibe Boost alerts and “rate the vibe” prompts (Expo Notifications).
4. **Event photos** and a map pin picker when creating an event.
5. **App stores.** Google Maps needs an Android API key in `app.json` for release builds; build with EAS.

Later features from the business case (video clips, live footage requests, messages, venue marketplace) are designed but not built yet.
