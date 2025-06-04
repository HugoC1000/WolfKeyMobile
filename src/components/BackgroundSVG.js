import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Mask,
  Rect,
  Stop,
  G,
  Path,
} from 'react-native-svg';
import { useUser } from '../context/userContext';

const BackgroundSvg = ({ hue = 200 }) => {
  const { user } = useUser();
  const [gradientColor, setGradientColor] = useState('rgba(255, 255, 255, 0.5)');

  useEffect(() => {
    const h = hue / 360;
    const s = 0.8;
    const l = 0.6;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = hue2rgb(p, q, h + 1 / 3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1 / 3);

    const rgba = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.5)`;
    setGradientColor(rgba);
  }, [hue, user?.id]);

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: -1 }]}>
      <Svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 1440 560"
      >
        <Defs>
          <Mask id="SvgjsMask2555">
            <Rect width="1440" height="560" fill="#ffffff" />
          </Mask>
          <LinearGradient
            id="SvgjsLinearGradient2556"
            x1="0%"
            y1="-39.29%"
            x2="84.72%"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0.01" stopColor="rgba(255, 255, 255, 0.5)" />
            <Stop
              offset="0.9"
              stopColor={gradientColor}
            />
          </LinearGradient>
        </Defs>
        <G mask="url(#SvgjsMask2555)" fill="none">
          <Rect width="1440" height="560" fill="url(#SvgjsLinearGradient2556)" />
          <Path d="M1440 0L1353.9 0L1440 171.76z" fill="rgba(255, 255, 255, .1)" />
          <Path d="M1353.9 0L1440 171.76L1440 219.07L724.0900000000001 0z" fill="rgba(255, 255, 255, .075)" />
          <Path d="M724.09 0L1440 219.07L1440 295.46L634.88 0z" fill="rgba(255, 255, 255, .05)" />
          <Path d="M634.88 0L1440 295.46L1440 374.04999999999995L335.85 0z" fill="rgba(255, 255, 255, .025)" />
          <Path d="M0 560L347.06 560L0 498.05z" fill="rgba(0, 0, 0, .1)" />
          <Path d="M0 498.05L347.06 560L638.98 560L0 242.05z" fill="rgba(0, 0, 0, .075)" />
          <Path d="M0 242.05L638.98 560L724.8 560L0 211.58z" fill="rgba(0, 0, 0, .05)" />
          <Path d="M0 211.58000000000004L724.8 560L829.78 560L0 111.67000000000004z" fill="rgba(0, 0, 0, .025)" />
        </G>
      </Svg>
    </View>
  );
};

export default BackgroundSvg;
