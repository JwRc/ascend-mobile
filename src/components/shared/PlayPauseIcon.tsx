import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { size?: number; color: string };

export function PlayIcon({ size = 20, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4.5v15l13-7.5z" fill={color} />
    </Svg>
  );
}

export function PauseIcon({ size = 20, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="6" y="4.5" width="4.5" height="15" rx="1.2" fill={color} />
      <Rect x="13.5" y="4.5" width="4.5" height="15" rx="1.2" fill={color} />
    </Svg>
  );
}
