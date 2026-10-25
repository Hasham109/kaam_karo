/**
 * P10 — Accept / Decline Action Sheet Modal (Task T4.3; BP §13 P10, BP §62.2, BP §85, D-004, PROV-CREW-001..002, PROV-CREW-005).
 */
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { getAppMirroring } from '../utils/rtl';

export function P10ActionSheet() {
  const { locale, selectedJob, activeActionSheet, setActiveActionSheet, acceptJob, declineJob } =
    usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const [crewSize, setCrewSize] = useState<number>(1);

  if (!activeActionSheet || !selectedJob) {
    return null;
  }

  const handleIncrement = () => {
    setCrewSize((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setCrewSize((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleConfirmAccept = async () => {
    await acceptJob(selectedJob.id, crewSize);
  };

  const handleConfirmDecline = async () => {
    await declineJob(selectedJob.id);
  };

  const handleClose = () => {
    setActiveActionSheet(null);
  };

  return (
    <Modal
      visible={activeActionSheet !== null}
      transparent
      animationType="slide"
      testID="p10-action-sheet-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer} testID="p10-sheet-content">
          {activeActionSheet === 'ACCEPT' ? (
            <View style={styles.section} testID="p10-accept-section">
              <Text
                style={[
                  styles.sheetTitle,
                  headlineTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
                testID="p10-crew-title"
              >
                {translate(locale, 'partner.p10.crewTitle')}
              </Text>

              {/* Crew Size Stepper */}
              <View style={[styles.stepperRow, { flexDirection: mirroring.row }]}>
                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p10-crew-decrement-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: 'Decrease workers count',
                  })}
                  style={[styles.stepperBtn, minTapTargetStyle()]}
                  onPress={handleDecrement}
                >
                  <Text style={[styles.stepperBtnText, fontStyle]}>−</Text>
                </TouchableOpacity>

                <View style={styles.stepperDisplay}>
                  <Text style={[styles.stepperValueText, fontStyle]} testID="p10-crew-size-value">
                    {crewSize}
                  </Text>
                </View>

                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p10-crew-increment-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: 'Increase workers count',
                  })}
                  style={[styles.stepperBtn, minTapTargetStyle()]}
                  onPress={handleIncrement}
                >
                  <Text style={[styles.stepperBtnText, fontStyle]}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Crew Price Note (Crew size NEVER changes the price; D-018, PROV-CREW-005) */}
              <Text
                style={[
                  styles.priceNote,
                  bodyTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
                testID="p10-crew-price-note"
              >
                {translate(locale, 'partner.p10.crewPriceNote')}
              </Text>

              {/* Confirm Accept Button */}
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p10-confirm-accept-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p10.confirmAcceptBtn', {
                    count: crewSize,
                  }),
                })}
                style={[styles.primaryActionBtn, minTapTargetStyle()]}
                onPress={handleConfirmAccept}
              >
                <Text style={[styles.primaryActionBtnText, fontStyle]}>
                  {translate(locale, 'partner.p10.confirmAcceptBtn', {
                    count: crewSize,
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section} testID="p10-decline-section">
              <Text
                style={[
                  styles.sheetTitle,
                  headlineTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
                testID="p10-decline-title"
              >
                {translate(locale, 'partner.p10.declineTitle')}
              </Text>

              {/* Confirm Decline Button */}
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p10-confirm-decline-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p10.confirmDeclineBtn'),
                })}
                style={[styles.dangerActionBtn, minTapTargetStyle()]}
                onPress={handleConfirmDecline}
              >
                <Text style={[styles.dangerActionBtnText, fontStyle]}>
                  {translate(locale, 'partner.p10.confirmDeclineBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dismiss / Cancel Button */}
          <TouchableOpacity
            {...interactiveProps({
              testID: 'p10-cancel-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p10.cancelBtn'),
            })}
            style={[styles.cancelBtn, minTapTargetStyle()]}
            onPress={handleClose}
          >
            <Text style={[styles.cancelBtnText, fontStyle]}>
              {translate(locale, 'partner.p10.cancelBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLOR.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.md,
  },
  sheetTitle: {
    color: COLOR.text,
  },
  stepperRow: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: STATUS_THEME.info.background,
    borderWidth: 1,
    borderColor: COLOR.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.primary,
  },
  stepperDisplay: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLOR.text,
  },
  priceNote: {
    fontSize: 13,
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  primaryActionBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  dangerActionBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: STATUS_THEME.danger.text,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerActionBtnText: {
    color: STATUS_THEME.danger.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
