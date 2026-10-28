import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, type MapStyleElement } from 'react-native-maps';

import { EventCard, fromPrice } from '@/components/EventCard';
import { Icon } from '@/components/Icon';
import { Chip, IconButton, LogoMark, Row, Screen, Txt } from '@/components/ui';
import type { VibeEvent } from '@/data/types';
import { useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme';

const FILTERS = ['All', 'Tonight', 'This weekend', 'Free', 'Party', 'Gaming', 'Home cell'] as const;
type Filter = (typeof FILTERS)[number];

function matches(e: VibeEvent, filter: Filter, query: string) {
  const q = query.trim().toLowerCase();
  if (q && !`${e.title} ${e.category} ${e.area} ${e.tags.join(' ')}`.toLowerCase().includes(q)) return false;
  const start = new Date(e.startsAt);
  const now = new Date();
  switch (filter) {
    case 'All':
      return true;
    case 'Tonight':
      return start.toDateString() === now.toDateString();
    case 'This weekend': {
      const day = start.getDay();
      const inWeek = start.getTime() - now.getTime() < 7 * 24 * 3600e3;
      return inWeek && (day === 5 || day === 6 || day === 0);
    }
    case 'Free':
      return e.tiers.some((t) => t.price === 0);
    default:
      return e.category === filter;
  }
}

export default function Discover() {
  const { nearbyEvents, activeBoost, location } = useStore();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const events = useMemo(() => nearbyEvents().filter((e) => matches(e, filter, query)), [nearbyEvents, filter, query]);

  return (
    <Screen scroll={false} contentStyle={{ padding: 0, paddingBottom: 0, gap: 0 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={10}>
            <LogoMark />
            <Txt variant="heading" style={{ fontSize: 20 }}>
              Where’z The Vibe
            </Txt>
          </Row>
          <IconButton name="bell" label="Notifications" onPress={() => router.push('/notifications')} />
        </Row>

        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search parties, expos, home cells…"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Search events"
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>

        <View style={styles.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ ...location, latitudeDelta: 0.035, longitudeDelta: 0.035 }}
            showsUserLocation
            userInterfaceStyle="dark"
            customMapStyle={Platform.OS === 'android' ? DARK_MAP : undefined}
          >
            {events.map((e) => {
              const boosted = !!activeBoost(e.id);
              return (
                <Marker
                  key={e.id}
                  coordinate={{ latitude: e.latitude, longitude: e.longitude }}
                  onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}
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

        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Near you</Txt>
          <Txt variant="small" color={colors.muted}>
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </Txt>
        </Row>
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
        {events.length === 0 ? (
          <Txt color={colors.muted} style={{ textAlign: 'center', paddingVertical: space.xl }}>
            No vibes match that yet. Try another filter.
          </Txt>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.md, paddingBottom: space.xxl * 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  mapWrap: { height: 260, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
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
