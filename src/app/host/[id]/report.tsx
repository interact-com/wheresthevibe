import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, Header, Row, Screen, Txt } from '@/components/ui';
import { RATING_TAGS } from '@/data/sample';
import { useStore } from '@/lib/store';
import { colors, radius, space } from '@/theme';

export default function VibeReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEvent, ratings } = useStore();
  const event = getEvent(id);
  if (!event) return <Redirect href="/host" />;

  const mine = ratings.filter((r) => r.eventId === event.id);
  const avg = mine.length ? mine.reduce((s, r) => s + r.stars, 0) / mine.length : 0;
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: mine.filter((r) => r.stars === star).length }));
  const max = Math.max(1, ...counts.map((c) => c.count));
  // A tag on a 4–5 star rating reads as praise; on 1–3 stars, as a complaint.
  const tagStats = RATING_TAGS.map((tag) => ({
    tag,
    praise: mine.filter((r) => r.stars >= 4 && r.tags.includes(tag)).length,
    complaints: mine.filter((r) => r.stars <= 3 && r.tags.includes(tag)).length,
  }));
  const comments = mine.filter((r) => r.comment).slice(0, 5);

  return (
    <Screen>
      <Header title="Vibe report" subtitle={`${event.title} · ${mine.length} ratings`} />
      <Card>
        <Row gap={18}>
          <View style={{ alignItems: 'center', minWidth: 84 }}>
            <Txt variant="display" color={colors.accent} style={{ fontSize: 44, lineHeight: 48 }}>
              {avg.toFixed(1)}
            </Txt>
            <Txt variant="caption" color={colors.muted}>
              out of 5
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            {counts.map(({ star, count }) => (
              <Row key={star} gap={8} style={{ alignItems: 'center' }}>
                <Txt variant="caption" color={colors.muted} style={{ width: 10 }}>
                  {star}
                </Txt>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${(count / max) * 100}%` }]} />
                </View>
                <Txt variant="caption" color={colors.muted} style={{ width: 24, textAlign: 'right' }}>
                  {count}
                </Txt>
              </Row>
            ))}
          </View>
        </Row>
      </Card>

      <View style={{ gap: space.sm }}>
        <Txt variant="label">What people mentioned</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {tagStats
            .flatMap(({ tag, praise, complaints }) => [
              praise ? { key: `${tag}-p`, label: `${tag} · ${praise}`, good: true } : null,
              complaints ? { key: `${tag}-c`, label: `${tag} · ${complaints}`, good: false } : null,
            ])
            .filter((x): x is { key: string; label: string; good: boolean } => !!x)
            .map((t) => (
              <View key={t.key} style={[styles.tag, t.good ? styles.tagGood : styles.tagBad]}>
                <Txt variant="small">{t.label}</Txt>
              </View>
            ))}
        </Row>
        <Txt variant="caption" color={colors.muted}>
          <Txt variant="caption" color={colors.accent}>
            Teal
          </Txt>{' '}
          = praise ·{' '}
          <Txt variant="caption" color={colors.warn}>
            orange
          </Txt>{' '}
          = complaints
        </Txt>
      </View>

      <View style={{ gap: space.sm }}>
        <Txt variant="label">Latest comments</Txt>
        {comments.map((c, i) => (
          <View key={i} style={styles.comment}>
            <Txt variant="small" color={colors.accent} accessibilityLabel={`${c.stars} stars`}>
              {'★'.repeat(c.stars)}
              {'☆'.repeat(5 - c.stars)}
            </Txt>
            <Txt style={{ fontSize: 14 }}>“{c.comment}”</Txt>
          </View>
        ))}
        {comments.length === 0 ? (
          <Txt variant="small" color={colors.muted}>
            No written comments yet.
          </Txt>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  tag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tagGood: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  tagBad: { backgroundColor: colors.warnTint, borderColor: colors.warn },
  comment: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
});
