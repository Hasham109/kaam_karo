import { describe, expect, it } from 'vitest';
import { readText } from '../lib/repo.ts';

function envExample(): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of readText('.env.example').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match?.[1]) entries.set(match[1], match[2] ?? '');
  }
  return entries;
}

const FAKE = /fake|change-me/;

describe('[SEC-BASE-008][SEC-BASE-011] .env.example and git hygiene (BP §29, §34)', () => {
  it('[SEC-BASE-008] every password/secret value in .env.example is an obvious fake', () => {
    const entries = [...envExample()];
    const secretValues = entries.filter(
      ([key, value]) => /(PASSWORD|SECRET|TOKEN|_KEY)$/.test(key) && value !== '',
    );
    const urlPasswords = entries.flatMap(([key, value]) => {
      const password = /:\/\/[^:@/]*:([^@]+)@/.exec(value)?.[1];
      return password === undefined ? [] : [[key, password] as const];
    });
    expect(secretValues.length + urlPasswords.length).toBeGreaterThan(0);
    expect(secretValues.filter(([, value]) => !FAKE.test(value))).toEqual([]);
    expect(urlPasswords.filter(([, password]) => !FAKE.test(password))).toEqual([]);
  });

  it('[SEC-BASE-008] Sentry is off by default (empty DSN) and nothing public carries a secret', () => {
    const env = envExample();
    expect(env.get('SENTRY_DSN')).toBe('');
    const publicEntries = [...env].filter(
      ([key]) => key.startsWith('EXPO_PUBLIC_') || key.startsWith('NEXT_PUBLIC_'),
    );
    expect(publicEntries.length).toBeGreaterThan(0);
    expect(publicEntries.filter(([, value]) => /@|password|secret|token/i.test(value))).toEqual([]);
  });

  it('[SEC-BASE-011] APP_ENV defaults to development in the example file', () => {
    expect(envExample().get('APP_ENV')).toBe('development');
  });

  it('[SEC-BASE-008] .gitignore keeps real env files, keys and native folders out of git', () => {
    const ignore = readText('.gitignore').split(/\r?\n/);
    expect(ignore).toEqual(
      expect.arrayContaining([
        '.env',
        '.env.*',
        '!.env.example',
        '*.keystore',
        '*.pem',
        'google-services.json',
        'apps/*/android/',
        '*.env',
        '.envrc',
        '*.secret*',
      ]),
    );
  });
});
