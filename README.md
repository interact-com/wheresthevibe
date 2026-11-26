# Where’z The Vibe

A geosocial events app: find what’s happening near you, buy a QR ticket, get scanned in, rate the vibe. Hosts create events, sell tickets, boost them to nearby users and see feedback.

This is the **MVP prototype**, built with Expo (React Native) and running in the browser as a web app hosted on Netlify. All the core screens work on sample data. There is no backend yet; everything lives in memory and resets when the page reloads.

## Use it on a phone

Open the Netlify link in Safari (iPhone) or Chrome (Android). To make it feel like an app, add it to your home screen:

- **iPhone:** tap **Share → Add to Home Screen**. It then opens full screen, without the browser bars.
- **Android:** tap the **⋮** menu → **Add to Home screen** / **Install app**.

Sign in with any phone number and any 6 digits.

## Deploy on Netlify

Netlify builds the site from this repo using `netlify.toml` (build command `npx expo export --platform web`, output folder `dist`).

1. In Netlify: **Add new site → Import an existing project → GitHub**, and pick this repo.
2. Choose the branch to deploy. Netlify reads the build settings from `netlify.toml`, so leave them as they are.
3. Click **Deploy**. Every push to that branch redeploys the site.

To deploy by hand instead, run `npm run build:web` and drag the `dist` folder onto your site's **Deploys** page.

## Run it on your computer

You need Node.js 20+.

```bash
npm install
npm run web
```

This opens the app at http://localhost:8081. Use your browser’s phone view (DevTools → device toolbar) to see it at phone size.

- `npm run build:web` builds the site into `dist`, the same way Netlify does.
- `npm run typecheck` checks types.

## What works

| Flow | Screens |
| --- | --- |
| Attendee | Sign up + interests → Discover (map + list, search, filters) → Event → Checkout → QR ticket → Rate the vibe |
| Host | Host tab → Create event → Dashboard (sales, payout after 7%, Vibe Boost, guest list) → Door scanner → Vibe report |
| Other | Notifications, Profile |

To test the door scanner, buy a ticket on one phone and scan its QR with the scanner on another, or type the ticket’s code (e.g. `WTV-7K2Q-91`) into the scanner’s code box. Scanning the same ticket twice shows “Already used”.

Location: the browser asks for your location. If you say no, or you’re more than 50 km from Johannesburg, the app uses Braamfontein so the sample events show up.

The map uses [Leaflet](https://leafletjs.com) with free CARTO / OpenStreetMap tiles. That’s fine for a prototype; for a public launch, check CARTO’s usage terms or switch to a paid map provider.

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
5. **App stores (later).** The same code also builds as native iPhone and Android apps with EAS. Google Maps then needs an Android API key in `app.json`.

Later features from the business case (video clips, live footage requests, messages, venue marketplace) are designed but not built yet.
