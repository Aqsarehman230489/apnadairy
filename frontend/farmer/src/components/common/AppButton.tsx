// Pill button: forest primary, amber (selected role), outline, danger.
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'yellow' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

/** Standard 56px pill button. Use variant="yellow" for selected role buttons. */
export function AppButton({ label, onPress, variant = 'primary', loading, disabled }: Props) {
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === 'primary' || variant === 'danger' ? colors.ivory
    : variant === 'yellow' ? colors.forestDeep
    : colors.forest;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.dim]}
    >
      {loading ? <ActivityIndicator color={spinnerColor} /> : (
        <Text style={[styles.text, styles[`${variant}Text` as const]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  primary: { backgroundColor: colors.forest },
  yellow: { backgroundColor: colors.amber },
  outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.forest },
  danger: { backgroundColor: colors.danger },
  dim: { opacity: 0.5 },
  text: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold' },
  primaryText: { color: colors.ivory },
  yellowText: { color: colors.forestDeep },
  outlineText: { color: colors.forest },
  dangerText: { color: colors.ivory },
});
