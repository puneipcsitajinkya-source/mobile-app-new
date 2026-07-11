import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCart } from '../hooks/useCart';
import { placeOrder, getSettings } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { useNetwork } from '../hooks/useNetwork';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_ADDRESS_KEY = '@checkout_address';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Checkout'> };

export default function CheckoutScreen({ navigation }: Props) {
  const { items, totalAmount, clearCart, setLatestOrder } = useCart();
  const [mobile, setMobile] = useState('');
  const [confirmMobile, setConfirmMobile] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [fees, setFees] = useState({
    deliveryFeeEnabled: false,
    deliveryFee: 0,
    gstEnabled: false,
    gstPercentage: 0,
    handlingFeeEnabled: false,
    handlingFee: 0,
    freeDeliveryThresholdEnabled: false,
    freeDeliveryThreshold: 0,
  });
  const { t, tProduct } = useLanguage();
  const { isConnected } = useNetwork();
  const [checkoutDisabled, setCheckoutDisabled] = useState(false);

  const storageLoaded = useRef(false);

  // Load saved delivery address on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_ADDRESS_KEY)
      .then((savedAddress) => {
        if (savedAddress) setAddress(savedAddress);
      })
      .catch((err) => console.error('AsyncStorage load error:', err))
      .finally(() => { storageLoaded.current = true; });
  }, []);

  // Auto-save address when it changes
  useEffect(() => {
    if (!storageLoaded.current) return;
    AsyncStorage.setItem(STORAGE_ADDRESS_KEY, address).catch(() => {});
  }, [address]);

  // Clear saved address and current delivery fields
  const handleClearSaved = () => {
    AsyncStorage.removeItem(STORAGE_ADDRESS_KEY).catch(() => {});
    setAddress('');
    setLocation(null);
  };

  useEffect(() => {
    getSettings()
      .then((res) => {
        setFees((prev) => ({ ...prev, ...res.data }));
        setCheckoutDisabled(Boolean(res.data.checkoutDisabled));
      })
      .catch((err) => console.error('Error fetching settings:', err));
  }, []);

  const handleGetLocation = async () => {
    setLocLoading(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionDenied'), t('locationPermissionMsg'));
        return;
      }

      // Try last known position first (quick fallback)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        setLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
      }

      // Helper to fetch location with timeout
      const fetchLocation = async (accuracy: number, timeoutMs: number) => {
        try {
          return await Promise.race([
            Location.getCurrentPositionAsync({ accuracy }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
          ]);
        } catch (e) {
          console.warn(`Location fetch (${accuracy}) failed:`, e);
          return null;
        }
      };

      // Attempt low accuracy first, then balanced if needed
      let fresh = await fetchLocation(Location.Accuracy.Low, 8000);
      if (!fresh) fresh = await fetchLocation(Location.Accuracy.Balanced, 10000);

      if (fresh) {
        setLocation({
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
        });
      } else {
        Alert.alert(t(' '), t('locationErrorMsg'));
      }
    } catch (e) {
      console.error('Location error:', e);
      Alert.alert(t(' '), t('locationErrorMsg'));
    } finally {
      setLocLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (checkoutDisabled) {
      Alert.alert(t(' '), t('cartUnavailableMsg'));
      return;
    }
    if (items.length === 0) {
      Alert.alert(t(' '), t('cartEmptyMsg'));
      return;
    }
    if (!isConnected) {
      Alert.alert(t(' '), t('cartUnavailableMsg'));
      return;
    }
    if (!mobile || mobile.length < 10) {
      Alert.alert(t(' '), t('invalidMobileMsg'));
      return;
    }
    if (confirmMobile !== mobile) {
      Alert.alert(t(' '), 'Contact numbers do not match. Please confirm your number.');
      return;
    }
    const subtotal = Number(totalAmount);
    const isFreeDelivery = fees.deliveryFeeEnabled && fees.freeDeliveryThresholdEnabled && (subtotal >= Number(fees.freeDeliveryThreshold));
    const currentDeliveryFee = fees.deliveryFeeEnabled && !isFreeDelivery ? Number(fees.deliveryFee) : 0;
    const currentGstAmount = fees.gstEnabled ? Number((subtotal * Number(fees.gstPercentage) / 100).toFixed(2)) : 0;
    const currentHandlingFee = fees.handlingFeeEnabled ? Number(fees.handlingFee) : 0;
    const grandTotal = Number((subtotal + currentGstAmount + currentDeliveryFee + currentHandlingFee).toFixed(2));

    setPlacing(true);
    try {
      const res = await placeOrder({
        mobile,
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        address: address.trim(),
        items: items.map((i) => ({
          productId: i._id,
          name: typeof i.name === 'object' ? `${i.name.en} (${i.name.mr})` : i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
        subtotal,
        gstAmount: currentGstAmount,
        deliveryFee: currentDeliveryFee,
        handlingFee: currentHandlingFee,
        totalAmount: grandTotal,
      });
      setLatestOrder(res.data);
      clearCart();
      navigation.replace('Success', { orderId: res.data._id });
    } catch {
      const message = !isConnected ? t('cartUnavailableMsg') : t('orderFailedMsg');
      Alert.alert(t(' '), message);
    } finally {
      setPlacing(false);
    }
  };

  const isReady = mobile.length >= 10 && confirmMobile === mobile;

  const subtotal = Number(totalAmount);
  const isFreeDelivery = fees.deliveryFeeEnabled && fees.freeDeliveryThresholdEnabled && (subtotal >= Number(fees.freeDeliveryThreshold));
  const currentDeliveryFee = fees.deliveryFeeEnabled && !isFreeDelivery ? Number(fees.deliveryFee) : 0;
  const currentGstAmount = fees.gstEnabled ? Number((subtotal * Number(fees.gstPercentage) / 100).toFixed(2)) : 0;
  const currentHandlingFee = fees.handlingFeeEnabled ? Number(fees.handlingFee) : 0;
  const grandTotal = Number((subtotal + currentGstAmount + currentDeliveryFee + currentHandlingFee).toFixed(2));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {!isConnected && (
        <View style={styles.noticeBox}>
          <Ionicons name="cloud-offline-outline" size={16} color="#dc2626" />
          <Text style={styles.noticeText}>{t('cartUnavailableMsg')}</Text>
        </View>
      )}

      {/* Mobile Number */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="call-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>{t('mobileNumber')}</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder={t('mobilePlaceholder')}
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          maxLength={10}
          value={mobile}
          onChangeText={setMobile}
        />
        {mobile.length === 10 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
            <Text style={styles.successText}>{t('mobileSuccess')}</Text>
          </View>
        )}
      </View>

      {/* Confirm Contact Number */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>Confirm Contact Number</Text>
        </View>
        <TextInput
          style={[
            styles.input,
            confirmMobile.length === 10 && confirmMobile === mobile && styles.inputSuccess,
            confirmMobile.length === 10 && confirmMobile !== mobile && styles.inputError,
          ]}
          placeholder="Re-enter your mobile number"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          maxLength={10}
          value={confirmMobile}
          onChangeText={setConfirmMobile}
        />
        {confirmMobile.length === 10 && confirmMobile === mobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={styles.successText}>Numbers match ✓</Text>
          </View>
        )}
        {confirmMobile.length > 0 && confirmMobile.length === 10 && confirmMobile !== mobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Ionicons name="close-circle" size={14} color="#ef4444" />
            <Text style={styles.errorText}>Numbers do not match</Text>
          </View>
        )}
      </View>

      {/* Address Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>Delivery Address</Text>
        </View>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          placeholder="Enter complete address (optional)"
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          value={address}
          onChangeText={setAddress}
        />
        {address.trim().length >= 5 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearSaved}>
            <Ionicons name="trash-outline" size={13} color="#94a3b8" />
            <Text style={styles.clearBtnText}>Clear saved info</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>{t('deliveryLocation')}</Text>
        </View>
        <Text style={styles.sectionHint}>{t('deliveryHint')}</Text>
        {location ? (
          <View style={styles.locationBox}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <View>
              <Text style={styles.locationText}>{t('locationCaptured')}</Text>
              <Text style={styles.locationCoords}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.locationBtn} onPress={handleGetLocation} disabled={locLoading}>
            {locLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#a855f7" />
                <Text style={styles.locationBtnText}>Getting location...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location-outline" size={16} color="#a855f7" />
                <Text style={styles.locationBtnText}>{t('allowLocation')}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>{t('orderSummary')}</Text>
        </View>
        {items.map((item) => (
          <View key={item._id} style={styles.orderRow}>
            <Text style={styles.orderItemName} numberOfLines={1}>{tProduct(item.name)}</Text>
            <Text style={styles.orderItemQty}>× {item.quantity}</Text>
            <Text style={styles.orderItemPrice}>₹{item.price * item.quantity}</Text>
          </View>
        ))}
        <View style={styles.totalDivider} />

        <View style={styles.chargeRow}>
          <Text style={styles.chargeLabel}>Subtotal</Text>
          <Text style={styles.chargeValue}>₹{totalAmount}</Text>
        </View>

        {fees.gstEnabled && (
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>GST ({fees.gstPercentage}%)</Text>
            <Text style={styles.chargeValue}>+ ₹{currentGstAmount.toFixed(2)}</Text>
          </View>
        )}

        {fees.deliveryFeeEnabled && (
          <>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>Delivery Fee</Text>
              {isFreeDelivery ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.chargeValue, { textDecorationLine: 'line-through', color: '#94a3b8', fontSize: 13 }]}>
                    ₹{fees.deliveryFee}
                  </Text>
                  <Text style={[styles.chargeValue, { color: '#22c55e', fontWeight: '700' }]}>
                    Free
                  </Text>
                </View>
              ) : (
                <Text style={styles.chargeValue}>+ ₹{fees.deliveryFee}</Text>
              )}
            </View>

            {fees.freeDeliveryThresholdEnabled && !isFreeDelivery && (
              <View style={{ marginTop: 2, marginBottom: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#a855f7' }}>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                  Shop for <Text style={{ fontWeight: '700', color: '#a855f7' }}>₹{(fees.freeDeliveryThreshold - subtotal).toFixed(0)}</Text> more to get Free Delivery!
                </Text>
              </View>
            )}

            {fees.freeDeliveryThresholdEnabled && isFreeDelivery && (
              <View style={{ marginTop: 2, marginBottom: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#22c55e' }}>
                <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600' }}>
                  🎉 Free Delivery Threshold Met!
                </Text>
              </View>
            )}
          </>
        )}

        {fees.handlingFeeEnabled && (
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>Handling Charges</Text>
            <Text style={styles.chargeValue}>+ ₹{fees.handlingFee}</Text>
          </View>
        )}

        <View style={styles.totalDivider} />
        <View style={styles.orderRow}>
          <Text style={[styles.orderItemName, { fontWeight: '800', color: '#0f172a' }]}>{t('total')}</Text>
          <Text style={[styles.orderItemPrice, { fontSize: 20, fontWeight: '800' }]}>
            ₹{grandTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.placeBtn, !isReady && styles.placeBtnDisabled]}
        onPress={handlePlaceOrder}
        disabled={placing || !isReady}
        activeOpacity={0.85}
      >
        {placing ? (
          <View style={styles.placeBtnContent}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.placeBtnText} numberOfLines={1}>{t('placeOrder')}</Text>
          </View>
        ) : (
          <View style={styles.placeBtnContent}>
            <Ionicons name="paper-plane-outline" size={18} color="#ffffff" />
            <Text style={styles.placeBtnText} numberOfLines={1} ellipsizeMode="tail">{t('placeOrder')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  section: {
    margin: 16, marginBottom: 8, backgroundColor: '#ffffff',
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionHint: { fontSize: 12, color: '#94a3b8', marginBottom: 12, marginTop: -8 },
  noticeBox: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  noticeText: { flex: 1, color: '#b91c1c', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 12, color: '#0f172a', fontSize: 15,
  },
  inputSuccess: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: { color: '#ef4444', fontSize: 12 },
  successText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  locationBtn: {
    backgroundColor: '#faf5ff', borderWidth: 1.5, borderColor: '#a855f7',
    borderRadius: 10, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed',
  },
  locationBtnText: { color: '#a855f7', fontSize: 15, fontWeight: '700' },
  locationBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#faf5ff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e9d5ff',
  },
  locationText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  locationCoords: { fontSize: 12, color: '#a855f7', marginTop: 2 },
  orderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  orderItemName: { flex: 1, fontSize: 14, color: '#475569', fontWeight: '600' },
  orderItemQty: { fontSize: 14, color: '#94a3b8', marginRight: 12 },
  orderItemPrice: { fontSize: 15, color: '#a855f7', fontWeight: '700' },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  chargeLabel: { fontSize: 13, color: '#64748b' },
  chargeValue: { fontSize: 13, color: '#475569', fontWeight: '500' },
  totalDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  placeBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#a855f7',
    borderRadius: 14,
    height: 52,
    width: '90%',
    maxWidth: '90%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeBtnDisabled: { backgroundColor: '#d8b4fe', shadowOpacity: 0 },
  placeBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', flex: 1 },
  placeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center', flexShrink: 1, flexWrap: 'wrap' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-end' },
  clearBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
});
