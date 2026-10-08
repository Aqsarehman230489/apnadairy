// app/(tabs)/home/index.tsx
// Farmer Home tab — dashboard cards only.
// Four colorful stat cards (forest, deep gold, muted olive-teal, deep forest)
// with big numbers and small sub-lines, a verification banner while the
// SuperAdmin review is pending, the registered manager card with a real
// "Call manager" action, and a full-width "Select manager" outline button at
// the end that opens the Managers tab. No graphs, no lists. Ultra-simple
// layout for low-literacy farmers.
// Data: dashboardService.getFarmerStats() + getDashboardSummary() — real
// FastAPI endpoints, no mocks. Sub-lines use only fields the backend
// returns; anything unavailable is omitted, never invented.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getDashboardSummary,
  getFarmerStats,
  type FarmerStats,
  type DashboardManager,
} from '../../../src/services/dashboardService';
import { AppButton } from '../../../src/components/common/AppButton';
import { Card } from '../../../src/components/common/Card';
import { colors } from '../../../src/theme/colors';
import { font } from '../../../src/theme/theme';

// Formats a number with thousands separators for Rs values.
function formatRs(value: number): string {
  return `Rs ${value.toLocaleString('en-PK')}`;
}

// Muted olive-teal tint of the landing-page forest family (not a theme token;
// no other file was touched). All card colors stay in the family: forest,
// deep gold, olive-teal, deep forest. NO random bright colors.
const oliveTeal = '#4c6b58';

// Local colorful stat card: colored background, ivory text, big number.
// StatCard (shared) is the shared cream card, so the colored variants live
// here in the screen's own styles.
function ColoredStatCard({
  label,
  value,
  sublines,
  backgroundColor,
}: {
  label: string;
  value: string;
  sublines: string[];
  backgroundColor: string;
}): React.JSX.Element {
  return (
    <View style={[styles.statCard, { backgroundColor }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sublines.map((line) => (
        <Text key={line} style={styles.statSub}>
          {line}
        </Text>
      ))}
    </View>
  );
}

// Farmer Home dashboard screen.
export default function FarmerHomeScreen(): React.JSX.Element {
  const router = useRouter();
  const [stats, setStats] = useState<FarmerStats | null>(null);
  const [manager, setManager] = useState<DashboardManager | null>(null);
  const [farmerName, setFarmerName] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loads stats (real backend) and the profile summary.
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [s, summary] = await Promise.all([getFarmerStats(), getDashboardSummary()]);
      setStats(s);
      setManager(s.registered_manager ? summary.manager : null);
      setFarmerName(summary.farmerName);
      setVerificationPending(summary.verificationStatus !== 'APPROVED');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data. Please try again.');
    }
  }, []);

  // Initial load with a full-screen spinner.
  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Pull-to-refresh handler.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Opens the phone dialer with the manager's number (real action).
  const callManager = useCallback(() => {
    if (manager) {
      Linking.openURL(`tel:${manager.phone}`).catch(() => {
        setError('Could not open the phone dialer.');
      });
    }
  }, [manager]);

  // Opens the Managers tab where the farmer picks one manager.
  const goToManagers = useCallback(() => {
    router.push('/(tabs)/managers');
  }, [router]);

  if (loading || !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.forest} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Pending money = all revenue minus what has been received (backend returns
  // only these two fields, so the split is derived from real fields only).
  const pendingRs = Math.max(0, stats.total_revenue - stats.money_earned);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.forest} />
      }
    >
      {/* Error banner with retry */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <AppButton label="Please try again" onPress={onRefresh} variant="outline" />
        </View>
      )}

      {/* Simple greeting */}
      <Text style={styles.hello}>Hello,</Text>
      <Text style={styles.name}>{farmerName || 'Farmer'}</Text>

      {/* Verification banner: shown until the SuperAdmin approves */}
      {verificationPending && (
        <View style={styles.verifyBanner}>
          <Text style={styles.verifyText}>
            Verification in progress — the SuperAdmin is reviewing your details.
          </Text>
        </View>
      )}

      {/* Dashboard stat cards: one color each, big numbers, small sub-lines */}
      <View style={styles.grid}>
        <View style={styles.row}>
          <ColoredStatCard
            label="Total milk sold"
            value={`${stats.total_milk_l} L`}
            sublines={['all time', `${stats.total_sales} sales`]}
            backgroundColor={colors.forest}
          />
          <ColoredStatCard
            label="Today's sale"
            value={`${stats.today_milk_l} L`}
            sublines={['today']}
            backgroundColor={oliveTeal}
          />
        </View>
        <View style={styles.row}>
          <ColoredStatCard
            label="Total revenue"
            value={formatRs(stats.total_revenue)}
            sublines={['all sales']}
            backgroundColor={colors.amberDark}
          />
          <ColoredStatCard
            label="Money earned"
            value={formatRs(stats.money_earned)}
            sublines={['received', `pending ${formatRs(pendingRs)}`]}
            backgroundColor={colors.forestDeep}
          />
        </View>
      </View>

      {/* Registered manager card with a clear Call button */}
      {manager ? (
        <Card style={styles.managerCard}>
          <View style={styles.managerAccent} />
          <Text style={styles.managerLabel}>Registered manager</Text>
          <Text style={styles.managerShop}>{manager.shopName}</Text>
          <Text style={styles.managerLine}>{manager.name}</Text>
          <Text style={styles.managerLine}>{manager.phone}</Text>
          <View style={styles.callWrap}>
            <AppButton label="Call manager" onPress={callManager} />
          </View>
        </Card>
      ) : (
        <Card style={styles.managerCard}>
          <Text style={styles.noManagerText}>
            No manager assigned yet — please contact the SuperAdmin.
          </Text>
        </Card>
      )}

      {/* Full-width outline button at the very end: pick a manager */}
      <View style={styles.selectWrap}>
        <AppButton label="Select manager" onPress={goToManagers} variant="outline" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 32 },
  center: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: font.small, color: colors.sage, marginTop: 12, fontFamily: font.regular },
  hello: { fontSize: font.small, color: colors.sage, fontFamily: font.regular },
  name: { fontSize: font.h1, color: colors.ink, fontFamily: font.bold, marginBottom: 20 },
  verifyBanner: {
    backgroundColor: colors.amberTint,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  verifyText: { fontSize: font.small, color: colors.ink, fontFamily: font.semibold, lineHeight: 22 },
  errorBanner: {
    backgroundColor: colors.dangerTint,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  errorText: { fontSize: font.small, color: colors.ink, fontFamily: font.semibold, marginBottom: 12 },
  grid: { marginHorizontal: -6 },
  row: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  statCard: { flex: 1, margin: 6, borderRadius: 20, padding: 16 },
  statLabel: { fontSize: 13, color: colors.ivory, opacity: 0.85, fontFamily: font.regular },
  statValue: {
    fontSize: 30,
    color: colors.ivory,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    marginTop: 6,
  },
  statSub: { fontSize: 12, color: colors.ivory, opacity: 0.85, fontFamily: font.regular, marginTop: 4 },
  managerCard: { marginTop: 16, borderWidth: 2, borderColor: colors.forest },
  managerAccent: {
    backgroundColor: colors.amber,
    borderRadius: 4,
    height: 8,
    width: 64,
    marginBottom: 12,
  },
  managerLabel: { fontSize: 13, color: colors.forest, fontFamily: font.semibold },
  managerShop: { fontSize: font.h2, color: colors.ink, fontFamily: font.bold, marginTop: 6 },
  managerLine: { fontSize: font.body, color: colors.sage, fontFamily: font.regular, marginTop: 4 },
  callWrap: { marginTop: 16 },
  noManagerText: { fontSize: font.small, color: colors.sage, fontFamily: font.regular, lineHeight: 22 },
  selectWrap: { marginTop: 20 },
});
