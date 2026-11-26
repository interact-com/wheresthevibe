import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button, Chip, ErrorText, Row, Screen, Txt } from '@/components/ui';
import { TICKET_COMMISSION } from '@/data/sample';
import type { Category } from '@/data/types';
import { when } from '@/lib/format';
import { useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme';

const CATEGORIES: Category[] = ['Party', 'House party', 'Home cell', 'Gaming', 'Umsebenzi', 'Food & markets', 'Comedy', 'Sport'];
const DAYS = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'In 2 days', offset: 2 },
  { label: 'In 3 days', offset: 3 },
];
const COVERS = ['#2A4544', '#2A2D3F', '#3A2E44', '#44342A', '#2E3A2A'];

function parseTime(value: string) {
  const m = /^(\d{1,2}):?(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? { h, min } : null;
}

function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Txt variant="small" color={colors.muted}>
        {label}
      </Txt>
      <TextInput placeholderTextColor={colors.muted} accessibilityLabel={label} {...input} style={styles.input} />
    </View>
  );
}

export default function Host() {
  const { myEvents: mine, createEvent, location } = useStore();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [day, setDay] = useState(0);
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('23:00');
  const [venue, setVenue] = useState('');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState<Category>('Party');
  const [price, setPrice] = useState('0');
  const [capacity, setCapacity] = useState('100');
  const [description, setDescription] = useState('');

  const s = parseTime(start);
  const e = parseTime(end);
  const priceNum = Number(price || 0);
  const capNum = Number(capacity || 0);
  const valid = title.trim().length > 2 && venue.trim() && s && e && priceNum >= 0 && capNum > 0;

  const publish = async () => {
    if (!valid || !s || !e) return;
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + DAYS[day]!.offset);
    startsAt.setHours(s.h, s.min, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setHours(e.h, e.min, 0, 0);
    if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1); // runs past midnight
    if (endsAt.getTime() < Date.now()) {
      setError('That time has already passed today. Pick a later time or another day.');
      return;
    }
    setSaving(true);
    setError(null);
    let created;
    try {
      created = await createEvent({
      title: title.trim(),
      category,
      tags: [category],
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      venueName: venue.trim(),
      area: area.trim(),
      // Real version: a map pin picker. For now the event is placed where you are.
      latitude: location.latitude,
      longitude: location.longitude,
      description: description.trim() || 'More details coming soon.',
      tiers: [{ id: 'general', name: priceNum === 0 ? 'Free RSVP' : 'General', price: priceNum, capacity: capNum }],
      coverColor: COVERS[mine.length % COVERS.length]!,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish the event');
      setSaving(false);
      return;
    }
    setSaving(false);
    setCreating(false);
    setTitle('');
    setVenue('');
    setArea('');
    setDescription('');
    router.push({ pathname: '/host/[id]', params: { id: created.id } });
  };

  if (!creating) {
    return (
      <Screen footer={<Button title="Host a new event" icon="plus" onPress={() => setCreating(true)} />}>
        <Txt variant="title" style={{ fontSize: 24 }}>
          Your events
        </Txt>
        {mine.map((ev) => {
          return (
            <Pressable
              key={ev.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/host/[id]', params: { id: ev.id } })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.thumb, { backgroundColor: ev.coverColor }]} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt variant="label" style={{ fontSize: 15 }} numberOfLines={1}>
                  {ev.title}
                </Txt>
                <Txt variant="small" color={colors.muted}>
                  {when(ev.startsAt)} · {ev.status === 'cancelled' ? 'Cancelled' : ev.category}
                </Txt>
              </View>
              <Txt variant="small" bold color={colors.accent}>
                Manage
              </Txt>
            </Pressable>
          );
        })}
        {mine.length === 0 ? <Txt color={colors.muted}>You haven’t hosted anything yet.</Txt> : null}
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Txt variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
            We take {Math.round(TICKET_COMMISSION * 100)}% of ticket sales. Free events cost nothing.
          </Txt>
          <ErrorText message={error} />
          <Button title={saving ? 'Publishing…' : 'Publish event'} disabled={!valid || saving} onPress={publish} />
        </>
      }
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="title" style={{ fontSize: 24 }}>
          Host an event
        </Txt>
        <Pressable accessibilityRole="button" onPress={() => setCreating(false)} hitSlop={8}>
          <Txt variant="small" color={colors.accent}>
            Cancel
          </Txt>
        </Pressable>
      </Row>
      <Pressable accessibilityRole="button" accessibilityLabel="Add a cover photo (coming soon)" style={styles.cover}>
        <Icon name="image" size={26} color={colors.muted} />
        <Txt variant="small" color={colors.muted}>
          Add a cover photo (coming soon)
        </Txt>
      </Pressable>
      <Field label="Event name" value={title} onChangeText={setTitle} placeholder="e.g. Rooftop Sundowner" />
      <View style={{ gap: 6 }}>
        <Txt variant="small" color={colors.muted}>
          Date
        </Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {DAYS.map((d, i) => (
            <Chip key={d.label} label={d.label} selected={day === i} onPress={() => setDay(i)} />
          ))}
        </Row>
      </View>
      <Row gap={space.md}>
        <Field label="Starts (HH:MM)" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" />
        <Field label="Ends (HH:MM)" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" />
      </Row>
      <Field label="Venue or address" value={venue} onChangeText={setVenue} placeholder="Where is it?" />
      <Field label="Area or suburb" value={area} onChangeText={setArea} placeholder="e.g. Braamfontein" />
      <Txt variant="caption" color={colors.muted}>
        For now the map pin goes where you are right now. A pin picker is coming.
      </Txt>
      <View style={{ gap: 6 }}>
        <Txt variant="small" color={colors.muted}>
          Type of vibe
        </Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </Row>
      </View>
      <Row gap={space.md}>
        <Field label="Ticket price (R, 0 = free)" value={price} onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
        <Field label="Tickets available" value={capacity} onChangeText={(v) => setCapacity(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
      </Row>
      <Field label="Description" value={description} onChangeText={setDescription} placeholder="What should people expect?" multiline />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  cover: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#3A3F3F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
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
