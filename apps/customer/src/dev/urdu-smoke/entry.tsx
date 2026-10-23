/**
 * DEV-ONLY entry of the T0.6 Urdu smoke test (condition of D-001; BP §78.2).
 * App.tsx loads this module only through `__DEV__ ? require('./dev/urdu-smoke/entry') : null`.
 * In a release build Metro replaces `__DEV__` with `false`, removes the dead branch and never
 * bundles this module, the screen or the dev-only catalog (T0.6 QA S4 fix).
 * Do NOT import this file statically from production code.
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import { translateSmoke } from '@kaamkaro/i18n/dev-smoke';
import { COLOR, MIN_TAP_TARGET_DP, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { SMOKE_TEST_IDS } from './model';

export { UrduSmokeScreen } from './UrduSmokeScreen';

/** Bilingual button on the placeholder home (A11Y-002 ≥ 48 dp, A11Y-004 labelled). */
export function UrduSmokeEntryButton({ onPress }: { readonly onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={translateSmoke('en', 'smoke.open')}
      testID={SMOKE_TEST_IDS.open}
    >
      <Text style={[styles.text, textTokens('en', 'body')]}>
        {translateSmoke('en', 'smoke.open')}
      </Text>
      <Text style={[styles.text, textTokens('ur', 'body')]}>
        {translateSmoke('ur', 'smoke.open')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: SPACING.xl,
    minHeight: MIN_TAP_TARGET_DP,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLOR.primary,
  },
  text: { color: COLOR.onPrimary },
});
