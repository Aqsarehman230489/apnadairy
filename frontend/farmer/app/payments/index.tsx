// Payments tab — total received + pending summary, filter chips
// (All / Received / Pending), and the payment history list.
// Tapping a payment opens its receipt detail screen.
// Real data via paymentService (GET /api/v1/farmer/payments).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/common/Screen';
import { Card } from '../../src/components/common/Card';
import { StatCard } from '../../src/components/common/StatCard';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { ErrorRetry } from '../../src/components/common/ErrorRetry';
import { EmptyState } from '../../src/components/common/EmptyState';
import { colors } from '../../src/theme/colors';
import {
  PaymentRecord,
  PaymentSummary,
  getPayments,
  getSummary,
} from '../../src/services/paymentService';

// Filter chip options on top of the history list.
type Filter = 'ALL' | 'PAID' | 'DUE';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'Received' },
  { key: 'DUE', label: 'Pending' },
];

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

// One payment card row: purchase ref, date, litres x rate, amount, status.
function PaymentCard({ payment }: { payment: PaymentRecord }): React.JSX.Element {
  // Opens the receipt detail screen for this payment.
  const openDetail = useCallback(() => {
    router.push(`/payments/detail?id=${encodeURIComponent(payment.id)}`);
  }, [payment.id]);

  return (
    <Pressable onPress={openDetail} style={styles.cardPress}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.ref}>{payment.purchaseRef}</Text>
          <StatusBadge status={payment.status} label={statusLabel(payment.status)} />
        </View>
        <Text style={styles.sub}>
          {payment.date} — {payment.managerName}
        </Text>
        <View style={styles.rowDivider} />
        <View style={styles.rowBetween}>
          <Text style={styles.meta}>
            {payment.litres} L x Rs {payment.ratePerLitre}
            {payment.method ? ` — ${payment.method}` : ''}
          </Text>
          <Text style={styles.amount}>Rs {formatRs(payment.amount)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

// Farmer Payments tab screen.
export default function FarmerPaymentsScreen(): React.JSX.Element {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Loads summary + history from the payment service.
  const load = useCallback(async () => {
    try {
      setError(null);
      const [s, list] = await Promise.all([getSummary(), getPayments()]);
      setSummary(s);
      setPayments(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Data could not be loaded. Please try again.');
    }
  }, []);

  // Initial load with a full-screen spinner.
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Pull-to-refresh handler.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Applies the selected filter chip to the history list.
  const filtered = useMemo(() => {
    if (filter === 'PAID') return payments.filter((p) => p.status === 'PAID');
    if (filter === 'DUE') return payments.filter((p) => p.status !== 'PAID');
    return payments;
  }, [payments, filter]);

  if (loading) {
    return (
      <Screen title="Payments">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      </Screen>
    );
  }

  if (error || !summary) {
    return (
      <Screen title="Payments">
        <ErrorRetry
          message={error ?? 'Data could not be loaded.'}
          onRetry={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Payments">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.forest} />
        }
      >
        {/* Summary cards: total received + pending */}
        <View style={styles.summaryRow}>
          <StatCard
            label="Total received"
            value={`Rs ${formatRs(summary.totalReceived)}`}
            caption="so far"
          />
          <StatCard
            label="Pending"
            value={`Rs ${formatRs(summary.pending)}`}
            caption="still to be received"
          />
        </View>

        {/* Filter chips */}
        <View style={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* History section */}
        <Text style={styles.sectionTitle}>History</Text>
        {filtered.length === 0 ? (
          <EmptyState title="No payments" message="No payments found for this filter." />
        ) : (
          filtered.map((p) => <PaymentCard key={p.id} payment={p} />)
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  list: { paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  chips: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 20,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { fontSize: 14, color: colors.ink, fontFamily: 'BricolageGrotesque_600SemiBold' },
  chipTextActive: { color: colors.cream },
  sectionTitle: {
    fontSize: 16,
    color: colors.ink,
    fontFamily: 'BricolageGrotesque_700Bold',
    marginTop: 4,
    marginBottom: 12,
  },
  cardPress: { marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowDivider: { height: 1, backgroundColor: colors.line, marginTop: 10, marginBottom: 10 },
  ref: { fontSize: 15, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  sub: { fontSize: 12, color: colors.sage, fontFamily: 'BricolageGrotesque_400Regular', marginTop: 2 },
  meta: { fontSize: 13, color: colors.sage, fontFamily: 'BricolageGrotesque_400Regular' },
  amount: { fontSize: 18, color: colors.forest, fontFamily: 'BricolageGrotesque_800ExtraBold' },
});
