import { describe, expect, it } from 'vitest';
import {
  APPS,
  checkExpoConfig,
  checkManifest,
  cleartextSetting,
  neverRequestFor,
  parseManifestPermissions,
} from '../lib/android-permissions.ts';
import { readText } from '../lib/repo.ts';

function appJson(overrides: {
  permissions?: unknown;
  blocked?: string[];
  cleartext?: boolean | null;
  allowBackup?: unknown;
}): unknown {
  const plugins =
    overrides.cleartext === null
      ? []
      : [
          [
            'expo-build-properties',
            { android: { usesCleartextTraffic: overrides.cleartext ?? false } },
          ],
        ];
  return {
    expo: {
      android: {
        ...('allowBackup' in overrides
          ? { allowBackup: overrides.allowBackup }
          : { allowBackup: false }),
        ...(overrides.permissions === undefined ? {} : { permissions: overrides.permissions }),
        blockedPermissions:
          overrides.blocked ??
          [...neverRequestFor('customer'), 'SYSTEM_ALERT_WINDOW'].map(
            (p) => `android.permission.${p}`,
          ),
      },
      plugins,
    },
  };
}

const manifest = (
  body: string,
  application = '<application android:usesCleartextTraffic="false" android:allowBackup="false"/>',
) =>
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">${body}${application}</manifest>`;

describe('[PERM-006] forbidden-permission guard: Expo config (RQ-001, permission-policy §4)', () => {
  it('[PERM-006] a compliant config passes', () => {
    expect(checkExpoConfig('customer', appJson({ permissions: [] }))).toEqual([]);
  });

  it.each([
    'READ_CONTACTS',
    'android.permission.READ_CALL_LOG',
    'ACCESS_BACKGROUND_LOCATION',
    'READ_CALENDAR',
    'BLUETOOTH_SCAN',
  ])('[PERM-006] requesting %s fails (BP §75 item 98)', (permission) => {
    const problems = checkExpoConfig('customer', appJson({ permissions: [permission] }));
    expect(problems.join('\n')).toMatch(/never-request list/);
  });

  it('[PERM-006] the extended policy list (storage, biometrics, phone state) also fails', () => {
    for (const permission of [
      'READ_MEDIA_IMAGES',
      'USE_BIOMETRIC',
      'READ_PHONE_STATE',
      'NEARBY_WIFI_DEVICES',
    ]) {
      expect(checkExpoConfig('customer', appJson({ permissions: [permission] }))).not.toEqual([]);
    }
  });

  it('[PERM-006][PERM-003] RECORD_AUDIO is allowed for the customer app but forbidden in the partner app', () => {
    expect(checkExpoConfig('customer', appJson({ permissions: ['RECORD_AUDIO'] }))).toEqual([]);
    const partner = appJson({
      permissions: ['RECORD_AUDIO'],
      blocked: [...neverRequestFor('partner'), 'SYSTEM_ALERT_WINDOW'],
    });
    expect(checkExpoConfig('partner', partner).join('\n')).toMatch(
      /RECORD_AUDIO is on the never-request list/,
    );
  });

  it('[PERM-006] a runtime permission outside the allow-list needs A15 review', () => {
    expect(checkExpoConfig('customer', appJson({ permissions: ['READ_SMS'] })).join('\n')).toMatch(
      /needs A15 review/,
    );
  });

  it('[PERM-006] a missing permissions array fails (Expo would add default extras)', () => {
    expect(checkExpoConfig('customer', appJson({})).join('\n')).toMatch(/explicit array/);
  });

  it('[PERM-006] every never-request permission must be blocked against library injection', () => {
    const problems = checkExpoConfig(
      'customer',
      appJson({ permissions: [], blocked: ['READ_CONTACTS'] }),
    );
    expect(problems.join('\n')).toMatch(
      /blockedPermissions is missing: .*ACCESS_BACKGROUND_LOCATION/,
    );
  });

  it('[PERM-006] SYSTEM_ALERT_WINDOW must be blocked from the main (release) manifest', () => {
    const blocked = neverRequestFor('customer');
    const problems = checkExpoConfig('customer', appJson({ permissions: [], blocked }));
    expect(problems.join('\n')).toMatch(/blockedPermissions is missing: SYSTEM_ALERT_WINDOW/);
  });

  it('[SEC-BASE-001] cleartext traffic must be switched off through expo-build-properties', () => {
    expect(
      checkExpoConfig('customer', appJson({ permissions: [], cleartext: true })).join('\n'),
    ).toMatch(/usesCleartextTraffic must be false/);
    expect(checkExpoConfig('customer', appJson({ permissions: [], cleartext: null }))).not.toEqual(
      [],
    );
  });

  it('[SEC-BASE-002] app backup must be switched off (allowBackup: false)', () => {
    for (const allowBackup of [true, undefined, 'false']) {
      expect(checkExpoConfig('customer', appJson({ permissions: [], allowBackup }))).toEqual([
        'expo.android.allowBackup must be false (SEC-BASE-002)',
      ]);
    }
  });

  it.each(APPS)(
    '[PERM-006][SEC-BASE-001][SEC-BASE-002] the real apps/%s/app.json passes',
    (app) => {
      expect(checkExpoConfig(app, JSON.parse(readText(`apps/${app}/app.json`)) as unknown)).toEqual(
        [],
      );
    },
  );
});

describe('[PERM-006] forbidden-permission guard: AndroidManifest.xml', () => {
  it('[PERM-006] parses uses-permission entries and tools:node="remove" markers', () => {
    const xml = manifest(
      '<uses-permission android:name="android.permission.INTERNET"/>' +
        '<!-- <uses-permission android:name="android.permission.READ_CONTACTS"/> -->' +
        '<uses-permission-sdk-23 android:name="android.permission.CAMERA" />' +
        '<uses-permission android:name="android.permission.READ_CALL_LOG" tools:node="remove"/>',
    );
    expect(parseManifestPermissions(xml)).toEqual([
      { name: 'INTERNET', removed: false },
      { name: 'CAMERA', removed: false },
      { name: 'READ_CALL_LOG', removed: true },
    ]);
  });

  it('[PERM-006] a library-injected forbidden permission in the merged manifest fails', () => {
    const xml = manifest('<uses-permission android:name="android.permission.READ_CONTACTS"/>');
    expect(checkManifest('customer', xml, true).join('\n')).toMatch(
      /READ_CONTACTS is on the never-request list/,
    );
  });

  it('[PERM-006] removed (blocked) permissions do not fail', () => {
    const xml = manifest(
      '<uses-permission android:name="android.permission.READ_CONTACTS" tools:node="remove"/>',
    );
    expect(checkManifest('customer', xml, true)).toEqual([]);
  });

  it('[PERM-006] SYSTEM_ALERT_WINDOW is tolerated in dev manifests but fails in release', () => {
    const xml = manifest(
      '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>',
    );
    expect(checkManifest('customer', xml, false)).toEqual([]);
    expect(checkManifest('customer', xml, true).join('\n')).toMatch(/release build/);
  });

  it('[SEC-BASE-001] release manifest must explicitly disable cleartext traffic', () => {
    expect(cleartextSetting(manifest(''))).toBe('false');
    expect(
      checkManifest(
        'customer',
        manifest(
          '',
          '<application android:usesCleartextTraffic="true" android:allowBackup="false">',
        ),
        true,
      ),
    ).toEqual(['release manifest must set android:usesCleartextTraffic="false" (SEC-BASE-001)']);
    expect(
      checkManifest('customer', manifest('', '<application android:allowBackup="false">'), true),
    ).toHaveLength(1);
    expect(checkManifest('customer', manifest('', '<application>'), false)).toEqual([]);
  });

  it('[SEC-BASE-002] release manifest must explicitly disable backup', () => {
    const on = manifest(
      '',
      '<application android:usesCleartextTraffic="false" android:allowBackup="true">',
    );
    const absent = manifest('', '<application android:usesCleartextTraffic="false">');
    for (const xml of [on, absent]) {
      expect(checkManifest('customer', xml, true)).toEqual([
        'release manifest must set android:allowBackup="false" (SEC-BASE-002)',
      ]);
    }
    expect(checkManifest('customer', manifest(''), true)).toEqual([]);
  });

  it('[PERM-006] single-quoted attributes are parsed (SEC-REVIEW T2.1 #8)', () => {
    const xml = manifest(
      "<uses-permission android:name='android.permission.READ_CONTACTS'/>" +
        "<uses-permission android:name='android.permission.CALL_PHONE' tools:node='remove'/>",
      "<application android:usesCleartextTraffic='false' android:allowBackup='false'/>",
    );
    expect(parseManifestPermissions(xml)).toEqual([
      { name: 'READ_CONTACTS', removed: false },
      { name: 'CALL_PHONE', removed: true },
    ]);
    expect(checkManifest('customer', xml, true).join('\n')).toMatch(
      /READ_CONTACTS is on the never-request list/,
    );
  });

  it('[PERM-006] an entry without a parseable name fails closed', () => {
    for (const entry of [
      '<uses-permission/>',
      '<uses-permission android:name=""/>',
      '<uses-permission android:name=android.permission.READ_CONTACTS />',
    ]) {
      expect(checkManifest('customer', manifest(entry), false).join('\n')).toMatch(
        /failing closed/,
      );
    }
  });
});
