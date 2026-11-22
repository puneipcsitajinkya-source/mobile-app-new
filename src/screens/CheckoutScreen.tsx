import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Location from 'expo-location';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useCart } from '../hooks/useCart';
import { placeOrder, getSettings } from '../services/api';
import { useLanguage } from '../hooks/useLanguage';
import { useNetwork } from '../hooks/useNetwork';
import { Ionicons } from '@expo/vector-icons';
import PremiumLoader from '../components/PremiumLoader';
import CheckoutDisabledModal from '../components/CheckoutDisabledModal';

const STORAGE_ADDRESS_KEY = '@checkout_address';
const STORAGE_CONTACT_KEY = '@checkout_contact';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Checkout'> };

export default function CheckoutScreen({ navigation }: Props) {
  const insets: any = useSafeAreaInsets();
  const { items, totalAmount, clearCart, setLatestOrder } = useCart();
  const [mobile, setMobile] = useState('');
  const [confirmMobile, setConfirmMobile] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
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
  const { language, t, tProduct } = useLanguage();
  const { isConnected } = useNetwork();
  const [checkoutDisabled, setCheckoutDisabled] = useState(false);
  const [checkoutDisabledMessage, setCheckoutDisabledMessage] = useState('');
  const [showDisabledModal, setShowDisabledModal] = useState(false);

  const addressStorageLoaded = useRef(false);
  const contactStorageLoaded = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const mobileSectionY = useRef(0);
  const confirmMobileSectionY = useRef(0);
  const locationSectionY = useRef(0);
  const { height } = useWindowDimensions();

  const headerHeight = Math.max(60, Math.round((height - insets.top) * 0.2));

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: '#ffffff',
        height: headerHeight + insets.top,
      } as any,
      headerTitleStyle: {
        fontSize: 16,
        fontWeight: '700',
      },
    });
  }, [navigation, headerHeight, insets.top]);

  // Load saved delivery address on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_ADDRESS_KEY)
      .then((savedAddress) => {
        if (savedAddress) setAddress(savedAddress);
      })
      .catch((err) => console.error('AsyncStorage load error:', err))
      .finally(() => { addressStorageLoaded.current = true; });
  }, []);

  // Load saved contact numbers on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_CONTACT_KEY)
      .then((savedContact) => {
        if (!savedContact) return;
        try {
          const parsed = JSON.parse(savedContact);
          if (parsed.mobile) setMobile(parsed.mobile);
          if (parsed.confirmMobile) setConfirmMobile(parsed.confirmMobile);
        } catch (err) {
          console.error('AsyncStorage contact parse error:', err);
        }
      })
      .catch((err) => console.error('AsyncStorage contact load error:', err))
      .finally(() => { contactStorageLoaded.current = true; });
  }, []);

  // Auto-save address when it changes
  useEffect(() => {
    if (!addressStorageLoaded.current) return;
    AsyncStorage.setItem(STORAGE_ADDRESS_KEY, address).catch(() => { });
  }, [address]);

  // Auto-save contact numbers when they change
  useEffect(() => {
    if (!contactStorageLoaded.current) return;
    AsyncStorage.setItem(STORAGE_CONTACT_KEY, JSON.stringify({ mobile, confirmMobile })).catch(() => { });
  }, [mobile, confirmMobile]);

  // Clear saved address and current delivery fields
  const handleClearSaved = () => {
    AsyncStorage.removeItem(STORAGE_ADDRESS_KEY).catch(() => { });
    setAddress('');
    setLocation(null);
    setLocationError('');
  };

  const handleNewAddress = () => {
    Alert.alert(
      t("New Address"),
      t("Are you sure you want to clear all fields to enter a new address?"),
      [
        { text: t('cancel') || "Cancel", style: "cancel" },
        {
          text: t('clear') || "Clear All",
          style: "destructive",
          onPress: () => {
            AsyncStorage.removeItem(STORAGE_ADDRESS_KEY).catch(() => { });
            AsyncStorage.removeItem(STORAGE_CONTACT_KEY).catch(() => { });
            setAddress('');
            setMobile('');
            setConfirmMobile('');
            setLocation(null);
            setLocationError('');
          }
        }
      ]
    );
  };

  useEffect(() => {
    const fetchSettingsForStore = async () => {
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
        .then(async (res) => {
          let data = res.data;
          let globalData: any = null;
          try {
            const globalRes = await getSettings();
            globalData = globalRes?.data;
          } catch (e) {}

          const isGloballyDisabled = Boolean(globalData?.checkoutDisabled);
          const isDisabled = Boolean(data?.checkoutDisabled || isGloballyDisabled);

          const storeBannerMsg =
            data?.banners?.find((b: any) => b.isCheckoutNotice)?.message?.trim() ||
            data?.banners?.find((b: any) => b.isCheckoutNotice)?.subtitle?.trim();

          const globalBannerMsg =
            globalData?.banners?.find((b: any) => b.isCheckoutNotice)?.message?.trim() ||
            globalData?.banners?.find((b: any) => b.isCheckoutNotice)?.subtitle?.trim();

          const storeCustomMsg =
            data?.checkoutDisabledMessage &&
            data.checkoutDisabledMessage !== 'We are currently not accepting new orders. Please check back shortly!'
              ? data.checkoutDisabledMessage.trim()
              : '';

          const globalCustomMsg =
            globalData?.checkoutDisabledMessage &&
            globalData.checkoutDisabledMessage !== 'We are currently not accepting new orders. Please check back shortly!'
              ? globalData.checkoutDisabledMessage.trim()
              : '';

          const resolvedMsg =
            storeBannerMsg ||
            globalBannerMsg ||
            storeCustomMsg ||
            globalCustomMsg ||
            data?.checkoutDisabledMessage?.trim() ||
            globalData?.checkoutDisabledMessage?.trim() ||
            '';

          setFees((prev) => ({ ...prev, ...data }));
          setCheckoutDisabled(isDisabled);
          setCheckoutDisabledMessage(resolvedMsg);
        })
        .catch((err) => console.error('Error fetching settings:', err));
    };
    fetchSettingsForStore();
  }, []);

  const handleGetLocation = async () => {
    setLocLoading(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(t('locationRequiredMsg'));
        scrollViewRef.current?.scrollTo({ y: Math.max(0, locationSectionY.current - 15), animated: true });
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
        setLocationError('');
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
        setLocationError('');
      } else {
        setLocationError(t('locationRequiredMsg'));
        Alert.alert(t('errorTitle'), t('locationErrorMsg'));
      }
    } catch (e) {
      console.error('Location error:', e);
      setLocationError(t('locationRequiredMsg'));
      Alert.alert(t('errorTitle'), t('locationErrorMsg'));
    } finally {
      setLocLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    let isDisabled = checkoutDisabled;
    let resolvedMsg = checkoutDisabledMessage;

    // Realtime check before placing order
    try {
      const savedStore = await AsyncStorage.getItem('active_store');
      const storeId = savedStore ? JSON.parse(savedStore)._id : undefined;
      const freshRes = await getSettings(storeId ? { store: storeId } : undefined);
      let freshData = freshRes?.data;
      let globalData: any = null;
      try {
        const globalRes = await getSettings();
        globalData = globalRes?.data;
      } catch (e) {}

      const isGloballyDisabled = Boolean(globalData?.checkoutDisabled);
      if (freshData?.checkoutDisabled || isGloballyDisabled) {
        isDisabled = true;
        const storeBannerMsg =
          freshData?.banners?.find((b: any) => b.isCheckoutNotice)?.message?.trim() ||
          freshData?.banners?.find((b: any) => b.isCheckoutNotice)?.subtitle?.trim();

        const globalBannerMsg =
          globalData?.banners?.find((b: any) => b.isCheckoutNotice)?.message?.trim() ||
          globalData?.banners?.find((b: any) => b.isCheckoutNotice)?.subtitle?.trim();

        const storeCustomMsg =
          freshData?.checkoutDisabledMessage &&
          freshData.checkoutDisabledMessage !== 'We are currently not accepting new orders. Please check back shortly!'
            ? freshData.checkoutDisabledMessage.trim()
            : '';

        const globalCustomMsg =
          globalData?.checkoutDisabledMessage &&
          globalData.checkoutDisabledMessage !== 'We are currently not accepting new orders. Please check back shortly!'
            ? globalData.checkoutDisabledMessage.trim()
            : '';

        resolvedMsg =
          storeBannerMsg ||
          globalBannerMsg ||
          storeCustomMsg ||
          globalCustomMsg ||
          freshData?.checkoutDisabledMessage?.trim() ||
          globalData?.checkoutDisabledMessage?.trim() ||
          resolvedMsg;

        setCheckoutDisabled(true);
        setCheckoutDisabledMessage(resolvedMsg);
      }
    } catch (e) {}

    if (isDisabled) {
      setShowDisabledModal(true);
      return;
    }
    if (items.length === 0) {
      Alert.alert(t('errorTitle'), t('cartEmptyMsg'));
      return;
    }
    if (!isConnected) {
      Alert.alert(t('errorTitle'), t('cartUnavailableMsg'));
      return;
    }
    if (!mobile || mobile.length < 10) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, mobileSectionY.current - 15), animated: true });
      Alert.alert(t('errorTitle'), t('invalidMobileMsg'));
      return;
    }
    if (confirmMobile !== mobile) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, confirmMobileSectionY.current - 15), animated: true });
      Alert.alert(t('errorTitle'), t('mobileMismatchMsg') || 'Contact numbers do not match. Please confirm your number.');
      return;
    }
    if (!location) {
      setLocationError(t('locationRequiredMsg'));
      scrollViewRef.current?.scrollTo({ y: Math.max(0, locationSectionY.current - 15), animated: true });
      Alert.alert(t('errorTitle'), t('locationRequiredMsg'));
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
      const savedStore = await AsyncStorage.getItem('active_store');
      let storeId = '';
      if (savedStore) {
        try {
          storeId = JSON.parse(savedStore)._id;
        } catch (e) {
          console.error(e);
        }
      }

      const res = await placeOrder({
        mobile,
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        address: address.trim(),
        store: storeId || undefined,
        paymentMethod: 'Pay on Delivery (Cash/UPI)',
        items: items.map((i) => ({
          productId: i._id,
          name: typeof i.name === 'object' ? `${i.name.en} (${i.name.mr})` : i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
          category: i.category,
        })),
        subtotal,
        gstAmount: currentGstAmount,
        deliveryFee: currentDeliveryFee,
        handlingFee: currentHandlingFee,
        totalAmount: grandTotal,
      });
      setLatestOrder(res.data);
      // Save order locally to device orders list (max 50 orders)
      try {
        const savedOrdersStr = await AsyncStorage.getItem('@device_orders');
        const existingOrders = savedOrdersStr ? JSON.parse(savedOrdersStr) : [];
        if (!existingOrders.some((o: any) => o._id === res.data._id)) {
          const updatedOrders = [res.data, ...existingOrders].slice(0, 50);
          await AsyncStorage.setItem('@device_orders', JSON.stringify(updatedOrders));
        }
      } catch (err) {
        console.error('Failed to save order locally:', err);
      }
      clearCart();
      navigation.replace('Success', { orderId: res.data._id });
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      if (serverMsg && typeof serverMsg === 'string') {
        setCheckoutDisabled(true);
        setCheckoutDisabledMessage(serverMsg);
        setShowDisabledModal(true);
        return;
      }
      const message = !isConnected ? t('cartUnavailableMsg') : t('orderFailedMsg');
      Alert.alert(t('errorTitle'), message);
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
  const hasAnyDetail = Boolean(address.trim() || mobile.trim() || confirmMobile.trim() || location);

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >

        {checkoutDisabled && (
          <TouchableOpacity
            style={styles.disabledBanner}
            onPress={() => setShowDisabledModal(true)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
              <Ionicons name="pause-circle" size={20} color="#ef4444" />
              <Text style={styles.disabledBannerText} numberOfLines={2}>
                {checkoutDisabledMessage?.trim() || (language === 'mr' ? 'ऑनलाइन ऑर्डर्स तात्पुरते बंद आहेत. तपशील पाहण्यासाठी स्पर्श करा.' : language === 'hi' ? 'ऑनलाइन ऑर्डर अस्थायी रूप से बंद हैं। विवरण देखने के लिए टैप करें।' : 'Online orders are temporarily paused. Tap to view details.')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ef4444" />
          </TouchableOpacity>
        )}

        {hasAnyDetail && (
          <TouchableOpacity
            style={styles.topClearBtn}
            onPress={handleNewAddress}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={15} color="#a855f7" />
            <Text style={styles.topClearBtnText}>
              {language === 'mr' ? 'नवीन पत्त्यासाठी सर्व माहिती साफ करा' : language === 'hi' ? 'नए पते के लिए सभी विवरण साफ़ करें' : 'Clear All Details For New Address'}
            </Text>
          </TouchableOpacity>
        )}

        {!isConnected && (
          <View style={styles.noticeBox}>
            <Ionicons name="cloud-offline-outline" size={16} color="#dc2626" />
            <Text style={styles.noticeText}>{t('cartUnavailableMsg')}</Text>
          </View>
        )}

      {/* Mobile Number */}
      <View style={styles.section} onLayout={(e) => { mobileSectionY.current = e.nativeEvent.layout.y; }}>
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
          onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, ''))}
        />
        {mobile.length === 10 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
            <Text style={styles.successText}>{t('mobileSuccess')}</Text>
          </View>
        )}
      </View>

      {/* Confirm Contact Number */}
      <View style={styles.section} onLayout={(e) => { confirmMobileSectionY.current = e.nativeEvent.layout.y; }}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>{t('confirmContactNumber') || 'Confirm Contact Number'}</Text>
        </View>
        <TextInput
          style={[
            styles.input,
            confirmMobile.length === 10 && confirmMobile === mobile && styles.inputSuccess,
            confirmMobile.length === 10 && confirmMobile !== mobile && styles.inputError,
          ]}
          placeholder={t('reenterMobile') || 'Re-enter your mobile number'}
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          maxLength={10}
          value={confirmMobile}
          onChangeText={(text) => setConfirmMobile(text.replace(/[^0-9]/g, ''))}
        />
        {confirmMobile.length === 10 && confirmMobile === mobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={styles.successText}>{t('numbersMatch') || 'Numbers match ✓'}</Text>
          </View>
        )}
        {confirmMobile.length > 0 && confirmMobile.length === 10 && confirmMobile !== mobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Ionicons name="close-circle" size={14} color="#ef4444" />
            <Text style={styles.errorText}>{t('mobileMismatch') || 'Numbers do not match'}</Text>
          </View>
        )}
      </View>

      {/* Address Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>
            {language === 'mr' ? 'डिलिव्हरी पत्ता' : language === 'hi' ? 'डिलीवरी का पता' : 'Delivery Address'}
          </Text>
        </View>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          placeholder={language === 'mr' ? 'पूर्ण पत्ता टाका (पर्यायी)' : language === 'hi' ? 'पूरा पता दर्ज करें (वैकल्पिक)' : 'Enter complete address (optional)'}
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          value={address}
          onChangeText={setAddress}
        />
        {address.trim().length >= 5 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearSaved}>
            <Ionicons name="trash-outline" size={13} color="#94a3b8" />
            <Text style={styles.clearBtnText}>{t('clearSavedInfo') || 'Clear saved info'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Location */}
      <View style={styles.section} onLayout={(e) => { locationSectionY.current = e.nativeEvent.layout.y; }}>
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
          <TouchableOpacity style={[styles.locationBtn, locationError ? styles.locationBtnError : null]} onPress={handleGetLocation} disabled={locLoading}>
            {locLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <PremiumLoader size="xsmall" fullScreen={false} />
                <Text style={styles.locationBtnText}>{t('gettingLocation') || 'Getting location...'}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location-outline" size={16} color="#a855f7" />
                <Text style={styles.locationBtnText}>{t('allowLocation')}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={18} color="#a855f7" />
          <Text style={styles.sectionTitle}>{t('paymentMethod')}</Text>
        </View>

        <View style={styles.codCard}>
          <View style={styles.codHeader}>
            <View style={styles.codBadgeIcon}>
              <Ionicons name="wallet-outline" size={22} color="#a855f7" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.codTitle}>{t('cashOnDelivery')}</Text>
                <View style={styles.codBadge}>
                  <Text style={styles.codBadgeText}>{t('recommended') || 'RECOMMENDED'}</Text>
                </View>
              </View>
              <Text style={styles.codSub}>{t('codDescription')}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          </View>

          {/* Payment Modes Available at Delivery */}
          <View style={styles.upiBadgesRow}>
            <View style={[styles.upiTag, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
              <Ionicons name="cash-outline" size={13} color="#059669" />
              <Text style={[styles.upiTagText, { color: '#047857' }]}>{language === 'mr' ? 'Cash' : language === 'hi' ? 'Cash' : 'Cash'}</Text>
            </View>
            <View style={[styles.upiTag, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
              <Ionicons name="qr-code-outline" size={13} color="#0284c7" />
              <Text style={[styles.upiTagText, { color: '#0369a1' }]}>GPay</Text>
            </View>
            <View style={[styles.upiTag, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
              <Ionicons name="phone-portrait-outline" size={13} color="#7c3aed" />
              <Text style={[styles.upiTagText, { color: '#6d28d9' }]}>PhonePe</Text>
            </View>

          </View>

          {/* Prominent Important Note Highlight */}

        </View>
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
          <Text style={styles.chargeLabel}>{t('subtotal') || 'Subtotal'}</Text>
          <Text style={styles.chargeValue}>₹{totalAmount}</Text>
        </View>

        {fees.gstEnabled && (
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>{t('taxesGst') || 'GST'} ({fees.gstPercentage}%)</Text>
            <Text style={styles.chargeValue}>+ ₹{currentGstAmount.toFixed(2)}</Text>
          </View>
        )}

        {fees.deliveryFeeEnabled && (
          <>
            <View style={styles.chargeRow}>
              <Text style={styles.chargeLabel}>{t('deliveryFee') || 'Delivery Fee'}</Text>
              {isFreeDelivery ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.chargeValue, { textDecorationLine: 'line-through', color: '#94a3b8', fontSize: 13 }]}>
                    ₹{fees.deliveryFee}
                  </Text>
                  <Text style={[styles.chargeValue, { color: '#22c55e', fontWeight: '700' }]}>
                    {t('free') || 'Free'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.chargeValue}>+ ₹{fees.deliveryFee}</Text>
              )}
            </View>

            {fees.freeDeliveryThresholdEnabled && !isFreeDelivery && (
              <View style={{ marginTop: 2, marginBottom: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#a855f7' }}>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                  {language === 'mr' ? (
                    <>मोफत डिलिव्हरीसाठी आणखी <Text style={{ fontWeight: '700', color: '#a855f7' }}>₹{(fees.freeDeliveryThreshold - subtotal).toFixed(0)}</Text> ची खरेदी करा!</>
                  ) : language === 'hi' ? (
                    <>मुफ़्त डिलीवरी के लिए और <Text style={{ fontWeight: '700', color: '#a855f7' }}>₹{(fees.freeDeliveryThreshold - subtotal).toFixed(0)}</Text> की खरीदारी करें!</>
                  ) : (
                    <>Shop for <Text style={{ fontWeight: '700', color: '#a855f7' }}>₹{(fees.freeDeliveryThreshold - subtotal).toFixed(0)}</Text> more to get Free Delivery!</>
                  )}
                </Text>
              </View>
            )}

            {fees.freeDeliveryThresholdEnabled && isFreeDelivery && (
              <View style={{ marginTop: 2, marginBottom: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#22c55e' }}>
                <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600' }}>
                  {language === 'mr' ? '🎉 मोफत डिलिव्हरी मर्यादा पूर्ण झाली!' : language === 'hi' ? '🎉 मुफ़्त डिलीवरी सीमा पूरी हो गई!' : '🎉 Free Delivery Threshold Met!'}
                </Text>
              </View>
            )}
          </>
        )}

        {fees.handlingFeeEnabled && (
          <View style={styles.chargeRow}>
            <Text style={styles.chargeLabel}>{t('handlingFee') || 'Handling Charges'}</Text>
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

      </ScrollView>

      {/* Sticky Bottom Footer Bar */}
      <View style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.stickyTotalWrap}>
          <Text style={styles.stickyTotalLabel}>{t('total') || 'Total'}</Text>
          <Text style={styles.stickyTotalValue}>₹{grandTotal.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.stickyPlaceBtn,
            !isReady && !checkoutDisabled && styles.stickyPlaceBtnDisabled
          ]}
          onPress={handlePlaceOrder}
          disabled={placing}
          activeOpacity={0.85}
        >
          {placing ? (
            <View style={styles.stickyPlaceBtnContent}>
              <PremiumLoader size="xsmall" fullScreen={false} />
              <Text style={styles.stickyPlaceBtnText} numberOfLines={1}>{t('placeOrder')}</Text>
            </View>
          ) : (
            <View style={styles.stickyPlaceBtnContent}>
              <Ionicons name="paper-plane-outline" size={18} color="#ffffff" />
              <Text style={styles.stickyPlaceBtnText} numberOfLines={1}>
                {t('placeOrder')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Checkout Disabled Popup Modal */}
      <CheckoutDisabledModal
        visible={showDisabledModal}
        onClose={() => setShowDisabledModal(false)}
        message={checkoutDisabledMessage}
      />
    </View>
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
  locationBtnError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
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
  placeBtnLoadingContent: { gap: 6, marginTop: 0 },
  placeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center', flexShrink: 1, flexWrap: 'wrap' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-end' },
  clearBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  topClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  topClearBtnText: {
    fontSize: 14,
    color: '#a855f7',
    fontWeight: '700',
  },
  codCard: {
    backgroundColor: '#faf5ff',
    borderWidth: 1.5,
    borderColor: '#c084fc',
    borderRadius: 14,
    padding: 14,
  },
  codHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codBadgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  codBadge: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codBadgeText: {
    color: '#15803d',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  importantNoticeBox: {
    marginTop: 12,
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  importantNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: '#4c1d95',
    lineHeight: 18,
    fontWeight: '500',
  },
  upiBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  upiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upiTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stickyBottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  stickyTotalWrap: {
    justifyContent: 'center',
  },
  stickyTotalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stickyTotalValue: {
    fontSize: 20,
    color: '#a855f7',
    fontWeight: '900',
  },
  stickyPlaceBtn: {
    flex: 1,
    maxWidth: 220,
    backgroundColor: '#a855f7',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stickyPlaceBtnPaused: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
  },
  stickyPlaceBtnDisabled: {
    backgroundColor: '#d8b4fe',
    shadowOpacity: 0,
  },
  disabledBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledBannerText: {
    fontSize: 12.5,
    color: '#dc2626',
    fontWeight: '600',
    lineHeight: 17,
  },
  stickyPlaceBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stickyPlaceBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
