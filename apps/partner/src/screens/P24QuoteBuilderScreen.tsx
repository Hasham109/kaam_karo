/**
 * P24 — Structured Quote Builder Screen (Task T4.4; BP §18, §58; BP §13 P24; D-004, D-018, QUOTE-001..009, FARE-001..011, PROV-CREW-001..006).
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
import type { MaterialsClass, QuoteLineType } from '../types';
import { getAppMirroring } from '../utils/rtl';

const LINE_TYPES: QuoteLineType[] = [
  'LABOUR_SERVICE',
  'PARTS_MATERIALS',
  'VISIT_CALLOUT',
  'INSPECTION_DIAGNOSIS',
  'TOOLS_EQUIPMENT',
  'CONSUMABLES',
  'EMERGENCY_AFTER_HOURS',
  'TRAVEL_DISTANCE',
  'DISCOUNT',
];

export function P24QuoteBuilderScreen() {
  const {
    locale,
    quoteDraft,
    quoteTotals,
    addQuoteLine,
    removeQuoteLine,
    updateQuoteMetadata,
    sendQuote,
    screenStates,
    goBack,
  } = usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P24;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');

  // Form state for adding a new charge line
  const [selectedType, setSelectedType] = useState<QuoteLineType>('LABOUR_SERVICE');
  const [lineDesc, setLineDesc] = useState<string>('');
  const [lineQty, setLineQty] = useState<string>('1');
  const [lineUnit, setLineUnit] = useState<string>('job');
  const [lineAmount, setLineAmount] = useState<string>('');
  const [toolsReason, setToolsReason] = useState<string>('');
  const [isDeductible, setIsDeductible] = useState<boolean>(true);
  const [matClass, setMatClass] = useState<MaterialsClass>('INCLUDED');

  const getLineTypeLabel = (type: QuoteLineType): string => {
    switch (type) {
      case 'VISIT_CALLOUT':
        return translate(locale, 'partner.p24.typeVisit');
      case 'INSPECTION_DIAGNOSIS':
        return translate(locale, 'partner.p24.typeInspection');
      case 'LABOUR_SERVICE':
        return translate(locale, 'partner.p24.typeLabour');
      case 'TOOLS_EQUIPMENT':
        return translate(locale, 'partner.p24.typeTools');
      case 'CONSUMABLES':
        return translate(locale, 'partner.p24.typeConsumables');
      case 'PARTS_MATERIALS':
        return translate(locale, 'partner.p24.typeParts');
      case 'EMERGENCY_AFTER_HOURS':
        return translate(locale, 'partner.p24.typeEmergency');
      case 'TRAVEL_DISTANCE':
        return translate(locale, 'partner.p24.typeTravel');
      case 'DISCOUNT':
        return translate(locale, 'partner.p24.typeDiscount');
    }
  };

  const handleAddLine = () => {
    const parsedAmount = Number.parseInt(lineAmount, 10);
    const parsedQty = Number.parseFloat(lineQty);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!lineDesc.trim()) return;

    addQuoteLine({
      lineType: selectedType,
      description: lineDesc.trim(),
      quantity: Number.isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty,
      unit: lineUnit.trim() || undefined,
      amountPkr: parsedAmount,
      toolsReason: selectedType === 'TOOLS_EQUIPMENT' ? toolsReason.trim() : undefined,
      isDeductible: selectedType === 'INSPECTION_DIAGNOSIS' ? isDeductible : undefined,
      materialsClass: selectedType === 'PARTS_MATERIALS' ? matClass : undefined,
    });

    // Reset line input form
    setLineDesc('');
    setLineAmount('');
    setToolsReason('');
  };

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p24-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p24.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'success') {
    return (
      <View style={styles.centerContainer} testID="p24-success-view">
        <Text
          style={[
            styles.centerText,
            { color: STATUS_THEME.success.text, fontWeight: '700' },
            fontStyle,
          ]}
        >
          {translate(locale, 'partner.p24.success')}
        </Text>
        <TouchableOpacity
          style={[styles.backToJobBtn, minTapTargetStyle()]}
          onPress={goBack}
          {...interactiveProps({
            testID: 'p24-success-back-btn',
            accessibilityLabel: translate(locale, 'partner.p25.closeBtn'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.backToJobBtnText, fontStyle]}>
            {translate(locale, 'partner.p25.closeBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentState === 'error') {
    return (
      <View style={styles.centerContainer} testID="p24-error-view">
        <Text style={[styles.centerText, { color: STATUS_THEME.danger.text }, fontStyle]}>
          {translate(locale, 'partner.p24.error')}
        </Text>
        <TouchableOpacity
          style={[styles.backToJobBtn, minTapTargetStyle()]}
          onPress={goBack}
          {...interactiveProps({
            testID: 'p24-error-back-btn',
            accessibilityLabel: translate(locale, 'partner.p25.closeBtn'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.backToJobBtnText, fontStyle]}>
            {translate(locale, 'partner.p25.closeBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lines = quoteDraft?.lines ?? [];
  const canSend =
    lines.length > 0 &&
    (quoteDraft?.crewSize ?? 0) >= 1 &&
    Boolean(quoteDraft?.validUntil?.trim()) &&
    Boolean(quoteDraft?.inclusions?.trim()) &&
    Boolean(quoteDraft?.exclusions?.trim()) &&
    (quoteDraft?.expectedDurationHours ?? 0) > 0;

  return (
    <View style={styles.container} testID="p24-quote-builder-screen">
      {/* Header */}
      <View style={[styles.headerRow, { flexDirection: mirroring.row }]}>
        <TouchableOpacity
          onPress={goBack}
          style={[styles.backBtn, minTapTargetStyle()]}
          {...interactiveProps({
            testID: 'p24-back-btn',
            accessibilityLabel: translate(locale, 'partner.p25.closeBtn'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.backBtnText, fontStyle]}>
            {isUrdu ? '→' : '←'} {translate(locale, 'partner.p25.closeBtn')}
          </Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            headlineTokens,
            { textAlign: mirroring.textAlign },
            fontStyle,
          ]}
        >
          {translate(locale, 'partner.p24.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Existing Lines Section */}
        <View style={styles.cardSection}>
          <Text style={[styles.sectionTitle, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.subtitle')}
          </Text>

          {lines.length === 0 ? (
            <Text
              style={[styles.emptyText, fontStyle, { textAlign: mirroring.textAlign }]}
              testID="p24-empty-hint"
            >
              {translate(locale, 'partner.p24.empty')}
            </Text>
          ) : (
            lines.map((l) => (
              <View key={l.id} style={styles.lineItemRow} testID={`p24-line-${l.id}`}>
                <View style={styles.lineItemMain}>
                  <View style={[styles.lineTypeBadge, { alignSelf: mirroring.alignStart }]}>
                    <Text style={[styles.lineTypeBadgeText, fontStyle]}>
                      {getLineTypeLabel(l.lineType)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.lineItemDesc, fontStyle, { textAlign: mirroring.textAlign }]}
                  >
                    {l.description}
                  </Text>
                  <Text style={[styles.lineItemQty, fontStyle, { textAlign: mirroring.textAlign }]}>
                    {l.quantity} {l.unit ?? ''}
                  </Text>
                  {l.toolsReason && (
                    <Text
                      style={[styles.lineDetailNote, fontStyle, { textAlign: mirroring.textAlign }]}
                    >
                      {translate(locale, 'partner.p24.toolsReason')}: {l.toolsReason}
                    </Text>
                  )}
                  {l.isDeductible !== undefined && (
                    <Text
                      style={[styles.lineDetailNote, fontStyle, { textAlign: mirroring.textAlign }]}
                    >
                      {translate(locale, 'partner.p24.deductible')}:{' '}
                      {l.isDeductible
                        ? translate(locale, 'partner.p24.deductibleYes')
                        : translate(locale, 'partner.p24.deductibleNo')}
                    </Text>
                  )}
                </View>

                <View style={styles.lineItemRight}>
                  <Text style={[styles.lineItemAmount, fontStyle]}>
                    {formatPkr(locale, l.amountPkr)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.removeBtn, minTapTargetStyle()]}
                    onPress={() => removeQuoteLine(l.id)}
                    {...interactiveProps({
                      testID: `p24-remove-line-${l.id}`,
                      accessibilityLabel: translate(locale, 'partner.p24.removeLine'),
                      accessibilityRole: 'button',
                    })}
                  >
                    <Text style={[styles.removeBtnText, fontStyle]}>
                      {translate(locale, 'partner.p24.removeLine')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Add Line Form */}
        <View style={styles.cardSection}>
          <Text style={[styles.sectionTitle, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.addLine')}
          </Text>

          {/* Line Type Selector */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.lineType')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeSelectorRow}
          >
            {LINE_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typePill,
                  minTapTargetStyle(),
                  selectedType === t && styles.typePillActive,
                ]}
                onPress={() => setSelectedType(t)}
                {...interactiveProps({
                  testID: `p24-type-pill-${t}`,
                  accessibilityLabel: getLineTypeLabel(t),
                  accessibilityRole: 'button',
                })}
              >
                <Text
                  style={[
                    styles.typePillText,
                    selectedType === t && styles.typePillTextActive,
                    fontStyle,
                  ]}
                >
                  {getLineTypeLabel(t)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Description */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.description')}
          </Text>
          <TextInput
            style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
            placeholder={translate(locale, 'partner.p24.descriptionPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={lineDesc}
            onChangeText={setLineDesc}
            testID="p24-line-desc-input"
          />

          {/* Quantity & Unit Row */}
          <View style={[styles.fieldRow, { flexDirection: mirroring.row }]}>
            <View style={styles.halfField}>
              <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p24.quantity')}
              </Text>
              <TextInput
                style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
                keyboardType="numeric"
                value={lineQty}
                onChangeText={setLineQty}
                testID="p24-line-qty-input"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p24.unit')}
              </Text>
              <TextInput
                style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
                value={lineUnit}
                onChangeText={setLineUnit}
                testID="p24-line-unit-input"
              />
            </View>
          </View>

          {/* Amount */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.amount')}
          </Text>
          <TextInput
            style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
            keyboardType="numeric"
            placeholder={translate(locale, 'partner.p24.amountPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={lineAmount}
            onChangeText={setLineAmount}
            testID="p24-line-amount-input"
          />

          {/* Conditional Tools Reason */}
          {selectedType === 'TOOLS_EQUIPMENT' && (
            <View style={styles.conditionalBlock}>
              <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p24.toolsReason')}
              </Text>
              <TextInput
                style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
                value={toolsReason}
                onChangeText={setToolsReason}
                testID="p24-tools-reason-input"
              />
            </View>
          )}

          {/* Conditional Inspection Deductible */}
          {selectedType === 'INSPECTION_DIAGNOSIS' && (
            <View style={styles.conditionalBlock}>
              <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p24.deductible')}
              </Text>
              <View style={[styles.toggleRow, { flexDirection: mirroring.row }]}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    minTapTargetStyle(),
                    isDeductible && styles.toggleBtnActive,
                  ]}
                  onPress={() => setIsDeductible(true)}
                  {...interactiveProps({
                    testID: 'p24-deductible-yes',
                    accessibilityLabel: translate(locale, 'partner.p24.deductibleYes'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      isDeductible && styles.toggleBtnTextActive,
                      fontStyle,
                    ]}
                  >
                    {translate(locale, 'partner.p24.deductibleYes')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    minTapTargetStyle(),
                    !isDeductible && styles.toggleBtnActive,
                  ]}
                  onPress={() => setIsDeductible(false)}
                  {...interactiveProps({
                    testID: 'p24-deductible-no',
                    accessibilityLabel: translate(locale, 'partner.p24.deductibleNo'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !isDeductible && styles.toggleBtnTextActive,
                      fontStyle,
                    ]}
                  >
                    {translate(locale, 'partner.p24.deductibleNo')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Conditional Parts Materials Class */}
          {selectedType === 'PARTS_MATERIALS' && (
            <View style={styles.conditionalBlock}>
              <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p24.materialsClass')}
              </Text>
              <View style={[styles.toggleRow, { flexDirection: mirroring.row }]}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    minTapTargetStyle(),
                    matClass === 'INCLUDED' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setMatClass('INCLUDED')}
                  {...interactiveProps({
                    testID: 'p24-mat-included',
                    accessibilityLabel: translate(locale, 'partner.p24.matIncluded'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      matClass === 'INCLUDED' && styles.toggleBtnTextActive,
                      fontStyle,
                    ]}
                  >
                    {translate(locale, 'partner.p24.matIncluded')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    minTapTargetStyle(),
                    matClass === 'NOT_INCLUDED' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setMatClass('NOT_INCLUDED')}
                  {...interactiveProps({
                    testID: 'p24-mat-not-included',
                    accessibilityLabel: translate(locale, 'partner.p24.matNotIncluded'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      matClass === 'NOT_INCLUDED' && styles.toggleBtnTextActive,
                      fontStyle,
                    ]}
                  >
                    {translate(locale, 'partner.p24.matNotIncluded')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addLineBtn, minTapTargetStyle()]}
            onPress={handleAddLine}
            {...interactiveProps({
              testID: 'p24-add-line-btn',
              accessibilityLabel: translate(locale, 'partner.p24.addLine'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.addLineBtnText, fontStyle]}>
              + {translate(locale, 'partner.p24.addLine')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quote Invariants & Terms Section (BP §18, §58; D-004, D-018) */}
        <View style={styles.cardSection}>
          {/* Crew Size (Required stepper; BP §58; D-004, PROV-CREW-001) */}
          <Text style={[styles.sectionTitle, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.crewSize')}
          </Text>

          <View style={[styles.stepperRow, { flexDirection: mirroring.row }]}>
            <TouchableOpacity
              style={[
                styles.stepperBtn,
                minTapTargetStyle(),
                (quoteDraft?.crewSize ?? 1) <= 1 && styles.stepperBtnDisabled,
              ]}
              disabled={(quoteDraft?.crewSize ?? 1) <= 1}
              onPress={() =>
                updateQuoteMetadata({
                  crewSize: Math.max(1, (quoteDraft?.crewSize ?? 1) - 1),
                })
              }
              {...interactiveProps({
                testID: 'p24-crew-decrement',
                accessibilityLabel: 'Decrease crew size',
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={[styles.stepperValueText, fontStyle]} testID="p24-crew-count-value">
              {quoteDraft?.crewSize ?? 1}
            </Text>

            <TouchableOpacity
              style={[styles.stepperBtn, minTapTargetStyle()]}
              onPress={() =>
                updateQuoteMetadata({
                  crewSize: Math.min(10, (quoteDraft?.crewSize ?? 1) + 1),
                })
              }
              {...interactiveProps({
                testID: 'p24-crew-increment',
                accessibilityLabel: 'Increase crew size',
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Crew size price note (D-018, PROV-CREW-005) */}
          <View style={styles.crewNoteBox}>
            <Text
              style={[styles.crewNoteText, fontStyle, { textAlign: mirroring.textAlign }]}
              testID="p24-crew-price-note"
            >
              {translate(locale, 'partner.p24.crewPriceNote')}
            </Text>
          </View>

          {/* Valid Until */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.validUntil')}
          </Text>
          <TextInput
            style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
            value={quoteDraft?.validUntil ?? ''}
            onChangeText={(txt) => updateQuoteMetadata({ validUntil: txt })}
            testID="p24-valid-until-input"
          />

          {/* Inclusions */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.inclusions')}
          </Text>
          <TextInput
            style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
            placeholder={translate(locale, 'partner.p24.inclusionsPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={quoteDraft?.inclusions ?? ''}
            onChangeText={(txt) => updateQuoteMetadata({ inclusions: txt })}
            testID="p24-inclusions-input"
          />

          {/* Exclusions */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.exclusions')}
          </Text>
          <TextInput
            style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
            placeholder={translate(locale, 'partner.p24.exclusionsPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={quoteDraft?.exclusions ?? ''}
            onChangeText={(txt) => updateQuoteMetadata({ exclusions: txt })}
            testID="p24-exclusions-input"
          />

          {/* Expected Duration */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.expectedDuration')}
          </Text>
          <TextInput
            style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
            keyboardType="numeric"
            value={(quoteDraft?.expectedDurationHours ?? 1).toString()}
            onChangeText={(txt) => {
              const parsed = Number.parseInt(txt, 10);
              updateQuoteMetadata({
                expectedDurationHours: Number.isNaN(parsed) ? 1 : parsed,
              });
            }}
            testID="p24-duration-input"
          />

          {/* Note to customer */}
          <Text style={[styles.inputLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p24.noteToCustomer')}
          </Text>
          <TextInput
            style={[styles.textInput, fontStyle, { textAlign: mirroring.textAlign }]}
            value={quoteDraft?.noteToCustomer ?? ''}
            onChangeText={(txt) => updateQuoteMetadata({ noteToCustomer: txt })}
            testID="p24-note-input"
          />
        </View>

        {/* Totals Preview Banner (BP §58.1, D-006, D-015, D-029) */}
        <View style={styles.totalsCard} testID="p24-totals-card">
          <Text style={[styles.totalsCardText, fontStyle]} testID="p24-totals-preview-text">
            {translate(locale, 'partner.p24.totalsPreview', {
              total: formatPkr(locale, quoteTotals.totalCustomerPkr),
              commission: formatPkr(locale, quoteTotals.commissionPkr),
              payout: formatPkr(locale, quoteTotals.providerSharePkr),
            })}
          </Text>
        </View>

        {/* Send Quote Action CTA */}
        <TouchableOpacity
          style={[
            styles.sendQuoteBtn,
            minTapTargetStyle(),
            !canSend && styles.sendQuoteBtnDisabled,
          ]}
          disabled={!canSend}
          onPress={sendQuote}
          {...interactiveProps({
            testID: 'p24-send-quote-btn',
            accessibilityLabel: translate(locale, 'partner.p24.sendQuoteBtn'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.sendQuoteBtnText, fontStyle]}>
            {translate(locale, 'partner.p24.sendQuoteBtn')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLOR.surface,
  },
  centerText: {
    fontSize: 16,
    color: COLOR.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  headerRow: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLOR.background,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
  },
  backBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.sm,
  },
  backBtnText: {
    fontSize: 14,
    color: COLOR.primary,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: COLOR.text,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  cardSection: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: SPACING.md,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.surface,
    gap: SPACING.md,
  },
  lineItemMain: {
    flex: 1,
  },
  lineTypeBadge: {
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginBottom: 4,
  },
  lineTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLOR.primary,
  },
  lineItemDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
  },
  lineItemQty: {
    fontSize: 12,
    color: COLOR.textMuted,
  },
  lineDetailNote: {
    fontSize: 11,
    color: COLOR.textMuted,
    marginTop: 2,
  },
  lineItemRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: 4,
  },
  removeBtn: {
    paddingVertical: 2,
  },
  removeBtnText: {
    fontSize: 12,
    color: STATUS_THEME.danger.text,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.textMuted,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  typeSelectorRow: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  typePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
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
    fontWeight: '600',
  },
  typePillTextActive: {
    color: COLOR.onPrimary,
  },
  textInput: {
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLOR.text,
  },
  fieldRow: {
    gap: SPACING.md,
  },
  halfField: {
    flex: 1,
  },
  conditionalBlock: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
  },
  toggleRow: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  toggleBtnText: {
    fontSize: 12,
    color: COLOR.text,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: COLOR.onPrimary,
  },
  addLineBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  addLineBtnText: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  stepperRow: {
    alignItems: 'center',
    gap: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.text,
  },
  stepperValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.text,
    minWidth: 32,
    textAlign: 'center',
  },
  crewNoteBox: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  crewNoteText: {
    fontSize: 12,
    color: COLOR.textMuted,
  },
  totalsCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
  },
  totalsCardText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
    textAlign: 'center',
  },
  sendQuoteBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  sendQuoteBtnDisabled: {
    opacity: 0.4,
  },
  sendQuoteBtnText: {
    color: COLOR.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  backToJobBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  backToJobBtnText: {
    color: COLOR.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
