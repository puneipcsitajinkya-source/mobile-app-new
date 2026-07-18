import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
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
  category: string;
  subcategory?: string;
}

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, clearCart } = useCart();
  const { t, tProduct, tCategory } = useLanguage();

  useEffect(() => {
    let mounted = true;
    getProduct(productId)
      .then(async (res) => {
        if (!mounted) return;
        const p = res.data as Product;
        setProduct(p);
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

  const handleAdd = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product) return;
    clearCart();
    addToCart({ _id: product._id, name: product.name, price: product.price, image: product.image });
    navigation.navigate('Checkout');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <Ionicons name="leaf-outline" size={40} color="#a855f7" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </View>
    );
  }

  if (!product) return <View style={styles.container}><Text style={styles.errorText}>{t('productNotFound')}</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PremiumImage
          source={resolveMediaUrl(product.image) ? { uri: resolveMediaUrl(product.image)! } : null}
          style={styles.image}
          resizeMode="contain"
          fallbackIcon="leaf-outline"
          categoryName={product.category}
        />
        {(product.discount ?? 0) > 0 && (
          <View style={styles.imageDiscountBadge}>
            <Text style={styles.imageDiscountText}>{product.discount}% OFF</Text>
          </View>
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
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#fbbf24" />
              <Text style={styles.ratingText}>4.8 (80+ ratings)</Text>
            </View>
          </View>
          <Text style={styles.name}>{tProduct(product.name)}</Text>
          <Text style={styles.unitText}>{product.unit || '1 pc'}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp != null && product.mrp > product.price && (
              <Text style={styles.mrpText}>MRP ₹{product.mrp}</Text>
            )}
          </View>

          {/* Delivery Promise */}
          <View style={styles.deliveryBox}>
            <Ionicons name="bicycle" size={18} color="#166534" />
            <Text style={styles.deliveryText}>Free Delivery in 15–30 mins</Text>
          </View>

          {product.description ? (
            <View style={styles.descContainer}>
              <Text style={styles.descTitle}>Product Information</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Guarantees */}
          <View style={styles.guarantees}>
            <View style={styles.guaranteeItem}>
              <Ionicons name="shield-checkmark-outline" size={15} color="#7c3aed" />
              <Text style={styles.guaranteeText}>100% Quality Checked</Text>
            </View>
            <View style={styles.guaranteeItem}>
              <Ionicons name="refresh-outline" size={15} color="#7c3aed" />
              <Text style={styles.guaranteeText}>Easy Return & Refund</Text>
            </View>
          </View>

          <View style={styles.divider} />

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
              Buy Now
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
  imageDiscountBadge: { position: 'absolute', top: 20, right: 20, backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  imageDiscountText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
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
});
