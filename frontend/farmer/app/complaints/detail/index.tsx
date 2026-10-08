// Complaint detail: full message, status timeline, admin reply card.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { ErrorRetry } from '../../../src/components/common/ErrorRetry';
import { colors } from '../../../src/theme/colors';
import type { Complaint } from '../../../src/types/farmerModels';
import { getComplaint } from '../../../src/services/engagementService';

/** English label per complaint status. */
const STATUS_LABEL: Record<Complaint['status'], string> = {
  OPEN: 'Open',
  IN_REVIEW: 'Under review',
  RESOLVED: 'Resolved',
};

/** Timeline step index for a complaint status. */
function stepIndex(status: Complaint['status']): number {
  if (status === 'OPEN') return 0;
  if (status === 'IN_REVIEW') return 1;
  return 2;
}

/** Three-step horizontal status timeline: Submitted > Review > Resolved. */
function Timeline({ status }: { status: Complaint['status'] }) {
  const steps = ['Submitted', 'Review', 'Resolved'];
  const active = stepIndex(status);
  return (
    <View style={styles.timeline}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <View style={styles.step}>
            <View
              style={[
                styles.dot,
                i < active && styles.dotDone,
                i === active && styles.dotActive,
              ]}
            >
              {i < active ? <Text style={styles.dotCheck}>✓</Text> : null}
            </View>
            <Text style={[styles.stepLabel, i <= active && styles.stepLabelActive]}>{label}</Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[styles.connector, i < active && styles.connectorDone]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/** Complaint detail screen. */
export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Load the complaint by id. */
  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setComplaint(await getComplaint(id ?? ''));
    } catch {
      setError('Could not load the complaint details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Screen title="Complaint details">
        <View style={styles.center}><ActivityIndicator size="large" color={colors.forest} /></View>
      </Screen>
    );
  }

  if (error || !complaint) {
    return (
      <Screen title="Complaint details">
        <ErrorRetry message={error ?? 'Complaint not found.'} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen title="Complaint details">
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.rowTop}>
            <Text style={styles.category}>{complaint.category}</Text>
            <StatusBadge status={complaint.status} label={STATUS_LABEL[complaint.status]} />
          </View>
          <Text style={styles.message}>{complaint.message}</Text>
          <Text style={styles.date}>{complaint.date}</Text>
        </Card>

        <Text style={styles.section}>Progress</Text>
        <Card>
          <Timeline status={complaint.status} />
        </Card>

        {complaint.adminReply && (
          <>
            <Text style={styles.section}>Admin response</Text>
            <Card style={styles.replyCard}>
              <Text style={styles.reply}>{complaint.adminReply}</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  body: { paddingBottom: 24 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  category: { fontSize: 13, color: colors.sage, fontFamily: 'BricolageGrotesque_700Bold' },
  message: { fontSize: 16, color: colors.ink, lineHeight: 24, fontFamily: 'BricolageGrotesque_400Regular' },
  date: { fontSize: 12, color: colors.sage, marginTop: 10, fontFamily: 'BricolageGrotesque_400Regular' },
  section: { fontSize: 16, color: colors.ink, marginTop: 20, marginBottom: 12, fontFamily: 'BricolageGrotesque_700Bold' },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  step: { alignItems: 'center', width: 72 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.forest },
  dotActive: { backgroundColor: colors.amber, borderWidth: 4, borderColor: colors.amberTint },
  dotCheck: { color: colors.cream, fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold' },
  stepLabel: { fontSize: 12, color: colors.sage, marginTop: 8, fontFamily: 'BricolageGrotesque_600SemiBold' },
  stepLabelActive: { color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  connector: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.line, marginTop: 13 },
  connectorDone: { backgroundColor: colors.forest },
  replyCard: { borderLeftWidth: 4, borderLeftColor: colors.amber },
  reply: { fontSize: 15, color: colors.ink, lineHeight: 23 },
});
