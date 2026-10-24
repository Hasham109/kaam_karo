/**
 * `partner.*` — Partner-app-only shared copy (I18N-001, I18N-005, I18N-006; BP §37, §78).
 * Source: docs/screens/partner.md G2, G5, G6 (code in each comment). Shared meanings with the
 * Customer app live in `common.*` (QA F-03). Provider wording may keep common English trade
 * terms (BP §78.2, I18N-005).
 *
 * Amount placeholders receive an already formatted amount (`formatPkrMinor`), so the draft's
 * "Rs. {amount}" / "{amount} روپے" became "{amount}": the symbol or word comes from the OQ-079
 * switch, never from a template. `{reason}` is always copy from `partner.blockReason.*`, never
 * server text (partner.md G6 "Reason slots").
 * G3 (live location strip) is not included: it exists only if OQ-025 is approved.
 */
export const PARTNER_EN = {
  // G2 permission explanations (PERM-001…006)
  'partner.perm.cameraWhy': 'Kaam Karo needs the camera to take a photo of your work.', // G2-camera-why
  'partner.perm.notificationsWhy':
    "Turn on notifications so you don't miss new jobs and payment updates.", // G2-notif-why
  'partner.perm.denied': 'Permission not given. You can still continue: {fallback}.', // G2-denied
  // G5 balance wording: never colour only (A11Y-003)
  'partner.balance.owe': 'You owe {amount}',
  // G6 error codes
  'partner.error.unpaidCommission':
    'You owe {amount} to Kaam Karo. Pay the company to take or start jobs.', // UNPAID_COMMISSION (D-020, D-021)
  'partner.action.payCompany': 'Pay company',
  'partner.error.transitionNotAllowed': 'This job has changed. We have refreshed it.', // TRANSITION_NOT_ALLOWED
  'partner.error.quoteExpired': 'This quote has expired.', // QUOTE_EXPIRED
  'partner.error.blocked': 'Your account is blocked: {reason}. Contact support.', // ACCOUNT_BLOCKED
  'partner.error.uploadsUnavailable': 'Uploads are not available right now. Please try later.', // LIMIT_NOT_CONFIGURED
  // G6 block reasons (allow-listed codes only)
  'partner.blockReason.lowRating': 'Your average rating stayed below the required level', // LOW_RATING (D-014)
  'partner.blockReason.adminSuspension': 'Your account was suspended by Kaam Karo', // ADMIN_SUSPENSION
  'partner.blockReason.other': 'Contact support for details', // any other code
  // G6 account-level banners
  'partner.banner.unpaidCommission':
    'You owe {amount}. You cannot get new jobs or start accepted jobs until it is paid.',
  'partner.banner.paymentReview':
    'Payment of {amount} sent for checking. You can take jobs again once it is approved.',
  'partner.banner.ratingWarning':
    'Your average rating is below {threshold}. Warning {n} of {total}.',
  'partner.banner.verificationNeeded': 'Complete verification to start getting jobs.',
} as const satisfies Readonly<Record<`partner.${string}`, string>>;

export const PARTNER_UR: Readonly<Record<keyof typeof PARTNER_EN, string>> = {
  'partner.perm.cameraWhy': 'کام کی تصویر لینے کے لیے کام کرو کو کیمرہ چاہیے۔',
  'partner.perm.notificationsWhy':
    'نوٹیفکیشن آن کریں تاکہ نئے کام اور ادائیگی کی اطلاعات نہ چھوٹیں۔',
  'partner.perm.denied': 'اجازت نہیں دی گئی۔ آپ پھر بھی آگے بڑھ سکتے ہیں: {fallback}۔',
  'partner.balance.owe': 'آپ پر {amount} واجب الادا ہیں',
  'partner.error.unpaidCommission':
    'آپ پر کام کرو کے {amount} واجب الادا ہیں۔ کام لینے یا شروع کرنے کے لیے کمپنی کو ادائیگی کریں۔',
  'partner.action.payCompany': 'کمپنی کو ادائیگی کریں',
  'partner.error.transitionNotAllowed': 'اس کام کی صورتحال بدل گئی ہے۔ ہم نے اسے تازہ کر دیا ہے۔',
  'partner.error.quoteExpired': 'اس کوٹیشن کی مدت ختم ہو گئی ہے۔',
  'partner.error.blocked': 'آپ کا اکاؤنٹ بند ہے: {reason}۔ مدد کے لیے سپورٹ سے رابطہ کریں۔',
  'partner.error.uploadsUnavailable': 'اپ لوڈ ابھی دستیاب نہیں۔ براہِ کرم بعد میں کوشش کریں۔',
  'partner.blockReason.lowRating': 'آپ کی اوسط ریٹنگ مقررہ حد سے کم رہی',
  'partner.blockReason.adminSuspension': 'کام کرو نے آپ کا اکاؤنٹ معطل کر دیا ہے',
  'partner.blockReason.other': 'تفصیل کے لیے سپورٹ سے رابطہ کریں',
  'partner.banner.unpaidCommission':
    'آپ پر {amount} واجب الادا ہیں۔ ادائیگی تک آپ نئے کام نہیں لے سکتے اور قبول شدہ کام شروع نہیں کر سکتے۔',
  'partner.banner.paymentReview':
    '{amount} کی ادائیگی جانچ کے لیے بھیج دی گئی ہے۔ منظوری کے بعد آپ دوبارہ کام لے سکیں گے۔',
  'partner.banner.ratingWarning': 'آپ کی اوسط ریٹنگ {threshold} سے کم ہے۔ وارننگ {n} از {total}۔',
  'partner.banner.verificationNeeded': 'کام ملنا شروع ہونے کے لیے تصدیق مکمل کریں۔',
};
