/**
 * Customer App Root & Screen Router (T3.8; BP §12, ARCH §3.1, docs/screens/customer.md).
 * Screens: C01-C11 + C41.
 * Owner: A11 (customer-app).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { COLOR } from '@kaamkaro/ui';
import { CustomerAppProvider, useCustomerApp } from './state/CustomerContext';
import { C01SplashScreen } from './screens/C01SplashScreen';
import { C02WelcomeScreen } from './screens/C02WelcomeScreen';
import { C03LoginScreen } from './screens/C03LoginScreen';
import { C04RegisterScreen } from './screens/C04RegisterScreen';
import { C05OtpScreen } from './screens/C05OtpScreen';
import { C06HomeScreen } from './screens/C06HomeScreen';
import { C07SearchScreen } from './screens/C07SearchScreen';
import { C08SearchResultsScreen } from './screens/C08SearchResultsScreen';
import { C09CategoryScreen } from './screens/C09CategoryScreen';
import { C10ServiceDetailScreen } from './screens/C10ServiceDetailScreen';
import { C11ProviderProfileScreen } from './screens/C11ProviderProfileScreen';
import { C12RequestScreen } from './screens/C12RequestScreen';
import { C13QuoteDetailScreen } from './screens/C13QuoteDetailScreen';
import { C14BookingReviewScreen } from './screens/C14BookingReviewScreen';
import { C15BookingConfirmationScreen } from './screens/C15BookingConfirmationScreen';
import { C16PaymentScreen } from './screens/C16PaymentScreen';
import { C17BookingTrackingScreen } from './screens/C17BookingTrackingScreen';
import { C18ChatContactScreen } from './screens/C18ChatContactScreen';
import { C19JobInProgressScreen } from './screens/C19JobInProgressScreen';
import { C20CompletionConfirmScreen } from './screens/C20CompletionConfirmScreen';
import { C21ReviewScreen } from './screens/C21ReviewScreen';
import { C24PaymentReceiptsScreen } from './screens/C24PaymentReceiptsScreen';
import { C31ComposerScreen } from './screens/C31ComposerScreen';
import { C32AudioRecorderScreen } from './screens/C32AudioRecorderScreen';
import { C33VideoRecorderScreen } from './screens/C33VideoRecorderScreen';
import { C34SummaryScreen } from './screens/C34SummaryScreen';
import { C35SupplierMatchResultsScreen } from './screens/C35SupplierMatchResultsScreen';
import { C36OffersComparisonScreen } from './screens/C36OffersComparisonScreen';
import { C37ExtraChargeApprovalScreen } from './screens/C37ExtraChargeApprovalScreen';
import { C38VoiceAssistantScreen } from './screens/C38VoiceAssistantScreen';
import { C39LocationConfirmScreen } from './screens/C39LocationConfirmScreen';
import { C40SupplyGapScreen } from './screens/C40SupplyGapScreen';
import { C41LanguageScreen } from './screens/C41LanguageScreen';

// Type-only import for DevSmoke entry (erased at compile time)
import type * as DevSmokeEntry from './dev/urdu-smoke/entry';

type DevSmokeModule = typeof DevSmokeEntry;

const devSmoke: DevSmokeModule | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only lazy load (T0.6)
    (require('./dev/urdu-smoke/entry') as DevSmokeModule)
  : null;

function CustomerRouter(): React.JSX.Element {
  const { currentScreen } = useCustomerApp();

  switch (currentScreen) {
    case 'C01':
      return <C01SplashScreen />;
    case 'C02':
      return <C02WelcomeScreen />;
    case 'C03':
      return <C03LoginScreen />;
    case 'C04':
      return <C04RegisterScreen />;
    case 'C05':
      return <C05OtpScreen />;
    case 'C06':
      return <C06HomeScreen />;
    case 'C07':
      return <C07SearchScreen />;
    case 'C08':
      return <C08SearchResultsScreen />;
    case 'C09':
      return <C09CategoryScreen />;
    case 'C10':
      return <C10ServiceDetailScreen />;
    case 'C11':
      return <C11ProviderProfileScreen />;
    case 'C12':
      return <C12RequestScreen />;
    case 'C13':
      return <C13QuoteDetailScreen />;
    case 'C14':
      return <C14BookingReviewScreen />;
    case 'C15':
      return <C15BookingConfirmationScreen />;
    case 'C16':
      return <C16PaymentScreen />;
    case 'C17':
      return <C17BookingTrackingScreen />;
    case 'C18':
      return <C18ChatContactScreen />;
    case 'C19':
      return <C19JobInProgressScreen />;
    case 'C20':
      return <C20CompletionConfirmScreen />;
    case 'C21':
      return <C21ReviewScreen />;
    case 'C24':
      return <C24PaymentReceiptsScreen />;
    case 'C31':
      return <C31ComposerScreen />;
    case 'C32':
      return <C32AudioRecorderScreen />;
    case 'C33':
      return <C33VideoRecorderScreen />;
    case 'C34':
      return <C34SummaryScreen />;
    case 'C35':
      return <C35SupplierMatchResultsScreen />;
    case 'C36':
      return <C36OffersComparisonScreen />;
    case 'C37':
      return <C37ExtraChargeApprovalScreen />;
    case 'C38':
      return <C38VoiceAssistantScreen />;
    case 'C39':
      return <C39LocationConfirmScreen />;
    case 'C40':
      return <C40SupplyGapScreen />;
    case 'C41':
      return <C41LanguageScreen />;
    default:
      return <C06HomeScreen />;
  }
}

export default function App(): React.JSX.Element {
  const [showSmoke, setShowSmoke] = useState(false);
  const closeSmoke = useCallback(() => setShowSmoke(false), []);

  if (devSmoke !== null && showSmoke) {
    return <devSmoke.UrduSmokeScreen initialLocale="ur" onBack={closeSmoke} />;
  }

  return (
    <CustomerAppProvider initialScreen="C01" initialLocale="en">
      <View testID="app-root" style={styles.root}>
        <CustomerRouter />
        {devSmoke !== null ? (
          <devSmoke.UrduSmokeEntryButton onPress={() => setShowSmoke(true)} />
        ) : null}
      </View>
    </CustomerAppProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
});
