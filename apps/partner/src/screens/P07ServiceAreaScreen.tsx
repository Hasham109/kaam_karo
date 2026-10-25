/**
 * P07 — Service Area Screen (Task T4.2; BP §13 P07, BP §59.1, AVAIL-005, MATCH-ELIG-075, LOC-GEO-003, LOC-GEO-006, G2).
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
import type { ServiceAreaConfig } from '../types';
import { getAppMirroring } from '../utils/rtl';

const LAHORE_ZONES = [
  'Gulberg',
  'DHA',
  'Model Town',
  'Johar Town',
  'Cantt',
  'Faisal Town',
  'Wapda Town',
  'Bahria Town',
  'Iqbal Town',
] as const;

const RADIUS_OPTIONS = [5, 10, 15, 20, 25] as const;

export function P07ServiceAreaScreen() {
  const { locale, serviceArea, screenStates, updateServiceArea, goBack } = usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P07;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const [centerName, setCenterName] = useState(serviceArea.center.name);
  const [radiusKm, setRadiusKm] = useState(serviceArea.radiusKm);
  const [selectedZones, setSelectedZones] = useState<string[]>(serviceArea.selectedZones);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p07-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p07.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' && selectedZones.length === 0) {
    return (
      <View style={styles.centerContainer} testID="p07-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p07.empty')}</Text>
      </View>
    );
  }

  const handleToggleZone = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone],
    );
  };

  const handleSave = async () => {
    setErrorMessage(null);
    if (!centerName.trim()) {
      setErrorMessage(translate(locale, 'partner.p07.error'));
      return;
    }

    const updated: ServiceAreaConfig = {
      center: {
        name: centerName.trim(),
        latitude: serviceArea.center.latitude,
        longitude: serviceArea.center.longitude,
      },
      radiusKm,
      selectedZones,
    };

    await updateServiceArea(updated);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p07-service-area-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p07-title"
        >
          {translate(locale, 'partner.p07.title')}
        </Text>
        <Text
          style={[styles.subtitle, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p07-subtitle"
        >
          {translate(locale, 'partner.p07.subtitle')}
        </Text>
      </View>

      {/* Success banner */}
      {currentState === 'success' && (
        <View style={styles.successBanner} testID="p07-success-banner">
          <Text style={[styles.successText, fontStyle]}>
            {translate(locale, 'partner.p07.saveSuccess')}
          </Text>
        </View>
      )}

      {/* Error banner */}
      {errorMessage && (
        <View style={styles.errorBanner} testID="p07-error-banner">
          <Text style={[styles.errorText, fontStyle]}>{errorMessage}</Text>
        </View>
      )}

      {/* Coverage Preview Card */}
      <View style={styles.previewCard} testID="p07-coverage-preview">
        <Text style={[styles.previewHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p07.coveragePreview', {
            area: centerName || 'Lahore',
            km: radiusKm,
          })}
        </Text>
      </View>

      {/* Center Search / Start Location */}
      <View style={styles.section}>
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p07.startLocation')}
        </Text>
        <TextInput
          style={[styles.input, { textAlign: mirroring.textAlign }]}
          testID="p07-search-input"
          placeholder={translate(locale, 'partner.p07.searchPlaceholder')}
          placeholderTextColor={COLOR.textMuted}
          value={centerName}
          onChangeText={setCenterName}
        />
      </View>

      {/* Service Radius */}
      <View style={styles.section}>
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p07.radiusLabel', { km: radiusKm })}
        </Text>
        <View style={[styles.chipsRow, { flexDirection: mirroring.row }]}>
          {RADIUS_OPTIONS.map((km) => (
            <TouchableOpacity
              key={km}
              {...interactiveProps({
                testID: `p07-radius-chip-${km}`,
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p07.kmUnit', { km }),
              })}
              style={[
                styles.radiusChip,
                minTapTargetStyle(),
                radiusKm === km && styles.radiusChipSelected,
              ]}
              onPress={() => setRadiusKm(km)}
            >
              <Text
                style={[
                  styles.radiusChipText,
                  fontStyle,
                  radiusKm === km && styles.radiusChipTextSelected,
                ]}
              >
                {translate(locale, 'partner.p07.kmUnit', { km })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lahore Zones Multi-Select */}
      <View style={styles.section}>
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p07.zonesHeading')}
        </Text>
        <View style={[styles.chipsRow, { flexDirection: mirroring.row }]}>
          {LAHORE_ZONES.map((zone) => {
            const isSelected = selectedZones.includes(zone);
            return (
              <TouchableOpacity
                key={zone}
                {...interactiveProps({
                  testID: `p07-zone-chip-${zone.toLowerCase().replace(/\s+/g, '-')}`,
                  accessibilityRole: 'button',
                  accessibilityLabel: zone,
                  accessibilityState: { checked: isSelected },
                })}
                style={[
                  styles.zoneChip,
                  minTapTargetStyle(),
                  isSelected && styles.zoneChipSelected,
                ]}
                onPress={() => handleToggleZone(zone)}
              >
                <Text
                  style={[
                    styles.zoneChipText,
                    fontStyle,
                    isSelected && styles.zoneChipTextSelected,
                  ]}
                >
                  {zone}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        {...interactiveProps({
          testID: 'p07-save-btn',
          accessibilityRole: 'button',
          accessibilityLabel: translate(locale, 'partner.p07.saveBtn'),
        })}
        style={[styles.saveBtn, minTapTargetStyle()]}
        onPress={handleSave}
      >
        <Text style={[styles.saveBtnText, fontStyle]}>
          {translate(locale, 'partner.p07.saveBtn')}
        </Text>
      </TouchableOpacity>

      {/* Back button */}
      <TouchableOpacity
        {...interactiveProps({
          testID: 'p07-back-btn',
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
  previewCard: {
    backgroundColor: STATUS_THEME.info.background,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  previewHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.primary,
  },
  section: {
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
  chipsRow: {
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: 4,
  },
  radiusChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radiusChipSelected: {
    backgroundColor: STATUS_THEME.info.background,
    borderColor: COLOR.primary,
  },
  radiusChipText: {
    fontSize: 13,
    color: COLOR.text,
  },
  radiusChipTextSelected: {
    color: COLOR.primary,
    fontWeight: '700',
  },
  zoneChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  zoneChipSelected: {
    backgroundColor: STATUS_THEME.info.background,
    borderColor: COLOR.primary,
  },
  zoneChipText: {
    fontSize: 13,
    color: COLOR.text,
  },
  zoneChipTextSelected: {
    color: COLOR.primary,
    fontWeight: '700',
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
