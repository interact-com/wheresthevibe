import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Row, Screen, Txt } from '@/components/ui';
import { ME } from '@/data/sample';
import { initials } from '@/lib/format';
import { useStore } from '@/lib/store';
import { colors, radius, space } from '@/theme';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="heading">{value}</Txt>
      <Txt variant="caption" color={colors.muted}>
        {label}
      </Txt>
    </View>
  );
}

function LinkRow({ label, href }: { label: string; href?: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={href ? () => router.push(href) : undefined}
      style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
    >
      <Txt>{label}</Txt>
      <Txt color={colors.muted}>{href ? '›' : 'Soon'}</Txt>
    </Pressable>
  );
}

export default function Profile() {
  const { tickets, ratings, interests, location, locationSource } = useStore();
  const eventsBeen = new Set(tickets.filter((t) => t.scannedAt).map((t) => t.eventId)).size;
  const rated = ratings.filter((r) => r.byMe).length;

  return (
    <Screen>
      <Row gap={14}>
        <Avatar text={initials(ME.name) || 'ME'} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="heading" style={{ fontSize: 20 }}>
            {ME.name}
          </Txt>
          <Txt variant="small" color={colors.muted}>
            {interests.join(', ') || 'No interests picked yet'}
          </Txt>
        </View>
      </Row>
      <Row>
        <Stat value={eventsBeen} label="Events been" />
        <Stat value={rated} label="Vibes rated" />
        <Stat value={tickets.length} label="Tickets" />
      </Row>
      <Txt variant="caption" color={colors.muted}>
        {locationSource === 'device'
          ? 'Showing events near your current location.'
          : `Showing events around Braamfontein (${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}).`}
      </Txt>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
        <LinkRow label="My tickets" href="/tickets" />
        <LinkRow label="Notifications" href="/notifications" />
        <LinkRow label="Switch to hosting" href="/host" />
        <LinkRow label="Privacy and data (POPIA)" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', gap: 2 },
  linkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider, gap: space.md },
});
