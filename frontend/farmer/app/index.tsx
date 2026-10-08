// ApnaDairy — app entry. Restores the saved session and routes the user to
// the right first screen:
//   welcome not seen         -> /welcome
//   no session               -> /(auth)/login
//   session, no profile      -> /onboarding/personal (onboarding incomplete)
//   session, not verified    -> /verification (SuperAdmin approval pending)
//   session, verified        -> /(tabs)/home
// Onboarding/verification state comes from the backend via POST /api/v1/auth/me
// (farmer_profile + verification.status). If that call fails while a session
// exists, fall back to /(tabs)/home rather than kicking the user out on a
// network error.
import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getSession } from '../src/api/client';
import { getMe } from '../src/services/authService';
import { colors } from '../src/theme/colors';

// expo-secure-store is optional at runtime; loaded lazily so the memory
// fallback works where the native module is absent. Declared locally.
declare const require: { (id: string): any } | undefined;

type EntryTarget =
  | '/welcome'
  | '/(auth)/login'
  | '/onboarding/personal'
  | '/verification'
  | '/(tabs)/home';

/** Reads the welcome-seen flag: expo-secure-store on native,
 *  localStorage on web, null anywhere else. */
async function getWelcomeSeen(): Promise<string | null> {
  const KEY = 'ad_welcome_seen';
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(KEY);
  } catch {
    /* storage unavailable — fall through to SecureStore */
  }
  try {
    if (typeof require !== 'undefined') {
      const SecureStore = require('expo-secure-store');
      if (SecureStore?.getItemAsync) {
        const v = await SecureStore.getItemAsync(KEY);
        return typeof v === 'string' ? v : null;
      }
    }
  } catch {
    /* SecureStore unavailable */
  }
  return null;
}

export default function Index() {
  const [target, setTarget] = useState<EntryTarget | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let next: EntryTarget = '/(auth)/login';
      const seen = await getWelcomeSeen();
      if (seen !== '1') {
        next = '/welcome';
      } else {
        const sess = await getSession();
        if (sess) {
          next = '/(tabs)/home';
          try {
            const me = await getMe();
            if (!me.farmer_profile) {
              next = '/onboarding/personal';
            } else if (me.verification?.status !== 'verified') {
              next = '/verification';
            } else {
              next = '/(tabs)/home';
            }
          } catch {
            // Network/backend hiccup with a valid session: stay logged in,
            // let the home tab surface the error itself.
            next = '/(tabs)/home';
          }
        }
      }
      if (alive) setTarget(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!target) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.forest} />
      </View>
    );
  }
  return <Redirect href={target} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
});
