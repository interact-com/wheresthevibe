import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, ErrorText, LogoMark, Row, Screen, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';
import { colors, fonts, radius, space } from '@/theme';

const INTERESTS = ['Amapiano', 'Hip hop', 'Gaming', 'Home cell', 'Food & markets', 'House parties', 'Comedy', 'Sport'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Step = 'email' | 'code' | 'profile';

export default function Onboarding() {
  const store = useStore();
  const [step, setStep] = useState<Step>(store.needsProfile ? 'profile' : 'email');
  const [email, setEmail] = useState(store.email ?? '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>(store.interests);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signed in (code or magic link) but no profile yet → go to the profile step.
  useEffect(() => {
    if (store.needsProfile) {
      setStep('profile');
      setName((n) => n || store.userName);
    }
  }, [store.needsProfile, store.userName]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (i: string) => setPicked((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  const footer =
    step === 'email' ? (
      <>
        <ErrorText message={error} />
        <Button
          title={busy ? 'Sending…' : 'Email me a code'}
          disabled={!EMAIL.test(email.trim()) || busy}
          onPress={() =>
            run(async () => {
              await store.sendCode(email);
              setStep('code');
            })
          }
        />
      </>
    ) : step === 'code' ? (
      <>
        <ErrorText message={error} />
        <Button
          title={busy ? 'Checking…' : 'Continue'}
          disabled={code.length < 6 || busy}
          onPress={() => run(() => store.verifyCode(email, code))}
        />
      </>
    ) : (
      <>
        <Txt variant="caption" color={colors.muted}>
          By continuing you agree to the Terms and Privacy Policy (POPIA). We use your location only to show events near you.
        </Txt>
        <ErrorText message={error} />
        <Button
          title={busy ? 'Saving…' : 'Let’s go'}
          disabled={!name.trim() || picked.length === 0 || busy}
          onPress={() => run(() => store.saveProfile(name, picked))}
        />
      </>
    );

  return (
    <Screen footer={footer}>
      <View style={{ height: space.xl }} />
      <LogoMark size={64} />

      {step === 'profile' ? (
        <>
          <View style={{ gap: space.sm }}>
            <Txt variant="display">Nearly there</Txt>
            <Txt color={colors.muted}>Hosts see this name on their guest list.</Txt>
          </View>
          <View style={{ gap: 6 }}>
            <Txt variant="small" color={colors.muted}>
              Your name
            </Txt>
            <TextInput
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={60}
              placeholder="First name and surname"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Your name"
              style={styles.input}
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
      ) : (
        <>
          <View style={{ gap: space.sm }}>
            <Txt variant="display">Find the vibe near you</Txt>
            <Txt color={colors.muted}>Sign in with your email. Hosts never see your email address.</Txt>
          </View>
          <View style={{ gap: 6 }}>
            <Txt variant="small" color={colors.muted}>
              Email
            </Txt>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={step === 'email'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Email"
              style={[styles.input, step !== 'email' && { opacity: 0.6 }]}
            />
          </View>
          {step === 'code' ? (
            <View style={{ gap: 6 }}>
              <Txt variant="small" color={colors.muted}>
                {store.mode === 'demo' ? 'Code from the email (demo: any 6 digits)' : `Code we emailed to ${email.trim()}`}
              </Txt>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                autoFocus
                accessibilityLabel="Verification code"
                style={[styles.input, { borderWidth: 2, borderColor: colors.accent, fontSize: 20, letterSpacing: 6 }]}
              />
              <Row style={{ justifyContent: 'space-between' }}>
                <Pressable accessibilityRole="button" onPress={() => setStep('email')} hitSlop={8}>
                  <Txt variant="small" color={colors.accent}>
                    Change email
                  </Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  disabled={busy}
                  onPress={() => run(() => store.sendCode(email))}
                >
                  <Txt variant="small" color={colors.accent}>
                    Send a new code
                  </Txt>
                </Pressable>
              </Row>
              <Txt variant="caption" color={colors.muted}>
                Can’t find it? Check your spam folder. You can also tap the link in the email on this phone.
              </Txt>
            </View>
          ) : null}
        </>
      )}
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
    fontSize: 16,
  },
});
