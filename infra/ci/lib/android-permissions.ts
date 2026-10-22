/**
 * Forbidden Android permission guard — rules (T2.1).
 *
 * - PERM-006 (BP §75 item 98, §74): never request contacts, Bluetooth, calendar, call logs or
 *   background location. Full list = docs/security/permission-policy.md §4.1 (RQ-001).
 * - Policy §4.2: anything outside the launch allow-list that Android treats as a runtime
 *   ("dangerous") permission needs A15 review, so the guard fails on it.
 * - SEC-BASE-001 (BP §29, §34): release builds must not allow cleartext (HTTP) traffic.
 *
 * Rule owner: A17 (IMPL §7.4); list owner: A15 (permission policy). A01 runs it in CI.
 */

export const APPS = ['customer', 'partner'] as const;
export type MobileApp = (typeof APPS)[number];

/** docs/security/permission-policy.md §4.1 — never requested by either app at launch. */
export const NEVER_REQUEST: readonly string[] = [
  // Contacts — BP §28, §74, §75 item 98
  'READ_CONTACTS',
  'WRITE_CONTACTS',
  // Call logs — BP §74, §75 item 98
  'READ_CALL_LOG',
  'WRITE_CALL_LOG',
  'PROCESS_OUTGOING_CALLS',
  // Background location — BP §57.4, §75 item 98, §81
  'ACCESS_BACKGROUND_LOCATION',
  // Calendar — BP §74, §75 item 98
  'READ_CALENDAR',
  'WRITE_CALENDAR',
  // Bluetooth / nearby devices — BP §74, §75 item 98
  'BLUETOOTH',
  'BLUETOOTH_ADMIN',
  'BLUETOOTH_CONNECT',
  'BLUETOOTH_SCAN',
  'BLUETOOTH_ADVERTISE',
  'NEARBY_WIFI_DEVICES',
  // Broad storage / media — system pickers instead (BP §74, §75 item 97)
  'READ_EXTERNAL_STORAGE',
  'WRITE_EXTERNAL_STORAGE',
  'MANAGE_EXTERNAL_STORAGE',
  'READ_MEDIA_IMAGES',
  'READ_MEDIA_VIDEO',
  'READ_MEDIA_AUDIO',
  'READ_MEDIA_VISUAL_USER_SELECTED',
  // Biometrics — Later (BP §74)
  'USE_BIOMETRIC',
  'USE_FINGERPRINT',
  // Phone state / direct calling [DERIVED] — BP §28, §74
  'CALL_PHONE',
  'READ_PHONE_STATE',
  'READ_PHONE_NUMBERS',
];

/** Extra never-request entries per app (policy §4.1: provider voice replies are future, BP §74). */
export const NEVER_REQUEST_EXTRA: Readonly<Record<MobileApp, readonly string[]>> = {
  customer: [],
  partner: ['RECORD_AUDIO'],
};

/** Forbidden in the release manifest only (Expo dev builds add it for the dev menu). */
export const RELEASE_ONLY_FORBIDDEN: readonly string[] = ['SYSTEM_ALERT_WINDOW'];

/**
 * Android runtime ("dangerous") permissions. Any of these outside the app's allow-list fails
 * the guard until A15 reviews it (policy §4.2 "Anything else needs A15 review").
 */
export const RUNTIME_PERMISSIONS: readonly string[] = [
  'READ_CALENDAR',
  'WRITE_CALENDAR',
  'CAMERA',
  'READ_CONTACTS',
  'WRITE_CONTACTS',
  'GET_ACCOUNTS',
  'ACCESS_FINE_LOCATION',
  'ACCESS_COARSE_LOCATION',
  'ACCESS_BACKGROUND_LOCATION',
  'ACCESS_MEDIA_LOCATION',
  'RECORD_AUDIO',
  'READ_PHONE_STATE',
  'READ_PHONE_NUMBERS',
  'CALL_PHONE',
  'ANSWER_PHONE_CALLS',
  'READ_CALL_LOG',
  'WRITE_CALL_LOG',
  'ADD_VOICEMAIL',
  'USE_SIP',
  'PROCESS_OUTGOING_CALLS',
  'BODY_SENSORS',
  'BODY_SENSORS_BACKGROUND',
  'ACTIVITY_RECOGNITION',
  'SEND_SMS',
  'RECEIVE_SMS',
  'READ_SMS',
  'RECEIVE_WAP_PUSH',
  'RECEIVE_MMS',
  'READ_EXTERNAL_STORAGE',
  'WRITE_EXTERNAL_STORAGE',
  'READ_MEDIA_IMAGES',
  'READ_MEDIA_VIDEO',
  'READ_MEDIA_AUDIO',
  'READ_MEDIA_VISUAL_USER_SELECTED',
  'BLUETOOTH_SCAN',
  'BLUETOOTH_CONNECT',
  'BLUETOOTH_ADVERTISE',
  'NEARBY_WIFI_DEVICES',
  'UWB_RANGING',
  'POST_NOTIFICATIONS',
];

/** Policy §4.2 launch allow-list of runtime permissions (asked just-in-time, policy §2). */
export const ALLOWED_RUNTIME: Readonly<Record<MobileApp, readonly string[]>> = {
  customer: [
    'CAMERA',
    'RECORD_AUDIO',
    'ACCESS_COARSE_LOCATION',
    'ACCESS_FINE_LOCATION',
    'POST_NOTIFICATIONS',
  ],
  partner: ['CAMERA', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
};

const ANDROID_PREFIX = 'android.permission.';

/** `android.permission.CAMERA` → `CAMERA`; other namespaces are returned unchanged. */
export function shortName(permission: string): string {
  const trimmed = permission.trim();
  return trimmed.startsWith(ANDROID_PREFIX) ? trimmed.slice(ANDROID_PREFIX.length) : trimmed;
}

export function neverRequestFor(app: MobileApp): string[] {
  return [...NEVER_REQUEST, ...NEVER_REQUEST_EXTRA[app]];
}

/** Problems for one requested permission (empty = fine). */
function checkRequested(app: MobileApp, permission: string, release: boolean): string[] {
  const name = shortName(permission);
  if (neverRequestFor(app).includes(name)) {
    return [`${name} is on the never-request list (PERM-006, permission-policy §4.1)`];
  }
  if (release && RELEASE_ONLY_FORBIDDEN.includes(name)) {
    return [`${name} must not be in the release build (permission-policy §4.1)`];
  }
  if (RUNTIME_PERMISSIONS.includes(name) && !ALLOWED_RUNTIME[app].includes(name)) {
    return [
      `${name} is a runtime permission outside the ${app} allow-list; needs A15 review (permission-policy §4.2)`,
    ];
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : null;
}

/**
 * Checks an Expo `app.json` (static config) of one app:
 * requested permissions, the `android.blockedPermissions` list (blocks permissions that
 * libraries would inject into the merged manifest) and the cleartext-traffic setting.
 */
export function checkExpoConfig(app: MobileApp, appJson: unknown): string[] {
  const problems: string[] = [];
  const expo = isRecord(appJson) && isRecord(appJson['expo']) ? appJson['expo'] : null;
  if (!expo) return ['app.json has no "expo" object'];
  const android = isRecord(expo['android']) ? expo['android'] : null;
  if (!android) return ['app.json has no "expo.android" object'];

  const requested = stringArray(android['permissions']);
  if (requested === null) {
    problems.push(
      'expo.android.permissions must be an explicit array (an absent list lets Expo add extra permissions)',
    );
  } else {
    for (const permission of requested) problems.push(...checkRequested(app, permission, true));
  }

  const blocked = new Set((stringArray(android['blockedPermissions']) ?? []).map(shortName));
  // SYSTEM_ALERT_WINDOW is removed from the main (release) manifest; the Expo debug manifest
  // re-adds it for the dev menu only (debug manifests have higher merge priority).
  const missing = [...neverRequestFor(app), ...RELEASE_ONLY_FORBIDDEN].filter(
    (name) => !blocked.has(name),
  );
  if (missing.length > 0) {
    problems.push(
      `expo.android.blockedPermissions is missing: ${missing.join(', ')} (RQ-001: block library-injected permissions)`,
    );
  }

  const plugins = Array.isArray(expo['plugins']) ? (expo['plugins'] as unknown[]) : [];
  const buildProps = plugins.find(
    (p): p is [string, Record<string, unknown>] =>
      Array.isArray(p) && p[0] === 'expo-build-properties' && isRecord(p[1]),
  );
  const androidProps =
    buildProps && isRecord(buildProps[1]['android']) ? buildProps[1]['android'] : null;
  if (!androidProps || androidProps['usesCleartextTraffic'] !== false) {
    problems.push(
      'expo-build-properties android.usesCleartextTraffic must be false (SEC-BASE-001; debug builds re-enable it for Metro only)',
    );
  }
  // SEC-BASE-002 (BP §29; SEC-REVIEW T2.1 finding 4): app storage must not be copied by
  // adb/cloud backup to another device.
  if (android['allowBackup'] !== false) {
    problems.push('expo.android.allowBackup must be false (SEC-BASE-002)');
  }
  return problems;
}

export interface ManifestPermission {
  /** Short permission name, or `null` when the entry has no parseable `android:name`. */
  readonly name: string | null;
  /** `tools:node="remove"` — the entry removes the permission from the merged manifest. */
  readonly removed: boolean;
}

function stripXmlComments(xml: string): string {
  return xml.replace(/<!--[\s\S]*?-->/g, '');
}

/** Reads an XML attribute value written with double or single quotes (SEC-REVIEW T2.1 #8). */
export function xmlAttribute(attrs: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs);
  if (!match) return null;
  return match[1] ?? match[2] ?? null;
}

/** Extracts `<uses-permission>` / `<uses-permission-sdk-23>` entries from manifest XML. */
export function parseManifestPermissions(xml: string): ManifestPermission[] {
  const result: ManifestPermission[] = [];
  for (const match of stripXmlComments(xml).matchAll(/<uses-permission(?:-sdk-23)?\b([^>]*)>/g)) {
    const attrs = match[1] ?? '';
    const name = xmlAttribute(attrs, 'android:name')?.trim() || null;
    const removed = xmlAttribute(attrs, 'tools:node') === 'remove';
    result.push({ name: name === null ? null : shortName(name), removed });
  }
  return result;
}

/** Value of an attribute on `<application>`, or null when absent. */
export function applicationAttribute(xml: string, name: string): string | null {
  const application = /<application\b([^>]*)>/.exec(stripXmlComments(xml));
  if (!application) return null;
  return xmlAttribute(application[1] ?? '', name);
}

/** Value of `android:usesCleartextTraffic` on `<application>`, or null when absent. */
export function cleartextSetting(xml: string): string | null {
  return applicationAttribute(xml, 'android:usesCleartextTraffic');
}

/**
 * Checks one AndroidManifest.xml. `release: true` is for the **merged release** manifest
 * (RQ-001) and the prebuild main manifest that feeds it: every library permission is visible
 * there, cleartext must be explicitly off (SEC-BASE-001) and backup explicitly off
 * (SEC-BASE-002). Entries whose name cannot be parsed fail closed (SEC-REVIEW T2.1 #8).
 */
export function checkManifest(app: MobileApp, xml: string, release: boolean): string[] {
  const problems: string[] = [];
  for (const permission of parseManifestPermissions(xml)) {
    if (permission.name === null) {
      problems.push(
        '<uses-permission> without a parseable android:name (failing closed, PERM-006)',
      );
      continue;
    }
    if (permission.removed) continue;
    problems.push(...checkRequested(app, permission.name, release));
  }
  if (release && cleartextSetting(xml) !== 'false') {
    problems.push('release manifest must set android:usesCleartextTraffic="false" (SEC-BASE-001)');
  }
  if (release && applicationAttribute(xml, 'android:allowBackup') !== 'false') {
    problems.push('release manifest must set android:allowBackup="false" (SEC-BASE-002)');
  }
  return problems;
}
