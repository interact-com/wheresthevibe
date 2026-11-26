import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, CenterMessage, Header, Row, Screen, Txt } from '@/components/ui';
import { when } from '@/lib/format';
import { useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tickets, getEvent, loading } = useStore();
  const ticket = tickets.find((t) => t.id === id);
  const event = ticket && getEvent(ticket.eventId);
  if (!ticket || !event) {
    if (loading) return <CenterMessage title="Loading…" />;
    return <CenterMessage title="Ticket not found" body="It isn’t on this account." action={<Button title="My tickets" onPress={() => router.replace('/tickets')} />} />;
  }
  const tier = event.tiers.find((t) => t.id === ticket.tierId);
  const group = tickets.filter((t) => t.eventId === ticket.eventId && t.purchasedAt === ticket.purchasedAt);
  const position = group.findIndex((t) => t.id === ticket.id) + 1;
  const ended = new Date(event.endsAt).getTime() < Date.now();

  const directions = () => {
    const { latitude: lat, longitude: lng } = event;
    const url =
      Platform.OS === 'ios'
        ? `https://maps.apple.com/?daddr=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  return (
    <Screen>
      <Header title="My ticket" subtitle={group.length > 1 ? `Ticket ${position} of ${group.length}` : undefined} onBack={() => router.replace('/tickets')} />
      <View style={styles.ticket}>
        <View style={styles.ticketTop}>
          <Txt variant="caption" bold color={colors.accentInk} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {tier?.name ?? 'Ticket'}
          </Txt>
          <Txt variant="heading" color={colors.accentInk} style={{ fontSize: 20 }}>
            {event.title}
          </Txt>
        </View>
        <View style={{ alignItems: 'center', padding: space.xl, gap: space.md }}>
          <View style={{ padding: 10, backgroundColor: '#fff', borderRadius: radius.sm }}>
            <QRCode value={ticket.code} size={200} color="#0E0F0F" backgroundColor="#FFFFFF" />
          </View>
          <Txt variant="small" color={ticket.scannedAt ? colors.warn : '#4A4F4F'} style={{ fontFamily: ticket.scannedAt ? fonts.bold : fonts.body }}>
            {ticket.scannedAt ? 'Already scanned at the door' : 'Show this at the door · one scan only'}
          </Txt>
        </View>
        <View style={styles.perforation} />
        <View style={styles.details}>
          <Detail label="Date" value={when(event.startsAt)} />
          <Detail label="Venue" value={[event.venueName, event.area].filter(Boolean).join(', ')} />
          <Detail label="Name" value={ticket.holderName} />
          <Detail label="Ticket" value={ticket.code} />
        </View>
      </View>
      <Row>
        <Button title="Directions" kind="secondary" style={{ flex: 1 }} onPress={directions} />
        <Button title="Event page" kind="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })} />
      </Row>
      {group.length > 1 ? (
        <Button
          title={`Next ticket (${(position % group.length) + 1} of ${group.length})`}
          kind="secondary"
          onPress={() => router.replace({ pathname: '/ticket/[id]', params: { id: group[position % group.length]!.id } })}
        />
      ) : null}
      {ticket.scannedAt ? (
        <Button title="Rate the vibe" kind="outline" onPress={() => router.push({ pathname: '/rate/[id]', params: { id: event.id } })} />
      ) : (
        <Txt variant="small" color={colors.muted} style={{ textAlign: 'center' }}>
          {ended ? 'This ticket wasn’t scanned at the door, so it can’t be rated.' : 'You can rate the vibe once you’ve been scanned in.'}
        </Txt>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%', paddingVertical: 6, paddingRight: 8 }}>
      <Txt variant="small" color="#4A4F4F">
        {label}
      </Txt>
      <Txt variant="small" bold color="#0E0F0F" numberOfLines={1} selectable>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { backgroundColor: colors.text, borderRadius: 24, overflow: 'hidden' },
  ticketTop: { backgroundColor: colors.accent, paddingHorizontal: space.xl, paddingVertical: 18, gap: 4 },
  perforation: { marginHorizontal: space.xl, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#CFD3D3' },
  details: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.xl, paddingVertical: space.lg },
});
