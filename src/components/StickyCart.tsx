import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StickyCartProps = {
  totalItems: number;
  cartTotal: number | string;
  onPress: () => void;
  tintColor?: string;
};

export default function StickyCart({
  totalItems,
  cartTotal,
  onPress,
  tintColor = '#7c3aed',
}: StickyCartProps) {
  if (totalItems <= 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.button, { borderColor: `${tintColor}22` }]}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <View style={styles.info}>
          <View style={[styles.iconWrap, { backgroundColor: tintColor }]}> 
            <Ionicons name="cart-outline" size={13} color="#ffffff" />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalItems}</Text>
            </View>
          </View>
          <View style={styles.summary}>
            <Text style={[styles.label, { color: tintColor }]}>Cart</Text>
            <Text style={styles.totalText}>₹{cartTotal}</Text>
          </View>
        </View>

        <View style={[styles.action, { backgroundColor: `${tintColor}12` }]}> 
          <Text style={[styles.actionText, { color: tintColor }]}>Open</Text>
          <Ionicons name="chevron-forward" size={11} color={tintColor} />
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
    maxWidth: 300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  countText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  summary: {
    marginLeft: 8,
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '700',
    marginRight: 2,
  },
});
