// Milk request detail — shows where the request stands in the process:
// a vertical timeline (sent -> viewed -> testing -> offer) plus request info.
// When the manager has sent an offer, a button jumps to the offer detail.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { colors } from '../../../src/theme/colors';
import { getRequest, getOfferForRequest } from '../../../src/services/milkService';
import type { MilkRequest, Offer } from '../../../src/types/farmerModels';

/** One timeline step: label + visual state. */
interface Step {
  label: string;
  state: 'done' | 'current' | 'pending';
}

/** Build the 4 timeline steps from the request status. */
function buildSteps(req: MilkRequest, hasOffer: boolean): Step[] {
  const order = ['SENT', 'VIEWED', 'TESTING', 'OFFERED'] as const;
  const idx = order.indexOf(req.status === 'CLOSED' ? 'OFFERED' : req.status);
  const labels = ['Sent', 'Viewed by manager', 'Testing in progress', hasOffer ? 'Offer received' : 'Offer pending'];
  return labels.map((label, i) => ({
    label,
    state: i < idx ? 'done' : i === idx ? 'current' : 'pending',
  }));
}

/** Display label for each request status. */
function statusLabel(s: MilkRequest['status']): string {
  const map: Record<MilkRequest['status'], string> = {
    SENT: 'Sent', VIEWED: 'Viewed', TESTING: 'Testing',
    OFFERED: 'Offer received', CLOSED: 'Closed',
  };
  return map[s];
}

export default function RequestDetailScreen() {
  const router = useRouter();
  // Request id from route: /milk/request-detail?id=REQ-88
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<MilkRequest | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load request and any linked offer together.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reqId = id ?? 'REQ-88';
      const [req, linked] = await Promise.all([getRequest(reqId), getOfferForRequest(reqId)]);
      setRequest(req);
      setOffer(linked);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Screen title="Request details">
        <View style={styles.center}><ActivityIndicator size="large" color={colors.forest} /></View>
      </Screen>
    );
  }

  if (error || !request) {
    return (
      <Screen title="Request details">
        <Card>
          <Text style={styles.errorText}>{error ?? 'Request not found'}</Text>
          <View style={{ height: 12 }} />
          <AppButton label="Please try again" onPress={load} />
        </Card>
      </Screen>
    );
  }

  const steps = buildSteps(request, offer !== null);

  return (
    <Screen title="Request details" subtitle={`Request ${request.id}`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        {/* Request info card */}
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.litres}>{request.litres} litre</Text>
              <Text style={styles.sub}>{request.managerName} • {request.createdAt}</Text>
            </View>
            <StatusBadge status={request.status} label={statusLabel(request.status)} />
          </View>
        </Card>

        {/* Vertical timeline */}
        <Card>
          <Text style={styles.cardTitle}>Request progress</Text>
          {steps.map((step, i) => (
            <View key={step.label} style={styles.stepRow}>
              <View style={styles.dotCol}>
                <View style={[
                  styles.dot,
                  step.state === 'done' && styles.dotDone,
                  step.state === 'current' && styles.dotCurrent,
                ]} />
                {i < steps.length - 1 && (
                  <View style={[styles.line, step.state === 'done' && styles.lineDone]} />
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                step.state === 'pending' && styles.stepPending,
                step.state === 'current' && styles.stepCurrent,
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </Card>

        {/* Jump to the offer when one exists */}
        {offer && (
          <AppButton
            label="View offer"
            onPress={() => router.push(`/milk/offer-detail?id=${offer.id}`)}
          />
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 16, color: colors.forest, fontWeight: '700', marginBottom: 12 },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  litres: { fontSize: 22, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  sub: { fontSize: 13, color: colors.sage, marginTop: 4 },
  cardTitle: { fontSize: 16, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dotCol: { width: 24, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.line, borderWidth: 2, borderColor: colors.sage },
  dotDone: { backgroundColor: colors.forest, borderColor: colors.forest },
  dotCurrent: { backgroundColor: colors.amber, borderColor: colors.amber },
  line: { width: 2, height: 28, backgroundColor: colors.line, marginVertical: 2 },
  lineDone: { backgroundColor: colors.forest },
  stepLabel: { fontSize: 15, color: colors.ink, fontWeight: '600', marginLeft: 12, paddingTop: 1 },
  stepPending: { color: colors.sage, fontWeight: '400' },
  stepCurrent: { color: colors.forest, fontWeight: '700' },
});
