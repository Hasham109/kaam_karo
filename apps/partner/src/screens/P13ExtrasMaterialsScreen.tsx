/**
 * P13 — Extras & Materials Screen (Task T4.5; BP §13 P13, BP §58.1, §58.2; FARE-003..012; PRICE-005, PRICE-007; PROV-CREW-004).
 * Owner: A12 (partner-app).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
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
import type { ExtraLineType, MaterialsClass } from '../types';
import { getAppMirroring } from '../utils/rtl';

const EXTRA_LINE_TYPES: ExtraLineType[] = [
  'LABOUR_SERVICE',
  'PARTS_MATERIALS',
  'TOOLS_EQUIPMENT',
  'CONSUMABLES',
  'EMERGENCY_AFTER_HOURS',
  'TRAVEL_DISTANCE',
  'DISCOUNT',
];

const MATERIALS_CLASSES: MaterialsClass[] = ['INCLUDED', 'NOT_INCLUDED', 'EXTRA_NEEDS_APPROVAL'];

export function P13ExtrasMaterialsScreen() {
  const {
    locale,
    proposedExtras,
    addProposedExtra,
    proposeCrewChange,
    selectedJob,
    screenStates,
    navigate,
  } = usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P13;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  // Form states
  const [selectedType, setSelectedType] = useState<ExtraLineType>('LABOUR_SERVICE');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [quantity] = useState<string>('1');
  const [unit] = useState<string>('job');
  const [toolsReason, setToolsReason] = useState<string>('');
  const [materialsClass, setMaterialsClass] = useState<MaterialsClass>('EXTRA_NEEDS_APPROVAL');

  // Crew change state
  const [newCrewSize, setNewCrewSize] = useState<string>(String((selectedJob?.crewSize || 1) + 1));

  const getLineTypeLabel = (type: ExtraLineType): string => {
    switch (type) {
      case 'LABOUR_SERVICE':
        return translate(locale, 'partner.p13.typeLabour');
      case 'PARTS_MATERIALS':
        return translate(locale, 'partner.p13.typeParts');
      case 'TOOLS_EQUIPMENT':
        return translate(locale, 'partner.p13.typeTools');
      case 'CONSUMABLES':
        return translate(locale, 'partner.p13.typeConsumables');
      case 'EMERGENCY_AFTER_HOURS':
        return translate(locale, 'partner.p13.typeEmergency');
      case 'TRAVEL_DISTANCE':
        return translate(locale, 'partner.p13.typeTravel');
      case 'DISCOUNT':
        return translate(locale, 'partner.p13.typeDiscount');
    }
  };

  const getMaterialsLabel = (matClass: MaterialsClass): string => {
    switch (matClass) {
      case 'INCLUDED':
        return translate(locale, 'partner.p13.matIncluded');
      case 'NOT_INCLUDED':
        return translate(locale, 'partner.p13.matNotIncluded');
      case 'EXTRA_NEEDS_APPROVAL':
        return translate(locale, 'partner.p13.matExtra');
    }
  };

  const handleSendProposal = async () => {
    const numericAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }
    // Tools requires reason (BP §58.1; FARE-004)
    if (selectedType === 'TOOLS_EQUIPMENT' && !toolsReason.trim()) {
      return;
    }

    const numericQty = parseFloat(quantity) || 1;
    await addProposedExtra({
      lineType: selectedType,
      description: description.trim(),
      amountPkr: numericAmount,
      quantity: numericQty,
      unit: unit.trim(),
      toolsReason: selectedType === 'TOOLS_EQUIPMENT' ? toolsReason.trim() : undefined,
      materialsClass: selectedType === 'PARTS_MATERIALS' ? materialsClass : undefined,
    });

    // Reset form
    setDescription('');
    setAmount('');
    setToolsReason('');
  };

  const handleSendCrewChange = async () => {
    const count = parseInt(newCrewSize, 10);
    if (isNaN(count) || count < 1) return;
    await proposeCrewChange(count);
  };

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p13-state-loading">
        <Text style={[styles.stateText, bodyTokens, fontStyle]}>
          {translate(locale, 'partner.p13.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="p13-extras-screen">
      {/* Header */}
      <View style={[styles.header, { flexDirection: mirroring.row }]}>
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p13-back-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p13.backToJobBtn'),
          })}
          style={[styles.backBtn, minTapTargetStyle()]}
          onPress={() => navigate('P12')}
        >
          <Text style={[styles.backBtnText, fontStyle]}>
            {translate(locale, 'partner.p13.backToJobBtn')}
          </Text>
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text
            style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p13-title"
          >
            {translate(locale, 'partner.p13.title')}
          </Text>
          <Text
            style={[styles.subtitle, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p13-subtitle"
          >
            {translate(locale, 'partner.p13.subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Canonical State Banners */}
        {currentState === 'success' && (
          <View style={[styles.banner, styles.bannerSuccess]} testID="p13-state-success">
            <Text style={[styles.bannerSuccessText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p13.success')}
            </Text>
          </View>
        )}

        {currentState === 'error' && (
          <View style={[styles.banner, styles.bannerError]} testID="p13-state-error">
            <Text style={[styles.bannerErrorText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p13.error')}
            </Text>
          </View>
        )}

        {currentState === 'pending' && (
          <View style={[styles.banner, styles.bannerPending]} testID="p13-state-pending">
            <Text style={[styles.bannerPendingText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p13.pending')}
            </Text>
          </View>
        )}

        {/* Invariant Policy Notice: Proposed lines are never payable until customer approves (FARE-012, PRICE-007) */}
        <View style={styles.policyNotice} testID="p13-proposed-notice">
          <Text
            style={[
              styles.policyNoticeText,
              bodyTokens,
              fontStyle,
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p13.proposedNotice')}
          </Text>
        </View>

        {/* List of Existing Proposed / Approved Extras */}
        <View style={styles.card}>
          <Text
            style={[
              styles.cardTitle,
              headlineTokens,
              fontStyle,
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p13.title')}
          </Text>

          {proposedExtras.length === 0 ? (
            <View style={styles.emptyContainer} testID="p13-state-empty">
              <Text
                style={[
                  styles.emptyText,
                  bodyTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
              >
                {translate(locale, 'partner.p13.empty')}
              </Text>
            </View>
          ) : (
            <View style={styles.extraList} testID="p13-extras-list">
              {proposedExtras.map((item) => (
                <View
                  key={item.id}
                  style={[styles.extraItemRow, { flexDirection: mirroring.row }]}
                  testID={`p13-extra-item-${item.id}`}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemDesc, fontStyle, { textAlign: mirroring.textAlign }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.itemSub, fontStyle, { textAlign: mirroring.textAlign }]}>
                      {getLineTypeLabel(item.lineType)} · {formatPkr(locale, item.amountPkr)}
                    </Text>
                    {item.toolsReason && (
                      <Text
                        style={[
                          styles.toolsReasonText,
                          fontStyle,
                          { textAlign: mirroring.textAlign },
                        ]}
                      >
                        {translate(locale, 'partner.p13.toolsReason')}: {item.toolsReason}
                      </Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusChip,
                      item.status === 'APPROVED'
                        ? styles.statusApproved
                        : item.status === 'REJECTED'
                          ? styles.statusRejected
                          : styles.statusProposed,
                    ]}
                    testID={`p13-extra-status-${item.id}`}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        item.status === 'APPROVED'
                          ? styles.statusApprovedText
                          : item.status === 'REJECTED'
                            ? styles.statusRejectedText
                            : styles.statusProposedText,
                        fontStyle,
                      ]}
                    >
                      {item.status === 'APPROVED'
                        ? translate(locale, 'partner.p13.statusApproved')
                        : item.status === 'REJECTED'
                          ? translate(locale, 'partner.p13.statusRejected')
                          : item.status === 'FINAL'
                            ? translate(locale, 'partner.p13.statusFinal')
                            : translate(locale, 'partner.p13.statusProposed')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Form: Propose Extra Charge Line */}
        <View style={styles.card} testID="p13-add-form-card">
          <Text
            style={[
              styles.cardTitle,
              headlineTokens,
              fontStyle,
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p12.addExtrasBtn')}
          </Text>

          {/* Line Type Selection (Platform fee and tax NEVER selectable; D-025, D-029) */}
          <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p13.lineType')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.typePillRow, { flexDirection: mirroring.row }]}
          >
            {EXTRA_LINE_TYPES.map((lt) => (
              <TouchableOpacity
                key={lt}
                {...interactiveProps({
                  testID: `p13-type-${lt}`,
                  accessibilityRole: 'button',
                  accessibilityLabel: getLineTypeLabel(lt),
                })}
                style={[
                  styles.typePill,
                  selectedType === lt && styles.typePillActive,
                  minTapTargetStyle(),
                ]}
                onPress={() => setSelectedType(lt)}
              >
                <Text
                  style={[
                    styles.typePillText,
                    selectedType === lt && styles.typePillTextActive,
                    fontStyle,
                  ]}
                >
                  {getLineTypeLabel(lt)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Description */}
          <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p13.description')}
          </Text>
          <TextInput
            style={[styles.input, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p13-input-description"
            value={description}
            onChangeText={setDescription}
            placeholder={translate(locale, 'partner.p13.descriptionPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
          />

          {/* Amount PKR */}
          <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p13.amount')}
          </Text>
          <TextInput
            style={[styles.input, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p13-input-amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder={translate(locale, 'partner.p13.amountPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
          />

          {/* Tools Reason (Required when type is TOOLS_EQUIPMENT; FARE-004) */}
          {selectedType === 'TOOLS_EQUIPMENT' && (
            <View style={styles.conditionalBlock} testID="p13-tools-reason-block">
              <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p13.toolsReason')} *
              </Text>
              <TextInput
                style={[styles.input, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p13-input-tools-reason"
                value={toolsReason}
                onChangeText={setToolsReason}
                placeholder={translate(locale, 'partner.p13.toolsReasonPlaceholder')}
                placeholderTextColor={COLOR.textMuted}
              />
            </View>
          )}

          {/* Materials Class (Required when type is PARTS_MATERIALS; PRICE-005) */}
          {selectedType === 'PARTS_MATERIALS' && (
            <View style={styles.conditionalBlock} testID="p13-materials-class-block">
              <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p13.materialsClass')}
              </Text>
              <View style={[styles.choiceRow, { flexDirection: mirroring.row }]}>
                {MATERIALS_CLASSES.map((mc) => (
                  <TouchableOpacity
                    key={mc}
                    {...interactiveProps({
                      testID: `p13-mat-class-${mc}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: getMaterialsLabel(mc),
                    })}
                    style={[
                      styles.choicePill,
                      materialsClass === mc && styles.choicePillActive,
                      minTapTargetStyle(),
                    ]}
                    onPress={() => setMaterialsClass(mc)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        materialsClass === mc && styles.choicePillTextActive,
                        fontStyle,
                      ]}
                    >
                      {getMaterialsLabel(mc)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Send Proposal Button */}
          <TouchableOpacity
            {...interactiveProps({
              testID: 'p13-send-proposal-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p13.sendProposalBtn'),
            })}
            style={[styles.primaryActionBtn, minTapTargetStyle()]}
            onPress={() => void handleSendProposal()}
          >
            <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
              {translate(locale, 'partner.p13.sendProposalBtn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Crew Size Change Proposal (PROV-CREW-004) */}
        <View style={styles.card} testID="p13-crew-change-card">
          <Text
            style={[
              styles.cardTitle,
              headlineTokens,
              fontStyle,
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p13.crewSizeChangeTitle')}
          </Text>
          <Text
            style={[styles.metaText, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          >
            {translate(locale, 'partner.p13.crewSizeCurrent', {
              count: selectedJob?.crewSize || 1,
            })}
          </Text>

          <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p13.crewSizeNew')}
          </Text>
          <TextInput
            style={[styles.input, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p13-input-crew-size"
            value={newCrewSize}
            onChangeText={setNewCrewSize}
            keyboardType="number-pad"
          />

          <Text style={[styles.priceNote, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p13.crewPriceNote')}
          </Text>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p13-send-crew-change-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p13.sendCrewChangeBtn'),
            })}
            style={[styles.secondaryActionBtn, minTapTargetStyle()]}
            onPress={() => void handleSendCrewChange()}
          >
            <Text style={[styles.secondaryActionBtnText, fontStyle]}>
              {translate(locale, 'partner.p13.sendCrewChangeBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLOR.background,
  },
  stateText: {
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    backgroundColor: COLOR.surface,
  },
  backBtn: {
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  titleWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLOR.textMuted,
    marginTop: 2,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  banner: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  bannerSuccess: {
    backgroundColor: STATUS_THEME.success.background,
  },
  bannerSuccessText: {
    color: STATUS_THEME.success.text,
  },
  bannerError: {
    backgroundColor: STATUS_THEME.danger.background,
  },
  bannerErrorText: {
    color: STATUS_THEME.danger.text,
  },
  bannerPending: {
    backgroundColor: COLOR.surface,
  },
  bannerPendingText: {
    color: COLOR.textMuted,
  },
  policyNotice: {
    backgroundColor: STATUS_THEME.warning.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  policyNoticeText: {
    color: STATUS_THEME.warning.text,
    fontWeight: '600',
    fontSize: 13,
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  emptyContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  emptyText: {
    color: COLOR.textMuted,
    fontSize: 13,
  },
  extraList: {
    gap: SPACING.sm,
  },
  extraItemRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
  },
  itemInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  itemDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
  },
  itemSub: {
    fontSize: 12,
    color: COLOR.textMuted,
    marginTop: 2,
  },
  toolsReasonText: {
    fontSize: 11,
    color: COLOR.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusProposed: {
    backgroundColor: STATUS_THEME.warning.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
  },
  statusProposedText: {
    color: STATUS_THEME.warning.text,
    fontSize: 11,
    fontWeight: '600',
  },
  statusApproved: {
    backgroundColor: STATUS_THEME.success.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.success.border,
  },
  statusApprovedText: {
    color: STATUS_THEME.success.text,
    fontSize: 11,
    fontWeight: '600',
  },
  statusRejected: {
    backgroundColor: STATUS_THEME.danger.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.danger.border,
  },
  statusRejectedText: {
    color: STATUS_THEME.danger.text,
    fontSize: 11,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.text,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  typePillRow: {
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  typePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLOR.background,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  typePillActive: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  typePillText: {
    fontSize: 12,
    color: COLOR.text,
  },
  typePillTextActive: {
    color: COLOR.onPrimary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLOR.text,
  },
  conditionalBlock: {
    marginTop: SPACING.xs,
  },
  choiceRow: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  choicePill: {
    flex: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  choicePillActive: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  choicePillText: {
    fontSize: 11,
    color: COLOR.text,
    textAlign: 'center',
  },
  choicePillTextActive: {
    color: COLOR.onPrimary,
    fontWeight: '600',
  },
  primaryActionBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  primaryActionBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  metaText: {
    fontSize: 13,
    color: COLOR.textMuted,
    marginBottom: SPACING.xs,
  },
  priceNote: {
    fontSize: 12,
    color: COLOR.textMuted,
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  secondaryActionBtn: {
    backgroundColor: COLOR.background,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  secondaryActionBtnText: {
    color: COLOR.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
