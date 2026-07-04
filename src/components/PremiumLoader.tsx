import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoaderProps {
  /** Message shown below the spinner */
  message?: string;
  /** Sub-message / hint text */
  subMessage?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** If true, renders as full-screen overlay; otherwise inline */
  fullScreen?: boolean;
  /** Icon name from Ionicons to show inside the spinner */
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function PremiumLoader({
  message,
  subMessage,
  size = 'large',
  fullScreen = true,
  icon = 'leaf',
}: LoaderProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;

  const sizeConfig = {
    small: { ring: 40, iconSize: 16, dotSize: 4 },
    medium: { ring: 60, iconSize: 24, dotSize: 5 },
    large: { ring: 80, iconSize: 32, dotSize: 6 },
  };

  const config = sizeConfig[size];

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Rotate the ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate dots sequentially
    const animateDots = () => {
      Animated.loop(
        Animated.stagger(200, [
          Animated.sequence([
            Animated.timing(dotAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dotAnim1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dotAnim2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dotAnim3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    animateDots();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinner = (
    <Animated.View style={[styles.spinnerContainer, { opacity: fadeAnim }]}>
      {/* Rotating ring */}
      <View style={[styles.ringContainer, { width: config.ring, height: config.ring }]}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: config.ring,
              height: config.ring,
              borderRadius: config.ring / 2,
              transform: [{ rotate: spin }],
            },
          ]}
        />
        {/* Icon in center */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons name={icon} size={config.iconSize} color="#a855f7" />
        </Animated.View>
      </View>

      {/* Message */}
      {message && (
        <View style={styles.messageContainer}>
          <Text style={[styles.message, size === 'small' && { fontSize: 13 }]}>
            {message}
          </Text>
          {/* Animated dots */}
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, { width: config.dotSize, height: config.dotSize, borderRadius: config.dotSize / 2, opacity: dotAnim1 }]} />
            <Animated.View style={[styles.dot, { width: config.dotSize, height: config.dotSize, borderRadius: config.dotSize / 2, opacity: dotAnim2 }]} />
            <Animated.View style={[styles.dot, { width: config.dotSize, height: config.dotSize, borderRadius: config.dotSize / 2, opacity: dotAnim3 }]} />
          </View>
        </View>
      )}

      {/* Sub message */}
      {subMessage && (
        <Text style={styles.subMessage}>{subMessage}</Text>
      )}
    </Animated.View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{spinner}</View>;
  }

  return spinner;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#f3e8ff',
    borderTopColor: '#a855f7',
    borderRightColor: '#c084fc',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 2,
  },
  dot: {
    backgroundColor: '#a855f7',
  },
  subMessage: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});
