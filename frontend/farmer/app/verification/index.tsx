// app/verification/index.tsx
// SuperAdmin verification status tracker.
// Reads the REAL status from verificationService.getVerificationStatus():
//   pending  -> amber "in progress" card + Refresh (real re-check)
//   verified -> green card + "Get started" to the home dashboard
//   rejected -> red card with the REAL backend rejection reason + "Resubmit"
//              back to onboarding Step 1 (Step 1 prefills saved data).
// No mock reasons, no dead buttons.

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/common/Screen';
import { AppButton } from '../../src/components/common/AppButton';
import { Card } from '../../src/components/common/Card';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { colors } from '../../src/theme/colors';
import { font } from '../../src/theme/theme';
import {
  getVerificationStatus,
  type VerificationResult,
} from '../../src/services/verificationService';

/** The three onboarding stages shown in the tracker. */
const STAGES = ['Details', 'Verification', 'Approval'];

/** Map a backend verification state to the active tracker stage index. */
function stageIndexFor(status: VerificationResult['status']): number {
  switch (status) {
    case 'verified':
      return 2;
    case 'rejected':
      return 1;
    default:
      return 1;
  }
}

/** Horizontal 3-stage progress tracker: check marks for finished stages,
 *  an amber ring for the current stage, and center-to-center connectors. */
function StageTracker({ active }: { active: number }): React.JSX.Element {
  return (
    <View style={styles.tracker}>
      {STAGES.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <View key={label} style={styles.stage}>
            {i < STAGES.length - 1 ? (
              <View style={[styles.connector, done && styles.connectorDone]} />
            ) : null}
            <View
              style={[
                styles.dot,
                done && styles.dotDone,
                current && styles.dotCurrent,
              ]}
            >
              {done ? <Text style={styles.dotCheck}>✓</Text> : null}
              {current ? <View style={styles.dotInner} /> : null}
            </View>
            <Text style={[styles.stageLabel, (done || current) && styles.stageLabelOn]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Verification status screen. */
export default function VerificationStatusScreen(): React.JSX.Element {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  /** Load the real verification state from the backend. */
  const loadStatus = useCallback(async () => {
    setError('');
    const v = await getVerificationStatus();
    setResult(v);
  }, []);

  // Load once when the screen opens.
  useEffect(() => {
    loadStatus()
      .catch(() => setError('Status could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, [loadStatus]);

  /** Re-check the status (the SuperAdmin may have decided since). */
  async function refresh(): Promise<void> {
    setRefreshing(true);
    try {
      await loadStatus();
    } catch {
      setError('Refresh failed. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || !result) {
    return (
      <Screen title="Verification status">
        <View style={styles.center}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{error}</Text>
              <View style={{ height: 16 }} />
              <AppButton
                label="Retry"
                variant="outline"
                onPress={() => {
                  setLoading(true);
                  loadStatus()
                    .catch(() => setError('Status could not be loaded. Please try again.'))
                    .finally(() => setLoading(false));
                }}
              />
            </View>
          ) : (
            <ActivityIndicator size="large" color={colors.forest} />
          )}
        </View>
      </Screen>
    );
  }

  const badgeStatus = result.status === 'verified' ? 'APPROVED' : result.status === 'rejected' ? 'REJECTED' : 'PENDING';
  const badgeLabel = result.status === 'verified' ? 'Approved' : result.status === 'rejected' ? 'Rejected' : 'Verification in progress';

  return (
    <Screen title="Verification status">
      <StageTracker active={stageIndexFor(result.status)} />
      <View style={{ height: 20 }} />

      {result.status === 'pending' ? (
        <Card style={[styles.statusCard, styles.cardPending]}>
          <View style={styles.badgeRow}>
            <StatusBadge status={badgeStatus} label={badgeLabel} />
          </View>
          <Text style={styles.cardTitle}>Please wait</Text>
          <Text style={styles.cardText}>
            The SuperAdmin is reviewing your details. This may take 24-48 hours.
            You will be notified as soon as you are approved.
          </Text>
          <View style={styles.action}>
            <AppButton label="Refresh status" onPress={refresh} loading={refreshing} variant="outline" />
          </View>
        </Card>
      ) : null}

      {result.status === 'verified' ? (
        <Card style={[styles.statusCard, styles.cardVerified]}>
          <View style={styles.badgeRow}>
            <StatusBadge status={badgeStatus} label={badgeLabel} />
          </View>
          <Text style={styles.cardTitle}>Congratulations</Text>
          <Text style={styles.cardText}>
            Your verification is complete. Now choose the area manager you will sell your milk to.
          </Text>
          <View style={styles.action}>
            <AppButton label="Select your manager" onPress={() => router.replace('/(tabs)/managers')} />
          </View>
          <View style={styles.action}>
            <AppButton label="Get started" onPress={() => router.replace('/(tabs)/home')} variant="outline" />
          </View>
        </Card>
      ) : null}

      {result.status === 'rejected' ? (
        <Card style={[styles.statusCard, styles.cardRejected]}>
          <View style={styles.badgeRow}>
            <StatusBadge status={badgeStatus} label={badgeLabel} />
          </View>
          <Text style={styles.cardTitle}>Reason</Text>
          <Text style={styles.cardText}>
            {result.rejection_reason?.trim()
              ? result.rejection_reason
              : 'Your details were not approved. Please check them and submit again.'}
          </Text>
          <View style={styles.action}>
            <AppButton label="Resubmit details" onPress={() => router.push('/onboarding/personal')} />
          </View>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { width: '100%', alignItems: 'center' },
  tracker: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  stage: { flex: 1, alignItems: 'center' },
  connector: {
    position: 'absolute',
    top: 18,
    left: '50%',
    right: '-50%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  connectorDone: { backgroundColor: colors.forest },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.forest },
  dotCurrent: { backgroundColor: colors.amber, borderWidth: 4, borderColor: colors.amberTint },
  dotCheck: { color: colors.cream, fontSize: 18, fontFamily: font.bold },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.forestDeep },
  stageLabel: {
    fontSize: 13,
    color: colors.sage,
    marginTop: 8,
    fontFamily: font.semibold,
    textAlign: 'center',
  },
  stageLabelOn: { color: colors.ink, fontFamily: font.bold },
  statusCard: { marginTop: 8, padding: 24 },
  cardPending: { borderWidth: 2, borderColor: colors.amber, backgroundColor: colors.amberTint },
  cardVerified: { borderWidth: 2, borderColor: colors.success, backgroundColor: colors.successTint },
  cardRejected: { borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.dangerTint },
  badgeRow: { alignItems: 'flex-start', marginBottom: 4 },
  cardTitle: {
    fontSize: 28,
    color: colors.ink,
    marginTop: 12,
    fontFamily: font.bold,
  },
  cardText: {
    fontSize: 17,
    color: colors.ink,
    marginTop: 10,
    lineHeight: 26,
    fontFamily: font.regular,
  },
  action: { marginTop: 20 },
  error: { color: colors.danger, fontSize: 14, marginTop: 12, textAlign: 'center', fontFamily: font.regular },
});
