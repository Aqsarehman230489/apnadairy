// Small colored status pill.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const MAP: Record<string, { bg: string; fg: string }> = {
  APPROVED: { bg: colors.successTint, fg: colors.success },
  PAID: { bg: colors.successTint, fg: colors.success },
  COMPLETED: { bg: colors.successTint, fg: colors.success },
  ACCEPTED: { bg: colors.successTint, fg: colors.success },
  ACTIVE: { bg: colors.successTint, fg: colors.success },
  RESOLVED: { bg: colors.successTint, fg: colors.success },
  PENDING: { bg: colors.amberTint, fg: colors.amberDark },
  SUBMITTED: { bg: colors.amberTint, fg: colors.amberDark },
  IN_REVIEW: { bg: colors.amberTint, fg: colors.amberDark },
  PARTIALLY_PAID: { bg: colors.amberTint, fg: colors.amberDark },
  TESTING: { bg: colors.amberTint, fg: colors.amberDark },
  OFFERED: { bg: colors.amberTint, fg: colors.amberDark },
  REJECTED: { bg: colors.dangerTint, fg: colors.danger },
  REFUSED: { bg: colors.dangerTint, fg: colors.danger },
  EXPIRED: { bg: colors.line, fg: colors.sage },
};

/** Colored pill for any status string. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const c = MAP[status] ?? { bg: colors.line, fg: colors.sage };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontFamily: 'BricolageGrotesque_700Bold' },
});
