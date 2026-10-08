// SearchBar — rounded search input used on home + search screens.
import React from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Cream search field with clear button. */
export function SearchBar({ value, onChange, onSubmit, placeholder = 'Search milk, ghee, shops…', autoFocus }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        placeholder={placeholder}
        placeholderTextColor={colors.sage}
        autoFocus={autoFocus}
        clearButtonMode="while-editing"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChange('')} style={styles.clear}>
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ivory,
    borderRadius: 999, borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: 18, height: 52, marginHorizontal: 20, marginVertical: 8,
  },
  input: { flex: 1, fontSize: 16, color: colors.ink, fontFamily: 'BricolageGrotesque_400Regular' },
  clear: { padding: 6 },
  clearText: { fontSize: 14, color: colors.sage },
});
