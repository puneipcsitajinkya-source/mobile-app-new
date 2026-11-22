import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, Dimensions,
  Animated, Easing, Platform, Modal, Image,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent,
  Linking, Alert
} from 'react-native';
import PremiumImage from '../components/PremiumImage';
import * as SplashScreen from 'expo-splash-screen';
import PremiumLoader from '../components/PremiumLoader';
import StickyCart from '../components/StickyCart';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';
import { getProducts, getCategories, resolveMediaUrl, getSettings, findNearestStore, getStores } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { useNetwork } from '../hooks/useNetwork';
import { Ionicons } from '@expo/vector-icons';
import PremiumTabIcon from '../components/PremiumTabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  images?: string[];
  category: string;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
  image?: string;
  images?: string[];
  mainCategory?: string;
  mainCategoryIcon?: string;
}

const { width } = Dimensions.get('window');
const PROMO_WIDTH = width - 48;
const APP_LOGO = require('../../assets/icon.png');

const STORAGE_CACHED_PRODUCTS = '@cached_home_products';
const STORAGE_CACHED_CATEGORIES = '@cached_home_categories';
const STORAGE_CACHED_BANNERS = '@cached_home_banners';

const PROMO_ITEMS = [
  {
    title: 'Upto 50% Off Today',
    subtitle: 'Get amazing discounts on all premium groceries & daily essentials',
    badge: 'BEST OFFER',
    image: 'https://images.unsplash.com/photo-1506617498300-38435a0950e8?w=800&q=80',
    backgroundColor: '#a21caf', // Vibrant Magenta
  },
  {
    title: 'Low Price Guaranteed',
    subtitle: 'Unbeatable prices on fresh vegetables, milk, bread & eggs',
    badge: 'LOWEST PRICE',
    image: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&q=80',
    backgroundColor: '#15803d', // Vibrant Green
  },
  {
    title: 'Mega Savings Week',
    subtitle: 'Save big on your monthly grocery list with super saver packs',
    badge: 'SUPER VALUE',
    image: 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=800&q=80',
    backgroundColor: '#ea580c', // Vibrant Orange
  },
];

const SEARCH_PLACEHOLDERS: Record<string, string[]> = {
  en: [
    'Search for atta, dal, coke and ...',
    'Search "milk, bread & eggs"',
    'Search "fresh vegetables & fruits"',
    'Search "chips, drinks & snacks"',
  ],
  mr: [
    'आटा, डाळ, पेय शोधा...',
    '"दूध, ब्रेड आणि अंडी" शोधा',
    '"ताजी फळे आणि भाज्या" शोधा',
    '"चिप्स, पेये आणि स्नॅक्स" शोधा',
  ],
  hi: [
    'आटा, दाल, ड्रिंक्स खोजें...',
    '"दूध, ब्रेड और अंडे" खोजें',
    '"ताजे फल और सब्जियां" खोजें',
    '"चिप्स, ड्रिंक्स और स्नैक्स" खोजें',
  ],
};

interface ProductCardProps {
  item: Product;
  qty: number;
  onPress: (productId: string) => void;
  onAdd: (product: Product) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  productLabel: string;
  addText?: string;
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
  addText,
  compact = false,
}: ProductCardProps) {
  const hasDiscount = item.mrp != null && item.mrp > item.price;
  const discountPct = hasDiscount
    ? Math.round(((item.mrp! - item.price) / item.mrp!) * 100)
    : (item.discount ?? 0);

  const [activeIdx, setActiveIdx] = useState(0);
  const cardWidth = compact ? 148 : 160;
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    if (index !== activeIdx && index >= 0 && index < (item.images?.length || 0)) {
      setActiveIdx(index);
    }
  };

  return (
    <View
      style={compact ? styles.blinkCard : styles.blinkCardWide}
    >
      {/* Image area */}
      <View style={compact ? styles.blinkImgBox : styles.blinkImgBoxWide}>
        {item.images && item.images.length > 1 ? (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: '100%', height: '100%' }}
          >
            {item.images.map((imgUrl, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.9}
                onPress={() => onPress(item._id)}
                style={{ width: cardWidth, height: compact ? 130 : 150, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}
              >
                <PremiumImage
                  source={resolveMediaUrl(imgUrl) ? { uri: resolveMediaUrl(imgUrl)! } : null}
                  style={{ width: 110, height: 110 }}
                  resizeMode="contain"
                  fallbackIcon="leaf-outline"
                  categoryName={item.category}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPress(item._id)}
            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <PremiumImage
              source={resolveMediaUrl(item.image) ? { uri: resolveMediaUrl(item.image)! } : null}
              style={{ width: 110, height: 110 }}
              resizeMode="contain"
              fallbackIcon="leaf-outline"
              categoryName={item.category}
            />
          </TouchableOpacity>
        )}

        {/* Carousel indicator dots */}
        {item.images && item.images.length > 1 && (
          <View style={styles.cardDotsContainer}>
            {item.images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.cardDot,
                  activeIdx === idx ? styles.cardActiveDot : null
                ]}
              />
            ))}
          </View>
        )}

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
              <Text style={styles.blinkAddText}>{addText || 'ADD'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info area */}
      <View style={styles.blinkInfo}>
        <TouchableOpacity onPress={() => onPress(item._id)} activeOpacity={0.9}>
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
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMainTab, setSelectedMainTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToCart, items: cart, totalItems, totalAmount: cartTotal, increaseQty, decreaseQty, clearCart } = useCart();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const { language, setLanguage, translating, tProduct, tCategory } = useLanguage();
  const { onReconnect } = useNetwork();

  // Location and Store States
  const [activeStore, setActiveStore] = useState<any>(null);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // Not Deliverable Popup States
  const [isNotDeliverable, setIsNotDeliverable] = useState(false);
  const [showNotDeliverablePopup, setShowNotDeliverablePopup] = useState(false);
  const notDeliverableScaleAnim = useRef(new Animated.Value(0)).current;
  const notDeliverableOpacityAnim = useRef(new Animated.Value(0)).current;

  const fetchAllStores = async () => {
    try {
      const res = await getStores();
      setAllStores(res.data || []);
    } catch (e) {
      console.error('Failed to fetch stores:', e);
      Alert.alert(
        'Connection Error',
        'Failed to connect to the server. Please check your internet connection and try again.',
        [{ text: 'Retry', onPress: fetchAllStores }]
      );
    }
  };

  const handleFallbackStore = async (): Promise<string | undefined> => {
    // Fallback: Check if there's a saved store
    const savedStore = await AsyncStorage.getItem('active_store');
    if (savedStore) {
      try {
        const parsed = JSON.parse(savedStore);
        setActiveStore(parsed);
        return parsed._id; // Return store ID so load() can be called
      } catch (e) {
        await AsyncStorage.removeItem('active_store');
      }
    }

    // No saved store: show list of all stores
    await fetchAllStores();
    // Hide the full-screen loading spinner so the modal is visible
    setLoading(false);
    SplashScreen.hideAsync().catch(() => undefined);
    setShowStoreModal(true);
    return undefined; // Modal is open, load() will be called when user selects a store
  };

  const checkLocationAndResolveStore = async (isManual = false): Promise<string | undefined> => {
    setLocLoading(true);
    try {
      // 1. Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
      if (!servicesEnabled) {
        if (isManual) {
          Alert.alert('Location Services Required', 'Please turn on Location Services to automatically find the nearest store.');
        }
        return await handleFallbackStore();
      }

      // 2. Check / request foreground permission
      let perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!perm || perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      }
      if (!perm || perm.status !== 'granted') {
        if (isManual) {
          Alert.alert('Location Permission Required', 'Location permission is required to find your nearest store.');
        }
        return await handleFallbackStore();
      }

      // 3. Try last known position first (super fast, <50ms)
      const lastKnown = await Location.getLastKnownPositionAsync({}).catch(() => null);
      if (lastKnown?.coords) {
        console.log(`[GPS] Found lastKnown coordinates: lat=${lastKnown.coords.latitude}, lng=${lastKnown.coords.longitude}`);
        const nearestRes = await findNearestStore(lastKnown.coords.latitude, lastKnown.coords.longitude).catch(() => null);
        if (nearestRes?.data?.store && nearestRes.data.isServiceable) {
          const store = nearestRes.data.store;
          await AsyncStorage.setItem('active_store', JSON.stringify(store));
          setActiveStore(store);
          setIsNotDeliverable(false);
          setShowNotDeliverablePopup(false);
          console.log(`[GPS] Store resolved from lastKnown: ${store.name} (${store._id})`);
          return store._id;
        }
      }

      // 4. Try fresh location with a fast 2.5-second timeout (never blocks startup)
      const fresh: any = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);

      if (fresh?.coords) {
        console.log(`[GPS] Resolved fresh coordinates: lat=${fresh.coords.latitude}, lng=${fresh.coords.longitude}`);
        const nearestRes = await findNearestStore(fresh.coords.latitude, fresh.coords.longitude).catch(() => null);
        if (nearestRes?.data?.store && nearestRes.data.isServiceable) {
          const store = nearestRes.data.store;
          await AsyncStorage.setItem('active_store', JSON.stringify(store));
          setActiveStore(store);
          setIsNotDeliverable(false);
          setShowNotDeliverablePopup(false);
          console.log(`[GPS] Store resolved from fresh GPS: ${store.name} (${store._id})`);
          return store._id;
        }
      }

      // If location outside delivery area or GPS timed out
      if (isManual) {
        setIsNotDeliverable(true);
        setShowNotDeliverablePopup(true);
      }
      return await handleFallbackStore();
    } catch (err: any) {
      console.warn('Error resolving nearest store via location:', err);
      return await handleFallbackStore();
    } finally {
      setLocLoading(false);
    }
  };

  const load = useCallback(async (resolvedStoreId?: string) => {
    try {
      let storeId = resolvedStoreId || '';
      if (!storeId) {
        const savedStore = await AsyncStorage.getItem('active_store');
        if (savedStore) {
          try {
            const parsed = JSON.parse(savedStore);
            storeId = parsed._id;
            setActiveStore(parsed);
          } catch (e) {
            console.error(e);
          }
        }
      }

      const params = storeId ? { store: storeId } : undefined;
      console.log(`[Load] Fetching products${storeId ? ` for store ${storeId}` : ' (all stores)'}`);

      const [prodRes, catRes, settingsRes] = await Promise.all([
        getProducts(params),
        getCategories(params),
        getSettings(params).catch(() => ({ data: null })),
      ]);

      const visibleCats: Category[] = catRes?.data || [];
      const visibleCatSet = new Set(
        visibleCats.map((c) => (c.name || '').trim().toLowerCase())
      );

      // Only retain products belonging to visible categories
      const activeProducts = (prodRes?.data || []).filter((p: Product) => {
        const cat = (p.category || '').trim().toLowerCase();
        return visibleCatSet.has(cat);
      });

      setProducts(activeProducts);
      setCategories(visibleCats);

      // Cache products & categories in local storage for instant launch next time
      if (activeProducts.length > 0) {
        AsyncStorage.setItem(STORAGE_CACHED_PRODUCTS, JSON.stringify(activeProducts)).catch(() => {});
      }
      if (visibleCats.length > 0) {
        AsyncStorage.setItem(STORAGE_CACHED_CATEGORIES, JSON.stringify(visibleCats)).catch(() => {});
      }

      if (settingsRes && settingsRes.data) {
        const data = settingsRes.data;
        const validBanners = (data.banners || []).filter(
          (b: any) => !b.isCheckoutNotice && b.title !== 'CheckoutNotice' && (b.image || b.title)
        );
        const bannersToUse = validBanners.length > 0 ? validBanners : [
          {
            title: data.sliderTitle1 || 'Upto 50% Off Today',
            subtitle: data.sliderSubtitle1 || 'Get amazing discounts on all premium groceries & daily essentials',
            badge: data.sliderBadge1 || 'BEST OFFER',
            image: data.sliderImage1 || 'https://images.unsplash.com/photo-1506617498300-38435a0950e8?w=800&q=80',
            backgroundColor: '#a21caf',
          },
          {
            title: data.sliderTitle2 || 'Low Price Guaranteed',
            subtitle: data.sliderSubtitle2 || 'Unbeatable prices on fresh vegetables, milk, bread & eggs',
            badge: data.sliderBadge2 || 'LOWEST PRICE',
            image: data.sliderImage2 || 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&q=80',
            backgroundColor: '#15803d',
          },
          {
            title: data.sliderTitle3 || 'Mega Savings Week',
            subtitle: data.sliderSubtitle3 || 'Save big on your monthly grocery list with super saver packs',
            badge: data.sliderBadge3 || 'SUPER VALUE',
            image: data.sliderImage3 || 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=800&q=80',
            backgroundColor: '#ea580c',
          },
        ];
        setSliderBanners(bannersToUse);
        AsyncStorage.setItem(STORAGE_CACHED_BANNERS, JSON.stringify(bannersToUse)).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      SplashScreen.hideAsync().catch(() => undefined);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Prefetch top images gently in background after screen is active
  useEffect(() => {
    if (loading || products.length === 0) return;

    const timer = setTimeout(() => {
      // Prefetch only the top 6 visible hero product images
      products.slice(0, 6).forEach((p: Product) => {
        const resolved = resolveMediaUrl(p.image);
        if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
          Image.prefetch(resolved).catch(() => {});
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, products]);

  // Instant offline-first startup: render cached data immediately (<30ms)
  useEffect(() => {
    const startup = async () => {
      let quickLoadStoreId: string | undefined;
      let hasCachedContent = false;

      // 1. FAST PATH: Read cached data immediately from local storage
      try {
        const [savedStoreStr, cachedProdStr, cachedCatStr, cachedBannersStr] = await Promise.all([
          AsyncStorage.getItem('active_store'),
          AsyncStorage.getItem(STORAGE_CACHED_PRODUCTS),
          AsyncStorage.getItem(STORAGE_CACHED_CATEGORIES),
          AsyncStorage.getItem(STORAGE_CACHED_BANNERS),
        ]);

        if (savedStoreStr) {
          try {
            const parsed = JSON.parse(savedStoreStr);
            quickLoadStoreId = parsed._id;
            setActiveStore(parsed);
          } catch (e) {
            await AsyncStorage.removeItem('active_store');
          }
        }

        if (cachedCatStr) {
          try {
            const parsedCats = JSON.parse(cachedCatStr);
            if (Array.isArray(parsedCats) && parsedCats.length > 0) {
              setCategories(parsedCats);
              hasCachedContent = true;
            }
          } catch (e) {}
        }

        if (cachedProdStr) {
          try {
            const parsedProds = JSON.parse(cachedProdStr);
            if (Array.isArray(parsedProds) && parsedProds.length > 0) {
              setProducts(parsedProds);
              hasCachedContent = true;
            }
          } catch (e) {}
        }

        if (cachedBannersStr) {
          try {
            const parsedBanners = JSON.parse(cachedBannersStr);
            if (Array.isArray(parsedBanners) && parsedBanners.length > 0) {
              setSliderBanners(parsedBanners);
            }
          } catch (e) {}
        }

        // If we have cached content, show UI immediately! (0ms wait, no spinner!)
        if (hasCachedContent) {
          setLoading(false);
          SplashScreen.hideAsync().catch(() => undefined);
        }
      } catch (err) {
        console.warn('Initial cache read error:', err);
      }

      // 2. Fetch fresh data in the background from backend (non-blocking)
      load(quickLoadStoreId);

      // 3. Location handling: ONLY if no store is saved yet!
      // If user already has an active store, DO NOT delay or show GPS prompts!
      if (!quickLoadStoreId) {
        checkLocationAndResolveStore();
      }
    };

    startup();
  }, [load]);

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

  // ─── 3-Tier Main Category Tabs & Grouped Sections ────────────────────────
  const mainTabs = useMemo(() => {
    const tabMap = new Map<string, string>();

    // Dynamically build active tabs from categories in the store
    uniqueCategories.forEach((cat) => {
      const main = (cat.mainCategory || 'Grocery & Kitchen').trim();
      if (!main) return;
      if (!tabMap.has(main)) {
        const defaultIcon =
          main === 'Grocery & Kitchen' ? '🥦' :
          main === 'Snacks & Drinks' ? '🍿' :
          main === 'Beauty & Personal Care' ? '💄' :
          main === 'Electronics' ? '🎧' :
          main === 'Gifting & Lifestyle' ? '🎁' : '🏷️';
        tabMap.set(main, (cat.mainCategoryIcon || '').trim() || defaultIcon);
      } else if (cat.mainCategoryIcon?.trim()) {
        tabMap.set(main, cat.mainCategoryIcon.trim());
      }
    });

    // Ensure fallback if store has no categories yet
    if (tabMap.size === 0) {
      tabMap.set('Grocery & Kitchen', '🥦');
    }

    const list: { key: string; name: string; icon: string }[] = [
      { key: 'all', name: 'All', icon: '🛒' },
    ];
    tabMap.forEach((icon, name) => {
      list.push({ key: name, name, icon });
    });
    return list;
  }, [uniqueCategories]);

  const mainCategorySections = useMemo(() => {
    if (search.trim()) return [];

    const groupMap = new Map<string, { icon: string; items: Category[] }>();

    ['Grocery & Kitchen', 'Snacks & Drinks', 'Beauty & Personal Care', 'Electronics', 'Gifting & Lifestyle'].forEach((m) => {
      groupMap.set(m, { icon: '', items: [] });
    });

    // Build a quick lookup of tab icons
    const tabIconMap = new Map<string, string>();
    mainTabs.forEach((t) => tabIconMap.set(t.name, t.icon));

    uniqueCategories.forEach((cat) => {
      const main = (cat.mainCategory || 'Grocery & Kitchen').trim();
      const icon = (cat.mainCategoryIcon || '').trim() || tabIconMap.get(main) || '🥦';
      if (!groupMap.has(main)) {
        groupMap.set(main, { icon, items: [] });
      }
      const g = groupMap.get(main)!;
      if (cat.mainCategoryIcon?.trim()) {
        g.icon = cat.mainCategoryIcon.trim();
      } else if (!g.icon) {
        g.icon = icon;
      }
      g.items.push(cat);
    });

    const sections: { mainCategory: string; icon: string; categories: Category[] }[] = [];
    groupMap.forEach(({ icon, items }, mainCat) => {
      if (items.length > 0) {
        if (selectedMainTab === 'all' || selectedMainTab === mainCat) {
          sections.push({
            mainCategory: mainCat,
            icon: icon || tabIconMap.get(mainCat) || '🥦',
            categories: items,
          });
        }
      }
    });

    return sections;
  }, [uniqueCategories, selectedMainTab, search, mainTabs]);

  const productsByCategory = useMemo(() => {
    const visibleCategorySet = new Set(
      uniqueCategories.map((c) => (c.name || '').trim().toLowerCase())
    );

    // Only allow products from visible categories
    const visibleProducts = products.filter((p) => {
      const cat = (p.category || '').trim().toLowerCase();
      return visibleCategorySet.has(cat);
    });

    if (search.trim()) {
      const lower = search.toLowerCase().trim();
      const filtered = visibleProducts.filter(p => {
        const nameObj = p.name;
        if (typeof nameObj === 'object') {
          return (
            (nameObj.en && nameObj.en.toLowerCase().includes(lower)) ||
            (nameObj.mr && nameObj.mr.toLowerCase().includes(lower))
          );
        }
        return String(nameObj).toLowerCase().includes(lower);
      });
      return filtered.length > 0
        ? [{ category: { _id: 'search', name: 'Search Results', icon: '🔍' }, products: filtered }]
        : [];
    }

    const eligibleCategories = selectedMainTab === 'all'
      ? uniqueCategories
      : uniqueCategories.filter(c => (c.mainCategory || 'Grocery & Kitchen') === selectedMainTab);

    return eligibleCategories.map(cat => ({
      category: cat,
      products: visibleProducts.filter(p => (p.category || '').trim().toLowerCase() === cat.name.trim().toLowerCase())
    })).filter(group => group.products.length > 0);
  }, [products, uniqueCategories, search, selectedMainTab]);

  const handleAdd = useCallback((product: Product) => {
    addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image, mrp: product.mrp, category: product.category });
  }, [addToCart]);

  const handleProductPress = useCallback((productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  }, [navigation]);

  const handleBannerPress = useCallback((item: any) => {
    if (!item.link) return;
    const targetLink = item.link.trim();
    if (!targetLink) return;

    // 1. Check if it's a direct web URL
    if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) {
      Linking.openURL(targetLink).catch(err => console.error('Failed to open banner link:', err));
      return;
    }

    // 2. Check if it matches a category name (case insensitive, localized or English)
    const matchedCategory = categories.find(c => {
      return c.name.toLowerCase() === targetLink.toLowerCase() || tCategory(c.name).toLowerCase() === targetLink.toLowerCase();
    });
    if (matchedCategory) {
      navigation.navigate('CategoryProducts', { categoryName: matchedCategory.name as any });
      return;
    }

    // 3. Check if it matches a product ID or product name (case insensitive, localized or English)
    const matchedProduct = products.find(p => {
      const prodName = typeof p.name === 'string' ? p.name : ((p.name as any)?.en || '');
      return p._id === targetLink || prodName.toLowerCase() === targetLink.toLowerCase() || tProduct(p.name).toLowerCase() === targetLink.toLowerCase();
    });
    if (matchedProduct) {
      navigation.navigate('ProductDetail', { productId: matchedProduct._id });
      return;
    }

    console.log('No matching route or action for banner link:', targetLink);
  }, [categories, products, navigation, tCategory, tProduct]);

  const qtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach(item => {
      map[item._id] = item.quantity;
    });
    return map;
  }, [cart]);

  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const promoListRef = useRef<FlatList<any> | null>(null);
  const [sliderBanners, setSliderBanners] = useState<any[]>([
    {
      title: 'Upto 50% Off Today',
      subtitle: 'Get amazing discounts on all premium groceries & daily essentials',
      badge: 'BEST OFFER',
      image: 'https://images.unsplash.com/photo-1506617498300-38435a0950e8?w=800&q=80',
      backgroundColor: '#a21caf',
    },
    {
      title: 'Low Price Guaranteed',
      subtitle: 'Unbeatable prices on fresh vegetables, milk, bread & eggs',
      badge: 'LOWEST PRICE',
      image: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&q=80',
      backgroundColor: '#15803d',
    },
    {
      title: 'Mega Savings Week',
      subtitle: 'Save big on your monthly grocery list with super saver packs',
      badge: 'SUPER VALUE',
      image: 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?w=800&q=80',
      backgroundColor: '#ea580c',
    },
  ]);



  const promoItems = sliderBanners;

  // ═══════════════════════════════════════════
  //  ADVANCED SEARCH BAR ANIMATIONS
  // ═══════════════════════════════════════════
  const searchScaleAnim = useRef(new Animated.Value(1)).current;
  const searchGlowAnim = useRef(new Animated.Value(0)).current;
  const searchGlowPulse = useRef(new Animated.Value(1)).current;
  const clearBtnAnim = useRef(new Animated.Value(0)).current;
  const placeholderSlide = useRef(new Animated.Value(0)).current;   // 0=visible, -14=slide up
  const placeholderOpacity = useRef(new Animated.Value(1)).current;
  const iconBounceAnim = useRef(new Animated.Value(0)).current;   // 0 = normal, 1 = bounced
  const shimmerAnim = useRef(new Animated.Value(-1)).current;  // sweeps -1 → 2

  const [searchFocused, setSearchFocused] = useState(false);
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
        Animated.timing(placeholderSlide, { toValue: -14, duration: 260, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(placeholderOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(() => {
        const currentList = SEARCH_PLACEHOLDERS[language] || SEARCH_PLACEHOLDERS.en;
        setPlaceholderIndex(p => (p + 1) % currentList.length);
        placeholderSlide.setValue(14);          // reset to slide-in from below
        Animated.parallel([
          Animated.timing(placeholderSlide, { toValue: 0, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }),
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
      Animated.timing(searchGlowAnim, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      // icon bounce: quick up-down
      Animated.sequence([
        Animated.timing(iconBounceAnim, { toValue: -6, duration: 120, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.spring(iconBounceAnim, { toValue: 0, useNativeDriver: true, tension: 400, friction: 7 }),
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
      Animated.spring(searchScaleAnim, { toValue: 1, useNativeDriver: true, tension: 260, friction: 9 }),
      Animated.timing(searchGlowAnim, { toValue: 0, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(searchGlowPulse, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  }, [searchScaleAnim, searchGlowAnim, searchGlowPulse]);


  // — Promo banner auto-scroll —
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePromoIndex((currentIndex) => {
        const nextIndex = (currentIndex + 1) % promoItems.length;
        promoListRef.current?.scrollToOffset({ offset: nextIndex * (PROMO_WIDTH + 16), animated: true });
        return nextIndex;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [promoItems]);

  const renderPromoItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleBannerPress(item)}
      style={[styles.promoCard, { width: PROMO_WIDTH, backgroundColor: item.backgroundColor || '#a21caf' }]}
    >
      <PremiumImage
        source={resolveMediaUrl(item.image) ? { uri: resolveMediaUrl(item.image)! } : null}
        style={styles.promoImg}
      />
    </TouchableOpacity>
  ), [handleBannerPress]);



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
      addText={language === 'mr' ? 'जोडा' : language === 'hi' ? 'जोड़ें' : 'ADD'}
      compact
    />
  ), [qtyMap, handleAdd, handleProductPress, tProduct, increaseQty, decreaseQty, language]);

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
            {group.category.name === 'Search Results' ? (language === 'mr' ? 'शोध निकाल' : language === 'hi' ? 'खोज परिणाम' : 'Search Results') : tCategory(group.category.name)}
          </Text>
          {group.category.name !== 'Search Results' && (
            <TouchableOpacity onPress={() => navigation.navigate('CategoryProducts', { categoryName: group.category.name })}>
              <Text style={styles.seeAllText}>
                {language === 'mr' ? 'सर्व पहा ›' : language === 'hi' ? 'सभी देखें ›' : 'See all ›'}
              </Text>
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
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          nestedScrollEnabled
          extraData={qtyMap}
        />
      </View>
    );
  }, [renderGridProduct, tCategory, navigation, qtyMap]);

  const listHeaderComponent = useMemo(() => (
    <View>
      {/* Not Deliverable Reminder Banner */}
      {isNotDeliverable && !showNotDeliverablePopup && (
        <TouchableOpacity
          style={styles.notDeliverableBanner}
          activeOpacity={0.8}
          onPress={async () => {
            await fetchAllStores();
            setShowStoreModal(true);
          }}
        >
          <View style={styles.notDeliverableBannerLeft}>
            <Ionicons name="location-outline" size={18} color="#b45309" />
            <Text style={styles.notDeliverableBannerText}>
              {language === 'mr' ? 'तुमच्या पत्त्यावर डिलिव्हरी उपलब्ध नाही' : language === 'hi' ? 'आपके स्थान पर डिलीवरी उपलब्ध नहीं है' : 'Delivery not available at your location'}
            </Text>
          </View>
          <View style={styles.notDeliverableBannerAction}>
            <Text style={styles.notDeliverableBannerActionText}>
              {language === 'mr' ? 'बदला' : language === 'hi' ? 'बदलें' : 'Change'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#b45309" />
          </View>
        </TouchableOpacity>
      )}

      {!search && (
        <View style={styles.promoWrapper}>
          <FlatList
            ref={promoListRef}
            data={promoItems}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.promoScrollContent}
            renderItem={renderPromoItem}
            keyExtractor={(_, index) => `promo-${index}`}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / (PROMO_WIDTH + 16));
              setActivePromoIndex(index % promoItems.length);
            }}
            snapToInterval={PROMO_WIDTH + 16} // card width + margin
          />
          <View style={styles.promoDotContainer}>
            {promoItems.map((_, index) => (
              <View
                key={index}
                style={[styles.promoDot, index === activePromoIndex && styles.promoDotActive]}
              />
            ))}
          </View>
        </View>
      )}

      {!search && (
        <View style={styles.mainCategorySectionsContainer}>
          {mainCategorySections.map((section) => (
            <View key={section.mainCategory} style={styles.mainCategorySection}>
              <View style={styles.mainCategoryHeader}>
                <Text style={styles.mainCategoryTitle}>
                  {tCategory(section.mainCategory) || section.mainCategory}
                </Text>
              </View>

              <View style={styles.blinkCategoryGrid}>
                {section.categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={styles.blinkCatCard}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('CategoryProducts', { categoryName: cat.name })}
                  >
                    <View style={styles.blinkCatImgBox}>
                      <PremiumImage
                        source={resolveMediaUrl(cat.image) ? { uri: resolveMediaUrl(cat.image)! } : null}
                        sources={cat.images ? cat.images.map((img: string) => resolveMediaUrl(img) ? { uri: resolveMediaUrl(img)! } : null).filter((x: any) => x !== null) as any[] : []}
                        style={cat.image ? styles.blinkCatImg : styles.catGridIconStyle}
                        categoryName={cat.name}
                        fallbackEmoji={cat.icon || '🥦'}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.blinkCatTitle} numberOfLines={2}>
                      {tCategory(cat.name)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  ), [search, uniqueCategories, mainCategorySections, navigation, tCategory, promoItems, activePromoIndex, isNotDeliverable, showNotDeliverablePopup, language]);

  const emptyStateComponent = useMemo(() => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="search-outline" size={44} color="#4b5563" />
      </View>
      <Text style={styles.emptyTitle}>
        {language === 'mr' ? 'उत्पादने सापडली नाहीत' : language === 'hi' ? 'कोई उत्पाद नहीं मिला' : 'No products found'}
      </Text>
      <Text style={styles.emptySubText}>
        {language === 'mr' ? 'कृपया वेगळा शब्द वापरून पहा किंवा थोड्या वेळाने तपासा.' : language === 'hi' ? 'कृपया कोई अन्य शब्द आज़माएं या बाद में जांचें।' : 'Try a different keyword or check back later.'}
      </Text>
    </View>
  ), [language]);

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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[styles.headerBrand, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
              onPress={async () => {
                await fetchAllStores();
                setShowStoreModal(true);
              }}
            >
              <PremiumImage source={APP_LOGO} style={styles.headerLogo} />
              <View style={{ maxWidth: 160 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={styles.deliveryTitle} numberOfLines={1}>
                    {activeStore ? activeStore.name : 'Locating...'}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#ffffff" style={{ marginLeft: 2 }} />
                </View>
                <Text style={styles.deliverySubtitle} numberOfLines={1}>
                  {activeStore ? activeStore.address : 'Finding nearest store'}
                </Text>
              </View>
            </TouchableOpacity>

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
                    {(SEARCH_PLACEHOLDERS[language] || SEARCH_PLACEHOLDERS.en)[placeholderIndex % (SEARCH_PLACEHOLDERS[language] || SEARCH_PLACEHOLDERS.en).length]}
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

      {/* ═══ TOP MAIN CATEGORY TABS (Blinkit / Zepto Style) ═══ */}
      {!search && (
        <View style={styles.topTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topTabsScrollContent}
          >
            {mainTabs.map((tab) => {
              const isActive = selectedMainTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.topTabPill, isActive && styles.topTabPillActive]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMainTab(tab.key)}
                >
                  <PremiumTabIcon icon={tab.icon} active={isActive} size={15} />
                  <Text style={[styles.topTabLabel, isActive && styles.topTabLabelActive]}>
                    {tCategory(tab.name) || tab.name}
                  </Text>
                  {isActive && <View style={styles.topTabActiveIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

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
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
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

      {/* Store Selection Modal */}
      <Modal
        visible={showStoreModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (activeStore) {
            setShowStoreModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { marginBottom: 6 }]}>🏪 Select Delivery Store</Text>
            <Text style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 20 }}>
              We serve fresh groceries from your nearest physical store location. Please select one below.
            </Text>

            {locLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <PremiumLoader message="Checking GPS Location..." subMessage="Finding nearest store" size="small" fullScreen={false} />
              </View>
            ) : (
              <FlatList
                data={allStores}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isSelected = activeStore?._id === item._id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.langOption,
                        isSelected && styles.activeLangOption,
                        { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 14 }
                      ]}
                      onPress={() => {
                        const selectStore = async () => {
                          const proceed = async () => {
                            if (cart.length > 0) {
                              clearCart();
                            }
                            setActiveStore(item);
                            await AsyncStorage.setItem('active_store', JSON.stringify(item));
                            setShowStoreModal(false);
                            load(item._id);
                          };

                          if (cart.length > 0 && activeStore?._id !== item._id) {
                            Alert.alert(
                              'Change Store?',
                              'Your cart contains items from another store location. Changing stores will clear your current cart.',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Proceed', onPress: proceed }
                              ]
                            );
                          } else {
                            await proceed();
                          }
                        };
                        selectStore();
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Text style={[styles.langText, isSelected && styles.activeLangText, { fontWeight: '700' }]}>
                          {item.name}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#7c3aed" />}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                        <Ionicons name="location-sharp" size={13} color="#7c3aed" />
                        <Text style={{ fontSize: 12, color: '#64748b', flex: 1 }}>{item.address}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>
                        Delivery within {item.deliveryRadius || 10} km radius
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 32 }}>
                    No product delivery available in your area, sorry.
                  </Text>
                }
              />
            )}

            {activeStore && (
              <TouchableOpacity
                style={[styles.closeBtn, { marginTop: 12 }]}
                onPress={() => setShowStoreModal(false)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Not Deliverable Popup Modal */}
      <Modal
        visible={showNotDeliverablePopup}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          setShowNotDeliverablePopup(false);
        }}
      >
        <Animated.View style={[styles.ndOverlay, { opacity: notDeliverableOpacityAnim }]}>
          <Animated.View style={[styles.ndCard, { transform: [{ scale: notDeliverableScaleAnim }] }]}>
            {/* Decorative top gradient bar */}
            <View style={styles.ndTopBar} />

            {/* Location icon circle */}
            <View style={styles.ndIconCircle}>
              <Ionicons name="location-sharp" size={36} color="#ef4444" />
            </View>

            <Text style={styles.ndTitle}>Delivery Not Available</Text>
            <Text style={styles.ndMessage}>
              Sorry, we don't deliver to your current location yet.{"\n"}
              But you can still explore our products!
            </Text>

            {/* Explore Products Button */}
            <TouchableOpacity
              style={styles.ndExploreBtn}
              activeOpacity={0.85}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(notDeliverableScaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
                  Animated.timing(notDeliverableOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                ]).start(() => {
                  setShowNotDeliverablePopup(false);
                });
              }}
            >
              <Ionicons name="basket-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.ndExploreBtnText}>Explore Products</Text>
            </TouchableOpacity>

            {/* Select Store Manually Link */}
            <TouchableOpacity
              style={styles.ndSelectStoreBtn}
              activeOpacity={0.7}
              onPress={async () => {
                setShowNotDeliverablePopup(false);
                await fetchAllStores();
                setShowStoreModal(true);
              }}
            >
              <Ionicons name="storefront-outline" size={16} color="#7c3aed" style={{ marginRight: 6 }} />
              <Text style={styles.ndSelectStoreText}>Select Store Manually</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#7c3aed',
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
  // ─── Top Main Category Tabs (Blinkit Style) ─────────────────────────────
  topTabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  topTabsScrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  topTabPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginRight: 6,
    position: 'relative',
    borderRadius: 8,
  },
  topTabPillActive: {
    backgroundColor: '#f8fafc',
  },
  topTabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  topTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  topTabLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  topTabActiveIndicator: {
    position: 'absolute',
    bottom: -4,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#0f172a',
    borderRadius: 2,
  },

  // ─── Blinkit-style Grouped Category Sections ────────────────────────────
  mainCategorySectionsContainer: {
    paddingTop: 14,
    backgroundColor: '#ffffff',
  },
  mainCategorySection: {
    marginBottom: 22,
  },
  mainCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  mainCategoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  blinkCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  blinkCatCard: {
    width: (width - 24) / 4,
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  blinkCatImgBox: {
    width: (width - 24) / 4 - 8,
    height: (width - 24) / 4 - 8,
    backgroundColor: '#eaf6f6', // Exact pale ice cyan/blue from screenshot
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    overflow: 'hidden',
  },
  blinkCatImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  blinkCatTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  catGridIconStyle: {
    width: '50%',
    height: '50%',
    resizeMode: 'contain',
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
  blinkImg: { width: 110, height: 110, resizeMode: 'contain' },
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
    zIndex: 2000,
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
  cardDotsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  cardDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  cardActiveDot: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a855f7',
  },

  // ═══ Not Deliverable Popup Styles ═══
  ndOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  ndCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  ndTopBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#ef4444',
  },
  ndIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fecaca',
  },
  ndTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  ndMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  ndExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginHorizontal: 28,
    width: '80%',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  ndExploreBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  ndSelectStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  ndSelectStoreText: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600',
  },

  // ═══ Not Deliverable Reminder Banner ═══
  notDeliverableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  notDeliverableBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  notDeliverableBannerText: {
    fontSize: 12.5,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },
  notDeliverableBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  notDeliverableBannerActionText: {
    fontSize: 12.5,
    color: '#b45309',
    fontWeight: '700',
  },
});

