/**
 * T0.6 Urdu Nastaliq smoke test screen (condition of D-001; BP §78.2; reference phone D-027).
 * DEV-ONLY: reachable from the placeholder home only in development builds (`__DEV__`).
 * No business logic, no network call, no permission.
 *
 * Shows: Nastaliq paragraph with marks (I18N-004), full RTL layout in Urdu (I18N-003), a mixed
 * Urdu/English label, a PKR amount and digits (I18N-007), a text input, a FlatList, a bottom
 * sheet, and an en ↔ ur toggle that applies at once (I18N-002). Every string comes from
 * @kaamkaro/i18n (I18N-006). Buttons are ≥ 48 dp and labelled (A11Y-002, A11Y-004).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  I18nManager,
  type ListRenderItem,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { type Locale, otherLocale } from '@kaamkaro/i18n';
import { COLOR, MIN_TAP_TARGET_DP, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { BottomSheet } from './BottomSheet';
import { Chevron } from './Chevron';
import { SMOKE_TEST_IDS, type SmokeRow, buildUrduSmokeModel } from './model';

export interface UrduSmokeScreenProps {
  readonly initialLocale: Locale;
  readonly onBack: () => void;
}

export function UrduSmokeScreen({ initialLocale, onBack }: UrduSmokeScreenProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [typed, setTyped] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const model = useMemo(() => buildUrduSmokeModel(locale, I18nManager.isRTL), [locale]);
  const { mirror, type, text } = model;
  const align = { textAlign: mirror.textAlign, writingDirection: mirror.writingDirection };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const openSheet = useCallback((row: SmokeRow | null) => {
    setSelected(row === null ? null : row.title);
    setSheetOpen(true);
  }, []);

  const renderRow: ListRenderItem<SmokeRow> = ({ item }) => (
    <Pressable
      onPress={() => openSheet(item)}
      style={[styles.row, { flexDirection: mirror.row }]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={item.hint}
      testID={item.testID}
    >
      <View style={styles.rowText}>
        <Text style={[styles.text, type.body, align]}>{item.title}</Text>
        <Text style={[styles.muted, type.label, align]}>{item.hint}</Text>
      </View>
      <Chevron pointing="forward" scaleX={mirror.iconScaleX} />
    </Pressable>
  );

  const header = (
    <View>
      <View style={[styles.toolbar, { flexDirection: mirror.row }]}>
        <Pressable
          onPress={onBack}
          style={[styles.button, { flexDirection: mirror.row }]}
          accessibilityRole="button"
          accessibilityLabel={text.back}
          testID={SMOKE_TEST_IDS.back}
        >
          <Chevron pointing="back" scaleX={mirror.iconScaleX} />
          <Text style={[styles.text, type.label]}>{text.back}</Text>
        </Pressable>
        <Text
          style={[styles.title, type.headline, align]}
          accessibilityRole="header"
          testID={SMOKE_TEST_IDS.title}
        >
          {text.title}
        </Text>
        <Pressable
          onPress={() => setLocale(otherLocale(locale))}
          style={[styles.button, styles.primaryButton]}
          accessibilityRole="button"
          accessibilityLabel={text.toggleA11y}
          testID={SMOKE_TEST_IDS.toggle}
        >
          {/* The label is in the target language, so it uses that language's font. */}
          <Text style={[styles.onPrimary, textTokens(otherLocale(locale), 'label')]}>
            {text.toggle}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.heading, type.title, align]} accessibilityRole="header">
        {text.paragraphHeading}
      </Text>
      <Text style={[styles.text, type.body, align]} testID={SMOKE_TEST_IDS.paragraph}>
        {text.paragraph}
      </Text>

      <Text style={[styles.heading, type.title, align]} accessibilityRole="header">
        {text.mixedHeading}
      </Text>
      <Text style={[styles.text, type.body, align]} testID={SMOKE_TEST_IDS.mixed}>
        {text.mixed}
      </Text>
      <Text style={[styles.text, type.body, align]} testID={SMOKE_TEST_IDS.amount}>
        {text.amount}
      </Text>
      <Text style={[styles.text, type.body, align]} testID={SMOKE_TEST_IDS.digits}>
        {text.digits}
      </Text>

      <Text nativeID="urdu-smoke-input-label" style={[styles.heading, type.title, align]}>
        {text.inputLabel}
      </Text>
      <TextInput
        value={typed}
        onChangeText={setTyped}
        placeholder={text.inputPlaceholder}
        placeholderTextColor={COLOR.textMuted}
        accessibilityLabel={text.inputLabel}
        accessibilityLabelledBy="urdu-smoke-input-label"
        testID={SMOKE_TEST_IDS.input}
        autoCorrect={false}
        style={[
          styles.input,
          {
            fontFamily: type.body.fontFamily,
            fontSize: type.body.fontSize,
            minHeight: type.body.lineHeight + SPACING.md * 2,
            textAlign: mirror.textAlign,
            writingDirection: mirror.writingDirection,
          },
        ]}
      />

      <Pressable
        onPress={() => openSheet(null)}
        style={[styles.button, styles.primaryButton, styles.sheetButton]}
        accessibilityRole="button"
        accessibilityLabel={text.sheetOpen}
        testID={SMOKE_TEST_IDS.sheetOpen}
      >
        <Text style={[styles.onPrimary, type.body]}>{text.sheetOpen}</Text>
      </Pressable>

      <Text style={[styles.heading, type.title, align]} accessibilityRole="header">
        {text.listHeading}
      </Text>
    </View>
  );

  return (
    <View style={styles.root} testID={SMOKE_TEST_IDS.screen}>
      <FlatList
        data={model.rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        testID={SMOKE_TEST_IDS.list}
      />
      <BottomSheet
        visible={sheetOpen}
        model={model}
        selected={selected}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLOR.background,
    // Edge-to-edge: keep content below the status bar. Full safe-area insets come with T1.4.
    paddingTop: StatusBar.currentHeight ?? 0,
  },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  toolbar: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  title: { flex: 1, color: COLOR.text },
  heading: { color: COLOR.text, marginTop: SPACING.lg },
  text: { color: COLOR.text },
  muted: { color: COLOR.textMuted },
  onPrimary: { color: COLOR.onPrimary },
  button: {
    minHeight: MIN_TAP_TARGET_DP,
    minWidth: MIN_TAP_TARGET_DP,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  primaryButton: { backgroundColor: COLOR.primary },
  sheetButton: { marginTop: SPACING.lg },
  input: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    color: COLOR.text,
  },
  row: {
    minHeight: MIN_TAP_TARGET_DP,
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  rowText: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLOR.border },
});
