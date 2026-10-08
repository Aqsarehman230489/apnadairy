// OTP verification screen: 6-box code input with 60s resend timer.
// NOTE: phone OTP is NOT part of farmer signup in v2 (see verifyOtp in
// src/services/authService.ts, which explains this). The screen is kept so
// old routes still resolve; the Verify button calls the real service, which
// answers with a readable error directing the user back to email signup.
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { AppButton } from '../../../src/components/common/AppButton';
import { Card } from '../../../src/components/common/Card';
import { colors } from '../../../src/theme/colors';
import { saveSession } from '../../../src/api/client';
import { verifyOtp, Role } from '../../../src/services/authService';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Read a single param that expo-router may give as string | string[]. */
function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

/** 6-box OTP entry with auto-advance and resend timer. */
export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string; phone?: string }>();
  const role: Role = params.role === 'customer' ? 'customer' : 'farmer';
  const phone = asString(params.phone);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

  /** Countdown for the resend button. */
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  /** Keep only the last typed digit; jump to the next box. */
  const handleChange = (text: string, index: number) => {
    const d = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = d;
    setDigits(next);
    setError(null);
    if (d && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  /** Backspace on an empty box moves focus to the previous box. */
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  /** Verify code -> save session -> route by role. */
  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const res = await verifyOtp(phone, code, role);
      await saveSession(res.token, res.role);
      router.replace(res.role === 'farmer' ? '/onboarding/personal' : '/(tabs)/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  /** Restart the 60s resend timer. */
  const handleResend = () => {
    setTimer(RESEND_SECONDS);
    setDigits(Array(CODE_LENGTH).fill(''));
    setError(null);
    inputs.current[0]?.focus();
  };

  return (
    <Screen title="OTP Verification" subtitle={phone ? `Enter the code sent to ${phone}` : 'Enter the code'}>
      <Card style={styles.card}>
        <View style={styles.boxes}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={styles.box}
              value={d}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.gap}>
        <AppButton label="Verify" onPress={handleVerify} loading={verifying} />
      </View>

      <View style={styles.resendRow}>
        {timer > 0 ? (
          <Text style={styles.timer}>Resend ({timer}s)</Text>
        ) : (
          <Pressable onPress={handleResend}>
            <Text style={styles.link}>Resend code</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16 },
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 48, height: 56, backgroundColor: colors.ivory, borderRadius: 14,
    borderWidth: 1, borderColor: colors.line, textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 14, marginTop: 12, fontWeight: '600', textAlign: 'center' },
  gap: { marginTop: 12 },
  resendRow: { alignItems: 'center', marginTop: 16 },
  timer: { color: colors.sage, fontSize: 14 },
  link: { color: colors.forest, fontWeight: '700', fontSize: 15 },
});
