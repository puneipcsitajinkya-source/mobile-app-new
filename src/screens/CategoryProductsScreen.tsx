import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Dimensions, Image,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import PremiumImage from '../components/PremiumImage';
import StickyCart from '../components/StickyCart';
import PremiumLoader from '../components/PremiumLoader';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getProducts, getSubcategories, resolveMediaUrl } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CategoryProducts'>;
  route: RouteProp<RootStackParamList, 'CategoryProducts'>;
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
  // now storing subcategory as an id string (ObjectId)
  subcategory?: string;
}

interface Subcategory {
  _id: string;
  parentCategoryId: string;
  name: string;
  icon?: string;
  image?: string;
  images?: string[];
  showOnApp: boolean;
  sortOrder?: number;
}

interface ProductCardProps {
  item: Product;
  qty: number;
  onPress: (productId: string) => void;
  onAdd: (product: Product) => void;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  tProduct: (name: Product['name']) => string;
  cardWidth: number;
  language?: string;
}

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 96;
const FULL_CARD_WIDTH  = (width - 28) / 2;          // no sidebar: 2 cols, 6px gap on each side
const SIDE_CARD_WIDTH  = ((width - SIDEBAR_WIDTH) - 20) / 2; // with sidebar: 2 cols, smaller column

// Fixed image size — same for every product card so all images are equal
const FULL_IMG_SIZE = FULL_CARD_WIDTH - 16;   // card width minus horizontal padding
const SIDE_IMG_SIZE = SIDE_CARD_WIDTH - 16;

const ProductCard = React.memo(function ProductCard({
  item, qty, onPress, onAdd, onIncrease, onDecrease, tProduct, cardWidth, language = 'en',
}: ProductCardProps) {
  const hasDiscount = (item.discount ?? 0) > 0;
  const hasMrp = item.mrp != null && item.mrp > item.price;

  const [activeIdx, setActiveIdx] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!item.images || item.images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % item.images!.length;
        scrollViewRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [item.images, cardWidth]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / cardWidth);
    if (index !== activeIdx && index >= 0 && index < (item.images?.length || 0)) {
      setActiveIdx(index);
    }
  };

  const specTags = React.useMemo(() => {
    if (!item.description) return [];
    const parts = item.description.split(/[,;\n]/).map(p => p.trim()).filter(p => p.length > 0 && p.length < 24);
    return parts.slice(0, 2);
  }, [item.description]);

  const reviewCount = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < item._id.length; i++) {
      hash = item._id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 9000) + 1000;
  }, [item._id]);

  const imgSize = cardWidth === FULL_CARD_WIDTH ? FULL_IMG_SIZE : SIDE_IMG_SIZE;

  return (
    <View style={[styles.card, { width: cardWidth }]}>

      {/* ── Image section — fixed equal size for every card ── */}
      <View style={[styles.cardImgContainer, { height: imgSize }]}>
        {item.images && item.images.length > 1 ? (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: imgSize, height: imgSize }}
          >
            {item.images.map((imgUrl, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.93}
                onPress={() => onPress(item._id)}
                style={{ width: imgSize, height: imgSize, alignItems: 'center', justifyContent: 'center' }}
              >
                <PremiumImage
                  source={resolveMediaUrl(imgUrl) ? { uri: resolveMediaUrl(imgUrl)! } : null}
                  style={{ width: imgSize, height: imgSize }}
                  resizeMode="contain"
                  fallbackIcon="leaf-outline"
                  categoryName={item.category}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity
            activeOpacity={0.93}
            onPress={() => onPress(item._id)}
            style={{ width: imgSize, height: imgSize, alignItems: 'center', justifyContent: 'center' }}
          >
            <PremiumImage
              source={resolveMediaUrl(item.image) ? { uri: resolveMediaUrl(item.image)! } : null}
              style={{ width: imgSize, height: imgSize }}
              resizeMode="contain"
              fallbackIcon="leaf-outline"
              categoryName={item.category}
            />
          </TouchableOpacity>
        )}

        {/* Favorite (heart) icon */}
        <TouchableOpacity style={styles.favIconBox} activeOpacity={0.75}>
          <Ionicons name="heart-outline" size={16} color="#94a3b8" />
        </TouchableOpacity>

        {/* Carousel indicator dots */}
        {item.images && item.images.length > 1 && (
          <View style={styles.carouselDots}>
            {item.images.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.carouselDot,
                  activeIdx === idx ? styles.carouselDotActive : null
                ]}
              />
            ))}
          </View>
        )}

        {/* Discount badge — top left */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}% OFF</Text>
          </View>
        )}
      </View>

      {/* ── Content below image ── */}
      <View style={styles.cardContent}>
        
        <TouchableOpacity onPress={() => onPress(item._id)} activeOpacity={0.93}>
          {/* Delivery Row */}
          <View style={styles.deliveryRow}>
            <Ionicons name="time" size={11} color="#64748b" style={{ marginRight: 2 }} />
            <Text style={styles.deliveryText}>
              {language === 'mr' ? '८ मिनिटे' : language === 'hi' ? '८ मिनट' : '8 mins'}
            </Text>
          </View>

          {/* Name */}
          <Text style={styles.cardName} numberOfLines={2}>{tProduct(item.name)}</Text>

          {/* Spec Tags */}
          <View style={styles.specTagsContainer}>
            {specTags.length > 0 ? (
              specTags.map((tag, idx) => (
                <View key={idx} style={styles.specTag}>
                  <Text style={styles.specTagText} numberOfLines={1}>{tag}</Text>
                </View>
              ))
            ) : (
              <View style={styles.specTag}>
                <Text style={styles.specTagText}>
                  {language === 'mr' ? 'उत्कृष्ट दर्जा' : language === 'hi' ? 'प्रीमियम गुणवत्ता' : 'Premium Quality'}
                </Text>
              </View>
            )}
          </View>

          {/* Rating Row */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons key={i} name="star" size={10} color={i < 4 ? '#fbbf24' : '#cbd5e1'} />
              ))}
            </View>
            <Text style={styles.ratingCount}>{reviewCount.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>

        {/* Unit and Action Row */}
        <View style={styles.actionRow}>
          <Text style={styles.cardUnitText}>{item.unit || '1 unit'}</Text>
          {qty > 0 ? (
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => onDecrease(item._id)} activeOpacity={0.7}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => onIncrease(item._id)} activeOpacity={0.7}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(item)} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>
                {language === 'mr' ? 'जोडा' : language === 'hi' ? 'जोड़ें' : 'ADD'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Price Row */}
        <View style={styles.priceContainer}>
          <View style={styles.priceSubRow}>
            <Text style={styles.cardPrice}>₹{item.price}</Text>
            {hasMrp && <Text style={styles.cardMrp}>₹{item.mrp}</Text>}
          </View>
          {hasMrp && (
            <Text style={styles.discountLabel}>₹{item.mrp! - item.price} OFF</Text>
          )}
        </View>
      </View>
    </View>
  );
});

export default function CategoryProductsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { categoryName } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const { addToCart, items: cart, totalItems, totalAmount: cartTotal, increaseQty, decreaseQty } = useCart();
  const { language, tProduct, tCategory } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      let storeId = '';
      const savedStore = await AsyncStorage.getItem('active_store');
      if (savedStore) {
        try {
          storeId = JSON.parse(savedStore)._id;
        } catch (e) {
          console.error(e);
        }
      }

      const queryParams: any = { category: categoryName };
      if (storeId) {
        queryParams.store = storeId;
      }

      const [productResult, subcategoryResult] = await Promise.allSettled([
        getProducts(queryParams),
        getSubcategories(categoryName, storeId),
      ]);

      if (productResult.status === 'fulfilled') {
        const prodData = productResult.value.data || [];
        setProducts(prodData);
        
        // Prefetch products images for instant rendering on scroll
        if (Array.isArray(prodData)) {
          prodData.slice(0, 15).forEach((p: Product) => {
            const resolved = resolveMediaUrl(p.image);
            if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
              Image.prefetch(resolved).catch(err => console.log('Category product image prefetch failed:', resolved, err));
            }
          });
        }
      } else {
        console.error('Failed to load products for category:', categoryName, productResult.reason);
        setProducts([]);
      }

      if (subcategoryResult.status === 'fulfilled') {
        const subcatData = subcategoryResult.value.data || [];
        setSubcategories(subcatData);
        
        // Prefetch subcategory images
        if (Array.isArray(subcatData)) {
          subcatData.forEach((s: Subcategory) => {
            const resolved = resolveMediaUrl(s.image);
            if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
              Image.prefetch(resolved).catch(err => console.log('Subcategory image prefetch failed:', resolved, err));
            }
          });
        }
      } else {
        console.error('Failed to load subcategories for category:', categoryName, subcategoryResult.reason);
        setSubcategories([]);
      }

      if (productResult.status === 'fulfilled' || subcategoryResult.status === 'fulfilled') {
        setLoading(false);
      }
    } catch (e) {
      console.error('Unexpected load error:', e);
      setProducts([]);
      setSubcategories([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => { load(); }, [load]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedSubcategory) {
      // selectedSubcategory stores subcategory _id or empty for all
      filtered = filtered.filter((p) => (p.subcategory || '') === selectedSubcategory);
    }
    return filtered;
  }, [products, selectedSubcategory]);

  const getProductQty = useCallback((id: string) => {
    const item = cart.find(c => c._id === id);
    return item ? item.quantity : 0;
  }, [cart]);

  const handleAdd = useCallback((product: Product) => {
    addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image, mrp: product.mrp, category: product.category });
  }, [addToCart]);

  const handleProductPress = useCallback((productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  }, [navigation]);

  const renderProduct = useCallback(({ item }: { item: Product }) => {
    const qty = getProductQty(item._id);
    const cardWidth = subcategories.length > 0 ? SIDE_CARD_WIDTH : FULL_CARD_WIDTH;
    return (
      <ProductCard
        item={item}
        qty={qty}
        onPress={handleProductPress}
        onAdd={handleAdd}
        onIncrease={increaseQty}
        onDecrease={decreaseQty}
        tProduct={tProduct}
        cardWidth={cardWidth}
        language={language}
      />
    );
  }, [getProductQty, handleAdd, handleProductPress, increaseQty, decreaseQty, tProduct, subcategories.length, language]);

  if (loading) {
    return (
      <PremiumLoader
        message={language === 'mr' ? 'उत्पादने लोड करत आहे...' : language === 'hi' ? 'उत्पाद लोड हो रहे हैं...' : 'Loading products'}
        subMessage={tCategory(categoryName)}
        size="large"
        fullScreen
      />
    );
  }

  const subcategoryItems: any[] = [{ _id: 'all', name: 'All', icon: '📦' }, ...subcategories];

  return (
    <View style={styles.container}>
      {subcategories.length > 0 ? (
        <View style={styles.mainContent}>
          <View style={styles.subcategoryColumn}>
            {/* <View style={styles.subcategorySectionHeader}>
              <Text style={styles.subcategorySectionTitle}>Subcategories</Text>
              <Text style={styles.subcategorySectionCount}>{subcategories.length} options</Text>
            </View> */}
            <FlatList
              style={{ flex: 1 }}
              data={subcategoryItems}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.subcategoryList, { paddingBottom: 100 + insets.bottom }]}
              renderItem={({ item }) => {
                const isSelected = (item._id !== 'all' && item._id === selectedSubcategory) || (item._id === 'all' && !selectedSubcategory);
                const isAllTab = item._id === 'all';
                return (
                  <TouchableOpacity
                    style={[
                      styles.subcategoryCard,
                      isSelected && styles.subcategoryCardActive,
                      styles.subcategoryCardShadow,
                      isAllTab && { justifyContent: 'center' }
                    ]}
                    onPress={() => setSelectedSubcategory(isAllTab ? '' : item._id)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <View style={styles.activeSidebarIndicator} />}
                    {!isAllTab && (
                      <PremiumImage
                        source={resolveMediaUrl(item.image) ? { uri: resolveMediaUrl(item.image)! } : null}
                        sources={item.images ? item.images.map((img: string) => resolveMediaUrl(img) ? { uri: resolveMediaUrl(img)! } : null).filter((x: any) => x !== null) as any[] : []}
                        style={styles.subcategoryCardImage}
                        resizeMode="cover"
                        categoryName={item.name}
                        fallbackEmoji={item.icon || '🏷️'}
                      />
                    )}
                    <Text style={[styles.subcategoryCardLabel, isSelected && styles.subcategoryCardLabelActive]} numberOfLines={2}>
                      {isAllTab ? (language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All') : item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.subcategorySeparator} />}
            />
          </View>

          <View style={styles.productsColumn}>
            <FlatList
              style={styles.productList}
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={item => item._id}
              extraData={cart}
              numColumns={2}
              contentContainerStyle={[styles.grid, { paddingBottom: 90 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={11}
              removeClippedSubviews
              updateCellsBatchingPeriod={30}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#a855f7" />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="basket-outline" size={48} color="#a855f7" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {language === 'mr' ? 'कोणतीही उत्पादने आढळली नाहीत' : language === 'hi' ? 'कोई उत्पाद नहीं मिला' : 'No products found'}
                  </Text>
                  <Text style={styles.emptySubText}>
                    {language === 'mr' ? 'या श्रेणीत कोणतीही उत्पादने उपलब्ध नाहीत.' : language === 'hi' ? 'इस श्रेणी में कोई उत्पाद उपलब्ध नहीं है।' : 'No items are available in this category right now.'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      ) : (
        <FlatList
          style={styles.productList}
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item._id}
          extraData={cart}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: 90 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={11}
          removeClippedSubviews
          updateCellsBatchingPeriod={30}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#a855f7" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="basket-outline" size={48} color="#a855f7" />
              </View>
              <Text style={styles.emptyTitle}>
                {language === 'mr' ? 'कोणतीही उत्पादने आढळली नाहीत' : language === 'hi' ? 'कोई उत्पाद नहीं मिला' : 'No products found'}
              </Text>
              <Text style={styles.emptySubText}>
                {language === 'mr' ? 'या श्रेणीत कोणतीही उत्पादने उपलब्ध नाहीत.' : language === 'hi' ? 'इस श्रेणी में कोई उत्पाद उपलब्ध नहीं है।' : 'No items are available in this category right now.'}
              </Text>
            </View>
          }
        />
      )}

      <StickyCart
        totalItems={totalItems}
        cartTotal={cartTotal}
        onPress={() => navigation.navigate('Cart' as any)}
        tintColor="#a855f7"
        bottom={insets.bottom + 16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  contentArea: { flex: 1 },
  mainContent: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  subcategoryColumn: { width: 96, backgroundColor: '#f8fafc', paddingTop: 12, paddingBottom: 12, borderRightWidth: 1, borderRightColor: '#e2e8f0', alignItems: 'center' },
  productsColumn: { flex: 1, backgroundColor: '#ffffff' },
  subcategorySectionHeader: { paddingHorizontal: 12, marginBottom: 12 },
  subcategorySectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  subcategorySectionCount: { fontSize: 11, color: '#64748b', marginTop: 4 },
  subcategoryList: { paddingHorizontal: 6, paddingBottom: 100 },
  subcategorySeparator: { height: 10 },
  subcategoryCard: {
    width: 76,
    minHeight: 76,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 0,
    position: 'relative',
  },
  activeSidebarIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 4,
    backgroundColor: '#7c3aed',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  subcategoryCardActive: {
    backgroundColor: '#ffffff',
  },
  subcategoryCardImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f1f5f9',
    marginBottom: 6,
  },
  subcategoryCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  subcategoryCardIconActive: { backgroundColor: '#ffffff' },
  subcategoryCardIconText: { fontSize: 22, color: '#7c3aed' },
  subcategoryCardIconTextActive: { color: '#7c3aed' },
  subcategoryCardLabel: { fontSize: 10.5, fontWeight: '500', color: '#64748b', textAlign: 'center', lineHeight: 14 },
  subcategoryCardLabelActive: { color: '#7c3aed', fontWeight: '800' },
  subcategoryCardShadow: {},
  productList: { flex: 1 },
  grid: { padding: 6, paddingBottom: 90 },

  // ── Product card ──
  card: {
    margin: 5,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardImgContainer: {
    width: '100%',
    // height is set inline via imgSize — ensures all images are identical size
    backgroundColor: '#ffffff',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    overflow: 'hidden',
  },
  favIconBox: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    zIndex: 10,
  },
  carouselDots: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 3,
  },
  carouselDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  carouselDotActive: {
    backgroundColor: '#64748b',
    width: 6,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  discountText: { color: '#fff', fontSize: 8.5, fontWeight: '800' },

  // Content below image
  cardContent: { paddingHorizontal: 10, paddingVertical: 10 },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 16,
    height: 32,
    marginBottom: 6,
  },
  specTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
    minHeight: 18,
  },
  specTag: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  specTagText: {
    fontSize: 8.5,
    color: '#7c3aed',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingCount: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    height: 30,
  },
  cardUnitText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 54,
    alignItems: 'center',
  },
  addBtnText: { color: '#7c3aed', fontSize: 11.5, fontWeight: '800' },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    overflow: 'hidden',
    minWidth: 70,
    height: 28,
  },
  qtyBtn: {
    width: 22,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  qtyValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  priceContainer: {
    marginTop: 2,
  },
  priceSubRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  cardPrice: { fontSize: 13.5, fontWeight: '800', color: '#111827' },
  cardMrp: { fontSize: 10.5, color: '#94a3b8', textDecorationLine: 'line-through' },
  discountLabel: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 2,
  },

  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 36, paddingHorizontal: 24, paddingBottom: 36,
    marginTop: 30, marginHorizontal: 10,
    borderRadius: 16, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  emptyTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptySubText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyText: { color: '#64748b', fontSize: 16, marginTop: 12, textAlign: 'center' },

});
