/**
 * `common.*` — copy shared by the Customer and Partner apps (I18N-001, I18N-006; BP §37, §78).
 *
 * QA F-03 (docs/qa/T1.1-1.3-qa.md): customer.md §2.10 `G-*` / `B-*` and partner.md G1 `G1-*`
 * had two catalogues with different words for the same meaning. They are unified here; the
 * source code of each entry is in its comment. Where both specs said the same thing differently,
 * the version that tells the user what to do next was kept (A11Y-005, BP §38, §31.1).
 * Urdu: A14 review of the A11/A12 drafts; "کام کرو" is the one Urdu brand rendering (QA F-02).
 * A native-speaker read-through is still pending (handoff T-1.4).
 *
 * Parity rule: COMMON_UR is typed from COMMON_EN, so a missing or extra Urdu key is a compile
 * error (I18N-001).
 */
export const COMMON_EN = {
  // States and network (customer §2.2 / partner G1; REL-001…007, A11Y-007)
  'common.state.loading': 'Loading…', // G-LOADING = G1-loading
  'common.state.sending': 'Sending…', // G-SENDING
  'common.net.offline':
    "You're offline. Showing what was loaded before. It will update when you're back online.", // G-OFFLINE + G1-offline
  'common.net.offlineAction': 'Connect to the internet to do this.', // G1-offline-action
  'common.net.stale': "Couldn't refresh. Showing details from {time}.", // G-STALE
  'common.net.lastUpdated': 'Last updated {time}', // G1-last-updated
  'common.net.error': "Couldn't connect. Check your internet and try again.", // G-NET
  'common.net.timeout': 'This is taking too long. Check your internet and try again.', // G-TIMEOUT + G1-timeout
  'common.error.server': 'Something went wrong on our side. Please try again in a moment.', // G-SERVER + G1-generic-error
  'common.write.pending': "We're checking whether this went through. Please don't tap again.", // G-PENDING + G1-pending
  'common.write.notDone': "It didn't go through. Nothing was changed. You can try again.", // G-NOT-DONE
  'common.write.changed': "This has changed in the meantime. We've loaded the latest details.", // G-CHANGED
  // Error codes (partner G6 table; SEC-AUTH-002, SEC-BASE-003/005/006)
  'common.error.session': 'Please log in again.', // partner 401
  'common.error.forbidden': "You can't do this. Please go back or contact support.", // partner 403 (+ next step, A11Y-005)
  'common.error.validation': 'Please check the highlighted fields.', // partner 422
  'common.error.rateLimit': 'Too many tries. Please wait a little and try again.', // G-RATE + partner 429
  // Buttons (customer B-*, partner G1-retry / G2-open-settings)
  'common.action.retry': 'Try again', // B-RETRY = G1-retry
  'common.action.checkAgain': 'Check again', // B-CHECK
  'common.action.cancel': 'Cancel', // B-CANCEL
  'common.action.confirm': 'Confirm', // B-CONFIRM
  'common.action.continue': 'Continue', // B-CONTINUE
  'common.action.notNow': 'Not now', // B-NOTNOW
  'common.action.openSettings': 'Open settings', // B-SETTINGS + G2-open-settings
  'common.action.back': 'Back', // B-BACK
  'common.action.save': 'Save', // B-SAVE
  'common.action.close': 'Close', // B-CLOSE
  'common.action.help': 'Get help', // B-HELP
  // Language switch (I18N-002; C41 / P21: each option is shown in its own language)
  'common.language.toggle': 'اردو',
  'common.language.toggleA11y': 'Change the language to Urdu',
  // Accessibility (A11Y-003: status is always read out as text)
  'common.a11y.status': 'Status: {status}',
  // Money (I18N-007; OQ-079 switch `urduCurrency: 'word-after'`)
  'common.money.rupeesWord': 'rupees',
  // Dates (I18N-007; Pakistan time). Month 1 = January, weekday 0 = Sunday.
  'common.date.month.1': 'January',
  'common.date.month.2': 'February',
  'common.date.month.3': 'March',
  'common.date.month.4': 'April',
  'common.date.month.5': 'May',
  'common.date.month.6': 'June',
  'common.date.month.7': 'July',
  'common.date.month.8': 'August',
  'common.date.month.9': 'September',
  'common.date.month.10': 'October',
  'common.date.month.11': 'November',
  'common.date.month.12': 'December',
  'common.date.monthShort.1': 'Jan',
  'common.date.monthShort.2': 'Feb',
  'common.date.monthShort.3': 'Mar',
  'common.date.monthShort.4': 'Apr',
  'common.date.monthShort.5': 'May',
  'common.date.monthShort.6': 'Jun',
  'common.date.monthShort.7': 'Jul',
  'common.date.monthShort.8': 'Aug',
  'common.date.monthShort.9': 'Sep',
  'common.date.monthShort.10': 'Oct',
  'common.date.monthShort.11': 'Nov',
  'common.date.monthShort.12': 'Dec',
  'common.date.weekday.0': 'Sunday',
  'common.date.weekday.1': 'Monday',
  'common.date.weekday.2': 'Tuesday',
  'common.date.weekday.3': 'Wednesday',
  'common.date.weekday.4': 'Thursday',
  'common.date.weekday.5': 'Friday',
  'common.date.weekday.6': 'Saturday',
  'common.date.medium': '{day} {month} {year}',
  'common.date.long': '{weekday}, {day} {month} {year}',
  'common.datetime': '{date}, {time}',
  // Clock time: 12-hour clock; the period word depends on the hour (datetime.ts DAY_PERIODS).
  'common.time.clock': '{time} {period}',
  'common.time.period.lateNight': 'AM',
  'common.time.period.morning': 'AM',
  'common.time.period.afternoon': 'PM',
  'common.time.period.evening': 'PM',
  'common.time.period.night': 'PM',
  // Relative time (plural forms: .one / .other, CLDR rules for en and ur)
  'common.time.justNow': 'just now',
  'common.time.inAMoment': 'in a moment',
  'common.time.yesterday': 'yesterday',
  'common.time.tomorrow': 'tomorrow',
  'common.time.minutesAgo.one': '{count} minute ago',
  'common.time.minutesAgo.other': '{count} minutes ago',
  'common.time.hoursAgo.one': '{count} hour ago',
  'common.time.hoursAgo.other': '{count} hours ago',
  'common.time.daysAgo.one': '{count} day ago',
  'common.time.daysAgo.other': '{count} days ago',
  'common.time.inMinutes.one': 'in {count} minute',
  'common.time.inMinutes.other': 'in {count} minutes',
  'common.time.inHours.one': 'in {count} hour',
  'common.time.inHours.other': 'in {count} hours',
  'common.time.inDays.one': 'in {count} day',
  'common.time.inDays.other': 'in {count} days',
} as const satisfies Readonly<Record<`common.${string}`, string>>;

export const COMMON_UR: Readonly<Record<keyof typeof COMMON_EN, string>> = {
  'common.state.loading': 'لوڈ ہو رہا ہے…',
  'common.state.sending': 'بھیجا جا رہا ہے…',
  'common.net.offline':
    'آپ آف لائن ہیں۔ پہلے سے لوڈ شدہ معلومات دکھائی جا رہی ہیں۔ انٹرنیٹ واپس آنے پر یہ اپ ڈیٹ ہو جائیں گی۔',
  'common.net.offlineAction': 'یہ کام کرنے کے لیے انٹرنیٹ سے جڑیں۔',
  'common.net.stale': 'تازہ نہیں ہو سکا۔ {time} کی معلومات دکھائی جا رہی ہیں۔',
  'common.net.lastUpdated': 'آخری اپ ڈیٹ {time}',
  'common.net.error': 'رابطہ نہیں ہو سکا۔ اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔',
  'common.net.timeout': 'اس میں بہت دیر لگ رہی ہے۔ اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔',
  'common.error.server':
    'ہماری طرف سے کوئی مسئلہ ہو گیا۔ براہِ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔',
  'common.write.pending': 'ہم چیک کر رہے ہیں کہ یہ مکمل ہوا یا نہیں۔ براہِ کرم دوبارہ نہ دبائیں۔',
  'common.write.notDone': 'یہ مکمل نہیں ہوا۔ کچھ تبدیل نہیں ہوا۔ آپ دوبارہ کوشش کر سکتے ہیں۔',
  'common.write.changed': 'اس دوران تبدیلی ہو چکی ہے۔ ہم نے تازہ ترین تفصیلات دکھا دی ہیں۔',
  'common.error.session': 'براہِ کرم دوبارہ لاگ اِن کریں۔',
  'common.error.forbidden': 'آپ یہ نہیں کر سکتے۔ براہِ کرم واپس جائیں یا سپورٹ سے رابطہ کریں۔',
  'common.error.validation': 'براہِ کرم نشان زدہ خانے چیک کریں۔',
  'common.error.rateLimit': 'بہت زیادہ کوششیں ہو گئیں۔ تھوڑا انتظار کر کے دوبارہ کوشش کریں۔',
  'common.action.retry': 'دوبارہ کوشش کریں',
  'common.action.checkAgain': 'دوبارہ چیک کریں',
  'common.action.cancel': 'منسوخ کریں',
  'common.action.confirm': 'تصدیق کریں',
  'common.action.continue': 'جاری رکھیں',
  'common.action.notNow': 'ابھی نہیں',
  'common.action.openSettings': 'سیٹنگز کھولیں',
  'common.action.back': 'واپس',
  'common.action.save': 'محفوظ کریں',
  'common.action.close': 'بند کریں',
  'common.action.help': 'مدد حاصل کریں',
  'common.language.toggle': 'English',
  'common.language.toggleA11y': 'زبان انگریزی میں بدلیں',
  'common.a11y.status': 'اسٹیٹس: {status}',
  'common.money.rupeesWord': 'روپے',
  'common.date.month.1': 'جنوری',
  'common.date.month.2': 'فروری',
  'common.date.month.3': 'مارچ',
  'common.date.month.4': 'اپریل',
  'common.date.month.5': 'مئی',
  'common.date.month.6': 'جون',
  'common.date.month.7': 'جولائی',
  'common.date.month.8': 'اگست',
  'common.date.month.9': 'ستمبر',
  'common.date.month.10': 'اکتوبر',
  'common.date.month.11': 'نومبر',
  'common.date.month.12': 'دسمبر',
  'common.date.monthShort.1': 'جنوری',
  'common.date.monthShort.2': 'فروری',
  'common.date.monthShort.3': 'مارچ',
  'common.date.monthShort.4': 'اپریل',
  'common.date.monthShort.5': 'مئی',
  'common.date.monthShort.6': 'جون',
  'common.date.monthShort.7': 'جولائی',
  'common.date.monthShort.8': 'اگست',
  'common.date.monthShort.9': 'ستمبر',
  'common.date.monthShort.10': 'اکتوبر',
  'common.date.monthShort.11': 'نومبر',
  'common.date.monthShort.12': 'دسمبر',
  'common.date.weekday.0': 'اتوار',
  'common.date.weekday.1': 'پیر',
  'common.date.weekday.2': 'منگل',
  'common.date.weekday.3': 'بدھ',
  'common.date.weekday.4': 'جمعرات',
  'common.date.weekday.5': 'جمعہ',
  'common.date.weekday.6': 'ہفتہ',
  'common.date.medium': '{day} {month} {year}',
  'common.date.long': '{weekday}، {day} {month} {year}',
  'common.datetime': '{date}، {time}',
  'common.time.clock': '{period} {time}',
  'common.time.period.lateNight': 'رات',
  'common.time.period.morning': 'صبح',
  'common.time.period.afternoon': 'دوپہر',
  'common.time.period.evening': 'شام',
  'common.time.period.night': 'رات',
  'common.time.justNow': 'ابھی ابھی',
  'common.time.inAMoment': 'بس تھوڑی دیر میں',
  'common.time.yesterday': 'کل',
  'common.time.tomorrow': 'کل',
  'common.time.minutesAgo.one': '{count} منٹ پہلے',
  'common.time.minutesAgo.other': '{count} منٹ پہلے',
  'common.time.hoursAgo.one': '{count} گھنٹہ پہلے',
  'common.time.hoursAgo.other': '{count} گھنٹے پہلے',
  'common.time.daysAgo.one': '{count} دن پہلے',
  'common.time.daysAgo.other': '{count} دن پہلے',
  'common.time.inMinutes.one': '{count} منٹ میں',
  'common.time.inMinutes.other': '{count} منٹ میں',
  'common.time.inHours.one': '{count} گھنٹے میں',
  'common.time.inHours.other': '{count} گھنٹوں میں',
  'common.time.inDays.one': '{count} دن میں',
  'common.time.inDays.other': '{count} دن میں',
};
