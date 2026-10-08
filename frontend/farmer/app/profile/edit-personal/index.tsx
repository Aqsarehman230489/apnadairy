// Edit personal details: name and phone.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { colors } from '../../../src/theme/colors';
import { font } from '../../../src/theme/theme';
import { getProfile, updatePersonal } from '../../../src/services/farmerService';

/** Edit personal details screen. */
export default function EditPersonalScreen() {
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  /** Load current values into the form. */
  useEffect(() => {
    let alive = true;
    getProfile()
      .then((f) => { if (alive) { setName(f.name); setPhone(f.phone); } })
      .catch(() => { if (alive) setError('Details could not be loaded.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /** Validate then save. */
  const onSave = async () => {
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!/^03\d{2}-\d{7}$/.test(phone.trim())) { setError('Please enter the phone number in the 0300-1234567 format.'); return; }
    setError(null);
    setSaving(true);
    try {
      await updatePersonal({ name: name.trim(), phone: phone.trim() });
      setSaved(true);
      setTimeout(() => router.back(), 900);
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Screen title="Personal Details"><View style={styles.center}><ActivityIndicator size="large" color={colors.forest} /></View></Screen>;
  }

  return (
    <Screen title="Personal Details" subtitle="Update your personal information">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <Card style={styles.card}>
          <View>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Muhammad Ramzan"
              placeholderTextColor={colors.sage}
              autoCapitalize="words"
            />
          </View>
          <View>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="0300-1234567"
              placeholderTextColor={colors.sage}
              keyboardType="phone-pad"
            />
            <Text style={styles.helper}>Use the 0300-1234567 format.</Text>
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.success}>Saved successfully.</Text> : null}

        <AppButton label="Save" onPress={onSave} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
