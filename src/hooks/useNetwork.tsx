import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

interface NetworkContextType {
  isConnected: boolean;
  /** Register a callback to be called when the connection is restored */
  onReconnect: (callback: () => void) => () => void;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  onReconnect: () => () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const wasDisconnected = useRef(false);
  const reconnectCallbacks = useRef<Set<() => void>>(new Set());
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Register a callback for reconnection events
  const onReconnect = useCallback((callback: () => void) => {
    reconnectCallbacks.current.add(callback);
    return () => {
      reconnectCallbacks.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;

      if (!connected) {
        // Lost connection
        wasDisconnected.current = true;
        setIsConnected(false);
        setShowBanner(true);

        // Slide banner in
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();

        // Pulse animation for the icon
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      } else if (connected && wasDisconnected.current) {
        // Connection restored — fire all reconnect callbacks
        wasDisconnected.current = false;
        setIsConnected(true);

        // Stop pulse
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);

        // Trigger reconnect callbacks (auto-reload data)
        reconnectCallbacks.current.forEach((cb) => {
          try { cb(); } catch (e) { console.error('Reconnect callback error:', e); }
        });

        // Keep the "back online" banner visible briefly, then slide out
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 400,
            useNativeDriver: true,
          }).start(() => setShowBanner(false));
        }, 2000);
      } else {
        setIsConnected(true);
      }
    });

    return () => unsubscribe();
  }, [slideAnim, pulseAnim]);

  return (
    <NetworkContext.Provider value={{ isConnected, onReconnect }}>
      {children}
      {showBanner && (
        <Animated.View
          style={[
            styles.banner,
            isConnected ? styles.bannerOnline : styles.bannerOffline,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.bannerContent}>
            {isConnected ? (
              <>
                <Ionicons name="wifi" size={18} color="#ffffff" />
                <Text style={styles.bannerText}>Back Online!</Text>
              </>
            ) : (
              <>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons name="cloud-offline-outline" size={18} color="#ffffff" />
                </Animated.View>
                <Text style={styles.bannerText}>No Internet Connection</Text>
              </>
            )}
          </View>
          {!isConnected && (
            <Text style={styles.bannerSubText}>
              Please check your connection and try again
            </Text>
          )}
        </Animated.View>
      )}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  bannerOffline: {
    backgroundColor: '#ef4444',
  },
  bannerOnline: {
    backgroundColor: '#22c55e',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bannerSubText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});
