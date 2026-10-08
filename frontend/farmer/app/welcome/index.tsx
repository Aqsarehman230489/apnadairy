// Welcome — 3-step onboarding shown once after the native splash, before auth.
// Single screen with an internal pager: dots indicator, "Skip" top-right and a
// primary AppButton ("Next" on steps 1-2, "Get started" on step 3). Illustrations
// are pure View styling around the brand Logo — no external images.
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { AppButton } from '../../src/components/common/AppButton';
import { Logo } from '../../src/components/common/Logo';

// Lazy require follows src/api/client.ts: the SecureStore native module throws
// on web, so it is loaded lazily and localStorage is used there instead.
declare const require: { (id: string): any } | undefined;

const SEEN_KEY = 'ad_welcome_seen';

const STEPS = [
  {
    headline: 'Sell your milk daily',
    body: 'Choose your area manager once, then sell your milk to them every day with one tap.',
  },
  {
    headline: 'AI-tested quality, fair price',
    body: 'Your manager tests your milk with the IoT device. The AI freshness score and the AI price are shown to both of you.',
  },
  {
    headline: 'Get paid, track everything',
    body: 'See every payment, your milk history and notifications in one simple place.',
  },
] as const;

async function markWelcomeSeen(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SEEN_KEY, '1');
      return;
    }
    if (typeof require !== 'undefined') {
      const secureStore = require('expo-secure-store');
      await secureStore.setItemAsync(SEEN_KEY, '1');
    }
  } catch {
    // Storage unavailable — the user still moves on to login.
  }
}

/** Step 1 illustration: Logo inside layered cream/amber circles. */
function StepOneArt() {
  return (
    <View style={styles.artWrap}>
      <View style={styles.outerCircle}>
        <View style={styles.innerCircle}>
          <Logo size={92} />
        </View>
      </View>
    </View>
  );
}

/** Step 2 illustration: Logo with a freshness-score badge ("95%"). */
function StepTwoArt() {
  return (
    <View style={styles.artWrap}>
      <View style={styles.outerCircle}>
        <Logo size={92} />
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>95%</Text>
      </View>
    </View>
  );
}

/** Step 3 illustration: Logo over two offset rounded card rectangles. */
function StepThreeArt() {
  return (
    <View style={styles.artWrap}>
      <View style={styles.cardBack} />
      <View style={styles.cardFront}>
        <Logo size={84} />
      </View>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const last = index === STEPS.length - 1;

  async function finish() {
    await markWelcomeSeen();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.spacer} />
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Skip welcome"
          hitSlop={16}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {index === 0 && <StepOneArt />}
        {index === 1 && <StepTwoArt />}
        {index === 2 && <StepThreeArt />}
        <Text style={styles.headline}>{STEPS[index].headline}</Text>
        <Text style={styles.body}>{STEPS[index].body}</Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]} />
          ))}
        </View>
      </View>

      <View style={styles.cta}>
        <AppButton
          label={last ? 'Get started' : 'Next'}
          onPress={() => (last ? finish() : setIndex(index + 1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 20 },
  spacer: { flex: 1 },
  skipButton: { paddingVertical: 12, paddingHorizontal: 16 },
  skipText: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: colors.forest },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  headline: {
    fontSize: 28,
    fontFamily: 'BricolageGrotesque_700Bold',
    color: colors.ink,
    textAlign: 'center',
    marginTop: 40,
  },
  body: {
    fontSize: 16,
    fontFamily: 'BricolageGrotesque_400Regular',
    color: colors.sage,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  dots: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  dot: { height: 10, borderRadius: 5, marginHorizontal: 5 },
  dotActive: { width: 32, backgroundColor: colors.forest },
  dotIdle: { width: 10, backgroundColor: colors.line },
  cta: { paddingHorizontal: 24, paddingBottom: 44 },
  // Illustrations
  artWrap: { width: 232, height: 232, alignItems: 'center', justifyContent: 'center' },
  outerCircle: {
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: colors.amberTint,
    borderWidth: 3,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.ivory,
    borderWidth: 3,
    borderColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 24, fontFamily: 'BricolageGrotesque_700Bold', color: colors.forest },
  cardBack: {
    position: 'absolute',
    width: 190,
    height: 130,
    borderRadius: 18,
    backgroundColor: colors.amber,
    transform: [{ rotate: '-8deg' }],
  },
  cardFront: {
    position: 'absolute',
    width: 190,
    height: 130,
    borderRadius: 18,
    backgroundColor: colors.ivory,
    borderWidth: 2,
    borderColor: colors.line,
    transform: [{ rotate: '6deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
