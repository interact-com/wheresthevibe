import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, LogoMark, Row, Screen, Txt } from '@/components/ui';
import { colors, fonts, radius, space } from '@/theme';
import { useStore } from '@/lib/store';

const INTERESTS = ['Amapiano', 'Hip hop', 'Gaming', 'Home cell', 'Food & markets', 'House parties', 'Comedy', 'Sport'];

export default function Onboarding() {
  const { signIn } = useStore();
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const digits = phone.replace(/\D/g, '');
  const phoneOk = digits.length >= 9;
  const canFinish = codeSent && code.length === 6 && picked.length > 0;

  const toggle = (i: string) => setPicked((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  return (
    <Screen
      footer={
        codeSent ? (
          <>
            <Txt variant="caption" color={colors.muted}>
              By continuing you agree to the Terms and Privacy Policy (POPIA). We use your location only to show events near you.
            </Txt>
            <Button title="Let’s go" disabled={!canFinish} onPress={() => signIn(picked)} />
          </>
        ) : (
          <Button title="Send code" disabled={!phoneOk} onPress={() => setCodeSent(true)} />
        )
      }
    >
      <View style={{ height: space.xl }} />
      <LogoMark size={64} />
      <View style={{ gap: space.sm }}>
        <Txt variant="display">Find the vibe near you</Txt>
        <Txt color={colors.muted}>Sign in with your phone. Hosts never see your number.</Txt>
      </View>

      <View style={{ gap: 6 }}>
        <Txt variant="small" color={colors.muted}>
          Cellphone number
        </Txt>
        <Row>
          <View style={[styles.input, { justifyContent: 'center' }]}>
            <Txt>+27</Txt>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            editable={!codeSent}
            keyboardType="phone-pad"
            placeholder="82 000 0000"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Cellphone number"
            style={[styles.input, { flex: 1 }]}
          />
        </Row>
      </View>

      {codeSent ? (
        <>
          <View style={{ gap: 6 }}>
            <Txt variant="small" color={colors.muted}>
              6-digit code we sent you (prototype: any 6 digits)
            </Txt>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
              accessibilityLabel="Verification code"
              style={[styles.input, { borderWidth: 2, borderColor: colors.accent, fontSize: 20, letterSpacing: 6 }]}
            />
          </View>
          <View style={{ gap: 10 }}>
            <Txt variant="label">
              What’s your vibe?{' '}
              <Txt variant="small" color={colors.muted}>
                Pick a few
              </Txt>
            </Txt>
            <Row style={{ flexWrap: 'wrap' }}>
              {INTERESTS.map((i) => (
                <Chip key={i} label={i} selected={picked.includes(i)} onPress={() => toggle(i)} />
              ))}
            </Row>
          </View>
        </>
      ) : null}
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
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
