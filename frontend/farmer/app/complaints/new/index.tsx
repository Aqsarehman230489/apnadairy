// New complaint: category chips, message input, submit to the backend.
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { AppButton } from '../../../src/components/common/AppButton';
import { colors } from '../../../src/theme/colors';
import { createComplaint } from '../../../src/services/engagementService';

/** Available complaint categories. */
const CATEGORIES = ['Payment', 'Manager', 'App', 'Other'];

/** New complaint screen. */
export default function NewComplaintScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('Payment');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const messageError = touched && message.trim().length < 10 ? 'Message must be at least 10 characters' : null;
  const canSubmit = category.length > 0 && message.trim().length >= 10 && !submitting;

  /** Submit the complaint, then return to the list with a success flag. */
  async function handleSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createComplaint(category, message.trim());
      router.replace({ pathname: '/complaints', params: { created: '1' } });
    } catch {
      setSubmitError('Could not submit your complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="New complaint" subtitle="We will hear you out">
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Select a category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Describe your issue</Text>
        <Text style={styles.hint}>Write at least 10 characters so we can help you better.</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={5}
          placeholder="Describe the issue in detail..."
          placeholderTextColor={colors.sage}
          value={message}
          onChangeText={setMessage}
          onBlur={() => setTouched(true)}
          textAlignVertical="top"
        />
        {messageError && <Text style={styles.fieldError}>{messageError}</Text>}

        {submitError && <Text style={styles.fieldError}>{submitError}</Text>}

        <View style={styles.submit}>
          <AppButton label="Submit" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 24 },
  label: {
    fontSize: 16,
    color: colors.ink,
    marginTop: 20,
    marginBottom: 4,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  hint: {
    fontSize: 13,
    color: colors.sage,
    fontFamily: 'BricolageGrotesque_400Regular',
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 20,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
  },
  chipActive: { borderColor: colors.forest, backgroundColor: colors.forest },
  chipText: { fontSize: 15, color: colors.ink, fontFamily: 'BricolageGrotesque_600SemiBold' },
  chipTextActive: { color: colors.ivory, fontFamily: 'BricolageGrotesque_700Bold' },
  input: {
    backgroundColor: colors.ivory,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    fontSize: 16,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_400Regular',
    minHeight: 140,
  },
  fieldError: { color: colors.danger, fontSize: 13, marginTop: 8, fontFamily: 'BricolageGrotesque_600SemiBold' },
  submit: { marginTop: 24 },
});
