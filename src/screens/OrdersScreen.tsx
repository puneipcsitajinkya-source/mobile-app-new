import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Alert,
  AppState,
} from 'react-native';
import { getOrder, getSettings, updateOrderStatus } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';
import { useNetwork } from '../hooks/useNetwork';
import PremiumLoader from '../components/PremiumLoader';
import OrderStatusLoader from '../components/OrderStatusLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

interface OrderItem {
  productId: string;
  name: string | { en: string; mr: string };
  price: number;
  quantity: number;
  image?: string;
  category?: string;
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
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'closed' | 'cancelled';
  address?: string;
  createdAt: string;
}

const STORAGE_ORDERS_KEY = '@device_orders';
const MAX_LOCAL_ORDERS = 50;

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { language, t, tProduct } = useLanguage();
  const { latestOrder } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState('9239321112');
  const { onReconnect } = useNetwork();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const getRemainingTime = (createdAtStr: string) => {
    const createdAt = new Date(createdAtStr).getTime();
    const now = Date.now();
    const diff = 120000 - (now - createdAt); // 2 minutes in ms
    return Math.max(0, diff);
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelOrder = (orderId: string) => {
    Alert.alert(
      t('Cancel Order') || 'Cancel Order',
      t('Are you sure you want to cancel this order?') || 'Are you sure you want to cancel this order?',
      [
        { text: t('no') || 'No', style: 'cancel' },
        {
          text: t('yes') || 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await updateOrderStatus(orderId, 'cancelled');

              // Update local state and AsyncStorage immediately
              const savedOrdersStr = await AsyncStorage.getItem(STORAGE_ORDERS_KEY);
              if (savedOrdersStr) {
                const existingOrders: Order[] = JSON.parse(savedOrdersStr);
                const updatedOrders = existingOrders.map((o) =>
                  o._id === orderId ? { ...o, status: 'cancelled' as const } : o
                );
                await AsyncStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updatedOrders));
                setOrders(updatedOrders);
              } else {
                setOrders((prev) =>
                  prev.map((o) => (o._id === orderId ? { ...o, status: 'cancelled' as const } : o))
                );
              }

              Alert.alert(
                language === 'mr'
                  ? 'ऑर्डर यशस्वीपणे रद्द केली.'
                  : language === 'hi'
                    ? 'ऑर्डर सफलतापूर्वक रद्द कर दिया गया।'
                    : 'Order has been cancelled successfully.'
              );
            } catch (err) {
              console.error('Failed to cancel order:', err);
              Alert.alert(
                language === 'mr'
                  ? 'ऑर्डर रद्द करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.'
                  : language === 'hi'
                    ? 'ऑर्डर रद्द करने में विफल। कृपया पुनः प्रयास करें।'
                    : 'Failed to cancel order. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Sync device orders with backend & persist to AsyncStorage
  const syncOrders = useCallback(
    async (isUserRefresh = false) => {
      if (isUserRefresh) {
        setRefreshing(true);
      }
      setErrorMsg(null);

      try {
        // 1. Read current local storage
        const savedOrdersStr = await AsyncStorage.getItem(STORAGE_ORDERS_KEY);
        let currentLocal: Order[] = savedOrdersStr ? JSON.parse(savedOrdersStr) : [];

        if (currentLocal.length === 0) {
          setOrders([]);
          return;
        }

        // 2. Fetch fresh status for this device's orders in parallel
        const updatedLocal = await Promise.all(
          currentLocal.map(async (order) => {
            try {
              const res = await getOrder(order._id);
              if (res.data) return res.data;
              return order;
            } catch {
              return order;
            }
          })
        );

        // 3. Sort descending by createdAt and slice to MAX_LOCAL_ORDERS
        const finalOrders = updatedLocal
          .filter((o) => Boolean(o && o._id))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_LOCAL_ORDERS);

        // 4. Persist to local storage (AsyncStorage)
        if (finalOrders.length > 0) {
          await AsyncStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(finalOrders));
        }

        setOrders(finalOrders);
      } catch (err) {
        console.error('Error syncing orders:', err);
        // Fallback to whatever is in local storage
        try {
          const fallbackStr = await AsyncStorage.getItem(STORAGE_ORDERS_KEY);
          if (fallbackStr) {
            const fallbackOrders = JSON.parse(fallbackStr);
            if (Array.isArray(fallbackOrders) && fallbackOrders.length > 0) {
              setOrders(fallbackOrders);
            }
          }
        } catch (e) {
          // ignore
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [latestOrder]
  );

  // 1. Immediately load local orders on mount (0ms delay offline-first experience)
  useEffect(() => {
    let isMounted = true;

    const initOrders = async () => {
      try {
        const savedOrdersStr = await AsyncStorage.getItem(STORAGE_ORDERS_KEY);
        if (savedOrdersStr) {
          const parsed: Order[] = JSON.parse(savedOrdersStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (isMounted) {
              setOrders(parsed);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to read initial local orders:', err);
      }

      // Background sync fresh data from backend
      if (isMounted) {
        syncOrders(false);
      }
    };

    initOrders();

    return () => {
      isMounted = false;
    };
  }, [syncOrders]);

  // Load support phone number from store settings
  useEffect(() => {
    const fetchSettings = async () => {
      let storeId = '';
      const savedStore = await AsyncStorage.getItem('active_store');
      if (savedStore) {
        try {
          storeId = JSON.parse(savedStore)._id;
        } catch (e) {
          console.error(e);
        }
      }

      const params = storeId ? { store: storeId } : undefined;
      getSettings(params)
        .then((res) => {
          if (res.data && res.data.contactNumber) {
            setContactPhone(res.data.contactNumber);
          }
        })
        .catch((err) => console.log('Failed to fetch contact settings:', err));
    };
    fetchSettings();
  }, []);

  // Auto-reload when internet connection is restored
  useEffect(() => {
    const unsubscribe = onReconnect(() => {
      syncOrders(true);
    });
    return unsubscribe;
  }, [onReconnect, syncOrders]);

  // Auto-poll every 2 minutes while active orders are pending
  const isFocused = useIsFocused();
  const hasActiveOrders = useMemo(
    () => orders.some((o) => ['pending', 'confirmed', 'out_for_delivery'].includes(o.status)),
    [orders]
  );

  useEffect(() => {
    if (!isFocused || !hasActiveOrders) return;

    const POLL_INTERVAL = 120000; // 2 minutes
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        syncOrders(true);
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncOrders(true);
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [isFocused, hasActiveOrders, syncOrders]);

  // Refetch when tab gains focus
  useEffect(() => {
    if (isFocused) {
      syncOrders(true);
    }
  }, [isFocused]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', text: '#d97706' };
      case 'confirmed':
        return { bg: '#faf5ff', text: '#a855f7' };
      case 'out_for_delivery':
        return { bg: '#eff6ff', text: '#3b82f6' };
      case 'delivered':
        return { bg: '#f0fdf4', text: '#22c55e' };
      case 'closed':
      case 'cancelled':
        return { bg: '#fef2f2', text: '#dc2626' };
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return language === 'mr' ? 'प्रलंबित' : language === 'hi' ? 'लंबित' : 'Pending';
      case 'confirmed':
        return language === 'mr' ? 'निश्चित झाले' : language === 'hi' ? 'पुष्ट हुआ' : 'Confirmed';
      case 'out_for_delivery':
        return language === 'mr' ? 'डिलिव्हरीसाठी बाहेर पडले' : language === 'hi' ? 'डिलीवरी के लिए निकला' : 'Out for Delivery';
      case 'delivered':
        return language === 'mr' ? 'वितरित झाले' : language === 'hi' ? 'वितरित हुआ' : 'Delivered';
      case 'closed':
        return language === 'mr' ? 'बंद झाले' : language === 'hi' ? 'बंद हुआ' : 'Closed';
      case 'cancelled':
        return language === 'mr' ? 'रद्द झाले' : language === 'hi' ? 'रद्द हुआ' : 'Cancelled';
      default:
        return status;
    }
  };

  const renderOrderItem = useCallback(
    ({ item }: { item: Order }) => {
      const statusTheme = getStatusColor(item.status);
      const orderDate = new Date(item.createdAt).toLocaleDateString(
        language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      );

      return (
        <View style={styles.orderCard}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.orderId}>#{item._id.slice(-8).toUpperCase()}</Text>
              <Text style={styles.orderDate}>{orderDate}</Text>
            </View>

            {item.status === 'pending' && getRemainingTime(item.createdAt) > 0 ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancelOrder(item._id)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={14} color="#dc2626" style={{ marginRight: 4 }} />
                <Text style={styles.cancelBtnText}>
                  {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'} ({formatTime(getRemainingTime(item.createdAt))})
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
                <Text style={[styles.statusText, { color: statusTheme.text }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            )}
          </View>

          {/* Premium Animated Status Loader */}
          <OrderStatusLoader status={item.status} />

          <View style={styles.divider} />

          {/* Items List */}
          <View style={styles.itemsSection}>
            {item.items.map((prod, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {tProduct(prod.name)}
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
                <Text style={styles.addressLabel}>
                  {language === 'mr' ? 'डिलिव्हरी पत्ता:' : language === 'hi' ? 'डिलीवरी पता:' : 'Delivery Address:'}
                </Text>
              </View>
              <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{t('subtotal') || 'Subtotal'}: ₹{item.subtotal}</Text>
              {item.deliveryFee > 0 && <Text style={styles.breakdownLabel}> | {t('deliveryFee') || 'Delivery'}: ₹{item.deliveryFee}</Text>}
              {item.gstAmount > 0 && <Text style={styles.breakdownLabel}> | GST: ₹{item.gstAmount}</Text>}
              {item.handlingFee > 0 && <Text style={styles.breakdownLabel}> | {t('handlingFee') || 'Handling'}: ₹{item.handlingFee}</Text>}
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.totalLabel}>{t('total') || 'Amount'}</Text>
              <Text style={styles.totalValue}>₹{item.totalAmount}</Text>
            </View>
          </View>
        </View>
      );
    },
    [tick, handleCancelOrder, t, tProduct, language]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
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
        <PremiumLoader message="Loading orders" subMessage="Checking your recent purchases" fullScreen />
      ) : orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => syncOrders(true)} tintColor="#a855f7" />
          }
        >
          <View style={styles.emptyIconContainer}>
            <Ionicons name="receipt-outline" size={60} color="#a855f7" />
          </View>
          <Text style={styles.emptyTitle}>{t('ordersEmpty') || 'No orders found'}</Text>
          <Text style={styles.emptySub}>
            {language === 'mr'
              ? 'तुम्ही अद्याप या डिव्हाइसवरून कोणतीही ऑर्डर दिलेली नाही. तुम्ही ऑर्डर दिल्यावर ती येथे दिसेल.'
              : language === 'hi'
                ? 'आपने अभी तक इस डिवाइस से कोई ऑर्डर नहीं दिया है। जब आप ऑर्डर देंगे, तो वह यहाँ दिखाई देगा।'
                : 'You have not placed any orders yet. Once you place an order, it will appear here.'}
          </Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => syncOrders(true)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="refresh-outline" size={16} color="#ffffff" />
              <Text style={styles.retryBtnText}>
                {language === 'mr' ? 'रिफ्रेश करा' : language === 'hi' ? 'रिफ्रेश करें' : 'Refresh'}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          extraData={tick}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 75 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => syncOrders(true)} tintColor="#a855f7" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  contactContainer: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: { fontSize: 14, color: '#6b21a8', lineHeight: 20, fontWeight: '500' },
  contactPhone: { fontWeight: '800', color: '#a855f7' },
  listContainer: { padding: 16, paddingBottom: 75 },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 400,
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#faf5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#f3e8ff',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 20, lineHeight: 20, paddingHorizontal: 16 },
  retryBtn: {
    backgroundColor: '#a855f7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
