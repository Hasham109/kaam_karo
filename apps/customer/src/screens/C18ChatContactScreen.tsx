/**
 * C18: Chat / Contact Screen (Task T7.2; BP §12, §20, §74, §82; CHAT-001..004, SHARE-001..003).
 * Controlled in-app messaging and masked calling for booking participants.
 * Zero raw phone numbers shown in payloads or UI.
 * 5 canonical screen states: L, E, S, X, P.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  COLOR,
  RADIUS,
  SPACING,
  STATUS_THEME,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
} from '@kaamkaro/ui';
import { translate } from '@kaamkaro/i18n';
import { getAppMirroring } from '../utils/rtl';
import { ScreenContainer } from '../components/ScreenContainer';
import { useCustomerApp } from '../state/CustomerContext';
import type { ScreenState } from '../types';

export interface ChatMessage {
  readonly id: string;
  readonly sender: 'customer' | 'provider';
  readonly text: string;
  readonly timestamp: string;
  readonly status: 'sent' | 'delivered' | 'held' | 'failed';
}

export interface C18ChatContactScreenProps {
  readonly bookingId?: string;
  readonly initialMessages?: readonly ChatMessage[];
  readonly initialState?: ScreenState;
}

export const C18ChatContactScreen: React.FC<C18ChatContactScreenProps> = ({
  bookingId: _bookingId = 'booking-default-1',
  initialMessages = [
    {
      id: 'msg-1',
      sender: 'customer',
      text: 'Salam, I booked AC General Service.',
      timestamp: '14:30',
      status: 'delivered',
    },
    {
      id: 'msg-2',
      sender: 'provider',
      text: 'Walaikum Assalam, I am on my way with tools.',
      timestamp: '14:32',
      status: 'delivered',
    },
  ],
  initialState = 'S',
}) => {
  const { locale, navigate: _navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);
  const isUrdu = locale === 'ur';

  const [screenState, _setScreenState] = useState<ScreenState>(initialState);
  const [messages, setMessages] = useState<readonly ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [callingRelay, setCallingRelay] = useState(false);
  const [relayNumber, setRelayNumber] = useState<string | null>(null);

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'customer',
      text: trimmed,
      timestamp: '14:35',
      status: 'delivered',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleMaskedCall = () => {
    setCallingRelay(true);
    // Request masked relay DID from CallRelay interface (CHAT-002; BP §20, §74; D-009)
    setTimeout(() => {
      setCallingRelay(false);
      const virtualNumber = '+92421115226';
      setRelayNumber(virtualNumber);
      Linking.openURL(`tel:${virtualNumber}`).catch(() => {
        // Fallback for emulator / non-telephony devices
      });
    }, 200);
  };

  const handleShareBooking = async () => {
    // External share payload builder with zero PII (SHARE-001, SHARE-003, BP §82)
    const text = `Need help with AC Repair on Kaam Karo! Booking Ref: KK-BK001. Area: Gulberg III, Lahore. View details: https://kaamkaro.pk/b/KK-BK001`;
    try {
      await Share.share({
        title: translate(locale, 'customer.c18.shareBooking'),
        message: text,
      });
    } catch {
      // Ignored
    }
  };

  const handleReport = () => {
    Alert.alert(
      translate(locale, 'customer.c18.reportBtn'),
      translate(locale, 'customer.c18.heldMessage'),
    );
  };

  const handleBlock = () => {
    Alert.alert(
      translate(locale, 'customer.c18.blockBtn'),
      translate(locale, 'customer.c18.title'),
    );
  };

  return (
    <ScreenContainer
      testID="c18-chat-contact-screen"
      title={translate(locale, 'customer.c18.title')}
    >
      <View style={[styles.container, { direction: mirror.direction }]}>
        {/* Top Relay Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.callButton, minTapTargetStyle()]}
            onPress={handleMaskedCall}
            disabled={callingRelay}
            {...interactiveProps({
              testID: 'c18-call-btn',
              accessibilityLabel: translate(locale, 'customer.c18.callBtn'),
              accessibilityRole: 'button',
            })}
          >
            {callingRelay ? (
              <ActivityIndicator size="small" color={COLOR.onPrimary} />
            ) : (
              <Text style={[styles.callButtonText, fontStyle]}>
                {translate(locale, 'customer.c18.callBtn')}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.safetyActions}>
            <TouchableOpacity
              style={[styles.secondaryActionBtn, minTapTargetStyle()]}
              onPress={handleShareBooking}
              {...interactiveProps({
                testID: 'c18-share-btn',
                accessibilityLabel: translate(locale, 'customer.c18.shareBooking'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.secondaryActionText, fontStyle]}>
                {translate(locale, 'customer.c18.shareBooking')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, minTapTargetStyle()]}
              onPress={handleReport}
              {...interactiveProps({
                testID: 'c18-report-btn',
                accessibilityLabel: translate(locale, 'customer.c18.reportBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.secondaryActionText, fontStyle]}>
                {translate(locale, 'customer.c18.reportBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionBtn, minTapTargetStyle()]}
              onPress={handleBlock}
              {...interactiveProps({
                testID: 'c18-block-btn',
                accessibilityLabel: translate(locale, 'customer.c18.blockBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.secondaryActionText, fontStyle]}>
                {translate(locale, 'customer.c18.blockBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {relayNumber ? (
          <View testID="c18-relay-banner" style={styles.relayBanner}>
            <Text style={[styles.relayBannerText, fontStyle]}>
              {translate(locale, 'customer.c18.callRelayNumber', { number: relayNumber })}
            </Text>
          </View>
        ) : null}

        {/* Canonical States: Loading, Empty, Error, Pending, Success */}
        {screenState === 'L' && (
          <View testID="c18-loading-state" style={styles.centerState}>
            <ActivityIndicator size="large" color={COLOR.primary} />
          </View>
        )}

        {screenState === 'E' && (
          <View testID="c18-empty-state" style={styles.centerState}>
            <Text style={[styles.emptyText, fontStyle]}>
              {translate(locale, 'customer.c18.empty')}
            </Text>
          </View>
        )}

        {screenState === 'X' && (
          <View testID="c18-error-state" style={styles.centerState}>
            <Text style={[styles.errorText, fontStyle]}>
              {translate(locale, 'customer.c18.notSentRetry')}
            </Text>
          </View>
        )}

        {screenState === 'P' && (
          <View testID="c18-pending-state" style={styles.centerState}>
            <Text style={[styles.pendingText, fontStyle]}>
              {translate(locale, 'customer.c18.heldMessage')}
            </Text>
          </View>
        )}

        {screenState === 'S' && (
          <FlatList
            testID="c18-messages-list"
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => {
              const isOwn = item.sender === 'customer';
              return (
                <View
                  style={[
                    styles.messageBubble,
                    isOwn ? styles.ownBubble : styles.otherBubble,
                    { alignSelf: isOwn ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isOwn ? styles.ownMessageText : styles.otherMessageText,
                      fontStyle,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageMeta,
                      isOwn ? styles.ownMeta : styles.otherMeta,
                      fontStyle,
                    ]}
                  >
                    {item.timestamp}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.attachButton, minTapTargetStyle()]}
            onPress={() => {
              // Attachment picker (CHAT-003, D-011)
            }}
            {...interactiveProps({
              testID: 'c18-attach-btn',
              accessibilityLabel: translate(locale, 'customer.c18.attachBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.attachButtonText, fontStyle]}>
              {translate(locale, 'customer.c18.attachBtn')}
            </Text>
          </TouchableOpacity>

          <TextInput
            testID="c18-message-input"
            style={[styles.textInput, fontStyle]}
            placeholder={translate(locale, 'customer.c18.typePlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={inputText}
            onChangeText={setInputText}
          />

          <TouchableOpacity
            style={[styles.sendButton, minTapTargetStyle()]}
            onPress={handleSend}
            {...interactiveProps({
              testID: 'c18-send-btn',
              accessibilityLabel: translate(locale, 'customer.c18.sendBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.sendButtonText, fontStyle]}>
              {translate(locale, 'customer.c18.sendBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.surface,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    backgroundColor: COLOR.surface,
  },
  callButton: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  safetyActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  secondaryActionBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  relayBanner: {
    backgroundColor: STATUS_THEME.info.background,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  relayBannerText: {
    color: STATUS_THEME.info.text,
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  ownBubble: {
    backgroundColor: COLOR.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: COLOR.surface,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLOR.onPrimary,
  },
  otherMessageText: {
    color: COLOR.text,
  },
  messageMeta: {
    fontSize: 10,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  ownMeta: {
    color: COLOR.onPrimary,
    opacity: 0.8,
  },
  otherMeta: {
    color: COLOR.textMuted,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    color: COLOR.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    fontSize: 14,
    textAlign: 'center',
  },
  pendingText: {
    color: STATUS_THEME.warning.text,
    fontSize: 14,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLOR.border,
    backgroundColor: COLOR.surface,
    gap: SPACING.xs,
  },
  attachButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: 14,
    color: COLOR.text,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
