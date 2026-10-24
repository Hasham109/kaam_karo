/**
 * Mandatory PII masker (T2.2; SEC-REVIEW-T2.3 #10; SEC-REVIEW-T2.2 #1, #3, #4, #14; QA-T22-01, -03).
 *
 * Append-only rows (audit_log, marketplace_event, job_event, ledger/payment reasons) can never be
 * edited or anonymised later, so personal data must be removed BEFORE they are written
 * (BP §26 "subject to applicable law and retention requirements", §29; DATA-003, DATA-004,
 * SEC-AUTH-008; permission-policy §7; OQ-080). The same masker redacts structured logs and Sentry.
 *
 * Key rules (keys are NFKC-normalised, split into words on camelCase / `_` / `-` / `.`):
 * 1. IP keys (`ip`, `ipAddress`, `x-forwarded-for`, …) → truncated: IPv4 /24, IPv6 /48.
 * 2. Credential keys (token, otp, password, secret, cookie, authorization, auth, session, sid,
 *    jwt, bearer, credential, verificationCode, pin, apiKey, …) → `[REDACTED]`, even with an ID
 *    suffix (`sessionId`, `tokenRef` are credentials).
 * 3. Personal-data keys (phone, email, address, names of people, coordinates, date of birth,
 *    wallet/bank/account numbers, CNIC, …) → `[REDACTED]`, unless the key is an identifier
 *    (`…Id`, `…Ids`, `…Ref`, `…Refs`: an ID is not personal data and keeps records traceable,
 *    DATA-003), or a flag/enum (`phoneVerified: true`, `addressType: 'HOME'`) whose value is a
 *    boolean, number or short UPPER/lower enum code.
 * 4. Every remaining string (incl. free-text reasons) → secrets (query tokens, Bearer/Basic, JWT,
 *    signed-URL signatures), IBANs, emails, CNICs, IPs and phone numbers in any Unicode digits
 *    (Urdu ۰-۹, Arabic-Indic ٠-٩, full-width) with mixed separators are masked.
 */
import { isIP } from 'node:net';

export const REDACTED = '[REDACTED]';
export const REDACTED_PHONE = '[PHONE]';
export const REDACTED_EMAIL = '[EMAIL]';
export const REDACTED_CNIC = '[CNIC]';
export const REDACTED_IP = '[IP]';
export const REDACTED_IBAN = '[IBAN]';
export const REDACTED_SECRET = '[SECRET]';

/** Key → lower-case words: `pickupLatLng` → [pickup, lat, lng]; `Phone_E164` → [phone, e164]. */
export function keyWords(key: string): string[] {
  return key
    .normalize('NFKC')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);
}

/** Credential stems: matched anywhere in the joined key; never kept, not even as `…Id`. */
const CREDENTIAL_CONTAINS = [
  'token',
  'otp',
  'password',
  'passcode',
  'passwd',
  'secret',
  'cookie',
  'authorization',
  'credential',
  'session',
  'jwt',
  'bearer',
  'apikey',
  'privatekey',
  'verificationcode',
  'pinhash',
  'pincode',
  'signature',
];
/** Credential words matched as whole words only (too short for substring matching). */
const CREDENTIAL_WORDS = ['auth', 'sid', 'pin', 'cvv', 'mfa'];

/** Personal-data stems matched anywhere in the joined key. */
const PII_CONTAINS = [
  'phone',
  'mobile',
  'msisdn',
  'whatsapp',
  'landline',
  'contactnumber',
  'email',
  'address',
  'street',
  'landmark',
  'cnic',
  'nationalid',
  'iban',
  'accountnumber',
  'accountno',
  'accounttitle',
  'bankaccount',
  'wallet',
  'cardnumber',
  'name',
  'birth',
  'latitude',
  'longitude',
  'coord',
  'geopoint',
  'geolocation',
  'location',
  'position',
];
/** Personal-data words matched as whole words only. */
const PII_WORDS = ['lat', 'lng', 'lon', 'gps', 'geo', 'pos', 'point', 'dob', 'pan', 'house'];
/** Keys that are exactly one of these words (e.g. `long` = longitude only when alone). */
const PII_EXACT = ['long'];

/**
 * `…name` keys that are not people: catalog/system labels (BP §37 bilingual catalog names).
 * Matched against the joined key's ending.
 */
const NAME_ALLOWED_SUFFIXES = [
  'typename',
  'servicename',
  'categoryname',
  'familyname',
  'cityname',
  'zonename',
  'areaname',
  'eventname',
  'queuename',
  'consumername',
  'jobname',
  'modulename',
  'filename',
  'templatename',
  'keyname',
];
const NAME_ALLOWED_EXACT = ['nameen', 'nameur'];

const IP_KEYS = [
  'ip',
  'ipaddress',
  'clientip',
  'remoteaddress',
  'remoteip',
  'xforwardedfor',
  'xrealip',
];

/** `…Id`, `…Ids`, `…Ref`, `…Refs`: identifiers, kept for traceability (DATA-003). */
const ID_SUFFIX_WORDS = ['id', 'ids', 'ref', 'refs'];
/** Flag/enum suffixes: kept only for boolean / number / short enum-code values. */
const FLAG_SUFFIX_WORDS = [
  'verified',
  'enabled',
  'status',
  'type',
  'kind',
  'present',
  'set',
  'count',
];
const ENUM_CODE = /^(?:[A-Z][A-Z0-9_]{0,39}|[a-z][a-z0-9_]{0,39})$/;

export type KeyRule = 'keep' | 'redact' | 'ip';

function isPersonalKey(words: readonly string[], joined: string): boolean {
  if (PII_EXACT.includes(joined)) return true;
  if (words.some((w) => PII_WORDS.includes(w))) return true;
  for (const stem of PII_CONTAINS) {
    if (!joined.includes(stem)) continue;
    if (stem === 'name') {
      if (NAME_ALLOWED_EXACT.includes(joined)) continue;
      if (
        NAME_ALLOWED_SUFFIXES.some(
          (s) => joined.endsWith(s) || joined.endsWith(`${s}en`) || joined.endsWith(`${s}ur`),
        )
      ) {
        continue;
      }
    }
    return true;
  }
  return false;
}

function isFlagValue(value: unknown): boolean {
  return (
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    value === null ||
    (typeof value === 'string' && ENUM_CODE.test(value))
  );
}

/**
 * Classify a key (optionally with its value, for flag/enum keys). Exported for tests and for
 * A02's anonymiser inventory checks. The deny-lists run BEFORE the identifier exemption.
 */
export function classifyKey(key: string, ...value: [unknown?]): KeyRule {
  const words = keyWords(key);
  const joined = words.join('');
  if (IP_KEYS.includes(joined)) return 'ip';
  if (CREDENTIAL_CONTAINS.some((s) => joined.includes(s))) return 'redact';
  if (words.some((w) => CREDENTIAL_WORDS.includes(w))) return 'redact';
  if (!isPersonalKey(words, joined)) return 'keep';
  const last = words[words.length - 1] ?? '';
  if (ID_SUFFIX_WORDS.includes(last)) return 'keep';
  // Flag/enum keys are kept only when the value is visibly a flag (no value given → redact).
  if (FLAG_SUFFIX_WORDS.includes(last) && value.length === 1 && isFlagValue(value[0])) {
    return 'keep';
  }
  return 'redact';
}

const TRUNCATED_V4 = /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){2}\.0\/24$/;
const TRUNCATED_V6 = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){2}::\/48$/i;

/** Truncate one IP: IPv4 → a.b.c.0/24, IPv6 → first 48 bits ::/48. Anything else → [IP]. */
export function truncateIp(value: string): string {
  let ip = value.trim();
  // Idempotent: an already truncated value is kept (the masker may run twice: writer + DB hook).
  if (TRUNCATED_V4.test(ip) || TRUNCATED_V6.test(ip)) return ip;
  // IPv4-mapped IPv6 (::ffff:1.2.3.4) is treated as IPv4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped?.[1]) ip = mapped[1];
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b, c] = ip.split('.');
    return `${a}.${b}.${c}.0/24`;
  }
  if (kind === 6) {
    const groups = expandIpv6(ip);
    return `${groups.slice(0, 3).join(':')}::/48`;
  }
  return REDACTED_IP;
}

function expandIpv6(ip: string): string[] {
  const withoutZone = ip.split('%')[0] ?? ip;
  const [head = '', tail] = withoutZone.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;
  const parts = [...headParts, ...Array<string>(Math.max(missing, 0)).fill('0'), ...tailParts];
  return parts.map((p) => (p === '' ? '0' : p.toLowerCase().replace(/^0+(?=.)/, '')));
}

function truncateIpList(value: string): string {
  return value
    .split(',')
    .map((part) => truncateIp(part))
    .join(', ');
}

// ---- Free text --------------------------------------------------------------------------------
/** Invisible characters that can be used to split a number (zero-width space/joiners, BOM, …). */
const INVISIBLE_RE = /[\u00AD\u180E\u200B-\u200F\u2060-\u2064\uFEFF]/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** ISO dates/times (2026-10-24, 2026-10-24T10:00:00Z, 2026-10-24 10:00): not phone numbers. */
const DATE_RE =
  /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g;

const TRUNCATED_IN_TEXT_RE =
  /(?<![\d.])\d{1,3}\.\d{1,3}\.\d{1,3}\.0\/24(?!\d)|(?<![0-9A-Fa-f:])[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){2}::\/48(?!\d)/g;

/** `sha256:` + 64 lower-case hex digits: the agreed fingerprint form (RQ-011 item 2). */
export const SHA256_FINGERPRINT_RE = /(?<![0-9A-Za-z])sha256:[0-9a-f]{64}(?![0-9a-f])/g;

/** Query/form parameters whose value is a credential (SEC-REVIEW-T2.2 #4). */
const SECRET_PARAM_RE =
  /([?&;](?:[^=&#\s]*(?:token|otp|code|sig|signature|secret|key|password|credential|session|auth)[^=&#\s]*)=)[^&#\s]*/gi;
const BEARER_RE = /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{6,}/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}(?:\.[A-Za-z0-9_-]*)?/g;
/** `otp 123456`, `code: 1234`, `pin=0000`: a short code right after a credential word. */
const LABELLED_CODE_RE =
  /\b(otp|pin|passcode|verification code|code)(\s*[:=#]?\s*)\p{Nd}{4,8}(?!\p{Nd})/giu;
/** Pakistani IBAN (24 chars), compact or in groups of four. */
const IBAN_RE = /\bPK\s?\d{2}\s?[A-Z]{4}(?:\s?[0-9]{4}){4}\b/gi;
const EMAIL_RE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
/** Separators people put inside numbers: spaces, dots, all dashes, slash, underscore, brackets. */
const SEP = '[\\s.\\-\\u2010-\\u2015\\u2212/_()\\[\\]]';
/** CNIC 5-7-1 in any Unicode digits. */
const CNIC_RE = new RegExp(
  `(?<!\\p{Nd})\\p{Nd}{5}${SEP}{0,3}\\p{Nd}{7}${SEP}{0,3}\\p{Nd}(?!\\p{Nd})`,
  'gu',
);
/** IPv6 candidates (incl. `::` forms); validated with isIP before truncation. */
const IPV6_CANDIDATE_RE =
  /(?<![0-9A-Za-z:])(?:[0-9A-Fa-f]{0,4}:){2,7}[0-9A-Fa-f]{0,4}(?![0-9A-Za-z:])/g;
const IPV4_RE =
  /(?<![\d.])(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\d.])/g;
/**
 * Phone: optional `+`, then ≥ 10 Unicode digits with up to 3 separator characters between digits.
 * Only a DIGIT boundary is required, so `tel03001234567`, `call0300-1234567` and
 * `03001234567-urgent` are caught; `(042) 35761234` and `0300 - 1234567` too.
 */
const PHONE_RE = new RegExp(
  `(?:\\+${SEP}{0,2})?(?<!\\p{Nd})\\p{Nd}(?:${SEP}{0,3}\\p{Nd}){9,}(?!\\p{Nd})`,
  'gu',
);

function protect(text: string, re: RegExp, store: string[]): string {
  return text.replace(re, (m) => {
    store.push(m);
    return `\u0000${store.length - 1}\u0000`;
  });
}

/** Mask phones, emails, CNICs, IBANs, IPs and secrets inside free text (reasons, notes, logs). */
export function maskFreeText(text: string): string {
  const kept: string[] = [];
  let out = text.replace(INVISIBLE_RE, '');
  out = protect(out, UUID_RE, kept);
  out = protect(out, DATE_RE, kept);
  // RQ-011 item 2 / SEC-REVIEW-T2.6 #6: hash fingerprints (`sha256:<64 hex>`) are not personal
  // data and must stay verifiable in audit rows; their digits are never read as a phone.
  out = protect(out, SHA256_FINGERPRINT_RE, kept);
  // Already truncated IPs (a second masking pass) are kept as they are.
  out = protect(out, TRUNCATED_IN_TEXT_RE, kept);
  // Truncated IPs are protected too, so the phone pass never re-reads their digits.
  const keepIp = (ip: string): string => {
    kept.push(truncateIp(ip));
    return `\u0000${kept.length - 1}\u0000`;
  };
  out = out
    .replace(SECRET_PARAM_RE, `$1${REDACTED}`)
    .replace(JWT_RE, REDACTED_SECRET)
    .replace(BEARER_RE, `$1 ${REDACTED_SECRET}`)
    .replace(LABELLED_CODE_RE, `$1$2${REDACTED}`)
    .replace(IBAN_RE, REDACTED_IBAN)
    .replace(EMAIL_RE, REDACTED_EMAIL)
    .replace(IPV6_CANDIDATE_RE, (m) => (isIP(m) === 6 ? keepIp(m) : m))
    .replace(IPV4_RE, (m) => keepIp(m))
    .replace(CNIC_RE, REDACTED_CNIC)
    .replace(PHONE_RE, REDACTED_PHONE);
  // eslint-disable-next-line no-control-regex -- placeholder delimiter chosen to never occur in input
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => kept[Number(i)] ?? '');
}

/**
 * Mask, then bound the length (QA-T22-04: masking runs BEFORE truncation, so a number cut at the
 * boundary can never survive as a fragment). The input is pre-cut with a margin and any trailing
 * partial number is dropped before masking, so hostile megabyte strings stay cheap.
 */
export function maskAndBound(text: string, maxLength: number): string {
  const pre =
    text.length > maxLength * 2
      ? text.slice(0, maxLength * 2).replace(/[\p{Nd}\s.\-/_()+]+$/u, '')
      : text;
  return maskFreeText(pre).slice(0, maxLength);
}

/** JSON-safe value produced by the masker. */
export type MaskedJson =
  string | number | boolean | null | MaskedJson[] | { [key: string]: MaskedJson };

/** Nesting depth after which values are replaced (protects against hostile payloads). */
const MAX_DEPTH = 12;

/**
 * Deep-mask any value into JSON-safe data. Never mutates the input. Non-JSON values: Date →
 * ISO string, bigint → string, Error → its name only, binary data (Buffer, typed arrays,
 * ArrayBuffer) → [REDACTED], functions/symbols/undefined → dropped.
 */
export function maskPii(value: unknown): MaskedJson {
  return maskValue(value, 0, new WeakSet<object>());
}

function maskValue(value: unknown, depth: number, seen: WeakSet<object>): MaskedJson {
  if (value === null || value === undefined) return null;
  switch (typeof value) {
    case 'string':
      return maskFreeText(value);
    case 'number':
      return Number.isFinite(value) ? value : null;
    case 'boolean':
      return value;
    case 'bigint':
      return value.toString();
    case 'object':
      break;
    default:
      return null;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (value instanceof Error) return { name: value.name };
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return REDACTED;
  if (depth >= MAX_DEPTH) return REDACTED;
  const obj = value as object;
  if (seen.has(obj)) return REDACTED;
  seen.add(obj);
  try {
    if (Array.isArray(obj)) return obj.map((item) => maskValue(item, depth + 1, seen));
    const out: { [key: string]: MaskedJson } = {};
    for (const [key, item] of Object.entries(obj)) {
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') continue;
      const rule = classifyKey(key, item);
      if (rule === 'redact') {
        out[key] = item === null ? null : REDACTED;
      } else if (rule === 'ip') {
        out[key] =
          typeof item === 'string'
            ? truncateIpList(item)
            : Array.isArray(item)
              ? item.map((v) => (typeof v === 'string' ? truncateIp(v) : REDACTED_IP))
              : REDACTED_IP;
      } else {
        out[key] = maskValue(item, depth + 1, seen);
      }
    }
    return out;
  } finally {
    seen.delete(obj);
  }
}
