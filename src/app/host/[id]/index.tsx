import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Card, CenterMessage, ErrorText, Header, Row, Screen, Txt } from '@/components/ui';
import type { Ticket } from '@/data/types';
import { BOOST_OPTIONS, TICKET_COMMISSION } from '@/data/sample';
import { dayLabel, rand, time } from '@/lib/format';
import { useStore } from '@/lib/store';
import { useEvent } from '@/lib/useEvent';
import { colors, radius, space } from '@/theme';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="caption" color={colors.muted}>
        {label}
      </Txt>
      <Txt variant="heading" style={{ fontSize: 19 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}

export default function HostDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isBoosted, boostEvent, ticketsFor, ratingsFor } = useStore();
  const { event, loading } = useEvent(id);
  const [picked, setPicked] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sold, setSold] = useState<Ticket[]>([]);
  const [hasRatings, setHasRatings] = useState(false);

  // Reload the guest list whenever this screen comes back into view (e.g. after scanning).
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      Promise.all([ticketsFor(id), ratingsFor(id)])
        .then(([t, r]) => {
          if (cancelled) return;
          setSold(t);
          setHasRatings(r.length > 0);
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the guest list'));
      return () => {
        cancelled = true;
      };
    }, [id, ticketsFor, ratingsFor]),
  );

  if (loading) return <CenterMessage title="Loading…" />;
  if (!event) return <CenterMessage title="Event not found" action={<Button title="Your events" onPress={() => router.replace('/host')} />} />;

  const capacity = event.tiers.reduce((n, t) => n + t.capacity, 0);
  const gross = sold.reduce((sum, t) => sum + (event.tiers.find((x) => x.id === t.tierId)?.price ?? 0), 0);
  const payout = gross * (1 - TICKET_COMMISSION);
  const boosted = isBoosted(event);
  const option = BOOST_OPTIONS[picked]!;


  return (
    <Screen footer={<Button title="Scan tickets at the door" icon="scan" kind="light" onPress={() => router.push({ pathname: '/host/[id]/scanner', params: { id: event.id } })} />}>
      <Header title={event.title} subtitle={`Your event · ${dayLabel(event.startsAt)} ${time(event.startsAt)}`} />
      <Row gap={space.sm}>
        <Stat label="Sold" value={`${sold.length} / ${capacity}`} />
        <Stat label="Sales" value={rand(gross) === 'Free' ? 'R0' : rand(gross)} />
        <Stat label="Your payout" value={rand(payout) === 'Free' ? 'R0' : rand(payout)} />
      </Row>

      <Card highlight>
        <Row gap={10}>
          <Icon name="bolt" color={colors.accent} />
          <Txt variant="heading">Vibe Boost</Txt>
        </Row>
        {boosted ? (
          <Txt variant="small" color={colors.textSoft}>
            Boosted until {time(event.boostedUntil!)}. Your pin is bigger, you’re top of the list, and people nearby were notified.
          </Txt>
        ) : (
          <>
            <Txt variant="small" color={colors.textSoft}>
              Bigger pin, top of the list, and a push to people nearby.
            </Txt>
            <Row gap={space.sm}>
              {BOOST_OPTIONS.map((o, i) => {
                const on = i === picked;
                return (
                  <Pressable
                    key={o.hours}
                    role="radio"
                    aria-checked={on}
                    onPress={() => {
                      setPicked(i);
                      setConfirming(false);
                    }}
                    style={[styles.option, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  >
                    <Txt variant="small" color={on ? colors.accentInk : colors.text}>
                      {o.hours} hours
                    </Txt>
                    <Txt variant="heading" color={on ? colors.accentInk : colors.text}>
                      {rand(o.price)}
                    </Txt>
                  </Pressable>
                );
              })}
            </Row>
            {confirming ? (
              <View style={{ gap: space.sm }}>
                <Txt variant="small" color={colors.textSoft}>
                  Boost for {option.hours} hours at {rand(option.price)}? Prototype: no payment is taken.
                </Txt>
                <Row>
                  <Button title="Cancel" kind="secondary" style={{ flex: 1, minHeight: 48 }} onPress={() => setConfirming(false)} />
                  <Button
                    title={boosting ? 'Boosting…' : 'Confirm boost'}
                    disabled={boosting}
                    style={{ flex: 1, minHeight: 48 }}
                    onPress={async () => {
                      setBoosting(true);
                      setError(null);
                      try {
                        await boostEvent(event.id, option);
                        setConfirming(false);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Could not boost the event');
                      } finally {
                        setBoosting(false);
                      }
                    }}
                  />
                </Row>
                <ErrorText message={error} />
              </View>
            ) : (
              <Button title={`Boost for ${option.hours} hours · ${rand(option.price)}`} onPress={() => setConfirming(true)} style={{ minHeight: 48 }} />
            )}
          </>
        )}
      </Card>

      <View style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Guest list</Txt>
          <Txt variant="small" color={colors.muted}>
            {sold.filter((t) => t.scannedAt).length} checked in
          </Txt>
        </Row>
        {sold.slice(0, 20).map((t) => (
          <View key={t.id} style={styles.guest}>
            <Txt variant="small" style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>
              {t.holderName} · {event.tiers.find((x) => x.id === t.tierId)?.name}
            </Txt>
            <Txt variant="caption" color={t.scannedAt ? colors.good : colors.muted}>
              {t.scannedAt ? `In at ${time(t.scannedAt)}` : 'Not scanned'}
            </Txt>
          </View>
        ))}
        {sold.length === 0 ? (
          <Txt variant="small" color={colors.muted}>
            No tickets yet. Buy one from the Discover tab to see the guest list fill up.
          </Txt>
        ) : null}
      </View>

      {hasRatings ? (
        <Button title="See the vibe report" kind="outline" icon="star" onPress={() => router.push({ pathname: '/host/[id]/report', params: { id: event.id } })} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, gap: 4 },
  option: { flex: 1, minHeight: 64, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 2 },
  guest: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 14 },
});
