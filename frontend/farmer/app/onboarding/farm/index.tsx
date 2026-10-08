// app/onboarding/farm/index.tsx
// Onboarding Step 2 of 2: farm details.
// Card 1 — city (required by the backend and used for manager linking), farm
// name, farm location/address.
// Card 2 — number of animals (one big stepper) and maximum daily milk capacity.
// Card 3 — farm photo, uploaded for real through
// documentsService.uploadDocument().
// "Submit" calls onboardingService.submitOnboarding() and moves to the
// verification screen. Personal data (village, CNIC number) arrives as route
// params from Step 1.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { colors } from '../../../src/theme/colors';
import { font } from '../../../src/theme/theme';
import { submitOnboarding } from '../../../src/services/onboardingService';
import { uploadDocument } from '../../../src/services/documentsService';

/** Two-segment progress indicator for the 2-step onboarding flow. */
function StepIndicator({ current }: { current: 1 | 2 }): React.JSX.Element {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepText}>
        Step <Text style={styles.stepTextAccent}>{current}</Text> of 2
      </Text>
      <View style={styles.stepBar}>
        <View style={[styles.stepSegment, current >= 1 && styles.stepSegmentDone]} />
        <View style={[styles.stepSegment, current >= 2 && styles.stepSegmentDone]} />
      </View>
    </View>
  );
}

/** Big minus/plus stepper for the animal count (simple for low-literacy users). */
function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityLabel={`Decrease ${label}`}
          style={styles.stepperBtn}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Text style={styles.stepperBtnText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityLabel={`Increase ${label}`}
          style={styles.stepperBtn}
          onPress={() => onChange(value + 1)}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Farmer farm-details step (Step 2/2). */
export default function FarmDetailsScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ village?: string; cnic?: string }>();
  const village = typeof params.village === 'string' ? params.village : '';
  const cnic = typeof params.cnic === 'string' ? params.cnic : '';

  const [city, setCity] = useState('');
  const [farmName, setFarmName] = useState('');
  const [farmAddress, setFarmAddress] = useState('');
  const [animals, setAnimals] = useState(0);
  const [capacity, setCapacity] = useState('');
  const [photoState, setPhotoState] = useState<'empty' | 'picking' | 'uploading' | 'done'>('empty');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /** Pick a farm photo from the gallery and upload it for real. */
  async function pickFarmPhoto(): Promise<void> {
    setError('');
    setPhotoState('picking');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) {
        setPhotoState('empty');
        return;
      }
      setPhotoState('uploading');
      await uploadDocument('farm_photo', result.assets[0].uri);
      setPhotoState('done');
    } catch (e) {
      setPhotoState('empty');
      setError(e instanceof Error ? e.message : 'Photo upload failed. Please try again.');
    }
  }

  /** Validate, submit the onboarding payload, then go to verification. */
  async function handleSubmit(): Promise<void> {
    if (!city.trim()) {
      setError('Please enter your city.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const notes = cnic ? `CNIC: ${cnic}` : '';
      await submitOnboarding({
        city: city.trim(),
        village: village || undefined,
        address: farmAddress.trim() || undefined,
        farm_name: farmName.trim() || undefined,
        cattle_count: animals,
        daily_litres: Number(capacity) || undefined,
        notes: notes || undefined,
      });
      router.replace('/verification');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not save. Please check your internet connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Farm information" subtitle="Step 2 of 2 — farm details">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <StepIndicator current={2} />

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Farm details</Text>
          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="E.g. Islamabad"
              placeholderTextColor={colors.sage}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Farm name (optional)</Text>
            <TextInput
              style={styles.input}
              value={farmName}
              onChangeText={setFarmName}
              placeholder="E.g. Ramzan Dairy Farm"
              placeholderTextColor={colors.sage}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Farm location</Text>
            <TextInput
              style={styles.input}
              value={farmAddress}
              onChangeText={setFarmAddress}
              placeholder="Where is your farm?"
              placeholderTextColor={colors.sage}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Animals & milk</Text>
          <Stepper label="Number of animals" value={animals} onChange={setAnimals} />
          <View style={styles.field}>
            <Text style={styles.label}>Maximum milk per day (litres)</Text>
            <TextInput
              style={styles.input}
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
              placeholder="E.g. 40"
              placeholderTextColor={colors.sage}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Farm photo</Text>
          {photoState === 'done' ? (
            <View style={[styles.photoBox, styles.photoBoxDone]}>
              <Text style={styles.photoDoneText}>Photo attached</Text>
              <Text style={styles.photoDoneSub}>Sent for verification</Text>
            </View>
          ) : photoState === 'picking' || photoState === 'uploading' ? (
            <View style={styles.photoBox}>
              <ActivityIndicator color={colors.forest} size="large" />
              <Text style={styles.photoBusyText}>
                {photoState === 'picking' ? 'Opening gallery...' : 'Uploading...'}
              </Text>
            </View>
          ) : (
            <Pressable style={styles.photoBox} onPress={pickFarmPhoto}>
              <Text style={styles.photoPlus}>+</Text>
              <Text style={styles.photoLabel}>Attach farm photo</Text>
              <Text style={styles.photoHint}>A clear photo of your farm</Text>
            </Pressable>
          )}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton label="Submit" onPress={handleSubmit} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollBody: { paddingBottom: 32, gap: 12 },
  stepWrap: { marginBottom: 4 },
  stepText: { fontSize: 15, color: colors.sage, fontFamily: font.semibold, marginBottom: 8 },
  stepTextAccent: { color: colors.forest, fontFamily: font.bold },
  stepBar: { flexDirection: 'row', gap: 8 },
  stepSegment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line },
  stepSegmentDone: { backgroundColor: colors.forest },
  card: { gap: 12 },
  cardTitle: { fontSize: 18, color: colors.ink, fontFamily: font.bold },
  field: {},
  label: { fontSize: 15, color: colors.ink, marginBottom: 8, fontFamily: font.semibold },
  input: {
    height: 60,
    backgroundColor: colors.ivory,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    fontFamily: font.regular,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepperLabel: { fontSize: 16, color: colors.ink, fontFamily: font.semibold },
  stepperControls: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: colors.ivory, fontSize: 32, fontFamily: font.bold, lineHeight: 36 },
  stepperValue: {
    fontSize: 28,
    color: colors.ink,
    marginHorizontal: 16,
    minWidth: 44,
    textAlign: 'center',
    fontFamily: font.bold,
  },
  photoBox: {
    minHeight: 96,
    backgroundColor: colors.ivory,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  photoBoxDone: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: colors.successTint,
  },
  photoPlus: { fontSize: 32, color: colors.forest, fontFamily: font.bold, lineHeight: 36 },
  photoLabel: { fontSize: 17, color: colors.forest, fontFamily: font.bold, marginTop: 2 },
  photoHint: { fontSize: 13, color: colors.sage, fontFamily: font.regular, marginTop: 2, textAlign: 'center' },
  photoBusyText: { color: colors.forest, fontSize: 15, fontFamily: font.semibold, marginTop: 8 },
  photoDoneText: { color: colors.success, fontSize: 16, fontFamily: font.bold },
  photoDoneSub: { color: colors.success, fontSize: 13, fontFamily: font.regular, marginTop: 2 },
  error: { color: colors.danger, fontSize: 14, fontFamily: font.regular, textAlign: 'center' },
});
