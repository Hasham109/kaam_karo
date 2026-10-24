/**
 * `customer.*` — Customer-app-only shared copy (I18N-001, I18N-006; BP §37, §78).
 * Source: docs/screens/customer.md §2.4, §2.5, §2.7, §2.10, §2.13 (code in each comment).
 * Shared meanings with the Partner app live in `common.*` (QA F-03).
 * Amount placeholders receive an already formatted amount (`formatPkrMinor`), so the currency
 * symbol/word follows the OQ-079 switch and is never written into a template.
 */
export const CUSTOMER_EN = {
  'customer.error.session': 'Please log in again. Your unsent details are saved.', // G-SESSION
  'customer.error.blocked':
    "Your account can't be used right now. Please contact Kaam Karo support.", // G-BLOCKED
  'customer.error.limit':
    'You have reached the limit of open requests. Finish or cancel one first.', // G-LIMIT
  'customer.fallback.aiDown': "Smart help isn't available right now. You can use the simple form.", // G-AI-DOWN
  'customer.fallback.mapsDown': "The map isn't loading. Please type your address instead.", // G-MAPS-DOWN
  'customer.perm.location':
    'Allow location to suggest your area and find providers near you. You can also type your address.', // G-PERM-LOC
  'customer.perm.camera': 'Allow the camera so you can show the problem to the provider.', // G-PERM-CAM
  'customer.perm.micNote':
    'Allow the microphone to record your voice, so the provider understands the problem.', // G-PERM-MIC-NOTE
  'customer.perm.micVoice':
    'Allow the microphone so the assistant can hear you. It listens only after you tap the mic.', // G-PERM-MIC-VOICE
  'customer.perm.notifications':
    'Turn on notifications to know when a price arrives, the provider accepts or is on the way, and about payments.', // G-PERM-NOTIF
  'customer.perm.denied':
    'Permission is off. You can continue another way, or turn it on in Settings.', // G-PERM-DENIED
  'customer.payment.atEnd': 'You pay only after the job is completed.', // G-PAY-AT-END (D-003)
  'customer.auth.loginNeeded': 'Please log in to send your request. Your details are saved.', // G-LOGIN-NEEDED
  // Price-model labels (customer.md §2.7; CAT-SVC-001, CAT-SVC-009)
  'customer.price.from': 'From {amount}', // FROM
  'customer.price.afterInspection': 'Price after inspection', // INSPECTION_QUOTE
  'customer.price.perUnit': 'per {unit}', // pricing unit; unit name comes from the server
} as const satisfies Readonly<Record<`customer.${string}`, string>>;

export const CUSTOMER_UR: Readonly<Record<keyof typeof CUSTOMER_EN, string>> = {
  'customer.error.session': 'براہِ کرم دوبارہ لاگ اِن کریں۔ آپ کی نہ بھیجی گئی معلومات محفوظ ہیں۔',
  'customer.error.blocked':
    'آپ کا اکاؤنٹ ابھی استعمال نہیں ہو سکتا۔ براہِ کرم کام کرو سپورٹ سے رابطہ کریں۔',
  'customer.error.limit':
    'آپ کی کھلی درخواستوں کی حد پوری ہو گئی ہے۔ پہلے کوئی ایک مکمل یا منسوخ کریں۔',
  'customer.fallback.aiDown': 'خودکار مدد ابھی دستیاب نہیں۔ آپ سادہ فارم استعمال کر سکتے ہیں۔',
  'customer.fallback.mapsDown': 'نقشہ نہیں کھل رہا۔ براہِ کرم اپنا پتہ لکھ دیں۔',
  'customer.perm.location':
    'اپنا علاقہ معلوم کرنے اور قریبی کاریگر ڈھونڈنے کے لیے لوکیشن کی اجازت دیں۔ آپ اپنا پتہ خود بھی لکھ سکتے ہیں۔',
  'customer.perm.camera': 'کیمرے کی اجازت دیں تاکہ آپ کاریگر کو مسئلہ دکھا سکیں۔',
  'customer.perm.micNote':
    'مائیکروفون کی اجازت دیں تاکہ آپ کی آواز ریکارڈ ہو اور کاریگر مسئلہ سمجھ سکے۔',
  'customer.perm.micVoice':
    'مائیکروفون کی اجازت دیں تاکہ اسسٹنٹ آپ کی بات سن سکے۔ یہ صرف مائیک دبانے کے بعد سنتا ہے۔',
  'customer.perm.notifications':
    'نوٹیفکیشن آن کریں تاکہ آپ کو پتا چلے کب قیمت آئی، کاریگر نے قبول کیا یا راستے میں ہے، اور ادائیگی کی خبر ملے۔',
  'customer.perm.denied':
    'اجازت بند ہے۔ آپ دوسرے طریقے سے جاری رکھ سکتے ہیں، یا سیٹنگز میں جا کر آن کریں۔',
  'customer.payment.atEnd': 'آپ ادائیگی صرف کام مکمل ہونے کے بعد کریں گے۔',
  'customer.auth.loginNeeded': 'درخواست بھیجنے کے لیے لاگ اِن کریں۔ آپ کی معلومات محفوظ ہیں۔',
  'customer.price.from': '{amount} سے شروع',
  'customer.price.afterInspection': 'قیمت معائنے کے بعد',
  'customer.price.perUnit': 'فی {unit}',
};
