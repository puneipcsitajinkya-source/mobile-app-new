import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  Image, StyleSheet, RefreshControl
} from 'react-native';
import StickyCart from '../components/StickyCart';
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
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImg} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Ionicons name="leaf-outline" size={28} color="#a855f7" />
          </View>
        )}
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
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const { addToCart, items: cart, totalItems, totalAmount: cartTotal } = useCart();
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
        setProducts(productResult.value.data || []);
      } else {
        console.error('Failed to load products for category:', categoryName, productResult.reason);
        setProducts([]);
      }

      if (subcategoryResult.status === 'fulfilled') {
        setSubcategories(subcategoryResult.value.data || []);
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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <Ionicons name="leaf-outline" size={40} color="#a855f7" />
        <Text style={styles.loaderText}>Loading products...</Text>
      </View>
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
                return (
                  <TouchableOpacity
                    style={[styles.subcategoryCard, isSelected && styles.subcategoryCardActive, styles.subcategoryCardShadow]}
                    onPress={() => setSelectedSubcategory(item._id === 'all' ? '' : item._id)}
                    activeOpacity={0.8}
                  >
                    {resolveMediaUrl(item.image) ? (
                      <Image source={{ uri: resolveMediaUrl(item.image)! }} style={styles.subcategoryCardImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.subcategoryCardIcon, isSelected && styles.subcategoryCardIconActive]}>
                        <Text style={[styles.subcategoryCardIconText, isSelected && styles.subcategoryCardIconTextActive]}>{item.icon || '🏷️'}</Text>
                      </View>
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
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loaderText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  contentArea: { flex: 1 },
  mainContent: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  subcategoryColumn: { width: 96, backgroundColor: '#ffffff', paddingTop: 12, paddingBottom: 12, borderRightWidth: 1, borderRightColor: '#e2e8f0', alignItems: 'center' },
  productsColumn: { flex: 1 },
  subcategorySectionHeader: { paddingHorizontal: 12, marginBottom: 12 },
  subcategorySectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  subcategorySectionCount: { fontSize: 11, color: '#64748b', marginTop: 4 },
  subcategoryList: { paddingHorizontal: 6, paddingBottom: 12 },
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
  grid: { padding: 10, paddingBottom: 75 },
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
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#0f172a',marginRight: 6 },
  cardMrp: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through', marginTop: 2 },
  addBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#a855f7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 50, alignItems: 'center' },
  addedBtn: { backgroundColor: '#a855f7' },
  addBtnText: { color: '#a855f7', fontSize: 12, fontWeight: '800' },
  addedBtnText: { color: '#ffffff' },
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
