/**
 * C39 Location Confirm Screen (BP §57.1, §57.3; ARCH §3.1; docs/screens/customer.md).
 * Purpose: detected address, map pin, search, saved addresses, manual entry fallback.
 * Requirement IDs: LOC-GEO-001..006, PROF-ADDR-001, PROF-ADDR-003, SCOPE-GEO-001, PERM-001, A11Y-006.
 */
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { translate } from '@kaamkaro/i18n';
import {
  COLOR,
  interactiveProps,
  minTapTargetStyle,
  RADIUS,
  SPACING,
  STATUS_THEME,
  textTokens,
} from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { PermissionModal } from '../components/PermissionModal';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';
import type { LocationSnapshot, ScreenState } from '../types';

interface SavedAddressItem {
  readonly id: string;
  readonly label: string;
  readonly address: string;
  readonly area: string;
}

const MOCK_SAVED_ADDRESSES: readonly SavedAddressItem[] = [
  {
    id: 'addr-1',
    label: 'Home',
    address: 'House 14, Block B, Model Town',
    area: 'Model Town',
  },
  {
    id: 'addr-2',
    label: 'Office',
    address: 'Suite 402, Arfa Tower, Ferozepur Road',
    area: 'Gulberg',
  },
];

export function C39LocationConfirmScreen(): React.JSX.Element {
  const {
    locale,
    selectedCity,
    draft,
    updateDraft,
    goBack,
    permissionStatus,
    setPermissionStatus,
  } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [screenState, setScreenState] = useState<ScreenState>('E');
  const [showPermModal, setShowPermModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualAddress, setManualAddress] = useState(draft.location?.address ?? '');
  const [detectedAddress, setDetectedAddress] = useState<string | null>(
    draft.location?.address ?? null,
  );
  const [selectedArea, setSelectedArea] = useState<string>(
    draft.location?.area ?? 'Gulberg III',
  );

  const handleUseCurrentLocationTap = () => {
    // SEC-REVIEW #19: Permission only requested on tap of "Use current location"
    if (permissionStatus.location === 'granted') {
      simulateGpsDetection();
    } else {
      setShowPermModal(true);
    }
  };

  const simulateGpsDetection = () => {
    setScreenState('L');
    setTimeout(() => {
      const detected = `House 42, Street 7, ${selectedArea}, ${selectedCity}`;
      setDetectedAddress(detected);
      setManualAddress(detected);
      setScreenState('S');
    }, 150);
  };

  const handlePermissionContinue = () => {
    setShowPermModal(false);
    setPermissionStatus('location', 'granted');
    simulateGpsDetection();
  };

  const handlePermissionCancel = () => {
    setShowPermModal(false);
    setPermissionStatus('location', 'denied');
    setScreenState('X'); // Denied state, manual address fallback
  };

  const handleSelectSaved = (saved: SavedAddressItem) => {
    const full = `${saved.address}, ${selectedCity}`;
    setManualAddress(full);
    setDetectedAddress(full);
    setSelectedArea(saved.area);
    setScreenState('S');
  };

  const handleConfirm = () => {
    const chosenAddress = manualAddress.trim() || detectedAddress;
    if (!chosenAddress) return;

    const snapshot: LocationSnapshot = {
      address: chosenAddress,
      city: selectedCity,
      area: selectedArea,
      coordinates: { lat: 31.5204, lng: 74.3587 },
      isConfirmed: true,
    };

    updateDraft({ location: snapshot });
    goBack();
  };

  const canConfirm = manualAddress.trim().length > 3 || detectedAddress !== null;

  return (
    <ScreenContainer
      testID="c39-location-confirm-screen"
      title={translate(locale, 'customer.c39.title')}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* City Suggestion */}
        <View style={styles.cityCard} testID="c39-city-card">
          <Text
            style={[
              styles.cityText,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c39.cityPrompt', { city: selectedCity })}
          </Text>
        </View>

        {/* GPS Button */}
        <TouchableOpacity
          onPress={handleUseCurrentLocationTap}
          style={[styles.gpsButton, minTapTargetStyle(), { flexDirection: mirror.row }]}
          {...interactiveProps({
            testID: 'c39-use-current-location-btn',
            accessibilityLabel: translate(locale, 'customer.c39.useCurrentLocation'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={styles.gpsIcon}>📍</Text>
          <Text style={[styles.gpsButtonText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c39.useCurrentLocation')}
          </Text>
        </TouchableOpacity>

        {/* Loading GPS State */}
        {screenState === 'L' ? (
          <View testID="c39-loading-indicator" style={styles.stateNotice}>
            <Text style={[styles.stateNoticeText, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c39.findingLocation')}
            </Text>
          </View>
        ) : null}

        {/* Permission Denied Notice */}
        {permissionStatus.location === 'denied' || screenState === 'X' ? (
          <View testID="c39-perm-denied-notice" style={styles.warningNotice}>
            <Text
              style={[
                styles.warningText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.perm.denied')}
            </Text>
          </View>
        ) : null}

        {/* Detected Address Display */}
        {detectedAddress ? (
          <View testID="c39-detected-address-card" style={styles.detectedCard}>
            <Text
              style={[
                styles.cardHeader,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c39.detectedAddressHeader')}
            </Text>
            <Text
              testID="c39-detected-address-text"
              style={[
                styles.detectedText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {detectedAddress}
            </Text>
          </View>
        ) : null}

        {/* Map Pin Area Selector (Visual Placeholder / Simulation) */}
        <View style={styles.mapCard} testID="c39-map-pin-card">
          <Text
            style={[
              styles.mapInstruction,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c39.movePinHint')}
          </Text>
          <View style={styles.simulatedPin}>
            <Text style={styles.pinIcon}>📍</Text>
            <Text style={[styles.pinAreaLabel, textTokens(locale, 'label')]}>
              {selectedArea}, {selectedCity}
            </Text>
          </View>
        </View>

        {/* Search Place Input */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c39.searchPlaceholder', { city: selectedCity })}
          </Text>
          <TextInput
            testID="c39-place-search-input"
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              if (txt.trim()) {
                setManualAddress(`${txt.trim()}, ${selectedCity}`);
              }
            }}
            placeholder={translate(locale, 'customer.c39.searchPlaceholder', { city: selectedCity })}
            placeholderTextColor={COLOR.textMuted}
            style={[
              styles.input,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          />
        </View>

        {/* Saved Addresses */}
        <View style={styles.savedSection} testID="c39-saved-addresses-list">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c39.savedAddressesHeader')}
          </Text>
          {MOCK_SAVED_ADDRESSES.map((saved) => (
            <TouchableOpacity
              key={saved.id}
              onPress={() => handleSelectSaved(saved)}
              style={[styles.savedItem, minTapTargetStyle(), { flexDirection: mirror.row }]}
              {...interactiveProps({
                testID: `c39-saved-address-${saved.id}`,
                accessibilityLabel: `${saved.label}: ${saved.address}`,
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.savedIcon}>🏠</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.savedLabel,
                    textTokens(locale, 'label'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {saved.label}
                </Text>
                <Text
                  style={[
                    styles.savedSub,
                    textTokens(locale, 'label'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {saved.address}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Manual Address Fallback */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c39.manualEntryHeader')}
          </Text>
          <TextInput
            testID="c39-manual-address-input"
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder={translate(locale, 'customer.c39.streetAreaPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            multiline={true}
            style={[
              styles.multilineInput,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          />
        </View>

        {/* Confirm Action Button */}
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!canConfirm}
          style={[
            styles.confirmBtn,
            minTapTargetStyle(),
            !canConfirm && styles.disabledBtn,
          ]}
          {...interactiveProps({
            testID: 'c39-confirm-address-btn',
            accessibilityLabel: translate(locale, 'customer.c39.confirmAddress'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.confirmBtnText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c39.confirmAddress')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Pre-Prompt Rationale Modal */}
      <PermissionModal
        visible={showPermModal}
        kind="location"
        onContinue={handlePermissionContinue}
        onCancel={handlePermissionCancel}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  cityCard: {
    padding: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  cityText: {
    color: COLOR.text,
  },
  gpsButton: {
    backgroundColor: STATUS_THEME.info.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: STATUS_THEME.info.border,
    gap: SPACING.sm,
  },
  gpsIcon: {
    fontSize: 18,
  },
  gpsButtonText: {
    color: STATUS_THEME.info.text,
    fontWeight: 'bold',
  },
  stateNotice: {
    padding: SPACING.sm,
    alignItems: 'center',
  },
  stateNoticeText: {
    color: COLOR.textMuted,
    fontStyle: 'italic',
  },
  warningNotice: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.warning.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
  },
  warningText: {
    color: STATUS_THEME.warning.text,
  },
  detectedCard: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.success.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.success.border,
  },
  cardHeader: {
    color: STATUS_THEME.success.text,
    marginBottom: SPACING.xs,
  },
  detectedText: {
    color: STATUS_THEME.success.text,
  },
  mapCard: {
    padding: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
  },
  mapInstruction: {
    color: COLOR.textMuted,
    marginBottom: SPACING.sm,
  },
  simulatedPin: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
  },
  pinIcon: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  pinAreaLabel: {
    color: COLOR.text,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    color: COLOR.text,
  },
  input: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLOR.text,
  },
  multilineInput: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLOR.text,
    minHeight: 70,
  },
  savedSection: {
    gap: SPACING.xs,
  },
  sectionTitle: {
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  savedItem: {
    padding: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  savedIcon: {
    fontSize: 20,
  },
  savedLabel: {
    color: COLOR.text,
    fontWeight: 'bold',
  },
  savedSub: {
    color: COLOR.textMuted,
  },
  confirmBtn: {
    backgroundColor: COLOR.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
});
