import { createStitches } from '@stitches/react';

export const { styled, css, globalCss, keyframes, getCssText, theme, config } = createStitches({
  theme: {
    colors: {
      // Primary (Azul Pizarra Apagado / Slate Blue)
      primary: '#4F6367',
      onPrimary: '#ffffff',
      primaryContainer: '#D0D9DA',
      onPrimaryContainer: '#1C2D30',

      // Secondary (Azul pizarra medio)
      secondary: '#5F7477',
      onSecondary: '#ffffff',
      secondaryContainer: '#D5DFE0',
      onSecondaryContainer: '#1F2A2C',

      // Tertiary (Café ocre intermedio)
      tertiary: '#7D6B58',
      onTertiary: '#ffffff',
      tertiaryContainer: '#DDD5CB',
      onTertiaryContainer: '#2B241C',

      // Surface / Background (Estudio Confortable - Neutros Medios)
      background: '#CBBFB4',
      onBackground: '#2C2621',
      surface: '#DFD6CD',
      onSurface: '#2C2621',
      surfaceVariant: '#D4C9BF',
      onSurfaceVariant: '#5C5248',

      // Outline
      outline: '#B7A89B',
      outlineVariant: '#CFBEB1',

      // Error / Gastos Pendientes (Terracota cálido desaturado)
      error: '#B8533C',
      onError: '#ffffff',

      // Custom app tokens
      success: '#4B6F46',
      warning: '#9E6E22',
      info: '#3D5961',
      danger: '#B8533C',
      textMuted: '#5C5248',

      // Acentos
      accentGold: '#BFA87A',
      fabBg: '#BA5E42',

      // Entity colors
      caixabank: '#364E55',
      ing: '#B35B37',
    },
    space: {
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '32px',
      8: '40px',
      9: '48px',
      10: '64px',
    },
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      '4xl': '2.5rem',
    },
    fonts: {
      body: '"Plus Jakarta Sans", "Outfit", "Inter", system-ui, sans-serif',
      heading: '"Plus Jakarta Sans", "Outfit", "Inter", system-ui, sans-serif',
      mono: '"JetBrains Mono", monospace',
    },
    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      tight: '1.2',
      base: '1.5',
      relaxed: '1.75',
    },
    radii: {
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '28px',
      pill: '9999px',
    },
    shadows: {
      sm: '0 1px 3px rgba(44, 38, 33, 0.08), 0 1px 2px rgba(44, 38, 33, 0.05)',
      md: '0 4px 8px -1px rgba(44, 38, 33, 0.12), 0 2px 4px -1px rgba(44, 38, 33, 0.07)',
      lg: '0 10px 20px -3px rgba(44, 38, 33, 0.15), 0 4px 8px -2px rgba(44, 38, 33, 0.09)',
      xl: '0 20px 28px -5px rgba(44, 38, 33, 0.18), 0 10px 12px -5px rgba(44, 38, 33, 0.08)',
    },
  },
  media: {
    sm: '(max-width: 640px)',
    md: '(max-width: 768px)',
    lg: '(max-width: 1024px)',
    xl: '(max-width: 1280px)',
    motion: '(prefers-reduced-motion)',
  },
  utils: {
    mx: (value) => ({ marginLeft: value, marginRight: value }),
    my: (value) => ({ marginTop: value, marginBottom: value }),
    px: (value) => ({ paddingLeft: value, paddingRight: value }),
    py: (value) => ({ paddingTop: value, paddingBottom: value }),
    size: (value) => ({ width: value, height: value }),
    bg: (value) => ({ background: value }),
    fs: (value) => ({ fontSize: value }),
    fw: (value) => ({ fontWeight: value }),
    ta: (value) => ({ textAlign: value }),
    fd: (value) => ({ flexDirection: value }),
    ai: (value) => ({ alignItems: value }),
    jc: (value) => ({ justifyContent: value }),
    gap: (value) => ({ gap: value }),
    p: (value) => ({ padding: value }),
    m: (value) => ({ margin: value }),
  },
});
