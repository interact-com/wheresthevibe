import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, fonts, radius, space } from '@/theme';
import { Icon, type IconName } from './Icon';

// ---------- Text ----------

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'caption' | 'label';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 33 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27 },
  heading: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
};

type TxtProps = TextProps & { variant?: Variant; color?: string; bold?: boolean };

export function Txt({ variant = 'body', color = colors.text, bold, style, ...rest }: TxtProps) {
  return <Text {...rest} style={[variants[variant], { color }, bold && { fontFamily: fonts.bold }, style]} />;
}

// ---------- Layout ----------

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Sticky content pinned to the bottom (e.g. the main action). */
  footer?: ReactNode;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, footer, edges = ['top'], contentStyle }: ScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          {footer}
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <IconButton name="back" label="Back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <View style={{ flex: 1 }}>
        <Txt variant="title" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" color={colors.muted} numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  return <View style={[styles.card, highlight && styles.cardHighlight, style]}>{children}</View>;
}

export function Row({ children, gap = space.sm, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

// ---------- Controls ----------

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  kind?: 'primary' | 'secondary' | 'outline' | 'light';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, kind = 'primary', icon, style, disabled, ...rest }: ButtonProps) {
  const fg = kind === 'primary' || kind === 'light' ? colors.accentInk : kind === 'outline' ? colors.accent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && { backgroundColor: colors.accent },
        kind === 'light' && { backgroundColor: colors.text },
        kind === 'secondary' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        kind === 'outline' && { borderWidth: 1, borderColor: colors.accent },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ name, label, onPress, color = colors.text }: { name: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
    >
      <Icon name={name} size={20} color={color} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      onPress={onPress}
      style={[styles.chip, selected ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
    >
      <Text style={{ fontFamily: selected ? fonts.bold : fonts.body, fontSize: 13, color: selected ? colors.accentInk : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'live' | 'neutral' }) {
  const bg = tone === 'accent' ? colors.accent : tone === 'live' ? colors.live : colors.surface;
  const fg = tone === 'accent' ? colors.accentInk : colors.text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }, tone === 'neutral' && { borderWidth: 1, borderColor: colors.border }]}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: fg }}>{label}</Text>
    </View>
  );
}

export function Avatar({ text, size = 40 }: { text: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#3A3F3F', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.33, color: colors.text }}>{text || '?'}</Text>
    </View>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.6, color: colors.accentInk, lineHeight: size * 0.75 }}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl * 2 },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.md, backgroundColor: colors.tabBar, borderTopWidth: 1, borderTopColor: colors.divider, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  cardHighlight: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentTint },
  button: { minHeight: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.lg },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
