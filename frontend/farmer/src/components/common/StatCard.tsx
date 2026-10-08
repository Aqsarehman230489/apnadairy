// Big-number stat card for the dashboard.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { Card } from './Card';

/** Label + big bold value, used in 2x2 stat grid. */
export function StatCard({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6 },
  label: { fontSize: 13, color: colors.sage },
  value: { fontSize: 30, color: colors.forest, fontFamily: 'BricolageGrotesque_800ExtraBold', marginTop: 6 },
  caption: { fontSize: 12, color: colors.sage, marginTop: 4 },
});
