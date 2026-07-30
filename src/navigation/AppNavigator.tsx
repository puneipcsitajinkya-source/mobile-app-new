import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import SuccessScreen from '../screens/SuccessScreen';
import OrdersScreen from '../screens/OrdersScreen';
import CategoryProductsScreen from '../screens/CategoryProductsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import { useCart } from '../hooks/useCart';
import { useLanguage } from '../hooks/useLanguage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type RootStackParamList = {
  Main: undefined;
  ProductDetail: { productId: string };
  CategoryProducts: { categoryName: string };
  Checkout: undefined;
  Success: { orderId: string };
};

export type TabParamList = {
  Home: undefined;
  Cart: undefined;
  Orders: undefined;
  Feedback: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();

export type HomeStackParamList = {
  HomeMain: undefined;
  ProductDetail: { productId: string };
  CategoryProducts: { categoryName: string };
};

function HomeStackScreen() {
  return (
    <HomeStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f1f5f9' },
      }}
    >
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="CategoryProducts"
        component={CategoryProductsScreen}
        options={({ route }) => ({ title: route.params.categoryName, headerShown: true })}
      />
    </HomeStackNav.Navigator>
  );
}

function MainTabs() {
  const { totalItems } = useCart();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          paddingTop: 6,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 6),
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: '#4b5563',
        tabBarInactiveTintColor: '#4b5563',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          includeFontPadding: false,
        },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={22} color="#4b5563" />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={23} color="#4b5563" />
          ),
          tabBarBadge: totalItems > 0 ? totalItems : undefined,
          tabBarBadgeStyle: { backgroundColor: '#a855f7', color: '#ffffff', fontSize: 9, fontWeight: '800' },
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: t('ordersTitle') || 'My Orders',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color="#4b5563" />
          ),
        }}
      />
      <Tab.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          tabBarLabel: t('typeFeedback') || 'Feedback',
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'chatbox-ellipses' : 'chatbox-ellipses-outline'} size={22} color="#4b5563" />
          ),
        }}
      />

    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#0f172a',
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#0f172a' },
          headerShadowVisible: true,
          contentStyle: { backgroundColor: '#f1f5f9' },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
        <Stack.Screen name="Success" component={SuccessScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
