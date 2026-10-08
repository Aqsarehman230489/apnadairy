// Tailwind CSS v3 config for NativeWind v4.
// The nativewind/preset is REQUIRED — the Metro plugin throws without it.
 /** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
