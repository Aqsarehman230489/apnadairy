// Shared theme tokens: spacing, radius, typography.
export const spacing = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 12, md: 20, pill: 999 };
export const font = {
  // Loaded via @expo-google-fonts/bricolage-grotesque in app/_layout.tsx.
  // Use the weight-specific family name; do NOT pair with fontWeight.
  family: 'BricolageGrotesque_400Regular',
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  extrabold: 'BricolageGrotesque_800ExtraBold',
  light: 'BricolageGrotesque_300Light',
  h1: 28, h2: 22, h3: 18, body: 16, small: 14, tiny: 12,
  stat: 32, // big dashboard numbers
};
