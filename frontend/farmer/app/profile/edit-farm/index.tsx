// Edit farm details: farm name, village, city, animal count stepper.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { colors } from '../../../src/theme/colors';
import { font } from '../../../src/theme/theme';
import { getProfile, updateFarm } from '../../../src/services/farmerService';

/** Edit farm details screen. */
export default function EditFarmScreen() {
  const router = useRouter();
  const [farmName, setFarmName] = useState<string>('');
  const [village, setVillage] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [animals, setAnimals] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  /** Load current farm values into the form. */
  useEffect(() => {
    let alive = true;
    getProfile()
      .then((f) => { if (alive) { setFarmName(f.farmName); setVillage(f.village); setCity(f.city); setAnimals(f.animalCount); } })
      .catch(() => { if (alive) setError('Details could not be loaded.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /** Stepper: keep count within 0..500. */
  const step = (d: number) => setAnimals((a) => Math.min(500, Math.max(0, a + d)));

  /** Validate then save. */
  const onSave = async () => {
    if (!farmName.trim()) { setError('Please enter the farm name.'); return; }
    setError(null);
    setSaving(true);
    try {
      await updateFarm({ farmName: farmName.trim(), village: village.trim(), city: city.trim(), animalCount: animals });
      setSaved(true);
      setTimeout(() => router.back(), 900);
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Screen title="Farm Details"><View style={styles.center}><ActivityIndicator size="large" color={colors.forest} /></View></Screen>;
  }

  return (
    <Screen title="Farm Details" subtitle="Update your farm information">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <Card style={styles.card}>
          <View>
            <Text style={styles.label}>Farm Name</Text>
            <TextInput
              style={styles.input}
              value={farmName}
              onChangeText={setFarmName}
              placeholder="Ramzan Dairy Farm"
              placeholderTextColor={colors.sage}
              autoCapitalize="words"
            />
          </View>
          <View>
            <Text style={styles.label}>Village / Chak</Text>
            <TextInput
              style={styles.input}
              value={village}
              onChangeText={setVillage}
              placeholder="Chak 44"
              placeholderTextColor={colors.sage}
            />
          </View>
          <View>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Sahiwal"
              placeholderTextColor={colors.sage}
              autoCapitalize="words"
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Number of Animals</Text>
          <View style={styles.stepper}>
            <Pressable
              accessibilityLabel="Decrease animal count"
              style={styles.stepBtn}
              onPress={() => step(-1)}
            >
              <Text style={styles.stepText}>-</Text>
            </Pressable>
            <Text style={styles.stepValue}>{animals}</Text>
            <Pressable
              accessibilityLabel="Increase animal count"
              style={styles.stepBtn}
              onPress={() => step(1)}
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
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
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
    backgroundColor: colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.ivory, fontSize: 30, fontFamily: font.bold, lineHeight: 34 },
  stepValue: { fontSize: 30, color: colors.ink, fontFamily: font.bold, minWidth: 64, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center', fontFamily: font.regular },
  success: { color: colors.success, fontSize: 14, textAlign: 'center', fontFamily: font.semibold },
});
