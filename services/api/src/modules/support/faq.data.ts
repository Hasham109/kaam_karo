/**
 * Self-Help FAQ Knowledgebase (BP §40 L1; SUP-001).
 * Localized entries for Customers and Providers in English and Urdu.
 */
import type { FaqItemDto } from './support.types.js';

export const SEED_FAQ_ITEMS: readonly FaqItemDto[] = [
  // Customer FAQs
  {
    id: 'faq-cust-001',
    categoryCode: 'BOOKINGS',
    questionEn: 'How do I book a verified service provider?',
    questionUr: 'میں تصدیق شدہ کاریگر کو کیسے بک کروں؟',
    answerEn:
      'Search for your required service, compare available providers and their transparent ratings/prices, and select "Book Now" or request an inspection.',
    answerUr:
      'اپنی مطلوبہ سروس تلاش کریں، دستیاب کاریگروں کی ریٹنگز اور قیمتوں کا موازنہ کریں، اور "ابھی بک کریں" کا انتخاب کریں۔',
    audience: 'CUSTOMER',
  },
  {
    id: 'faq-cust-002',
    categoryCode: 'PAYMENTS',
    questionEn: 'When do I pay for the job?',
    questionUr: 'مجھے کام کی ادائیگی کب کرنی ہو گی؟',
    answerEn:
      'Customer payment is strictly required only after the job is completed and approved. You can pay digitally via payment link or cash to the provider.',
    answerUr:
      'ادائیگی صرف کام مکمل اور منظور ہونے کے بعد کی جاتی ہے۔ آپ ڈیجیٹل لنک یا کاریگر کو نقد رقم کے ذریعے ادائیگی کر سکتے ہیں۔',
    audience: 'CUSTOMER',
  },
  {
    id: 'faq-cust-003',
    categoryCode: 'SAFETY',
    questionEn: 'What should I do if an emergency or unsafe situation occurs?',
    questionUr: 'اگر کوئی ہنگامی یا غیر محفوظ صورتحال پیش آئے تو مجھے کیا کرنا چاہیے؟',
    answerEn:
      'Use the "Stop – Safety" action on your tracking screen immediately. The job will be paused and an urgent safety case will be flagged to our support team.',
    answerUr:
      'ٹریکنگ اسکرین پر فوری طور پر "حفاظتی اسٹاپ" دبائیں۔ کام روک دیا جائے گا اور ہماری ٹیم کو ہنگامی اطلاع چلی جائے گی۔',
    audience: 'CUSTOMER',
  },
  {
    id: 'faq-cust-004',
    categoryCode: 'DISPUTES',
    questionEn: 'How can I report poor service or an incorrect charge?',
    questionUr: 'میں خراب سروس یا غلط چارجز کی شکایت کیسے درج کروں؟',
    answerEn:
      'Open your booking details and tap "Report a Problem" (C29). Select the issue type, describe what went wrong, and attach evidence photos.',
    answerUr:
      'بکنگ کی تفصیلات کھولیں اور "مسئلہ رپورٹ کریں" دبائیں۔ مسئلے کی قسم منتخب کریں اور ضروری تصاویر منسلک کریں۔',
    audience: 'CUSTOMER',
  },

  // Provider FAQs
  {
    id: 'faq-prov-001',
    categoryCode: 'EARNINGS',
    questionEn: 'How does the platform commission work on cash jobs?',
    questionUr: 'نقد کاموں پر پلیٹ فارم کمیشن کیسے کام کرتا ہے؟',
    answerEn:
      'Platform commission (30%) is charged only on labour lines. When a customer pays in cash, the 30% commission is debited to your account balance.',
    answerUr:
      'پلیٹ فارم کمیشن (30%) صرف لیبر پر لاگو ہوتا ہے۔ جب گاہک نقد رقم ادا کرتا ہے تو کمیشن آپ کے کھاتے میں ڈیبٹ کر دیا جاتا ہے۔',
    audience: 'PROVIDER',
  },
  {
    id: 'faq-prov-002',
    categoryCode: 'COMMISSION_PAY',
    questionEn: 'How do I clear a negative balance owed to Kaam Karo?',
    questionUr: 'میں کمپنی کے واجب الادا بقایا جات کیسے ادا کروں؟',
    answerEn:
      'Go to your Earnings & Wallet screen (P15) and tap "Pay Company". Transfer the amount to the official account and submit your transaction ID.',
    answerUr:
      'اپنی والٹ اسکرین (P15) پر جائیں اور "کمپنی کو ادائیگی کریں" دبائیں۔ رقم منتقل کر کے ٹرانزیکشن آئی ڈی درج کریں۔',
    audience: 'PROVIDER',
  },
  {
    id: 'faq-prov-003',
    categoryCode: 'CREW',
    questionEn: 'Does bringing a team member increase the customer price?',
    questionUr: 'کیا ٹیم ممبر لانے سے گاہک کی قیمت میں اضافہ ہوتا ہے؟',
    answerEn:
      'No. The crew size informs the customer about workers on site, but never increases the approved service price or rate.',
    answerUr:
      'نہیں۔ کاریگروں کی تعداد صرف معلومات کے لیے ہوتی ہے، اس سے گاہک کی طے شدہ قیمت میں کوئی اضافہ نہیں ہوتا۔',
    audience: 'PROVIDER',
  },
  {
    id: 'faq-prov-004',
    categoryCode: 'SAFETY',
    questionEn: 'What should I do if a work site is unsafe or hazardous?',
    questionUr: 'اگر کام کی جگہ غیر محفوظ یا خطرناک ہو تو مجھے کیا کرنا چاہیے؟',
    answerEn:
      'You have the right to halt work using "Stop – Safety" in your active job screen. This opens an audited safety case with Operations.',
    answerUr:
      'آپ کو کام روکنے کا پورا حق ہے۔ ایکٹو جاب اسکرین پر "حفاظتی اسٹاپ" دبائیں جس سے سپورٹ ٹیم کو فوری کیس موصول ہو گا۔',
    audience: 'PROVIDER',
  },
];
