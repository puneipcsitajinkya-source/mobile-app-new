import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, RefreshControl, Dimensions,
  Platform, Modal, ActivityIndicator
} from 'react-native';
import PremiumImage from '../components/PremiumImage';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';
import { getProducts, getCategories } from '../services/api';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { useNetwork } from '../hooks/useNetwork';
import { Ionicons } from '@expo/vector-icons';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_LOGO = require('../../assets/icon.png');

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

const PROMO_ITEMS = [
  {
    title: 'Super Fast Delivery',
    subtitle: 'Fresh groceries in minutes',
    badge: 'Priority',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000',
    backgroundColor: '#7c3aed',
  },
  {
    title: 'Premium Savings',
    subtitle: 'Get up to 15% off on daily essentials',
    badge: 'Limited Offer',
    image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&q=80&w=1000',
    backgroundColor: '#0f766e',
  },
  {
    title: 'New Arrivals',
    subtitle: 'Exclusive store deals just for you',
    badge: 'Just In',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=1000',
    backgroundColor: '#f59e0b',
  },
];

interface ProductCardProps {
  item: Product;
  qty: number;
  onPress: (productId: string) => void;
  onAdd: (product: Product) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  productLabel: string;
}

const ProductCard = memo(function ProductCard({
  item,
  qty,
  onPress,
  onAdd,
  onIncrement,
  onDecrement,
  productLabel,
}: ProductCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item._id)}
      activeOpacity={0.9}
    >
      <View style={styles.cardImgContainer}>
        <PremiumImage
          uri={item.image}
          style={styles.cardImg}
          iconName="leaf-outline"
          iconSize={28}
        />
        {(item.discount ?? 0) > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}% OFF</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardUnit}>{item.unit || '1 pc'}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{productLabel}</Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.cardPrice}>₹{item.price}</Text>
            {item.mrp != null && item.mrp > item.price && (
              <Text style={styles.cardMrp}>₹{item.mrp}</Text>
            )}
          </View>
          {qty > 0 ? (
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyButton} onPress={() => onDecrement(item._id)} activeOpacity={0.7}>
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity style={styles.qtyButton} onPress={() => onIncrement(item._id)} activeOpacity={0.7}>
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => onAdd(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
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
    try {
      const [prodRes, catRes] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (e) {
      console.error(e);
    } finally {
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
      <Image source={{ uri: item.image }} style={styles.promoImg} />
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

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductCard
      item={item}
      qty={qtyMap[item._id] ?? 0}
      onPress={handleProductPress}
      onAdd={handleAdd}
      onIncrement={increaseQty}
      onDecrement={decreaseQty}
      productLabel={tProduct(item.name)}
    />
  ), [qtyMap, handleAdd, handleProductPress, tProduct, increaseQty, decreaseQty]);

  const renderCategoryGroup = useCallback(({ item: group }: { item: { category: Category; products: Product[] } }) => (
    <View key={group.category._id} style={styles.horizontalSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.category.name === 'Search Results' ? group.category.name : tCategory(group.category.name)}</Text>
        {group.category.name !== 'Search Results' && (
          <TouchableOpacity onPress={() => navigation.navigate('CategoryProducts', { categoryName: group.category.name })}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        horizontal
        data={group.products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        nestedScrollEnabled
        getItemLayout={(_data, index) => ({ length: 148, offset: 148 * index, index })}
        extraData={qtyMap}
      />
    </View>
  ), [renderProduct, tCategory, navigation, qtyMap]);

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
                {cat.image ? (
                  <PremiumImage
                    uri={cat.image}
                    style={styles.catGridImg}
                    iconName="grid-outline"
                    iconSize={22}
                  />
                ) : (
                  <Text style={styles.catGridIcon}>{cat.icon}</Text>
                )}
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.headerBrand}>
              <Image source={APP_LOGO} style={styles.headerLogo} />
              <View>
                <Text style={styles.deliveryTitle}>Firstmart</Text>
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

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#4b5563" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder='Search "milk"'
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={productsByCategory}
        keyExtractor={(item) => item.category._id}
        renderItem={renderCategoryGroup}
        ListHeaderComponent={listHeaderComponent}
        ListFooterComponent={search && productsByCategory.length === 0 ? emptyStateComponent : null}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        updateCellsBatchingPeriod={30}
        scrollEventThrottle={16}
      />

      {/* STICKY CART */}
      {totalItems > 0 && (
        <View style={styles.stickyCartWrapper}>
          <TouchableOpacity
            style={styles.stickyCart}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Cart' as any)}
          >
            <View style={styles.cartInfo}>
              <View style={styles.cartIconWrapper}>
                <Ionicons name="cart" size={20} color="#4b5563" />
              </View>
              <View>
                <Text style={styles.cartItemsText}>{totalItems} item{totalItems > 1 ? 's' : ''}</Text>
                <Text style={styles.cartTotalText}>₹{cartTotal}</Text>
              </View>
            </View>
            <View style={styles.cartAction}>
              <Text style={styles.cartActionText}>View Cart</Text>
              <Ionicons name="caret-forward" size={16} color="#4b5563" />
            </View>
          </TouchableOpacity>
        </View>
      )}
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
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.translatingText}>Translating application...</Text>
          <Text style={styles.translatingSubText}>कृपया प्रतीक्षा करा / कृपया प्रतीक्षा करें</Text>
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
  searchRow: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a' },
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
  categoryGridContainer: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, marginBottom: 16
  },
  catGridItem: { width: width / 4 - 4, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  catGridImgContainer: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  catGridImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  catGridIcon: { fontSize: 28 },
  catGridText: { fontSize: 11, color: '#475569', fontWeight: '500', textAlign: 'center', lineHeight: 14 },
  horizontalSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  seeAllText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },
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
  stickyCartWrapper: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    zIndex: 100,
  },
  stickyCart: {
    backgroundColor: '#7c3aed', borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', padding: 12,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6
  },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartIconWrapper: {
    backgroundColor: '#ffffff', width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center'
  },
  cartItemsText: { color: '#ffffff', fontSize: 12, fontWeight: '600', opacity: 0.9 },
  cartTotalText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  cartAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartActionText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
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

