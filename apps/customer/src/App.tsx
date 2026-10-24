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
