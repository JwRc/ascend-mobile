import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useTheme } from '@/theme';

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export function AutocompleteSelect({ options, value, onChange, placeholder = 'Buscar…' }: Props) {
  const { colors, radius, direction } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<TextInput>(null);
  // prevents onBlur from closing the dropdown when user taps a list item
  const touchingItem = React.useRef(false);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function openPicker() {
    setQuery('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function select(v: string) {
    touchingItem.current = false;
    onChange(v);
    setOpen(false);
    setQuery('');
    Keyboard.dismiss();
  }

  function handleBlur() {
    if (touchingItem.current) return;
    setOpen(false);
    setQuery('');
  }

  const inputRadius = direction === 'A' ? 4 : 10;

  return (
    <View style={{ gap: 4 }}>
      {/* trigger / input */}
      {open ? (
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          autoFocus
          style={{
            backgroundColor: colors.surface2,
            color: colors.ink,
            borderWidth: 1.5,
            borderColor: colors.ink,
            borderRadius: inputRadius,
            paddingVertical: 11,
            paddingHorizontal: 14,
            fontSize: 14,
            fontFamily: 'HankenGrotesk_500Medium',
          }}
        />
      ) : (
        <TouchableOpacity
          onPress={openPicker}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface2,
            borderWidth: 1.5,
            borderColor: colors.line,
            borderRadius: inputRadius,
            paddingVertical: 11,
            paddingHorizontal: 14,
          }}
        >
          <Text
            style={{
              fontFamily: 'HankenGrotesk_600SemiBold',
              fontSize: 14,
              color: value ? colors.ink : colors.ink3,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <Text style={{ fontSize: 12, color: colors.ink3, marginLeft: 8 }}>▾</Text>
        </TouchableOpacity>
      )}

      {/* dropdown list */}
      {open && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.line,
            borderRadius: inputRadius,
            maxHeight: 220,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {filtered.length === 0 ? (
            <View style={{ padding: 14 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 13.5, color: colors.ink3 }}>
                Nenhum resultado para "{query}"
              </Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              {filtered.map((o, i) => (
                <TouchableOpacity
                  key={o}
                  onPressIn={() => { touchingItem.current = true; }}
                  onPress={() => select(o)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                    borderBottomColor: colors.line,
                    backgroundColor: o === value ? colors.surface2 : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: o === value ? 'HankenGrotesk_700Bold' : 'HankenGrotesk_500Medium',
                      fontSize: 14,
                      color: o === value ? colors.accent : colors.ink,
                    }}
                  >
                    {o}
                  </Text>
                  {o === value && (
                    <Text style={{ fontSize: 12, color: colors.accent }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
