import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import PremiumImage from '../components/PremiumImage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getProduct, resolveMediaUrl } from '../services/api';
import { getSubcategory } from '../services/api';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
  route: RouteProp<RootStackParamList, 'ProductDetail'>;
};

interface Product {
  _id: string;
  name: { en: string; mr: string } | string;
  description: string;
  price: number;
  mrp?: number;
  discount?: number;
  unit?: string;
  brand?: string;
  image?: string;
  images?: string[];
  category: string;
  subcategory?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, clearCart } = useCart();
  const { language, t, tProduct, tCategory } = useLanguage();
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top + 8 : 16;

  const flatListRef = useRef<FlatList>(null);

  const rawImages = product?.images && product.images.length > 0
    ? product.images.filter(Boolean)
    : (product?.image ? [product.image] : []);
  const imagesList = rawImages.length > 0 ? rawImages : [''];

  const price = product?.price ?? 0;
  const rawMrp = product?.mrp;
  const rawDiscount = product?.discount;

  const effectiveMrp = rawMrp && rawMrp > price
    ? rawMrp
    : (rawDiscount && rawDiscount > 0 && price > 0
      ? Math.round(price / (1 - rawDiscount / 100))
      : null);

  const effectiveDiscount = rawDiscount && rawDiscount > 0
    ? rawDiscount
    : (effectiveMrp && effectiveMrp > price
      ? Math.round(((effectiveMrp - price) / effectiveMrp) * 100)
      : 0);

  useEffect(() => {
    let mounted = true;
    getProduct(productId)
      .then(async (res) => {
        if (!mounted) return;
        const p = res.data as Product;
        setProduct(p);
        setActiveIndex(0);
        if (p?.subcategory) {
          try {
            const subRes = await getSubcategory(p.subcategory);
            if (mounted) setSubcategoryName(subRes.data?.name || String(p.subcategory));
          } catch {
            if (mounted) setSubcategoryName(String(p.subcategory));
          }
        }
      })
      .catch(console.error)
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [productId]);

  useEffect(() => {
    if (loading || !product || imagesList.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % imagesList.length;
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * screenWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [imagesList, loading, product]);

  const handleThumbnailPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    if (index !== activeIndex && index >= 0 && index < imagesList.length) {
      setActiveIndex(index);
    }
  };

  const handleAdd = () => {
    if (!product) return;
    const currentImg = imagesList[activeIndex] || product.image;
    for (let i = 0; i < qty; i++) {
      addToCart({ _id: product._id, name: product.name, price: product.price, image: currentImg, category: product.category });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product) return;
    clearCart();
    const currentImg = imagesList[activeIndex] || product.image;
    addToCart({ _id: product._id, name: product.name, price: product.price, image: currentImg, category: product.category });
    navigation.navigate('Checkout');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <Ionicons name="leaf-outline" size={40} color="#a855f7" />
          <Text style={styles.loadingText}>
            {language === 'mr' ? 'उत्पादन लोड होत आहे...' : language === 'hi' ? 'उत्पाद लोड हो रहा है...' : 'Loading product...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!product) return <View style={styles.container}><Text style={styles.errorText}>{t('productNotFound')}</Text></View>;

  return (
    <View style={styles.container}>
      {/* Floating Header */}
      <View style={[styles.floatingHeader, { top: topOffset }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('HomeMain' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.sliderContainer}>
          <FlatList
            ref={flatListRef}
            data={imagesList}
            keyExtractor={(item, index) => `${item}_${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <PremiumImage
                source={resolveMediaUrl(item) ? { uri: resolveMediaUrl(item)! } : null}
                style={{ width: screenWidth, height: 280 }}
                resizeMode="contain"
                fallbackIcon="leaf-outline"
                categoryName={product.category}
              />
            )}
          />
          {imagesList.length > 1 && (
            <View style={styles.dotsContainer}>
              {imagesList.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    activeIndex === idx ? styles.activeDot : null
                  ]}
                />
              ))}
            </View>
          )}
          {effectiveDiscount > 0 && (
            <View style={styles.imageDiscountBadge}>
              <Text style={styles.imageDiscountText}>{effectiveDiscount}% OFF</Text>
            </View>
          )}
        </View>

        {imagesList.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailContainer}
          >
            {imagesList.map((imgUrl, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.thumbnailWrapper,
                  activeIndex === idx && styles.thumbnailWrapperActive
                ]}
                onPress={() => handleThumbnailPress(idx)}
              >
                <PremiumImage
                  source={resolveMediaUrl(imgUrl) ? { uri: resolveMediaUrl(imgUrl)! } : null}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                  fallbackIcon="image-outline"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.content}>
          <View style={styles.badgeRow}>
            {product.brand ? (
              <Text style={styles.brand}>{product.brand}</Text>
            ) : (
              <Text style={styles.category}>{tCategory(product.category)}</Text>
            )}
            {subcategoryName && (
              <View style={styles.subcategoryBadge}>
                <Text style={styles.subcategoryBadgeText}>{subcategoryName}</Text>
              </View>
            )}
            <View >

            </View>
          </View>
          <Text style={styles.name}>{tProduct(product.name)}</Text>
          <Text style={styles.unitText}>{product.unit || '1 pc'}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{price}</Text>
            {effectiveMrp != null && effectiveMrp > price && (
              <Text style={styles.mrpText}>MRP ₹{effectiveMrp}</Text>
            )}
            {effectiveDiscount > 0 && (
              <View style={styles.discountBadgeInline}>
                <Text style={styles.discountBadgeInlineText}>{effectiveDiscount}% OFF</Text>
              </View>
            )}
          </View>
          <Text style={styles.qtyLabel}>{t('quantity')}</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyVal}>{qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => q + 1)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {product.description ? (
            <View style={styles.descContainer}>
              <Text style={styles.descTitle}>
                {language === 'mr' ? 'उत्पादनाची माहिती' : language === 'hi' ? 'उत्पाद विवरण' : 'Product Information'}
              </Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}





          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('totalAmountLabel')}</Text>
            <Text style={styles.totalValue}>₹{product.price * qty}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBtn, added && styles.addedBtn]}
          onPress={handleAdd}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons
              name={added ? "checkmark-circle-outline" : "cart-outline"}
              size={18}
              color={added ? "#ffffff" : "#a855f7"}
            />
            <Text style={[styles.addBtnText, added && styles.addedBtnText]}>
              {added ? t('addedCartBtn') : t('addCartBtn')}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={handleBuyNow}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flash-outline" size={18} color="#ffffff" />
            <Text style={styles.buyBtnText}>
              {language === 'mr' ? 'आत्ताच खरेदी करा' : language === 'hi' ? 'अभी खरीदें' : 'Buy Now'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  image: { width: '100%', height: 240, resizeMode: 'contain', backgroundColor: '#ffffff' },
  imagePlaceholder: { width: '100%', height: 240, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  content: { padding: 20, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, minHeight: 400 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' },
  category: { fontSize: 12, color: '#a855f7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  brand: { fontSize: 13, color: '#0f172a', fontWeight: '700', letterSpacing: 0.5 },
  subcategoryBadge: { backgroundColor: '#ddd6fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  subcategoryBadgeText: { fontSize: 12, fontWeight: '600', color: '#6d28d9' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  name: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  unitText: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 12 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  price: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  mrpText: { fontSize: 14, color: '#94a3b8', textDecorationLine: 'line-through', fontWeight: '500', marginTop: 4 },
  discountBadgeInline: {
    backgroundColor: '#f3e8ff',
    borderColor: '#d8b4fe',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 4,
  },
  discountBadgeInlineText: {
    color: '#7c3aed',
    fontWeight: '800',
    fontSize: 12,
  },
  imageDiscountBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imageDiscountText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  deliveryBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  deliveryText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  descContainer: { marginTop: 12 },
  descTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  description: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  guarantees: { flexDirection: 'row', gap: 16, justifyContent: 'space-around', marginVertical: 4 },
  guaranteeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guaranteeText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  qtyLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: '#0f172a', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  qtyVal: { fontSize: 22, fontWeight: '800', color: '#0f172a', minWidth: 30, textAlign: 'center' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#faf5ff', padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#e9d5ff',
  },
  totalLabel: { fontSize: 15, color: '#475569', fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#a855f7' },
  footer: { padding: 16, paddingBottom: 48, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', gap: 12 },
  addBtn: { flex: 1, backgroundColor: '#faf5ff', borderWidth: 1.5, borderColor: '#a855f7', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  addedBtn: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  addBtnText: { color: '#a855f7', fontSize: 15, fontWeight: '800' },
  addedBtnText: { color: '#ffffff' },
  buyBtn: { flex: 1.2, backgroundColor: '#a855f7', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buyBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  errorText: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  thumbnailContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ffffff',
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  thumbnailWrapperActive: {
    borderColor: '#a855f7',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  sliderContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  activeDot: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a855f7',
  },
});
