import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getProducts, getCategories } from '../services/api';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Main'> };

interface Product {
  _id: string;
  name: { en: string; mr: string } | string;
  description: string;
  price: number;
  image?: string;
  category: string;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
}

export default function HomeScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToCart, totalItems } = useCart();
  const [added, setAdded] = useState<string | null>(null);
  const { language, toggleLanguage, t, tProduct, tCategory } = useLanguage();

  const load = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prodRes.data);
      setFiltered(prodRes.data);
      setCategories(catRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Filter out any duplicate category names returned from the backend
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((cat) => {
      const name = (cat.name || '').trim();
      if (!name || seen.has(name.toLowerCase())) {
        return false;
      }
      seen.add(name.toLowerCase());
      return true;
    });
  }, [categories]);

  useEffect(() => {
    let result = products;
    if (category !== 'All') {
      result = result.filter(
        (p) => (p.category || '').trim().toLowerCase() === category.trim().toLowerCase()
      );
    }
    if (search) {
      result = result.filter((p) => {
        const nameObj = p.name;
        if (typeof nameObj === 'object') {
          return (
            nameObj.en.toLowerCase().includes(search.toLowerCase()) ||
            nameObj.mr.toLowerCase().includes(search.toLowerCase())
          );
        }
        return String(nameObj).toLowerCase().includes(search.toLowerCase());
      });
    }
    setFiltered(result);
  }, [search, category, products]);

  const handleAdd = (product: Product) => {
    addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image });
    setAdded(product._id);
    setTimeout(() => setAdded(null), 1000);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
      activeOpacity={0.9}
    >
      {item.image ? (
        <View style={styles.cardImgContainer}>
          <Image source={{ uri: item.image }} style={styles.cardImg} />
          <View style={styles.cardRating}>
            <Ionicons name="star" size={10} color="#fbbf24" />
            <Text style={styles.cardRatingText}>4.8</Text>
          </View>
        </View>
      ) : (
        <View style={styles.cardImgPlaceholder}>
          <Ionicons name="cube-outline" size={40} color="#cbd5e1" />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardCategory}>{tCategory(item.category)}</Text>
        <Text style={styles.cardName} numberOfLines={1}>{tProduct(item.name)}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.cardPrice}>₹{item.price}</Text>
          <TouchableOpacity
            style={[styles.addBtn, added === item._id && styles.addedBtn]}
            onPress={() => handleAdd(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.addBtnText, added === item._id && styles.addedBtnText]}>
              {added === item._id ? 'Added' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={{ backgroundColor: '#ffffff' }}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {/* <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={18} color="#a855f7" />
        </TouchableOpacity> */}
      </View>

      {/* Promo Banners */}
      <View style={styles.promoContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {/* <View style={[styles.promoCard, { backgroundColor: '#7c3aed' }]}>
            <View style={styles.promoContent}>
              <View style={styles.promoBadge}><Text style={styles.promoBadgeText}>Special Promo</Text></View>
              <Text style={styles.promoTitle}>Fresh Produce</Text>
              <Text style={styles.promoSub}>Get up to 20% OFF today</Text>
            </View>
            <Ionicons name="leaf" size={80} color="rgba(255,255,255,0.15)" style={styles.promoBgIcon} />
          </View> */}
          <View style={[styles.promoCard, { backgroundColor: '#ec4899' }]}>
            <View style={styles.promoContent}>
              <View style={[styles.promoBadge, { backgroundColor: '#fdf2f8' }]}><Text style={[styles.promoBadgeText, { color: '#ec4899' }]}>Free Delivery</Text></View>
              <Text style={styles.promoTitle}>Super Fast Delivery</Text>
              <Text style={styles.promoSub}>Within 15 mins at your door</Text>
            </View>
            <Ionicons name="flash" size={80} color="rgba(255,255,255,0.15)" style={styles.promoBgIcon} />
          </View>
        </ScrollView>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}>
          <TouchableOpacity
            key="All"
            style={[styles.catChip, category === 'All' && styles.catChipActive]}
            onPress={() => setCategory('All')}
          >
            <Text style={[styles.catChipText, category === 'All' && styles.catChipTextActive]}>{t('allCategory')}</Text>
          </TouchableOpacity>
          {uniqueCategories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              style={[styles.catChip, category.toLowerCase() === cat.name.toLowerCase() && styles.catChipActive]}
              onPress={() => setCategory(cat.name)}
            >
              <Text style={[styles.catChipText, category.toLowerCase() === cat.name.toLowerCase() && styles.catChipTextActive]}>
                {tCategory(cat.name)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>{t('appTitle')}</Text>
            <Text style={styles.headerSub}>{t('appSub')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
            <Text style={styles.langBtnText}>{language === 'en' ? 'मराठी' : 'EN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart' as any)}>
            <Ionicons name="cart-outline" size={24} color="#0f172a" />
            {totalItems > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{totalItems}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Products & Main List */}
      {loading ? (
        <ActivityIndicator size="large" color="#a855f7" style={{ flex: 1 }} />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>{t('productNotFound')}</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          numColumns={2}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#a855f7" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2, marginRight: 8 },
  logo: { width: 44, height: 44, borderRadius: 10 },
  cartBtn: { padding: 8, position: 'relative' },
  langBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', height: 36,
  },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#a855f7' },
  badge: {
    position: 'absolute', top: 2, right: 2, backgroundColor: '#a855f7',
    borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ffffff', flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', paddingVertical: 0 },
  filterBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff',
    alignItems: 'center', justifyContent: 'center',
  },
  promoContainer: { height: 135, marginTop: 14, marginBottom: 8, backgroundColor: '#ffffff' },
  promoCard: {
    width: 290, height: 120, borderRadius: 20,
    padding: 16, flexDirection: 'row', overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  promoContent: { flex: 1, justifyContent: 'center' },
  promoBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6,
  },
  promoBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase' },
  promoTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  promoSub: { fontSize: 12, color: '#f8fafc', marginTop: 2, fontWeight: '500' },
  promoBgIcon: { position: 'absolute', right: -10, bottom: -10 },
  categoriesContainer: { height: 50, backgroundColor: '#ffffff', marginVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  categoriesRow: { flex: 1 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36,
  },
  catChipActive: { backgroundColor: '#f3e8ff', borderColor: '#a855f7' },
  catChipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  catChipTextActive: { color: '#a855f7' },
  grid: { padding: 10, backgroundColor: '#f8fafc' },
  card: {
    flex: 1, maxWidth: '47%', margin: 6, backgroundColor: '#ffffff', borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
  },
  cardImgContainer: { width: '100%', height: 125, position: 'relative', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardRating: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardRatingText: { fontSize: 9, fontWeight: '800', color: '#0f172a' },
  cardImgPlaceholder: {
    width: '100%', height: 125, backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  cardBody: { padding: 12 },
  cardCategory: { fontSize: 9, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  addBtn: {
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#a855f7',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
    alignItems: 'center', justifyContent: 'center', minWidth: 52,
  },
  addedBtn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  addBtnText: { color: '#a855f7', fontWeight: '800', fontSize: 11 },
  addedBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 11 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 80, backgroundColor: '#f8fafc' },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});

