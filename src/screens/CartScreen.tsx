import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  ScrollView, ActivityIndicator
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { getSettings } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import PremiumImage from '../components/PremiumImage';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Main'> };

export default function CartScreen({ navigation }: Props) {
  const { items, increaseQty, decreaseQty, totalAmount, totalSavings, totalItems } = useCart();
  const { language, t, tProduct } = useLanguage();
  
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then(res => setSettings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="cart-outline" size={64} color="#a855f7" />
        </View>
        <Text style={styles.emptyTitle}>{t('cartEmpty')}</Text>
        <Text style={styles.emptySubtitle}>{language === 'mr' ? 'पिशवीत काही उत्पादने जोडा!' : 'Add some products to your cart!'}</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home' as any)} activeOpacity={0.85}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="storefront-outline" size={18} color="#ffffff" />
            <Text style={styles.shopBtnText}>{t('browseProducts')}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate bill details
  let deliveryFee = 0;
  if (settings?.deliveryFeeEnabled) {
    deliveryFee = settings.deliveryFee || 0;
    if (settings.freeDeliveryThresholdEnabled && totalAmount >= settings.freeDeliveryThreshold) {
      deliveryFee = 0; // Free delivery!
    }
  }

  let handlingFee = 0;
  if (settings?.handlingFeeEnabled) {
    handlingFee = settings.handlingFee || 0;
  }

  let gst = 0;
  if (settings?.gstEnabled) {
    gst = (totalAmount * (settings.gstPercentage || 0)) / 100;
  }

  const grandTotal = totalAmount + deliveryFee + handlingFee + gst;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Cart</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Delivery Promise */}
          <View style={styles.deliveryBox}>
            <View style={styles.deliveryBoxIcon}>
              <Ionicons name="time-outline" size={24} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryTitle}>Delivery in {settings?.deliveryTime || '10 mins'}</Text>
              <Text style={styles.deliverySub}>Shipment of {totalItems} item{totalItems > 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Items List */}
          <View style={styles.section}>
            {items.map((item) => (
              <View key={item._id} style={styles.row}>
                <PremiumImage
                  uri={item.image}
                  style={styles.img}
                  iconName="leaf-outline"
                  iconSize={20}
                />
                <View style={styles.info}>
                  <Text style={styles.itemName} numberOfLines={2}>{tProduct(item.name)}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(item._id)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(item._id)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Bill Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill Details</Text>
            <View style={styles.billRow}>
              <View style={styles.billRowIcon}>
                <Ionicons name="receipt-outline" size={16} color="#64748b" />
                <Text style={styles.billLabel}>Item Total</Text>
              </View>
              <View style={styles.billRowValue}>
                {totalSavings > 0 && <Text style={styles.billMrp}>₹{totalAmount + totalSavings}</Text>}
                <Text style={styles.billValue}>₹{totalAmount}</Text>
              </View>
            </View>
            
            <View style={styles.billRow}>
              <View style={styles.billRowIcon}>
                <Ionicons name="bicycle-outline" size={16} color="#64748b" />
                <Text style={styles.billLabel}>Delivery Fee</Text>
              </View>
              <Text style={styles.billValue}>
                {deliveryFee === 0 ? (
                  <Text style={{ color: '#16a34a' }}>FREE</Text>
                ) : (
                  <Text>{`₹${deliveryFee}`}</Text>
                )}
              </Text>
            </View>

            {handlingFee > 0 && (
              <View style={styles.billRow}>
                <View style={styles.billRowIcon}>
                  <Ionicons name="briefcase-outline" size={16} color="#64748b" />
                  <Text style={styles.billLabel}>Handling Fee</Text>
                </View>
                <Text style={styles.billValue}>₹{handlingFee}</Text>
              </View>
            )}

            {gst > 0 && (
              <View style={styles.billRow}>
                <View style={styles.billRowIcon}>
                  <Ionicons name="document-text-outline" size={16} color="#64748b" />
                  <Text style={styles.billLabel}>Taxes (GST)</Text>
                </View>
                <Text style={styles.billValue}>₹{gst.toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.billRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(2)}</Text>
            </View>

            {totalSavings > 0 && (
              <View style={styles.savingsBox}>
                <Ionicons name="pricetag" size={16} color="#16a34a" />
                <Text style={styles.savingsText}>You are saving ₹{totalSavings} on this order!</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {!loading && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Checkout')}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.checkoutAmount}>₹{grandTotal.toFixed(2)}</Text>
              <Text style={styles.checkoutSub}>TOTAL</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.checkoutBtnText}>Checkout</Text>
              <Ionicons name="chevron-forward" size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  deliveryBox: {
    margin: 12, padding: 16, backgroundColor: '#ffffff', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1
  },
  deliveryBoxIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  deliveryTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  deliverySub: { fontSize: 13, color: '#64748b' },
  section: {
    marginHorizontal: 12, marginBottom: 12, padding: 16, backgroundColor: '#ffffff', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  img: { width: 56, height: 56, borderRadius: 10, resizeMode: 'cover', borderWidth: 1, borderColor: '#f1f5f9' },
  imgPlaceholder: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 6, lineHeight: 18 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  qtyVal: { fontSize: 15, fontWeight: '800', color: '#0f172a', minWidth: 20, textAlign: 'center' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  billRowIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billRowValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billLabel: { fontSize: 14, color: '#475569' },
  billValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  billMrp: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
  grandTotalRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginBottom: 0 },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  savingsBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginTop: 16 },
  savingsText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10,
  },
  checkoutBtn: { backgroundColor: '#a855f7', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutAmount: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  checkoutSub: { color: '#ffffff', fontSize: 10, fontWeight: '700', opacity: 0.8 },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  empty: { flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', padding: 30, paddingBottom: 120 },
  emptyIconContainer: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 2, borderColor: '#f3e8ff',
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  emptySubtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 24 },
  shopBtn: { backgroundColor: '#a855f7', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  shopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
