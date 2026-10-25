/**
 * Partner App Root (Task T4.1; BP §10, §13, §78.1; D-001, D-002, D-004, D-018).
 * Owner: A12 (partner-app).
 */
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { COLOR } from '@kaamkaro/ui';
import { P01WelcomeScreen } from './screens/P01WelcomeScreen';
import { P02RegistrationScreen } from './screens/P02RegistrationScreen';
import { P03VerificationScreen } from './screens/P03VerificationScreen';
import { P04HomeScreen } from './screens/P04HomeScreen';
import { P05ServiceSetupScreen } from './screens/P05ServiceSetupScreen';
import { P06AvailabilityScreen } from './screens/P06AvailabilityScreen';
import { P07ServiceAreaScreen } from './screens/P07ServiceAreaScreen';
import { P08JobRequestsScreen } from './screens/P08JobRequestsScreen';
import { P09JobDetailScreen } from './screens/P09JobDetailScreen';
import { P22LiveStatusScreen } from './screens/P22LiveStatusScreen';
import { P23DateOverridesScreen } from './screens/P23DateOverridesScreen';
import { P25MediaPlayerScreen } from './screens/P25MediaPlayerScreen';
import { PartnerProvider, usePartner } from './state/PartnerContext';
import { getAppMirroring } from './utils/rtl';

function PartnerAppContent() {
  const { currentScreen, locale } = usePartner();
  const mirroring = getAppMirroring(locale);

  return (
    <SafeAreaView style={[styles.root, { direction: mirroring.direction }]} testID="app-root">
      <View style={styles.screenWrapper}>
        {currentScreen === 'P01' && <P01WelcomeScreen />}
        {currentScreen === 'P02' && <P02RegistrationScreen />}
        {currentScreen === 'P03' && <P03VerificationScreen />}
        {currentScreen === 'P04' && <P04HomeScreen />}
        {currentScreen === 'P05' && <P05ServiceSetupScreen />}
        {currentScreen === 'P06' && <P06AvailabilityScreen />}
        {currentScreen === 'P07' && <P07ServiceAreaScreen />}
        {currentScreen === 'P08' && <P08JobRequestsScreen />}
        {currentScreen === 'P09' && <P09JobDetailScreen />}
        {currentScreen === 'P22' && <P22LiveStatusScreen />}
        {currentScreen === 'P23' && <P23DateOverridesScreen />}
        {currentScreen === 'P25' && <P25MediaPlayerScreen />}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <PartnerProvider>
      <PartnerAppContent />
    </PartnerProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  screenWrapper: {
    flex: 1,
  },
});
