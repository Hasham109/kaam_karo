import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES, textDirection, translate } from './index';

describe('[I18N-001] i18n skeleton', () => {
  it('[I18N-001] supports English and Urdu', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'ur']);
  });

  it('[I18N-003] Urdu is right-to-left, English left-to-right', () => {
    expect(textDirection('ur')).toBe('rtl');
    expect(textDirection('en')).toBe('ltr');
  });

  it('[I18N-001] every key has a non-empty value in both languages', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(translate(locale, 'app.customer.name')).not.toBe('');
      expect(translate(locale, 'app.partner.name')).not.toBe('');
    }
    expect(translate('ur', 'app.customer.name')).toMatch(/\p{Script=Arabic}/u);
  });
});
