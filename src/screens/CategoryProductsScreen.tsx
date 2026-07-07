import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  Image, StyleSheet, RefreshControl, ActivityIndicator
} from 'react-native';
import PremiumLoader from '../components/PremiumLoader';
import PremiumImage from '../components/PremiumImage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getProducts, getSubcategories } from '../services/api';
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
  subcategory?: string;
}

interface ProductCardProps {
  item: Product;
  qty: number;
  onPress: (productId: string) => void;
  onAdd: (product: Product) => void;
  tProduct: (name: Product['name']) => string;
}

const ProductCard = React.memo(function ProductCard({ item, qty, onPress, onAdd, tProduct }: ProductCardProps) {
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
          iconSize={32}
        />
        {(item.discount ?? 0) > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discount}% OFF</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardUnit}>{item.unit || '1 pc'}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{tProduct(item.name)}</Text>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.cardPrice}>₹{item.price}</Text>
            {item.mrp != null && item.mrp > item.price && (
              <Text style={styles.cardMrp}>₹{item.mrp}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addBtn, qty > 0 && styles.addedBtn]}
            onPress={() => onAdd(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.addBtnText, qty > 0 && styles.addedBtnText]}>
              {qty > 0 ? qty : 'ADD'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function CategoryProductsScreen({ navigation, route }: Props) {
  const { categoryName } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subcategories, setSubcategories] = useState<{ _id: string; name: string }[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const { addToCart, items: cart, totalItems, totalAmount: cartTotal } = useCart();
  const { tProduct } = useLanguage();

  const load = useCallback(async () => {
    try {
      const prodRes = await getProducts();
      setProducts(prodRes.data.filter((p: Product) => (p.category || '').toLowerCase() === categoryName.toLowerCase()));
      // Load subcategories for this category
      try {
        const subRes = await getSubcategories(categoryName);
        setSubcategories(subRes.data || []);
      } catch (e) {
        console.error('Failed to load subcategories:', e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryName]);

  useEffect(() => { load(); }, [load]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedSubcategory) {
      filtered = filtered.filter((p) => p.subcategory === selectedSubcategory);
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
    return (
      <ProductCard
        item={item}
        qty={qty}
        onPress={handleProductPress}
        onAdd={handleAdd}
        tProduct={tProduct}
      />
    );
  }, [getProductQty, handleAdd, handleProductPress, tProduct]);

  if (loading) return <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#a855f7" /></View>;

  return (
    <View style={styles.container}>
      {subcategories.length > 0 && (
        <View style={styles.subcategoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subcategoryScroll}>
            <TouchableOpacity
              style={[styles.subcategoryChip, !selectedSubcategory && styles.subcategoryChipActive]}
              onPress={() => setSelectedSubcategory('')}
            >
              <Text style={[styles.subcategoryText, !selectedSubcategory && styles.subcategoryTextActive]}>All</Text>
            </TouchableOpacity>
            {subcategories.map((sub) => (
              <TouchableOpacity
                key={sub._id}
                style={[styles.subcategoryChip, selectedSubcategory === sub.name && styles.subcategoryChipActive]}
                onPress={() => setSelectedSubcategory(sub.name)}
              >
                <Text style={[styles.subcategoryText, selectedSubcategory === sub.name && styles.subcategoryTextActive]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item._id}
        extraData={cart}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
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
                <Ionicons name="cart" size={20} color="#a855f7" />
              </View>
              <View>
                <Text style={styles.cartItemsText}>{totalItems} item{totalItems > 1 ? 's' : ''}</Text>
                <Text style={styles.cartTotalText}>₹{cartTotal}</Text>
              </View>
            </View>
            <View style={styles.cartAction}>
              <Text style={styles.cartActionText}>View Cart</Text>
              <Ionicons name="caret-forward" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  subcategoryContainer: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 10 },
  subcategoryScroll: { paddingHorizontal: 12, gap: 8 },
  subcategoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  subcategoryChipActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  subcategoryText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  subcategoryTextActive: { color: '#ffffff' },
  grid: { padding: 10, paddingBottom: 100 },
  card: {
    flex: 1, maxWidth: '47%', margin: 6, backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardImgContainer: { width: '100%', height: 140, backgroundColor: '#f8fafc', position: 'relative' },
  cardImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  cardImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  discountBadge: { position: 'absolute', top: 0, left: 0, backgroundColor: '#3b82f6', paddingHorizontal: 6, paddingVertical: 2, borderBottomRightRadius: 8 },
  discountText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  cardBody: { padding: 12 },
  cardUnit: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 8, height: 36, lineHeight: 18 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  cardMrp: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through', marginTop: 2 },
  addBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#a855f7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 50, alignItems: 'center' },
  addedBtn: { backgroundColor: '#a855f7' },
  addBtnText: { color: '#a855f7', fontSize: 12, fontWeight: '800' },
  addedBtnText: { color: '#ffffff' },
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 36, paddingHorizontal: 24,
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
  stickyCartWrapper: { position: 'absolute', bottom: 20, left: 16, right: 16, zIndex: 100 },
  stickyCart: { backgroundColor: '#a855f7', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, shadowColor: '#a855f7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  cartInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartIconWrapper: { backgroundColor: '#ffffff', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cartItemsText: { color: '#ffffff', fontSize: 12, fontWeight: '600', opacity: 0.9 },
  cartTotalText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  cartAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartActionText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
