/**
 * P05 — Service Setup Screen (Task T4.2; BP §13 P05, BP §8.2, BP §10 steps 29 and 33; ROLE-002, MATCH-ELIG-074, PRICE-001..005, FARE-001..002).
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
import type { PriceModel, ProviderServiceItem } from '../types';
import { getAppMirroring } from '../utils/rtl';

export function P05ServiceSetupScreen() {
  const { locale, services, screenStates, addService, togglePublishService, navigate, goBack } =
    usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P05;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  // Form state for adding/editing a service
  const [selectedCategory, setSelectedCategory] = useState<
    'electrician' | 'ac_repair' | 'plumbing'
  >('electrician');
  const [serviceName, setServiceName] = useState('');
  const [priceModel, setPriceModel] = useState<PriceModel>('FIXED');
  const [priceAmount, setPriceAmount] = useState('1500');
  const [visitFee, setVisitFee] = useState('300');
  const [inspectionFee, setInspectionFee] = useState('500');
  const [isDeductible, setIsDeductible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p05-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p05.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' && services.length === 0) {
    return (
      <View style={styles.centerContainer} testID="p05-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p05.empty')}</Text>
      </View>
    );
  }

  const handleAddService = async () => {
    setErrorMessage(null);
    const priceNum = Number.parseInt(priceAmount, 10);
    if (!priceNum || priceNum <= 0) {
      setErrorMessage(translate(locale, 'partner.p05.invalidPrice'));
      return;
    }

    const categoryNames = {
      electrician: 'Electrician',
      ac_repair: 'AC Repair & Service',
      plumbing: 'Plumbing',
    };

    const finalServiceName =
      serviceName.trim() ||
      (selectedCategory === 'electrician'
        ? 'Switchboard Repair'
        : selectedCategory === 'ac_repair'
          ? 'AC Gas Refill'
          : 'Tap & Mixer Installation');

    const newService: Omit<ProviderServiceItem, 'id' | 'published'> = {
      categoryId: selectedCategory,
      categoryName: categoryNames[selectedCategory],
      serviceId: finalServiceName.toLowerCase().replace(/\s+/g, '_'),
      serviceName: finalServiceName,
      priceModel,
      sellingModes: priceModel === 'FIXED' ? ['INSTANT', 'CHOOSE_SUPPLIER'] : ['REQUEST_QUOTES'],
      pricingUnit: selectedCategory === 'ac_repair' ? 'unit' : 'job',
      fixedPricePkr: priceModel === 'FIXED' ? priceNum : undefined,
      startingPricePkr: priceModel === 'FROM' ? priceNum : undefined,
      visitFeePkr: Number.parseInt(visitFee, 10) || 0,
      inspectionFeePkr:
        priceModel === 'INSPECTION_QUOTE' ? Number.parseInt(inspectionFee, 10) || 0 : undefined,
      inspectionDeductible: priceModel === 'INSPECTION_QUOTE' ? isDeductible : undefined,
      verificationNeeded: 'BASIC',
    };

    await addService(newService);
    setServiceName('');
    setPriceAmount('1500');
  };

  const getPriceModelLabel = (model: PriceModel) => {
    switch (model) {
      case 'FIXED':
        return translate(locale, 'partner.p05.modelFixed');
      case 'FROM':
        return translate(locale, 'partner.p05.modelFrom');
      case 'INSPECTION_QUOTE':
        return translate(locale, 'partner.p05.modelInspection');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p05-service-setup-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p05-title"
        >
          {translate(locale, 'partner.p05.title')}
        </Text>
        <Text
          style={[styles.subtitle, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p05-subtitle"
        >
          {translate(locale, 'partner.p05.subtitle')}
        </Text>
      </View>

      {/* Success Banner */}
      {currentState === 'success' && (
        <View style={styles.successBanner} testID="p05-success-banner">
          <Text style={[styles.successText, fontStyle]}>
            {translate(locale, 'partner.p05.saveSuccess')}
          </Text>
        </View>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner} testID="p05-error-banner">
          <Text style={[styles.errorText, fontStyle]}>{errorMessage}</Text>
        </View>
      )}

      {/* Existing Services List */}
      <View style={styles.section} testID="p05-services-list">
        {services.map((item) => (
          <View key={item.id} style={styles.serviceCard} testID={`p05-service-card-${item.id}`}>
            <View style={[styles.cardHeader, { flexDirection: mirroring.row }]}>
              <View style={styles.titleColumn}>
                <Text style={[styles.categoryBadge, fontStyle]}>{item.categoryName}</Text>
                <Text style={[styles.serviceTitle, fontStyle, { textAlign: mirroring.textAlign }]}>
                  {item.serviceName}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  item.published ? styles.statusChipActive : styles.statusChipInactive,
                ]}
                testID={`p05-status-chip-${item.id}`}
              >
                <Text style={[styles.statusChipText, fontStyle]}>
                  {item.published
                    ? translate(locale, 'partner.p05.published')
                    : translate(locale, 'partner.p05.notPublished')}
                </Text>
              </View>
            </View>

            {/* Price Details */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailText, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p05.pricingType', {
                  model: getPriceModelLabel(item.priceModel),
                })}
              </Text>
              {item.fixedPricePkr && (
                <Text style={[styles.priceTag, fontStyle]}>
                  {formatPkr(locale, item.fixedPricePkr)}
                </Text>
              )}
              {item.startingPricePkr && (
                <Text style={[styles.priceTag, fontStyle]}>
                  {formatPkr(locale, item.startingPricePkr)}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={[styles.cardActions, { flexDirection: mirroring.row }]}>
              <TouchableOpacity
                {...interactiveProps({
                  testID: `p05-toggle-publish-${item.id}`,
                  accessibilityRole: 'button',
                  accessibilityLabel: item.published
                    ? translate(locale, 'partner.p05.stopOfferingBtn')
                    : translate(locale, 'partner.p05.publishBtn'),
                })}
                style={[item.published ? styles.stopBtn : styles.publishBtn, minTapTargetStyle()]}
                onPress={() => togglePublishService(item.id)}
              >
                <Text
                  style={[item.published ? styles.stopBtnText : styles.publishBtnText, fontStyle]}
                >
                  {item.published
                    ? translate(locale, 'partner.p05.stopOfferingBtn')
                    : translate(locale, 'partner.p05.publishBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Add New Service Form */}
      <View style={styles.formSection} testID="p05-add-service-form">
        <Text style={[styles.formHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p05.addServiceBtn')}
        </Text>

        {/* Category Picker Chips */}
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p05.categoryLabel')}
        </Text>
        <View style={[styles.pickerRow, { flexDirection: mirroring.row }]}>
          {(['electrician', 'ac_repair', 'plumbing'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              {...interactiveProps({
                testID: `p05-cat-chip-${cat}`,
                accessibilityRole: 'button',
                accessibilityLabel: cat,
              })}
              style={[
                styles.chip,
                minTapTargetStyle(),
                selectedCategory === cat && styles.chipSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  fontStyle,
                  selectedCategory === cat && styles.chipTextSelected,
                ]}
              >
                {cat === 'electrician'
                  ? translate(locale, 'partner.p05.catElectrician')
                  : cat === 'ac_repair'
                    ? translate(locale, 'partner.p05.catAcRepair')
                    : translate(locale, 'partner.p05.catPlumbing')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pricing Model Selector */}
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p05.pricingType', { model: '' })}
        </Text>
        <View style={[styles.pickerRow, { flexDirection: mirroring.row }]}>
          {(['FIXED', 'FROM', 'INSPECTION_QUOTE'] as const).map((model) => (
            <TouchableOpacity
              key={model}
              {...interactiveProps({
                testID: `p05-model-chip-${model.toLowerCase()}`,
                accessibilityRole: 'button',
                accessibilityLabel: model,
              })}
              style={[
                styles.chip,
                minTapTargetStyle(),
                priceModel === model && styles.chipSelected,
              ]}
              onPress={() => setPriceModel(model)}
            >
              <Text
                style={[
                  styles.chipText,
                  fontStyle,
                  priceModel === model && styles.chipTextSelected,
                ]}
              >
                {getPriceModelLabel(model)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Amount Input */}
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {priceModel === 'FIXED'
            ? translate(locale, 'partner.p05.fixedPrice')
            : priceModel === 'FROM'
              ? translate(locale, 'partner.p05.startingPrice')
              : translate(locale, 'partner.p05.inspectionFee')}
        </Text>
        <TextInput
          style={[styles.input, { textAlign: mirroring.textAlign }]}
          testID="p05-price-input"
          keyboardType="number-pad"
          value={priceAmount}
          onChangeText={setPriceAmount}
        />

        {/* Visit Fee */}
        <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p05.visitFee')}
        </Text>
        <TextInput
          style={[styles.input, { textAlign: mirroring.textAlign }]}
          testID="p05-visit-fee-input"
          keyboardType="number-pad"
          value={visitFee}
          onChangeText={setVisitFee}
        />

        {/* Inspection Fee if INSPECTION_QUOTE */}
        {priceModel === 'INSPECTION_QUOTE' && (
          <>
            <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
              {translate(locale, 'partner.p05.inspectionFee')}
            </Text>
            <TextInput
              style={[styles.input, { textAlign: mirroring.textAlign }]}
              testID="p05-inspection-fee-input"
              keyboardType="number-pad"
              value={inspectionFee}
              onChangeText={setInspectionFee}
            />
          </>
        )}

        {/* Deductible Switch if Inspection Quote */}
        {priceModel === 'INSPECTION_QUOTE' && (
          <View style={[styles.switchRow, { flexDirection: mirroring.row }]}>
            <Text style={[styles.switchLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
              {translate(locale, 'partner.p05.inspectionDeductible')}
            </Text>
            <Switch
              testID="p05-deductible-switch"
              value={isDeductible}
              onValueChange={setIsDeductible}
            />
          </View>
        )}

        {/* Add Service Button */}
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p05-save-service-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p05.saveBtn'),
          })}
          style={[styles.saveBtn, minTapTargetStyle()]}
          onPress={handleAddService}
        >
          <Text style={[styles.saveBtnText, fontStyle]}>
            {translate(locale, 'partner.p05.saveBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Footer */}
      <View style={[styles.navFooter, { flexDirection: mirroring.row }]}>
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p05-back-btn',
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

        <TouchableOpacity
          {...interactiveProps({
            testID: 'p05-next-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p05.nextServiceArea'),
          })}
          style={[styles.nextBtn, minTapTargetStyle()]}
          onPress={() => navigate('P07')}
        >
          <Text style={[styles.nextBtnText, fontStyle]}>
            {translate(locale, 'partner.p05.nextServiceArea')}
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
  serviceCard: {
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
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  categoryBadge: {
    fontSize: 12,
    color: COLOR.primary,
    fontWeight: '600',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
  },
  statusChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusChipActive: {
    backgroundColor: '#dcfce7',
  },
  statusChipInactive: {
    backgroundColor: '#f3f4f6',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.text,
  },
  detailRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: COLOR.textMuted,
  },
  priceTag: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.text,
  },
  cardActions: {
    marginTop: SPACING.xs,
    justifyContent: 'flex-end',
  },
  publishBtn: {
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.primary,
  },
  publishBtnText: {
    color: COLOR.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  stopBtn: {
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  stopBtnText: {
    color: COLOR.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  formHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.text,
  },
  pickerRow: {
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: STATUS_THEME.info.background,
    borderColor: COLOR.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLOR.text,
  },
  chipTextSelected: {
    color: COLOR.primary,
    fontWeight: '700',
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
  switchRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  switchLabel: {
    flex: 1,
    fontSize: 13,
    color: COLOR.text,
    paddingRight: SPACING.sm,
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
  navFooter: {
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  backBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
