// Offer detail — the farmer's price decision screen (v2, manager-driven sale
// flow). Shows the AI freshness score + AI price, and two big buttons:
// Accept or Decline, wired to salesService (POST /sales/{id}/accept|refuse).
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../src/components/common/Screen';
import { Card } from '../../../src/components/common/Card';
import { AppButton } from '../../../src/components/common/AppButton';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { colors } from '../../../src/theme/colors';
import {
  acceptSale,
  getSaleOffer,
  listSales,
  refuseSale,
  type SaleOffer,
  type SaleRecord,
} from '../../../src/services/salesService';

/** The offer as shown on this screen (from the sales endpoints). */
interface OfferView {
  id: string;
  quantityL: number;
  freshnessScore: number | null;
  discountPct: number | null;
  pricePerL: number | null;
  total: number | null;
  status: string;
  managerName: string | null;
  receiptNo: string | null;
}

/** Refusal reasons shown as chips on the decline dialog. */
const REFUSE_REASONS = ['The price is too low', 'I do not have time', 'Another reason'];

/** Map the offer summary to the screen's view model. */
function fromOffer(o: SaleOffer): OfferView {
  return {
    id: o.sale_id,
    quantityL: o.quantity_l,
    freshnessScore: o.freshness_score,
    discountPct: o.discount_pct,
    pricePerL: o.price_per_l,
    total: o.total_amount,
    status: 'offered',
    managerName: null,
    receiptNo: null,
  };
}

/** Map a sale list row to the screen's view model (fallback read path). */
function fromSaleRow(s: SaleRecord): OfferView {
  return {
    id: s.id,
    quantityL: s.quantity_l,
    freshnessScore: s.freshness_score,
    discountPct: null,
    pricePerL: s.price_per_l,
    total: s.total_amount,
    status: s.status,
    managerName: s.manager_name,
    receiptNo: s.receipt_no,
  };
}

/** Formats a number as "Rs 3,700". */
function formatRs(n: number): string {
  return 'Rs ' + n.toLocaleString('en-PK', { maximumFractionDigits: 1 });
}

/** Badge color key + display label for each sale status. */
function statusBadge(status: string): { status: string; label: string } {
  switch (status) {
    case 'offered': return { status: 'OFFERED', label: 'Awaiting your decision' };
    case 'accepted': return { status: 'ACCEPTED', label: 'Accepted' };
    case 'rejected': return { status: 'REFUSED', label: 'Declined' };
    case 'completed': return { status: 'COMPLETED', label: 'Completed' };
    default: return { status: status.toUpperCase(), label: status };
  }
}

/** Result message shown after the farmer decides. */
function decidedMessage(status: string): string {
  switch (status) {
    case 'accepted': return 'Offer accepted — the sale is recorded. The manager will arrange payment.';
    case 'rejected': return 'You have declined this offer.';
    case 'completed': return 'This purchase is complete.';
    default: return '';
  }
}

export default function OfferDetailScreen() {
  const router = useRouter();
  // Sale id comes from the route: /milk/offer-detail?id=<sale_id>
  const { id } = useLocalSearchParams<{ id: string }>();
  const [offer, setOffer] = useState<OfferView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRefuse, setShowRefuse] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  // Load the offer: the offer endpoint first, the farmer's sales list as fallback.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) throw new Error('No offer was selected.');
      try {
        setOffer(fromOffer(await getSaleOffer(id)));
      } catch {
        const rows = await listSales();
        const row = rows.find((s) => s.id === id);
        if (!row) throw new Error('This offer could not be found.');
        setOffer(fromSaleRow(row));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The offer could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Accept after the farmer confirms in the dialog.
  async function handleAccept() {
    if (!offer) return;
    setActing(true);
    setError(null);
    try {
      const res = await acceptSale(offer.id);
      setReceipt(res.receipt_no);
      setOffer({ ...offer, status: 'accepted', total: res.total_amount });
      setShowConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The offer could not be accepted');
    } finally {
      setActing(false);
    }
  }

  // Decline with the selected reason chip (reason is optional).
  async function handleRefuse() {
    if (!offer) return;
    setActing(true);
    setError(null);
    try {
      await refuseSale(offer.id, reason ?? undefined);
      setOffer({ ...offer, status: 'rejected' });
      setShowRefuse(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The offer could not be declined');
    } finally {
      setActing(false);
    }
  }

  // Loading state: spinner on cream.
  if (loading) {
    return (
      <Screen title="Offer details">
        <View style={styles.center}><ActivityIndicator size="large" color={colors.forest} /></View>
      </Screen>
    );
  }

  // Error state: message + retry.
  if (error && !offer) {
    return (
      <Screen title="Offer details">
        <Card>
          <Text style={styles.errorText}>{error}</Text>
          <View style={{ height: 12 }} />
          <AppButton label="Please try again" onPress={load} />
        </Card>
      </Screen>
    );
  }

  if (!offer) {
    return (
      <Screen title="Offer details">
        <Card><Text style={styles.errorText}>Offer not found</Text></Card>
      </Screen>
    );
  }

  const badge = statusBadge(offer.status);
  const isOffered = offer.status === 'offered';

  return (
    <Screen title="Offer details" subtitle={`Offer ${offer.id}`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        {/* (a) Header card: manager, litres, status */}
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.manager}>{offer.managerName ?? 'Your manager'}</Text>
              <Text style={styles.sub}>{offer.quantityL} litres of milk</Text>
            </View>
            <StatusBadge status={badge.status} label={badge.label} />
          </View>
        </Card>

        {/* (b) AI freshness score */}
        <Card>
          <Text style={styles.cardTitle}>AI freshness report</Text>
          <View style={styles.aiRow}>
            <View style={styles.ring}>
              <Text style={styles.ringScore}>
                {offer.freshnessScore != null ? Math.round(offer.freshnessScore) : '—'}
              </Text>
              <Text style={styles.ringSub}>/ 100</Text>
            </View>
            <View style={styles.aiInfo}>
              <Text style={styles.aiLabel}>Freshness score</Text>
              <Text style={styles.aiHint}>
                {offer.freshnessScore != null && offer.freshnessScore >= 85
                  ? 'Excellent quality'
                  : offer.freshnessScore != null && offer.freshnessScore >= 70
                    ? 'Average quality'
                    : offer.freshnessScore != null
                      ? 'Below-average quality'
                      : 'Score not available yet'}
              </Text>
            </View>
          </View>
        </Card>

        {/* (c) AI price */}
        <Card>
          <Text style={styles.cardTitle}>AI price</Text>
          {offer.pricePerL != null ? (
            <Text style={styles.rate}>
              {formatRs(offer.pricePerL)} <Text style={styles.perLitre}>/ litre</Text>
            </Text>
          ) : (
            <Text style={styles.rate}>Price not set yet</Text>
          )}
          {offer.total != null ? (
            <Text style={styles.total}>
              {formatRs(offer.total)} <Text style={styles.perLitre}>total ({offer.quantityL}L)</Text>
            </Text>
          ) : null}
          {offer.discountPct != null ? (
            <Text style={styles.discount}>
              AI discount: {offer.discountPct}% below market price
            </Text>
          ) : null}
        </Card>

        {/* Receipt after acceptance */}
        {receipt ? (
          <Card style={styles.receiptCard}>
            <Text style={styles.cardTitle}>Sale recorded</Text>
            <Text style={styles.receiptNo}>Receipt: {receipt}</Text>
          </Card>
        ) : null}

        {/* (d) Decision buttons only while the offer is open */}
        {isOffered ? (
          <View style={styles.actions}>
            <AppButton label="Accept" onPress={() => setShowConfirm(true)} />
            <View style={{ height: 12 }} />
            <Pressable onPress={() => setShowRefuse(true)} style={styles.declineBtn}>
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
          </View>
        ) : (
          decidedMessage(offer.status) ? (
            <Card>
              <Text style={styles.decidedTitle}>{decidedMessage(offer.status)}</Text>
            </Card>
          ) : null
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Accept confirmation dialog */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Accept the offer?</Text>
            <Text style={styles.dialogText}>
              Do you want to sell {offer.quantityL}L
              {offer.pricePerL != null ? ` at ${formatRs(offer.pricePerL)}/L` : ''}
              {offer.total != null ? `? Total: ${formatRs(offer.total)}.` : '?'}
            </Text>
            <AppButton label="Yes, accept" onPress={handleAccept} loading={acting} />
            <View style={{ height: 8 }} />
            <Pressable onPress={() => setShowConfirm(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Back</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Decline dialog with reason chips */}
      <Modal visible={showRefuse} transparent animationType="fade" onRequestClose={() => setShowRefuse(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Reason for declining</Text>
            <View style={styles.chips}>
              {REFUSE_REASONS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  style={[styles.chip, reason === r && styles.chipActive]}
                >
                  <Text style={[styles.chipText, reason === r && styles.chipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <AppButton label="Confirm decline" onPress={handleRefuse} loading={acting} />
            <View style={{ height: 8 }} />
            <Pressable onPress={() => setShowRefuse(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Back</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 16, color: colors.forest, fontWeight: '700', marginBottom: 12 },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center' },
  inlineError: { fontSize: 14, color: colors.danger, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manager: { fontSize: 19, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  sub: { fontSize: 14, color: colors.sage, marginTop: 4 },
  cardTitle: { fontSize: 16, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold', marginBottom: 12 },
  aiRow: { flexDirection: 'row', alignItems: 'center' },
  ring: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 10, borderColor: colors.forest,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream,
  },
  ringScore: { fontSize: 34, color: colors.forest, fontFamily: 'BricolageGrotesque_700Bold' },
  ringSub: { fontSize: 12, color: colors.sage },
  aiInfo: { marginLeft: 20, flex: 1 },
  aiLabel: { fontSize: 13, color: colors.sage },
  aiHint: { fontSize: 14, color: colors.ink, fontWeight: '600', marginTop: 6 },
  rate: { fontSize: 32, color: colors.forest, fontFamily: 'BricolageGrotesque_700Bold' },
  perLitre: { fontSize: 15, fontWeight: '400', color: colors.sage },
  total: { fontSize: 22, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold', marginTop: 6 },
  discount: { fontSize: 13, color: colors.amberDark, marginTop: 8, fontWeight: '600' },
  receiptCard: { backgroundColor: colors.successTint },
  receiptNo: { fontSize: 17, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  actions: { marginTop: 4 },
  declineBtn: {
    height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.danger, backgroundColor: 'transparent',
  },
  declineText: { fontSize: 17, color: colors.danger, fontFamily: 'BricolageGrotesque_700Bold' },
  decidedTitle: { fontSize: 15, color: colors.ink, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.ivory, borderRadius: 20, padding: 20, width: '100%' },
  dialogTitle: { fontSize: 19, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold', marginBottom: 8 },
  dialogText: { fontSize: 15, color: colors.ink, lineHeight: 22, marginBottom: 16 },
  cancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.sage },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, marginBottom: 8 },
  chipActive: { borderColor: colors.forest, backgroundColor: colors.successTint },
  chipText: { fontSize: 14, color: colors.sage, fontWeight: '600' },
  chipTextActive: { color: colors.forest },
});
