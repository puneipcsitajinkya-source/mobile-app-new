import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ImageProps, ImageSourcePropType, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FALLBACK_IMAGE = require('../../assets/general-img-landscape.png');

interface PremiumImageProps extends Omit<ImageProps, 'source'> {
  source?: ImageSourcePropType | null | undefined;
  sources?: ImageSourcePropType[] | null | undefined;
  autoplayInterval?: number;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  categoryName?: string; // Kept for API compatibility with existing screens
  fallbackEmoji?: string; // Kept for API compatibility with existing screens
}

export default function PremiumImage({
  source,
  sources,
  autoplayInterval = 2500,
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const isInitialLoad = useRef(true);

  const sourcesKey = React.useMemo(() => {
    if (!sources) return '';
    return sources
      .map((s: any) => {
        if (!s) return '';
        if (typeof s === 'number') return `local_${s}`;
        if (typeof s === 'object' && 'uri' in s) return s.uri || '';
        return '';
      })
      .join(',');
  }, [sources]);

  const handleLayout = (event: any) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w > 0) setContainerWidth(w);
    if (h > 0) setContainerHeight(h);
  };

  // If the parent changes the sources/source prop, reset state and scroll to start
  useEffect(() => {
    setCurrentIndex(0);
    isInitialLoad.current = true;
    try {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    } catch (err) {
      console.log('Reset scroll failed:', err);
    }
  }, [source, sourcesKey]);

  const activeSource = React.useMemo(() => {
    if (sources && sources.length > 0) {
      return sources[currentIndex];
    }
    return source;
  }, [source, sources, currentIndex]);

  const sourceKey = React.useMemo(() => {
    if (!activeSource) return '';
    if (typeof activeSource === 'number') return `local_${activeSource}`;
    if (Array.isArray(activeSource)) return activeSource.map(s => s.uri || '').join(',');
    if (typeof activeSource === 'object' && 'uri' in activeSource) {
      return activeSource.uri || '';
    }
    return '';
  }, [activeSource]);

  // Check if we have a valid source to attempt loading
  const hasValidUri = React.useMemo(() => {
    if (!activeSource) return false;
    if (typeof activeSource === 'number') return true; // Local asset
    if (Array.isArray(activeSource)) return activeSource.length > 0;
    if (typeof activeSource === 'object' && 'uri' in activeSource) {
      return !!activeSource.uri && activeSource.uri.trim() !== '';
    }
    return false;
  }, [activeSource]);

  const isLocalAsset = typeof activeSource === 'number';

  const [loading, setLoading] = useState(hasValidUri && !isLocalAsset);
  const [error, setError] = useState(!hasValidUri);

  // Animations
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;
  const imageOpacity = useRef(new Animated.Value(isLocalAsset ? 1 : 0)).current;

  useEffect(() => {
    if (sources && sources.length > 1 && !isInitialLoad.current) {
      return;
    }
    const valid = hasValidUri;
    const local = isLocalAsset;
    setLoading(valid && !local);
    setError(!valid);
    if (!valid || local) {
      imageOpacity.setValue(1);
    } else {
      imageOpacity.setValue(0);
    }
    isInitialLoad.current = false;
  }, [sourceKey, hasValidUri, isLocalAsset, sourcesKey]);

  // Autoplay slideshow logic (horizontal sliding carousel scroll)
  useEffect(() => {
    const activeSources = sources || [];
    if (activeSources.length <= 1 || containerWidth === 0) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % activeSources.length;
        try {
          scrollViewRef.current?.scrollTo({
            x: nextIndex * containerWidth,
            animated: true,
          });
        } catch (err) {
          console.warn('ScrollView scroll failed:', err);
        }
        return nextIndex;
      });
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [sourcesKey, autoplayInterval, containerWidth]);

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

  // ── Sliding Horizontal Carousel for Multiple Images ──
  if (sources && sources.length > 1 && containerWidth > 0 && containerHeight > 0) {
    return (
      <View
        style={[styles.container, viewSafeStyle, { borderRadius }]}
        onLayout={handleLayout}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', height: '100%' }}
        >
          {sources.map((src, idx) => {
            const hasValidSrc = !!src && (typeof src === 'number' || (typeof src === 'object' && !Array.isArray(src) && !!(src as any).uri));
            if (!hasValidSrc) {
              return (
                <Image
                  key={idx}
                  source={FALLBACK_IMAGE}
                  style={[
                    styles.fallback,
                    { borderRadius, width: containerWidth, height: containerHeight },
                  ]}
                  resizeMode="contain"
                />
              );
            }
            return (
              <Image
                key={idx}
                {...props}
                source={src!}
                style={{ width: containerWidth, height: containerHeight, borderRadius }}
                resizeMode={resizeMode}
              />
            );
          })}
        </ScrollView>
        {sources.length > 1 && containerHeight > 70 && (
          <View style={styles.carouselDots}>
            {sources.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.carouselDot,
                  currentIndex === idx && styles.carouselDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

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
        onLayout={handleLayout}
      />
    );
  }

  // ── Local asset → render directly, no loading states ──
  if (isLocalAsset) {
    return (
      <Animated.Image
        {...props}
        source={activeSource!}
        style={[style, { opacity: imageOpacity }]}
        resizeMode={resizeMode}
        onLayout={handleLayout}
      />
    );
  }

  // ── Remote URI → wrapper with shimmer + fade-in ──
  return (
    <View 
      style={[styles.container, viewSafeStyle, { borderRadius }]}
      onLayout={handleLayout}
    >
      {/* Actual image — fills the container */}
      <Animated.Image
        {...props}
        source={activeSource!}
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
  carouselDots: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
  },
  carouselDotActive: {
    backgroundColor: '#ffffff',
    width: 8,
    borderRadius: 2,
  },
});

