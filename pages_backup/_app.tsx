import React from 'react';
import '../styles/globals.css';
import { AppProps } from 'next/app';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

// Define a custom theme for Mantine
const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 6,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  components: {
    Button: {
      styles: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          '&:focus': {
            borderColor: 'var(--mantine-color-blue-6)',
          },
        },
      },
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Component {...pageProps} />
    </MantineProvider>
  );
} 
