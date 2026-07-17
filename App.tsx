import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/hooks/useCart';
import { LanguageProvider } from './src/hooks/useLanguage';
import { NetworkProvider } from './src/hooks/useNetwork';
import ErrorBoundary from './src/components/ErrorBoundary';
import PremiumLoader from './src/components/PremiumLoader';
import AppNavigator from './src/navigation/AppNavigator';
enableScreens();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const prepareApp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (!mounted) return;

      setAppReady(true);
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Ignore splash hide errors on unsupported environments.
      }
    };

    prepareApp();

    return () => {
      mounted = false;
    };
  }, []);

  if (!appReady) {
    return (
      <View style={styles.bootContainer}>
        <StatusBar style="dark" />
        <PremiumLoader
          message="Preparing FirstMartt"
          subMessage="Setting up your shopping experience"
          size="large"
          fullScreen
        />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
