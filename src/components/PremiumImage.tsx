import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ImageProps, ImageSourcePropType, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FALLBACK_IMAGE = require('../../assets/general-img-landscape.png');

interface PremiumImageProps extends Omit<ImageProps, 'source'> {
  source?: ImageSourcePropType | null | undefined;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  categoryName?: string; // Kept for API compatibility with existing screens
  fallbackEmoji?: string; // Kept for API compatibility with existing screens
}

export default function PremiumImage({
  source,
  style,
  resizeMode = 'cover',
  fallbackIcon = 'leaf-outline',
  categoryName,
  fallbackEmoji,
  onLoadStart,
  onLoad,
  onError,
  onLoadEnd,
  ...props
}: PremiumImageProps) {
  const sourceKey = React.useMemo(() => {
    if (!source) return '';
    if (typeof source === 'number') return `local_${source}`;
    if (Array.isArray(source)) return source.map(s => s.uri || '').join(',');
    if (typeof source === 'object' && 'uri' in source) {
      return source.uri || '';
    }
    return '';
  }, [source]);

  // Check if we have a valid source to attempt loading
  const hasValidUri = React.useMemo(() => {
    if (!source) return false;
    if (typeof source === 'number') return true; // Local asset
    if (Array.isArray(source)) return source.length > 0;
    if (typeof source === 'object' && 'uri' in source) {
      return !!source.uri && source.uri.trim() !== '';
    }
    return false;
  }, [sourceKey]);

  const isLocalAsset = typeof source === 'number';

  const [loading, setLoading] = useState(hasValidUri && !isLocalAsset);
  const [error, setError] = useState(!hasValidUri);

  // Animations
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;
  const imageOpacity = useRef(new Animated.Value(isLocalAsset ? 1 : 0)).current;

  // Restart loading state if source changes (using stable sourceKey)
  useEffect(() => {
    const valid = hasValidUri;
    const local = isLocalAsset;
    setLoading(valid && !local);
    setError(!valid);
    if (!valid || local) {
      imageOpacity.setValue(1);
    } else {
      imageOpacity.setValue(0);
    }
  }, [sourceKey, hasValidUri, isLocalAsset]);

  // Shimmer animation loop
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (loading && !error) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.85,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      shimmerAnim.setValue(0.4);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [loading, error]);

  const handleLoadStart = () => {
    if (!isLocalAsset) {
      setLoading(true);
      setError(false);
    }
    if (onLoadStart) onLoadStart();
  };

  const handleLoad = (event: any) => {
    setLoading(false);
    setError(false);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
    if (onLoad) onLoad(event);
  };

  const handleLoadEnd = () => {
    if (onLoadEnd) onLoadEnd();
  };

  const handleLoadError = (err: any) => {
    console.warn('[PremiumImage] Image load error for URL:', sourceKey, err?.nativeEvent);
    setLoading(false);
    setError(true);
    if (onError) onError(err);
  };

  // Flatten style to extract layout props for sub-elements
  const flatStyle = StyleSheet.flatten(style) || {};
  const borderRadius = (flatStyle.borderRadius as number) ?? 0;

  // Compute icon size from numeric height, or fallback to 24
  const iconSize = typeof flatStyle.height === 'number'
    ? Math.min(32, Math.max(16, flatStyle.height / 2.5))
    : 24;

  // Sanitize style for View-based renders (strip Image-only props like resizeMode)
  const viewSafeStyle = React.useMemo(() => {
    const { resizeMode: _rm, ...rest } = flatStyle;
    return rest;
  }, [flatStyle]);

  // ── Error / no source → premium fallback ──
  if (error || !hasValidUri) {
    console.log('[PremiumImage] Rendering fallback. URL:', sourceKey, 'error:', error, 'hasValidUri:', hasValidUri, 'fallbackAsset:', FALLBACK_IMAGE);
    return (
      <Image
        source={FALLBACK_IMAGE}
        style={[
          styles.fallback,
          { borderRadius },
          viewSafeStyle,
        ]}
        resizeMode="contain"
      />
    );
  }

  // ── Local asset → render directly, no loading states ──
  if (isLocalAsset) {
    return (
      <Animated.Image
        {...props}
        source={source!}
        style={[style, { opacity: imageOpacity }]}
        resizeMode={resizeMode}
      />
    );
  }

  // ── Remote URI → wrapper with shimmer + fade-in ──
  return (
    <View style={[styles.container, viewSafeStyle, { borderRadius }]}>
      {/* Actual image — fills the container */}
      <Animated.Image
        {...props}
        source={source!}
        style={[
          StyleSheet.absoluteFill,
          { opacity: imageOpacity, borderRadius },
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleLoadError}
        onLoadEnd={handleLoadEnd}
      />

      {/* Shimmer loading overlay */}
      {loading && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.shimmer,
            {
              backgroundColor: '#faf5ff',
              borderColor: '#ede9fe',
              borderWidth: 1,
              opacity: shimmerAnim,
              borderRadius,
            },
          ]}
        >
          <Ionicons name={fallbackIcon} size={iconSize} color="#cbd5e1" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: '#faf5ff',
    borderColor: '#ede9fe',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

