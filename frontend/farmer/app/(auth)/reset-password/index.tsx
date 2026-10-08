// Reset-password screen: set a new password after the forgot-password flow.
// REAL: uses the Supabase recovery session (the user tapped the email link
// and the app exchanged it for a session) and calls auth.updateUser().
// The farmer reset email is sent by the web Supabase project, so the web
// client is checked first, then the mobile-project client. Without a
// recovery session on either client, the screen explains the link expired
// instead of faking a success.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Screen } from '../../../src/components/common/Screen';
import { AppButton } from '../../../src/components/common/AppButton';
import { Card } from '../../../src/components/common/Card';
import { colors } from '../../../src/theme/colors';
import { getSupabaseClient } from '../../../src/api/client';
import { getWebSupabaseClient } from '../../../src/services/authService';

/** Return the Supabase client that currently holds a recovery session
 *  (web project first = farmer lane, then the mobile project), or null. */
async function findRecoveryClient(): Promise<SupabaseClient | null> {
  const clients: SupabaseClient[] = [];
  try {
    clients.push(getWebSupabaseClient());
  } catch {
    // Farmer auth not configured — skip the web client.
  }
  try {
    clients.push(getSupabaseClient());
  } catch {
    // Skip the mobile client too if it is unavailable.
  }
  for (const client of clients) {
    try {
      const { data } = await client.auth.getSession();
      if (data.session) return client;
    } catch {
      // Try the next client.
    }
  }
  return null;
}

/** Set a new password (min 8 chars, must match confirmation). */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryClient, setRecoveryClient] = useState<SupabaseClient | null | undefined>(undefined);

  /** A recovery session must exist (user arrived via the email link). */
  useEffect(() => {
    let alive = true;
    (async () => {
      const client = await findRecoveryClient();
      if (alive) setRecoveryClient(client);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Validate and set the new password via Supabase Auth. */
  const handleReset = async () => {
    if (!recoveryClient) {
      setError('The reset link is invalid or has expired. Please get a new link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Both passwords must match.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await recoveryClient.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to save your password. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (recoveryClient === undefined) {
    return (
      <Screen title="New password" subtitle="Choose a secure password">
        <Text style={styles.checking}>Checking link…</Text>
      </Screen>
    );
  }

  if (recoveryClient === null) {
    return (
      <Screen title="New password" subtitle="Choose a secure password">
        <Card style={styles.card}>
          <Text style={styles.successTitle}>Link expired</Text>
          <Text style={styles.successText}>
            The reset link is invalid or has expired. Tap the link in your email, or get a new link.
          </Text>
          <View style={styles.gap}>
            <AppButton
              label="Get a new link"
              onPress={() => router.replace('/(auth)/forgot-password')}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="New password" subtitle="Choose a secure password">
      {!done ? (
        <View>
          <Text style={styles.label}>New password (min 8 characters)</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor={colors.sage}
            secureTextEntry
          />
          <Text style={styles.label}>Confirm your password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Confirm password"
            placeholderTextColor={colors.sage}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.gap}>
            <AppButton label="Save password" onPress={handleReset} loading={saving} />
          </View>
        </View>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.successTitle}>Password changed</Text>
          <Text style={styles.successText}>Log in with your new password now.</Text>
          <View style={styles.gap}>
            <AppButton label="Go to login" onPress={() => router.replace('/(auth)/login')} />
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
  checking: { fontSize: 15, color: colors.sage, marginTop: 24, textAlign: 'center' },
});
