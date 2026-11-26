import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Button, CenterMessage, ErrorText, IconButton, Row, Txt } from '@/components/ui';
import { time } from '@/lib/format';
import { useStore, type ScanResult } from '@/lib/store';
import { useEvent } from '@/lib/useEvent';
import { colors, fonts, radius, space } from '@/theme';

export default function Scanner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scanTicket, ticketsFor } = useStore();
  const { event, loading } = useEvent(id);
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ inside: 0, sold: 0 });
  const [manual, setManual] = useState('');
  const locked = useRef(false);

  const loadCounts = useCallback(() => {
    if (!id) return;
    ticketsFor(id)
      .then((t) => setCounts({ inside: t.filter((x) => x.scannedAt).length, sold: t.length }))
      .catch(() => {});
  }, [id, ticketsFor]);
  useEffect(loadCounts, [loadCounts]);

  if (loading) return <CenterMessage title="Loading…" />;
  if (!event) return <CenterMessage title="Event not found" action={<Button title="Your events" onPress={() => router.replace('/host')} />} />;
  const { inside, sold } = counts;

  const handle = async (code: string) => {
    if (locked.current) return; // the camera fires many times per second
    locked.current = true;
    setError(null);
    try {
      setResult(await scanTicket(event.id, code));
      loadCounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check the ticket');
      locked.current = false;
    }
  };
  const next = () => {
    setResult(null);
    setManual('');
    locked.current = false;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.xl }}>
        <IconButton name="close" label="Close scanner" onPress={() => router.back()} />
        <Txt variant="heading">Door scanner</Txt>
        <View style={styles.counter}>
          <Txt variant="label">
            {inside} / {sold} in
          </Txt>
        </View>
      </Row>

      <View style={styles.cameraArea}>
        {!permission ? null : permission.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={result ? undefined : ({ data }) => handle(data)}
          />
        ) : (
          <View style={{ alignItems: 'center', gap: space.md, padding: space.xl }}>
            <Txt style={{ textAlign: 'center' }}>Camera access is needed to scan tickets.</Txt>
            <Button title="Allow camera" onPress={requestPermission} />
          </View>
        )}
        {permission?.granted ? <View pointerEvents="none" style={styles.frame} /> : null}
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        {result ? <ResultCard result={result} /> : null}
        <ErrorText message={error} />
        {result ? (
          <Button title="Scan next ticket" onPress={next} />
        ) : (
          <Row>
            <TextInput
              value={manual}
              onChangeText={setManual}
              placeholder="Or type a ticket code"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              accessibilityLabel="Ticket code"
              style={styles.input}
            />
            <Button title="Check" kind="secondary" disabled={!manual.trim()} onPress={() => handle(manual)} />
          </Row>
        )}
      </View>
    </SafeAreaView>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  const ok = result.status === 'valid';
  const tone = ok ? colors.good : colors.warn;
  const title =
    result.status === 'valid'
      ? 'Valid · let them in'
      : result.status === 'used'
        ? 'Already used'
        : result.status === 'wrong-event'
          ? 'Ticket is for another event'
          : 'Not a valid ticket';
  const detail =
    result.status === 'valid'
      ? `${result.ticket.holderName} · ${result.ticket.code}`
      : result.status === 'used'
        ? `First scanned at ${time(result.ticket.scannedAt!)}`
        : 'Check the code or ask to see the ticket in their app.';
  return (
    <View style={[styles.result, { borderColor: tone, backgroundColor: ok ? colors.goodTint : colors.warnTint }]}>
      <View style={[styles.resultIcon, { backgroundColor: tone }]}>
        <Icon name={ok ? 'check' : 'close'} size={26} strokeWidth={3} color={colors.bg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="heading" style={{ fontSize: 17 }}>
          {title}
        </Txt>
        <Txt variant="small" color={colors.textSoft}>
          {detail}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000', gap: space.lg, paddingTop: space.md, paddingBottom: space.md },
  counter: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  cameraArea: { flex: 1, marginHorizontal: space.lg, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 4, borderColor: colors.accent },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderRadius: 18, padding: space.lg },
  resultIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
