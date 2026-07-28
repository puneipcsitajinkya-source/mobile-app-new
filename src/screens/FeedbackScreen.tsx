import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../hooks/useLanguage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { submitFeedback } from '../services/api';

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [type, setType] = useState<'feedback' | 'report'>('feedback');
  const [rating, setRating] = useState<number>(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('errorTitle') || 'Error', t('nameRequiredMsg') || 'Please enter your name.');
      return;
    }
    if (type === 'feedback' && rating === 0) {
      Alert.alert(t('errorTitle') || 'Error', t('ratingRequiredMsg') || 'Please rate your experience.');
      return;
    }
    if (!message.trim()) {
      Alert.alert(t('errorTitle') || 'Error', t('messageRequiredMsg') || 'Please enter your message.');
      return;
    }

    setLoading(true);
    try {
      await submitFeedback({
        name: name.trim(),
        email: email.trim() || undefined,
        type,
        rating: type === 'feedback' ? rating : undefined,
        message: message.trim(),
      });

      Alert.alert(
        t('feedbackSuccessTitle') || 'Thank You!',
        type === 'feedback'
          ? t('feedbackSuccessMsg') || 'Your feedback has been successfully submitted.'
          : t('reportSuccessMsg') || 'Your bug report has been successfully submitted.'
      );

      // Reset form
      setName('');
      setEmail('');
      setRating(0);
      setMessage('');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert(t('errorTitle') || 'Error', t('feedbackErrorMsg') || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('feedbackTitle') || 'Feedback & Reports'}</Text>
          <Text style={styles.subtitle}>{t('feedbackSub') || "We'd love to hear from you!"}</Text>
        </View>

        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('feedbackType') || 'Choose Option'}</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'feedback' && styles.typeButtonActive]}
              onPress={() => setType('feedback')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chatbox-ellipses-outline"
                size={20}
                color={type === 'feedback' ? '#ffffff' : '#64748b'}
              />
              <Text style={[styles.typeButtonText, type === 'feedback' && styles.typeButtonTextActive]}>
                {t('typeFeedback') || 'Feedback'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, type === 'report' && styles.typeButtonActive]}
              onPress={() => setType('report')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="bug-outline"
                size={20}
                color={type === 'report' ? '#ffffff' : '#64748b'}
              />
              <Text style={[styles.typeButtonText, type === 'report' && styles.typeButtonTextActive]}>
                {t('typeReport') || 'Bug Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name and Email */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('nameLabel') || 'Your Name'} *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('namePlaceholder') || 'Enter your name'}
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('emailLabel') || 'Your Email'}</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('emailPlaceholder') || 'Enter your email'}
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Rating component (Only show for feedback type) */}
        {type === 'feedback' && (
          <View style={styles.section}>
            <Text style={styles.label}>{t('ratingLabel') || 'Rate your experience'} *</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? '#fbbf24' : '#cbd5e1'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Message / Details */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('messageLabel') || 'Message / Details'} *</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('messagePlaceholder') || 'Write your feedback or report here...'}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              maxLength={500}
            />
          </View>
          <Text style={styles.charCount}>{message.length} / 500</Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View style={styles.submitBtnContent}>
              <Ionicons name="paper-plane" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>{t('submitBtn') || 'Submit'}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 24,
    backgroundColor: '#f1f5f9',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 52,
  },
  textAreaContainer: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    height: '100%',
  },
  textArea: {
    height: '100%',
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  starTouch: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: '#a855f7',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#d8b4fe',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
