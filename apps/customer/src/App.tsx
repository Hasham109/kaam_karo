/**
 * App root — SKELETON (T2.1, created by A01 under the A00 bootstrap grant). Owner: A11.
 * No feature, no network call and no permission request yet (PERM-001..006: permissions are
 * asked only when the user taps the related feature, docs/security/permission-policy.md §2).
 * TODO(A11): navigation, screens, Urdu font + RTL layout (with A14, T1.4).
 *
 * T0.6 (A14, A00-authorised): in development builds only, the placeholder home has a button
 * that opens the Urdu Nastaliq smoke-test screen (condition of D-001; BP §78.2). The dev module
 * is loaded with a `__DEV__`-guarded `require`, so release bundles do not contain it.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLOR, SPACING, textTokens } from '@kaamkaro/ui';
import { placeholderLines } from './placeholder';

// Type-only import: erased at compile time, so it never pulls the dev module into a bundle.
import type * as DevSmokeEntry from './dev/urdu-smoke/entry';

type DevSmokeModule = typeof DevSmokeEntry;

// Metro inlines __DEV__ = false in release builds and drops this require (T0.6 QA S4).
const devSmoke: DevSmokeModule | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only lazy load, see above
    (require('./dev/urdu-smoke/entry') as DevSmokeModule)
  : null;

export default function App() {
  const [showSmoke, setShowSmoke] = useState(false);
  const closeSmoke = useCallback(() => setShowSmoke(false), []);

  if (devSmoke !== null && showSmoke) {
    return <devSmoke.UrduSmokeScreen initialLocale="ur" onBack={closeSmoke} />;
  }

  return (
    <View style={styles.root} testID="app-root">
      {placeholderLines().map((line) => (
        <Text
          key={line.locale}
          testID={line.testID}
          style={[
            styles.title,
            textTokens(line.locale, 'title'),
            { writingDirection: line.direction },
          ]}
        >
          {line.text}
        </Text>
      ))}
      {devSmoke !== null ? (
        <devSmoke.UrduSmokeEntryButton onPress={() => setShowSmoke(true)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: COLOR.background,
    padding: SPACING.lg,
  },
  title: { textAlign: 'auto', color: COLOR.text },
});
