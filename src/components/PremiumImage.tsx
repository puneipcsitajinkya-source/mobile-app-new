import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PremiumImageProps {
  uri?: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export default function PremiumImage({
  uri,
  style,
  containerStyle,
  iconName = 'leaf-outline',
  iconSize = 36,
  iconColor = '#a855f7',
  resizeMode = 'contain',
}: PremiumImageProps) {
  const [hasError, setHasError] = useState(false);

  const showPlaceholder = !uri || hasError;



  if (showPlaceholder) {
    return (
      <View style={[styles.placeholderContainer, style, containerStyle]}>
        <View style={styles.placeholderInner}>
          <View style={styles.iconCircle}>
            <Ionicons name={iconName} size={iconSize} color={iconColor} />
          </View>
          {/* Decorative dots */}
          <View style={[styles.dot, styles.dotTopLeft]} />
          <View style={[styles.dot, styles.dotTopRight]} />
          <View style={[styles.dot, styles.dotBottomLeft]} />
          <View style={[styles.dot, styles.dotBottomRight]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[style, containerStyle, { overflow: 'hidden' }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#faf5ff',
    borderWidth: 2,
    borderColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e9d5ff',
    opacity: 0.6,
  },
  dotTopLeft: { top: '18%', left: '15%' },
  dotTopRight: { top: '22%', right: '18%' },
  dotBottomLeft: { bottom: '20%', left: '22%' },
  dotBottomRight: { bottom: '15%', right: '12%' },
});
