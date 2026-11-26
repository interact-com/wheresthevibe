import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { VibeEvent } from '@/data/types';
import { km, rand, when } from '@/lib/format';
import { useStore } from '@/lib/store';
import { colors, radius, space } from '@/theme';
import { Badge, Row, Txt } from './ui';

export function fromPrice(e: VibeEvent) {
  const min = Math.min(...e.tiers.map((t) => t.price));
  return min === 0 ? 'Free' : `from ${rand(min)}`;
}

export function EventCard({ event }: { event: VibeEvent }) {
  const { distanceTo, isBoosted } = useStore();
  const boosted = isBoosted(event);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
      style={({ pressed }) => [styles.card, boosted && styles.boosted, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.thumb, { backgroundColor: event.coverColor }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <Row gap={6}>
          {boosted ? <Badge label="Boosted" /> : null}
          <Txt variant="caption" color={colors.muted}>
            {km(distanceTo(event))}
          </Txt>
        </Row>
        <Txt variant="label" style={{ fontSize: 15 }} numberOfLines={1}>
          {event.title}
        </Txt>
        <Txt variant="small" color={colors.muted} numberOfLines={1}>
          {when(event.startsAt)} · {fromPrice(event)}
          {event.hostRating ? ` · ★ ${event.hostRating.toFixed(1)}` : ` · ${event.category}`}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
  },
  boosted: { borderWidth: 2, borderColor: colors.accent },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
});
