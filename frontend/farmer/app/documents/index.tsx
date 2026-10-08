// Documents tab — every verification document the farmer has uploaded
// (CNIC front/back, profile photo, farm photo), with a re-upload button
// on each so the farmer can replace a photo when the SuperAdmin asks.
// Real data + real uploads via documentsService.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../src/components/common/Screen';
import { Card } from '../../src/components/common/Card';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { ErrorRetry } from '../../src/components/common/ErrorRetry';
import { EmptyState } from '../../src/components/common/EmptyState';
import { colors } from '../../src/theme/colors';
import {
  DocumentInfo,
  DocumentKind,
  listDocuments,
  uploadDocument,
} from '../../src/services/documentsService';

// Document slots accepted by the backend, in display order.
const SLOTS: { kind: DocumentKind; label: string; hint: string; mark: string }[] = [
  { kind: 'cnic_front', label: 'CNIC — front side', hint: 'Front side of your national ID card', mark: 'CF' },
  { kind: 'cnic_back', label: 'CNIC — back side', hint: 'Back side of your national ID card', mark: 'CB' },
  { kind: 'profile_photo', label: 'Profile photo', hint: 'A clear photo of your face', mark: 'PP' },
  { kind: 'farm_photo', label: 'Farm photo', hint: 'A photo of your farm or dairy', mark: 'FP' },
];

// Picks one photo from the gallery, uploads it, and refreshes the list.
async function pickAndUpload(kind: DocumentKind): Promise<void> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Photo access is needed to upload the document.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return; // The farmer cancelled the picker; nothing to upload.
  }
  const asset = result.assets[0];
  await uploadDocument(kind, asset.uri, asset.fileName ?? `${kind}.jpg`);
}

// Documents tab screen.
export default function DocumentsScreen(): React.JSX.Element {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<DocumentKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Loads the farmer's uploaded documents.
  const load = useCallback(async () => {
    try {
      setError(null);
      setDocs(await listDocuments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Documents could not be loaded. Please try again.');
    }
  }, []);

  // Initial load with a full-screen spinner.
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Re-uploads one document slot, then refreshes the list.
  const reupload = useCallback(
    async (kind: DocumentKind) => {
      try {
        setUploadError(null);
        setUploading(kind);
        await pickAndUpload(kind);
        await load();
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      } finally {
        setUploading(null);
      }
    },
    [load],
  );

  const byKind = new Map(docs.map((d) => [d.kind, d]));
  const uploadedCount = SLOTS.filter(({ kind }) => byKind.get(kind)?.path).length;

  if (loading) {
    return (
      <Screen title="Documents">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Documents">
        <ErrorRetry
          message={error}
          onRetry={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Documents"
      subtitle="Your verification documents. You can re-upload any photo if needed."
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {uploadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{uploadError}</Text>
          </View>
        ) : null}
        <Card style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressText}>
              <Text style={styles.progressLabel}>
                {uploadedCount} of {SLOTS.length} uploaded
              </Text>
              <Text style={styles.progressHint}>
                {uploadedCount === SLOTS.length
                  ? 'All documents are in place.'
                  : 'Upload every document to finish verification.'}
              </Text>
            </View>
            {uploadedCount === SLOTS.length ? (
              <StatusBadge status="COMPLETED" label="Complete" />
            ) : null}
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(uploadedCount / SLOTS.length) * 100}%` },
              ]}
            />
          </View>
        </Card>
        {SLOTS.map(({ kind, label, hint, mark }) => {
          const doc = byKind.get(kind);
          const uploaded = Boolean(doc && doc.path);
          const isUploading = uploading === kind;
          return (
            <Card key={kind} style={styles.row}>
              <View
                style={[
                  styles.avatar,
                  uploaded ? styles.avatarDone : styles.avatarTodo,
                ]}
              >
                <Text
                  style={[
                    styles.avatarMark,
                    uploaded ? styles.avatarMarkDone : styles.avatarMarkTodo,
                  ]}
                >
                  {mark}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.hint}>{hint}</Text>
                <View style={styles.badgeWrap}>
                  {uploaded ? (
                    <StatusBadge status="COMPLETED" label="Uploaded" />
                  ) : (
                    <StatusBadge status="PENDING" label="Not uploaded" />
                  )}
                </View>
              </View>
              {isUploading ? (
                <ActivityIndicator color={colors.forest} style={styles.uploadSlot} />
              ) : (
                <Pressable
                  style={[styles.uploadBtn, uploaded && styles.uploadBtnRe]}
                  onPress={() => reupload(kind)}
                >
                  <Text style={[styles.uploadBtnText, uploaded && styles.uploadBtnTextRe]}>
                    {uploaded ? 'Re-upload' : 'Upload'}
                  </Text>
                </Pressable>
              )}
            </Card>
          );
        })}
        {docs.length === 0 && (
          <EmptyState title="No documents" message="Upload your documents to complete verification." />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  list: { paddingBottom: 24 },
  errorBanner: {
    backgroundColor: colors.dangerTint,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 14,
    color: colors.danger,
    fontFamily: 'BricolageGrotesque_600SemiBold',
  },
  progressCard: { marginBottom: 16 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: { flex: 1, marginRight: 12 },
  progressLabel: {
    fontSize: 18,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  progressHint: {
    fontSize: 13,
    color: colors.sage,
    marginTop: 4,
    fontFamily: 'BricolageGrotesque_500Medium',
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  progressFill: { height: 12, borderRadius: 6, backgroundColor: colors.forest },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarDone: { backgroundColor: colors.successTint },
  avatarTodo: { backgroundColor: colors.amberTint },
  avatarMark: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  avatarMarkDone: { color: colors.success },
  avatarMarkTodo: { color: colors.amberDark },
  rowText: { flex: 1, marginRight: 10 },
  label: {
    fontSize: 17,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  hint: {
    fontSize: 13,
    color: colors.sage,
    marginTop: 2,
    fontFamily: 'BricolageGrotesque_500Medium',
  },
  badgeWrap: { marginTop: 8, alignItems: 'flex-start' },
  uploadBtn: {
    backgroundColor: colors.forest,
    borderRadius: 999,
    paddingHorizontal: 24,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnRe: {
    backgroundColor: colors.ivory,
    borderWidth: 1.5,
    borderColor: colors.forest,
  },
  uploadBtnText: {
    color: colors.cream,
    fontSize: 15,
    fontFamily: 'BricolageGrotesque_700Bold',
  },
  uploadBtnTextRe: { color: colors.forest },
  uploadSlot: { width: 100 },
});
