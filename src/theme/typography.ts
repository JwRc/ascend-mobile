export const fonts = {
  archivo: 'Archivo_800ExtraBold',
  archivoBold: 'Archivo_900Black',
  hanken: 'HankenGrotesk_400Regular',
  hankenMedium: 'HankenGrotesk_500Medium',
  hankenSemibold: 'HankenGrotesk_600SemiBold',
  hankenBold: 'HankenGrotesk_700Bold',
  hankenExtrabold: 'HankenGrotesk_800ExtraBold',
};

// Direction A (Stadium): uppercase, tight letter-spacing
// Direction B (Pace): mixed case, looser
export type Direction = 'A' | 'B';

export const displayStyle = (direction: Direction) => ({
  fontFamily: direction === 'A' ? fonts.archivoBold : fonts.archivo,
  letterSpacing: direction === 'A' ? -0.5 : -1.5,
  textTransform: direction === 'A' ? ('uppercase' as const) : ('none' as const),
});
