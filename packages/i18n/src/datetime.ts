/**
 * Date and time formatting — I18N-007 (BP §37: "dates/times in local conventions";
 * customer.md §2.7, partner.md G5: Pakistan time).
 *
 * Every date is shown in Pakistan Standard Time (UTC+05:00; Pakistan has not used daylight
 * saving time since 2009), whatever the phone's own time zone, so customer, provider and the
 * server talk about the same clock time. Written by hand (no `Intl.DateTimeFormat`) so Node
 * tests and Hermes give identical output. Month, weekday and day-period words come from the
 * catalog (`common.date.*`, `common.time.*`).
 *
 * Formats (A14 draft; native review pending):
 *   short   en "24/10/2026"           ur "24/10/2026" (isolated LTR, never reversed)
 *   medium  en "24 Oct 2026"          ur "24 اکتوبر 2026"
 *   long    en "Saturday, 24 October 2026"   ur "ہفتہ، 24 اکتوبر 2026"
 *   time    en "4:30 PM"              ur "شام 4:30" (12-hour clock with an Urdu day-period word)
 *   relative: "just now", "5 minutes ago", "yesterday", "in 2 days", then the medium date.
 */
import { NUMBER_DISPLAY, type NumberDisplayConfig } from './config.js';
import { isolateLtr } from './bidi.js';
import { fillTemplate, messageTemplate } from './catalog.js';
import { type Locale } from './locale.js';
import { type MessageKey } from './messages.js';
import { localizeDigits } from './numbers.js';
import { translatePlural } from './translate.js';

/** Pakistan Standard Time offset (UTC+05:00, no DST). */
export const PAKISTAN_UTC_OFFSET_MINUTES = 300;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Relative-time steps (presentation only, like CLDR's): under a minute → "just now"; under an
 * hour → minutes; under a day → hours; 1 calendar day → yesterday/tomorrow; under a week → days;
 * otherwise the medium date.
 */
export const RELATIVE_TIME_DAYS_LIMIT = 7;

/**
 * Day-period words for the 12-hour clock, by PKT hour (A14 draft, common Pakistani usage):
 * 0–3 رات, 4–11 صبح, 12–15 دوپہر, 16–19 شام, 20–23 رات. English maps them to AM/PM.
 */
const DAY_PERIODS: ReadonlyArray<readonly [fromHour: number, key: MessageKey]> = [
  [20, 'common.time.period.night'],
  [16, 'common.time.period.evening'],
  [12, 'common.time.period.afternoon'],
  [4, 'common.time.period.morning'],
  [0, 'common.time.period.lateNight'],
];

export type DateInput = Date | string | number;
export type DateStyle = 'short' | 'medium' | 'long';

interface PktParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
  /** Days since 1970-01-01 in Pakistan time (for calendar-day differences). */
  readonly dayNumber: number;
}

/** Parses a Date, epoch milliseconds or an ISO 8601 string; refuses invalid input. */
export function toDate(input: DateInput): Date {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`i18n date: invalid date ${String(input)}`);
  }
  return date;
}

function pktParts(input: DateInput): PktParts {
  const shifted = toDate(input).getTime() + PAKISTAN_UTC_OFFSET_MINUTES * MINUTE_MS;
  const d = new Date(shifted);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    dayNumber: Math.floor(shifted / DAY_MS),
  };
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

function monthKey(month: number, short: boolean): MessageKey {
  return `common.date.${short ? 'monthShort' : 'month'}.${month}` as MessageKey;
}

export function formatDate(
  locale: Locale,
  input: DateInput,
  style: DateStyle = 'medium',
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  const p = pktParts(input);
  const digits = (text: string): string => localizeDigits(locale, text, config);
  if (style === 'short') {
    return isolateLtr(locale, digits(`${pad2(p.day)}/${pad2(p.month)}/${p.year}`));
  }
  const params = {
    day: digits(String(p.day)),
    month: messageTemplate(locale, monthKey(p.month, style === 'medium')),
    year: digits(String(p.year)),
    weekday: messageTemplate(locale, `common.date.weekday.${p.weekday}` as MessageKey),
  };
  const key = style === 'long' ? 'common.date.long' : 'common.date.medium';
  return fillTemplate(messageTemplate(locale, key), params, key);
}

export function formatTime(
  locale: Locale,
  input: DateInput,
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  const p = pktParts(input);
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const time = isolateLtr(locale, localizeDigits(locale, `${hour12}:${pad2(p.minute)}`, config));
  const periodKey = DAY_PERIODS.find(([from]) => p.hour >= from)?.[1] ?? 'common.time.period.night';
  return fillTemplate(
    messageTemplate(locale, 'common.time.clock'),
    { time, period: messageTemplate(locale, periodKey) },
    'common.time.clock',
  );
}

export function formatDateTime(
  locale: Locale,
  input: DateInput,
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  return fillTemplate(
    messageTemplate(locale, 'common.datetime'),
    { date: formatDate(locale, input, 'medium', config), time: formatTime(locale, input, config) },
    'common.datetime',
  );
}

/**
 * "5 minutes ago", "yesterday", "in 2 days" …; older/later than a week → the medium date.
 * `now` is a parameter so screens and tests control the clock.
 */
export function formatRelativeTime(
  locale: Locale,
  input: DateInput,
  now: DateInput = new Date(),
): string {
  const at = toDate(input).getTime();
  const current = toDate(now).getTime();
  const diff = at - current;
  const abs = Math.abs(diff);
  const past = diff <= 0;
  if (abs < MINUTE_MS) {
    return messageTemplate(locale, past ? 'common.time.justNow' : 'common.time.inAMoment');
  }
  if (abs < HOUR_MS) {
    const minutes = Math.floor(abs / MINUTE_MS);
    return past
      ? translatePlural(locale, 'common.time.minutesAgo', minutes)
      : translatePlural(locale, 'common.time.inMinutes', minutes);
  }
  if (abs < DAY_MS) {
    const hours = Math.floor(abs / HOUR_MS);
    return past
      ? translatePlural(locale, 'common.time.hoursAgo', hours)
      : translatePlural(locale, 'common.time.inHours', hours);
  }
  const days = Math.abs(pktParts(at).dayNumber - pktParts(current).dayNumber);
  if (days <= 1) {
    return messageTemplate(locale, past ? 'common.time.yesterday' : 'common.time.tomorrow');
  }
  if (days < RELATIVE_TIME_DAYS_LIMIT) {
    return past
      ? translatePlural(locale, 'common.time.daysAgo', days)
      : translatePlural(locale, 'common.time.inDays', days);
  }
  return formatDate(locale, at, 'medium');
}
