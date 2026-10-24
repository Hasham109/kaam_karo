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

  // Permission Pre-prompt Modal
  'customer.perm.prePromptTitle': 'Permission needed',
  'customer.perm.prePromptContinue': 'Continue',
  'customer.perm.prePromptNotNow': 'Not now',

  // C12 Request / Simple Form
  'customer.c12.title': 'Request details',
  'customer.c12.serviceLabel': 'Service',
  'customer.c12.providerLabel': 'Provider: {name}',
  'customer.c12.locationLabel': 'Where is the work?',
  'customer.c12.whenLabel': 'When do you need it?',
  'customer.c12.whenNow': 'Now',
  'customer.c12.whenToday': 'Today',
  'customer.c12.whenLater': 'Later',
  'customer.c12.descLabel': 'Describe the problem',
  'customer.c12.descPlaceholder': 'Tell the provider what needs to be fixed...',
  'customer.c12.privacyHint':
    "Don't include your phone number or address here. We share those only with the provider you choose.",
  'customer.c12.addPhoto': 'Add photos',
  'customer.c12.addAudio': 'Record audio note',
  'customer.c12.addVideo': 'Add short video',
  'customer.c12.attachmentsHeader': 'Attachments',
  'customer.c12.continue': 'Continue',
  'customer.c12.emptyError': 'Please add a short description, voice note, photo or video.',
  'customer.c12.locationRequired': 'Please confirm service location.',

  // C31 "What do you need?" Conversational Composer
  'customer.c31.title': 'What do you need?',
  'customer.c31.prompt': 'Speak, type or show us what needs fixing.',
  'customer.c31.typePlaceholder': 'Type here… (e.g. AC leaking water)',
  'customer.c31.recordAudio': 'Record voice note',
  'customer.c31.takePhoto': 'Take photo',
  'customer.c31.chooseGallery': 'Choose from gallery',
  'customer.c31.recordVideo': 'Record video',
  'customer.c31.simpleForm': 'Use the simple form',
  'customer.c31.interpreting': 'Understanding your request…',
  'customer.c31.likelyService': 'Looks like you need: {service}',
  'customer.c31.changeService': 'Change',
  'customer.c31.whenChip': 'When: {time}',
  'customer.c31.whereChip': 'Where: {location}',
  'customer.c31.next': 'Next',
  'customer.c31.notSaved': 'Not saved yet.',
  'customer.c31.removeAttachment': 'Remove',

  // C32 Audio Note Recorder
  'customer.c32.title': 'Record voice note',
  'customer.c32.hint': 'Tap record and explain the problem in your own words.',
  'customer.c32.recording': 'Recording…',
  'customer.c32.recordAction': 'Record',
  'customer.c32.pauseAction': 'Pause',
  'customer.c32.resumeAction': 'Resume',
  'customer.c32.stopAction': 'Stop',
  'customer.c32.playAction': 'Play',
  'customer.c32.deleteAction': 'Delete',
  'customer.c32.reRecordAction': 'Record again',
  'customer.c32.attachAction': 'Attach voice note',
  'customer.c32.timeLeft': '{mm}:{ss} left',
  'customer.c32.attachedSuccess': 'Voice note attached.',
  'customer.c32.maxReached': 'Maximum length reached. Recording stopped.',
  'customer.c32.fallbackText': 'Type your message instead',
  'customer.media.duration': '{title} ({seconds}s)',

  // C33 Problem Video Recorder
  'customer.c33.title': 'Problem video',
  'customer.c33.hint': 'Show the problem in a short video (up to 30s).',
  'customer.c33.recordAction': 'Record video',
  'customer.c33.stopAction': 'Stop recording',
  'customer.c33.playAction': 'Preview video',
  'customer.c33.deleteAction': 'Delete video',
  'customer.c33.attachAction': 'Attach video',
  'customer.c33.galleryFallback': 'Choose video from gallery',
  'customer.c33.attachedSuccess': 'Video attached.',
  'customer.c33.maxReached': 'Maximum video duration reached.',

  // C34 Request Summary Confirmation
  'customer.c34.title': 'Review request',
  'customer.c34.summaryHeader': 'Summary for the provider',
  'customer.c34.likelyServiceHeader': 'Likely service',
  'customer.c34.locationHeader': 'Where',
  'customer.c34.timeHeader': 'When',
  'customer.c34.attachmentsHeader': 'Attached media',
  'customer.c34.emergencyToggle': 'Urgent emergency service needed',
  'customer.c34.emergencyNotice': 'Providers respond faster for emergency jobs.',
  'customer.c34.findProviders': 'Find providers',
  'customer.c34.submitting': 'Finding the right providers near you…',
  'customer.c34.missingLocation': 'Please confirm where the work is.',
  'customer.c34.missingTime': 'Please choose when.',

  // C39 Location Confirmation
  'customer.c39.title': 'Confirm location',
  'customer.c39.cityPrompt': 'Service city: {city} · Change',
  'customer.c39.useCurrentLocation': 'Use current location',
  'customer.c39.detectedAddressHeader': 'Is this the right address?',
  'customer.c39.movePinHint': 'Move the pin to the exact place',
  'customer.c39.searchPlaceholder': 'Search a place or address in {city}',
  'customer.c39.savedAddressesHeader': 'Saved addresses',
  'customer.c39.manualEntryHeader': 'Type the address manually',
  'customer.c39.houseFlatPlaceholder': 'House / Flat / Floor number',
  'customer.c39.streetAreaPlaceholder': 'Street, Sector, or Landmark',
  'customer.c39.confirmAddress': 'Confirm address',
  'customer.c39.findingLocation': 'Finding your location…',
  'customer.c39.addressConfirmed': 'Address confirmed.',
  'customer.c39.manualFallbackNotice': 'GPS is optional. You can type your address directly.',
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

  // Permission Pre-prompt Modal
  'customer.perm.prePromptTitle': 'اجازت درکار ہے',
  'customer.perm.prePromptContinue': 'جاری رکھیں',
  'customer.perm.prePromptNotNow': 'ابھی نہیں',

  // C12 Request / Simple Form
  'customer.c12.title': 'درخواست کی تفصیلات',
  'customer.c12.serviceLabel': 'سروس',
  'customer.c12.providerLabel': 'کاریگر: {name}',
  'customer.c12.locationLabel': 'کام کہاں ہے؟',
  'customer.c12.whenLabel': 'کب چاہیے؟',
  'customer.c12.whenNow': 'ابھی',
  'customer.c12.whenToday': 'آج',
  'customer.c12.whenLater': 'بعد میں',
  'customer.c12.descLabel': 'مسئلہ بیان کریں',
  'customer.c12.descPlaceholder': 'کاریگر کو بتائیں کہ کیا مرمت کروانی ہے...',
  'customer.c12.privacyHint':
    'اپنا فون نمبر یا پتہ یہاں شامل نہ کریں۔ یہ ہم صرف آپ کے منتخب کردہ کاریگر کو دیتے ہیں۔',
  'customer.c12.addPhoto': 'تصاویر شامل کریں',
  'customer.c12.addAudio': 'آواز میں بتائیں',
  'customer.c12.addVideo': 'مختصر ویڈیو شامل کریں',
  'customer.c12.attachmentsHeader': 'منسلکات',
  'customer.c12.continue': 'جاری رکھیں',
  'customer.c12.emptyError': 'براہِ کرم مختصر وضاحت، آواز، تصویر یا ویڈیو میں سے کچھ شامل کریں۔',
  'customer.c12.locationRequired': 'براہِ کرم سروس کی جگہ کی تصدیق کریں۔',

  // C31 "What do you need?" Conversational Composer
  'customer.c31.title': 'آپ کو کیا کام ہے؟',
  'customer.c31.prompt': 'بول کر، لکھ کر یا دکھا کر بتائیں کہ کیا مرمت کروانی ہے۔',
  'customer.c31.typePlaceholder': 'یہاں لکھیں… (مثلاً اے سی سے پانی ٹپک رہا ہے)',
  'customer.c31.recordAudio': 'آواز ریکارڈ کریں',
  'customer.c31.takePhoto': 'تصویر کھینچیں',
  'customer.c31.chooseGallery': 'گیلری سے منتخب کریں',
  'customer.c31.recordVideo': 'ویڈیو بنائیں',
  'customer.c31.simpleForm': 'سادہ فارم استعمال کریں',
  'customer.c31.interpreting': 'آپ کی درخواست سمجھی جا رہی ہے…',
  'customer.c31.likelyService': 'لگتا ہے آپ کو یہ چاہیے: {service}',
  'customer.c31.changeService': 'تبدیل کریں',
  'customer.c31.whenChip': 'وقت: {time}',
  'customer.c31.whereChip': 'جگہ: {location}',
  'customer.c31.next': 'آگے',
  'customer.c31.notSaved': 'ابھی محفوظ نہیں ہوا۔',
  'customer.c31.removeAttachment': 'ہٹائیں',

  // C32 Audio Note Recorder
  'customer.c32.title': 'آواز کا نوٹ ریکارڈ کریں',
  'customer.c32.hint': 'ریکارڈ دبائیں اور اپنے الفاظ میں مسئلہ بتائیں۔',
  'customer.c32.recording': 'ریکارڈنگ جاری ہے…',
  'customer.c32.recordAction': 'ریکارڈ کریں',
  'customer.c32.pauseAction': 'روکیں',
  'customer.c32.resumeAction': 'جاری رکھیں',
  'customer.c32.stopAction': 'بند کریں',
  'customer.c32.playAction': 'سنیں',
  'customer.c32.deleteAction': 'حذف کریں',
  'customer.c32.reRecordAction': 'دوبارہ ریکارڈ کریں',
  'customer.c32.attachAction': 'آواز کا نوٹ منسلک کریں',
  'customer.c32.timeLeft': '{mm}:{ss} باقی',
  'customer.c32.attachedSuccess': 'آواز کا نوٹ منسلک ہو گیا۔',
  'customer.c32.maxReached': 'زیادہ سے زیادہ وقت پورا ہو گیا۔ ریکارڈنگ بند ہو گئی۔',
  'customer.c32.fallbackText': 'اس کے بجائے لکھ کر بتائیں',
  'customer.media.duration': '{title} ({seconds} سیکنڈ)',

  // C33 Problem Video Recorder
  'customer.c33.title': 'مسئلے کی ویڈیو',
  'customer.c33.hint': 'مختصر ویڈیو میں مسئلہ دکھائیں (زیادہ سے زیادہ 30 سیکنڈ)۔',
  'customer.c33.recordAction': 'ویڈیو بنائیں',
  'customer.c33.stopAction': 'ریکارڈنگ بند کریں',
  'customer.c33.playAction': 'ویڈیو دیکھیں',
  'customer.c33.deleteAction': 'حذف کریں',
  'customer.c33.attachAction': 'ویڈیو منسلک کریں',
  'customer.c33.galleryFallback': 'گیلری سے ویڈیو منتخب کریں',
  'customer.c33.attachedSuccess': 'ویڈیو منسلک ہو گئی۔',
  'customer.c33.maxReached': 'ویڈیو کا زیادہ سے زیادہ وقت پورا ہو گیا۔',

  // C34 Request Summary Confirmation
  'customer.c34.title': 'درخواست کا جائزہ',
  'customer.c34.summaryHeader': 'کاریگر کے لیے خلاصہ',
  'customer.c34.likelyServiceHeader': 'ممکنہ سروس',
  'customer.c34.locationHeader': 'کام کی جگہ',
  'customer.c34.timeHeader': 'وقت',
  'customer.c34.attachmentsHeader': 'منسلک فائلیں',
  'customer.c34.emergencyToggle': 'ہنگامی سروس درکار ہے',
  'customer.c34.emergencyNotice': 'ہنگامی کام کے لیے کاریگر جلدی جواب دیتے ہیں۔',
  'customer.c34.findProviders': 'کاریگر تلاش کریں',
  'customer.c34.submitting': 'آپ کے قریب درست کاریگر ڈھونڈے جا رہے ہیں…',
  'customer.c34.missingLocation': 'براہِ کرم کام کی جگہ کی تصدیق کریں۔',
  'customer.c34.missingTime': 'براہِ کرم وقت منتخب کریں۔',

  // C39 Location Confirmation
  'customer.c39.title': 'پتے کی تصدیق کریں',
  'customer.c39.cityPrompt': 'سروس کا شہر: {city} · تبدیل کریں',
  'customer.c39.useCurrentLocation': 'موجودہ لوکیشن استعمال کریں',
  'customer.c39.detectedAddressHeader': 'کیا یہ درست پتہ ہے؟',
  'customer.c39.movePinHint': 'پن کو صحیح جگہ پر لے جائیں',
  'customer.c39.searchPlaceholder': '{city} میں جگہ یا پتہ تلاش کریں',
  'customer.c39.savedAddressesHeader': 'محفوظ پتے',
  'customer.c39.manualEntryHeader': 'پتہ خود لکھیں',
  'customer.c39.houseFlatPlaceholder': 'مکان / فلیٹ / منزل کا نمبر',
  'customer.c39.streetAreaPlaceholder': 'گلی، سیکٹر، یا قریبی نشانی',
  'customer.c39.confirmAddress': 'پتے کی تصدیق کریں',
  'customer.c39.findingLocation': 'آپ کی لوکیشن معلوم کی جا رہی ہے…',
  'customer.c39.addressConfirmed': 'پتے کی تصدیق ہو گئی۔',
  'customer.c39.manualFallbackNotice': 'جی پی ایس اختیاری ہے۔ آپ اپنا پتہ خود بھی لکھ سکتے ہیں۔',
};
