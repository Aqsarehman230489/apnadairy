// Email verification screen (REAL Supabase email OTP on the web project,
// the same approach the web app uses — not a mock).
// The user types the 6-digit code Supabase emailed them. Success -> session
// saved -> onboarding. Resend has a 60s cooldown. Wrong/expired codes show
// readable errors.
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
import { font } from '../../../src/theme/theme';
import { getWebSupabaseClient } from '../../../src/services/authService';
import { saveSession } from '../../../src/api/client';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Read a single param that expo-router may give as string | string[]. */
function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

/** 6-box email-OTP entry with auto-advance and a real resend call. */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = asString(params.email);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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

  /** Verify the code with Supabase Auth -> save session -> onboarding. */
  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    if (!email) {
      setError('Email is missing. Please sign up again.');
      return;
    }
    setError(null);
    setInfo(null);
    setVerifying(true);
    try {
      const { data, error: otpError } = await getWebSupabaseClient().auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });
      if (otpError) throw otpError;
      const token = data.session?.access_token;
      if (!token) throw new Error('Verification incomplete. Please try again.');
      await saveSession(token, 'farmer', data.session?.refresh_token ?? undefined);
      router.replace('/onboarding/personal');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed.';
      if (/already been verified|already confirmed/i.test(msg)) {
        // Verified but no session issued — go log in with the password.
        setInfo(msg);
        router.replace({ pathname: '/(auth)/login', params: { role: 'farmer', verified: '1' } });
      } else {
        setError(msg);
      }
    } finally {
      setVerifying(false);
    }
  };

  /** Real resend via Supabase Auth; restarts the 60s cooldown. */
  const handleResend = async () => {
    if (!email || resending) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const { error: resendError } = await getWebSupabaseClient().auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) throw resendError;
      setTimer(RESEND_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(''));
      setInfo('A new code has been sent. Please check your inbox or spam folder.');
      inputs.current[0]?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'There was a problem sending the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen
      title="Email Verification"
      subtitle={email ? `Enter the 6-digit code sent to ${email}` : 'Enter the code sent to your email'}
    >
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
              editable={!verifying}
            />
          ))}
        </View>
        <Text style={styles.hint}>If you cannot find the code in your inbox, please check your spam folder.</Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <View style={styles.gap}>
        <AppButton label="Verify email" onPress={handleVerify} loading={verifying} />
      </View>

      <View style={styles.resendRow}>
        {timer > 0 ? (
          <Text style={styles.timer}>Resend ({timer}s)</Text>
        ) : (
          <Pressable onPress={handleResend} disabled={resending}>
            <Text style={[styles.link, resending && styles.linkDisabled]}>
              {resending ? 'Sending...' : 'Resend code'}
            </Text>
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
    fontSize: 22, fontFamily: font.bold, color: colors.ink,
  },
  hint: { fontSize: 13, fontFamily: font.regular, color: colors.sage, marginTop: 12, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, fontFamily: font.semibold, marginTop: 12, textAlign: 'center' },
  info: { color: colors.forest, fontSize: 14, fontFamily: font.semibold, marginTop: 12, textAlign: 'center' },
  gap: { marginTop: 12 },
  resendRow: { alignItems: 'center', marginTop: 16 },
  timer: { color: colors.sage, fontSize: 14, fontFamily: font.regular },
  link: { color: colors.forest, fontFamily: font.bold, fontSize: 15 },
  linkDisabled: { color: colors.sage },
});
