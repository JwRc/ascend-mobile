import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Área fixa no rodapé (sticky) — botões de ação ficam sempre visíveis, fora do scroll. */
  footer?: React.ReactNode;
  /** Quando `false`, desliga o ScrollView interno (para conteúdo que gerencia o próprio scroll). Default: `true`. */
  scrollable?: boolean;
};

export function AppModal({ visible, onClose, title, children, footer, scrollable = true }: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  // Card inteiro (header + corpo + rodapé) limitado a ~90% da altura útil da tela.
  const maxCardHeight = Math.max(240, (screenH - insets.top - insets.bottom) * 0.92);

  const body = <View style={{ gap: 18 }}>{children}</View>;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          {/* backdrop: toque fora fecha */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: maxCardHeight,
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.card,
              overflow: 'hidden',
            }}
          >
            {/* header fixo */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 16,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontFamily: 'Archivo_800ExtraBold',
                  fontSize: 22,
                  color: colors.ink,
                  letterSpacing: -0.3,
                }}
              >
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20, color: colors.ink2, lineHeight: 22 }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* corpo rolável (encolhe quando o card bate no maxHeight) */}
            {scrollable ? (
              <ScrollView
                style={{ flexGrow: 0, flexShrink: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingBottom: footer ? 20 : 24,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {body}
              </ScrollView>
            ) : (
              <View
                style={{
                  flexShrink: 1,
                  paddingHorizontal: 24,
                  paddingBottom: footer ? 20 : 24,
                }}
              >
                {body}
              </View>
            )}

            {/* rodapé fixo (sticky) */}
            {footer != null && (
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 24,
                  borderTopWidth: 1,
                  borderTopColor: colors.line,
                  backgroundColor: colors.surface,
                  gap: 12,
                }}
              >
                {footer}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
