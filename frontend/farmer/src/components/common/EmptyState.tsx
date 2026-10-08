// EmptyState — generic empty-list message.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  title: string;
  message?: string;
}

/** Centered empty-state text. */
export function EmptyState({ title, message }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  title: { fontSize: 17, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  message: { fontSize: 14, color: colors.sage, textAlign: 'center', marginTop: 6, fontFamily: 'BricolageGrotesque_400Regular' },
});
