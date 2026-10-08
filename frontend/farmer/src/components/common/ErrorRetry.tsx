// ErrorRetry — feed error state with a retry button.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { AppButton } from './AppButton';

interface Props {
  message?: string;
  onRetry: () => void;
}

/** Centered error + "Try again" button. */
export function ErrorRetry({ message = 'Could not load. Check your connection.', onRetry }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.btn}>
        <AppButton label="Try again" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  title: { fontSize: 18, color: colors.ink, fontFamily: 'BricolageGrotesque_700Bold' },
  message: { fontSize: 14, color: colors.sage, textAlign: 'center', marginTop: 8, fontFamily: 'BricolageGrotesque_400Regular' },
  btn: { marginTop: 20, width: 200 },
});
