/**
 * ScreenContainer — wraps screens with RTL mirroring, accessibility, and header navigation.
 * I18N-003 (RTL layout), A11Y-002, BP §78.2.
 */
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { type Locale, translate } from '@kaamkaro/i18n';
import { COLOR, interactiveProps, minTapTargetStyle, SPACING, textTokens } from '@kaamkaro/ui';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export interface ScreenContainerProps {
  readonly title?: string;
  readonly showBackButton?: boolean;
  readonly showLanguageToggle?: boolean;
  readonly children: React.ReactNode;
  readonly scrollable?: boolean;
  readonly style?: ViewStyle;
  readonly testID?: string;
}

export function ScreenContainer({
  title,
  showBackButton = true,
  showLanguageToggle = true,
  children,
  scrollable = true,
  style,
  testID,
}: ScreenContainerProps): React.JSX.Element {
  const { locale, setLocale, goBack } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const backA11y = interactiveProps({
    testID: 'header-back-button',
    accessibilityRole: 'button',
    accessibilityLabel: translate(locale, 'common.action.back'),
  });

  const langA11y = interactiveProps({
    testID: 'header-lang-toggle',
    accessibilityRole: 'button',
    accessibilityLabel: translate(locale, 'common.language.toggleA11y'),
  });

  const nextLocale: Locale = locale === 'en' ? 'ur' : 'en';

  const headerContent = (title || showBackButton || showLanguageToggle) && (
    <View style={[styles.header, { flexDirection: mirror.row }]}>
      <View style={styles.headerSide}>
        {showBackButton ? (
          <TouchableOpacity
            {...backA11y}
            onPress={goBack}
            style={[styles.headerButton, minTapTargetStyle()]}
          >
            <Text
              style={[styles.backIconText, { transform: [{ scaleX: locale === 'ur' ? -1 : 1 }] }]}
            >
              ←
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.headerCenter}>
        {title ? (
          <Text
            style={[
              styles.headerTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerSide}>
        {showLanguageToggle ? (
          <TouchableOpacity
            {...langA11y}
            onPress={() => setLocale(nextLocale)}
            style={[styles.headerButton, minTapTargetStyle()]}
          >
            <Text style={[styles.langText, textTokens(locale, 'label')]}>
              {translate(locale, 'common.language.toggle')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView testID={testID} style={[styles.safeArea, { direction: mirror.direction }]}>
      {headerContent}
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fixedContent, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: COLOR.background,
    minHeight: 52,
  },
  headerSide: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    padding: SPACING.xs,
  },
  backIconText: {
    fontSize: 22,
    color: COLOR.text,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLOR.text,
  },
  langText: {
    fontWeight: 'bold',
    color: COLOR.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: 6,
  },
  scrollContent: {
    padding: SPACING.lg,
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
    padding: SPACING.lg,
  },
});
