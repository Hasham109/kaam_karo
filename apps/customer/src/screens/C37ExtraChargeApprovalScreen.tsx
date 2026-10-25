/**
 * C37: Extra-Charge Approval Sheet & Dispute Screen (T4.6; BP §9, BP §52.1, BP §58.2; FARE-004, FARE-012, PRICE-007; PROV-CREW-004; BOOK-CANCEL-006).
 * Features:
 * - Proposed extra charge lines with toolsReason (FARE-004) and materialsClass (PRICE-005).
 * - Strict Invariant (FARE-012, PRICE-007): Proposed lines are strictly NON-PAYABLE until customer explicitly approves.
 * - Individual line Approve / Reject actions with live recalculation of payable total.
 * - Crew size change proposal review (PROV-CREW-004).
 * - AI smart charge explanation (REQ-AI-013, BP §56.3).
 * - Cancellation / safety dispute escalation flow (BOOK-CANCEL-003, BOOK-CANCEL-006).
 * - 5 canonical screen states (L, E, S, X, P).
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  COLOR,
  RADIUS,
  SPACING,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import { formatPkr, translate } from '@kaamkaro/i18n';
import { getAppMirroring } from '../utils/rtl';
import { ScreenContainer } from '../components/ScreenContainer';
import { useCustomerApp } from '../state/CustomerContext';
import {
  MOCK_CANCELLATION_REASONS,
  MOCK_PROPOSED_EXTRAS,
  MOCK_TRACKING_BOOKING,
} from '../data/mock-data';
import type {
  CustomerTrackingBooking,
  ExtraLineStatus,
  ProposedExtraChargeItem,
  ScreenState,
} from '../types';

export interface C37ExtraChargeApprovalScreenProps {
  readonly initialBooking?: CustomerTrackingBooking;
  readonly initialExtras?: readonly ProposedExtraChargeItem[];
  readonly initialState?: ScreenState;
  readonly initialTab?: 'charges' | 'dispute' | 'crew';
}

export const C37ExtraChargeApprovalScreen: React.FC<C37ExtraChargeApprovalScreenProps> = ({
  initialBooking = MOCK_TRACKING_BOOKING,
  initialExtras = MOCK_PROPOSED_EXTRAS,
  initialState = 'S',
  initialTab = 'charges',
}) => {
  const { locale } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [activeTab, setActiveTab] = useState<'charges' | 'dispute' | 'crew'>(initialTab);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);
  const [extras, setExtras] = useState<readonly ProposedExtraChargeItem[]>(initialExtras);
  const [crewChangeStatus, setCrewChangeStatus] = useState<ExtraLineStatus>('PROPOSED');
  const [explainedLineId, setExplainedLineId] = useState<string | null>(null);

  // Dispute state
  const [selectedDisputeReason, setSelectedDisputeReason] = useState<string>(
    MOCK_CANCELLATION_REASONS[0]?.id ?? 'found_alternate',
  );
  const [disputeNotes, setDisputeNotes] = useState<string>('');
  const [disputeSubmitted, setDisputeSubmitted] = useState<boolean>(false);

  // Invariant (FARE-012, PRICE-007):
  // Proposed lines are strictly non-payable until approved!
  const basePricePkr = initialBooking.agreedPricePkr;
  const approvedExtrasPkr = extras
    .filter((line) => line.status === 'APPROVED')
    .reduce((sum, line) => sum + line.amountPkr, 0);

  const currentPayableTotalPkr = basePricePkr + approvedExtrasPkr;

  const potentialTotalPkr =
    basePricePkr +
    extras
      .filter((line) => line.status !== 'REJECTED')
      .reduce((sum, line) => sum + line.amountPkr, 0);

  const handleApproveLine = (lineId: string) => {
    setExtras((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, status: 'APPROVED' } : item)),
    );
  };

  const handleRejectLine = (lineId: string) => {
    setExtras((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, status: 'REJECTED' } : item)),
    );
  };

  const handleExplain = (lineId: string) => {
    setExplainedLineId(explainedLineId === lineId ? null : lineId);
  };

  const handleApproveCrew = () => {
    setCrewChangeStatus('APPROVED');
  };

  const handleRejectCrew = () => {
    setCrewChangeStatus('REJECTED');
  };

  const handleSubmitDispute = () => {
    setDisputeSubmitted(true);
  };

  // 1. Loading State (L)
  if (screenState === 'L') {
    return (
      <ScreenContainer testID="c37-sheet-loading" title={translate(locale, 'customer.c37.title')}>
        <View style={styles.stateCenterContainer} testID="c37-loading-state">
          <Text style={[styles.stateTitle, textTokens(locale, 'body')]}>
            {translate(locale, 'customer.c37.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 2. Error State (X)
  if (screenState === 'X') {
    return (
      <ScreenContainer testID="c37-sheet-error" title={translate(locale, 'customer.c37.title')}>
        <View style={styles.stateCenterContainer} testID="c37-error-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c37.stateError')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c37-retry-button',
              accessibilityLabel: translate(locale, 'customer.c37.stateError'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.btnTextPrimary, textTokens(locale, 'label')]}>
              {translate(locale, 'common.action.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // 3. Empty State (E)
  if (screenState === 'E' || (extras.length === 0 && !initialBooking.pendingCrewChange)) {
    return (
      <ScreenContainer testID="c37-sheet-empty" title={translate(locale, 'customer.c37.title')}>
        <View style={styles.stateCenterContainer} testID="c37-empty-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c37.emptyPending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 4. Pending State (P)
  if (screenState === 'P') {
    return (
      <ScreenContainer testID="c37-sheet-pending" title={translate(locale, 'customer.c37.title')}>
        <View style={styles.stateCenterContainer} testID="c37-pending-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c37.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 5. Success State (S)
  return (
    <ScreenContainer testID="c37-approval-screen" title={translate(locale, 'customer.c37.title')}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Tabs (Charges, Crew Proposal, Dispute) */}
        <View style={[styles.tabBar, { flexDirection: mirror.row }]} testID="c37-tab-bar">
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'charges' && styles.tabItemActive,
              minTapTargetStyle(),
            ]}
            onPress={() => setActiveTab('charges')}
            {...interactiveProps({
              testID: 'c37-tab-charges',
              accessibilityLabel: translate(locale, 'customer.c37.proposedLineHeader'),
              accessibilityRole: 'button',
            })}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'charges' && styles.tabTextActive,
                textTokens(locale, 'label'),
              ]}
            >
              {translate(locale, 'customer.c37.proposedLineHeader')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'crew' && styles.tabItemActive,
              minTapTargetStyle(),
            ]}
            onPress={() => setActiveTab('crew')}
            {...interactiveProps({
              testID: 'c37-tab-crew',
              accessibilityLabel: translate(locale, 'customer.c37.crewChangeHeader'),
              accessibilityRole: 'button',
            })}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'crew' && styles.tabTextActive,
                textTokens(locale, 'label'),
              ]}
            >
              {translate(locale, 'customer.c37.crewChangeHeader')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'dispute' && styles.tabItemActive,
              minTapTargetStyle(),
            ]}
            onPress={() => setActiveTab('dispute')}
            {...interactiveProps({
              testID: 'c37-tab-dispute',
              accessibilityLabel: translate(locale, 'customer.c37.disputeHeader'),
              accessibilityRole: 'button',
            })}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'dispute' && styles.tabTextActive,
                textTokens(locale, 'label'),
              ]}
            >
              {translate(locale, 'customer.c37.disputeHeader')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: EXTRA CHARGES APPROVAL */}
        {activeTab === 'charges' ? (
          <View style={styles.tabContent} testID="c37-charges-content">
            {/* Non-Payable Invariant Banner (FARE-012, PRICE-007) */}
            <View style={styles.invariantBanner} testID="c37-invariant-banner">
              <Text
                style={[
                  styles.invariantText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                🛡️ {translate(locale, 'customer.c37.notPayableNotice')}
              </Text>
            </View>

            {/* Total Summary Card */}
            <View style={styles.card} testID="c37-totals-card">
              <View style={[styles.rowBetween, { flexDirection: mirror.row }]}>
                <Text
                  style={[
                    styles.totalLabel,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {translate(locale, 'customer.c19.agreedPrice', {
                    amount: formatPkr(locale, basePricePkr),
                  })}
                </Text>
                <Text style={[styles.approvedExtrasText, textTokens(locale, 'body')]}>
                  + {formatPkr(locale, approvedExtrasPkr)}
                </Text>
              </View>

              <View
                style={[styles.rowBetween, styles.currentPayableRow, { flexDirection: mirror.row }]}
              >
                <Text
                  style={[
                    styles.currentPayableLabel,
                    textTokens(locale, 'title'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {translate(locale, 'customer.c37.payableTotalLabel')}
                </Text>
                <Text
                  style={[styles.currentPayableAmount, textTokens(locale, 'headline')]}
                  testID="c37-current-payable-total"
                >
                  {formatPkr(locale, currentPayableTotalPkr)}
                </Text>
              </View>

              <Text
                style={[
                  styles.previewText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
                testID="c37-potential-total-preview"
              >
                {translate(locale, 'customer.c37.newTotalPreview', {
                  amount: formatPkr(locale, potentialTotalPkr),
                })}
              </Text>
            </View>

            {/* Proposed Extra Lines List */}
            {extras.map((item, index) => {
              const isApproved = item.status === 'APPROVED';
              const isRejected = item.status === 'REJECTED';
              const isProposed = item.status === 'PROPOSED';
              const isExplaining = explainedLineId === item.id;

              return (
                <View
                  key={item.id}
                  style={[styles.card, styles.itemCard]}
                  testID={`c37-extra-item-${index}`}
                >
                  <View style={[styles.rowBetween, { flexDirection: mirror.row }]}>
                    <Text
                      style={[
                        styles.itemDescription,
                        textTokens(locale, 'title'),
                        { textAlign: mirror.textAlign, flex: 1 },
                      ]}
                    >
                      {item.description}
                    </Text>
                    <Text style={[styles.itemAmount, textTokens(locale, 'title')]}>
                      {formatPkr(locale, item.amountPkr)}
                    </Text>
                  </View>

                  {/* Quantity & Unit */}
                  {item.quantity && item.unit ? (
                    <Text
                      style={[
                        styles.qtyText,
                        textTokens(locale, 'label'),
                        { textAlign: mirror.textAlign },
                      ]}
                    >
                      {item.quantity} {item.unit}
                    </Text>
                  ) : null}

                  {/* Tools Reason (FARE-004) */}
                  {item.toolsReason ? (
                    <View style={styles.reasonBox} testID={`c37-tools-reason-${index}`}>
                      <Text
                        style={[
                          styles.reasonText,
                          textTokens(locale, 'label'),
                          { textAlign: mirror.textAlign },
                        ]}
                      >
                        🔧{' '}
                        {translate(locale, 'customer.c37.toolsReasonPrefix', {
                          reason: item.toolsReason,
                        })}
                      </Text>
                    </View>
                  ) : null}

                  {/* Materials Class (PRICE-005) */}
                  {item.materialsClass ? (
                    <Text
                      style={[
                        styles.materialsClassText,
                        textTokens(locale, 'label'),
                        { textAlign: mirror.textAlign },
                      ]}
                    >
                      📦{' '}
                      {translate(locale, 'customer.c37.materialsClassPrefix', {
                        class: item.materialsClass,
                      })}
                    </Text>
                  ) : null}

                  {/* AI Smart Explanation (REQ-AI-013, BP §56.3) */}
                  {isExplaining ? (
                    <View style={styles.aiExplanationBox} testID={`c37-ai-explanation-${index}`}>
                      <Text
                        style={[
                          styles.aiExplanationText,
                          textTokens(locale, 'label'),
                          { textAlign: mirror.textAlign },
                        ]}
                      >
                        🤖 {translate(locale, 'customer.c37.explanationAi')}
                      </Text>
                    </View>
                  ) : null}

                  {/* Decision Status or Action Buttons */}
                  <View
                    style={[styles.actionRow, { flexDirection: mirror.row }]}
                    testID={`c37-action-row-${index}`}
                  >
                    {isProposed ? (
                      <>
                        <TouchableOpacity
                          style={[styles.approveBtn, minTapTargetStyle()]}
                          onPress={() => handleApproveLine(item.id)}
                          {...interactiveProps({
                            testID: `c37-approve-button-${index}`,
                            accessibilityLabel: translate(locale, 'customer.c37.approveBtn'),
                            accessibilityRole: 'button',
                          })}
                        >
                          <Text style={[styles.approveBtnText, textTokens(locale, 'label')]}>
                            ✓ {translate(locale, 'customer.c37.approveBtn')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.rejectBtn, minTapTargetStyle()]}
                          onPress={() => handleRejectLine(item.id)}
                          {...interactiveProps({
                            testID: `c37-reject-button-${index}`,
                            accessibilityLabel: translate(locale, 'customer.c37.rejectBtn'),
                            accessibilityRole: 'button',
                          })}
                        >
                          <Text style={[styles.rejectBtnText, textTokens(locale, 'label')]}>
                            ✕ {translate(locale, 'customer.c37.rejectBtn')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.explainBtn, minTapTargetStyle()]}
                          onPress={() => handleExplain(item.id)}
                          {...interactiveProps({
                            testID: `c37-explain-button-${index}`,
                            accessibilityLabel: translate(locale, 'customer.c37.explainBtn'),
                            accessibilityRole: 'button',
                          })}
                        >
                          <Text style={[styles.explainBtnText, textTokens(locale, 'label')]}>
                            {translate(locale, 'customer.c37.explainBtn')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : isApproved ? (
                      <View style={styles.approvedPill} testID={`c37-approved-badge-${index}`}>
                        <Text style={styles.approvedPillText}>
                          ✓ {translate(locale, 'customer.c37.approvedStatus')}
                        </Text>
                      </View>
                    ) : isRejected ? (
                      <View style={styles.rejectedPill} testID={`c37-rejected-badge-${index}`}>
                        <Text style={styles.rejectedPillText}>
                          ✕ {translate(locale, 'customer.c37.rejectedStatus')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* TAB 2: CREW SIZE PROPOSAL (PROV-CREW-004) */}
        {activeTab === 'crew' ? (
          <View style={styles.tabContent} testID="c37-crew-content">
            <View style={styles.card} testID="c37-crew-change-card">
              <Text
                style={[
                  styles.cardTitle,
                  textTokens(locale, 'title'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c37.crewChangeHeader')}
              </Text>
              {initialBooking.pendingCrewChange ? (
                <View style={styles.crewChangeBox}>
                  <Text
                    style={[
                      styles.crewChangeText,
                      textTokens(locale, 'headline'),
                      { textAlign: mirror.textAlign },
                    ]}
                    testID="c37-crew-change-text"
                  >
                    👥{' '}
                    {translate(locale, 'customer.c37.crewChangeText', {
                      old: initialBooking.pendingCrewChange.oldSize,
                      new: initialBooking.pendingCrewChange.newSize,
                    })}
                  </Text>

                  {crewChangeStatus === 'PROPOSED' ? (
                    <View style={[styles.actionRow, { flexDirection: mirror.row }]}>
                      <TouchableOpacity
                        style={[styles.approveBtn, minTapTargetStyle()]}
                        onPress={handleApproveCrew}
                        {...interactiveProps({
                          testID: 'c37-crew-approve-button',
                          accessibilityLabel: translate(locale, 'customer.c37.approveBtn'),
                          accessibilityRole: 'button',
                        })}
                      >
                        <Text style={[styles.approveBtnText, textTokens(locale, 'label')]}>
                          ✓ {translate(locale, 'customer.c37.approveBtn')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rejectBtn, minTapTargetStyle()]}
                        onPress={handleRejectCrew}
                        {...interactiveProps({
                          testID: 'c37-crew-reject-button',
                          accessibilityLabel: translate(locale, 'customer.c37.rejectBtn'),
                          accessibilityRole: 'button',
                        })}
                      >
                        <Text style={[styles.rejectBtnText, textTokens(locale, 'label')]}>
                          ✕ {translate(locale, 'customer.c37.rejectBtn')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      style={
                        crewChangeStatus === 'APPROVED' ? styles.approvedPill : styles.rejectedPill
                      }
                      testID="c37-crew-status-badge"
                    >
                      <Text
                        style={
                          crewChangeStatus === 'APPROVED'
                            ? styles.approvedPillText
                            : styles.rejectedPillText
                        }
                      >
                        {crewChangeStatus === 'APPROVED'
                          ? translate(locale, 'customer.c37.approvedStatus')
                          : translate(locale, 'customer.c37.rejectedStatus')}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text
                  style={[
                    styles.noPendingText,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {translate(locale, 'customer.c37.emptyPending')}
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* TAB 3: DISPUTE & SAFETY STOP (BOOK-CANCEL-006) */}
        {activeTab === 'dispute' ? (
          <View style={styles.tabContent} testID="c37-dispute-content">
            <View style={styles.card} testID="c37-dispute-form-card">
              <Text
                style={[
                  styles.cardTitle,
                  textTokens(locale, 'title'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c37.disputeHeader')}
              </Text>

              {disputeSubmitted ? (
                <View style={styles.disputeSuccessBox} testID="c37-dispute-success-box">
                  <Text
                    style={[
                      styles.disputeSuccessText,
                      textTokens(locale, 'body'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    ✓ {translate(locale, 'customer.c37.disputeSuccessNotice')}
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.inputLabel,
                      textTokens(locale, 'label'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {translate(locale, 'customer.c37.disputeReasonLabel')}
                  </Text>

                  {/* Reasons Radio list */}
                  <View style={styles.reasonsList}>
                    {MOCK_CANCELLATION_REASONS.map((reason) => {
                      const isSelected = selectedDisputeReason === reason.id;
                      return (
                        <TouchableOpacity
                          key={reason.id}
                          style={[
                            styles.reasonRow,
                            isSelected && styles.reasonRowSelected,
                            { flexDirection: mirror.row },
                          ]}
                          onPress={() => setSelectedDisputeReason(reason.id)}
                          {...interactiveProps({
                            testID: `c37-reason-${reason.id}`,
                            accessibilityLabel: locale === 'ur' ? reason.labelUr : reason.labelEn,
                            accessibilityRole: 'button',
                          })}
                        >
                          <View style={[styles.radioCircle, isSelected && styles.radioSelected]} />
                          <Text
                            style={[
                              styles.reasonLabel,
                              textTokens(locale, 'body'),
                              { textAlign: mirror.textAlign, flex: 1 },
                            ]}
                          >
                            {locale === 'ur' ? reason.labelUr : reason.labelEn}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Details input */}
                  <Text
                    style={[
                      styles.inputLabel,
                      textTokens(locale, 'label'),
                      { textAlign: mirror.textAlign, marginTop: SPACING.md },
                    ]}
                  >
                    {translate(locale, 'customer.c37.disputeNotesLabel')}
                  </Text>
                  <TextInput
                    style={[styles.notesInput, textTokens(locale, 'body')]}
                    placeholder={translate(locale, 'customer.c37.disputeNotesPlaceholder')}
                    value={disputeNotes}
                    onChangeText={setDisputeNotes}
                    multiline
                    numberOfLines={3}
                    testID="c37-dispute-notes-input"
                  />

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitDisputeBtn, minTapTargetStyle()]}
                    onPress={handleSubmitDispute}
                    {...interactiveProps({
                      testID: 'c37-submit-dispute-button',
                      accessibilityLabel: translate(locale, 'customer.c37.submitDisputeBtn'),
                      accessibilityRole: 'button',
                    })}
                  >
                    <Text style={[styles.submitDisputeText, textTokens(locale, 'label')]}>
                      {translate(locale, 'customer.c37.submitDisputeBtn')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  tabBar: {
    backgroundColor: '#ECEFF1',
    borderRadius: RADIUS.sheet,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  tabItemActive: {
    backgroundColor: COLOR.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  tabTextActive: {
    color: COLOR.primary,
    fontWeight: '700',
  },
  tabContent: {
    gap: SPACING.md,
  },
  invariantBanner: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  invariantText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  rowBetween: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: COLOR.textMuted,
  },
  approvedExtrasText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  currentPayableRow: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  currentPayableLabel: {
    color: COLOR.text,
  },
  currentPayableAmount: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  previewText: {
    color: COLOR.textMuted,
    marginTop: 4,
  },
  itemCard: {
    gap: SPACING.xs,
  },
  itemDescription: {
    color: COLOR.text,
  },
  itemAmount: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  qtyText: {
    color: COLOR.textMuted,
  },
  reasonBox: {
    backgroundColor: '#FFF3E0',
    padding: SPACING.xs,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  reasonText: {
    color: '#E65100',
  },
  materialsClassText: {
    color: COLOR.textMuted,
  },
  aiExplanationBox: {
    backgroundColor: '#F3E5F5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E1BEE7',
    marginTop: SPACING.xs,
  },
  aiExplanationText: {
    color: '#6A1B9A',
  },
  actionRow: {
    gap: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  approveBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: '#C62828',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  explainBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  explainBtnText: {
    color: '#7B1FA2',
    fontWeight: '600',
  },
  approvedPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  approvedPillText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  rejectedPill: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  rejectedPillText: {
    color: '#C62828',
    fontWeight: '700',
  },
  cardTitle: {
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  crewChangeBox: {
    gap: SPACING.md,
    alignItems: 'center',
    padding: SPACING.md,
  },
  crewChangeText: {
    color: COLOR.text,
  },
  noPendingText: {
    color: COLOR.textMuted,
  },
  inputLabel: {
    color: COLOR.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  reasonsList: {
    gap: SPACING.xs,
  },
  reasonRow: {
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F5F5F5',
  },
  reasonRowSelected: {
    backgroundColor: '#E0F2F1',
    borderColor: COLOR.primary,
    borderWidth: 1,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9E9E9E',
  },
  radioSelected: {
    borderColor: COLOR.primary,
    backgroundColor: COLOR.primary,
  },
  reasonLabel: {
    color: COLOR.text,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitDisputeBtn: {
    backgroundColor: '#D32F2F',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  submitDisputeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disputeSuccessBox: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  disputeSuccessText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  stateCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  stateTitle: {
    color: COLOR.text,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  btnTextPrimary: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
});
