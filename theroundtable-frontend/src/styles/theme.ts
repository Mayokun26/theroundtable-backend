import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    // Mobile-optimized typography scales
    h1: {
      fontSize: '2rem',
      '@media (max-width:600px)': {
        fontSize: '1.75rem',
      },
    },
    h2: {
      fontSize: '1.75rem',
      '@media (max-width:600px)': {
        fontSize: '1.5rem',
      },
    },
    h3: {
      fontSize: '1.5rem',
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    h4: {
      fontSize: '1.25rem',
      '@media (max-width:600px)': {
        fontSize: '1.1rem',
      },
    },
    h5: {
      fontSize: '1.125rem',
      '@media (max-width:600px)': {
        fontSize: '1rem',
      },
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      '@media (max-width:600px)': {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      '@media (max-width:600px)': {
        fontSize: '0.875rem',
        lineHeight: 1.4,
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '@media (max-width:600px)': {
            minHeight: '48px',
            fontSize: '1rem',
            fontWeight: 600,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            '& .MuiOutlinedInput-root': {
              fontSize: '1rem',
            },
            '& .MuiInputLabel-root': {
              fontSize: '1rem',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            fontSize: '1rem',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            fontSize: '0.75rem',
            height: '28px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            borderRadius: '12px',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            fontSize: '0.9rem',
            borderRadius: '8px',
          },
        },
      },
    },
  },
});

export default theme; 