/**
 * Directional arrow for the T0.6 smoke screen (I18N-003, BP §78.2: arrows are mirrored in RTL).
 * Drawn with two borders (no icon font, no image), pointing "forward" (right) or "back" (left)
 * in LTR; `scaleX` mirrors it in RTL. Decorative: the button that holds it has the label
 * (A11Y-004, BP §38).
 */
import { StyleSheet, View } from 'react-native';
import { COLOR } from '@kaamkaro/ui';

export interface ChevronProps {
  readonly pointing: 'forward' | 'back';
  readonly scaleX: 1 | -1;
  readonly color?: string;
}

export function Chevron({ pointing, scaleX, color = COLOR.text }: ChevronProps) {
  return (
    <View
      style={[styles.box, { transform: [{ scaleX }] }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.stroke,
          { borderColor: color },
          pointing === 'forward' ? styles.forward : styles.back,
        ]}
      />
    </View>
  );
}

const SIZE = 10;
const STROKE = 2;

const styles = StyleSheet.create({
  box: { width: SIZE * 2, height: SIZE * 2, alignItems: 'center', justifyContent: 'center' },
  stroke: { width: SIZE, height: SIZE },
  forward: {
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    transform: [{ rotate: '45deg' }],
  },
  back: {
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    transform: [{ rotate: '45deg' }],
  },
});
