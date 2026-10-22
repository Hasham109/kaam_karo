/**
 * App root — SKELETON (T2.1, created by A01 under the A00 bootstrap grant). Owner: A11.
 * No feature, no network call and no permission request yet (PERM-001..006: permissions are
 * asked only when the user taps the related feature, docs/security/permission-policy.md §2).
 * TODO(A11): navigation, screens, Urdu font + RTL layout (with A14, T1.4).
 */
import { StyleSheet, Text, View } from 'react-native';
import { placeholderLines } from './placeholder';

export default function App() {
  return (
    <View style={styles.root} testID="app-root">
      {placeholderLines().map((line) => (
        <Text
          key={line.locale}
          testID={line.testID}
          style={[styles.title, { writingDirection: line.direction }]}
        >
          {line.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
  title: { textAlign: 'auto' },
});
