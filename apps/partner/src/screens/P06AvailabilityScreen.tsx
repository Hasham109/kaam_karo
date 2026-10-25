/**
 * P06 — Working Hours & Schedule Screen (Task T4.2; BP §13 P06, BP §59.1, AVAIL-001..006, MATCH-ELIG-076).
 */
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
import type { DayOfWeek, WeeklyDaySchedule, WeeklySchedule } from '../types';
import { getAppMirroring } from '../utils/rtl';

function getDayName(locale: 'en' | 'ur', day: DayOfWeek): string {
  switch (day) {
    case 1:
      return translate(locale, 'partner.p06.dayMonday');
    case 2:
      return translate(locale, 'partner.p06.dayTuesday');
    case 3:
      return translate(locale, 'partner.p06.dayWednesday');
    case 4:
      return translate(locale, 'partner.p06.dayThursday');
    case 5:
      return translate(locale, 'partner.p06.dayFriday');
    case 6:
      return translate(locale, 'partner.p06.daySaturday');
    case 7:
      return translate(locale, 'partner.p06.daySunday');
  }
}

export function P06AvailabilityScreen() {
  const { locale, weeklySchedule, screenStates, updateWeeklySchedule, navigate, goBack } =
    usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P06;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const [schedule, setSchedule] = useState<WeeklySchedule>(weeklySchedule);
  const [maxJobsText, setMaxJobsText] = useState(
    schedule.maxActiveJobs !== undefined ? String(schedule.maxActiveJobs) : '3',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p06-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p06.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' && schedule.days.every((d) => !d.isWorking)) {
    return (
      <View style={styles.centerContainer} testID="p06-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p06.empty')}</Text>
      </View>
    );
  }

  const handleToggleDay = (dayOfWeek: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, isWorking: !d.isWorking } : d,
      ),
    }));
  };

  const handleTimeChange = (
    dayOfWeek: DayOfWeek,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d)),
    }));
  };

  const handleToggleEmergency = (dayOfWeek: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, isEmergency: !d.isEmergency } : d,
      ),
    }));
  };

  const handleAddDefaultBreak = (dayOfWeek: DayOfWeek) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const breaks = [...d.breaks];
        if (breaks.length === 0) {
          breaks.push({ start: '13:00', end: '14:00' });
        } else if (breaks.length === 1) {
          breaks.push({ start: '17:00', end: '17:30' });
        }
        return { ...d, breaks };
      }),
    }));
  };

  const handleSave = async () => {
    setErrorMessage(null);

    // Validate times: for each working day, endTime must be > startTime
    for (const d of schedule.days) {
      if (d.isWorking) {
        if (d.endTime <= d.startTime) {
          setErrorMessage(translate(locale, 'partner.p06.error'));
          return;
        }
      }
    }

    const parsedMaxJobs = maxJobsText.trim() ? Number.parseInt(maxJobsText, 10) : undefined;
    if (parsedMaxJobs !== undefined && (Number.isNaN(parsedMaxJobs) || parsedMaxJobs < 1)) {
      setErrorMessage(translate(locale, 'partner.p06.error'));
      return;
    }

    const updated: WeeklySchedule = {
      ...schedule,
      maxActiveJobs: parsedMaxJobs,
    };

    await updateWeeklySchedule(updated);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p06-availability-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p06-title"
        >
          {translate(locale, 'partner.p06.title')}
        </Text>
        <Text
          style={[styles.subtitle, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p06-subtitle"
        >
          {translate(locale, 'partner.p06.subtitle')}
        </Text>
      </View>

      {/* Success banner */}
      {currentState === 'success' && (
        <View style={styles.successBanner} testID="p06-success-banner">
          <Text style={[styles.successText, fontStyle]}>
            {translate(locale, 'partner.p06.saveSuccess')}
          </Text>
        </View>
      )}

      {/* Error banner */}
      {errorMessage && (
        <View style={styles.errorBanner} testID="p06-error-banner">
          <Text style={[styles.errorText, fontStyle]}>{errorMessage}</Text>
        </View>
      )}

      {/* Shortcuts to P23 and P22 */}
      <View style={[styles.shortcutsRow, { flexDirection: mirroring.row }]}>
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p06-to-p23-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p06.changeDatesBtn'),
          })}
          style={[styles.shortcutBtn, minTapTargetStyle()]}
          onPress={() => navigate('P23')}
        >
          <Text style={[styles.shortcutBtnText, fontStyle]}>
            {translate(locale, 'partner.p06.changeDatesBtn')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          {...interactiveProps({
            testID: 'p06-to-p22-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p06.liveStatusBtn'),
          })}
          style={[styles.shortcutBtn, minTapTargetStyle()]}
          onPress={() => navigate('P22')}
        >
          <Text style={[styles.shortcutBtnText, fontStyle]}>
            {translate(locale, 'partner.p06.liveStatusBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Days Schedule */}
      <View style={styles.daysContainer}>
        {schedule.days.map((dayItem: WeeklyDaySchedule) => (
          <View
            key={dayItem.dayOfWeek}
            style={styles.dayCard}
            testID={`p06-day-row-${dayItem.dayOfWeek}`}
          >
            <View style={[styles.dayHeader, { flexDirection: mirroring.row }]}>
              <Text style={[styles.dayTitle, fontStyle, { textAlign: mirroring.textAlign }]}>
                {getDayName(locale, dayItem.dayOfWeek)}
              </Text>
              <View style={[styles.dayToggleWrap, { flexDirection: mirroring.row }]}>
                <Text style={[styles.workingStatusLabel, fontStyle]}>
                  {dayItem.isWorking
                    ? translate(locale, 'partner.p06.working')
                    : translate(locale, 'partner.p06.off')}
                </Text>
                <Switch
                  testID={`p06-day-toggle-${dayItem.dayOfWeek}`}
                  value={dayItem.isWorking}
                  onValueChange={() => handleToggleDay(dayItem.dayOfWeek)}
                />
              </View>
            </View>

            {dayItem.isWorking && (
              <View style={styles.dayDetails}>
                {/* Working Hours From / To */}
                <View style={[styles.timeRow, { flexDirection: mirroring.row }]}>
                  <View style={styles.timeInputGroup}>
                    <Text style={[styles.timeLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                      {translate(locale, 'partner.p06.from')}
                    </Text>
                    <TextInput
                      style={[styles.timeInput, { textAlign: mirroring.textAlign }]}
                      testID={`p06-start-time-${dayItem.dayOfWeek}`}
                      value={dayItem.startTime}
                      onChangeText={(val) => handleTimeChange(dayItem.dayOfWeek, 'startTime', val)}
                    />
                  </View>
                  <View style={styles.timeInputGroup}>
                    <Text style={[styles.timeLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                      {translate(locale, 'partner.p06.to')}
                    </Text>
                    <TextInput
                      style={[styles.timeInput, { textAlign: mirroring.textAlign }]}
                      testID={`p06-end-time-${dayItem.dayOfWeek}`}
                      value={dayItem.endTime}
                      onChangeText={(val) => handleTimeChange(dayItem.dayOfWeek, 'endTime', val)}
                    />
                  </View>
                </View>

                {/* Breaks */}
                <View style={styles.breaksSection}>
                  {dayItem.breaks.map((b, idx) => (
                    <Text
                      key={idx}
                      style={[styles.breakText, fontStyle, { textAlign: mirroring.textAlign }]}
                    >
                      {translate(locale, 'partner.p06.break', {
                        start: b.start,
                        end: b.end,
                      })}
                    </Text>
                  ))}
                  <TouchableOpacity
                    {...interactiveProps({
                      testID: `p06-add-break-btn-${dayItem.dayOfWeek}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p06.addBreak'),
                    })}
                    style={[styles.addBreakBtn, minTapTargetStyle()]}
                    onPress={() => handleAddDefaultBreak(dayItem.dayOfWeek)}
                  >
                    <Text style={[styles.addBreakText, fontStyle]}>
                      {translate(locale, 'partner.p06.addBreak')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Emergency Toggle */}
                <View style={[styles.emergencyRow, { flexDirection: mirroring.row }]}>
                  <Text
                    style={[styles.emergencyLabel, fontStyle, { textAlign: mirroring.textAlign }]}
                  >
                    {translate(locale, 'partner.p06.emergencyToggle')}
                  </Text>
                  <Switch
                    testID={`p06-emergency-switch-${dayItem.dayOfWeek}`}
                    value={dayItem.isEmergency}
                    onValueChange={() => handleToggleEmergency(dayItem.dayOfWeek)}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Concurrent Max Active Jobs Capacity */}
      <View style={styles.capacitySection}>
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p06.maxJobsLabel')}
        </Text>
        <TextInput
          style={[styles.input, { textAlign: mirroring.textAlign }]}
          testID="p06-max-jobs-input"
          keyboardType="number-pad"
          value={maxJobsText}
          onChangeText={setMaxJobsText}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        {...interactiveProps({
          testID: 'p06-save-btn',
          accessibilityRole: 'button',
          accessibilityLabel: translate(locale, 'partner.p06.saveBtn'),
        })}
        style={[styles.saveBtn, minTapTargetStyle()]}
        onPress={handleSave}
      >
        <Text style={[styles.saveBtnText, fontStyle]}>
          {translate(locale, 'partner.p06.saveBtn')}
        </Text>
      </TouchableOpacity>

      {/* Back button */}
      <TouchableOpacity
        {...interactiveProps({
          testID: 'p06-back-btn',
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
  shortcutsRow: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: STATUS_THEME.info.background,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutBtnText: {
    color: COLOR.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  daysContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dayCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  dayHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.text,
  },
  dayToggleWrap: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  workingStatusLabel: {
    fontSize: 13,
    color: COLOR.textMuted,
  },
  dayDetails: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLOR.border,
    gap: SPACING.sm,
  },
  timeRow: {
    gap: SPACING.md,
  },
  timeInputGroup: {
    flex: 1,
    gap: 2,
  },
  timeLabel: {
    fontSize: 12,
    color: COLOR.textMuted,
  },
  timeInput: {
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: 14,
    color: COLOR.text,
  },
  breaksSection: {
    gap: 4,
    marginTop: 2,
  },
  breakText: {
    fontSize: 12,
    color: COLOR.textMuted,
  },
  addBreakBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  addBreakText: {
    fontSize: 12,
    color: COLOR.primary,
    fontWeight: '600',
  },
  emergencyRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  emergencyLabel: {
    fontSize: 13,
    color: COLOR.text,
    flex: 1,
  },
  capacitySection: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
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
  saveBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
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
