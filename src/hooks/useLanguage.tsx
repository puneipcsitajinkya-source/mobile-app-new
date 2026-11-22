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

const translations: Record<Language, Record<string, string>> = {
  en: {
    appTitle: 'FirstMart',
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
    cartUnavailableMsg: 'Sorry for the inconvenience. Service is temporarily unavailable. Ordering will resume shortly during our working hours.',
    cartEmptyMsg: 'Your cart is empty. Add items before checkout.',
    ordersTitle: 'My Orders',
    ordersEmpty: 'No orders found',
    ordersEmptySub: 'Enter your number to retrieve your orders',
    enterMobile: 'Track Orders by Mobile',
    fetchOrdersBtn: 'View Orders',
    orderDate: 'Date',
    orderStatus: 'Status',
    feedbackTitle: 'Feedback & Reports',
    feedbackSub: "We'd love to hear from you!",
    feedbackType: 'Choose Option',
    typeFeedback: 'Feedback',
    typeReport: 'Bug Report',
    nameLabel: 'Your Name',
    namePlaceholder: 'Enter your name',
    emailLabel: 'Your Email',
    emailPlaceholder: 'Enter your email',
    ratingLabel: 'Rate your experience',
    messageLabel: 'Message / Details',
    messagePlaceholder: 'Write your feedback or report here...',
    submitBtn: 'Submit',
    submittingBtn: 'Submitting...',
    feedbackSuccessTitle: 'Thank You!',
    feedbackSuccessMsg: 'Your feedback has been successfully submitted.',
    reportSuccessMsg: 'Your bug report has been successfully submitted.',
    feedbackErrorMsg: 'Failed to submit. Please try again.',
    nameRequiredMsg: 'Please enter your name.',
    messageRequiredMsg: 'Please enter your message.',
    ratingRequiredMsg: 'Please rate your experience.',
    paymentMethod: 'Payment Method',
    cashOnDelivery: 'Pay on Delivery (Cash / UPI)',
    codDescription: 'Pay with Cash or UPI (GPay, PhonePe, Paytm QR) when your order arrives.',
    importantNoteTitle: 'Important Note',
    importantCodNote: 'At the time of delivery, you can pay using Cash OR via UPI (Google Pay, PhonePe, Paytm QR code) directly to our delivery partner.',
    // Common Dialog & Action Keys
    "Are you sure you want to cancel this order?": "Are you sure you want to cancel this order?",
    "Are you sure you want to clear all fields to enter a new address?": "Are you sure you want to clear all fields to enter a new address?",
    "Cancel Order": "Cancel Order",
    "Failed to cancel order. Please try again.": "Failed to cancel order. Please try again.",
    "New Address": "New Address",
    "Order Cancelled": "Order Cancelled",
    "Order has been cancelled successfully.": "Order has been cancelled successfully.",
    cancel: "Cancel",
    clear: "Clear All",
    yes: "Yes",
    no: "No",
    seeAll: "See all ›",
    shop: "Shop",
    cart: "Cart",
    orders: "Orders",
    feedback: "Feedback",
    checkout: "Checkout",
    billDetails: "Bill Details",
    itemTotal: "Item Total",
    deliveryFee: "Delivery Fee",
    free: "FREE",
    handlingFee: "Handling Fee",
    taxesGst: "Taxes (GST)",
    grandTotal: "Grand Total",
    confirmContactNumber: "Confirm Contact Number",
    reenterMobile: "Re-enter your mobile number",
    numbersMatch: "Numbers match ✓",
    clearSavedInfo: "Clear saved info",
    gettingLocation: "Getting location...",
    recommended: "RECOMMENDED",
    subtotal: "Subtotal",
  },
  mr: {
    appTitle: 'FirstMart',
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
    feedbackTitle: 'अभिप्राय आणि तक्रारी',
    feedbackSub: 'आम्हाला तुमच्याकडून ऐकायला आवडेल!',
    feedbackType: 'पर्याय निवडा',
    typeFeedback: 'अभिप्राय',
    typeReport: 'तक्रार / बग',
    nameLabel: 'तुमचे नाव',
    namePlaceholder: 'नाव प्रविष्ट करा',
    emailLabel: 'तुमचा ईमेल',
    emailPlaceholder: 'ईमेल प्रविष्ट करा',
    ratingLabel: 'तुमचा अनुभव कसा होता?',
    messageLabel: 'अभिप्राय / सविस्तर माहिती',
    messagePlaceholder: 'तुमचा अभिप्राय किंवा तक्रार येथे लिहा...',
    submitBtn: 'पाठवा',
    submittingBtn: 'पाठवत आहे...',
    feedbackSuccessTitle: 'धन्यवाद!',
    feedbackSuccessMsg: 'तुमचा अभिप्राय यशस्वीरीत्या पाठवला गेला आहे.',
    reportSuccessMsg: 'तुमची तक्रार यशस्वीरीत्या पाठवली गेली आहे.',
    feedbackErrorMsg: 'पाठवण्यात त्रुटी. पुन्हा प्रयत्न करा.',
    nameRequiredMsg: 'कृपया तुमचे नाव प्रविष्ट करा.',
    messageRequiredMsg: 'कृपया तुमचा संदेश प्रविष्ट करा.',
    ratingRequiredMsg: 'कृपया रेटिंग द्या.',
    paymentMethod: 'पेमेंट पद्धत',
    cashOnDelivery: 'डिलिव्हरीच्या वेळी पेमेंट (Cash / UPI)',
    codDescription: 'ऑर्डर आल्यावर रोख (Cash) किंवा UPI (GPay, PhonePe, Paytm QR) द्वारे पेमेंट करा.',
    importantNoteTitle: 'महत्त्वाची टीप',
    importantCodNote: 'डिलिव्हरीच्या वेळी तुम्ही रोख रक्कम (Cash) किंवा UPI (Google Pay, PhonePe, Paytm QR कोड) द्वारे थेट डिलिव्हरी पार्टनरला पेमेंट करू शकता.',
    // Common Dialog & Action Keys
    "Are you sure you want to cancel this order?": "तुम्हाला नक्की ही ऑर्डर रद्द करायची आहे का?",
    "Are you sure you want to clear all fields to enter a new address?": "नवीन पत्ता टाकण्यासाठी तुम्हाला सर्व माहिती साफ करायची आहे का?",
    "Cancel Order": "ऑर्डर रद्द करा",
    "Failed to cancel order. Please try again.": "ऑर्डर रद्द करण्यात अपयश आले. कृपया पुन्हा प्रयत्न करा.",
    "New Address": "नवीन पत्ता",
    "Order Cancelled": "ऑर्डर रद्द झाली",
    "Order has been cancelled successfully.": "ऑर्डर यशस्वीरीत्या रद्द केली गेली आहे.",
    cancel: "रद्द करा",
    clear: "सर्व साफ करा",
    yes: "होय, रद्द करा",
    no: "नाही",
    seeAll: "सर्व पहा ›",
    shop: "दुकान",
    cart: "पिशवी",
    orders: "ऑर्डर्स",
    feedback: "अभिप्राय",
    checkout: "चेकआउट",
    billDetails: "बिल तपशील",
    itemTotal: "वस्तूंची एकूण रक्कम",
    deliveryFee: "डिलिव्हरी शुल्क",
    free: "मोफत",
    handlingFee: "हँडलिंग शुल्क",
    taxesGst: "कर (GST)",
    grandTotal: "एकूण देय रक्कम",
    confirmContactNumber: "मोबाईल नंबरची पुष्टी करा",
    reenterMobile: "तुमचा मोबाईल नंबर पुन्हा टाका",
    numbersMatch: "नंबर जुळले ✓",
    clearSavedInfo: "माहिती साफ करा",
    gettingLocation: "पत्ता शोधत आहे...",
    recommended: "शिफारस केलेले",
    subtotal: "उप-एकूण",
  },
  hi: {
    appTitle: 'FirstMart',
    appSub: '१० मिनट में डिलीवरी',
    searchPlaceholder: 'उत्पाद खोजें...',
    allCategory: 'सभी',
    addedToCart: 'जोड़ा गया',
    addBtn: 'जोड़ें',
    cartTitle: 'आपकी कार्ट',
    cartEmpty: 'आपकी कार्ट खाली है',
    browseProducts: 'उत्पाद देखें',
    each: 'प्रत्येक',
    totalAmount: 'कुल राशि',
    proceedToCheckout: 'ऑर्डर करने के लिए आगे बढ़ें →',
    mobileNumber: 'मोबाइल नंबर',
    mobilePlaceholder: '१० अंकों का मोबाइल नंबर दर्ज करें',
    confirmMobilePlaceholder: 'मोबाइल नंबर की पुष्टि करें',
    mobileMismatch: 'नंबर मेल नहीं खाते',
    mobileSuccess: 'मोबाइल नंबर पुष्ट हुआ',
    deliveryLocation: 'डिलीवरी का पता',
    deliveryHint: 'आपके दरवाजे तक पहुंचाने के लिए आवश्यक है',
    locationCaptured: 'स्थान प्राप्त हुआ!',
    allowLocation: 'स्थान अनुमति दें',
    orderSummary: 'ऑर्डर सारांश',
    total: 'कुल',
    placeOrder: 'ऑर्डर दें',
    orderPlaced: 'ऑर्डर सफल रहा!',
    orderPlacedSub: 'आपका ऑर्डर रास्ते में है 🛍️',
    orderIdLabel: 'ऑर्डर आईडी',
    thankYou: 'हमें आपका ऑर्डर मिल गया है और हम जल्द ही इसे भेजेंगे।\nFirstMart से खरीदारी करने के लिए धन्यवाद! 🙏',
    continueShopping: 'खरीदारी जारी रखें',
    quantity: 'मात्रा',
    totalAmountLabel: 'कुल राशि',
    perKg: 'किलो',
    perPc: 'नग',
    addCartBtn: 'कार्ट में डालें',
    addedCartBtn: 'कार्ट में जोड़ा गया!',
    productNotFound: 'उत्पाद नहीं मिला',
    errorTitle: 'त्रुटि',
    permissionDenied: 'अनुमति अस्वीकृत',
    locationPermissionMsg: 'ऑर्डर देने के लिए स्थान अनुमति आवश्यक है।',
    locationErrorMsg: 'स्थान प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।',
    invalidMobileMsg: 'कृपया एक मान्य १० अंकों का मोबाइल नंबर दर्ज करें।',
    mobileMismatchMsg: 'मोबाइल नंबर मेल नहीं खाते।',
    locationRequiredMsg: 'डिलीवरी फ़ील्ड आवश्यक है',
    orderFailedMsg: 'ऑर्डर देने में विफल। कृपया पुनः प्रयास करें।',
    cartUnavailableMsg: 'सेवा वर्तमान में अस्थायी रूप से अनुपलब्ध है। हम जल्द ही ऑर्डर लेना फिर से शुरू करेंगे।',
    cartEmptyMsg: 'आपकी कार्ट खाली है। चेकआउट से पहले वस्तुएं जोड़ें।',
    ordersTitle: 'मेरे ऑर्डर',
    ordersEmpty: 'कोई ऑर्डर नहीं मिला',
    ordersEmptySub: 'अपने ऑर्डर देखने के लिए मोबाइल नंबर दर्ज करें',
    enterMobile: 'मोबाइल नंबर से ट्रैक करें',
    fetchOrdersBtn: 'ऑर्डर देखें',
    orderDate: 'तारीख',
    orderStatus: 'स्थिति',
    feedbackTitle: 'प्रतिक्रिया और रिपोर्ट',
    feedbackSub: 'हम आपकी राय जानना चाहते हैं!',
    feedbackType: 'विकल्प चुनें',
    typeFeedback: 'प्रतिक्रिया',
    typeReport: 'बग रिपोर्ट',
    nameLabel: 'आपका नाम',
    namePlaceholder: 'अपना नाम दर्ज करें',
    emailLabel: 'आपका ईमेल',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    ratingLabel: 'अपना अनुभव बताएं',
    messageLabel: 'संदेश / विवरण',
    messagePlaceholder: 'अपनी प्रतिक्रिया या शिकायत यहाँ लिखें...',
    submitBtn: 'जमा करें',
    submittingBtn: 'भेजा जा रहा है...',
    feedbackSuccessTitle: 'धन्यवाद!',
    feedbackSuccessMsg: 'आपकी प्रतिक्रिया सफलतापूर्वक प्राप्त हो गई है।',
    reportSuccessMsg: 'आपकी बग रिपोर्ट सफलतापूर्वक दर्ज कर ली गई है।',
    feedbackErrorMsg: 'भेजने में विफल। कृपया पुनः प्रयास करें।',
    nameRequiredMsg: 'कृपया अपना नाम दर्ज करें।',
    messageRequiredMsg: 'कृपया अपना संदेश दर्ज करें।',
    ratingRequiredMsg: 'कृपया रेटिंग दें।',
    paymentMethod: 'भुगतान का तरीका',
    cashOnDelivery: 'डिलीवरी पर भुगतान (Cash / UPI)',
    codDescription: 'ऑर्डर मिलने पर नकद (Cash) या UPI (GPay, PhonePe, Paytm QR) द्वारा भुगतान करें।',
    importantNoteTitle: 'महत्वपूर्ण सूचना',
    importantCodNote: 'डिलीवरी के समय आप नकद (Cash) या सीधे डिलीवरी पार्टनर के UPI QR कोड पर भुगतान कर सकते हैं।',
    // Common Dialog & Action Keys
    "Are you sure you want to cancel this order?": "क्या आप वाकई यह ऑर्डर रद्द करना चाहते हैं?",
    "Are you sure you want to clear all fields to enter a new address?": "क्या आप नया पता दर्ज करने के लिए सभी विवरण साफ़ करना चाहते हैं?",
    "Cancel Order": "ऑर्डर रद्द करें",
    "Failed to cancel order. Please try again.": "ऑर्डर रद्द करने में विफल। कृपया पुनः प्रयास करें।",
    "New Address": "नया पता",
    "Order Cancelled": "ऑर्डर रद्द किया गया",
    "Order has been cancelled successfully.": "ऑर्डर सफलतापूर्वक रद्द कर दिया गया है।",
    cancel: "रद्द करें",
    clear: "सभी साफ़ करें",
    yes: "हाँ, रद्द करें",
    no: "नहीं",
    seeAll: "सभी देखें ›",
    shop: "दुकान",
    cart: "कार्ट",
    orders: "ऑर्डर",
    feedback: "फीडबैक",
    checkout: "चेकआउट",
    billDetails: "बिल विवरण",
    itemTotal: "सामान का कुल मूल्य",
    deliveryFee: "डिलीवरी शुल्क",
    free: "मुफ़्त",
    handlingFee: "हैंडलिंग शुल्क",
    taxesGst: "कर (GST)",
    grandTotal: "कुल देय राशि",
    confirmContactNumber: "मोबाइल नंबर की पुष्टि करें",
    reenterMobile: "अपना मोबाइल नंबर दोबारा दर्ज करें",
    numbersMatch: "नंबर मेल खाते हैं ✓",
    clearSavedInfo: "जानकारी साफ़ करें",
    gettingLocation: "स्थान प्राप्त कर रहा है...",
    recommended: "अनुशंसित",
    subtotal: "उप-कुल",
  },
};

const categoryTranslations: Record<Language, Record<string, string>> = {
  en: {
    'All': 'All',
    'Grocery & Kitchen': 'Grocery & Kitchen',
    'Snacks & Drinks': 'Snacks & Drinks',
    'Beauty & Personal Care': 'Beauty & Personal Care',
    'Electronics': 'Electronics',
    'Gifting & Lifestyle': 'Gifting & Lifestyle',
    'Fruit & vegitable': 'Fruit & Vegetable',
    'Fruit & Vegitable': 'Fruit & Vegetable',
    'Fruits & Vegetables': 'Fruits & Vegetables',
    'Drinks & soft Water': 'Drinks & Soft Water',
    'Dairy Bread & Eggs': 'Dairy, Bread & Eggs',
    'Oil , Atta , Dal & Rice': 'Oil, Atta, Dal & Rice',
    'Chicken Meat & Fish': 'Chicken, Meat & Fish',
    'Feminine Hygiene': 'Feminine Hygiene',
    'First Martt Cafe': 'First Mart Cafe',
    'FirstMartt Cafe': 'First Mart Cafe',
    'Cake': 'Cakes',
    'Dry Fruits , Sweets  & Chocolate': 'Dry Fruits, Sweets & Chocolates',
    'Buty product & Stationery': 'Beauty Products & Stationery',
    'Baby Care': 'Baby Care',
    'Bath & Body Care': 'Bath & Body Care',
    'Sport Store': 'Sports Store',
    'Bread , khari & Biscuits': 'Bread, Khari & Biscuits',
    'Chips namkin & Biscuits': 'Chips, Namkeen & Biscuits',
    'Pet Store': 'Pet Store',
    'Man Lifestyle': "Men's Lifestyle",
    'Woman Lifestyle': "Women's Lifestyle",
    'Jewellery Store': 'Jewellery Store',
    'Gift & Toy Store': 'Gift & Toy Store',
    'Xerox , Print & Online service': 'Xerox, Print & Online Services',
    'Dairy & Breakfast': 'Dairy & Breakfast',
    'Snacks & Munchies': 'Snacks & Munchies',
    'Cold Drinks & Juices': 'Cold Drinks & Juices',
    'Sweet Tooth': 'Sweet Tooth',
    'Instant & Frozen Food': 'Instant & Frozen Food',
    'Meat, Fish & Eggs': 'Meat, Fish & Eggs',
    'Bakery & Biscuits': 'Bakery & Biscuits',
    'Atta, Rice & Dal': 'Atta, Rice & Dal',
    'Masala, Oil & More': 'Masala, Oil & More',
  },
  mr: {
    'All': 'सर्व',
    'Grocery & Kitchen': 'किराणा आणि स्वयंपाकघर',
    'Snacks & Drinks': 'स्नॅक्स आणि शीतपेये',
    'Beauty & Personal Care': 'सौंदर्य आणि वैयक्तिक काळजी',
    'Electronics': 'इलेक्ट्रॉनिक्स',
    'Gifting & Lifestyle': 'गिफ्टिंग आणि जीवनशैली',
    'Fruit & vegitable': 'फळे आणि भाज्या',
    'Fruit & Vegitable': 'फळे आणि भाज्या',
    'Fruits & Vegetables': 'फळे आणि भाज्या',
    'Drinks & soft Water': 'शीतपेये आणि पाणी',
    'Dairy Bread & Eggs': 'डेअरी, ब्रेड आणि अंडी',
    'Oil , Atta , Dal & Rice': 'तेल, आटा, डाळी आणि तांदूळ',
    'Chicken Meat & Fish': 'चिकन, मटण आणि मासे',
    'Feminine Hygiene': 'स्त्री स्वच्छता व काळजी',
    'First Martt Cafe': 'फर्स्ट मार्ट कॅफे',
    'FirstMartt Cafe': 'फर्स्ट मार्ट कॅफे',
    'Cake': 'केक आणि पेस्ट्री',
    'Dry Fruits , Sweets  & Chocolate': 'ड्रायफ्रूट्स, मिठाई आणि चॉकलेट्स',
    'Buty product & Stationery': 'सौंदर्य प्रसाधने आणि स्टेशनरी',
    'Baby Care': 'बाळांची काळजी (बेबी केअर)',
    'Bath & Body Care': 'स्नान आणि शरीर निगा',
    'Sport Store': 'क्रीडा साहित्य',
    'Bread , khari & Biscuits': 'ब्रेड, खारी आणि बिस्किटे',
    'Chips namkin & Biscuits': 'चिप्स, नमकीन आणि बिस्किटे',
    'Pet Store': 'पाळीव प्राण्यांचे खाद्य',
    'Man Lifestyle': 'पुरुषांची जीवनशैली',
    'Woman Lifestyle': 'महिलांची जीवनशैली',
    'Jewellery Store': 'दागिने व ज्वेलरी',
    'Gift & Toy Store': 'भेटवस्तू आणि खेळणी',
    'Xerox , Print & Online service': 'झेरॉक्स, प्रिंट आणि ऑनलाइन सेवा',
    'Dairy & Breakfast': 'डेअरी आणि नाश्ता',
    'Snacks & Munchies': 'स्नॅक्स',
    'Cold Drinks & Juices': 'थंड पेये आणि रस',
    'Sweet Tooth': 'मिठाई',
    'Instant & Frozen Food': 'इन्स्टंट आणि फ्रोझन फूड',
    'Meat, Fish & Eggs': 'मांस, मासे आणि अंडी',
    'Bakery & Biscuits': 'बेकरी आणि बिस्किटे',
    'Atta, Rice & Dal': 'आटा, तांदूळ आणि डाळी',
    'Masala, Oil & More': 'मसाले आणि तेल',
  },
  hi: {
    'All': 'सभी',
    'Grocery & Kitchen': 'किराना और रसोई',
    'Snacks & Drinks': 'स्नैक्स और ड्रिंक्स',
    'Beauty & Personal Care': 'सौंदर्य और व्यक्तिगत देखभाल',
    'Electronics': 'इलेक्ट्रॉनिक्स',
    'Gifting & Lifestyle': 'उपहार और लाइफस्टाइल',
    'Fruit & vegitable': 'फल और सब्जियां',
    'Fruit & Vegitable': 'फल और सब्जियां',
    'Fruits & Vegetables': 'फल और सब्जियां',
    'Drinks & soft Water': 'शीतल पेय और पानी',
    'Dairy Bread & Eggs': 'डेयरी, ब्रेड और अंडे',
    'Oil , Atta , Dal & Rice': 'तेल, आटा, दाल और चावल',
    'Chicken Meat & Fish': 'चिकन, मीट और मछली',
    'Feminine Hygiene': 'महिला स्वच्छता',
    'First Martt Cafe': 'फर्स्ट मार्ट कैफे',
    'FirstMartt Cafe': 'फर्स्ट मार्ट कैफे',
    'Cake': 'केक और पेस्ट्री',
    'Dry Fruits , Sweets  & Chocolate': 'मेवे, मिठाई और चॉकलेट्स',
    'Buty product & Stationery': 'सौंदर्य उत्पाद और स्टेशनरी',
    'Baby Care': 'बेबी केयर',
    'Bath & Body Care': 'स्नान और शरीर देखभाल',
    'Sport Store': 'स्पोर्ट्स स्टोर',
    'Bread , khari & Biscuits': 'ब्रेड, खारी और बिस्कुट',
    'Chips namkin & Biscuits': 'चिप्स, नमकीन और बिस्कुट',
    'Pet Store': 'पेट स्टोर',
    'Man Lifestyle': 'पुरुषों की लाइफस्टाइल',
    'Woman Lifestyle': 'महिलाओं की लाइफस्टाइल',
    'Jewellery Store': 'ज्वेलरी स्टोर',
    'Gift & Toy Store': 'उपहार और खिलौने',
    'Xerox , Print & Online service': 'ज़ेरॉक्स, प्रिंट और ऑनलाइन सेवाएं',
    'Dairy & Breakfast': 'डेयरी और नाश्ता',
    'Snacks & Munchies': 'स्नैक्स और नमकीन',
    'Cold Drinks & Juices': 'कोल्ड ड्रिंक्स और जूस',
    'Sweet Tooth': 'मिठाई',
    'Instant & Frozen Food': 'इंस्टेंट और फ्रोजन फूड',
    'Meat, Fish & Eggs': 'मीट, मछली और अंडे',
    'Bakery & Biscuits': 'बेकरी और बिस्कुट',
    'Atta, Rice & Dal': 'आटा, चावल और दाल',
    'Masala, Oil & More': 'मसाले और तेल',
  },
};

const productDictionary: Record<'mr' | 'hi', Record<string, string>> = {
  mr: {
    'potato': 'बटाटा',
    'onion': 'कांदा',
    'tomato': 'टोमॅटो',
    'green chilli': 'हिरवी मिरची',
    'green capsicum': 'हिरवी शिमला मिरची',
    'shimla mirch': 'शिमला मिरची',
    'green cucumber': 'हिरवी काकडी',
    'kheera': 'काकडी',
    'dhaniya': 'कोथिंबीर',
    'coriander': 'कोथिंबीर',
    'garlic': 'लसूण',
    'ginger': 'आले',
    'milk': 'दूध',
    'bread': 'ब्रेड',
    'eggs': 'अंडी',
    'egg': 'अंडे',
    'atta': 'गव्हाचे पीठ',
    'rice': 'तांदूळ',
    'sugar': 'साखर',
    'oil': 'तेल',
    'salt': 'मीठ',
    'tea': 'चहा',
    'coffee': 'कॉफी',
    'butter': 'लोणी (बटर)',
    'paneer': 'पनीर',
    'curd': 'दही',
    'ghee': 'तूप',
    'apple': 'सफरचंद',
    'banana': 'केळी',
  },
  hi: {
    'potato': 'आलू',
    'onion': 'प्याज',
    'tomato': 'टमाटर',
    'green chilli': 'हरी मिर्च',
    'green capsicum': 'शिमला मिर्च',
    'shimla mirch': 'शिमला मिर्च',
    'green cucumber': 'खीरा',
    'kheera': 'खीरा',
    'dhaniya': 'धनिया',
    'coriander': 'धनिया',
    'garlic': 'लहसुन',
    'ginger': 'अदरक',
    'milk': 'दूध',
    'bread': 'ब्रेड',
    'eggs': 'अंडे',
    'egg': 'अंडा',
    'atta': 'आटा',
    'rice': 'चावल',
    'sugar': 'चीनी',
    'oil': 'तेल',
    'salt': 'नमक',
    'tea': 'चाय',
    'coffee': 'कॉफी',
    'butter': 'मक्खन',
    'paneer': 'पनीर',
    'curd': 'दही',
    'ghee': 'घी',
    'apple': 'सेब',
    'banana': 'केला',
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
      const singleParts = translatedCombined.split('\n').filter((s: string) => s.trim() !== '').map((s: string) => s.trim());
      if (singleParts.length === texts.length) {
        return singleParts;
      }
    }
  } catch (e) {}

  const results: string[] = [];
  for (const text of texts) {
    const res = await translateText(text, targetLang);
    results.push(res);
    await new Promise(r => setTimeout(r, 15));
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
          try {
            cacheObj = JSON.parse(savedCache);
          } catch (e) {}
        }

        cacheObj.en = cacheObj.en || {};
        cacheObj.mr = cacheObj.mr || {};
        cacheObj.hi = cacheObj.hi || {};

        dynamicTranslationsRef.current = cacheObj;
        setDynamicTranslations(cacheObj);

        if (savedLang && (savedLang === 'en' || savedLang === 'mr' || savedLang === 'hi')) {
          setLanguageState(savedLang as Language);
        } else {
          setLanguageState('en');
          setTimeout(() => {
            getSettings()
              .then((settingsRes) => {
                const backendDefaultLang = settingsRes.data?.defaultLanguage;
                if (backendDefaultLang && (backendDefaultLang === 'en' || backendDefaultLang === 'mr' || backendDefaultLang === 'hi')) {
                  setLanguageState(backendDefaultLang as Language);
                  AsyncStorage.setItem('veggie_app_language', backendDefaultLang).catch(() => undefined);
                }
              })
              .catch(() => undefined);
          }, 1500);
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
    setLanguageState(newLang);
    await AsyncStorage.setItem('veggie_app_language', newLang);

    // If static dictionary already has this language (en, mr, hi), no need to block user
    if (translations[newLang]) {
      return;
    }

    const englishKeys = Object.keys(translations.en);
    const existingCache = dynamicTranslationsRef.current[newLang] || {};
    const translatedCount = englishKeys.filter(k => existingCache[k]).length;
    const isTranslated = translatedCount >= englishKeys.length * 0.8;

    if (isTranslated) {
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
    } catch (e) {
      console.error('Failed to translate app static keys', e);
    } finally {
      setTranslating(false);
    }
  }, [updateTranslationCache]);

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
      // 1. Check exact language static dictionary
      if (translations[language] && translations[language][key]) {
        return translations[language][key];
      }

      // 2. Check dynamic translation cache
      const cached = dynamicTranslationsRef.current[language]?.[key];
      if (cached) {
        return cached;
      }

      // 3. Fallback to English static dictionary or key itself
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
      
      if (typeof name !== 'string' && typeof name !== 'object') {
        return String(name);
      }
      
      let englishText = '';
      let presetMarathiText = '';

      if (typeof name === 'string') {
        englishText = name.trim();
      } else if (name !== null && typeof name === 'object') {
        englishText = ((name as any).en || '').trim();
        presetMarathiText = ((name as any).mr || '').trim();
      }

      if (language === 'en') {
        return englishText;
      }

      // If Marathi and preset translation exists and is non-empty
      if (language === 'mr' && presetMarathiText && presetMarathiText.length > 0) {
        return presetMarathiText;
      }

      // Check predefined dictionary for instant high-quality names
      const lower = englishText.toLowerCase();
      if ((language === 'mr' || language === 'hi') && productDictionary[language]) {
        const dict = productDictionary[language];
        for (const [dictKey, dictVal] of Object.entries(dict)) {
          if (lower === dictKey || lower.startsWith(dictKey + ' ') || lower.endsWith(' ' + dictKey)) {
            return dictVal;
          }
        }
      }

      const cached = dynamicTranslationsRef.current[language]?.[englishText];
      if (cached) {
        return cached;
      }

      translateOnTheFly(englishText, language);

      return language === 'mr' && presetMarathiText && presetMarathiText.length > 0
        ? presetMarathiText
        : englishText;
    },
    [language, dynamicTranslations, translateOnTheFly]
  );

  const tCategory = useCallback(
    (catName: string): string => {
      if (!catName) return '';
      
      if (language === 'en') {
        return catName;
      }

      const langMap = categoryTranslations[language];
      if (langMap) {
        const trimmed = catName.trim();
        const lower = trimmed.toLowerCase();
        const matchKey = Object.keys(langMap).find(
          (k) => k.trim().toLowerCase() === lower
        );
        if (matchKey && langMap[matchKey]) {
          return langMap[matchKey];
        }
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
