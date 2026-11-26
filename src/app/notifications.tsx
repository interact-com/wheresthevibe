import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Header, Screen, Txt } from '@/components/ui';
import type { AppNotification } from '@/data/types';
import { ago } from '@/lib/format';
import { useStore } from '@/lib/store';
import { colors, radius, space } from '@/theme';

const ICONS: Record<AppNotification['kind'], IconName> = { boost: 'bolt', rate: 'star', ticket: 'ticket', host: 'user' };

export default function Notifications() {
  const { notifications } = useStore();

  const open = (n: AppNotification) => {
    if (!n.eventId) return;
    if (n.kind === 'rate') router.push({ pathname: '/rate/[id]', params: { id: n.eventId } });
    else router.push({ pathname: '/event/[id]', params: { id: n.eventId } });
  };

  return (
    <Screen>
      <Header title="Notifications" />
      {notifications.length === 0 ? (
        <Txt color={colors.muted} style={{ textAlign: 'center', paddingVertical: space.xl }}>
          Nothing yet. Boost alerts and “rate the vibe” reminders will show up here.
        </Txt>
      ) : null}
      {notifications.map((n) => {
        const highlight = n.kind === 'boost';
        return (
          <Pressable
            key={n.id}
            accessibilityRole="button"
            onPress={() => open(n)}
            style={({ pressed }) => [styles.row, highlight && styles.highlight, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.icon, highlight && { backgroundColor: colors.accent }]}>
              <Icon name={ICONS[n.kind]} size={20} color={highlight ? colors.accentInk : colors.text} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="label">{n.title}</Txt>
              <Txt variant="small" color={colors.textSoft}>
                {n.body}
              </Txt>
              <Txt variant="caption" color={colors.muted}>
                {ago(n.at)}
              </Txt>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  highlight: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
