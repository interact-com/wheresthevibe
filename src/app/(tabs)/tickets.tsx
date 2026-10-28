import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Chip, Row, Screen, Txt } from '@/components/ui';
import type { Ticket } from '@/data/types';
import { when } from '@/lib/format';
import { useStore } from '@/lib/store';
import { colors, radius, space } from '@/theme';

export default function Tickets() {
  const { tickets, getEvent } = useStore();
  const [tab, setTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const now = Date.now();

  // One row per event, opening the first ticket of that event.
  const byEvent = new Map<string, Ticket[]>();
  for (const t of tickets) byEvent.set(t.eventId, [...(byEvent.get(t.eventId) ?? []), t]);
  const rows = [...byEvent.entries()]
    .map(([eventId, ts]) => ({ event: getEvent(eventId)!, tickets: ts }))
    .filter((r) => r.event && (tab === 'Past') === new Date(r.event.endsAt).getTime() < now)
    .sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));

  return (
    <Screen>
      <Txt variant="title" style={{ fontSize: 24 }}>
        Tickets
      </Txt>
      <Row>
        <Chip label="Upcoming" selected={tab === 'Upcoming'} onPress={() => setTab('Upcoming')} />
        <Chip label="Past" selected={tab === 'Past'} onPress={() => setTab('Past')} />
      </Row>
      {rows.map(({ event, tickets: ts }) => (
        <Pressable
          key={event.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: ts[0]!.id } })}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <View style={[styles.thumb, { backgroundColor: event.coverColor }]} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt variant="label" style={{ fontSize: 15 }} numberOfLines={1}>
              {event.title}
            </Txt>
            <Txt variant="small" color={colors.muted}>
              {when(event.startsAt)} · {ts.length} {ts.length === 1 ? 'ticket' : 'tickets'}
            </Txt>
          </View>
          <Txt variant="small" bold color={colors.accent}>
            {tab === 'Past' ? 'Rate' : 'Show QR'}
          </Txt>
        </Pressable>
      ))}
      {rows.length === 0 ? (
        <View style={{ gap: space.md, paddingVertical: space.xl }}>
          <Txt color={colors.muted} style={{ textAlign: 'center' }}>
            {tab === 'Upcoming' ? 'No tickets yet. Find a vibe near you.' : 'Events you’ve been to show up here.'}
          </Txt>
          {tab === 'Upcoming' ? <Button title="Discover events" kind="outline" onPress={() => router.navigate('/')} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
});
