import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  icon?: string;
  size?: number;
  color?: string;
  active?: boolean;
  style?: any;
}

// Maps legacy/default emojis or category names to premium FontAwesome 6 icons
const EMOJI_TO_FONTAWESOME: Record<string, string> = {
  '🥦': 'basket-shopping',
  '🥬': 'carrot',
  '🍎': 'apple-whole',
  '🛒': 'cart-shopping',
  '🍞': 'bread-slice',
  '🥩': 'drumstick-bite',
  '🍿': 'cookie-bite',
  '🥤': 'wine-glass',
  '🍪': 'cookie',
  '🍫': 'cookie-bite',
  '🍩': 'cookie',
  '🍕': 'pizza-slice',
  '☕': 'mug-hot',
  '💄': 'spray-can-sparkles',
  '🧴': 'pump-soap',
  '✨': 'wand-magic-sparkles',
  '🧼': 'hand-sparkles',
  '🌸': 'spa',
  '🎧': 'headphones',
  '📱': 'mobile-screen-button',
  '💻': 'laptop',
  '🔌': 'plug',
  '🔋': 'battery-full',
  '🎁': 'gift',
  '🎀': 'ribbon',
  '🧸': 'gift',
  '💍': 'gem',
  '👕': 'shirt',
};

// Clean icon name (e.g. "fa:basket-shopping" -> "basket-shopping", "fa-solid fa-carrot" -> "carrot")
export function cleanIconName(rawIcon?: string): { type: 'fa' | 'ion' | 'mci' | 'emoji'; name: string } {
  if (!rawIcon) return { type: 'fa', name: 'basket-shopping' };
  const str = rawIcon.trim();

  // If it's a known emoji, map to FontAwesome
  if (EMOJI_TO_FONTAWESOME[str]) {
    return { type: 'fa', name: EMOJI_TO_FONTAWESOME[str] };
  }

  // If it starts with fa: or fa6:
  if (str.startsWith('fa:') || str.startsWith('fa6:')) {
    return { type: 'fa', name: str.replace(/^(fa:|fa6:)/, '').trim() };
  }
  if (str.startsWith('fa-solid fa-') || str.startsWith('fa-regular fa-') || str.startsWith('fas fa-')) {
    return { type: 'fa', name: str.replace(/^(fa-solid fa-|fa-regular fa-|fas fa-)/, '').trim() };
  }
  if (str.startsWith('ion:')) {
    return { type: 'ion', name: str.replace(/^ion:/, '').trim() };
  }
  if (str.startsWith('mci:')) {
    return { type: 'mci', name: str.replace(/^mci:/, '').trim() };
  }

  // If it contains letters/dashes and no spaces/emoji (typical icon name like "basket-shopping", "headphones")
  if (/^[a-zA-Z0-9\-_]+$/.test(str)) {
    return { type: 'fa', name: str };
  }

  // Otherwise treat as plain emoji/text
  return { type: 'emoji', name: str };
}

export default function PremiumTabIcon({ icon, size = 16, color, active = false, style }: Props) {
  const iconColor = color || (active ? '#a855f7' : '#94a3b8');
  const parsed = cleanIconName(icon);

  if (parsed.type === 'fa') {
    try {
      return (
        <FontAwesome6
          name={parsed.name as any}
          size={size}
          color={iconColor}
          style={[styles.icon, style]}
        />
      );
    } catch {
      return <FontAwesome6 name="basket-shopping" size={size} color={iconColor} style={[styles.icon, style]} />;
    }
  }

  if (parsed.type === 'ion') {
    return <Ionicons name={parsed.name as any} size={size} color={iconColor} style={[styles.icon, style]} />;
  }

  if (parsed.type === 'mci') {
    return <MaterialCommunityIcons name={parsed.name as any} size={size} color={iconColor} style={[styles.icon, style]} />;
  }

  return <Text style={[styles.emojiText, { fontSize: size + 2 }, style]}>{parsed.name}</Text>;
}

const styles = StyleSheet.create({
  icon: {
    marginRight: 6,
  },
  emojiText: {
    marginRight: 6,
  },
});
