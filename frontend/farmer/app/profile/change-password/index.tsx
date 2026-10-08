// Change password: old, new (min 8 chars), confirm — validated, then sent to
// the farmer backend, which re-verifies the current password via Supabase Auth
// before changing it.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { colors } from '../../../src/theme/colors';
import { font } from '../../../src/theme/theme';
import { changeFarmerPassword } from '../../../src/services/authService';

/** Pull the server's own message out of the api client's error wrapper. */
function serverMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : 'Password change failed. Please try again.';
  const cut = msg.indexOf('—');
  return cut >= 0 ? msg.slice(cut + 1).trim() : msg;
}

/** Change password screen. */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPw, setOldPw] = useState<string>('');
  const [newPw, setNewPw] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  /** Validate fields, then change the password via the real backend. */
  const onSave = async () => {
    if (!oldPw) { setError('Please enter your current password.'); return; }
    if (newPw.length < 8) { setError('The new password must be at least 8 characters long.'); return; }
    if (newPw !== confirm) { setError('The new password and the confirmation do not match.'); return; }
    setError(null);
    setSaving(true);
    try {
      await changeFarmerPassword(oldPw, newPw);
      setSaved(true);
      setTimeout(() => router.back(), 900);
    } catch (e) {
      setError(serverMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Change Password" subtitle="Keep your account secure">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <Card style={styles.card}>
          <View>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={oldPw}
              onChangeText={setOldPw}
              secureTextEntry
              placeholder="Enter your current password"
              placeholderTextColor={colors.sage}
              autoCapitalize="none"
            />
          </View>
          <View>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              placeholder="Enter a new password"
              placeholderTextColor={colors.sage}
              autoCapitalize="none"
            />
            <Text style={styles.helper}>At least 8 characters.</Text>
          </View>
          <View>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Repeat the new password"
              placeholderTextColor={colors.sage}
              autoCapitalize="none"
            />
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.success}>Password updated successfully.</Text> : null}

        <AppButton label="Save Password" onPress={onSave} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32, gap: 12 },
  card: { gap: 12 },
  label: { fontSize: 15, color: colors.ink, marginBottom: 8, fontFamily: font.semibold },
  input: {
    backgroundColor: colors.ivory,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 60,
    fontSize: 17,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: font.regular,
  },
  helper: { fontSize: 13, color: colors.sage, marginTop: 6, fontFamily: font.regular },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center', fontFamily: font.regular },
  success: { color: colors.success, fontSize: 14, textAlign: 'center', fontFamily: font.semibold },
});
