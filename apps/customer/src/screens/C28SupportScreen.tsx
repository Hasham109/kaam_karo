/**
 * C28: Help & Support Screen (T7.5; BP §12 C28, BP §40 L1..L5; SUP-001, SUP-002).
 * Features:
 * - FAQ self-help (L1) with accordion questions/answers.
 * - Active support tickets list with level (L1–L5) and status.
 * - New ticket creation form (category, booking ID, description).
 * - "Report a problem with a booking" entry point to C29 dispute flow.
 * - 5 canonical screen states (L, E, S, X, P).
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLOR, RADIUS, SPACING, STATUS_THEME } from '@kaamkaro/ui';
import { translate } from '@kaamkaro/i18n';
import { getAppMirroring } from '../utils/rtl';
import { ScreenContainer } from '../components/ScreenContainer';
import { StateView } from '../components/StateView';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';
import { MOCK_CUSTOMER_TICKETS } from '../data/mock-data';
import type { CustomerSupportTicket, ScreenId, ScreenState } from '../types';

export interface C28SupportScreenProps {
  readonly initialTickets?: CustomerSupportTicket[];
  readonly initialState?: ScreenState;
  readonly onTicketCreated?: (ticket: CustomerSupportTicket) => void;
}

interface FaqItem {
  readonly id: string;
  readonly questionEn: string;
  readonly questionUr: string;
  readonly answerEn: string;
  readonly answerUr: string;
}

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'faq-1',
    questionEn: 'How do I cancel or reschedule a booking?',
    questionUr: 'میں بکنگ کیسے منسوخ یا تبدیل کر سکتا ہوں؟',
    answerEn:
      'You can cancel or reschedule directly from the booking tracking screen before the provider arrives on site.',
    answerUr:
      'کاریگر کے گھر پہنچنے سے پہلے آپ ٹریکنگ اسکرین سے براہِ راست بکنگ منسوخ یا تبدیل کر سکتے ہیں۔',
  },
  {
    id: 'faq-2',
    questionEn: 'What payment methods are supported in Kaam Karo?',
    questionUr: 'کام کرو میں کون سے ادائیگی کے طریقے دستیاب ہیں؟',
    answerEn:
      'We support direct Cash on completion as well as digital payments via credit/debit card and mobile wallets.',
    answerUr:
      'ہم کام مکمل ہونے پر کیش اور ڈیبٹ/کریڈٹ کارڈ یا موبائل والیٹس کے ذریعے ادائیگی قبول کرتے ہیں۔',
  },
  {
    id: 'faq-3',
    questionEn: 'What should I do if work quality is unsatisfactory?',
    questionUr: 'اگر کام کا معیار تسلی بخش نہ ہو تو کیا کروں؟',
    answerEn:
      'Use the "Report a problem" button on this screen or booking review to submit a structured complaint and request rework or refund.',
    answerUr:
      'اسی اسکرین یا بکنگ ریویو پر "مسئلہ رپورٹ کریں" دبائیں تاکہ کام دوبارہ کرانے یا رقم واپسی کی درخواست کی جا سکے۔',
  },
];

const CATEGORY_KEYS = [
  'BOOKING',
  'PAYMENT',
  'SAFETY',
  'SERVICE_QUALITY',
  'ACCOUNT',
  'GENERAL',
] as const;

export const C28SupportScreen: React.FC<C28SupportScreenProps> = ({
  initialTickets = MOCK_CUSTOMER_TICKETS,
  initialState = 'S',
  onTicketCreated,
}) => {
  const { locale, navigate, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const c28Params = screenParams as { returnTo?: ScreenId; bookingId?: string } | undefined;
  const initialBookingId = c28Params?.bookingId ?? '';

  const [tickets, setTickets] = useState<CustomerSupportTicket[]>(initialTickets);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<string>('BOOKING');
  const [bookingId, setBookingId] = useState<string>(initialBookingId);
  const [description, setDescription] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleReportProblem = () => {
    navigate('C29', { bookingId: bookingId || undefined });
  };

  const handleSubmitTicket = () => {
    if (!category) {
      setValidationError(translate(locale, 'customer.c28.emptyCategory'));
      return;
    }
    if (!description.trim()) {
      setValidationError(translate(locale, 'customer.c28.emptyDescription'));
      return;
    }

    setValidationError(null);
    setScreenState('P');

    setTimeout(() => {
      const newTicketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicket: CustomerSupportTicket = {
        id: `tkt-${Date.now()}`,
        ticketNumber: newTicketNumber,
        category,
        subject: description.trim().slice(0, 40),
        description: description.trim(),
        status: 'OPEN',
        level: 2,
        bookingId: bookingId.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      setTickets((prev) => [newTicket, ...prev]);
      setDescription('');
      setSuccessNotice(translate(locale, 'customer.c28.success', { number: newTicketNumber }));
      setScreenState('S');
      onTicketCreated?.(newTicket);
    }, 400);
  };

  if (screenState === 'L') {
    return (
      <ScreenContainer testID="c28-support-screen">
        <StateView state="L" locale={locale} message={translate(locale, 'customer.c28.pending')} />
      </ScreenContainer>
    );
  }

  if (screenState === 'X') {
    return (
      <ScreenContainer testID="c28-support-screen">
        <StateView
          state="X"
          locale={locale}
          message={translate(locale, 'common.error.server')}
          onRetry={() => setScreenState('S')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer testID="c28-support-screen">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={[styles.headerRow, { flexDirection: mirror.row }]}>
          <Text style={[styles.title, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'customer.c28.title')}
          </Text>
        </View>

        {/* Report Problem with Booking CTA (C29 link) */}
        <View style={styles.disputeCtaCard}>
          <UiButton
            testID="c28-report-problem-btn"
            variant="secondary"
            title={translate(locale, 'customer.c28.reportProblemBtn')}
            onPress={handleReportProblem}
            locale={locale}
          />
        </View>

        {/* Success Notice */}
        {successNotice ? (
          <View style={styles.noticeBox} testID="c28-success-notice">
            <Text style={[styles.noticeText, { textAlign: mirror.textAlign }]}>{successNotice}</Text>
          </View>
        ) : null}

        {/* Section 1: FAQ Self-Help (L1, SUP-001) */}
        <View style={styles.section} testID="c28-faq-section">
          <Text style={[styles.sectionTitle, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'customer.c28.faqHeader')}
          </Text>
          {FAQ_ITEMS.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            const q = locale === 'ur' ? faq.questionUr : faq.questionEn;
            const a = locale === 'ur' ? faq.answerUr : faq.answerEn;
            return (
              <TouchableOpacity
                key={faq.id}
                testID={`c28-faq-item-${faq.id}`}
                style={styles.faqCard}
                onPress={() => toggleFaq(faq.id)}
                accessible={true}
                accessibilityRole="button"
              >
                <View style={[styles.faqHeader, { flexDirection: mirror.row }]}>
                  <Text style={[styles.faqQuestion, { textAlign: mirror.textAlign }]}>{q}</Text>
                  <Text style={styles.faqChevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
                {isExpanded ? <Text style={[styles.faqAnswer, { textAlign: mirror.textAlign }]}>{a}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section 2: My Tickets */}
        <View style={styles.section} testID="c28-tickets-section">
          <Text style={[styles.sectionTitle, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'customer.c28.myTicketsHeader')}
          </Text>
          {tickets.length === 0 ? (
            <View style={styles.emptyCard} testID="c28-empty-tickets">
              <Text style={[styles.emptyText, { textAlign: mirror.textAlign }]}>
                {translate(locale, 'customer.c28.emptyTickets')}
              </Text>
            </View>
          ) : (
            tickets.map((t) => (
              <View key={t.id} style={styles.ticketCard} testID={`c28-ticket-item-${t.id}`}>
                <View style={[styles.ticketHeader, { flexDirection: mirror.row }]}>
                  <Text style={styles.ticketNumber}>
                    {translate(locale, 'customer.c28.ticketNumber', {
                      number: t.ticketNumber,
                    })}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      t.status === 'CLOSED' || t.status === 'RESOLVED'
                        ? styles.statusClosed
                        : styles.statusOpen,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {t.status === 'CLOSED' || t.status === 'RESOLVED'
                        ? translate(locale, 'customer.c28.statusClosed')
                        : translate(locale, 'customer.c28.statusOpen')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.ticketMetaRow, { flexDirection: mirror.row }]}>
                  <Text style={styles.levelBadge}>
                    {translate(locale, 'customer.c28.levelPrefix', {
                      level: t.level,
                    })}
                  </Text>
                  <Text style={styles.categoryBadge}>{t.category}</Text>
                </View>

                <Text style={[styles.ticketSubject, { textAlign: mirror.textAlign }]}>{t.subject}</Text>
                <Text style={[styles.ticketDescription, { textAlign: mirror.textAlign }]}>{t.description}</Text>
              </View>
            ))
          )}
        </View>

        {/* Section 3: Create Support Ticket */}
        <View style={styles.section} testID="c28-create-ticket-section">
          <Text style={[styles.sectionTitle, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'customer.c28.title')}
          </Text>

          {validationError ? (
            <View style={styles.errorBanner} testID="c28-validation-error">
              <Text style={[styles.errorText, { textAlign: mirror.textAlign }]}>{validationError}</Text>
            </View>
          ) : null}

          {/* Category Picker */}
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'customer.c28.categoryLabel')}
          </Text>
          <View style={[styles.categoryPillsRow, { flexDirection: mirror.row }]}>
            {CATEGORY_KEYS.map((catKey) => {
              const isSelected = category === catKey;
              return (
                <TouchableOpacity
                  key={catKey}
                  testID={`c28-category-${catKey}`}
                  style={[
                    styles.categoryPill,
                    isSelected ? styles.categoryPillSelected : styles.categoryPillUnselected,
                  ]}
                  onPress={() => setCategory(catKey)}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected
                        ? styles.categoryPillTextSelected
                        : styles.categoryPillTextUnselected,
                    ]}
                  >
                    {catKey}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Optional Booking ID Input */}
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'customer.c28.bookingLabel')}
          </Text>
          <TextInput
            testID="c28-booking-input"
            style={[styles.textInput, { textAlign: mirror.textAlign }]}
            value={bookingId}
            onChangeText={setBookingId}
            placeholder={translate(locale, 'customer.c28.bookingLabel')}
            placeholderTextColor={COLOR.textMuted}
          />

          {/* Description Input */}
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'customer.c28.descriptionLabel')}
          </Text>
          <TextInput
            testID="c28-description-input"
            style={[styles.textArea, { textAlign: mirror.textAlign }]}
            value={description}
            onChangeText={setDescription}
            placeholder={translate(locale, 'customer.c28.descriptionPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            multiline
            numberOfLines={4}
          />

          <View style={styles.submitRow}>
            <UiButton
              testID="c28-submit-btn"
              variant="primary"
              title={
                screenState === 'P'
                  ? translate(locale, 'customer.c28.sending')
                  : translate(locale, 'customer.c28.submitBtn')
              }
              onPress={handleSubmitTicket}
              disabled={screenState === 'P'}
              locale={locale}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  headerRow: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLOR.primary,
  },
  disputeCtaCard: {
    marginBottom: SPACING.md,
  },
  noticeBox: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  noticeText: {
    fontSize: 16,
    color: COLOR.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  faqCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLOR.border,
    minHeight: 48,
  },
  faqHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.text,
    flex: 1,
  },
  faqChevron: {
    fontSize: 16,
    color: COLOR.textMuted,
    marginLeft: SPACING.sm,
  },
  faqAnswer: {
    fontSize: 16,
    color: COLOR.textMuted,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLOR.textMuted,
  },
  ticketCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  ticketHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusOpen: {
    backgroundColor: COLOR.surface,
  },
  statusClosed: {
    backgroundColor: COLOR.surface,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
  },
  ticketMetaRow: {
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  levelBadge: {
    fontSize: 14,
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.textMuted,
  },
  categoryBadge: {
    fontSize: 14,
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.textMuted,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.text,
    marginBottom: 2,
  },
  ticketDescription: {
    fontSize: 14,
    color: COLOR.textMuted,
  },
  errorBanner: {
    backgroundColor: STATUS_THEME.danger.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 14,
    color: STATUS_THEME.danger.text,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  categoryPillsRow: {
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  categoryPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    minHeight: 48,
  },
  categoryPillSelected: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  categoryPillUnselected: {
    backgroundColor: COLOR.surface,
    borderColor: COLOR.border,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPillTextSelected: {
    color: COLOR.onPrimary,
  },
  categoryPillTextUnselected: {
    color: COLOR.text,
  },
  textInput: {
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 16,
    color: COLOR.text,
    minHeight: 48,
  },
  textArea: {
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 16,
    color: COLOR.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitRow: {
    marginTop: SPACING.md,
  },
});
