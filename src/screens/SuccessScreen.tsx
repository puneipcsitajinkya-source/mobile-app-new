import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Success'>;
  route: RouteProp<RootStackParamList, 'Success'>;
};

export default function SuccessScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);
  const { t } = useLanguage();

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 5 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.title}>{t('orderPlaced')}</Text>
        <Text style={styles.subtitle}>{t('orderPlacedSub')}</Text>

        <View style={styles.orderIdBox}>
          <Text style={styles.orderIdLabel}>{t('orderIdLabel')}</Text>
          <Text style={styles.orderId}>#{orderId.slice(-8).toUpperCase()}</Text>
        </View>

        <Text style={styles.info}>
          {t('thankYou')}
        </Text>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Main')}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="arrow-forward-outline" size={18} color="#ffffff" />
            <Text style={styles.homeBtnText}>{t('continueShopping')}</Text>
          </View>
        </TouchableOpacity>
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
});
