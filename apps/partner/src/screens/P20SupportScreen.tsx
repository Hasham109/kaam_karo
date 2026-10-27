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
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
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
  initialState = 'CONTENT',
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
  const [replySuccessNotice, setReplySuccessNotice] = useState<string | null>(null);

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
    setScreenState('LOADING');

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
      setScreenState('CONTENT');
      onCaseCreated?.(newCase);
    }, 400);
  };

  const handleOpenReply = (c: PartnerSupportCase) => {
    setActiveReplyCase(c);
    setReplyMessage('');
    setReplySuccessNotice(null);
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

  if (screenState === 'LOADING') {
    return (
      <View style={styles.loadingContainer} testID="p20-support-screen">
        <Text style={[styles.loadingText, mirror.textAlign]}>
          {translate(locale, 'partner.p20.pending')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} testID="p20-support-screen">
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.headerRow, mirror.flexRow]}>
          <Text style={[styles.title, mirror.textAlign]}>
            {translate(locale, 'partner.p20.title')}
          </Text>
        </View>

        {/* Success Notice */}
        {successNotice ? (
          <View style={styles.noticeBox} testID="p20-success-notice">
            <Text style={[styles.noticeText, mirror.textAlign]}>{successNotice}</Text>
          </View>
        ) : null}

        {/* Section 1: Help Articles / FAQ */}
        <View style={styles.section} testID="p20-faq-section">
          <Text style={[styles.sectionTitle, mirror.textAlign]}>
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
                <View style={[styles.faqHeader, mirror.flexRow]}>
                  <Text style={[styles.faqQuestion, mirror.textAlign]}>{q}</Text>
                  <Text style={styles.faqChevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
                {isExpanded ? <Text style={[styles.faqAnswer, mirror.textAlign]}>{a}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Section 2: My Cases */}
        <View style={styles.section} testID="p20-cases-section">
          <Text style={[styles.sectionTitle, mirror.textAlign]}>
            {translate(locale, 'partner.p20.myCasesHeader')}
          </Text>
          {cases.length === 0 ? (
            <View style={styles.emptyCard} testID="p20-empty-cases">
              <Text style={[styles.emptyText, mirror.textAlign]}>
                {translate(locale, 'partner.p20.emptyCases')}
              </Text>
            </View>
          ) : (
            cases.map((c) => (
              <View key={c.id} style={styles.caseCard} testID={`p20-case-item-${c.id}`}>
                <View style={[styles.caseHeader, mirror.flexRow]}>
                  <Text style={styles.caseNumber}>
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
                    <Text style={styles.statusBadgeText}>
                      {c.status === 'CLOSED' || c.status === 'RESOLVED'
                        ? translate(locale, 'partner.p20.statusClosed')
                        : translate(locale, 'partner.p20.statusOpen')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.caseMetaRow, mirror.flexRow]}>
                  <Text style={styles.levelBadge}>
                    {translate(locale, 'partner.p20.levelPrefix', {
                      level: c.level,
                    })}
                  </Text>
                  <Text style={styles.categoryBadge}>{c.category}</Text>
                  {c.bookingId ? <Text style={styles.bookingBadge}>#{c.bookingId}</Text> : null}
                </View>

                <Text style={[styles.caseSubject, mirror.textAlign]}>{c.subject}</Text>
                <Text style={[styles.caseDescription, mirror.textAlign]}>{c.description}</Text>

                {/* Updates Thread */}
                {c.updates.length > 0 ? (
                  <View style={styles.updatesContainer}>
                    {c.updates.map((up) => (
                      <View key={up.id} style={styles.updateBubble}>
                        <Text style={styles.updateAuthor}>{up.authorRole}:</Text>
                        <Text style={styles.updateText}>{up.message}</Text>
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
                    <Text style={styles.replyButtonText}>
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
          <Text style={[styles.sectionTitle, mirror.textAlign]}>
            {translate(locale, 'partner.p20.title')}
          </Text>

          {validationError ? (
            <View style={styles.errorBanner} testID="p20-validation-error">
              <Text style={[styles.errorText, mirror.textAlign]}>{validationError}</Text>
            </View>
          ) : null}

          {/* Category Picker */}
          <Text style={[styles.inputLabel, mirror.textAlign]}>
            {translate(locale, 'partner.p20.categoryLabel')}
          </Text>
          <View style={[styles.categoryGrid, mirror.flexRow]}>
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
          <Text style={[styles.inputLabel, mirror.textAlign]}>
            {translate(locale, 'partner.p20.jobLabel')}
          </Text>
          <TextInput
            testID="p20-job-input"
            style={[styles.textInput, mirror.textAlign]}
            value={jobRef}
            onChangeText={setJobRef}
            placeholder={translate(locale, 'partner.p20.jobLabel')}
            placeholderTextColor={COLOR.mutedText}
          />

          {/* Description */}
          <Text style={[styles.inputLabel, mirror.textAlign]}>
            {translate(locale, 'partner.p20.descriptionLabel')}
          </Text>
          <TextInput
            testID="p20-description-input"
            style={[styles.textArea, mirror.textAlign]}
            value={description}
            onChangeText={setDescription}
            placeholder={translate(locale, 'partner.p20.descriptionPlaceholder')}
            placeholderTextColor={COLOR.mutedText}
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
            <Text style={styles.submitBtnText}>{translate(locale, 'partner.p20.sendBtn')}</Text>
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
              <Text style={[styles.modalTitle, mirror.textAlign]}>
                {translate(locale, 'partner.p20.replyModalTitle')}
              </Text>
              <TextInput
                testID="p20-reply-input"
                style={[styles.modalInput, mirror.textAlign]}
                value={replyMessage}
                onChangeText={setReplyMessage}
                placeholder={translate(locale, 'partner.p20.replyPlaceholder')}
                placeholderTextColor={COLOR.mutedText}
                multiline
                numberOfLines={4}
              />
              <View style={[styles.modalActionsRow, mirror.flexRow]}>
                <TouchableOpacity
                  testID="p20-reply-cancel-btn"
                  style={styles.modalCancelBtn}
                  onPress={() => setActiveReplyCase(null)}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalCancelText}>{translate(locale, 'common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="p20-reply-send-btn"
                  style={styles.modalSendBtn}
                  onPress={handleSendReply}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalSendText}>
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
    ...textTokens.body,
    color: COLOR.mutedText,
  },
  headerRow: {
    marginBottom: SPACING.md,
  },
  title: {
    ...textTokens.title,
    color: COLOR.primary,
  },
  noticeBox: {
    backgroundColor: COLOR.primaryLight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  noticeText: {
    ...textTokens.body,
    color: COLOR.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...textTokens.h2,
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  faqCard: {
    backgroundColor: COLOR.card,
    borderRadius: RADIUS.md,
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
    ...textTokens.body,
    fontWeight: '600',
    color: COLOR.text,
    flex: 1,
  },
  faqChevron: {
    ...textTokens.body,
    color: COLOR.mutedText,
    marginLeft: SPACING.sm,
  },
  faqAnswer: {
    ...textTokens.body,
    color: COLOR.mutedText,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: COLOR.card,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
  },
  emptyText: {
    ...textTokens.body,
    color: COLOR.mutedText,
  },
  caseCard: {
    backgroundColor: COLOR.card,
    borderRadius: RADIUS.md,
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
    ...textTokens.caption,
    fontWeight: '700',
    color: COLOR.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusOpen: {
    backgroundColor: COLOR.primaryLight,
  },
  statusClosed: {
    backgroundColor: COLOR.mutedBg,
  },
  statusBadgeText: {
    ...textTokens.caption,
    fontWeight: '600',
    color: COLOR.text,
  },
  caseMetaRow: {
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  levelBadge: {
    ...textTokens.caption,
    backgroundColor: COLOR.mutedBg,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.mutedText,
  },
  categoryBadge: {
    ...textTokens.caption,
    backgroundColor: COLOR.mutedBg,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.mutedText,
  },
  bookingBadge: {
    ...textTokens.caption,
    backgroundColor: COLOR.mutedBg,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    color: COLOR.mutedText,
  },
  caseSubject: {
    ...textTokens.body,
    fontWeight: '600',
    color: COLOR.text,
    marginBottom: 2,
  },
  caseDescription: {
    ...textTokens.caption,
    color: COLOR.mutedText,
    marginBottom: SPACING.xs,
  },
  updatesContainer: {
    backgroundColor: COLOR.mutedBg,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  updateBubble: {
    backgroundColor: COLOR.card,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
  },
  updateAuthor: {
    ...textTokens.caption,
    fontWeight: '700',
    color: COLOR.primary,
  },
  updateText: {
    ...textTokens.caption,
    color: COLOR.text,
  },
  replyButton: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
  },
  replyButtonText: {
    ...textTokens.caption,
    color: COLOR.primary,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: COLOR.dangerLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    ...textTokens.caption,
    color: COLOR.danger,
    fontWeight: '600',
  },
  inputLabel: {
    ...textTokens.caption,
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
    borderRadius: RADIUS.md,
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
    backgroundColor: COLOR.card,
    borderColor: COLOR.border,
  },
  categoryPillText: {
    ...textTokens.caption,
    fontWeight: '600',
  },
  categoryPillTextSelected: {
    color: COLOR.white,
  },
  categoryPillTextUnselected: {
    color: COLOR.text,
  },
  textInput: {
    backgroundColor: COLOR.card,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...textTokens.body,
    color: COLOR.text,
    minHeight: 48,
  },
  textArea: {
    backgroundColor: COLOR.card,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...textTokens.body,
    color: COLOR.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: SPACING.md,
  },
  submitBtnText: {
    ...textTokens.body,
    fontWeight: '700',
    color: COLOR.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLOR.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...textTokens.h2,
    color: COLOR.text,
    marginBottom: SPACING.md,
  },
  modalInput: {
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...textTokens.body,
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
    ...textTokens.body,
    color: COLOR.mutedText,
  },
  modalSendBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSendText: {
    ...textTokens.body,
    fontWeight: '700',
    color: COLOR.white,
  },
});
