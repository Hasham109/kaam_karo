/**
 * P23 — Date-specific Availability Overrides (Task T4.2; BP §59.2, AVAIL-003, MATCH-ELIG-076, OQ-071).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import type { DateOverrideItem, OverrideKind } from '../types';
import { getAppMirroring } from '../utils/rtl';

const OVERRIDE_KINDS: { kind: OverrideKind; labelKey: `partner.p23.type${string}` }[] = [
  { kind: 'CLOSED', labelKey: 'partner.p23.typeClosed' },
  { kind: 'SPECIAL_HOURS', labelKey: 'partner.p23.typeSpecialHours' },
  { kind: 'LIMITED', labelKey: 'partner.p23.typeLimited' },
  { kind: 'FULLY_BOOKED', labelKey: 'partner.p23.typeFullyBooked' },
  { kind: 'OPEN', labelKey: 'partner.p23.typeOpen' },
];

function getKindLabel(locale: 'en' | 'ur', kind: OverrideKind): string {
  switch (kind) {
    case 'CLOSED':
      return translate(locale, 'partner.p23.typeClosed');
    case 'SPECIAL_HOURS':
      return translate(locale, 'partner.p23.typeSpecialHours');
    case 'LIMITED':
      return translate(locale, 'partner.p23.typeLimited');
    case 'FULLY_BOOKED':
      return translate(locale, 'partner.p23.typeFullyBooked');
    case 'OPEN':
      return translate(locale, 'partner.p23.typeOpen');
  }
}

export function P23DateOverridesScreen() {
  const { locale, dateOverrides, screenStates, addDateOverride, removeDateOverride, goBack } =
    usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P23;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const [dateText, setDateText] = useState('2026-11-01');
  const [overrideKind, setOverrideKind] = useState<OverrideKind>('CLOSED');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('16:00');
  const [maxJobsText, setMaxJobsText] = useState('2');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p23-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p23.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' && dateOverrides.length === 0) {
    return (
      <View style={styles.centerContainer} testID="p23-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p23.empty')}</Text>
      </View>
    );
  }

  const handleAddOverride = async () => {
    setErrorMessage(null);
    if (!dateText.trim()) {
      setErrorMessage(translate(locale, 'partner.p23.error'));
      return;
    }

    if (overrideKind === 'SPECIAL_HOURS' || overrideKind === 'OPEN') {
      if (endTime <= startTime) {
        setErrorMessage(translate(locale, 'partner.p23.error'));
        return;
      }
    }

    const maxJobsNum =
      overrideKind === 'LIMITED' ? Number.parseInt(maxJobsText, 10) || 1 : undefined;

    const newOverride: Omit<DateOverrideItem, 'id'> = {
      date: dateText.trim(),
      overrideKind,
      startTime:
        overrideKind === 'SPECIAL_HOURS' || overrideKind === 'OPEN' ? startTime : undefined,
      endTime: overrideKind === 'SPECIAL_HOURS' || overrideKind === 'OPEN' ? endTime : undefined,
      limitedMaxJobs: maxJobsNum,
    };

    await addDateOverride(newOverride);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p23-date-overrides-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p23-title"
        >
          {translate(locale, 'partner.p23.title')}
        </Text>
        <Text
          style={[styles.subtitle, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p23-subtitle"
        >
          {translate(locale, 'partner.p23.subtitle')}
        </Text>
      </View>

      {/* Success banner */}
      {currentState === 'success' && (
        <View style={styles.successBanner} testID="p23-success-banner">
          <Text style={[styles.successText, fontStyle]}>
            {translate(locale, 'partner.p23.saveSuccess', { date: dateText })}
          </Text>
        </View>
      )}

      {/* Error banner */}
      {errorMessage && (
        <View style={styles.errorBanner} testID="p23-error-banner">
          <Text style={[styles.errorText, fontStyle]}>{errorMessage}</Text>
        </View>
      )}

      {/* Existing Overrides List */}
      <View style={styles.section} testID="p23-overrides-list">
        <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p23.upcomingHeading')}
        </Text>

        {dateOverrides.map((item) => (
          <View key={item.id} style={styles.overrideCard} testID={`p23-override-card-${item.id}`}>
            <View style={[styles.cardHeader, { flexDirection: mirroring.row }]}>
              <Text style={[styles.dateText, fontStyle]}>{item.date}</Text>
              <View style={styles.kindChip}>
                <Text style={[styles.kindChipText, fontStyle]}>
                  {getKindLabel(locale, item.overrideKind)}
                </Text>
              </View>
            </View>

            {item.startTime && item.endTime && (
              <Text style={[styles.hoursDetail, fontStyle, { textAlign: mirroring.textAlign }]}>
                {item.startTime} – {item.endTime}
              </Text>
            )}

            {item.limitedMaxJobs !== undefined && (
              <Text style={[styles.hoursDetail, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p23.maxJobsLabel')}: {item.limitedMaxJobs}
              </Text>
            )}

            <TouchableOpacity
              {...interactiveProps({
                testID: `p23-remove-btn-${item.id}`,
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p23.removeBtn'),
              })}
              style={[styles.removeBtn, minTapTargetStyle()]}
              onPress={() => removeDateOverride(item.id)}
            >
              <Text style={[styles.removeBtnText, fontStyle]}>
                {translate(locale, 'partner.p23.removeBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Add New Override Form */}
      <View style={styles.formSection} testID="p23-add-override-form">
        <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p23.title')}
        </Text>

        {/* Date Input */}
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p23.dateLabel')}
        </Text>
        <TextInput
          style={[styles.input, { textAlign: mirroring.textAlign }]}
          testID="p23-date-input"
          value={dateText}
          onChangeText={setDateText}
        />

        {/* Override Type */}
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p23.overrideType')}
        </Text>
        <View style={[styles.chipsRow, { flexDirection: mirroring.row }]}>
          {OVERRIDE_KINDS.map((opt) => {
            const label = getKindLabel(locale, opt.kind);
            return (
              <TouchableOpacity
                key={opt.kind}
                {...interactiveProps({
                  testID: `p23-kind-chip-${opt.kind.toLowerCase()}`,
                  accessibilityRole: 'button',
                  accessibilityLabel: label,
                })}
                style={[
                  styles.kindSelectChip,
                  minTapTargetStyle(),
                  overrideKind === opt.kind && styles.kindSelectChipActive,
                ]}
                onPress={() => setOverrideKind(opt.kind)}
              >
                <Text
                  style={[
                    styles.kindSelectChipText,
                    fontStyle,
                    overrideKind === opt.kind && styles.kindSelectChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hours Range if Special Hours or Open */}
        {(overrideKind === 'SPECIAL_HOURS' || overrideKind === 'OPEN') && (
          <View style={styles.hoursSection}>
            <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
              {translate(locale, 'partner.p23.hoursLabel')}
            </Text>
            <View style={[styles.timeRow, { flexDirection: mirroring.row }]}>
              <TextInput
                style={[styles.timeInput, { textAlign: mirroring.textAlign }]}
                testID="p23-start-time-input"
                value={startTime}
                onChangeText={setStartTime}
              />
              <TextInput
                style={[styles.timeInput, { textAlign: mirroring.textAlign }]}
                testID="p23-end-time-input"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>
        )}

        {/* Max Jobs if Limited */}
        {overrideKind === 'LIMITED' && (
          <View style={styles.limitedSection}>
            <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
              {translate(locale, 'partner.p23.maxJobsLabel')}
            </Text>
            <TextInput
              style={[styles.input, { textAlign: mirroring.textAlign }]}
              testID="p23-max-jobs-input"
              keyboardType="number-pad"
              value={maxJobsText}
              onChangeText={setMaxJobsText}
            />
          </View>
        )}

        {/* Save Override Button */}
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p23-save-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p23.saveBtn'),
          })}
          style={[styles.saveBtn, minTapTargetStyle()]}
          onPress={handleAddOverride}
        >
          <Text style={[styles.saveBtnText, fontStyle]}>
            {translate(locale, 'partner.p23.saveBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Back button */}
      <TouchableOpacity
        {...interactiveProps({
          testID: 'p23-back-btn',
          accessibilityRole: 'button',
          accessibilityLabel: translate(locale, 'common.action.back'),
        })}
        style={[styles.backBtn, minTapTargetStyle()]}
        onPress={goBack}
      >
        <Text style={[styles.backBtnText, fontStyle]}>
          {translate(locale, 'common.action.back')}
        </Text>
      </TouchableOpacity>
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
  centerText: {
    fontSize: 15,
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    color: COLOR.text,
  },
  subtitle: {
    color: COLOR.textMuted,
    marginTop: 4,
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: '#15803d',
    fontSize: 14,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: 4,
  },
  overrideCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.xs,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.text,
  },
  kindChip: {
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  kindChipText: {
    fontSize: 12,
    color: COLOR.primary,
    fontWeight: '600',
  },
  hoursDetail: {
    fontSize: 13,
    color: COLOR.textMuted,
  },
  removeBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginTop: 2,
  },
  removeBtnText: {
    fontSize: 13,
    color: STATUS_THEME.danger.text,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
  },
  input: {
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLOR.text,
  },
  chipsRow: {
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  kindSelectChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  kindSelectChipActive: {
    backgroundColor: STATUS_THEME.info.background,
    borderColor: COLOR.primary,
  },
  kindSelectChipText: {
    fontSize: 13,
    color: COLOR.text,
  },
  kindSelectChipTextActive: {
    color: COLOR.primary,
    fontWeight: '700',
  },
  hoursSection: {
    gap: 4,
  },
  timeRow: {
    gap: SPACING.md,
  },
  timeInput: {
    flex: 1,
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLOR.text,
  },
  limitedSection: {
    gap: 4,
  },
  saveBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
