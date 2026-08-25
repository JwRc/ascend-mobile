import React from 'react';
import { Animated, View, Text } from 'react-native';
import type { ThemeColors } from '@/theme/colors';

const BRAND_LABEL: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'Amex',
  elo: 'Elo',
  hipercard: 'Hipercard',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

type Props = {
  colors: ThemeColors;
  radius: number;
  brand: string;
  holderName: string;
  cvvFocused: boolean;
};

// Cartão visual animado que espelha o que o usuário digita — mesma linguagem
// do CardInputBlock do web (chip, marca, nome do titular ao vivo, flip pro CVV).
export function CreditCardVisual({ colors, radius, brand, holderName, cvvFocused }: Props) {
  const flip = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(flip, {
      toValue: cvvFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 60,
    }).start();
  }, [cvvFocused, flip]);

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const displayHolder = holderName.trim() || 'NOME SOBRENOME';
  const brandLabel = brand !== 'unknown' && brand !== '' ? BRAND_LABEL[brand] ?? brand : '';

  const face: any = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: radius,
    padding: 18,
    backfaceVisibility: 'hidden',
  };

  return (
    <View style={{ height: 168, marginBottom: 18 }}>
      <Animated.View
        style={[
          face,
          {
            backgroundColor: colors.ink,
            justifyContent: 'space-between',
            transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
          },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ width: 34, height: 24, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          {!!brandLabel && (
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' }}>{brandLabel}</Text>
          )}
        </View>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 19, letterSpacing: 2.5, color: 'rgba(255,255,255,0.92)' }}>
          •••• •••• •••• ••••
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              Titular
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: '#fff', marginTop: 2 }}>
              {displayHolder}
            </Text>
          </View>
          <View>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
              Validade
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: '#fff', marginTop: 2 }}>MM/AA</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          face,
          {
            backgroundColor: colors.ink,
            transform: [{ perspective: 1000 }, { rotateY: backRotate }],
          },
        ]}
      >
        <View style={{ height: 34, backgroundColor: 'rgba(0,0,0,0.55)', marginHorizontal: -18, marginTop: 14 }} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View
            style={{
              alignSelf: 'flex-end',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              gap: 1,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 8.5, letterSpacing: 0.8, color: '#666' }}>
              CVV
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#1a1a1a' }}>•••</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
