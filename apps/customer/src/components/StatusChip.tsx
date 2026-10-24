/**
 * StatusChip — renders booking status or verification badge (BP §15; ARCH §6.1; A11Y-003).
 * Always includes text and icon, NEVER colour alone.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bookingStatusLabel, type BookingStatus, type Locale, translate } from '@kaamkaro/i18n';
import { getStatusVisual, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import type { VerificationLevel } from '../types';

interface BookingStatusChipProps {
  readonly status: BookingStatus;
  readonly locale: Locale;
  readonly testID?: string;
}

export function BookingStatusChip({
  status,
  locale,
  testID,
}: BookingStatusChipProps): React.JSX.Element {
  const labelObj = bookingStatusLabel(locale, 'customer', status);
  const label = labelObj.text;
  const visual = getStatusVisual(status);

  return (
    <View
      testID={testID}
      style={[
        styles.chip,
        {
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={translate(locale, 'common.a11y.status', { status: label })}
    >
      <Text style={[styles.iconText, { color: visual.textColor }]}>●</Text>
      <Text style={[styles.labelText, textTokens(locale, 'label'), { color: visual.textColor }]}>
        {label}
      </Text>
    </View>
  );
}

interface VerificationBadgeProps {
  readonly level: VerificationLevel;
  readonly locale: Locale;
  readonly testID?: string;
}

export function VerificationBadge({
  level,
  locale,
  testID,
}: VerificationBadgeProps): React.JSX.Element {
  let labelKey:
    | 'customer.c11.verifiedBasic'
    | 'customer.c11.verifiedVerified'
    | 'customer.c11.verifiedBusiness';
  let isBusiness = false;

  switch (level) {
    case 'BASIC':
      labelKey = 'customer.c11.verifiedBasic';
      break;
    case 'BUSINESS_VERIFIED':
      labelKey = 'customer.c11.verifiedBusiness';
      isBusiness = true;
      break;
    case 'VERIFIED':
    default:
      labelKey = 'customer.c11.verifiedVerified';
      break;
  }

  const label = translate(locale, labelKey);

  return (
    <View
      testID={testID}
      style={[styles.chip, isBusiness ? styles.businessChip : styles.verifiedChip]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text style={isBusiness ? styles.businessIcon : styles.verifiedIcon}>✓</Text>
      <Text
        style={[
          styles.labelText,
          textTokens(locale, 'label'),
          isBusiness ? styles.businessText : styles.verifiedText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  iconText: {
    fontSize: 10,
  },
  labelText: {
    fontWeight: '600',
  },
  verifiedChip: {
    backgroundColor: '#E6F4EA',
    borderColor: '#137333',
  },
  verifiedIcon: {
    color: '#0D6832',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verifiedText: {
    color: '#0D6832',
  },
  businessChip: {
    backgroundColor: '#E8F0FE',
    borderColor: '#1A73E8',
  },
  businessIcon: {
    color: '#0B5CAD',
    fontSize: 12,
    fontWeight: 'bold',
  },
  businessText: {
    color: '#0B5CAD',
  },
});
