/**
 * Educational Pre-Prompt Permission Rationale Modal (BP §28, §74, §75; PERM-001..006).
 * Displayed strictly in-context on tap before triggering system permission prompt.
 * Contains "Continue" and "Not now" buttons. On "Not now", immediate fallback is used.
 */
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import {
  COLOR,
  interactiveProps,
  minTapTargetStyle,
  RADIUS,
  SPACING,
  textTokens,
} from '@kaamkaro/ui';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';
import type { PermissionKind } from '../types';

export interface PermissionModalProps {
  readonly visible: boolean;
  readonly kind: PermissionKind;
  readonly onContinue: () => void;
  readonly onCancel: () => void;
}

export function PermissionModal({
  visible,
  kind,
  onContinue,
  onCancel,
}: PermissionModalProps): React.JSX.Element | null {
  const { locale } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  if (!visible) return null;

  const titleText = translate(locale, 'customer.perm.prePromptTitle');

  const bodyKey =
    kind === 'location'
      ? 'customer.perm.location'
      : kind === 'camera'
        ? 'customer.perm.camera'
        : 'customer.perm.micNote';

  const bodyText = translate(locale, bodyKey);
  const continueText = translate(locale, 'customer.perm.prePromptContinue');
  const notNowText = translate(locale, 'customer.perm.prePromptNotNow');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      testID="permission-rationale-modal"
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.dialogCard, { alignItems: mirror.alignStart }]}
          testID="permission-rationale-card"
          accessibilityRole="alert"
        >
          <Text
            testID="perm-modal-title"
            style={[
              styles.dialogTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {titleText}
          </Text>

          <Text
            testID="perm-modal-body"
            style={[styles.dialogBody, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {bodyText}
          </Text>

          <View style={[styles.buttonRow, { flexDirection: mirror.row }]}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.notNowBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'perm-modal-notnow',
                accessibilityLabel: notNowText,
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.notNowText, textTokens(locale, 'label')]}>{notNowText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onContinue}
              style={[styles.continueBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'perm-modal-continue',
                accessibilityLabel: continueText,
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.continueText, textTokens(locale, 'label')]}>{continueText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLOR.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  dialogCard: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sheet,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  dialogTitle: {
    color: COLOR.text,
    marginBottom: SPACING.md,
  },
  dialogBody: {
    color: COLOR.textMuted,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  buttonRow: {
    width: '100%',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  notNowBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowText: {
    color: COLOR.textMuted,
  },
  continueBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLOR.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
});
