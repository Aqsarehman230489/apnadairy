// FeedSkeleton — shimmer-free loading placeholders for the home feed.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

function Block({ style }: { style?: object }) {
  return <View style={[styles.block, style]} />;
}

/** Placeholder layout shown while the feed loads. */
export function FeedSkeleton() {
  return (
    <View style={styles.wrap}>
      <Block style={styles.greeting} />
      <View style={styles.chipRow}>
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} style={styles.chip} />
        ))}
      </View>
      <Block style={styles.sectionTitle} />
      <View style={styles.cardRow}>
        {[0, 1, 2].map((i) => (
          <Block key={i} style={styles.card} />
        ))}
      </View>
      <Block style={styles.sectionTitle} />
      <Block style={styles.listRow} />
      <Block style={styles.listRow} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 12 },
  block: { backgroundColor: colors.line, borderRadius: 12 },
  greeting: { height: 60, marginHorizontal: 20, borderRadius: 16 },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12 },
  chip: { width: 80, height: 36, borderRadius: 999 },
  sectionTitle: { width: 140, height: 22, marginHorizontal: 20, marginTop: 20 },
  cardRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 10 },
  card: { width: 150, height: 210, borderRadius: 20 },
  listRow: { height: 76, marginHorizontal: 20, marginTop: 10, borderRadius: 20 },
});
