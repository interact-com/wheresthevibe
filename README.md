# Where’z The Vibe

A geosocial events app: find what’s happening near you, buy a QR ticket, get scanned in, rate the vibe. Hosts create events, sell tickets, boost them to nearby users and see feedback.

This is the **MVP**, built with Expo (React Native) and running in the browser as a web app hosted on Netlify. It runs in one of two modes:

- **Live mode:** real accounts and data in Supabase (database, email sign-in). Used when the two Supabase keys are set.
- **Demo mode:** sample data in the browser only, reset on reload, any 6-digit code signs you in. Used when the keys aren't set.

## Use it on a phone

Open the Netlify link in Safari (iPhone) or Chrome (Android). To make it feel like an app, add it to your home screen:

- **iPhone:** tap **Share → Add to Home Screen**. It then opens full screen, without the browser bars.
- **Android:** tap the **⋮** menu → **Add to Home screen** / **Install app**.

In live mode you sign in with your email and the code it sends you. In demo mode any email and any 6 digits work.

## Set up the backend (Supabase)

Do this once. Until it's done the app stays in demo mode.

1. **Create a project** at supabase.com (free plan). Pick the region closest to South Africa, and save the database password somewhere safe.
2. **Create the database.** In the dashboard open **SQL Editor → New query**, paste all of `supabase/migrations/0001_init.sql`, and click **Run**. Then do the same with `supabase/seed.sql` to add the demo events around Braamfontein (run it again any time to refresh their dates).
3. **Make sign-in emails show a code.** Go to **Authentication → Emails → Templates → Magic Link** and use something like:

   ```html
   <h2>Your Where’z The Vibe code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>Or tap this link on your phone: <a href="{{ .ConfirmationURL }}">Sign in</a></p>
   ```

4. **Allow your site address.** In **Authentication → URL Configuration**, set **Site URL** to your Netlify address (`https://<your-site>.netlify.app`) and add `http://localhost:8081` under **Redirect URLs** for testing on your computer.
5. **Copy the keys.** Under **Project Settings → API keys**, copy the **Project URL** and the **publishable** (or **anon**) key. Never use the **secret / service_role** key in the app.
6. **Give the keys to Netlify.** In Netlify: **Site configuration → Environment variables → Add a variable**:
   - `EXPO_PUBLIC_SUPABASE_URL` = the Project URL
   - `EXPO_PUBLIC_SUPABASE_KEY` = the publishable / anon key

   Then **Deploys → Trigger deploy → Deploy site**. The keys are built into the site, so every change to them needs a new deploy.
7. **On your computer**, copy `.env.example` to `.env` and paste the same two values.

Supabase's built-in email sender only allows a few emails an hour. Before the pilot, connect your own email service under **Authentication → Emails → SMTP Settings** (for example Resend or Brevo).

### How the data is protected

Every rule lives in the database (`supabase/migrations/0001_init.sql`), so a modified app can't get around it:

- Anyone can see published events; hosts manage only their own.
- Tickets are created only by `buy_tickets()`, which checks capacity and gives each ticket a random code.
- Only an event's host can scan its tickets, and each ticket scans once (`check_in()`).
- Only people whose ticket was scanned can rate an event, once each (`rate_event()`).
- Guests see only their own tickets; hosts see their own guest lists; profiles are private.

`supabase/tests/rules.test.sql` checks all of this. To run it you need PostgreSQL 16 with PostGIS: create a database called `wtv`, then run `supabase/tests/supabase_stub.sql`, the migration, `supabase/seed.sql` and the test file in that order.

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
  lib/store.tsx        The app's data interface (buy, boost, rate, scan…)
  lib/store.live.tsx   …backed by Supabase
  lib/store.demo.tsx   …backed by sample data (demo mode)
  lib/supabase.ts      Supabase connection (reads the two keys)
supabase/
  migrations/          Database tables, rules and functions
  seed.sql             Demo events
  tests/               Database rule tests
  theme.ts             Colours, fonts, spacing
```

## Next steps

1. **Rest of Phase 1:** event photos, map pin picker, edit and cancel events, live check-in count for more than one door person.
2. **Payments.** Pick Paystack, Yoco or PayFast. Tickets should be issued by the server after a successful payment webhook, with a signed code in the QR.
3. **Push notifications** for Vibe Boost alerts and “rate the vibe” prompts (Expo Notifications).
4. **Event photos** and a map pin picker when creating an event.
5. **App stores (later).** The same code also builds as native iPhone and Android apps with EAS. Google Maps then needs an Android API key in `app.json`.

Later features from the business case (video clips, live footage requests, messages, venue marketplace) are designed but not built yet.
