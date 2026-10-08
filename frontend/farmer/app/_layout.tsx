// ApnaDairy — root layout (farmer app).
// Imports the global Tailwind stylesheet and hosts the navigation Stack.
// Loads the Bricolage Grotesque brand typeface before first paint; if font
// loading fails the app still starts with the system font (no blank screen).
// Registers the global 401 handler: any farmer API call rejecting the token
// clears the session and sends the user back to login.
// Web-only shims (dark-mode flag, etc.) must run before the global stylesheet
// is evaluated, otherwise NativeWind's web init throws an uncaught error.
import '../src/web-shims';
import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  BricolageGrotesque_200ExtraLight,
  BricolageGrotesque_300Light,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { setOnUnauthorized, clearSession, getSupabaseClient } from '../src/api/client';
import * as Linking from 'expo-linking';

// Keep the splash screen up until fonts are ready (or have failed).
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Registers the invalid-token handler once the router is ready. */
function UnauthorizedWatcher() {
  const router = useRouter();
  useEffect(() => {
    const handle = () => {
      // Fire-and-forget: clear the bad session, then bounce to login.
      void clearSession().finally(() => {
        router.replace('/(auth)/login');
      });
    };
    setOnUnauthorized(handle);
    return () => {
      setOnUnauthorized(null);
    };
  }, [router]);
  return null;
}

/** Exchange a Supabase password-recovery deep link for a session, then open
 *  the reset screen. The reset email points back at the app (scheme
 *  "apnadairy"); the code/tokens in the URL become a recovery session. */
function RecoveryLinkHandler() {
  const router = useRouter();
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes('type=recovery')) return;
      try {
        const sb = getSupabaseClient();
        const params = Linking.parse(url).queryParams ?? {};
        if (typeof params.code === 'string' && params.code) {
          // PKCE flow: exchange the code for a recovery session.
          const { error } = await sb.auth.exchangeCodeForSession(params.code);
          if (!error) router.push('/(auth)/reset-password');
          return;
        }
        // Implicit flow: tokens arrive in the URL fragment.
        const fragment = url.split('#')[1] ?? '';
        const fragParams = Object.fromEntries(new URLSearchParams(fragment));
        const access_token = fragParams.access_token;
        const refresh_token = fragParams.refresh_token;
        if (access_token && refresh_token) {
          const { error } = await sb.auth.setSession({ access_token, refresh_token });
          if (!error) router.push('/(auth)/reset-password');
        }
      } catch {
        // Malformed link — ignore; the reset screen explains expiry itself.
      }
    };
    Linking.getInitialURL()
      .then((u) => handleUrl(u))
      .catch(() => {});
    const sub = Linking.addEventListener('url', (e) => {
      void handleUrl(e.url);
    });
    return () => {
      sub.remove();
    };
  }, [router]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_200ExtraLight,
    BricolageGrotesque_300Light,
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  useEffect(() => {
    if (fontError) {
      // Non-fatal: log and continue with the system font.
      console.warn('[fonts] Bricolage Grotesque failed to load, using system font:', fontError);
    }
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Hold the splash screen while fonts load — never render text in the
  // wrong typeface, and never leave a blank screen on font failure.
  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="dark" />
      <UnauthorizedWatcher />
      <RecoveryLinkHandler />
      {/* Flat farmer-only routes. Headers stay hidden; screens render their own UI.
          The five tabbed sections (home, milk, managers, assistant, profile)
          live inside the "(tabs)" group. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="documents" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="payments" />
        <Stack.Screen name="complaints" />
      </Stack>
    </>
  );
}
