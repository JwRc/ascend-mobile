import React from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
};

export function Switch({ value, onChange }: Props) {
  const { colors, direction } = useTheme();
  const thumbX = useSharedValue(value ? 22 : 0);

  React.useEffect(() => {
    thumbX.value = withSpring(value ? 22 : 0, { damping: 18, stiffness: 200 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const trackRadius = direction === 'A' ? 3 : 30;
  const thumbRadius = direction === 'A' ? 2 : 50;

  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.9}
      style={{
        width: 52,
        height: 30,
        borderRadius: trackRadius,
        backgroundColor: value ? colors.accent : colors.line2,
        padding: 3,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: 24,
            height: 24,
            borderRadius: thumbRadius,
            backgroundColor: '#ffffff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3,
            elevation: 2,
          },
          thumbStyle,
        ]}
      />
    </TouchableOpacity>
  );
}
