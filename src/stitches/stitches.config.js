import { createStitches } from '@stitches/react';

export const { styled, css, globalCss, keyframes, getCssText, theme, config, createTheme } = createStitches({
  theme: {
    colors: {
      // Primary (M3 Blue)
      primary: '#3b82f6',
      onPrimary: '#ffffff',
      primaryContainer: '#dbeafe',
      onPrimaryContainer: '#1e3a5f',

      // Secondary (M3 Teal)
      secondary: '#14b8a6',
      onSecondary: '#ffffff',
      secondaryContainer: '#ccfbf1',
      onSecondaryContainer: '#134e4a',

      // Tertiary (M3 Violet)
      tertiary: '#8b5cf6',
      onTertiary: '#ffffff',
      tertiaryContainer: '#ede9fe',
      onTertiaryContainer: '#3b0764',

      // Surface / Background (Light mode defaults)
      background: '#f8fafc',
      onBackground: '#0f172a',
      surface: '#ffffff',
      onSurface: '#1e293b',
      surfaceVariant: '#f1f5f9',
      onSurfaceVariant: '#475569',

      // Outline
      outline: '#cbd5e1',
      outlineVariant: '#e2e8f0',

      // Error
      error: '#ef4444',
      onError: '#ffffff',

      // Custom app tokens
      success: '#10b981',
      warning: '#f59e0b',
      info: '#0ea5e9',
      danger: '#ef4444',
      textMuted: '#94a3b8',

      // Entity colors
      caixabank: '#0ea5e9',
      ing: '#f97316',
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
      body: '"Outfit", "Inter", system-ui, sans-serif',
      heading: '"Outfit", "Inter", system-ui, sans-serif',
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
      sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    },
  },
  media: {
    sm: '(max-width: 640px)',
    md: '(max-width: 768px)',
    lg: '(max-width: 1024px)',
    xl: '(max-width: 1280px)',
    motion: '(prefers-reduced-motion)',
    dark: '(prefers-color-scheme: dark)',
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

export const darkTheme = createTheme({
  colors: {
    // Primary
    primary: '#60a5fa',
    onPrimary: '#0f172a',
    primaryContainer: '#1e3a5f',
    onPrimaryContainer: '#dbeafe',

    // Secondary
    secondary: '#2dd4bf',
    onSecondary: '#0f172a',
    secondaryContainer: '#134e4a',
    onSecondaryContainer: '#ccfbf1',

    // Tertiary
    tertiary: '#a78bfa',
    onTertiary: '#0f172a',
    tertiaryContainer: '#3b0764',
    onTertiaryContainer: '#ede9fe',

    // Surface / Background
    background: '#0f172a',
    onBackground: '#f8fafc',
    surface: '#1e293b',
    onSurface: '#f1f5f9',
    surfaceVariant: '#1e293b',
    onSurfaceVariant: '#94a3b8',

    // Outline
    outline: '#334155',
    outlineVariant: '#1e293b',

    // Error
    error: '#f87171',
    onError: '#0f172a',

    // Custom app tokens
    success: '#34d399',
    warning: '#fbbf24',
    info: '#38bdf8',
    danger: '#f87171',
    textMuted: '#64748b',

    // Entity colors
    caixabank: '#38bdf8',
    ing: '#fb923c',
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
    md: '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.2)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.2)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.4), 0 10px 10px -5px rgba(0,0,0,0.2)',
  },
});
