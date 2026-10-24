/**
 * Catalog access and the raw template filler (I18N-001, I18N-006; BP §37, §78.1).
 * Placeholders are written `{name}`. A missing parameter throws, so a broken string is caught by
 * tests instead of being shown to a user.
 */
import { type Locale } from './locale.js';
import { EN_MESSAGES, type MessageKey, UR_MESSAGES } from './messages.js';

const CATALOGS: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = {
  en: EN_MESSAGES,
  ur: UR_MESSAGES,
};

/** Raw parameter values accepted by `fillTemplate` (already formatted text). */
export type MessageParams = Readonly<Record<string, string | number>>;

const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

/** Fills `{name}` placeholders with the given text as-is; shared by every catalog. */
export function fillTemplate(
  template: string,
  params: MessageParams | undefined,
  context: string,
): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`i18n: missing parameter "${name}" for ${context}`);
    }
    return String(value);
  });
}

/** Placeholder names of a template, sorted (for parity tests). */
export function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1] ?? '').sort();
}

/** All keys, for catalog completeness tests (I18N-001). */
export function messageKeys(): MessageKey[] {
  return Object.keys(EN_MESSAGES) as MessageKey[];
}

/** Raw template, for formatters and tests. */
export function messageTemplate(locale: Locale, key: MessageKey): string {
  return CATALOGS[locale][key];
}

/** True for a string that is a key of the product catalog. */
export function isMessageKey(value: string): value is MessageKey {
  return Object.prototype.hasOwnProperty.call(EN_MESSAGES, value);
}
