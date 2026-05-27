// Powered by OnSpace.AI
import { AlertProvider, AuthProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  // Suppress ResizeObserver loop error on web (benign browser warning)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const originalError = window.onerror;
      window.onerror = (message, ...args) => {
        if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
          return true;
        }
        return originalError ? originalError(message, ...args) : false;
      };

      // Also handle unhandled promise rejections with this error
      const handleError = (event: ErrorEvent) => {
        if (event.message?.includes('ResizeObserver loop')) {
          event.stopImmediatePropagation();
        }
      };
      window.addEventListener('error', handleError);

      return () => {
        window.onerror = originalError;
        window.removeEventListener('error', handleError);
      };
    }
  }, []);
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#080808' } }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
