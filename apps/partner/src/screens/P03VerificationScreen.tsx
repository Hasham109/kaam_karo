/**
 * P03 — Provider Verification & Document Upload Screen (Task T4.1; BP §13 P03, §22; TRUST-VER-001..003, PROV-CREW-006, M-11).
 */
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import {
  COLOR,
  RADIUS,
  SPACING,
  STATUS_THEME,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import type { DocumentItem, DocumentType } from '../types';
import { getAppMirroring } from '../utils/rtl';

export function P03VerificationScreen() {
  const {
    locale,
    profile,
    documents,
    screenStates,
    uploadDocument,
    replaceDocument,
    submitVerification,
  } = usePartner();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P03;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const levelName =
    profile?.verificationLevel === 'VERIFIED'
      ? translate(locale, 'partner.p03.levelVerified')
      : profile?.verificationLevel === 'BUSINESS_VERIFIED'
        ? translate(locale, 'partner.p03.levelBusinessVerified')
        : translate(locale, 'partner.p03.levelBasic');

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p03-loading-view">
        <Text style={[styles.loadingText, fontStyle]}>
          {translate(locale, 'partner.p03.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' && documents.length === 0) {
    return (
      <View style={styles.centerContainer} testID="p03-empty-view">
        <Text style={[styles.emptyText, fontStyle]}>{translate(locale, 'partner.p03.empty')}</Text>
      </View>
    );
  }

  const handleUpload = async (docId: DocumentType) => {
    setErrorMessage(null);
    await uploadDocument(docId);
  };

  const handleReplace = async (docId: DocumentType) => {
    setErrorMessage(null);
    await replaceDocument(docId);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const requiredDocs = documents.filter((d) => d.required);
    const missingDocs = requiredDocs.filter((d) => d.status === 'NOT_UPLOADED');
    if (missingDocs.length > 0) {
      setErrorMessage(translate(locale, 'partner.p03.allDocsRequired'));
      return;
    }
    await submitVerification();
  };

  const renderStatusChip = (status: DocumentItem['status']) => {
    let chipStyle;
    let labelKey:
      | 'partner.p03.statusNotUploaded'
      | 'partner.p03.statusUploaded'
      | 'partner.p03.statusUnderReview'
      | 'partner.p03.statusAccepted'
      | 'partner.p03.statusNeedsAction';

    switch (status) {
      case 'UPLOADED':
        chipStyle = styles.statusChipInfo;
        labelKey = 'partner.p03.statusUploaded';
        break;
      case 'UNDER_REVIEW':
        chipStyle = styles.statusChipWarning;
        labelKey = 'partner.p03.statusUnderReview';
        break;
      case 'ACCEPTED':
        chipStyle = styles.statusChipSuccess;
        labelKey = 'partner.p03.statusAccepted';
        break;
      case 'NEEDS_ACTION':
        chipStyle = styles.statusChipDanger;
        labelKey = 'partner.p03.statusNeedsAction';
        break;
      default:
        chipStyle = styles.statusChipNeutral;
        labelKey = 'partner.p03.statusNotUploaded';
    }

    return (
      <View style={[styles.statusChip, chipStyle]}>
        <Text style={[styles.statusChipText, fontStyle]}>{translate(locale, labelKey)}</Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p03-verification-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p03-title"
        >
          {translate(locale, 'partner.p03.title')}
        </Text>

        <Text
          style={[styles.subtitle, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p03-subtitle"
        >
          {translate(locale, 'partner.p03.subtitle')}
        </Text>

        {/* Current Level Chip */}
        <View
          style={[styles.levelBadgeContainer, { flexDirection: mirroring.row }]}
          testID="p03-level-chip"
        >
          <Text style={[styles.levelLabel, fontStyle]}>
            {translate(locale, 'partner.p03.levelLabel', { level: levelName })}
          </Text>
        </View>

        {/* Team Leader Note (D-018) */}
        <View style={styles.teamLeaderBanner} testID="p03-team-leader-note">
          <Text style={[styles.teamLeaderText, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p03.teamLeaderNote')}
          </Text>
        </View>
      </View>

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner} testID="p03-error-banner">
          <Text style={[styles.errorText, fontStyle]}>{errorMessage}</Text>
        </View>
      )}

      {/* Required Documents Section */}
      <View style={styles.docsSection} testID="p03-docs-section">
        <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p03.requiredDocsHeading')}
        </Text>

        {documents.map((doc) => {
          const testIdSuffix = doc.id.toLowerCase().replace(/_/g, '-');
          return (
            <View key={doc.id} style={styles.docCard} testID={`p03-doc-card-${testIdSuffix}`}>
              <View style={[styles.docHeader, { flexDirection: mirroring.row }]}>
                <View style={styles.docTitleBlock}>
                  <Text style={[styles.docTitle, fontStyle, { textAlign: mirroring.textAlign }]}>
                    {translate(locale, doc.titleKey)}
                  </Text>
                  {doc.required && <Text style={[styles.requiredBadge, fontStyle]}>*</Text>}
                </View>
                {renderStatusChip(doc.status)}
              </View>

              {doc.fileName && (
                <Text
                  style={[styles.fileHint, { textAlign: mirroring.textAlign }]}
                  testID={`p03-file-hint-${testIdSuffix}`}
                >
                  {translate(locale, 'partner.p03.fileSize', {
                    fileName: doc.fileName,
                    sizeMb: doc.fileSizeMb ?? 0,
                  })}
                </Text>
              )}

              {doc.reviewerNote && (
                <View style={styles.reviewerNoteBox} testID={`p03-reviewer-note-${testIdSuffix}`}>
                  <Text
                    style={[styles.reviewerNoteText, fontStyle, { textAlign: mirroring.textAlign }]}
                  >
                    {translate(locale, 'partner.p03.reviewerNote', {
                      text: doc.reviewerNote,
                    })}
                  </Text>
                </View>
              )}

              <View style={[styles.docActionRow, { flexDirection: mirroring.row }]}>
                {doc.status === 'NOT_UPLOADED' ? (
                  <TouchableOpacity
                    {...interactiveProps({
                      testID: `p03-upload-${testIdSuffix}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p03.uploadDoc'),
                    })}
                    style={[styles.uploadBtn, minTapTargetStyle()]}
                    onPress={() => handleUpload(doc.id)}
                  >
                    <Text style={[styles.uploadBtnText, fontStyle]}>
                      {translate(locale, 'partner.p03.uploadDoc')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    {...interactiveProps({
                      testID: `p03-replace-${testIdSuffix}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p03.replaceDoc'),
                    })}
                    style={[styles.replaceBtn, minTapTargetStyle()]}
                    onPress={() => handleReplace(doc.id)}
                  >
                    <Text style={[styles.replaceBtnText, fontStyle]}>
                      {translate(locale, 'partner.p03.replaceDoc')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Main Submit Button (BP §10 step 32) */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p03-submit-review',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p03.submitReview'),
          })}
          style={[styles.submitBtn, minTapTargetStyle()]}
          onPress={handleSubmit}
        >
          <Text style={[styles.submitBtnText, fontStyle]}>
            {translate(locale, 'partner.p03.submitReview')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLOR.background,
  },
  loadingText: {
    fontSize: 16,
    color: COLOR.textMuted,
  },
  emptyText: {
    fontSize: 15,
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLOR.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.textMuted,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  levelBadgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    marginBottom: SPACING.sm,
  },
  levelLabel: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  teamLeaderBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  teamLeaderText: {
    fontSize: 13,
    color: '#1e40af',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    fontSize: 14,
    textAlign: 'center',
  },
  docsSection: {
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  docCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  docHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  docTitleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.text,
  },
  requiredBadge: {
    color: STATUS_THEME.danger.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusChipNeutral: {
    backgroundColor: '#f3f4f6',
  },
  statusChipInfo: {
    backgroundColor: '#e0f2fe',
  },
  statusChipWarning: {
    backgroundColor: '#fef3c7',
  },
  statusChipSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusChipDanger: {
    backgroundColor: '#fee2e2',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.text,
  },
  fileHint: {
    fontSize: 13,
    color: COLOR.textMuted,
    marginVertical: SPACING.xs,
  },
  reviewerNoteBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    marginVertical: SPACING.xs,
  },
  reviewerNoteText: {
    fontSize: 12,
    color: '#92400e',
  },
  docActionRow: {
    marginTop: SPACING.sm,
    justifyContent: 'flex-end',
  },
  uploadBtn: {
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  replaceBtn: {
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replaceBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: SPACING.md,
  },
  submitBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
