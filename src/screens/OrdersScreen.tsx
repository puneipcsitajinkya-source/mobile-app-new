import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ScrollView, ActivityIndicator,
} from 'react-native';
import { getOrdersByMobile, getSettings } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';
import { useNetwork } from '../hooks/useNetwork';

interface OrderItem {
  productId: string;
  name: string | { en: string; mr: string };
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  _id: string;
  mobile: string;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  deliveryFee: number;
  handlingFee: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'closed';
  address?: string;
  createdAt: string;
}

export default function OrdersScreen() {
  const { t } = useLanguage();
  const { latestOrder } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState('9239321112');
  const { onReconnect } = useNetwork();

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg(null);

    const activeMobile = latestOrder?.mobile || '9239321112';

    try {
      const res = await getOrdersByMobile(activeMobile);
      setOrders(res.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (latestOrder) {
        setOrders([latestOrder]);
      } else {
        setErrorMsg('Failed to load orders. Please try again.');
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [latestOrder]);

  useEffect(() => {
    fetchOrders();
    // Load dynamic support phone number
    getSettings()
      .then((res) => {
        if (res.data && res.data.contactNumber) {
          setContactPhone(res.data.contactNumber);
        }
      })
      .catch((err) => console.log('Failed to fetch contact settings:', err));
  }, [fetchOrders]);

  // Auto-reload when internet connection is restored
  useEffect(() => {
    const unsubscribe = onReconnect(() => {
      fetchOrders(true);
    });
    return unsubscribe;
  }, [onReconnect, fetchOrders]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', text: '#d97706' }; // Amber/Yellow
      case 'confirmed':
        return { bg: '#faf5ff', text: '#a855f7' }; // Purple
      case 'out_for_delivery':
        return { bg: '#eff6ff', text: '#3b82f6' }; // Blue
      case 'delivered':
        return { bg: '#f0fdf4', text: '#22c55e' }; // Green
      case 'closed':
        return { bg: '#fef2f2', text: '#dc2626' }; // Red
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  const visibleOrders = useMemo(() => orders.slice(0, 10), [orders]);

  const renderOrderItem = useCallback(({ item }: { item: Order }) => {
    const statusTheme = getStatusColor(item.status);
    const orderDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.orderCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>#{item._id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{orderDate}</Text>
          </View>

        </View>

        <View style={styles.divider} />

        {/* Tracking Timeline */}
        <View style={styles.timelineContainer}>
          {[ 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'closed' ].map((s, index) => {
            const statuses = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'closed'];
            const labels = ['Order Placed', 'Confirmed', 'Out for Delivery', 'Delivered', 'Closed'];
            const currentIndex = statuses.indexOf(item.status);
            const isActive = index <= currentIndex;
            const isLast = index === statuses.length - 1;

            return (
              <View key={s} style={styles.timelineStep}>
                <View style={styles.timelineIconContainer}>
                  <View style={[styles.timelineDot, isActive ? styles.timelineDotActive : null]} />
                  {!isLast && <View style={[styles.timelineLine, isActive && index < currentIndex ? styles.timelineLineActive : null]} />}
                </View>
                <Text style={[styles.timelineText, isActive ? styles.timelineTextActive : null]}>{labels[index]}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        {/* Items List */}
        <View style={styles.itemsSection}>
          {item.items.map((prod, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {typeof prod.name === 'object' && prod.name !== null
                  ? (prod.name as any).en || (prod.name as any).mr || 'Product'
                  : String(prod.name || 'Product')}
              </Text>
              <Text style={styles.itemQty}>× {prod.quantity}</Text>
              <Text style={styles.itemPrice}>₹{prod.price * prod.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Address */}
        {item.address && (
          <View style={styles.addressBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Ionicons name="home-outline" size={12} color="#94a3b8" />
              <Text style={styles.addressLabel}>Delivery Address:</Text>
            </View>
            <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal: ₹{item.subtotal}</Text>
            {item.deliveryFee > 0 && <Text style={styles.breakdownLabel}> | Delivery: ₹{item.deliveryFee}</Text>}
            {item.gstAmount > 0 && <Text style={styles.breakdownLabel}> | GST: ₹{item.gstAmount}</Text>}
            {item.handlingFee > 0 && <Text style={styles.breakdownLabel}> | Handling: ₹{item.handlingFee}</Text>}
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.totalLabel}>Amount</Text>
            <Text style={styles.totalValue}>₹{item.totalAmount}</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('ordersTitle') || 'My Orders'}</Text>
      </View>

      {/* Contact Banner */}
      <View style={styles.contactContainer}>
        <Ionicons name="call-outline" size={16} color="#6b21a8" style={{ marginRight: 6 }} />
        <Text style={styles.contactText}>
          Contact <Text style={styles.contactPhone}>{contactPhone}</Text> if you want to return the order.
        </Text>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#a855f7" />
          }
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="receipt-outline" size={64} color="#a855f7" />
          </View>
          <Text style={styles.emptyTitle}>{t('ordersEmpty') || 'No orders found'}</Text>
          <Text style={styles.emptySub}>
            You have not placed any orders yet. Once you place an order, it will appear here.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchOrders(false)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="refresh-outline" size={16} color="#ffffff" />
              <Text style={styles.retryBtnText}>Refresh</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#a855f7" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  contactContainer: {
    margin: 16, marginBottom: 8, backgroundColor: '#faf5ff',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e9d5ff',
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  contactText: { fontSize: 14, color: '#6b21a8', lineHeight: 20, fontWeight: '500' },
  contactPhone: { fontWeight: '800', color: '#a855f7' },
  listContainer: { padding: 16, paddingBottom: 32 },
  orderCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  timelineContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginVertical: 12 },
  timelineStep: { flex: 1, alignItems: 'center' },
  timelineIconContainer: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#cbd5e1', zIndex: 1 },
  timelineDotActive: { backgroundColor: '#a855f7' },
  timelineLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginLeft: -2, marginRight: -2 },
  timelineLineActive: { backgroundColor: '#a855f7' },
  timelineText: { fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'center', width: 60, marginLeft: -24 },
  timelineTextActive: { color: '#0f172a', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  itemsSection: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { flex: 1, fontSize: 14, color: '#475569', fontWeight: '500' },
  itemQty: { fontSize: 14, color: '#94a3b8', marginRight: 16 },
  itemPrice: { fontSize: 14, color: '#0f172a', fontWeight: '600', minWidth: 50, textAlign: 'right' },
  addressBox: { gap: 4 },
  addressLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  addressText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  totalsBox: { gap: 6 },
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  breakdownLabel: { fontSize: 11, color: '#94a3b8' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#a855f7' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 300, paddingBottom: 120 },
  emptyIconContainer: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 2, borderColor: '#f3e8ff',
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  retryBtn: { backgroundColor: '#a855f7', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  retryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
