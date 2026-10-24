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

  // C01 Splash
  'customer.c01.tagline': 'Trusted home services in your city',

  // C02 Welcome
  'customer.c02.valueProp':
    "Tell us what's wrong — talk, show or type. We'll find trusted help near you.",
  'customer.c02.login': 'Log in',
  'customer.c02.register': 'Create account',
  'customer.c02.guest': 'Continue as guest',
  'customer.c02.language': 'Language',

  // C03 Login
  'customer.c03.heading': 'Enter your mobile number to continue',
  'customer.c03.phoneLabel': 'Mobile number',
  'customer.c03.phonePlaceholder': '300 1234567',
  'customer.c03.sendCode': 'Send code',
  'customer.c03.emptyPhone': 'Enter your mobile number.',
  'customer.c03.invalidPhone': "This number doesn't look right. Please check it.",
  'customer.c03.pendingSend': "We're not sure the code was sent. Wait a moment, then try again.",

  // C04 Register
  'customer.c04.phoneVerified': 'Mobile number (verified)',
  'customer.c04.nameLabel': 'Your name',
  'customer.c04.namePlaceholder': 'Enter your full name',
  'customer.c04.cityLabel': 'City',
  'customer.c04.cityPlaceholder': 'Select your city',
  'customer.c04.areaLabel': 'Area (optional)',
  'customer.c04.areaPlaceholder': 'e.g. Gulberg, DHA, Johar Town',
  'customer.c04.termsCheckbox': 'I agree to the Terms and Privacy Policy',
  'customer.c04.termsLink': 'Terms and Privacy Policy',
  'customer.c04.createAccount': 'Create account',
  'customer.c04.inactiveCity': 'Kaam Karo is not active in {city} yet.',
  'customer.c04.citiesLoadError': "We couldn't load cities.",
  'customer.c04.welcome': 'Welcome to Kaam Karo!',
  'customer.c04.nameRequired': 'Please enter your name.',
  'customer.c04.termsRequired': 'Please agree to the terms to continue.',

  // C05 OTP Verification
  'customer.c05.modeLogin': 'Log in or sign up',
  'customer.c05.modeCurrentNumber': "Confirm it's you (current number)",
  'customer.c05.modeNewNumber': 'Verify your new number',
  'customer.c05.modeDelete': 'Confirm account deletion',
  'customer.c05.codePrompt': 'Enter the code we sent to {number}',
  'customer.c05.codeSent': 'We sent a code to {number}.',
  'customer.c05.resendTimer': 'You can resend in {s} s',
  'customer.c05.verify': 'Verify',
  'customer.c05.resendCode': 'Resend code',
  'customer.c05.changeNumber': 'Change number',
  'customer.c05.checking': 'Checking the code…',
  'customer.c05.wrongCode': 'That code is not correct. {n} tries left.',
  'customer.c05.codeExpired': 'This code has expired. Send a new one.',
  'customer.c05.codeExhausted': 'Too many wrong tries. Please request a new code.',

  // C06 Home
  'customer.c06.serviceLocation': 'Service in: {location} · Change',
  'customer.c06.changeLocation': 'Change',
  'customer.c06.whatDoYouNeed': 'What do you need?',
  'customer.c06.whatDoYouNeedSub': 'Tell us what is wrong — talk, show or type',
  'customer.c06.searchPlaceholder': 'Search a problem or service',
  'customer.c06.speak': 'Speak',
  'customer.c06.speakA11y': 'Use voice assistant',
  'customer.c06.categoriesHeader': 'Categories',
  'customer.c06.popularServicesHeader': 'Popular services',
  'customer.c06.activeJobHeader': 'Your current job',
  'customer.c06.viewJob': 'View',
  'customer.c06.inactiveCityMessage': 'Kaam Karo is not active in {city} yet. Choose another city.',
  'customer.c06.emptyCategoriesMessage': 'No services are available here right now.',
  'customer.c06.guestBannerTitle': 'Browsing as guest',
  'customer.c06.guestBannerAction': 'Log in for full access',

  // C07 Search
  'customer.c07.queryPlaceholder': 'e.g. "AC not cooling" or a provider name',
  'customer.c07.searchAction': 'Search',
  'customer.c07.describeProblem': 'Describe your problem',
  'customer.c07.searching': 'Searching…',
  'customer.c07.recentSearches': 'Recent searches',
  'customer.c07.clearRecent': 'Clear',

  // C08 Search Results
  'customer.c08.tabServices': 'Services',
  'customer.c08.tabProviders': 'Providers',
  'customer.c08.filters': 'Filters',
  'customer.c08.allCategories': 'All categories',
  'customer.c08.providerStats': '{rating} ({count}) · {jobs} jobs done',
  'customer.c08.noResults':
    "We couldn't find that. Try other words, or describe your problem and we'll find the right service.",

  // C09 Category
  'customer.c09.featured': 'Featured',
  'customer.c09.subcategories': 'Subcategories',
  'customer.c09.notSure': 'Not sure? Describe your problem',
  'customer.c09.emptyCategory': 'No services in this category are available here yet.',

  // C10 Service Detail
  'customer.c10.aboutService': 'About this service',
  'customer.c10.visitCharge': 'Visit charge: {amount}',
  'customer.c10.inspectionFee': 'Inspection fee: {amount} {deduction}',
  'customer.c10.deductedFromRepair': '(deducted from repair)',
  'customer.c10.notDeducted': '(not deducted)',
  'customer.c10.quoteNotice': 'The provider will confirm the price after checking.',
  'customer.c10.emergencyAvailable': 'Emergency service available',
  'customer.c10.includedHeader': "What's included",
  'customer.c10.notIncludedHeader': "What's not included",
  'customer.c10.estimatedDuration': 'Usually takes {duration}',
  'customer.c10.availabilityHours': 'Available: {hours}',
  'customer.c10.materialsHeader': 'Materials',
  'customer.c10.materialsIncluded': 'Materials: included',
  'customer.c10.materialsCustomerProvided': 'Materials: you provide',
  'customer.c10.materialsChargedSeparately': 'Materials: charged separately',
  'customer.c10.warranty': 'Warranty',
  'customer.c10.infoNeeded': 'Please be ready to share: {list}',
  'customer.c10.cancellationPolicy': 'Cancellation policy',
  'customer.c10.cancellationPolicyText':
    'Free cancellation before the provider starts heading to your location.',
  'customer.c10.reviewsHeader': 'Reviews',
  'customer.c10.bookNow': 'Book now',
  'customer.c10.getPrice': 'Get a price',
  'customer.c10.requestInspection': 'Request an inspection visit',
  'customer.c10.reportReview': 'Report',
  'customer.c10.serviceUnavailable': "This service isn't available here right now.",

  // C11 Provider Profile
  'customer.c11.teamLeader': 'Team leader: {name} (verified)',
  'customer.c11.verifiedBasic': 'Basic',
  'customer.c11.verifiedVerified': 'Verified',
  'customer.c11.verifiedBusiness': 'Business verified',
  'customer.c11.ratingSummary': '{rating} from {count} ratings',
  'customer.c11.completedJobs': '{n} jobs completed',
  'customer.c11.serviceArea': 'Works in: {areas}',
  'customer.c11.servicesHeader': 'Services',
  'customer.c11.teamSize': 'Usually works with a team of {n}',
  'customer.c11.noReviews': 'No reviews yet.',
  'customer.c11.favoriteSave': 'Save to favorites',
  'customer.c11.favoriteSaved': 'Saved to favorites',
  'customer.c11.favoriteA11y': 'Toggle favorite for this provider',
  'customer.c11.explainBadge': 'What does this mean?',
  'customer.c11.bookProvider': 'Book this provider',
  'customer.c11.providerUnavailable': "This provider isn't available right now.",

  // C41 Language Selection
  'customer.c41.title': 'Choose your language',
  'customer.c41.english': 'English',
  'customer.c41.urdu': 'اردو',
  'customer.c41.englishDesc': 'Left to right',
  'customer.c41.urduDesc': 'Right to left',
  'customer.c41.englishA11y': 'Select English language',
  'customer.c41.urduA11y': 'اردو زبان منتخب کریں',
  'customer.c41.saveSuccess': 'Language changed.',
  'customer.c41.saveLocalOnly':
    "Language changed on this phone. We couldn't save it to your account yet.",
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

  // C01 Splash
  'customer.c01.tagline': 'آپ کے شہر میں قابلِ اعتماد گھریلو سروسز',

  // C02 Welcome
  'customer.c02.valueProp':
    'بتائیں کیا مسئلہ ہے — بول کر، دکھا کر یا لکھ کر۔ ہم آپ کے قریب بھروسے والی مدد ڈھونڈیں گے۔',
  'customer.c02.login': 'لاگ اِن کریں',
  'customer.c02.register': 'اکاؤنٹ بنائیں',
  'customer.c02.guest': 'بطور مہمان جاری رکھیں',
  'customer.c02.language': 'زبان',

  // C03 Login
  'customer.c03.heading': 'جاری رکھنے کے لیے اپنا موبائل نمبر لکھیں',
  'customer.c03.phoneLabel': 'موبائل نمبر',
  'customer.c03.phonePlaceholder': '300 1234567',
  'customer.c03.sendCode': 'کوڈ بھیجیں',
  'customer.c03.emptyPhone': 'اپنا موبائل نمبر لکھیں۔',
  'customer.c03.invalidPhone': 'یہ نمبر درست نہیں لگتا۔ براہِ کرم چیک کریں۔',
  'customer.c03.pendingSend':
    'ہمیں یقین نہیں کہ کوڈ بھیجا گیا۔ تھوڑا انتظار کریں، پھر دوبارہ کوشش کریں۔',

  // C04 Register
  'customer.c04.phoneVerified': 'موبائل نمبر (تصدیق شدہ)',
  'customer.c04.nameLabel': 'آپ کا نام',
  'customer.c04.namePlaceholder': 'اپنا پورا نام لکھیں',
  'customer.c04.cityLabel': 'شہر',
  'customer.c04.cityPlaceholder': 'اپنا شہر منتخب کریں',
  'customer.c04.areaLabel': 'علاقہ (اختیاری)',
  'customer.c04.areaPlaceholder': 'مثلاً گلبرگ، ڈی ایچ اے، جوہر ٹاؤن',
  'customer.c04.termsCheckbox': 'میں شرائط اور پرائیویسی پالیسی سے متفق ہوں',
  'customer.c04.termsLink': 'شرائط اور پرائیویسی پالیسی',
  'customer.c04.createAccount': 'اکاؤنٹ بنائیں',
  'customer.c04.inactiveCity': 'کام کرو ابھی {city} میں فعال نہیں ہے۔',
  'customer.c04.citiesLoadError': 'شہروں کی فہرست لوڈ نہیں ہو سکی۔',
  'customer.c04.welcome': 'کام کرو میں خوش آمدید!',
  'customer.c04.nameRequired': 'براہِ کرم اپنا نام لکھیں۔',
  'customer.c04.termsRequired': 'جاری رکھنے کے لیے شرائط سے اتفاق کریں۔',

  // C05 OTP Verification
  'customer.c05.modeLogin': 'لاگ اِن یا سائن اپ',
  'customer.c05.modeCurrentNumber': 'تصدیق کریں کہ یہ آپ ہیں (موجودہ نمبر)',
  'customer.c05.modeNewNumber': 'اپنے نئے نمبر کی تصدیق کریں',
  'customer.c05.modeDelete': 'اکاؤنٹ حذف کرنے کی تصدیق کریں',
  'customer.c05.codePrompt': '{number} پر بھیجا گیا کوڈ لکھیں',
  'customer.c05.codeSent': 'ہم نے {number} پر کوڈ بھیج دیا ہے۔',
  'customer.c05.resendTimer': 'آپ {s} سیکنڈ بعد دوبارہ بھیج سکتے ہیں',
  'customer.c05.verify': 'تصدیق کریں',
  'customer.c05.resendCode': 'کوڈ دوبارہ بھیجیں',
  'customer.c05.changeNumber': 'نمبر تبدیل کریں',
  'customer.c05.checking': 'کوڈ چیک ہو رہا ہے…',
  'customer.c05.wrongCode': 'یہ کوڈ درست نہیں۔ {n} کوششیں باقی ہیں۔',
  'customer.c05.codeExpired': 'اس کوڈ کی میعاد ختم ہو گئی۔ نیا کوڈ منگوائیں۔',
  'customer.c05.codeExhausted': 'بہت زیادہ غلط کوششیں۔ نیا کوڈ منگوائیں۔',

  // C06 Home
  'customer.c06.serviceLocation': 'سروس کی جگہ: {location} · تبدیل کریں',
  'customer.c06.changeLocation': 'تبدیل کریں',
  'customer.c06.whatDoYouNeed': 'آپ کو کیا کام ہے؟',
  'customer.c06.whatDoYouNeedSub': 'بتائیں کیا مسئلہ ہے — بول کر، دکھا کر یا لکھ کر',
  'customer.c06.searchPlaceholder': 'مسئلہ یا سروس تلاش کریں',
  'customer.c06.speak': 'بول کر بتائیں',
  'customer.c06.speakA11y': 'وائس اسسٹنٹ استعمال کریں',
  'customer.c06.categoriesHeader': 'زمرے',
  'customer.c06.popularServicesHeader': 'مقبول سروسز',
  'customer.c06.activeJobHeader': 'آپ کا موجودہ کام',
  'customer.c06.viewJob': 'دیکھیں',
  'customer.c06.inactiveCityMessage': 'کام کرو ابھی {city} میں فعال نہیں ہے۔ دوسرا شہر منتخب کریں۔',
  'customer.c06.emptyCategoriesMessage': 'یہاں ابھی کوئی سروس دستیاب نہیں۔',
  'customer.c06.guestBannerTitle': 'بطور مہمان دیکھ رہے ہیں',
  'customer.c06.guestBannerAction': 'مکمل رسائی کے لیے لاگ اِن کریں',

  // C07 Search
  'customer.c07.queryPlaceholder': 'مثلاً "اے سی ٹھنڈا نہیں کر رہا" یا کاریگر کا نام',
  'customer.c07.searchAction': 'تلاش کریں',
  'customer.c07.describeProblem': 'اپنا مسئلہ بتائیں',
  'customer.c07.searching': 'تلاش جاری ہے…',
  'customer.c07.recentSearches': 'حالیہ تلاش',
  'customer.c07.clearRecent': 'صاف کریں',

  // C08 Search Results
  'customer.c08.tabServices': 'سروسز',
  'customer.c08.tabProviders': 'کاریگر',
  'customer.c08.filters': 'فلٹر',
  'customer.c08.allCategories': 'تمام زمرے',
  'customer.c08.providerStats': '{rating} ({count}) · {jobs} کام مکمل',
  'customer.c08.noResults':
    'یہ نہیں ملا۔ دوسرے الفاظ آزمائیں، یا اپنا مسئلہ بتائیں، ہم درست سروس ڈھونڈ لیں گے۔',

  // C09 Category
  'customer.c09.featured': 'نمایاں سروسز',
  'customer.c09.subcategories': 'ذیلی زمرے',
  'customer.c09.notSure': 'یقین نہیں؟ اپنا مسئلہ بتائیں',
  'customer.c09.emptyCategory': 'اس زمرے کی کوئی سروس یہاں ابھی دستیاب نہیں۔',

  // C10 Service Detail
  'customer.c10.aboutService': 'اس سروس کے بارے میں',
  'customer.c10.visitCharge': 'وزٹ چارج: {amount}',
  'customer.c10.inspectionFee': 'معائنہ فیس: {amount} {deduction}',
  'customer.c10.deductedFromRepair': '(مرمت میں سے کٹے گی)',
  'customer.c10.notDeducted': '(نہیں کٹے گی)',
  'customer.c10.quoteNotice': 'کاریگر چیک کرنے کے بعد قیمت بتائے گا۔',
  'customer.c10.emergencyAvailable': 'ہنگامی سروس دستیاب ہے',
  'customer.c10.includedHeader': 'کیا شامل ہے',
  'customer.c10.notIncludedHeader': 'کیا شامل نہیں',
  'customer.c10.estimatedDuration': 'عموماً {duration} لگتے ہیں',
  'customer.c10.availabilityHours': 'دستیاب اوقات: {hours}',
  'customer.c10.materialsHeader': 'سامان',
  'customer.c10.materialsIncluded': 'سامان: شامل ہے',
  'customer.c10.materialsCustomerProvided': 'سامان: آپ دیں گے',
  'customer.c10.materialsChargedSeparately': 'سامان: الگ سے چارج ہوگا',
  'customer.c10.warranty': 'وارنٹی',
  'customer.c10.infoNeeded': 'براہِ کرم یہ معلومات تیار رکھیں: {list}',
  'customer.c10.cancellationPolicy': 'منسوخی کی پالیسی',
  'customer.c10.cancellationPolicyText': 'کاریگر کے نکلنے سے پہلے منسوخی بالکل مفت ہے۔',
  'customer.c10.reviewsHeader': 'ریویوز',
  'customer.c10.bookNow': 'ابھی بک کریں',
  'customer.c10.getPrice': 'قیمت معلوم کریں',
  'customer.c10.requestInspection': 'معائنے کے لیے بلائیں',
  'customer.c10.reportReview': 'رپورٹ کریں',
  'customer.c10.serviceUnavailable': 'یہ سروس یہاں ابھی دستیاب نہیں۔',

  // C11 Provider Profile
  'customer.c11.teamLeader': 'ٹیم لیڈر: {name} (تصدیق شدہ)',
  'customer.c11.verifiedBasic': 'بنیادی',
  'customer.c11.verifiedVerified': 'تصدیق شدہ',
  'customer.c11.verifiedBusiness': 'کاروبار تصدیق شدہ',
  'customer.c11.ratingSummary': '{count} ریٹنگز میں سے {rating}',
  'customer.c11.completedJobs': '{n} کام مکمل',
  'customer.c11.serviceArea': 'کام کا علاقہ: {areas}',
  'customer.c11.servicesHeader': 'سروسز',
  'customer.c11.teamSize': 'عموماً {n} افراد کی ٹیم کے ساتھ کام کرتا ہے',
  'customer.c11.noReviews': 'ابھی کوئی ریویو نہیں۔',
  'customer.c11.favoriteSave': 'پسندیدہ میں محفوظ کریں',
  'customer.c11.favoriteSaved': 'پسندیدہ میں محفوظ ہو گیا',
  'customer.c11.favoriteA11y': 'اس کاریگر کو پسندیدہ میں شامل کریں',
  'customer.c11.explainBadge': 'اس کا کیا مطلب ہے؟',
  'customer.c11.bookProvider': 'اس کاریگر کو بک کریں',
  'customer.c11.providerUnavailable': 'یہ کاریگر ابھی دستیاب نہیں۔',

  // C41 Language Selection
  'customer.c41.title': 'اپنی زبان منتخب کریں',
  'customer.c41.english': 'انگریزی (English)',
  'customer.c41.urdu': 'اردو',
  'customer.c41.englishDesc': 'بائیں سے دائیں',
  'customer.c41.urduDesc': 'دائیں سے بائیں',
  'customer.c41.englishA11y': 'انگریزی زبان منتخب کریں',
  'customer.c41.urduA11y': 'اردو زبان منتخب کریں',
  'customer.c41.saveSuccess': 'زبان تبدیل ہو گئی۔',
  'customer.c41.saveLocalOnly':
    'زبان اس فون پر تبدیل ہو گئی۔ ابھی آپ کے اکاؤنٹ میں محفوظ نہیں ہو سکی۔',
};
