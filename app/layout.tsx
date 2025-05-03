import React from 'react';
import '../styles/globals.css';
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { Metadata } from 'next';

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

export const metadata: Metadata = {
  title: 'Temporal AI Agent',
  description: 'An AI agent powered by Temporal workflows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
} 
