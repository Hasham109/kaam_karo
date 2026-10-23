/**
 * @kaamkaro/i18n — owner A14 (IMPL §2.2).
 * I18N-001…003, I18N-006, I18N-007 (BP §37, §78). The full kit (date/time formatting, the
 * string-lint rule, the reviewed product catalogs) is T1.4.
 */
export {
  SUPPORTED_LOCALES,
  type Locale,
  type TextDirection,
  isLocale,
  isolateLtr,
  otherLocale,
  textDirection,
} from './locale.js';
export { EN_MESSAGES, type MessageKey, UR_MESSAGES } from './messages.js';
export { type MessageParams, messageKeys, messageTemplate, translate } from './translate.js';
export { formatPkr } from './money.js';
