import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'en' | 'mr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  tProduct: (name: { en: string; mr: string } | string | undefined) => string;
  tCategory: (catName: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    appTitle: 'FirstMart',
    appSub: '⭐ 4.8 (5k+ Ratings)',
    searchPlaceholder: 'Search products...',
    allCategory: 'All',
    addedToCart: 'Added',
    addBtn: 'Add',
    cartTitle: 'Your Cart',
    cartEmpty: 'Your Cart is Empty',
    browseProducts: 'Browse Products',
    each: 'each',
    totalAmount: 'Total Amount',
    proceedToCheckout: 'Proceed to Checkout →',
    mobileNumber: 'Mobile Number',
    mobilePlaceholder: 'Enter 10-digit mobile number',
    confirmMobilePlaceholder: 'Confirm mobile number',
    mobileMismatch: 'Numbers do not match',
    mobileSuccess: 'Mobile confirmed',
    deliveryLocation: 'Delivery Location',
    deliveryHint: 'Required to deliver your order to your doorstep',
    locationCaptured: 'Location captured!',
    allowLocation: 'Allow Location Access',
    orderSummary: 'Order Summary',
    total: 'Total',
    placeOrder: 'Place Order',
    orderPlaced: 'Order Placed!',
    orderPlacedSub: 'Your order is on its way 🛍️',
    orderIdLabel: 'Order ID',
    thankYou: "We've received your order and will confirm it shortly.\nThank you for shopping with FirstMart! 🙏",
    continueShopping: 'Continue Shopping',
    quantity: 'Quantity',
    totalAmountLabel: 'Total Amount',
    perKg: 'kg',
    perPc: 'item',
    addCartBtn: 'Add to Cart',
    addedCartBtn: 'Added to Cart!',
    productNotFound: 'Product not found',
    errorTitle: 'Error',
    permissionDenied: 'Permission denied',
    locationPermissionMsg: 'Location permission is required to place an order.',
    locationErrorMsg: 'Could not get location. Please try again.',
    invalidMobileMsg: 'Please enter a valid 10-digit mobile number.',
    mobileMismatchMsg: 'Mobile numbers do not match.',
    locationRequiredMsg: 'Please allow location access before placing your order.',
    orderFailedMsg: 'Failed to place order. Please try again.',
    ordersTitle: 'My Orders',
    ordersEmpty: 'No orders found',
    ordersEmptySub: 'Enter your number to retrieve your orders',
    enterMobile: 'Track Orders by Mobile',
    fetchOrdersBtn: 'View Orders',
    orderDate: 'Date',
    orderStatus: 'Status',
  },
  mr: {
    appTitle: 'फर्स्टमार्ट',
    appSub: '⭐ 4.8 (5k+ रेटिंग)',
    searchPlaceholder: 'उत्पादने शोधा...',
    allCategory: 'सर्व',
    addedToCart: 'जोडले',
    addBtn: 'जोडा',
    cartTitle: 'तुमची पिशवी',
    cartEmpty: 'तुमची पिशवी रिकामी आहे',
    browseProducts: 'उत्पादने पहा',
    each: 'प्रत्येक',
    totalAmount: 'एकूण रक्कम',
    proceedToCheckout: 'ऑर्डर करण्यासाठी पुढे जा →',
    mobileNumber: 'मोबाईल नंबर',
    mobilePlaceholder: '१०-अंकी मोबाईल नंबर टाका',
    confirmMobilePlaceholder: 'मोबाईल नंबरची खात्री करा',
    mobileMismatch: 'नंबर जुळत नाहीत',
    mobileSuccess: 'मोबाईल नंबर निश्चित झाला',
    deliveryLocation: 'डिलिव्हरी पत्ता',
    deliveryHint: 'तुमच्या दारापर्यंत पोहोचवण्यासाठी आवश्यक आहे',
    locationCaptured: 'पत्ता निश्चित झाला!',
    allowLocation: 'पत्ता निश्चित करण्यासाठी परवानगी द्या',
    orderSummary: 'ऑर्डर सारांश',
    total: 'एकूण',
    placeOrder: 'ऑर्डर द्या',
    orderPlaced: 'ऑर्डर यशस्वी झाली!',
    orderPlacedSub: 'तुमची ऑर्डर मार्गावर आहे 🛍️',
    orderIdLabel: 'ऑर्डर आयडी',
    thankYou: 'आम्हाला तुमची ऑर्डर मिळाली आहे आणि लवकरच ती पाठवू.\nफर्स्टमार्टवरून खरेदी केल्याबद्दल धन्यवाद! 🙏',
    continueShopping: 'खरेदी चालू ठेवा',
    quantity: 'प्रमाण',
    totalAmountLabel: 'एकूण रक्कम',
    perKg: 'किलो',
    perPc: 'नग',
    addCartBtn: 'पिशवीत टाका',
    addedCartBtn: 'पिशवीत जोडले!',
    productNotFound: 'उत्पादन सापडले नाही',
    errorTitle: 'त्रुटी',
    permissionDenied: 'परवानगी नाकारली',
    locationPermissionMsg: 'ऑर्डर देण्यासाठी पत्त्याची परवानगी आवश्यक आहे.',
    locationErrorMsg: 'पत्ता निश्चित करता आला नाही. कृपया पुन्हा प्रयत्न करा.',
    invalidMobileMsg: 'कृपया एक वैध १०-अंकी मोबाईल नंबर टाका.',
    mobileMismatchMsg: 'मोबाईल नंबर जुळत नाहीत.',
    locationRequiredMsg: 'कृपया ऑर्डर देण्यापूर्वी पत्ता निश्चित करा.',
    orderFailedMsg: 'ऑर्डर देण्यास अपयश आले. कृपया पुन्हा प्रयत्न करा.',
    ordersTitle: 'माझ्या ऑर्डर्स',
    ordersEmpty: 'कोणत्याही ऑर्डर्स आढळल्या नाहीत',
    ordersEmptySub: 'तुमच्या ऑर्डर्स शोधण्यासाठी नंबर टाका',
    enterMobile: 'मोबाईल नंबरद्वारे ट्रॅक करा',
    fetchOrdersBtn: 'ऑर्डर्स पहा',
    orderDate: 'तारीख',
    orderStatus: 'स्थिती',
  },
};

const categoryTranslations: Record<Language, Record<string, string>> = {
  en: {
    'Vegetables': 'Vegetables',
    'Fruits': 'Fruits',
    'Leafy Greens': 'Leafy Greens',
    'Roots & Tubers': 'Roots & Tubers',
    'Herbs': 'Herbs',
  },
  mr: {
    'Vegetables': 'भाज्या',
    'Fruits': 'फळे',
    'Leafy Greens': 'पालेभाज्या',
    'Roots & Tubers': 'कंदमुळे',
    'Herbs': 'औषधी वनस्पती',
  },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'mr' : 'en'));
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  const tProduct = useCallback(
    (name: { en: string; mr: string } | string | undefined): string => {
      if (!name) return '';
      if (typeof name === 'string') return name;
      return name[language] || name.en || name.mr || '';
    },
    [language]
  );

  const tCategory = useCallback(
    (catName: string): string => {
      if (!catName) return '';
      const translationsForLang = categoryTranslations[language];
      const matchKey = Object.keys(translationsForLang).find(
        (key) => key.toLowerCase() === catName.toLowerCase()
      );
      return matchKey ? translationsForLang[matchKey] : catName;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, toggleLanguage, t, tProduct, tCategory }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
