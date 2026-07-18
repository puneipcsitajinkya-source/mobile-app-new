import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, Dimensions,
  Animated, Easing, Platform, Modal, Image
} from 'react-native';
import PremiumImage from '../components/PremiumImage';
import * as SplashScreen from 'expo-splash-screen';
import PremiumLoader from '../components/PremiumLoader';
import StickyCart from '../components/StickyCart';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';
import { getProducts, getCategories, resolveMediaUrl } from '../services/api';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { useNetwork } from '../hooks/useNetwork';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

interface Product {
  _id: string;
  name: { en: string; mr: string } | string;
  description: string;
  price: number;
  mrp?: number;
  discount?: number;
  unit?: string;
  image?: string;
  category: string;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
  image?: string;
}

const { width } = Dimensions.get('window');
const PROMO_WIDTH = width - 48;
const APP_LOGO = require('../../assets/icon.png');

const PROMO_ITEMS = [
  {
    title: 'Super Fast Delivery',
    subtitle: 'Fresh groceries in minutes',
    badge: 'Priority',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=500',
    backgroundColor: '#7c3aed',
  },
  {
    title: 'Premium Savings',
    subtitle: 'Get up to 15% off on daily essentials',
    badge: 'Limited Offer',
    image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&q=80&w=500',
    backgroundColor: '#0f766e',
  },
  {
    title: 'New Arrivals',
    subtitle: 'Exclusive store deals just for you',
    badge: 'Just In',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=500',
    backgroundColor: '#f59e0b',
  },
];

const SEARCH_PLACEHOLDERS = [
  'Search "milk"',
  'Search "rice"',
  'Search "bread"',
  'Search "vegetables"',
  'Search "fruits"',
  'Search "snacks"',
];

interface ProductCardProps {
  item: Product;
  qty: number;
  onPress: (productId: string) => void;
  onAdd: (product: Product) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  productLabel: string;
  compact?: boolean;
}

// ─── Blinkit-style product card ───────────────────────────────────────────────
const ProductCard = memo(function ProductCard({
  item,
  qty,
  onPress,
  onAdd,
  onIncrement,
  onDecrement,
  productLabel,
  compact = false,
}: ProductCardProps) {
  const hasDiscount = item.mrp != null && item.mrp > item.price;
  const discountPct = hasDiscount
    ? Math.round(((item.mrp! - item.price) / item.mrp!) * 100)
    : (item.discount ?? 0);

  return (
    <TouchableOpacity
      style={compact ? styles.blinkCard : styles.blinkCardWide}
      onPress={() => onPress(item._id)}
      activeOpacity={0.9}
    >
      {/* Image area */}
      <View style={compact ? styles.blinkImgBox : styles.blinkImgBoxWide}>
        <PremiumImage
          source={resolveMediaUrl(item.image) ? { uri: resolveMediaUrl(item.image)! } : null}
          style={styles.blinkImg}
          fallbackIcon="leaf-outline"
          categoryName={item.category}
        />
        {discountPct > 0 && (
          <View style={styles.blinkDiscBadge}>
            <Text style={styles.blinkDiscText}>{discountPct}%{`\n`}OFF</Text>
          </View>
        )}
        {/* ADD / qty control anchored to bottom-right of image */}
        <View style={styles.blinkAddAnchor}>
          {qty > 0 ? (
            <View style={styles.blinkQtyRow}>
              <TouchableOpacity style={styles.blinkQtyBtn} onPress={() => onDecrement(item._id)} activeOpacity={0.7}>
                <Text style={styles.blinkQtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.blinkQtyVal}>{qty}</Text>
              <TouchableOpacity style={styles.blinkQtyBtn} onPress={() => onIncrement(item._id)} activeOpacity={0.7}>
                <Text style={styles.blinkQtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.blinkAddBtn} onPress={() => onAdd(item)} activeOpacity={0.8}>
              <Text style={styles.blinkAddText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info area */}
      <View style={styles.blinkInfo}>
        <Text style={styles.blinkUnit} numberOfLines={1}>{item.unit || '1 pc'}</Text>
        <Text style={compact ? styles.blinkName : styles.blinkNameWide} numberOfLines={2}>{productLabel}</Text>
        {hasDiscount && (
          <Text style={styles.blinkSaving} numberOfLines={1}>
            {discountPct}% OFF on MRP
          </Text>
        )}
        <View style={styles.blinkPriceRow}>
          <Text style={styles.blinkPrice}>₹{item.price}</Text>
          {hasDiscount && (
            <Text style={styles.blinkMrp}>₹{item.mrp}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToCart, items: cart, totalItems, totalAmount: cartTotal, increaseQty, decreaseQty } = useCart();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const { language, setLanguage, translating, tProduct, tCategory } = useLanguage();
  const { onReconnect } = useNetwork();


  const load = useCallback(async () => {
    const startedAt = Date.now();

    try {
      const [prodRes, catRes] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodRes.data);
      setCategories(catRes.data);

      // Prefetch product images for instant loading
      if (prodRes.data && Array.isArray(prodRes.data)) {
        prodRes.data.slice(0, 15).forEach((p: Product) => {
          const resolved = resolveMediaUrl(p.image);
          if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
            Image.prefetch(resolved).catch(err => console.log('Product image prefetch failed:', resolved, err));
          }
        });
      }

      // Prefetch category images
      if (catRes.data && Array.isArray(catRes.data)) {
        catRes.data.forEach((c: Category) => {
          const resolved = resolveMediaUrl(c.image);
          if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
            Image.prefetch(resolved).catch(err => console.log('Category image prefetch failed:', resolved, err));
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 600 - elapsed);

      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      // Hide native splash BEFORE revealing content — no PremiumLoader flash
      SplashScreen.hideAsync().catch(() => undefined);

      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const unsubscribe = onReconnect(() => {
      setRefreshing(true);
      load();
    });
    return unsubscribe;
  }, [onReconnect, load]);

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const name = (cat.name || '').trim();
      if (!name || seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase());
      return true;
    });
  }, [categories]);

  const productsByCategory = useMemo(() => {
    if (search.trim()) {
      const lower = search.toLowerCase();
      const filtered = products.filter(p => {
        const nameObj = p.name;
        if (typeof nameObj === 'object') {
          return nameObj.en.toLowerCase().includes(lower) || nameObj.mr.toLowerCase().includes(lower);
        }
        return String(nameObj).toLowerCase().includes(lower);
      });
      return filtered.length > 0
        ? [{ category: { _id: 'search', name: 'Search Results', icon: '🔍' }, products: filtered }]
        : [];
    }

    return uniqueCategories.map(cat => ({
      category: cat,
      products: products.filter(p => (p.category || '').toLowerCase() === cat.name.toLowerCase())
    })).filter(group => group.products.length > 0);
  }, [products, uniqueCategories, search]);

  const handleAdd = useCallback((product: Product) => {
    addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image, mrp: product.mrp });
  }, [addToCart]);

  const handleProductPress = useCallback((productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  }, [navigation]);

  const qtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach(item => {
      map[item._id] = item.quantity;
    });
    return map;
  }, [cart]);

  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const promoListRef = useRef<FlatList<typeof PROMO_ITEMS[number]> | null>(null);

  // ═══════════════════════════════════════════
  //  ADVANCED SEARCH BAR ANIMATIONS
  // ═══════════════════════════════════════════
  const searchScaleAnim    = useRef(new Animated.Value(1)).current;
  const searchGlowAnim     = useRef(new Animated.Value(0)).current;
  const searchGlowPulse    = useRef(new Animated.Value(1)).current;
  const clearBtnAnim       = useRef(new Animated.Value(0)).current;
  const placeholderSlide   = useRef(new Animated.Value(0)).current;   // 0=visible, -14=slide up
  const placeholderOpacity = useRef(new Animated.Value(1)).current;
  const iconBounceAnim     = useRef(new Animated.Value(0)).current;   // 0 = normal, 1 = bounced
  const shimmerAnim        = useRef(new Animated.Value(-1)).current;  // sweeps -1 → 2

  const [searchFocused, setSearchFocused]       = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // — Shimmer sweep (idle, every 4 s) —
  useEffect(() => {
    const runShimmer = () => {
      shimmerAnim.setValue(-1);
      Animated.timing(shimmerAnim, {
        toValue: 2,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    };
    const t = setTimeout(runShimmer, 600);
    const id = setInterval(runShimmer, 4200);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [shimmerAnim]);

  // — Placeholder slide-fade cycle —
  useEffect(() => {
    if (searchFocused || search.length > 0) return;
    const id = setInterval(() => {
      // slide up & fade out
      Animated.parallel([
        Animated.timing(placeholderSlide,   { toValue: -14, duration: 260, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(placeholderOpacity, { toValue: 0,   duration: 240, useNativeDriver: true }),
      ]).start(() => {
        setPlaceholderIndex(p => (p + 1) % SEARCH_PLACEHOLDERS.length);
        placeholderSlide.setValue(14);          // reset to slide-in from below
        Animated.parallel([
          Animated.timing(placeholderSlide,   { toValue: 0, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(placeholderOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        ]).start();
      });
    }, 2800);
    return () => clearInterval(id);
  }, [searchFocused, search, placeholderSlide, placeholderOpacity]);

  // — Clear-button spring —
  useEffect(() => {
    const hasText = search.length > 0;
    Animated.spring(clearBtnAnim, {
      toValue: hasText ? 1 : 0,
      useNativeDriver: true,
      tension: 340,
      friction: 9,
    }).start();
  }, [search, clearBtnAnim]);

  // — Focus / blur —
  const handleSearchFocus = useCallback(() => {
    setSearchFocused(true);
    Animated.parallel([
      // spring scale up
      Animated.spring(searchScaleAnim, { toValue: 1.022, useNativeDriver: true, tension: 260, friction: 9 }),
      // glow fade in
      Animated.timing(searchGlowAnim,  { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      // icon bounce: quick up-down
      Animated.sequence([
        Animated.timing(iconBounceAnim, { toValue: -6, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(iconBounceAnim, { toValue: 0,  useNativeDriver: true, tension: 400, friction: 7 }),
      ]),
    ]).start();
    // start glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(searchGlowPulse, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(searchGlowPulse, { toValue: 1.00, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [searchScaleAnim, searchGlowAnim, iconBounceAnim, searchGlowPulse]);

  const handleSearchBlur = useCallback(() => {
    setSearchFocused(false);
    searchGlowPulse.stopAnimation();
    Animated.parallel([
      Animated.spring(searchScaleAnim, { toValue: 1,  useNativeDriver: true, tension: 260, friction: 9 }),
      Animated.timing(searchGlowAnim,  { toValue: 0,  duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(searchGlowPulse, { toValue: 1,  useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  }, [searchScaleAnim, searchGlowAnim, searchGlowPulse]);


  // \u2014 Promo banner auto-scroll \u2014
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePromoIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % PROMO_ITEMS.length;
        promoListRef.current?.scrollToOffset({ offset: nextIndex * PROMO_WIDTH, animated: true });
        return nextIndex;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const renderPromoItem = useCallback(({ item }: { item: typeof PROMO_ITEMS[number] }) => (
    <View style={[styles.promoCard, { width: PROMO_WIDTH, backgroundColor: item.backgroundColor }]}> 
      <PremiumImage source={{ uri: item.image }} style={styles.promoImg} />
      <View style={styles.promoOverlay} />
      <View style={styles.promoContent}>
        <View style={styles.promoBadge}>
          <Text style={styles.promoBadgeText}>{item.badge}</Text>
        </View>
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoSub}>{item.subtitle}</Text>
      </View>
    </View>
  ), []);



  // ─── Render each product as a compact blink card inside the 2-col grid ──────
  const renderGridProduct = useCallback((product: Product) => (
    <ProductCard
      key={product._id}
      item={product}
      qty={qtyMap[product._id] ?? 0}
      onPress={handleProductPress}
      onAdd={handleAdd}
      onIncrement={increaseQty}
      onDecrement={decreaseQty}
      productLabel={tProduct(product.name)}
      compact
    />
  ), [qtyMap, handleAdd, handleProductPress, tProduct, increaseQty, decreaseQty]);

  const renderCategoryGroup = useCallback(({ item: group }: { item: { category: Category; products: Product[] } }) => {
    // Split products into rows of 2 for the 2-col grid
    const rows: Product[][] = [];
    for (let i = 0; i < group.products.length; i += 2) {
      rows.push(group.products.slice(i, i + 2));
    }
    return (
      <View key={group.category._id} style={styles.catSection}>
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {group.category.name === 'Search Results' ? group.category.name : tCategory(group.category.name)}
          </Text>
          {group.category.name !== 'Search Results' && (
            <TouchableOpacity onPress={() => navigation.navigate('CategoryProducts', { categoryName: group.category.name })}>
              <Text style={styles.seeAllText}>See all ›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal product scroll showing Blinkit-style cards */}
        <FlatList
          horizontal
          data={group.products}
          renderItem={({ item }) => renderGridProduct(item)}
          keyExtractor={(item) => item._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.blinkHScroll}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={9}
          removeClippedSubviews
          nestedScrollEnabled
          extraData={qtyMap}
        />
      </View>
    );
  }, [renderGridProduct, tCategory, navigation, qtyMap]);

  const listHeaderComponent = useMemo(() => (
    <View>
      {!search && (
        <View style={styles.promoWrapper}>
          <FlatList
            ref={promoListRef}
            data={PROMO_ITEMS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.promoScrollContent}
            renderItem={renderPromoItem}
            keyExtractor={(_, index) => `promo-${index}`}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / PROMO_WIDTH);
              setActivePromoIndex(index);
            }}
          />
          <View style={styles.promoDotContainer}>
            {PROMO_ITEMS.map((_, index) => (
              <View
                key={index}
                style={[styles.promoDot, index === activePromoIndex && styles.promoDotActive]}
              />
            ))}
          </View>
        </View>
      )}

      {!search && (
        <View style={styles.categoryGridContainer}>
          {uniqueCategories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              style={styles.catGridItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CategoryProducts', { categoryName: cat.name })}
            >
              <View style={styles.catGridImgContainer}>
                <PremiumImage
                  source={resolveMediaUrl(cat.image) ? { uri: resolveMediaUrl(cat.image)! } : null}
                  style={styles.catGridImg}
                  categoryName={cat.name}
                  fallbackEmoji={cat.icon}
                />
              </View>
              <Text style={styles.catGridText} numberOfLines={2}>{tCategory(cat.name)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  ), [search, uniqueCategories, navigation, tCategory]);

  const emptyStateComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="search-outline" size={44} color="#4b5563" />
      </View>
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubText}>Try a different keyword or check back later.</Text>
    </View>
  ), []);

  // During initial load, render the animated premium loader
  if (loading) {
    return (
      <PremiumLoader
        message="Loading FirstMart"
        subMessage="Fresh products in minutes"
        fullScreen
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.headerBrand}>
                  <PremiumImage source={APP_LOGO} style={styles.headerLogo} />
              <View>
                <Text style={styles.deliveryTitle}>Firstmartt</Text>
                <Text style={styles.deliverySubtitle}>Delivery in 10 minutes</Text>
              </View>
            </View>

          </View>
          {/* <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={36} color="#4b5563" />
          </TouchableOpacity> */}
          <TouchableOpacity style={styles.languageTogglePill} onPress={() => setLangModalVisible(true)}>
            <Ionicons name="globe-outline" size={15} color="#4b5563" style={{ marginRight: 4 }} />
            <Text style={styles.languageToggleText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ ADVANCED ANIMATED SEARCH BAR ═══ */}
        <Animated.View style={[styles.searchRowOuter, { transform: [{ scale: searchScaleAnim }] }]}>

          {/* Pulsing glow border — scales + fades on focus */}
          <Animated.View
            style={[
              styles.searchGlowBorder,
              {
                opacity: searchGlowAnim,
                transform: [{ scale: searchGlowPulse }],
              },
            ]}
            pointerEvents="none"
          />

          <View style={styles.searchBox}>

            {/* Bouncing search icon */}
            <Animated.View style={{ transform: [{ translateY: iconBounceAnim }], marginRight: 8 }}>
              <Ionicons
                name={searchFocused ? 'search' : 'search-outline'}
                size={20}
                color={searchFocused ? '#7c3aed' : '#94a3b8'}
              />
            </Animated.View>

            {/* Input + slide-fade cycling placeholder */}
            <View style={{ flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
              <TextInput
                style={styles.searchInput}
                placeholder=""
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
              />
              {!search && !searchFocused && (
                <View pointerEvents="none" style={styles.searchPlaceholderWrap}>
                  <Animated.Text
                    style={[
                      styles.searchPlaceholder,
                      {
                        opacity: placeholderOpacity,
                        transform: [{ translateY: placeholderSlide }],
                      },
                    ]}
                  >
                    {SEARCH_PLACEHOLDERS[placeholderIndex]}
                  </Animated.Text>
                </View>
              )}
            </View>

            {/* Shimmer sweep — slides across the bar when idle */}
            {!searchFocused && !search && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.shimmerBar,
                  {
                    transform: [{
                      translateX: shimmerAnim.interpolate({
                        inputRange: [-1, 2],
                        outputRange: [-200, 400],
                      }),
                    }],
                  },
                ]}
              />
            )}

            {/* Animated clear ✕ button (shows when text entered) */}
            {search.length > 0 && (
              <Animated.View style={{ opacity: clearBtnAnim, transform: [{ scale: clearBtnAnim }], marginLeft: 4 }}>
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color="#7c3aed" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </View>

      <FlatList
        data={productsByCategory}
        keyExtractor={(item) => item.category._id}
        renderItem={renderCategoryGroup}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={search && productsByCategory.length === 0 ? emptyStateComponent : null}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={9}
        removeClippedSubviews
        updateCellsBatchingPeriod={30}
        scrollEventThrottle={16}
      />

      <StickyCart
        totalItems={totalItems}
        cartTotal={cartTotal}
        onPress={() => navigation.navigate('Cart' as any)}
        tintColor="#7c3aed"
      />
      {/* Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language / भाषा</Text>

            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.activeLangOption]}
              onPress={() => {
                setLangModalVisible(false);
                setLanguage('en');
              }}
            >
              <Text style={[styles.langText, language === 'en' && styles.activeLangText]}>🇬🇧 English</Text>
              {language === 'en' && <Ionicons name="checkmark-circle" size={20} color="#4b5563" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, language === 'hi' && styles.activeLangOption]}
              onPress={() => {
                setLangModalVisible(false);
                setLanguage('hi');
              }}
            >
              <Text style={[styles.langText, language === 'hi' && styles.activeLangText]}>🇮🇳 हिंदी (Hindi)</Text>
              {language === 'hi' && <Ionicons name="checkmark-circle" size={20} color="#4b5563" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, language === 'mr' && styles.activeLangOption]}
              onPress={() => {
                setLangModalVisible(false);
                setLanguage('mr');
              }}
            >
              <Text style={[styles.langText, language === 'mr' && styles.activeLangText]}>🇮🇳 मराठी (Marathi)</Text>
              {language === 'mr' && <Ionicons name="checkmark-circle" size={20} color="#4b5563" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setLangModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Translating Spinner Overlay */}
      {translating && (
        <View style={styles.translatingOverlay}>
          <PremiumLoader
            message="Translating application"
            subMessage="कृपया प्रतीक्षा करा / कृपया प्रतीक्षा करें"
            size="medium"
            fullScreen={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#7c3aed',
    paddingTop: Platform.OS === 'ios' ? 40 : 32,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flex: 1 },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 10,
  },
  headerLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    color: '#7c3aed',
    fontSize: 18,
    fontWeight: '800',
  },
  deliveryTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', lineHeight: 20 },
  deliverySubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500', lineHeight: 14 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationText: { color: '#f8fafc', fontSize: 13, marginRight: 4, maxWidth: '90%' },
  languageTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 12,
  },
  languageToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  profileBtn: {},
  searchRowOuter: {
    borderRadius: 14,
    position: 'relative',
  },
  searchGlowBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: '#a855f7',
    backgroundColor: 'transparent',
    // soft shadow so the glow bleeds outward
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 0,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',           // clips shimmer bar
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 0 },
  searchPlaceholderWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#94a3b8',
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.55)',
    // angled via skewX — note: skewX needs transform array on the parent
    opacity: 0.7,
    borderRadius: 4,
    transform: [{ skewX: '-20deg' }],
  },
  promoWrapper: { marginTop: 16, marginBottom: 14 },
  promoScrollContent: { paddingHorizontal: 16 },
  promoCard: {
    height: 128,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#7c3aed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  promoImg: { width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute' },
  promoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  promoContent: {
    position: 'absolute', left: 18, bottom: 18, right: 18,
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
  },
  promoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  promoTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  promoSub: { color: '#f8fafc', fontSize: 14, marginTop: 6, lineHeight: 20 },
  promoDotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  promoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.5)',
    marginHorizontal: 4,
  },
  promoDotActive: {
    backgroundColor: '#ffffff',
    width: 18,
  },
  // ─── Category grid (top strip) ──────────────────────────────────────────────
  categoryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  catGridItem: {
    width: (width - 20) / 4,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  catGridImgContainer: {
    width: (width - 20) / 4 - 6,
    height: (width - 20) / 4 - 6,
    borderRadius: 14,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
    // No padding — images fill the full square for uniform ratio
  },
  catGridImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  catGridIcon: { fontSize: 36 },
  catGridText: {
    fontSize: 11,
    color: '#3b0764',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 2,
  },

  // ─── Category section (Blinkit-style) ────────────────────────────────────────
  catSection: {
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#faf5ff',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2d1b69' },
  seeAllText: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  blinkHScroll: { paddingHorizontal: 12, paddingBottom: 12 },

  // ─── Blinkit-style product card (compact — for horizontal list) ───────────────
  blinkCard: {
    width: 148,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  blinkCardWide: {
    width: 160,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  blinkImgBox: {
    width: '100%',
    height: 130,
    backgroundColor: '#faf5ff',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blinkImgBoxWide: {
    width: '100%',
    height: 150,
    backgroundColor: '#faf5ff',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blinkImg: { width: '85%', height: '85%', resizeMode: 'contain' },
  blinkImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blinkDiscBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignItems: 'center',
    minWidth: 34,
  },
  blinkDiscText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  blinkAddAnchor: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 20,
    elevation: 20,
  },
  blinkAddBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 60,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  blinkAddText: { color: '#7c3aed', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  blinkQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 80,
    height: 30,
  },
  blinkQtyBtn: {
    width: 28,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blinkQtyBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  blinkQtyVal: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '800', color: '#ffffff' },
  blinkInfo: { paddingHorizontal: 10, paddingVertical: 10 },
  blinkUnit: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  blinkName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e1b4b',
    lineHeight: 17,
    marginBottom: 4,
    minHeight: 34,
  },
  blinkNameWide: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e1b4b',
    lineHeight: 18,
    marginBottom: 4,
    minHeight: 36,
  },
  blinkSaving: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '700',
    marginBottom: 4,
  },
  blinkPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blinkPrice: { fontSize: 15, fontWeight: '800', color: '#1e1b4b' },
  blinkMrp: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },

  // ─── Legacy card styles kept for safety ──────────────────────────────────────
  horizontalSection: { marginBottom: 24 },
  horizontalScroll: { paddingHorizontal: 12, paddingBottom: 4 },
  card: {
    width: 140, backgroundColor: '#ffffff', borderRadius: 12, marginHorizontal: 4,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardImgContainer: { width: '100%', height: 120, backgroundColor: '#f8fafc', position: 'relative' },
  cardImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  cardImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  discountBadge: {
    position: 'absolute', top: 0, left: 0, backgroundColor: '#3b82f6',
    paddingHorizontal: 6, paddingVertical: 2, borderBottomRightRadius: 8
  },
  discountText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  cardBody: { padding: 10 },
  cardUnit: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 8, height: 36, lineHeight: 18 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardMrp: { fontSize: 11, color: '#94a3b8', textDecorationLine: 'line-through', marginTop: 2 },
  addBtn: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#7c3aed',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, minWidth: 44, alignItems: 'center'
  },
  addBtnText: { color: '#7c3aed', fontSize: 11, fontWeight: '800' },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#7c3aed', borderRadius: 8, overflow: 'hidden', minWidth: 50, height: 26
  },
  qtyButton: {
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed',
  },
  qtyButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  qtyValue: { minWidth: 20, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#0f172a' },
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 36, paddingHorizontal: 20, paddingBottom: 100,
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 16, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  emptyTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptySubText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyText: { color: '#64748b', fontSize: 16, marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 20,
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeLangOption: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  langText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  activeLangText: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  translatingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  translatingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  translatingSubText: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },
});

