import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { Avatar, Badge, Button, Card, CenterMessage, IconButton, Row, Screen, Txt } from '@/components/ui';
import { initials, km, rand, timeRange } from '@/lib/format';
import { useStore } from '@/lib/store';
import { useEvent } from '@/lib/useEvent';
import { colors, radius, space } from '@/theme';

function InfoRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Row gap={10}>
      <Icon name={icon} size={18} color={colors.muted} />
      <Txt variant="small" style={{ flex: 1, fontSize: 14 }}>
        {text}
      </Txt>
    </Row>
  );
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { distanceTo, isBoosted } = useStore();
  const { event, loading } = useEvent(id);
  const [tierId, setTierId] = useState<string | undefined>();
  if (loading) return <CenterMessage title="Loading…" />;
  if (!event) return <CenterMessage title="Event not found" body="It may have been cancelled." action={<Button title="Back to Discover" onPress={() => router.replace('/')} />} />;
  const tier = event.tiers.find((t) => t.id === tierId) ?? event.tiers[0];
  if (!tier) return <CenterMessage title="No tickets yet" body="The host hasn’t added tickets to this event." action={<Button title="Back" onPress={() => router.back()} />} />;
  const ended = new Date(event.endsAt).getTime() < Date.now();

  return (
    <Screen
      edges={[]}
      contentStyle={{ padding: 0, gap: 0 }}
      footer={
        <Row gap={space.lg}>
          <View>
            <Txt variant="caption" color={colors.muted}>
              1 × {tier.name}
            </Txt>
            <Txt variant="heading">{rand(tier.price)}</Txt>
          </View>
          <Button
            title={ended ? 'Event has ended' : tier.price === 0 ? 'RSVP' : 'Get ticket'}
            disabled={ended}
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/checkout/[id]', params: { id: event.id, tier: tier.id } })}
          />
        </Row>
      }
    >
      <View style={[styles.cover, { backgroundColor: event.coverColor }]}>
        <SafeAreaView edges={['top']} style={styles.coverBar}>
          <IconButton name="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <IconButton
            name="share"
            label="Share event"
            onPress={() => {
              // Sharing can be refused (e.g. in some browsers); nothing to do if so.
              Share.share({ message: `${event.title} — ${timeRange(event.startsAt, event.endsAt)}. Find it on Where’z The Vibe.` }).catch(() => {});
            }}
          />
        </SafeAreaView>
        <Txt variant="small" color={colors.muted}>
          Event photo
        </Txt>
      </View>

      <View style={{ padding: space.xl, gap: space.lg }}>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {isBoosted(event) ? <Badge label="Boosted" /> : null}
          {event.tags.map((t) => (
            <Badge key={t} label={t} tone="neutral" />
          ))}
        </Row>
        <Txt variant="display" style={{ fontSize: 26 }}>
          {event.title}
        </Txt>
        <View style={{ gap: 10 }}>
          <InfoRow icon="calendar" text={timeRange(event.startsAt, event.endsAt)} />
          <InfoRow icon="pin" text={`${[event.venueName, event.area].filter(Boolean).join(", ")} · ${km(distanceTo(event))}`} />
          {event.hostRating ? <InfoRow icon="star" text={`Host’s past events: ${event.hostRating.toFixed(1)} vibe rating`} /> : null}
        </View>

        <Card>
          <Row gap={space.md}>
            <Avatar text={initials(event.hostName)} />
            <View style={{ flex: 1 }}>
              <Txt variant="label">Hosted by {event.hostName}</Txt>
              <Txt variant="caption" color={colors.muted}>
                Contact stays in-app
              </Txt>
            </View>
          </Row>
        </Card>

        <Txt color={colors.textSoft} style={{ fontSize: 14 }}>
          {event.description}
        </Txt>

        <View style={{ gap: space.sm }} role="radiogroup">
          {event.tiers.map((t) => {
            const selected = t.id === tier.id;
            return (
              <Pressable
                key={t.id}
                role="radio"
                aria-checked={selected}
                onPress={() => setTierId(t.id)}
                style={[styles.tier, selected && { borderWidth: 2, borderColor: colors.accent }]}
              >
                <Row gap={10}>
                  <View style={[styles.radio, selected && { borderColor: colors.accent }]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Txt style={{ fontSize: 14 }}>{t.name}</Txt>
                </Row>
                <Txt variant="label">{rand(t.price)}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 260, alignItems: 'center', justifyContent: 'center' },
  coverBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: space.lg },
  tier: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
});
