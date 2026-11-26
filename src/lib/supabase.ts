import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Set these in a local .env file and in Netlify → Site configuration → Environment variables.
// Both are safe to ship in the app: what users can do is limited by the database rules
// (supabase/migrations). Never put the service_role / secret key here.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** null when the keys aren't set: the app then runs in demo mode on sample data. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Lets a tapped magic link sign you in on the web.
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

/** Turns Supabase / Postgres errors into a sentence we can show people. */
export function friendlyError(error: unknown): Error {
  const message =
    typeof error === 'object' && error && 'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : 'Something went wrong';
  if (/fetch|network/i.test(message)) return new Error('Can’t reach the server. Check your connection and try again.');
  if (/token has expired|invalid/i.test(message) && /otp|token/i.test(message)) return new Error('That code is wrong or has expired. Request a new one.');
  if (/rate limit/i.test(message)) return new Error('Too many attempts. Wait a minute and try again.');
  return new Error(message);
}
