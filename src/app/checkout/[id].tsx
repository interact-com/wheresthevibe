import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, CenterMessage, ErrorText, Header, Row, Screen, Txt } from '@/components/ui';
import { rand, when } from '@/lib/format';
import { useStore } from '@/lib/store';
import { useEvent } from '@/lib/useEvent';
import { colors, fonts, radius, space } from '@/theme';

const METHODS = ['Card', 'Instant EFT', 'Phone wallet'] as const;
const MAX_PER_ORDER = 6;

export default function Checkout() {
  const { id, tier: tierParam } = useLocalSearchParams<{ id: string; tier?: string }>();
  const { buyTickets } = useStore();
  const { event, loading } = useEvent(id);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<(typeof METHODS)[number]>('Card');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (loading) return <CenterMessage title="Loading…" />;
  const tier = event?.tiers.find((t) => t.id === tierParam) ?? event?.tiers[0];
  if (!event || !tier) return <CenterMessage title="Event not found" action={<Button title="Back to Discover" onPress={() => router.replace('/')} />} />;
  const free = tier.price === 0;
  const total = tier.price * qty;

  const pay = async () => {
    setPaying(true);
    setError(null);
    // Phase 2: take payment with the provider first; the server issues tickets once it confirms.
    try {
      const [first] = await buyTickets(event.id, tier.id, qty);
      router.replace({ pathname: '/ticket/[id]', params: { id: first!.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get tickets');
      setPaying(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Txt variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
            Tickets land in your app as QR codes. No printing.
          </Txt>
          <ErrorText message={error} />
          <Button title={paying ? 'Processing…' : free ? 'Confirm RSVP' : `Pay ${rand(total)}`} disabled={paying} onPress={pay} />
        </>
      }
    >
      <Header title="Checkout" />
      <Card>
        <Row gap={space.md}>
          <View style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: event.coverColor }} />
          <View style={{ flex: 1 }}>
            <Txt variant="label" style={{ fontSize: 15 }} numberOfLines={1}>
              {event.title}
            </Txt>
            <Txt variant="small" color={colors.muted}>
              {when(event.startsAt)} · {event.area}
            </Txt>
          </View>
        </Row>
      </Card>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt>
          {tier.name} · {rand(tier.price)}
        </Txt>
        <Row gap={space.md}>
          <Pressable accessibilityRole="button" accessibilityLabel="One less" disabled={qty <= 1} onPress={() => setQty((q) => q - 1)} style={[styles.step, qty <= 1 && { opacity: 0.4 }]}>
            <Txt style={{ fontSize: 20 }}>−</Txt>
          </Pressable>
          <Txt variant="label" style={{ minWidth: 16, textAlign: 'center' }} accessibilityLabel={`${qty} tickets`}>
            {qty}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One more"
            disabled={qty >= MAX_PER_ORDER}
            onPress={() => setQty((q) => q + 1)}
            style={[styles.step, qty >= MAX_PER_ORDER && { opacity: 0.4 }]}
          >
            <Txt style={{ fontSize: 20 }}>+</Txt>
          </Pressable>
        </Row>
      </Row>

      {!free ? (
        <View style={{ gap: space.sm }} role="radiogroup">
          <Txt variant="label">Pay with</Txt>
          {METHODS.map((m) => (
            <Pressable
              key={m}
              role="radio"
              aria-checked={m === method}
              onPress={() => setMethod(m)}
              style={[styles.method, m === method && { borderWidth: 2, borderColor: colors.accent }]}
            >
              <Txt style={{ fontSize: 14, fontFamily: m === method ? fonts.bold : fonts.body }}>{m}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.totals}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="small" color={colors.muted}>
            {qty} × {tier.name}
          </Txt>
          <Txt variant="small">{rand(total)}</Txt>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Total</Txt>
          <Txt variant="heading">{rand(total)}</Txt>
        </Row>
        <Txt variant="caption" color={colors.muted}>
          Test version: no payment is taken yet.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  method: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, minHeight: 48, justifyContent: 'center' },
  totals: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: space.md, gap: space.sm },
});
