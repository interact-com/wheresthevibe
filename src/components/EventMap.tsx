import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, type MapStyleElement } from 'react-native-maps';

import type { VibeEvent } from '@/data/types';
import type { LatLng } from '@/lib/geo';
import { colors, radius } from '@/theme';
import { fromPrice } from './EventCard';
import { Txt } from './ui';

// Native map (iOS: Apple Maps, Android: Google Maps). The browser uses EventMap.web.tsx.
export type EventMapProps = {
  events: VibeEvent[];
  center: LatLng;
  isBoosted: (eventId: string) => boolean;
  onPressEvent: (eventId: string) => void;
};

export function EventMap({ events, center, isBoosted, onPressEvent }: EventMapProps) {
  return (
    <View style={styles.wrap}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...center, latitudeDelta: 0.035, longitudeDelta: 0.035 }}
        showsUserLocation
        userInterfaceStyle="dark"
        customMapStyle={Platform.OS === 'android' ? DARK_MAP : undefined}
      >
        {events.map((e) => {
          const boosted = isBoosted(e.id);
          return (
            <Marker
              key={e.id}
              coordinate={{ latitude: e.latitude, longitude: e.longitude }}
              onPress={() => onPressEvent(e.id)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 1 }}
            >
              {boosted ? (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View style={styles.boostLabel}>
                    <Txt variant="caption" bold color={colors.accentInk} numberOfLines={1}>
                      {e.title.split(' ').slice(0, 2).join(' ')} · {fromPrice(e).replace('from ', '')}
                    </Txt>
                  </View>
                  <View style={[styles.dot, { width: 16, height: 16 }]} />
                </View>
              ) : (
                <View style={styles.dot} />
              )}
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

export const mapStyles = StyleSheet.create({
  wrap: { height: 260, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});

const styles = StyleSheet.create({
  wrap: mapStyles.wrap,
  dot: { width: 14, height: 14, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.bg },
  boostLabel: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 200 },
});

// Muted dark style for Google Maps on Android (iOS uses Apple Maps' dark mode).
const DARK_MAP: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#171a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9090' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0f0f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262a2a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1a1a' }] },
];
