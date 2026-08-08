import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateOrderStatus } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Success'>;
  route: RouteProp<RootStackParamList, 'Success'>;
};

export default function SuccessScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  const [timeLeft, setTimeLeft] = useState(120);
  const [cancelled, setCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 5 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || cancelled) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, cancelled]);

  const handleCancel = () => {
    Alert.alert(
      t("Cancel Order"),
      t("Are you sure you want to cancel this order?"),
      [
        { text: t('no') || "No", style: "cancel" },
        {
          text: t('yes') || "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await updateOrderStatus(orderId, 'cancelled');
              setCancelled(true);

              // Update local orders list cache in AsyncStorage
              const savedOrdersStr = await AsyncStorage.getItem('@device_orders');
              if (savedOrdersStr) {
                const existingOrders = JSON.parse(savedOrdersStr);
                const updatedOrders = existingOrders.map((o: any) =>
                  o._id === orderId ? { ...o, status: 'cancelled' } : o
                );
                await AsyncStorage.setItem('@device_orders', JSON.stringify(updatedOrders));
              }

              Alert.alert(t("Order has been cancelled successfully."));
            } catch (err) {
              console.error('Failed to cancel order:', err);
              Alert.alert(t("Failed to cancel order. Please try again."));
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons
          name={cancelled ? "close-circle" : "checkmark-circle"}
          size={80}
          color={cancelled ? "#ef4444" : "#22c55e"}
        />
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.title}>
          {cancelled ? t("Order Cancelled") : t('orderPlaced')}
        </Text>
        <Text style={styles.subtitle}>
          {cancelled ? ("Your order has been cancelled successfully.") : t('orderPlacedSub')}
        </Text>

        <View style={styles.orderIdBox}>
          <Text style={styles.orderIdLabel}>{t('orderIdLabel')}</Text>
          <Text style={styles.orderId}>#{orderId.slice(-8).toUpperCase()}</Text>
        </View>

        {!cancelled && (
          <View style={styles.paymentBadge}>
            <Ionicons name="wallet-outline" size={16} color="#16a34a" />
            <Text style={styles.paymentBadgeText}>Payment: Cash / UPI (GPay, PhonePe) on Delivery</Text>
          </View>
        )}

        <Text style={styles.info}>
          {cancelled ? "" : t('thankYou')}
        </Text>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => {
            navigation.navigate('Main', {
              screen: 'Home',
              params: { screen: 'HomeMain' },
            } as any);
          }}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="arrow-forward-outline" size={18} color="#ffffff" />
            <Text style={styles.homeBtnText}>{t('continueShopping')}</Text>
          </View>
        </TouchableOpacity>

        {timeLeft > 0 && !cancelled && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
            onPress={handleCancel}
            disabled={cancelling}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
              <Text style={styles.cancelBtnText}>
                Cancel Order ({formatTime(timeLeft)})
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', padding: 30,
  },
  iconWrap: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#faf5ff', borderWidth: 2, borderColor: '#f3e8ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 28, textAlign: 'center', lineHeight: 24 },
  orderIdBox: {
    backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32,
    marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  orderIdLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  orderId: { fontSize: 22, fontWeight: '800', color: '#a855f7', letterSpacing: 2 },
  info: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  homeBtn: {
    backgroundColor: '#a855f7', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: {
    marginTop: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '800' },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  paymentBadgeText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
});
