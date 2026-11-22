import React, { useEffect } from 'react';
import { enableScreens } from 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/hooks/useCart';
import { LanguageProvider } from './src/hooks/useLanguage';
import { NetworkProvider } from './src/hooks/useNetwork';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
enableScreens();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Safety timeout: force-hide splash screen after 5 seconds no matter what.
// Prevents the app from appearing permanently frozen if data loading fails.
const SPLASH_SAFETY_TIMEOUT_MS = 5000;

export default function App() {
  useEffect(() => {
    // Safety net: if HomeScreen hasn't hidden the splash screen within 15s, force-hide it
    const safetyTimer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, SPLASH_SAFETY_TIMEOUT_MS);

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NetworkProvider>
          <LanguageProvider>
            <CartProvider>
              <StatusBar style="dark" />
              <AppNavigator />
            </CartProvider>
          </LanguageProvider>
        </NetworkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
