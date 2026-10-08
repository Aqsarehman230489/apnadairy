// ApnaDairy — auth group layout (login, signup, OTP, continue-as, ...).
// Plain Stack; headers stay hidden, screens render their own UI.
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
