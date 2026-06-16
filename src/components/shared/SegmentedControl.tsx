import React from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({ options, value, onChange }: Props) {
  const { colors, radius, direction } = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const thumbX = useSharedValue(0);

  const segWidth = containerWidth > 0 ? (containerWidth - 8) / options.length : 0;

  React.useEffect(() => {
    if (segWidth > 0) {
      thumbX.value = withSpring(selectedIndex * segWidth, {
        damping: 20,
        stiffness: 250,
      });
    }
  }, [selectedIndex, segWidth]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  return (
    <View
      onLayout={onLayout}
      style={{
        position: 'relative',
        flexDirection: 'row',
        backgroundColor: colors.surface2,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: radius.cardSm,
        padding: 4,
        gap: 0,
      }}
    >
      {/* animated thumb */}
      {segWidth > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              bottom: 4,
              width: segWidth,
              backgroundColor: colors.ink,
              borderRadius: Math.max(0, radius.cardSm - 3),
            },
            thumbStyle,
          ]}
        />
      )}

      {options.map((opt) => {
        const isOn = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 11,
              paddingHorizontal: 8,
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            <Text
              style={{
                fontFamily: 'HankenGrotesk_700Bold',
                fontSize: direction === 'A' ? 13 : 14.5,
                color: isOn ? colors.bg : colors.ink3,
                textTransform: direction === 'A' ? 'uppercase' : 'none',
                letterSpacing: direction === 'A' ? 0.5 : 0,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
