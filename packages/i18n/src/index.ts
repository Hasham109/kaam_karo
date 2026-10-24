/**
 * @kaamkaro/i18n — owner A14 (IMPL §2.2).
 * I18N-001…008, A11Y-001..005 (BP §37, §38, §78).
 */
export {
  SUPPORTED_LOCALES,
  type Locale,
  type TextDirection,
  isLocale,
  isolateLtr,
  isolatePhone,
  isolateAuto,
  isIsolated,
  hasRtlText,
  otherLocale,
  textDirection,
  localeFromDevice,
} from './locale.js';
export {
  EN_MESSAGES,
  type MessageKey,
  UR_MESSAGES,
  NAMESPACES,
  type Namespace,
} from './messages.js';
export {
  type MessageParams,
  messageKeys,
  messageTemplate,
  translate,
  translatePlural,
  fillTemplate,
} from './translate.js';
export { formatPkr, formatPkrMinor, parseMinorUnits } from './money.js';
export {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  PAKISTAN_UTC_OFFSET_MINUTES,
  RELATIVE_TIME_DAYS_LIMIT,
  type DateInput,
  type DateStyle,
} from './datetime.js';
export {
  NUMBER_DISPLAY,
  type NumberDisplayConfig,
  type UrduDigitStyle,
  type DigitGrouping,
  type UrduCurrencyStyle,
  type CurrencySymbol,
} from './config.js';
export { formatInteger, formatNumber, groupDigits, localizeDigits } from './numbers.js';
export {
  BOOKING_STATUSES,
  type BookingStatus,
  NO_SHOW_PARTIES,
  type NoShowParty,
  type StatusAudience,
  type StatusLabel,
  bookingStatusLabel,
  isBookingStatus,
} from './status.js';
