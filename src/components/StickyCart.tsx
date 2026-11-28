import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

type StickyCartProps = {
  totalItems: number;
  cartTotal: number | string;
  onPress: () => void;
  tintColor?: string;
  bottom?: number;
};

export default function StickyCart({
  totalItems,
  cartTotal,
  onPress,
  tintColor = '#7c3aed',
  bottom,
}: StickyCartProps) {
  const { language, t } = useLanguage();
  if (totalItems <= 0) {
    return null;
  }

  return (
    <View style={[styles.wrapper, bottom !== undefined && { bottom }]}>
      <TouchableOpacity
        style={[styles.button, { borderColor: `${tintColor}22` }]}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <View style={styles.info}>
          <View style={[styles.iconWrap, { backgroundColor: tintColor }]}> 
            <Ionicons name="cart-outline" size={16} color="#ffffff" />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalItems}</Text>
            </View>
          </View>
          <View style={styles.summary}>
            <Text style={[styles.label, { color: tintColor }]}>{t('cart') || 'Cart'}</Text>
            <Text style={styles.totalText}>₹{cartTotal}</Text>
          </View>
        </View>

        <View style={[styles.action, { backgroundColor: `${tintColor}12` }]}> 
          <Text style={[styles.actionText, { color: tintColor }]}>
            {language === 'mr' ? 'उघडा' : language === 'hi' ? 'खोलें' : 'Open'}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={tintColor} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    left: 10,
    right: 10,
    zIndex: 100,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 330,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  countText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  summary: {
    marginLeft: 10,
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 3,
  },
});
