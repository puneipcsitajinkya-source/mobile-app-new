import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../hooks/useLanguage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Status configuration ───────────────────────────────────────────────────
type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'closed'
  | 'cancelled';

interface StatusConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  headline: string;
  subtext: string;
  animate: 'spin' | 'pulse' | 'bounce' | 'shake' | 'float';
}

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: {
    icon: 'time-outline',
    color: '#9333ea',
    bgColor: '#faf5ff',
    borderColor: '#e9d5ff',
    label: 'Pending',
    headline: '🕐 Order Received!',
    subtext: 'We got your order and are reviewing it right now…',
    animate: 'pulse',
  },
  confirmed: {
    icon: 'bag-check-outline',
    color: '#a855f7',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    label: 'Confirmed',
    headline: '✅ Order Confirmed!',
    subtext: 'Your order has been confirmed and is being processed…',
    animate: 'bounce',
  },
  out_for_delivery: {
    icon: 'bicycle-outline',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    borderColor: '#c4b5fd',
    label: 'Out for Delivery',
    headline: '🚴 On the Way!',
    subtext: 'Your delivery partner is heading to your doorstep…',
    animate: 'float',
  },
  delivered: {
    icon: 'checkmark-circle-outline',
    color: '#6d28d9',
    bgColor: '#f3f0ff',
    borderColor: '#c4b5fd',
    label: 'Delivered',
    headline: '🎉 Delivered Successfully!',
    subtext: 'Enjoy your order! Thank you for shopping with us.',
    animate: 'pulse',
  },
  closed: {
    icon: 'checkmark-done-circle-outline',
    color: '#7e22ce',
    bgColor: '#faf5ff',
    borderColor: '#e9d5ff',
    label: 'Closed',
    headline: '✅ Order Closed',
    subtext: 'This order has been completed and closed.',
    animate: 'pulse',
  },
  cancelled: {
    icon: 'close-circle-outline',
    color: '#6b21a8',
    bgColor: '#f3e8ff',
    borderColor: '#d8b4fe',
    label: 'Cancelled',
    headline: '❌ Order Cancelled',
    subtext: 'This order was cancelled. We hope to serve you again!',
    animate: 'shake',
  },
};

// Ordered statuses for progress stepper
const PROGRESS_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'out_for_delivery',
  'delivered',
];

const STATUS_TEXTS: Record<string, Record<OrderStatus, { label: string; headline: string; subtext: string }>> = {
  en: {
    pending: {
      label: 'Pending',
      headline: '🕐 Order Received!',
      subtext: 'We got your order and are reviewing it right now…',
    },
    confirmed: {
      label: 'Confirmed',
      headline: '✅ Order Confirmed!',
      subtext: 'Your order has been confirmed and is being processed…',
    },
    out_for_delivery: {
      label: 'Out for Delivery',
      headline: '🚴 On the Way!',
      subtext: 'Your delivery partner is heading to your doorstep…',
    },
    delivered: {
      label: 'Delivered',
      headline: '🎉 Delivered Successfully!',
      subtext: 'Enjoy your order! Thank you for shopping with us.',
    },
    closed: {
      label: 'Closed',
      headline: '✅ Order Closed',
      subtext: 'This order has been completed and closed.',
    },
    cancelled: {
      label: 'Cancelled',
      headline: '❌ Order Cancelled',
      subtext: 'This order was cancelled. We hope to serve you again!',
    },
  },
  mr: {
    pending: {
      label: 'प्रलंबित',
      headline: '🕐 ऑर्डर प्राप्त झाली!',
      subtext: 'आम्हाला तुमची ऑर्डर मिळाली असून आम्ही तिची तपासणी करत आहोत…',
    },
    confirmed: {
      label: 'निश्चित झाली',
      headline: '✅ ऑर्डर कन्फर्म झाली!',
      subtext: 'तुमची ऑर्डर निश्चित झाली असून ती तयार केली जात आहे…',
    },
    out_for_delivery: {
      label: 'मार्गावर',
      headline: '🚴 डिलिव्हरी मार्गावर!',
      subtext: 'आमचा डिलिव्हरी पार्टनर तुमच्या पत्त्यावर पोहोचत आहे…',
    },
    delivered: {
      label: 'वितरित',
      headline: '🎉 ऑर्डर यशस्वीरीत्या मिळाली!',
      subtext: 'ऑर्डरचा आनंद घ्या! फर्स्टमार्टवरून खरेदी केल्याबद्दल धन्यवाद.',
    },
    closed: {
      label: 'पूर्ण झाली',
      headline: '✅ ऑर्डर पूर्ण झाली',
      subtext: 'ही ऑर्डर पूर्ण झाली असून बंद करण्यात आली आहे.',
    },
    cancelled: {
      label: 'रद्द झाली',
      headline: '❌ ऑर्डर रद्द केली',
      subtext: 'ही ऑर्डर रद्द झाली आहे. पुन्हा सेवा देण्याची संधी मिळावी!',
    },
  },
  hi: {
    pending: {
      label: 'लंबित',
      headline: '🕐 ऑर्डर प्राप्त हुआ!',
      subtext: 'हमें आपका ऑर्डर मिल गया है और हम इसकी समीक्षा कर रहे हैं…',
    },
    confirmed: {
      label: 'पुष्ट हुआ',
      headline: '✅ ऑर्डर कन्फर्म हुआ!',
      subtext: 'आपका ऑर्डर कन्फर्म हो गया है और तैयार किया जा रहा है…',
    },
    out_for_delivery: {
      label: 'रास्ते में',
      headline: '🚴 डिलीवरी रास्ते में!',
      subtext: 'हमारा डिलीवरी पार्टनर आपके पते की ओर निकल चुका है…',
    },
    delivered: {
      label: 'वितरित',
      headline: '🎉 सफलतापूर्वक डिलीवर हुआ!',
      subtext: 'अपने ऑर्डर का आनंद लें! हमारे साथ खरीदारी के लिए धन्यवाद।',
    },
    closed: {
      label: 'बंद हुआ',
      headline: '✅ ऑर्डर पूर्ण हुआ',
      subtext: 'यह ऑर्डर पूरा हो गया है और बंद कर दिया गया है।',
    },
    cancelled: {
      label: 'रद्द हुआ',
      headline: '❌ ऑर्डर रद्द हुआ',
      subtext: 'यह ऑर्डर रद्द कर दिया गया था। हम फिर से आपकी सेवा की आशा करते हैं!',
    },
  },
};

// ─── Step Dot ────────────────────────────────────────────────────────────────
function StepDot({
  status,
  isActive,
  isCompleted,
  isPulsing,
}: {
  status: OrderStatus;
  isActive: boolean;
  isCompleted: boolean;
  isPulsing: boolean;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(isCompleted ? 1 : 0.7)).current;
  const cfg = STATUS_CONFIG[status];

  useEffect(() => {
    if (isPulsing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    if (isCompleted || isActive) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }).start();
    }
  }, [isPulsing, isCompleted, isActive]);

  const dotColor = isCompleted || isActive ? cfg.color : '#cbd5e1';

  return (
    <Animated.View
      style={[
        styles.stepDotWrapper,
        isPulsing && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Animated.View
        style={[
          styles.stepDot,
          {
            backgroundColor: dotColor,
            borderColor: isCompleted || isActive ? cfg.color : '#e2e8f0',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isCompleted && (
          <Ionicons name="checkmark" size={10} color="#fff" />
        )}
        {isActive && !isCompleted && (
          <View style={[styles.stepDotInner, { backgroundColor: '#fff' }]} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Active Connector Line ────────────────────────────────────────────────────
function ActiveConnector({
  isCompleted,
  isActive,
  color,
}: {
  isCompleted: boolean;
  isActive: boolean;
  color: string;
}) {
  // useNativeDriver: false required — we animate 'width' which is not native-supported
  const flowAnim = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;

  useEffect(() => {
    if (isActive) {
      // Loop: sweep 0% → 100%, reset, repeat — gives liquid-flow look
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(flowAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      flowAnim.stopAnimation();
      flowAnim.setValue(isCompleted ? 1 : 0);
    }
  }, [isActive, isCompleted]);

  // Completed: plain static view (no Animated needed)
  if (isCompleted) {
    return <View style={[styles.stepConnector, { backgroundColor: color }]} />;
  }

  // Active: animated width fill — NO absoluteFill, just height:'100%' from left
  if (isActive) {
    const fillWidth = flowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
    return (
      <View style={styles.stepConnector}>
        <Animated.View
          style={{
            height: '100%',
            width: fillWidth,       // useNativeDriver: false handles this
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
    );
  }

  // Future: grey track
  return <View style={styles.stepConnector} />;
}

// ─── Progress Bar with shimmer wave ─────────────────────────────────────────
function AnimatedProgressBar({
  progress,
  color,
  isFinished,
}: {
  progress: number;
  color: string;
  isFinished?: boolean;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const [trackWidth, setTrackWidth] = React.useState(0);

  useEffect(() => {
    // useNativeDriver: false throughout — 'width' is not native-supported
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (!isFinished) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 2,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: false,   // translateX on same node as width → must be false
        })
      ).start();
    } else {
      shimmerAnim.stopAnimation();
      shimmerAnim.setValue(-1);
    }
  }, [progress, isFinished]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-60, trackWidth + 60],
  });

  return (
    <View
      style={styles.progressTrack}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[styles.progressFill, { width: barWidth, backgroundColor: color }]}
      >
        {/* Shimmer streak sweeping left → right */}
        <Animated.View
          style={[
            styles.shimmerStreak,
            { transform: [{ translateX: shimmerTranslate }] },
          ]}
        />
      </Animated.View>
    </View>
  );
}


// ─── Main Component ──────────────────────────────────────────────────────────
interface OrderStatusLoaderProps {
  status: OrderStatus;
}

export default function OrderStatusLoader({ status }: OrderStatusLoaderProps) {
  const { language } = useLanguage();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const langTexts = STATUS_TEXTS[language] || STATUS_TEXTS.en;
  const currentText = langTexts[status] || langTexts.pending;

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const iconAnim = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const isFinished = status === 'delivered' || status === 'closed' || status === 'cancelled';

    // Glow pulse
    if (!isFinished) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0.15);
    }

    // Per-status icon animation
    if (!isFinished) {
      switch (cfg.animate) {
        case 'spin':
          Animated.loop(
            Animated.timing(iconRotate, {
              toValue: 1,
              duration: 2000,
              easing: Easing.linear,
              useNativeDriver: true,
            })
          ).start();
          break;
        case 'bounce':
          Animated.loop(
            Animated.sequence([
              Animated.timing(iconAnim, {
                toValue: 1.25,
                duration: 380,
                easing: Easing.out(Easing.back(3)),
                useNativeDriver: true,
              }),
              Animated.timing(iconAnim, {
                toValue: 1,
                duration: 380,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.delay(400),
            ])
          ).start();
          break;
        case 'float':
          Animated.loop(
            Animated.sequence([
              Animated.timing(iconAnim, {
                toValue: 1.12,
                duration: 700,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(iconAnim, {
                toValue: 0.94,
                duration: 700,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ).start();
          break;
        case 'pulse':
          Animated.loop(
            Animated.sequence([
              Animated.timing(iconAnim, {
                toValue: 1.18,
                duration: 700,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(iconAnim, {
                toValue: 1,
                duration: 700,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ])
          ).start();
          break;
        case 'shake':
          Animated.loop(
            Animated.sequence([
              Animated.timing(iconRotate, {
                toValue: 0.05,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.timing(iconRotate, {
                toValue: -0.05,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.timing(iconRotate, {
                toValue: 0,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.delay(1200),
            ])
          ).start();
          break;
      }
    } else {
      iconAnim.stopAnimation();
      iconAnim.setValue(1);
      iconRotate.stopAnimation();
      iconRotate.setValue(0);
    }
  }, [status]);

  const rotateSpin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const shakeRot = iconRotate.interpolate({
    inputRange: [-0.05, 0, 0.05],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const iconTransform =
    cfg.animate === 'spin'
      ? [{ rotate: rotateSpin }, { scale: iconAnim }]
      : cfg.animate === 'shake'
      ? [{ rotate: shakeRot }]
      : [{ scale: iconAnim }];

  // Progress calculation
  const stepIndex = PROGRESS_STEPS.indexOf(status);
  const progressRatio =
    stepIndex >= 0 ? stepIndex / (PROGRESS_STEPS.length - 1) : 0;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: cfg.bgColor,
          borderColor: cfg.borderColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Glow halo */}
      <Animated.View
        style={[
          styles.glowHalo,
          { backgroundColor: cfg.color, opacity: glowAnim },
        ]}
      />

      {/* Icon circle */}
      <View
        style={[
          styles.iconCircle,
          { borderColor: cfg.borderColor, backgroundColor: cfg.bgColor },
        ]}
      >
        <Animated.View style={{ transform: iconTransform }}>
          <Ionicons name={cfg.icon} size={38} color={cfg.color} />
        </Animated.View>
      </View>

      {/* Headline + subtext */}
      <Text style={styles.headline}>{currentText.headline}</Text>
      <Text style={styles.subtext}>{currentText.subtext}</Text>

      {/* Progress stepper (only for non-cancelled/closed) */}
      {status !== 'cancelled' && status !== 'closed' && (
        <View style={styles.stepperWrapper}>
          <View style={styles.stepperRow}>
            {PROGRESS_STEPS.map((s, idx) => {
              const currentIdx = PROGRESS_STEPS.indexOf(status);
              const isDelivered = status === 'delivered';
              const isCompleted = idx < currentIdx || (isDelivered && idx === currentIdx);
              const isActive = idx === currentIdx;
              const isPulsing = isActive && !isDelivered;

              return (
                <React.Fragment key={s}>
                  <View style={styles.stepColumn}>
                    <StepDot
                      status={s}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      isPulsing={isPulsing}
                    />
                    <Text
                      style={[
                        styles.stepLabel,
                        (isActive || isCompleted) && {
                          color: STATUS_CONFIG[s].color,
                          fontWeight: '700',
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {(langTexts[s] || STATUS_CONFIG[s]).label}
                    </Text>
                  </View>
                  {idx < PROGRESS_STEPS.length - 1 && (
                    <ActiveConnector
                      isCompleted={idx < currentIdx || isDelivered}
                      isActive={idx === currentIdx && !isDelivered}
                      color={cfg.color}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Animated progress fill bar */}
          <AnimatedProgressBar progress={progressRatio} color={cfg.color} isFinished={status === 'delivered'} />
        </View>
      )}

      {/* Status pill */}
      <View style={[styles.statusPill, { backgroundColor: cfg.color }]}>
        <Ionicons
          name={cfg.icon}
          size={11}
          color="#fff"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.statusPillText}>{cfg.label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    marginVertical: 12,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  glowHalo: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headline: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  stepperWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepColumn: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 80) / 4 - 8,
  },
  stepDotWrapper: {
    marginBottom: 6,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepConnector: {
    flex: 1,
    height: 4,
    backgroundColor: '#ede9fe',
    marginTop: 11,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  stepLabel: {
    fontSize: 9.5,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 13,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerStreak: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 10,
    transform: [{ skewX: '-15deg' }],
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
