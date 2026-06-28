import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Main'> };

export default function CartScreen({ navigation }: Props) {
  const { items, increaseQty, decreaseQty, removeFromCart, totalAmount, totalItems } = useCart();
  const { language, t, tProduct } = useLanguage();

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('cartTitle')}</Text>
        <Text style={styles.headerCount}>
          {language === 'mr' ? `${totalItems} वस्तू` : `${totalItems} item${totalItems !== 1 ? 's' : ''}`}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.img} />
            ) : (
              <View style={styles.imgPlaceholder}>
                <Ionicons name="cube-outline" size={24} color="#cbd5e1" />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.itemName} numberOfLines={1}>{tProduct(item.name)}</Text>
              <Text style={styles.itemPrice}>₹{item.price} {t('each')}</Text>
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
            <View style={styles.right}>
              <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
              <TouchableOpacity onPress={() => removeFromCart(item._id)} style={styles.removeBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>{t('totalAmount')}</Text>
          <Text style={styles.totalValue}>₹{totalAmount}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout')}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>{t('proceedToCheckout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerCount: { fontSize: 14, color: '#a855f7', fontWeight: '700', backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 16, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  img: { width: 64, height: 64, borderRadius: 12, resizeMode: 'cover' },
  imgPlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  itemPrice: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#0f172a', fontSize: 18, fontWeight: '700', lineHeight: 20 },
  qtyVal: { fontSize: 16, fontWeight: '800', color: '#0f172a', minWidth: 20, textAlign: 'center' },
  right: { alignItems: 'flex-end', gap: 10 },
  itemTotal: { fontSize: 16, fontWeight: '800', color: '#a855f7' },
  removeBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalLabel: { fontSize: 16, color: '#475569', fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '800', color: '#a855f7' },
  checkoutBtn: { backgroundColor: '#a855f7', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  empty: { flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyIconContainer: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 2, borderColor: '#f3e8ff',
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  emptySubtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 24 },
  shopBtn: { backgroundColor: '#a855f7', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  shopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
