import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';
import type { EventMapProps } from './EventMap';
import { Txt } from './ui';

// react-native-maps has no web support. In the browser we draw a simple
// "radar" view: pins placed by their offset from your location.
const SPAN = 0.035; // degrees shown across the box, same zoom as the native map

export function EventMap({ events, center, isBoosted, onPressEvent }: EventMapProps) {
  const place = (lat: number, lng: number) => ({
    left: `${50 + ((lng - center.longitude) / SPAN) * 100}%` as const,
    top: `${50 - ((lat - center.latitude) / SPAN) * 100}%` as const,
  });
  return (
    <View style={styles.wrap} accessibilityLabel="Map of events near you">
      <View style={[styles.ring, { width: 120, height: 120, marginLeft: -60, marginTop: -60 }]} />
      <View style={[styles.ring, { width: 220, height: 220, marginLeft: -110, marginTop: -110 }]} />
      <View style={styles.me} />
      {events.map((e) => {
        const pos = place(e.latitude, e.longitude);
        const boosted = isBoosted(e.id);
        return (
          <Pressable
            key={e.id}
            accessibilityRole="link"
            accessibilityLabel={e.title}
            onPress={() => onPressEvent(e.id)}
            style={[styles.pin, pos, boosted && styles.pinBoosted]}
          >
            {boosted ? (
              <Txt variant="caption" bold color={colors.accentInk} numberOfLines={1}>
                {e.title.split(' ').slice(0, 2).join(' ')}
              </Txt>
            ) : null}
          </Pressable>
        );
      })}
      <Txt variant="caption" color={colors.muted} style={styles.note}>
        Simplified map in the browser. Open in Expo Go for the real map.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 260, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  ring: { position: 'absolute', left: '50%', top: '50%', borderRadius: 999, borderWidth: 1, borderColor: colors.divider },
  me: { position: 'absolute', left: '50%', top: '50%', width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: 9, backgroundColor: colors.me, borderWidth: 3, borderColor: colors.bg },
  pin: { position: 'absolute', width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.bg },
  pinBoosted: { width: 'auto', height: 'auto', marginLeft: -40, marginTop: -14, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 0, maxWidth: 160 },
  note: { position: 'absolute', bottom: 8, left: 12, right: 12 },
});
