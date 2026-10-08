// app/onboarding/personal/index.tsx
// Onboarding Step 1 of 2: farmer's personal details.
// Card 1 — full name, phone, email (read-only, from the account).
// Card 2 — CNIC number and village/address.
// Card 3 — photo slots: profile photo, CNIC front, CNIC back — real image
// picker, uploaded immediately through documentsService.uploadDocument()
// (real backend multipart upload).
// "Continue" saves name/phone via farmerService.updatePersonal() and moves
// to the farm step, carrying village + CNIC forward as route params.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { colors } from '../../../src/theme/colors';
import { font } from '../../../src/theme/theme';
import { getFarmer } from '../../../src/services/verificationService';
import { getMe } from '../../../src/services/authService';
import { updatePersonal } from '../../../src/services/farmerService';
import { uploadDocument, type DocumentKind } from '../../../src/services/documentsService';

type SlotState = 'empty' | 'picking' | 'uploading' | 'done';

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

// Big, obvious photo upload slot: tap to pick from the gallery, uploads for real.
function PhotoSlot({
  label,
  hint,
  kind,
  state,
  onPick,
}: {
  label: string;
  hint: string;
  kind: DocumentKind;
  state: SlotState;
  onPick: (kind: DocumentKind) => void;
}): React.JSX.Element {
  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>{label}</Text>
      {state === 'done' ? (
        <View style={[styles.photoBox, styles.photoBoxDone]}>
          <Text style={styles.photoDoneText}>Photo attached</Text>
          <Text style={styles.photoDoneSub}>Sent for verification</Text>
        </View>
      ) : state === 'picking' || state === 'uploading' ? (
        <View style={styles.photoBox}>
          <ActivityIndicator color={colors.forest} size="large" />
          <Text style={styles.photoBusyText}>
            {state === 'picking' ? 'Opening gallery...' : 'Uploading...'}
          </Text>
        </View>
      ) : (
        <Pressable style={styles.photoBox} onPress={() => onPick(kind)}>
          <Text style={styles.photoPlus}>+</Text>
          <Text style={styles.photoLabel}>Attach photo</Text>
          <Text style={styles.photoHint}>{hint}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Farmer personal-details step (Step 1/2). */
export default function PersonalDetailsScreen(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cnic, setCnic] = useState('');
  const [village, setVillage] = useState('');
  const [slots, setSlots] = useState<Record<DocumentKind, SlotState>>({
    profile_photo: 'empty',
    cnic_front: 'empty',
    cnic_back: 'empty',
    farm_photo: 'empty',
  });
  const [error, setError] = useState('');

  // Prefill name/phone/email from the signed-up profile.
  useEffect(() => {
    (async () => {
      try {
        const [f, me] = await Promise.all([getFarmer(), getMe()]);
        setName(f.name ?? '');
        setPhone(f.phone ?? '');
        setEmail(me.email ?? '');
        setVillage(f.village ?? '');
      } catch {
        setError('Could not load data. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setSlot(kind: DocumentKind, state: SlotState): void {
    setSlots((prev) => ({ ...prev, [kind]: state }));
  }

  /** Pick a photo from the gallery and upload it for real. */
  async function pickAndUpload(kind: DocumentKind): Promise<void> {
    setError('');
    setSlot(kind, 'picking');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) {
        setSlot(kind, 'empty');
        return;
      }
      const uri = result.assets[0].uri;
      setSlot(kind, 'uploading');
      await uploadDocument(kind, uri);
      setSlot(kind, 'done');
    } catch (e) {
      setSlot(kind, 'empty');
      setError(e instanceof Error ? e.message : 'Photo upload failed. Please try again.');
    }
  }

  /** Validate, save name/phone, then continue to the farm step. */
  async function goNext(): Promise<void> {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const cnicDigits = cnic.replace(/\D/g, '');
    if (cnicDigits && cnicDigits.length !== 13) {
      setError('CNIC number must be 13 digits (e.g. 35202-1234567-8).');
      return;
    }
    if (slots.profile_photo !== 'done') {
      setError('Please attach your profile photo.');
      return;
    }
    if (slots.cnic_front !== 'done' || slots.cnic_back !== 'done') {
      setError('Please attach both CNIC photos (front and back).');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await updatePersonal({ name: name.trim(), phone: phone.trim() });
      router.push({
        pathname: '/onboarding/farm',
        params: { village: village.trim(), cnic: cnicDigits },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please check your internet connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Your information">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Your information" subtitle="Step 1 of 2 — personal details">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <StepIndicator current={1} />

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Your details</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="E.g. Muhammad Ramzan"
              placeholderTextColor={colors.sage}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Mobile number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="03xx-xxxxxxx"
              placeholderTextColor={colors.sage}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={[styles.input, styles.readonly]} value={email} editable={false} />
            <Text style={styles.helper}>This is the email from your account.</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Identity</Text>
          <View style={styles.field}>
            <Text style={styles.label}>CNIC number</Text>
            <TextInput
              style={styles.input}
              value={cnic}
              onChangeText={setCnic}
              placeholder="35202-1234567-8"
              placeholderTextColor={colors.sage}
              keyboardType="numeric"
            />
            <Text style={styles.helper}>Enter all 13 digits, with or without dashes.</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Village / address</Text>
            <TextInput
              style={styles.input}
              value={village}
              onChangeText={setVillage}
              placeholder="E.g. Chak 44"
              placeholderTextColor={colors.sage}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Photos</Text>
          <PhotoSlot
            label="Profile photo"
            hint="A clear photo of your face"
            kind="profile_photo"
            state={slots.profile_photo}
            onPick={pickAndUpload}
          />
          <PhotoSlot
            label="CNIC — front side"
            hint="Photo of the front of your CNIC"
            kind="cnic_front"
            state={slots.cnic_front}
            onPick={pickAndUpload}
          />
          <PhotoSlot
            label="CNIC — back side"
            hint="Photo of the back of your CNIC"
            kind="cnic_back"
            state={slots.cnic_back}
            onPick={pickAndUpload}
          />
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton label="Continue" onPress={goNext} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  readonly: { backgroundColor: colors.cream, color: colors.sage },
  helper: { fontSize: 13, color: colors.sage, marginTop: 6, fontFamily: font.regular },
  slot: {},
  slotLabel: { fontSize: 15, color: colors.ink, marginBottom: 8, fontFamily: font.semibold },
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
    marginTop: 12,
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
