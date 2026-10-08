// Web-only compatibility shims for running the app in a desktop browser
// (Expo Go / native builds don't need these).
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  try {
    // NativeWind v4's web runtime reads the `--css-interop-darkMode` flag from
    // documentElement's computed style (its compiled CSS defaults it to
    // "media"). When something later tries to set the color scheme, the
    // runtime throws an uncaught error overlay. Forcing the flag to "class"
    // via an inline style (beats the stylesheet) keeps the web demo running.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = (globalThis as any)?.document;
    if (doc?.documentElement?.style) {
      doc.documentElement.style.setProperty('--css-interop-darkMode', 'class');
    }
  } catch {
    // Non-DOM environment: nothing to patch.
  }
}

export {};
