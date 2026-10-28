// Visual language from the MVP screen designs: dark nightlife look, logo teal accent.
export const colors = {
  bg: '#0E0F0F',
  surface: '#1C1E1E',
  surfaceAlt: '#171A1A',
  border: '#2E3232',
  divider: '#262A2A',
  tabBar: '#141616',
  text: '#F4F4F2',
  textSoft: '#C9CDCD',
  muted: '#A3A8A8',
  accent: '#6ECBC8',
  accentInk: '#0E0F0F',
  accentTint: '#142423',
  warn: '#F2A65A',
  warnTint: '#2C2013',
  good: '#3FBF7F',
  goodTint: '#10301F',
  live: '#E5484D',
  me: '#4C8DFF',
} as const;

export const fonts = {
  display: 'Quicksand_700Bold',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
} as const;

export const radius = { sm: 12, md: 14, lg: 16, xl: 20, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
