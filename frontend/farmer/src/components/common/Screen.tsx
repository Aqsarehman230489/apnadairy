// Screen wrapper: cream background, safe area, optional header.
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Standard page container for farmer screens. */
export function Screen({ title, subtitle, children }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 24, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  subtitle: { fontSize: 14, color: colors.sage, marginTop: 4 },
  body: { flex: 1, paddingHorizontal: 20 },
});
