/**
 * Bottom sheet for the T0.6 smoke screen, built only from React Native's own `Modal` (no new
 * dependency). I18N-003 (BP §78.2: sheets are mirrored in RTL): the Modal is a separate native
 * root, so the mirroring from the screen is applied again here — title at the reading start,
 * close button at the reading end. A11Y-002 (48 dp close button), A11Y-004 (labelled buttons).
 * Android back closes the sheet (`onRequestClose`).
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOR, MIN_TAP_TARGET_DP, RADIUS, SPACING } from '@kaamkaro/ui';
import { SMOKE_TEST_IDS, type UrduSmokeModel } from './model';

export interface BottomSheetProps {
  readonly visible: boolean;
  readonly model: UrduSmokeModel;
  /** Text of the row that opened the sheet, if any (shows list → sheet hand-over). */
  readonly selected: string | null;
  readonly onClose: () => void;
}

export function BottomSheet({ visible, model, selected, onClose }: BottomSheetProps) {
  const { mirror, type, text } = model;
  const align = { textAlign: mirror.textAlign, writingDirection: mirror.writingDirection };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={text.sheetClose}
          testID={SMOKE_TEST_IDS.sheetBackdrop}
        />
        <View style={styles.sheet} testID={SMOKE_TEST_IDS.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={[styles.header, { flexDirection: mirror.row }]}>
            <Text style={[styles.title, type.title, align]} accessibilityRole="header">
              {text.sheetTitle}
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={text.sheetClose}
              testID={SMOKE_TEST_IDS.sheetClose}
            >
              <Text style={[styles.closeText, type.label]}>{text.sheetClose}</Text>
            </Pressable>
          </View>
          <Text style={[styles.body, type.body, align]}>{text.sheetBody}</Text>
          {selected === null ? null : (
            <Text style={[styles.body, type.body, align]}>{selected}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: COLOR.backdrop },
  sheet: {
    backgroundColor: COLOR.background,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    // Room for the Android navigation bar (edge-to-edge). Safe-area insets come with T1.4.
    paddingBottom: SPACING.xxl,
  },
  handle: {
    alignSelf: 'center',
    width: SPACING.xxl,
    height: SPACING.xs,
    borderRadius: SPACING.xs,
    backgroundColor: COLOR.border,
    marginBottom: SPACING.sm,
  },
  header: { alignItems: 'center', gap: SPACING.md },
  title: { flex: 1, color: COLOR.text },
  closeButton: {
    minHeight: MIN_TAP_TARGET_DP,
    minWidth: MIN_TAP_TARGET_DP,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  closeText: { color: COLOR.text },
  body: { color: COLOR.text, marginTop: SPACING.md },
});
