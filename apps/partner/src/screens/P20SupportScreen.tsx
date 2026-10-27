/**
 * P20: Partner Support Screen (T7.5; BP §13 P20, BP §40 L1..L5; SUP-001, SUP-002).
 * Features:
 * - Help articles & FAQ self-help (L1).
 * - My Cases list with level (L1–L5), status, updates thread, and reply modal.
 * - Create new support case with category, optional job reference, and description.
 * - 5 canonical screen states (L, E, S, X, P).
 */
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, STATUS_THEME, textTokens } from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';
import type { PartnerSupportCase, ScreenStateMode } from '../types';

export interface P20SupportScreenProps {
  readonly initialCases?: PartnerSupportCase[];
  readonly initialState?: ScreenStateMode;
  readonly onCaseCreated?: (supportCase: PartnerSupportCase) => void;
}

interface FaqArticle {
  readonly id: string;
  readonly questionEn: string;
  readonly questionUr: string;
  readonly answerEn: string;
  readonly answerUr: string;
}

const PARTNER_FAQS: readonly FaqArticle[] = [
  {
    id: 'p-faq-1',
    questionEn: 'When are digital earnings paid out to my account?',
    questionUr: 'آن لائن کمائی میرے بینک یا والیٹ میں کب منتقل ہوتی ہے؟',
    answerEn:
      'Digital earnings are transferred every Tuesday directly to your verified bank or JazzCash/Easypaisa account.',
    answerUr:
      'آن لائن کمائی ہر منگل کو براہِ راست آپ کے تصدیق شدہ بینک یا ایزی پیسہ/جاز کیش اکاؤنٹ میں بھیج دی جاتی ہے۔',
  },
  {
    id: 'p-faq-2',
    questionEn: 'How do extra material charges work on site?',
    questionUr: 'سائٹ پر سامان کے اضافی اخراجات کیسے منظور ہوتے ہیں؟',
    answerEn:
      'You must add proposed materials in the app. The customer must tap approve on their phone before you purchase or install.',
    answerUr:
      'آپ کو ایپ میں سامان شامل کرنا ہوتا ہے۔ گاہک اپنے فون پر منظوری دے گا تبھی آپ سامان خرید یا لگا سکتے ہیں۔',
  },
  {
    id: 'p-faq-3',
    questionEn: 'What should I do if a customer refuses to pay cash?',
    questionUr: 'اگر گاہک نقد ادائیگی سے انکار کرے تو کیا کروں؟',
    answerEn:
      'Do not argue. Tap "Safety & Dispute" in Job Execution or submit a case here. Operations will intervene immediately.',
    answerUr:
      'بحث نہ کریں۔ کام کی اسکرین پر "حفاظت اور تنازعہ" دبائیں یا یہاں کیس درج کریں۔ ٹیم فوری رابطہ کرے گی۔',
  },
];

const CATEGORIES = [
  'JOB_DISPUTE',
  'PAYOUT',
  'COMMISSION',
  'APP_TECHNICAL',
  'VERIFICATION',
  'SAFETY',
] as const;

const MOCK_PARTNER_CASES: PartnerSupportCase[] = [
  {
    id: 'case-001',
    caseNumber: 'CS-8001',
    category: 'PAYOUT',
    subject: 'Easypaisa transfer delay inquiry',
    description: 'Weekly payout was pending verification of IBAN.',
    status: 'IN_PROGRESS',
    level: 2,
    bookingId: 'bk-78912',
    createdAt: '2026-10-25 16:30 PKT',
    updates: [
      {
        id: 'up-1',
        authorRole: 'SUPPORT',
        message: 'We verified your CNIC and your payout is queued for processing.',
        createdAt: '2026-10-25 17:15 PKT',
      },
    ],
  },
];

export const P20SupportScreen: React.FC<P20SupportScreenProps> = ({
  initialCases = MOCK_PARTNER_CASES,
  initialState = 'success',
  onCaseCreated,
}) => {
  const { locale } = usePartner();
  const mirror = getAppMirroring(locale);

  const [cases, setCases] = useState<PartnerSupportCase[]>(initialCases);
  const [screenState, setScreenState] = useState<ScreenStateMode>(initialState);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<string>('JOB_DISPUTE');
  const [jobRef, setJobRef] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reply Modal State
  const [activeReplyCase, setActiveReplyCase] = useState<PartnerSupportCase | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleCreateCase = () => {
    if (!category) {
      setValidationError(translate(locale, 'partner.p20.emptyCategory'));
      return;
    }
    if (!description.trim()) {
      setValidationError(translate(locale, 'partner.p20.emptyDescription'));
      return;
    }

    setValidationError(null);
    setScreenState('pending');

    setTimeout(() => {
      const caseNumber = `CS-${Math.floor(8000 + Math.random() * 1000)}`;
      const newCase: PartnerSupportCase = {
        id: `case-${Date.now()}`,
        caseNumber,
        category,
        subject: description.trim().slice(0, 40),
        description: description.trim(),
        status: 'OPEN',
        level: 2,
        bookingId: jobRef.trim() || undefined,
        createdAt: new Date().toISOString(),
        updates: [],
      };

      setCases((prev) => [newCase, ...prev]);
      setDescription('');
      setJobRef('');
      setSuccessNotice(translate(locale, 'partner.p20.success'));
      setScreenState('success');
      onCaseCreated?.(newCase);
    }, 400);
  };

  const handleOpenReply = (c: PartnerSupportCase) => {
    setActiveReplyCase(c);
    setReplyMessage('');
  };

  const handleSendReply = () => {
    if (!activeReplyCase || !replyMessage.trim()) return;

    const newUpdate = {
      id: `up-${Date.now()}`,
      authorRole: 'PROVIDER' as const,
      message: replyMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    setCases((prev) =>
      prev.map((c) =>
        c.id === activeReplyCase.id ? { ...c, updates: [...c.updates, newUpdate] } : c,
      ),
    );

    setActiveReplyCase(null);
    setReplyMessage('');
    setSuccessNotice(translate(locale, 'partner.p20.replySuccess'));
  };

  if (screenState === 'loading') {
    return (
      <View style={styles.loadingContainer} testID="p20-support-screen">
        <Text style={[styles.loadingText, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>
          {translate(locale, 'partner.p20.pending')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} testID="p20-support-screen">
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.headerRow, { flexDirection: mirror.row }]}>
          <Text style={[styles.title, { textAlign: mirror.textAlign }, textTokens(locale, 'title')]}>
            {translate(locale, 'partner.p20.title')}
          </Text>
        </View>

        {/* Success Notice */}
        {successNotice ? (
          <View style={styles.noticeBox} testID="p20-success-notice">
            <Text style={[styles.noticeText, { textAlign: mirror.textAlign }]}>{successNotice}</Text>
          </View>
        ) : null}

        {/* Section 1: Help Articles / FAQ */}
        <View style={styles.section} testID="p20-faq-section">
          <Text style={[styles.sectionTitle, { textAlign: mirror.textAlign }]}>
            {translate(locale, 'partner.p20.faqHeader')}
          </Text>
          {PARTNER_FAQS.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            const q = locale === 'ur' ? faq.questionUr : faq.questionEn;
            const a = locale === 'ur' ? faq.answerUr : faq.answerEn;
            return (
              <TouchableOpacity
                key={faq.id}
                testID={`p20-faq-item-${faq.id}`}
                style={styles.faqCard}
                onPress={() => toggleFaq(faq.id)}
                accessible={true}
                accessibilityRole="button"
              >
                <View style={[styles.faqHeader, { flexDirection: mirror.row }]}>
                  <Text style={[styles.faqQuestion, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>{q}</Text>
                  <Text style={[styles.faqChevron, textTokens(locale, 'body')]}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
                {isExpanded ? <Text style={[styles.faqAnswer, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>{a}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section 2: My Cases */}
        <View style={styles.section} testID="p20-cases-section">
          <Text style={[styles.sectionTitle, { textAlign: mirror.textAlign }, textTokens(locale, 'title')]}>
            {translate(locale, 'partner.p20.myCasesHeader')}
          </Text>
          {cases.length === 0 ? (
            <View style={styles.emptyCard} testID="p20-empty-cases">
              <Text style={[styles.emptyText, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>
                {translate(locale, 'partner.p20.emptyCases')}
              </Text>
            </View>
          ) : (
            cases.map((c) => (
              <View key={c.id} style={styles.caseCard} testID={`p20-case-item-${c.id}`}>
                <View style={[styles.caseHeader, { flexDirection: mirror.row }]}>
                  <Text style={[styles.caseNumber, textTokens(locale, 'label')]}>
                    {translate(locale, 'partner.p20.caseNumber', {
                      number: c.caseNumber,
                    })}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      c.status === 'CLOSED' || c.status === 'RESOLVED'
                        ? styles.statusClosed
                        : styles.statusOpen,
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, textTokens(locale, 'label')]}>
                      {c.status === 'CLOSED' || c.status === 'RESOLVED'
                        ? translate(locale, 'partner.p20.statusClosed')
                        : translate(locale, 'partner.p20.statusOpen')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.caseMetaRow, { flexDirection: mirror.row }]}>
                  <Text style={[styles.levelBadge, textTokens(locale, 'label')]}>
                    {translate(locale, 'partner.p20.levelPrefix', {
                      level: c.level,
                    })}
                  </Text>
                  <Text style={[styles.categoryBadge, textTokens(locale, 'label')]}>{c.category}</Text>
                  {c.bookingId ? <Text style={[styles.bookingBadge, textTokens(locale, 'label')]}>#{c.bookingId}</Text> : null}
                </View>

                <Text style={[styles.caseSubject, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>{c.subject}</Text>
                <Text style={[styles.caseDescription, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>{c.description}</Text>

                {/* Updates Thread */}
                {c.updates.length > 0 ? (
                  <View style={styles.updatesContainer}>
                    {c.updates.map((up) => (
                      <View key={up.id} style={styles.updateBubble}>
                        <Text style={[styles.updateAuthor, textTokens(locale, 'label')]}>{up.authorRole}:</Text>
                        <Text style={[styles.updateText, textTokens(locale, 'label')]}>{up.message}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Reply Button */}
                {c.status !== 'CLOSED' ? (
                  <TouchableOpacity
                    testID={`p20-reply-btn-${c.id}`}
                    style={styles.replyButton}
                    onPress={() => handleOpenReply(c)}
                    accessible={true}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.replyButtonText, textTokens(locale, 'label')]}>
                      {translate(locale, 'partner.p20.replyModalTitle')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* Section 3: Create Case */}
        <View style={styles.section} testID="p20-create-case-section">
          <Text style={[styles.sectionTitle, { textAlign: mirror.textAlign }, textTokens(locale, 'title')]}>
            {translate(locale, 'partner.p20.title')}
          </Text>

          {validationError ? (
            <View style={styles.errorBanner} testID="p20-validation-error">
              <Text style={[styles.errorText, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>{validationError}</Text>
            </View>
          ) : null}

          {/* Category Picker */}
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
            {translate(locale, 'partner.p20.categoryLabel')}
          </Text>
          <View style={[styles.categoryGrid, { flexDirection: mirror.row }]}>
            {CATEGORIES.map((catKey) => {
              const isSelected = category === catKey;
              return (
                <TouchableOpacity
                  key={catKey}
                  testID={`p20-category-${catKey}`}
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
                      textTokens(locale, 'label'),
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

          {/* Job Reference */}
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
            {translate(locale, 'partner.p20.jobLabel')}
          </Text>
          <TextInput
            testID="p20-job-input"
            style={[styles.textInput, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}
            value={jobRef}
            onChangeText={setJobRef}
            placeholder={translate(locale, 'partner.p20.jobLabel')}
            placeholderTextColor={COLOR.textMuted}
          />

          {/* Description */}
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
            {translate(locale, 'partner.p20.descriptionLabel')}
          </Text>
          <TextInput
            testID="p20-description-input"
            style={[styles.textArea, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}
            value={description}
            onChangeText={setDescription}
            placeholder={translate(locale, 'partner.p20.descriptionPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            testID="p20-send-btn"
            style={styles.submitBtn}
            onPress={handleCreateCase}
            accessible={true}
            accessibilityRole="button"
          >
            <Text style={[styles.submitBtnText, textTokens(locale, 'body')]}>{translate(locale, 'partner.p20.sendBtn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Reply Modal */}
        <Modal
          visible={activeReplyCase !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveReplyCase(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent} testID="p20-reply-modal">
              <Text style={[styles.modalTitle, { textAlign: mirror.textAlign }, textTokens(locale, 'title')]}>
                {translate(locale, 'partner.p20.replyModalTitle')}
              </Text>
              <TextInput
                testID="p20-reply-input"
                style={[styles.modalInput, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder={translate(locale, 'partner.p20.replyPlaceholder')}
                placeholderTextColor={COLOR.textMuted}
                multiline
                numberOfLines={4}
              />
              <View style={[styles.modalActionsRow, { flexDirection: mirror.row }]}>
                <TouchableOpacity
                  testID="p20-reply-cancel-btn"
                  style={styles.modalCancelBtn}
                  onPress={() => setActiveReplyCase(null)}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Text style={[styles.modalCancelText, textTokens(locale, 'body')]}>{translate(locale, 'common.action.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="p20-reply-send-btn"
                  style={styles.modalSendBtn}
                  onPress={handleSendReply}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Text style={[styles.modalSendText, textTokens(locale, 'body')]}>
                    {translate(locale, 'partner.p20.replySendBtn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  container: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLOR.textMuted,
  },
  headerRow: {
    marginBottom: SPACING.md,
  },
  title: {
    color: COLOR.primary,
  },
  noticeBox: {
    backgroundColor: STATUS_THEME.info.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  noticeText: {
    color: STATUS_THEME.info.text,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
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
    fontWeight: '600',
    color: COLOR.text,
    flex: 1,
  },
  faqChevron: {
    color: COLOR.textMuted,
    marginLeft: SPACING.sm,
  },
  faqAnswer: {
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
    color: COLOR.textMuted,
  },
  caseCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  caseHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  caseNumber: {
    fontWeight: '700',
    color: COLOR.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusOpen: {
    backgroundColor: STATUS_THEME.info.background,
  },
  statusClosed: {
    backgroundColor: COLOR.background,
  },
  statusBadgeText: {
    fontWeight: '600',
    color: COLOR.text,
  },
  caseMetaRow: {
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  levelBadge: {
    backgroundColor: COLOR.background,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.textMuted,
  },
  categoryBadge: {
    backgroundColor: COLOR.background,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.textMuted,
  },
  bookingBadge: {
    backgroundColor: COLOR.background,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.textMuted,
  },
  caseSubject: {
    fontWeight: '600',
    color: COLOR.text,
    marginBottom: 2,
  },
  caseDescription: {
    color: COLOR.textMuted,
    marginBottom: SPACING.xs,
  },
  updatesContainer: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  updateBubble: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
  },
  updateAuthor: {
    fontWeight: '700',
    color: COLOR.primary,
  },
  updateText: {
    color: COLOR.text,
  },
  replyButton: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
  },
  replyButtonText: {
    color: COLOR.primary,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: STATUS_THEME.danger.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    fontWeight: '600',
  },
  inputLabel: {
    fontWeight: '600',
    color: COLOR.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  categoryGrid: {
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
    justifyContent: 'center',
    alignItems: 'center',
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
    color: COLOR.text,
    minHeight: 48,
  },
  textArea: {
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    color: COLOR.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: SPACING.md,
  },
  submitBtnText: {
    fontWeight: '700',
    color: COLOR.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLOR.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: COLOR.text,
    marginBottom: SPACING.md,
  },
  modalInput: {
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    color: COLOR.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  modalActionsRow: {
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  modalCancelBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: COLOR.textMuted,
  },
  modalSendBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSendText: {
    fontWeight: '700',
    color: COLOR.onPrimary,
  },
});
