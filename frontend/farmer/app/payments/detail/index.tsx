// Payment detail screen — one payment's full receipt: purchase ref,
// manager, date, litres, rate per litre, total amount, method, and a
// 3-step status timeline (Purchase > Payment in progress > Received).
// Real data via paymentService.getPayment(id).

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { ErrorRetry } from '../../../src/components/common/ErrorRetry';
import { colors } from '../../../src/theme/colors';
import { PaymentRecord, getPayment } from '../../../src/services/paymentService';

// Formats a number with thousands separators for Rs values.
function formatRs(value: number): string {
  return value.toLocaleString('en-PK');
}

// English label for a payment status.
function statusLabel(status: PaymentRecord['status']): string {
  if (status === 'PAID') return 'Received';
  if (status === 'PENDING') return 'Pending';
  return 'Partially received';
}

// One row of the detail card: sage label, ink value.
function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// Timeline step visual state.
type StepState = 'done' | 'current' | 'todo';

// One step of the 3-step payment timeline.
function TimelineStep({
  label,
  state,
  isLast,
}: {
  label: string;
  state: StepState;
  isLast: boolean;
}): React.JSX.Element {
  const dotColor =
    state === 'done' ? colors.forest : state === 'current' ? colors.amber : colors.line;
  return (
    <View style={styles.step}>
      <View style={styles.stepDotWrap}>
        <View style={[styles.stepDot, { backgroundColor: dotColor }]}>
          {state === 'done' && <Text style={styles.stepCheck}>✓</Text>}
        </View>
        {!isLast && <View style={styles.stepLine} />}
      </View>
      <Text style={[styles.stepLabel, state === 'todo' && styles.stepLabelTodo]}>{label}</Text>
    </View>
  );
}

// Payment detail screen.
export default function PaymentDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Loads the payment by the id passed in the route params.
  const load = useCallback(async () => {
    try {
      setError(null);
      setPayment(await getPayment(id ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This payment could not be loaded.');
    }
  }, [id]);

  // Initial load with a full-screen spinner.
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      </Screen>
    );
  }

  if (error || !payment) {
    return (
      <Screen>
        <ErrorRetry
          message={error ?? 'This payment was not found.'}
          onRetry={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </Screen>
    );
  }

  // Derives the 3-step timeline states from the payment status.
  const inProgressState: StepState = payment.status === 'PENDING' ? 'current' : 'done';
  const receivedState: StepState =
    payment.status === 'PAID' ? 'done' : payment.status === 'PARTIALLY_PAID' ? 'current' : 'todo';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {/* Back + title */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.title}>Payment detail</Text>
        </View>

        {/* Detail card */}
        <Card style={styles.card}>
          <View style={styles.refRow}>
            <Text style={styles.ref}>{payment.purchaseRef}</Text>
            <StatusBadge status={payment.status} label={statusLabel(payment.status)} />
          </View>
          <DetailRow label="Manager" value={payment.managerName} />
          <DetailRow label="Date" value={payment.date} />
          <DetailRow label="Milk" value={`${payment.litres} L`} />
          <DetailRow label="Rate" value={`Rs ${payment.ratePerLitre} / L`} />
          <DetailRow label="Method" value={payment.method} />
          <View style={styles.divider} />
          <Text style={styles.totalLabel}>Total amount</Text>
          <Text style={styles.total}>Rs {formatRs(payment.amount)}</Text>
        </Card>

        {/* Status timeline */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <TimelineStep label="Purchase confirmed" state="done" isLast={false} />
          <TimelineStep label="Payment in progress" state={inProgressState} isLast={false} />
          <TimelineStep label="Amount received" state={receivedState} isLast={true} />
        </Card>

        {/* Pending note: reassurance while waiting */}
        {payment.status === 'PENDING' && (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              Payment will arrive soon — the manager has confirmed the purchase.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  list: { paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  title: {
    fontSize: 22,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginLeft: 4,
  },
  card: { marginBottom: 12 },
  refRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  ref: { fontSize: 18, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: { fontSize: 14, color: colors.sage, fontFamily: 'BricolageGrotesque_400Regular' },
  value: { fontSize: 15, color: colors.ink, fontFamily: 'BricolageGrotesque_600SemiBold' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
  totalLabel: { fontSize: 13, color: colors.sage, fontFamily: 'BricolageGrotesque_400Regular' },
  total: { fontSize: 40, color: colors.forest, fontFamily: 'BricolageGrotesque_800ExtraBold' },
  cardTitle: {
    fontSize: 17,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginBottom: 16,
  },
  step: { flexDirection: 'row' },
  stepDotWrap: { alignItems: 'center', marginRight: 12 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepCheck: { fontSize: 14, color: colors.cream, fontFamily: 'BricolageGrotesque_700Bold' },
  stepLine: { width: 3, flex: 1, backgroundColor: colors.line, marginVertical: 4, borderRadius: 2 },
  stepLabel: {
    fontSize: 15,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_600SemiBold',
    paddingBottom: 18,
    paddingTop: 2,
  },
  stepLabelTodo: { color: colors.sage, fontFamily: 'BricolageGrotesque_400Regular' },
  note: {
    backgroundColor: colors.amberTint,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  noteText: { fontSize: 14, color: colors.ink, fontFamily: 'BricolageGrotesque_600SemiBold', lineHeight: 20 },
});
