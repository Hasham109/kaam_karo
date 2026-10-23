# Bundled fonts (owner A14)

| File                           | What                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `NotoNastaliqUrdu-Regular.ttf` | Noto Nastaliq Urdu, Version 4.000 (the candidate Urdu font, BP §78.2; I18N-004)  |
| `OFL.txt`                      | SIL Open Font License 1.1, copied unchanged from the same release. Keep it here. |

- Source: <https://github.com/notofonts/nastaliq/releases/tag/NotoNastaliqUrdu-v4.000>,
  archive `NotoNastaliqUrdu-v4.000.zip` (SHA-256
  `0725a7a9dfd450961b18227445cc9a5d21624d68b1f88fa52e4c6a0fe7576728`), file
  `NotoNastaliqUrdu/full/ttf/NotoNastaliqUrdu-Regular.ttf`.
- SHA-256 of the bundled TTF: `06f5fe0febcbab39be2e338758eb8f8dc8a887f833851c9ee4051b4324e44801`.
- The font is **embedded in the app at build time** by the `expo-font` config plugin
  (`apps/customer/app.json`). The app never downloads a font at runtime.
- The Android font family name is the file name without `.ttf`: `NotoNastaliqUrdu-Regular`
  (`URDU_FONT_FAMILY` in `src/typography.ts`). Renaming the file breaks the font.
- The line-height token in `src/typography.ts` is computed from this file's `hhea` metrics
  (ascender 1904, descender −596, 1000 units per em). A unit test re-reads the file and fails if
  the font is replaced by one with different metrics.
- OFL rules that matter: the font may be bundled and redistributed with the app; the licence
  must travel with it; the font must not be sold on its own; a modified font must not use the
  reserved name.
