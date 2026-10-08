// Forgot-password screen: enter email -> reset link sent.
// Farmer role calls the real farmer auth service (the web Supabase project
// sends the reset email). Customer is not part of this farmer build.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { AppButton } from '../../../src/components/common/AppButton';
import { Card } from '../../../src/components/common/Card';
import { colors } from '../../../src/theme/colors';
import { forgotPasswordFarmer } from '../../../src/services/authService';

/** Request a password reset link; shows a success card when "sent". */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const isCustomer = params.role === 'customer';
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Send the reset link via the real farmer auth service. */
  const handleSend = async () => {
    if (isCustomer) {
      setError('Password reset for customers is not available in this farmer app.');
      return;
    }
    if (!identifier.trim()) {
      setError('Enter your email.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      await forgotPasswordFarmer(identifier.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="Forgot password?" subtitle="Get a reset link">
      {!sent ? (
        <View>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="you@email.com"
            placeholderTextColor={colors.sage}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.gap}>
            <AppButton label="Send reset link" onPress={handleSend} loading={sending} />
          </View>
        </View>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.successTitle}>Link sent</Text>
          <Text style={styles.successText}>
            {`A password reset link has been sent to ${identifier.trim()}. Open the link in your email to set a new password, then log in.`}
          </Text>
          <View style={styles.gap}>
            <AppButton
              label="Set a new password"
              onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { identifier: identifier.trim() } })}
            />
          </View>
          <View style={styles.gap}>
            <AppButton label="Go to login" variant="outline" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 16, marginBottom: 8 },
  input: {
    height: 52, backgroundColor: colors.ivory, borderRadius: 14, paddingHorizontal: 16,
    fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line,
  },
  error: { color: colors.danger, fontSize: 14, marginTop: 12, fontWeight: '600' },
  gap: { marginTop: 12 },
  card: { marginTop: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.forest },
  successText: { fontSize: 15, color: colors.ink, marginTop: 8, lineHeight: 22 },
});
