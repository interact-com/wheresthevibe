import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, CenterMessage, Chip, ErrorText, IconButton, LogoMark, Row, Screen, Txt } from '@/components/ui';
import { RATING_TAGS } from '@/data/sample';
import type { RatingTag } from '@/data/types';
import { dayLabel } from '@/lib/format';
import { useStore } from '@/lib/store';
import { useEvent } from '@/lib/useEvent';
import { colors, fonts, radius, space } from '@/theme';

export default function RateVibe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rateEvent } = useStore();
  const { event, loading } = useEvent(id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<RatingTag[]>([]);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  if (loading) return <CenterMessage title="Loading…" />;
  if (!event) return <CenterMessage title="Event not found" action={<Button title="Back to Discover" onPress={() => router.replace('/')} />} />;

  const toggle = (t: RatingTag) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (sent) {
    return (
      <Screen footer={<Button title="Done" onPress={close} />}>
        <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xxl * 2 }}>
          <LogoMark size={72} />
          <Txt variant="display" style={{ textAlign: 'center' }}>
            Thanks for rating!
          </Txt>
          <Txt color={colors.muted} style={{ textAlign: 'center' }}>
            Your rating helps {event.hostName} host an even better vibe next time.
          </Txt>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
        <ErrorText message={error} />
        <Button
          title={saving ? 'Saving…' : 'Submit rating'}
          disabled={stars === 0 || saving}
          onPress={async () => {
            setSaving(true);
            setError(null);
            try {
              await rateEvent({ eventId: event.id, stars, tags, comment: comment.trim() });
              setSent(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save your rating');
            } finally {
              setSaving(false);
            }
          }}
        />
        </>
      }
    >
      <Row style={{ justifyContent: 'flex-end' }}>
        <IconButton name="close" label="Close" onPress={close} />
      </Row>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <LogoMark size={72} />
        <Txt variant="display" style={{ textAlign: 'center', marginTop: space.sm }}>
          How was the vibe?
        </Txt>
        <Txt variant="small" color={colors.muted} style={{ textAlign: 'center' }}>
          {event.title} · {dayLabel(event.startsAt).toLowerCase()}
        </Txt>
      </View>
      <Row style={{ justifyContent: 'center' }} gap={space.sm}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} out of 5`}
            aria-pressed={n === stars}
            onPress={() => setStars(n)}
            style={styles.star}
          >
            <Icon name="star" size={28} strokeWidth={1.8} color={n <= stars ? colors.accent : '#6B7070'} fill={n <= stars ? colors.accent : 'none'} />
          </Pressable>
        ))}
      </Row>
      <View style={{ gap: space.md }}>
        <Txt variant="label">What stood out?</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {RATING_TAGS.map((t) => (
            <Chip key={t} label={t} selected={tags.includes(t)} onPress={() => toggle(t)} />
          ))}
        </Row>
      </View>
      <View style={{ gap: space.sm }}>
        <Txt variant="label">Anything the host should know?</Txt>
        <TextInput
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          placeholder="Compliments, complaints, suggestions…"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Comment for the host"
          style={styles.input}
        />
        <Txt variant="caption" color={colors.muted}>
          Only the host sees your comment. Your stars add to their public vibe score.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  star: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
