import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Header, Row, Screen, Txt } from '@/components/ui';
import { rand, when } from '@/lib/format';
import { useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme';

const METHODS = ['Card', 'Instant EFT', 'Phone wallet'] as const;
const MAX_PER_ORDER = 6;

export default function Checkout() {
  const { id, tier: tierParam } = useLocalSearchParams<{ id: string; tier?: string }>();
  const { getEvent, buyTickets } = useStore();
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<(typeof METHODS)[number]>('Card');
  const [paying, setPaying] = useState(false);
  const event = getEvent(id);
  if (!event) return <Redirect href="/" />;
  const tier = event.tiers.find((t) => t.id === tierParam) ?? event.tiers[0]!;
  const free = tier.price === 0;
  const total = tier.price * qty;

  const pay = () => {
    setPaying(true);
    // Real version: create a payment with the provider (Paystack / Yoco / PayFast),
    // and the server issues tickets from its webhook once payment succeeds.
    setTimeout(() => {
      const [first] = buyTickets(event.id, tier.id, qty);
      router.replace({ pathname: '/ticket/[id]', params: { id: first!.id } });
    }, 700);
  };

  return (
    <Screen
      footer={
        <>
          <Txt variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
            Tickets land in your app as QR codes. No printing.
          </Txt>
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
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          <Txt variant="label">Pay with</Txt>
          {METHODS.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: m === method }}
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
          Prototype: no real payment is taken.
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
