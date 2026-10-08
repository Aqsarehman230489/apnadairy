// Logo — the official ApnaDairy brand logo from the landing page.
//
// Renders assets/logo.png, a lossless 512px raster of assets/logo.svg
// (the logo artwork extracted from https://apnadairy-psi.vercel.app/).
// It is used as a PNG because react-native-svg and expo-image are not in
// package.json and metro.config.js has no SVG transformer, so the raw .svg
// cannot be bundled or typechecked. If a SVG renderer is ever added, swap
// this to render the SVG source directly.
import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const logo = require('../../../assets/logo.png');

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** Square brand logo. Defaults to 40px. */
export function Logo({ size = 40, style }: Props) {
  return (
    <Image
      source={logo}
      resizeMode="contain"
      style={[{ width: size, height: size, borderRadius: size / 4 }, style]}
    />
  );
}
