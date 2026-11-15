// Paleta de la Iglesia del Nazareno "Más que Vencedores" (la misma de la web):
// morado institucional #57446C y azul #53819A, con el degradado azul → morado.
export const colors = {
  primary:      '#57446C',
  primaryDark:  '#332940',
  primarySoft:  '#EFEAF5',
  primaryLight: '#836AA3',
  blue:         '#53819A',
  blueLight:    '#50B8D4',
  blueSoft:     '#E3F1F6',
  blueDark:     '#214351',
  gold:         '#FFD166',

  bg:        '#F4F5F7',
  card:      '#FFFFFF',
  border:    '#E4E1EA',
  text:      '#414042',
  textMuted: '#7D7E81',
  textLight: '#ABADB0',
  white:     '#FFFFFF',

  success:     '#40996D',
  successSoft: '#E8F5F0',
  warning:     '#B45309',
  warningSoft: '#FFF3E0',
  danger:      '#C62828',
  dangerSoft:  '#FFEBEE',
  info:        '#214351',
  infoSoft:    '#E3F1F6',

  escenario:   '#111317',
};

/** Degradado de marca (de arriba a abajo). */
export const gradiente = ['#53819A', '#57446C'] as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 };

export const shadow = {
  shadowColor: '#57446C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 3,
};
