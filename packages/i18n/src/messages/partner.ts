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

  // P01 Provider welcome (BP §13 P01, §78.1, UX-SCREEN-002)
  'partner.p01.title': 'Welcome to Kaam Karo Partner',
  'partner.p01.subtitle': 'Grow your trade business with verified customers',
  'partner.p01.valuePoint1': 'Get job requests near you',
  'partner.p01.valuePoint2': 'Set your own hours and area',
  'partner.p01.valuePoint3': 'Track your earnings and keep 70% of labour',
  'partner.p01.getStarted': 'Get started',
  'partner.p01.login': 'I already have an account',
  'partner.p01.language': 'Language',
  'partner.p01.loading': 'Opening Kaam Karo Partner…',
  'partner.p01.error': "We couldn't check your account. Please try again.",

  // P02 Provider registration & login (BP §13 P02, D-002, D-004, UX-SCREEN-004)
  'partner.p02.titleRegister': 'Register as a Provider',
  'partner.p02.titleLogin': 'Log in to Partner App',
  'partner.p02.phoneLabel': 'Mobile number',
  'partner.p02.phonePlaceholder': '300 1234567',
  'partner.p02.phoneHint': 'We will send a 6-digit verification code',
  'partner.p02.sendCode': 'Send code',
  'partner.p02.otpHeading': 'Enter verification code',
  'partner.p02.otpSubheading': 'Enter the code sent to {phone}',
  'partner.p02.otpPlaceholder': '000000',
  'partner.p02.verify': 'Verify',
  'partner.p02.resendCountdown': 'Resend code (in {s}s)',
  'partner.p02.resendNow': 'Resend code',
  'partner.p02.changeNumber': 'Change number',
  'partner.p02.profileHeading': 'Complete your profile',
  'partner.p02.nameLabel': 'Your full name',
  'partner.p02.namePlaceholder': 'e.g. Muhammad Asif',
  'partner.p02.providerTypeLabel': 'How do you work?',
  'partner.p02.typeSolo': 'I work alone',
  'partner.p02.typeSoloDesc': 'Individual trade worker',
  'partner.p02.typeTeam': 'I have a team / company',
  'partner.p02.typeTeamDesc': 'Crew contractor or trade business',
  'partner.p02.businessNameLabel': 'Business name',
  'partner.p02.businessNamePlaceholder': 'e.g. Asif Electric Works',
  'partner.p02.teamSizeLabel': 'Usual number of workers in your team',
  'partner.p02.teamLeaderNote':
    'Only you, the team leader, are verified. Team members are not added to the app.',
  'partner.p02.cityLabel': 'City: Lahore',
  'partner.p02.emailLabel': 'Email (optional)',
  'partner.p02.emailPlaceholder': 'asif@example.com',
  'partner.p02.saveAndContinue': 'Save and continue',
  'partner.p02.invalidPhone': 'Please enter a valid 10-digit mobile number',
  'partner.p02.invalidOtp': 'That code is not correct or has expired. Request a new code.',
  'partner.p02.invalidName': 'Please enter your full name',
  'partner.p02.invalidBusinessName': 'Please enter your business name',
  'partner.p02.saving': 'Saving profile…',
  'partner.p02.sendingCode': 'Sending code…',
  'partner.p02.checkingCode': 'Checking code…',

  // P03 Verification (BP §13 P03, §22, TRUST-VER-001..003, PROV-CREW-006, M-11)
  'partner.p03.title': 'Provider Verification',
  'partner.p03.subtitle': 'Upload documents to unlock jobs and build customer trust',
  'partner.p03.levelLabel': 'Your level: {level}',
  'partner.p03.levelBasic': 'Basic',
  'partner.p03.levelVerified': 'Verified',
  'partner.p03.levelBusinessVerified': 'Business Verified',
  'partner.p03.teamLeaderNote': 'Only you, the team leader, are verified.',
  'partner.p03.requiredDocsHeading': 'Documents needed for your services',
  'partner.p03.docCnicFront': 'CNIC (Front)',
  'partner.p03.docCnicBack': 'CNIC (Back)',
  'partner.p03.docTradeCert': 'Trade Certificate / Police Clearance',
  'partner.p03.docBusinessReg': 'Business Registration Document',
  'partner.p03.statusNotUploaded': 'Not uploaded',
  'partner.p03.statusUploaded': 'Uploaded',
  'partner.p03.statusUnderReview': 'Under review',
  'partner.p03.statusAccepted': 'Accepted',
  'partner.p03.statusNeedsAction': 'Needs action',
  'partner.p03.reviewerNote': 'Note from Kaam Karo: {text}',
  'partner.p03.uploadDoc': 'Upload document',
  'partner.p03.replaceDoc': 'Replace',
  'partner.p03.retryUpload': 'Retry upload',
  'partner.p03.submitReview': 'Submit for review',
  'partner.p03.submitSuccess': 'Sent for review. We will notify you of the result.',
  'partner.p03.uploadSuccess': 'Document uploaded successfully.',
  'partner.p03.allDocsRequired': 'Please upload all required documents before submitting.',
  'partner.p03.uploadingPercent': 'Uploading {p}%…',
  'partner.p03.loading': 'Loading your verification…',
  'partner.p03.empty': 'No documents are needed yet. We will tell you if something is required.',
  'partner.p03.uploadFailed': 'Upload failed. Your other documents are safe. Please try again.',
  'partner.p01.brand': 'KAAM KARO PARTNER',
  'partner.p01.langEnglish': 'English',
  'partner.p01.langUrdu': 'Urdu',
  'partner.p01.langEnglishA11y': 'Switch language to English',
  'partner.p01.langUrduA11y': 'Switch language to Urdu',
  'partner.p03.fileSize': '{fileName} ({sizeMb} MB)',
  'partner.p04.startOver': 'Start Over',
  'partner.p04.startOverA11y': 'Log out and start over',
  'partner.p04.individual': 'Individual',
  'partner.p04.team': 'Team Contractor',
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

  // P01 Provider welcome
  'partner.p01.title': 'کام کرو پارٹنر میں خوش آمدید',
  'partner.p01.subtitle': 'تصدیق شدہ گاہکوں کے ساتھ اپنے ہنر اور کاروبار کو آگے بڑھائیں',
  'partner.p01.valuePoint1': 'اپنے قریب کام کی درخواستیں پائیں',
  'partner.p01.valuePoint2': 'اپنے اوقات اور علاقہ خود طے کریں',
  'partner.p01.valuePoint3': 'اپنی آمدنی دیکھیں اور مزدوری کا 70 فیصد اپنے پاس رکھیں',
  'partner.p01.getStarted': 'شروع کریں',
  'partner.p01.login': 'میرا اکاؤنٹ پہلے سے ہے',
  'partner.p01.language': 'زبان',
  'partner.p01.loading': 'کام کرو پارٹنر کھل رہا ہے…',
  'partner.p01.error': 'ہم آپ کا اکاؤنٹ چیک نہیں کر سکے۔ براہِ کرم دوبارہ کوشش کریں۔',

  // P02 Provider registration & login
  'partner.p02.titleRegister': 'بطور پارٹنر رجسٹر ہوں',
  'partner.p02.titleLogin': 'پارٹنر ایپ میں لاگ ان کریں',
  'partner.p02.phoneLabel': 'موبائل نمبر',
  'partner.p02.phonePlaceholder': '300 1234567',
  'partner.p02.phoneHint': 'ہم 6 ہندسوں کا تصدیقی کوڈ بھیجیں گے',
  'partner.p02.sendCode': 'کوڈ بھیجیں',
  'partner.p02.otpHeading': 'تصدیقی کوڈ درج کریں',
  'partner.p02.otpSubheading': '{phone} پر بھیجا گیا کوڈ درج کریں',
  'partner.p02.otpPlaceholder': '000000',
  'partner.p02.verify': 'تصدیق کریں',
  'partner.p02.resendCountdown': 'کوڈ دوبارہ بھیجیں ({s} سیکنڈ میں)',
  'partner.p02.resendNow': 'کوڈ دوبارہ بھیجیں',
  'partner.p02.changeNumber': 'نمبر تبدیل کریں',
  'partner.p02.profileHeading': 'اپنا پروفائل مکمل کریں',
  'partner.p02.nameLabel': 'آپ کا پورا نام',
  'partner.p02.namePlaceholder': 'مثلاً محمد آصف',
  'partner.p02.providerTypeLabel': 'آپ کیسے کام کرتے ہیں؟',
  'partner.p02.typeSolo': 'میں اکیلا کام کرتا ہوں',
  'partner.p02.typeSoloDesc': 'انفرادی ہنرمند / کاریگر',
  'partner.p02.typeTeam': 'میری ٹیم / کمپنی ہے',
  'partner.p02.typeTeamDesc': 'ٹیم لیڈر یا کاروباری ادارہ',
  'partner.p02.businessNameLabel': 'کاروبار کا نام',
  'partner.p02.businessNamePlaceholder': 'مثلاً آصف الیکٹرک ورکس',
  'partner.p02.teamSizeLabel': 'آپ کی ٹیم میں عام طور پر کتنے کاریگر ہوتے ہیں',
  'partner.p02.teamLeaderNote':
    'صرف آپ (ٹیم لیڈر) کی تصدیق ہوگی۔ ٹیم ممبرز ایپ میں شامل نہیں کیے جاتے۔',
  'partner.p02.cityLabel': 'شہر: لاہور',
  'partner.p02.emailLabel': 'ای میل (اختیاری)',
  'partner.p02.emailPlaceholder': 'مثلاً asif@example.com',
  'partner.p02.saveAndContinue': 'محفوظ کریں اور آگے بڑھیں',
  'partner.p02.invalidPhone': 'براہِ کرم درست 10 ہندسوں کا موبائل نمبر درج کریں',
  'partner.p02.invalidOtp': 'یہ کوڈ درست نہیں یا اس کی مدت ختم ہو گئی ہے۔ نیا کوڈ منگوائیں۔',
  'partner.p02.invalidName': 'براہِ کرم اپنا پورا نام درج کریں',
  'partner.p02.invalidBusinessName': 'براہِ کرم اپنے کاروبار کا نام درج کریں',
  'partner.p02.saving': 'پروفائل محفوظ ہو رہا ہے…',
  'partner.p02.sendingCode': 'کوڈ بھیجا جا رہا ہے…',
  'partner.p02.checkingCode': 'کوڈ چیک ہو رہا ہے…',

  // P03 Verification
  'partner.p03.title': 'پارٹنر تصدیق',
  'partner.p03.subtitle': 'کام حاصل کرنے اور گاہکوں کا اعتماد جیتنے کے لیے دستاویزات اپ لوڈ کریں',
  'partner.p03.levelLabel': 'آپ کا درجہ: {level}',
  'partner.p03.levelBasic': 'بنیادی',
  'partner.p03.levelVerified': 'تصدیق شدہ',
  'partner.p03.levelBusinessVerified': 'تصدیق شدہ کاروبار',
  'partner.p03.teamLeaderNote': 'صرف آپ (ٹیم لیڈر) کی تصدیق ہوتی ہے۔',
  'partner.p03.requiredDocsHeading': 'آپ کی سروسز کے لیے ضروری دستاویزات',
  'partner.p03.docCnicFront': 'شناختی کارڈ (سامنے کا رخ)',
  'partner.p03.docCnicBack': 'شناختی کارڈ (پچھلا رخ)',
  'partner.p03.docTradeCert': 'مہارت کا سرٹیفکیٹ یا پولیس تصدیق نامہ',
  'partner.p03.docBusinessReg': 'کاروبار کی رجسٹریشن دستاویز',
  'partner.p03.statusNotUploaded': 'اپ لوڈ نہیں ہوئی',
  'partner.p03.statusUploaded': 'اپ لوڈ ہو گئی',
  'partner.p03.statusUnderReview': 'جانچ جاری ہے',
  'partner.p03.statusAccepted': 'منظور',
  'partner.p03.statusNeedsAction': 'کارروائی درکار',
  'partner.p03.reviewerNote': 'کام کرو کا نوٹ: {text}',
  'partner.p03.uploadDoc': 'دستاویز اپ لوڈ کریں',
  'partner.p03.replaceDoc': 'تبدیل کریں',
  'partner.p03.retryUpload': 'دوبارہ اپ لوڈ کریں',
  'partner.p03.submitReview': 'جانچ کے لیے جمع کریں',
  'partner.p03.submitSuccess': 'جانچ کے لیے بھیج دیا گیا۔ نتیجے کی اطلاع دی جائے گی۔',
  'partner.p03.uploadSuccess': 'دستاویز کامیابی سے اپ لوڈ ہو گئی۔',
  'partner.p03.allDocsRequired': 'براہِ کرم جمع کرانے سے پہلے تمام مطلوبہ دستاویزات اپ لوڈ کریں۔',
  'partner.p03.uploadingPercent': 'اپ لوڈ ہو رہا ہے {p}٪…',
  'partner.p03.loading': 'آپ کی تصدیق لوڈ ہو رہی ہے…',
  'partner.p03.empty': 'ابھی کوئی دستاویز درکار نہیں۔ ضرورت ہونے پر ہم آپ کو بتائیں گے۔',
  'partner.p03.uploadFailed': 'اپ لوڈ ناکام ہوا۔ آپ کی باقی دستاویزات محفوظ ہیں۔ براہِ کرم دوبارہ کوشش کریں۔',
  'partner.p01.brand': 'کام کرو پارٹنر',
  'partner.p01.langEnglish': 'انگریزی',
  'partner.p01.langUrdu': 'اردو',
  'partner.p01.langEnglishA11y': 'زبان انگریزی میں تبدیل کریں',
  'partner.p01.langUrduA11y': 'زبان اردو میں تبدیل کریں',
  'partner.p03.fileSize': '{fileName} ({sizeMb} ایم بی)',
  'partner.p04.startOver': 'دوبارہ شروع کریں',
  'partner.p04.startOverA11y': 'لاگ آؤٹ کر کے دوبارہ شروع کریں',
  'partner.p04.individual': 'انفرادی کاریگر',
  'partner.p04.team': 'ٹیم یا کمپنی',
};
