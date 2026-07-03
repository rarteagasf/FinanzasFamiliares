import { globalCss } from './stitches.config';

export const globalStyles = globalCss({
  '*': {
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
  },
  body: {
    fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-main)',
    lineHeight: 1.5,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    transition: 'background-color 0.3s ease, color 0.3s ease',
  },
  'input, select, textarea, button': {
    fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
  },
  '::selection': {
    backgroundColor: 'var(--primary)',
    color: 'white',
  },
  '.app-header': {
    marginBottom: '2rem',
    '@sm': {
      marginBottom: '1rem',
    },
  },
  '.header-top': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem',
  },
  '.header-bottom': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    '@media (max-width: 640px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
  '.app-title': {
    fontSize: 'clamp(1.25rem, 4vw, 2rem)',
    fontWeight: 700,
    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    lineHeight: 1.2,
  },
  '.theme-toggle': {
    padding: '0.5rem !important',
    borderRadius: '50% !important',
    aspectRatio: '1',
    flexShrink: 0,
  },
  '.month-selector': {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-muted)',
    '& select': {
      padding: '0.25rem',
      fontSize: '0.875rem',
    },
    '@media (max-width: 640px)': {
      width: '100%',
      '& select': {
        flex: 1,
      },
    },
  },
  '.app-container': {
    maxWidth: '1200px',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: '2rem',
    '@media (max-width: 640px)': {
      padding: '1rem',
    },
  },
  '.card': {
    background: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: 'var(--shadow-lg)',
    },
    '@sm': {
      padding: '1rem',
      borderRadius: '12px',
    },
  },
  '.card-title': {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  '.table-container': {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    WebkitOverflowScrolling: 'touch',
    '@media (max-width: 480px)': {
      borderRadius: '6px',
    },
  },
  /* Responsive column hiding */
  '.hide-mobile': {
    '@media (max-width: 640px)': {
      display: 'none',
    },
  },
  '.hide-tablet': {
    '@media (max-width: 1024px)': {
      display: 'none',
    },
  },
  '.text-right': {
    textAlign: 'right',
  },
  '.fw-600': {
    fontWeight: 600,
  },
  '.td-actions': {
    width: '80px',
    textAlign: 'right',
    '@media (max-width: 640px)': {
      width: '60px',
    },
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  'th, td': {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border)',
    '@media (max-width: 640px)': {
      padding: '0.5rem',
      fontSize: '0.8125rem',
    },
    '@media (max-width: 480px)': {
      padding: '0.375rem',
      fontSize: '0.75rem',
    },
  },
  th: {
    background: 'var(--bg-card)',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
  },
  'tbody tr': {
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: 'var(--bg-card-hover)',
    },
    '&:last-child td': {
      borderBottom: 'none',
    },
  },
  '.btn': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.875rem',
    '@sm': {
      padding: '0.5rem 0.75rem',
      fontSize: '0.75rem',
    },
  },
  '.btn-primary': {
    background: 'var(--primary)',
    color: 'white',
    '&:hover': {
      background: 'var(--primary-hover)',
    },
  },
  '.btn-secondary': {
    background: 'var(--bg-card)',
    color: 'var(--text-main)',
    border: '1px solid var(--border)',
    '&:hover': {
      background: 'var(--bg-card-hover)',
      borderColor: 'var(--text-muted)',
    },
  },
  '.btn-danger': {
    background: 'var(--btn-danger-bg)',
    color: 'var(--danger)',
    border: '1px solid var(--btn-danger-border)',
    '&:hover': {
      background: 'var(--btn-danger-hover-bg)',
    },
  },
  '.input': {
    background: 'var(--bg-main)',
    border: '1px solid var(--border)',
    color: 'var(--text-main)',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
    fontSize: '0.875rem',
    transition: 'border-color 0.2s ease',
    '&:focus': {
      borderColor: 'var(--primary)',
    },
  },
  '.grid-3': {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  '.grid-2': {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  '.form-group': {
    marginBottom: '1rem',
    '& label': {
      display: 'block',
      marginBottom: '0.5rem',
      fontSize: '0.875rem',
      color: 'var(--text-muted)',
    },
    '& input, & select': {
      width: '100%',
    },
  },
  '.modal-overlay': {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--overlay)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  '.modal-content': {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-xl)',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    marginLeft: '1rem',
    marginRight: '1rem',
  },
  '.modal-header': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--border)',
  },
  '.modal-title': {
    fontSize: '1.125rem',
    fontWeight: 600,
    margin: 0,
  },
  '.modal-close': {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      background: 'var(--bg-card-hover)',
      color: 'var(--text-main)',
    },
  },
  '.modal-body': {
    padding: '1.5rem',
  },
  '.expenses-toolbar': {
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  '.toolbar-filters': {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  '.filter-group': {
    minWidth: '150px',
    '@media (max-width: 640px)': {
      minWidth: '120px',
      flex: 1,
    },
  },
  '.filter-label': {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  '.toolbar-actions': {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    '@media (max-width: 640px)': {
      width: '100%',
      justifyContent: 'stretch',
      '& .btn': {
        flex: 1,
        justifyContent: 'center',
      },
    },
  },
  '.badge': {
    padding: '0.25rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '.badge-p': {
    background: 'var(--badge-p-bg)',
    color: 'var(--success)',
  },
  '.badge-x': {
    background: 'var(--badge-x-bg)',
    color: 'var(--danger)',
  },
  '.badge-none': {
    background: 'var(--badge-none-bg)',
    color: 'var(--text-muted)',
  },
  '.stat-value.positive': {
    color: 'var(--success)',
  },
  '.stat-value.negative': {
    color: 'var(--danger)',
  },
  '.nav-tabs': {
    display: 'flex',
    gap: '0.5rem',
    background: 'var(--bg-card)',
    padding: '0.5rem',
    borderRadius: '12px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    '@media (max-width: 640px)': {
      width: '100%',
      justifyContent: 'flex-start',
    },
    '& button': {
      background: 'transparent',
      border: 'none',
      color: 'var(--text-muted)',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '0.875rem',
      whiteSpace: 'nowrap',
      transition: 'all 0.2s ease',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      '&:hover': {
        color: 'var(--text-main)',
        background: 'var(--bg-card-hover)',
      },
      '&.active': {
        background: 'var(--primary)',
        color: 'white',
      },
      '@media (max-width: 640px)': {
        fontSize: '0.75rem',
        padding: '0.5rem 0.75rem',
      },
    },
  },
});
