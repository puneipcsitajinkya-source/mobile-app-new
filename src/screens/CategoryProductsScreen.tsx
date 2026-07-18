import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Dimensions, Image
} from 'react-native';
import PremiumImage from '../components/PremiumImage';
import StickyCart from '../components/StickyCart';
import PremiumLoader from '../components/PremiumLoader';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getProducts, getSubcategories, resolveMediaUrl } from '../services/api';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

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
  category: string;
  // now storing subcategory as an id string (ObjectId)
  subcategory?: string;
}

interface Subcategory {
  _id: string;
  name: string;
  icon?: string;
  image?: string;
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
}

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 96;
const FULL_CARD_WIDTH  = (width - 28) / 2;          // no sidebar: 2 cols, 6px gap on each side
const SIDE_CARD_WIDTH  = ((width - SIDEBAR_WIDTH) - 20) / 2; // with sidebar: 2 cols, smaller column

const ProductCard = React.memo(function ProductCard({
  item, qty, onPress, onAdd, onIncrease, onDecrease, tProduct, cardWidth,
}: ProductCardProps) {
  const hasDiscount = (item.discount ?? 0) > 0;
  const hasMrp = item.mrp != null && item.mrp > item.price;

  return (
    <TouchableOpacity style={[styles.card, { width: cardWidth }]} onPress={() => onPress(item._id)} activeOpacity={0.93}>

      {/* ── Image section (faint purple bg) ── */}
      <View style={styles.cardImgContainer}>
        <PremiumImage
          source={resolveMediaUrl(item.image) ? { uri: resolveMediaUrl(item.image)! } : null}
          style={styles.cardImg}
          resizeMode="contain"
          fallbackIcon="leaf-outline"
          categoryName={item.category}
        />

        {/* Discount badge — top left */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}% OFF</Text>
          </View>
        )}

        {/* Bottom bar: unit + ADD / qty control */}
        <View style={styles.cardImgBar}>
          <Text style={styles.cardUnitOverlay} numberOfLines={1}>{item.unit || '1 pc'}</Text>

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
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Content below image ── */}
      <View style={styles.cardContent}>
        <View style={styles.priceRow}>
          <Text style={styles.cardPrice}>₹{item.price}</Text>
          {hasMrp && <Text style={styles.cardMrp}>₹{item.mrp}</Text>}
        </View>
        {hasDiscount && (
          <Text style={styles.discountLabel}>{item.discount}% OFF on MRP</Text>
        )}
        <Text style={styles.cardName} numberOfLines={3}>{tProduct(item.name)}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function CategoryProductsScreen({ navigation, route }: Props) {
  const { categoryName } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const { addToCart, items: cart, totalItems, totalAmount: cartTotal, increaseQty, decreaseQty } = useCart();
  const { tProduct } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);

    try {
      const [productResult, subcategoryResult] = await Promise.allSettled([
        getProducts({ category: categoryName }),
        getSubcategories(categoryName),
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
    addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image, mrp: product.mrp });
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
      />
    );
  }, [getProductQty, handleAdd, handleProductPress, increaseQty, decreaseQty, tProduct, subcategories.length]);

  if (loading) {
    return (
      <PremiumLoader
        message="Loading products"
        subMessage={`Fetching items in ${categoryName}`}
        size="large"
        fullScreen
      />
    );
  }

  const subcategoryItems = [{ _id: 'all', name: 'All', icon: '📦' }, ...subcategories];

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
              contentContainerStyle={styles.subcategoryList}
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
                    {!isAllTab && (
                      <PremiumImage
                        source={resolveMediaUrl(item.image) ? { uri: resolveMediaUrl(item.image)! } : null}
                        style={styles.subcategoryCardImage}
                        resizeMode="cover"
                        categoryName={item.name}
                        fallbackEmoji={item.icon || '🏷️'}
                      />
                    )}
                    <Text style={[styles.subcategoryCardLabel, isSelected && styles.subcategoryCardLabelActive]} numberOfLines={2}>
                      {item.name}
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
              contentContainerStyle={styles.grid}
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
                  <Text style={styles.emptyTitle}>No products found</Text>
                  <Text style={styles.emptySubText}>No items are available{selectedSubcategory ? ' in this subcategory' : ' in this category'} right now.</Text>
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
          contentContainerStyle={styles.grid}
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
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubText}>No items are available{selectedSubcategory ? ' in this subcategory' : ' in this category'} right now.</Text>
            </View>
          }
        />
      )}

      <StickyCart
        totalItems={totalItems}
        cartTotal={cartTotal}
        onPress={() => navigation.navigate('Cart' as any)}
        tintColor="#a855f7"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  contentArea: { flex: 1 },
  mainContent: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  subcategoryColumn: { width: 96, backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, borderRightWidth: 1, borderRightColor: '#e2e8f0', alignItems: 'center' },
  productsColumn: { flex: 1 },
  subcategorySectionHeader: { paddingHorizontal: 12, marginBottom: 12 },
  subcategorySectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  subcategorySectionCount: { fontSize: 11, color: '#64748b', marginTop: 4 },
  subcategoryList: { paddingHorizontal: 6, paddingBottom: 100 },
  subcategorySeparator: { height: 10 },
  subcategoryCard: {
    width: 72,
    minHeight: 72,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subcategoryCardActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#6d28d9',
  },
  subcategoryCardImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#ede9fe',
    marginBottom: 6,
  },
  subcategoryCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  subcategoryCardIconActive: { backgroundColor: '#ffffff' },
  subcategoryCardIconText: { fontSize: 22, color: '#7c3aed' },
  subcategoryCardIconTextActive: { color: '#a855f7' },
  subcategoryCardLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
  subcategoryCardLabelActive: { color: '#ffffff' },
  subcategoryCardShadow: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  productList: { flex: 1 },
  grid: { padding: 6, paddingBottom: 90 },

  // ── Product card ──
  card: {
    margin: 5,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImgContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0ebff',   // faint purple theme
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  cardImg: {
    width: '82%',
    height: '78%',
    resizeMode: 'contain',
  },
  cardImgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  discountText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Bottom bar overlaid on image
  cardImgBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: 'rgba(240,235,255,0.92)',
    zIndex: 20,
    elevation: 20,
  },
  cardUnitOverlay: {
    fontSize: 11,
    color: '#4c1d95',
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  // ADD button
  addBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    minWidth: 60,
    alignItems: 'center',
  },
  addBtnText: { color: '#7c3aed', fontSize: 13, fontWeight: '800' },
  // Qty stepper (replaces ADD when item in cart)
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 80,
    height: 32,
  },
  qtyBtn: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  qtyValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Content below image
  cardContent: { padding: 10 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
  },
  cardPrice: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardMrp: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
  discountLabel: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '700',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 17,
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
