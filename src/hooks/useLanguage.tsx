import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSettings } from '../services/api';

export type Language = 'en' | 'mr' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  tProduct: (name: { en: string; mr: string } | string | undefined) => string;
  tCategory: (catName: string) => string;
  translating: boolean;
}

const translations: Record<'en' | 'mr', Record<string, string>> = {
  en: {
    appTitle: 'Blinkit',
    appSub: 'Delivery in 10 minutes',
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
    thankYou: "We've received your order and will confirm it shortly.\nThank you for shopping with FirstMartt! 🙏",
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
    locationRequiredMsg: 'Delivery field is required',
    orderFailedMsg: 'Failed to place order. Please try again.',
    cartUnavailableMsg: 'Sorry for the inconvenience. Service is temporarily unavailable.Ordering will resume Upcoming morning during our working hours.',
    cartEmptyMsg: 'Your cart is empty. Add items before checkout.',
    ordersTitle: 'My Orders',
    ordersEmpty: 'No orders found',
    ordersEmptySub: 'Enter your number to retrieve your orders',
    enterMobile: 'Track Orders by Mobile',
    fetchOrdersBtn: 'View Orders',
    orderDate: 'Date',
    orderStatus: 'Status',
  },
  mr: {
    appTitle: 'Blinkit',
    appSub: '१० मिनिटांत डिलिव्हरी',
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
    locationRequiredMsg: 'डिलिव्हरी फील्ड आवश्यक आहे',
    orderFailedMsg: 'ऑर्डर देण्यास अपयश आले. कृपया पुन्हा प्रयत्न करा.',
    cartUnavailableMsg: 'सेवा सध्या तात्पुरती उपलब्ध नाही. आम्ही लवकरच ऑर्डरिंग पुन्हा सुरू करण्यासाठी काम करत आहोत.',
    cartEmptyMsg: 'तुमची पिशवी रिकामी आहे. चेकआउट करण्यापूर्वी वस्तू जोडा.',
    ordersTitle: 'माझ्या ऑर्डर्स',
    ordersEmpty: 'कोणत्याही ऑर्डर्स आढळल्या नाहीत',
    ordersEmptySub: 'तुमच्या ऑर्डर्स शोधण्यासाठी नंबर टाका',
    enterMobile: 'मोबाईल नंबरद्वारे ट्रॅक करा',
    fetchOrdersBtn: 'ऑर्डर्स पहा',
    orderDate: 'तारीख',
    orderStatus: 'स्थिती',
  },
};

const categoryTranslations: Record<'en' | 'mr', Record<string, string>> = {
  en: {
    'Dairy & Breakfast': 'Dairy & Breakfast',
    'Snacks & Munchies': 'Snacks & Munchies',
    'Cold Drinks & Juices': 'Cold Drinks & Juices',
    'Sweet Tooth': 'Sweet Tooth',
    'Fruits & Vegetables': 'Fruits & Vegetables',
    'Instant & Frozen Food': 'Instant & Frozen Food',
    'Meat, Fish & Eggs': 'Meat, Fish & Eggs',
    'Bakery & Biscuits': 'Bakery & Biscuits',
    'Atta, Rice & Dal': 'Atta, Rice & Dal',
    'Masala, Oil & More': 'Masala, Oil & More',
  },
  mr: {
    'Dairy & Breakfast': 'डेअरी आणि नाश्ता',
    'Snacks & Munchies': 'स्नॅक्स',
    'Cold Drinks & Juices': 'थंड पेये',
    'Sweet Tooth': 'मिठाई',
    'Fruits & Vegetables': 'फळे आणि भाज्या',
    'Instant & Frozen Food': 'इन्स्टंट आणि फ्रोझन फूड',
    'Meat, Fish & Eggs': 'मांस, मासे आणि अंडी',
    'Bakery & Biscuits': 'बेकरी आणि बिस्किटे',
    'Atta, Rice & Dal': 'आटा, तांदूळ आणि डाळी',
    'Masala, Oil & More': 'मसाले आणि तेल',
  },
};

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || text.trim() === '') return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google translate status ${response.status}`);
    }
    const data = await response.json();
    if (data && data[0]) {
      const translated = data[0].map((part: any) => part[0]).join('');
      return translated;
    }
    return text;
  } catch (error) {
    console.error(`Translation error for "${text}":`, error);
    return text;
  }
}

async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  try {
    const combined = texts.join('\n\n');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(combined)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data && data[0]) {
      const translatedCombined = data[0].map((part: any) => part[0]).join('');
      const parts = translatedCombined.split(/\n\n+/).map((s: string) => s.trim());
      if (parts.length === texts.length) {
        return parts;
      }
      console.warn(`Length mismatch: got ${parts.length}, expected ${texts.length}. Splitting by single newline...`);
      const singleParts = translatedCombined.split('\n').filter((s: string) => s.trim() !== '').map((s: string) => s.trim());
      if (singleParts.length === texts.length) {
        return singleParts;
      }
    }
  } catch (e) {
    console.error('Batch translation failed, falling back to individual', e);
  }

  const results: string[] = [];
  for (const text of texts) {
    const res = await translateText(text, targetLang);
    results.push(res);
    await new Promise(r => setTimeout(r, 20));
  }
  return results;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [translating, setTranslating] = useState<boolean>(false);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<Language, Record<string, string>>>({
    en: {},
    mr: {},
    hi: {},
  });
  const dynamicTranslationsRef = useRef<Record<Language, Record<string, string>>>({
    en: {},
    mr: {},
    hi: {},
  });
  const pendingTranslationsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('veggie_app_language');
        const savedCache = await AsyncStorage.getItem('veggie_app_dynamic_translations_v2');
        
        let cacheObj: Record<Language, Record<string, string>> = { en: {}, mr: {}, hi: {} };
        if (savedCache) {
          cacheObj = JSON.parse(savedCache);
        }

        cacheObj.en = cacheObj.en || {};
        cacheObj.mr = cacheObj.mr || {};
        cacheObj.hi = cacheObj.hi || {};

        dynamicTranslationsRef.current = cacheObj;
        setDynamicTranslations(cacheObj);

        if (savedLang && (savedLang === 'en' || savedLang === 'mr' || savedLang === 'hi')) {
          // Saved preference — apply immediately, no network needed
          setLanguageState(savedLang as Language);
        } else {
          // No saved preference — default to English immediately (no flash)
          // then fetch backend default in background
          setLanguageState('en');
          getSettings()
            .then((settingsRes) => {
              const backendDefaultLang = settingsRes.data?.defaultLanguage;
              if (backendDefaultLang && (backendDefaultLang === 'en' || backendDefaultLang === 'mr' || backendDefaultLang === 'hi')) {
                if (backendDefaultLang !== 'en') {
                  const englishKeys = Object.keys(translations.en);
                  const existingCache = cacheObj[backendDefaultLang as Language] || {};
                  const translatedCount = englishKeys.filter(k => existingCache[k]).length;
                  const isTranslated = translatedCount >= englishKeys.length * 0.8;

                  if (!isTranslated) {
                    const englishTexts = englishKeys.map(k => translations.en[k]);
                    translateBatch(englishTexts, backendDefaultLang).then((translatedTexts) => {
                      const newCacheForLang: Record<string, string> = { ...existingCache };
                      englishKeys.forEach((key, index) => {
                        newCacheForLang[key] = translatedTexts[index] || translations.en[key];
                      });
                      const newCacheObj = { ...cacheObj, [backendDefaultLang]: newCacheForLang };
                      dynamicTranslationsRef.current = newCacheObj;
                      setDynamicTranslations(newCacheObj);
                      AsyncStorage.setItem('veggie_app_dynamic_translations_v2', JSON.stringify(newCacheObj)).catch(() => undefined);
                      setLanguageState(backendDefaultLang as Language);
                    }).catch(() => undefined);
                  } else {
                    setLanguageState(backendDefaultLang as Language);
                  }
                }
                AsyncStorage.setItem('veggie_app_language', backendDefaultLang).catch(() => undefined);
              }
            })
            .catch(() => undefined); // silently ignore if backend unreachable
        }
      } catch (err) {
        console.error('Failed to load language/cache from storage', err);
      }
    };
    init();
  }, []);


  const updateTranslationCache = useCallback((nextCache: Record<Language, Record<string, string>>) => {
    dynamicTranslationsRef.current = nextCache;
    setDynamicTranslations(nextCache);
  }, []);

  const setLanguage = useCallback(async (newLang: Language) => {
    if (newLang === 'en') {
      setLanguageState('en');
      await AsyncStorage.setItem('veggie_app_language', 'en');
      return;
    }

    const englishKeys = Object.keys(translations.en);
    const existingCache = dynamicTranslationsRef.current[newLang] || {};
    
    const translatedCount = englishKeys.filter(k => existingCache[k]).length;
    const isTranslated = translatedCount >= englishKeys.length * 0.8;

    if (isTranslated) {
      setLanguageState(newLang);
      await AsyncStorage.setItem('veggie_app_language', newLang);
      return;
    }

    setTranslating(true);
    try {
      const englishTexts = englishKeys.map(k => translations.en[k]);
      const translatedTexts = await translateBatch(englishTexts, newLang);
      
      const newCacheForLang: Record<string, string> = { ...existingCache };
      englishKeys.forEach((key, index) => {
        newCacheForLang[key] = translatedTexts[index] || translations.en[key];
      });

      const updatedCache = {
        ...dynamicTranslationsRef.current,
        [newLang]: newCacheForLang
      };
      
      updateTranslationCache(updatedCache);
      await AsyncStorage.setItem('veggie_app_dynamic_translations_v2', JSON.stringify(updatedCache));
      setLanguageState(newLang);
      await AsyncStorage.setItem('veggie_app_language', newLang);
    } catch (e) {
      console.error('Failed to translate app static keys', e);
      setLanguageState(newLang);
    } finally {
      setTranslating(false);
    }
  }, [dynamicTranslations]);

  const toggleLanguage = useCallback(() => {
    const nextLangMap: Record<Language, Language> = {
      en: 'hi',
      hi: 'mr',
      mr: 'en'
    };
    setLanguage(nextLangMap[language]);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string): string => {
      if (language === 'en') {
        return translations.en[key] || key;
      }

      const cached = dynamicTranslationsRef.current[language]?.[key];
      if (cached) {
        return cached;
      }

      if (language === 'mr' && translations.mr[key]) {
        return translations.mr[key];
      }

      return translations.en[key] || key;
    },
    [language]
  );

  const translateOnTheFly = useCallback(async (text: string, targetLang: Language) => {
    if (!text || targetLang === 'en') return;

    const cacheKey = `${targetLang}:${text}`;
    if (pendingTranslationsRef.current[cacheKey]) {
      return;
    }

    const cached = dynamicTranslationsRef.current[targetLang]?.[text];
    if (cached) {
      return;
    }

    pendingTranslationsRef.current[cacheKey] = true;

    try {
      const translated = await translateText(text, targetLang);
      if (translated && translated !== text) {
        const updated = {
          ...dynamicTranslationsRef.current,
          [targetLang]: {
            ...dynamicTranslationsRef.current[targetLang],
            [text]: translated
          }
        };
        updateTranslationCache(updated);
        AsyncStorage.setItem('veggie_app_dynamic_translations_v2', JSON.stringify(updated)).catch(console.error);
      }
    } catch (e) {
      console.error('On-the-fly translation failed', e);
    } finally {
      delete pendingTranslationsRef.current[cacheKey];
    }
  }, [updateTranslationCache]);

  const tProduct = useCallback(
    (name: { en: string; mr: string } | string | undefined): string => {
      if (!name) return '';
      
      // Safety: if name is not a string or known object shape, convert to string
      if (typeof name !== 'string' && typeof name !== 'object') {
        return String(name);
      }
      
      let englishText = '';
      let presetMarathiText = '';

      if (typeof name === 'string') {
        englishText = name;
      } else if (name !== null && typeof name === 'object') {
        englishText = (name as any).en || '';
        presetMarathiText = (name as any).mr || '';
      }

      if (language === 'en') {
        return englishText;
      }

      if (language === 'mr' && presetMarathiText) {
        return presetMarathiText;
      }

      const cached = dynamicTranslationsRef.current[language]?.[englishText];
      if (cached) {
        return cached;
      }

      translateOnTheFly(englishText, language);

      return language === 'mr' && presetMarathiText ? presetMarathiText : englishText;
    },
    [language, dynamicTranslations, translateOnTheFly]
  );

  const tCategory = useCallback(
    (catName: string): string => {
      if (!catName) return '';
      
      if (language === 'en') {
        return catName;
      }

      if (language === 'mr') {
        const translationsForLang = categoryTranslations.mr;
        const matchKey = Object.keys(translationsForLang).find(
          (key) => key.toLowerCase() === catName.toLowerCase()
        );
        if (matchKey) return translationsForLang[matchKey];
      }

      const cached = dynamicTranslationsRef.current[language]?.[catName];
      if (cached) {
        return cached;
      }

      translateOnTheFly(catName, language);

      return catName;
    },
    [language, dynamicTranslations, translateOnTheFly]
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, toggleLanguage, t, tProduct, tCategory, translating }}
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
