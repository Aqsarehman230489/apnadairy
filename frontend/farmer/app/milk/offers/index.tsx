// Offers list — the manager-driven sales where the manager sent the farmer an
// offer (or the sale history). Newest first. Tapping a card opens the offer
// detail screen (/milk/offer-detail) where the farmer accepts or refuses.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { colors } from '../../../src/theme/colors';
import { listSales, type SaleRecord } from '../../../src/services/salesService';

/** Formats a number as "Rs 3,700". */
function formatRs(n: number): string {
  return 'Rs ' + n.toLocaleString('en-PK', { maximumFractionDigits: 1 });
}

/** Formats an ISO date string into a short readable date. */
function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Badge color key + display label for each sale status. */
function saleBadge(s: SaleRecord): { status: string; label: string } {
  switch (s.status) {
    case 'offered': return { status: 'OFFERED', label: 'Awaiting decision' };
    case 'accepted': return { status: 'ACCEPTED', label: 'Accepted' };
    case 'rejected': return { status: 'REFUSED', label: 'Declined' };
    case 'completed': return { status: 'COMPLETED', label: 'Completed' };
    default: return { status: s.status.toUpperCase(), label: s.status };
  }
}

export default function OffersScreen() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all sales (offers) for this farmer.
  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listSales();
      // Newest first.
      rows.sort((a, b) => (b.collected_at ?? '').localeCompare(a.collected_at ?? ''));
      setSales(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Offers could not be loaded');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pull-to-refresh handler.
  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <Screen title="My offers" subtitle="All your offers in one place">
        <View style={styles.center}><ActivityIndicator size="large" color={colors.forest} /></View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="My offers" subtitle="All your offers in one place">
        <Card>
          <Text style={styles.errorText}>{error}</Text>
          <View style={{ height: 12 }} />
          <AppButton label="Please try again" onPress={load} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="My offers" subtitle="All your offers in one place">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.forest} />}
      >
        {sales.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No offers received yet</Text>
          </Card>
        ) : (
          sales.map((s) => {
            const badge = saleBadge(s);
            return (
              <Pressable key={s.id} onPress={() => router.push(`/milk/offer-detail?id=${s.id}`)}>
                <Card style={styles.card}>
                  <View style={styles.rowBetween}>
                    <View style={styles.left}>
                      <Text style={styles.manager}>{s.manager_name ?? 'Your manager'}</Text>
                      <Text style={styles.sub}>
                        {s.quantity_l} L
                        {s.price_per_l != null ? ` · ${formatRs(s.price_per_l)}/L` : ''}
                        {s.freshness_score != null ? ` · AI ${Math.round(s.freshness_score)}` : ''}
                        {formatDate(s.collected_at) ? ` · ${formatDate(s.collected_at)}` : ''}
                      </Text>
                      {s.total_amount != null ? (
                        <Text style={styles.total}>{formatRs(s.total_amount)}</Text>
                      ) : null}
                    </View>
                    <StatusBadge status={badge.status} label={badge.label} />
                  </View>
                  {s.status === 'offered' ? (
                    <Text style={styles.tap}>View and decide ›</Text>
                  ) : (
                    <Text style={styles.tap}>View details ›</Text>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center' },
  empty: { fontSize: 15, color: colors.sage, textAlign: 'center' },
  card: { marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flex: 1, marginRight: 12 },
  manager: { fontSize: 17, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  sub: { fontSize: 13, color: colors.sage, marginTop: 4 },
  total: { fontSize: 19, color: colors.forest, fontFamily: 'BricolageGrotesque_700Bold', marginTop: 6 },
  tap: { fontSize: 13, color: colors.forest, fontWeight: '700', marginTop: 10 },
});
