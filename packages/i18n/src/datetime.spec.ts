import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTime,
  PAKISTAN_UTC_OFFSET_MINUTES,
} from './index.js';

const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);
const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[I18N-007] datetime formatting', () => {
  // 2026-10-24 14:30:00 PKT (UTC 09:30:00)
  const pktDate = new Date('2026-10-24T09:30:00.000Z');

  it('[I18N-007] constant matches Pakistan Standard Time (UTC+05:00)', () => {
    expect(PAKISTAN_UTC_OFFSET_MINUTES).toBe(300);
  });

  it('[I18N-007] formatDate in English formats short, medium and long', () => {
    expect(formatDate('en', pktDate, 'short')).toBe('24/10/2026');
    expect(formatDate('en', pktDate, 'medium')).toBe('24 Oct 2026');
    expect(formatDate('en', pktDate, 'long')).toBe('Saturday, 24 October 2026');
  });

  it('[I18N-007][I18N-003] formatDate in Urdu uses Urdu months and bidi isolation', () => {
    const medium = formatDate('ur', pktDate, 'medium');
    expect(medium).toContain('اکتوبر');
    expect(medium).toMatch(ARABIC_SCRIPT);

    const long = formatDate('ur', pktDate, 'long');
    expect(long.startsWith('ہفتہ،')).toBe(true);
    expect(long).toContain('اکتوبر');
  });

  it('[I18N-007] formatTime formats 12-hour clock in Pakistan time', () => {
    // 09:30 UTC is 14:30 (2:30 PM) PKT
    expect(formatTime('en', pktDate)).toBe('2:30 PM');
    const urTime = formatTime('ur', pktDate);
    expect(urTime).toContain('دوپہر');
    expect(urTime).toContain(`${LRI}2:30${PDI}`);
  });

  it('[I18N-007] formatDateTime combines date and time', () => {
    const enDateTime = formatDateTime('en', pktDate);
    expect(enDateTime).toBe('24 Oct 2026, 2:30 PM');

    const urDateTime = formatDateTime('ur', pktDate);
    expect(urDateTime).toContain('24 اکتوبر 2026');
    expect(urDateTime).toContain('2:30');
  });

  it('[I18N-007] formatRelativeTime handles past and future periods', () => {
    const now = new Date('2026-10-24T12:00:00.000Z');

    // Just now (< 60s)
    const justNow = new Date('2026-10-24T11:59:45.000Z');
    expect(formatRelativeTime('en', justNow, now)).toBe('just now');
    expect(formatRelativeTime('ur', justNow, now)).toBe('ابھی ابھی');

    // Minutes ago
    const fiveMinsAgo = new Date('2026-10-24T11:55:00.000Z');
    expect(formatRelativeTime('en', fiveMinsAgo, now)).toBe('5 minutes ago');
    expect(formatRelativeTime('ur', fiveMinsAgo, now)).toBe(`${LRI}5${PDI} منٹ پہلے`);

    // In minutes
    const inFiveMins = new Date('2026-10-24T12:05:00.000Z');
    expect(formatRelativeTime('en', inFiveMins, now)).toBe('in 5 minutes');
    expect(formatRelativeTime('ur', inFiveMins, now)).toBe(`${LRI}5${PDI} منٹ میں`);

    // Hours ago
    const twoHoursAgo = new Date('2026-10-24T10:00:00.000Z');
    expect(formatRelativeTime('en', twoHoursAgo, now)).toBe('2 hours ago');
    expect(formatRelativeTime('ur', twoHoursAgo, now)).toBe(`${LRI}2${PDI} گھنٹے پہلے`);
  });

  it('[I18N-007] throws on invalid date value', () => {
    expect(() => formatDate('en', 'not-a-date')).toThrow();
  });
});
