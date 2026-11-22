import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

interface CheckoutDisabledModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
  title?: string;
}

const { width } = Dimensions.get('window');

export default function CheckoutDisabledModal({
  visible,
  onClose,
  message,
  title,
}: CheckoutDisabledModalProps) {
  const { language } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 260,
          friction: 14,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const defaultTitle =
    language === 'mr'
      ? 'सध्या ऑर्डर स्वीकारणे तात्पुरते बंद आहे'
      : language === 'hi'
        ? 'फिलहाल ऑर्डर लेना अस्थायी रूप से बंद है'
        : 'We’re currently not accepting orders';

  const defaultMessage =
    language === 'mr'
      ? 'आम्ही सध्या नवीन ऑर्डर्स स्वीकारत नाही आहोत. कृपया थोड्या वेळाने पुन्हा तपासा!'
      : language === 'hi'
        ? 'हम वर्तमान में नए ऑर्डर स्वीकार नहीं कर रहे हैं। कृपया कुछ समय बाद पुनः प्रयास करें!'
        : 'We are currently not accepting new orders. Please check back shortly!';

  const buttonText =
    language === 'mr'
      ? 'बंद करा'
      : language === 'hi'
        ? 'बंद करें'
        : 'Close';

  const displayMessage = message?.trim() ? message.trim() : defaultMessage;
  const displayTitle = title?.trim() ? title.trim() : defaultTitle;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top-Right Close Button ('✕') */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Icon Circle */}
          <View style={styles.iconCircle}>
          </View>

          {/* Title */}
          <Text style={styles.title}>{displayTitle}</Text>

          {/* Custom Message Container */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{displayMessage}</Text>
          </View>

          {/* Bottom Action Close Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: Math.min(width - 48, 360),
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,

    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,


  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  messageBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
  },
  messageText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
  },
  actionBtn: {
    width: '100%',
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
