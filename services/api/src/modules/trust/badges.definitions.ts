/**
 * Canonical platform candidate badges (BP §55.2, §66; TRUST-BADGE-001..014; D-010).
 * Source of truth for badge kinds, names, explanations, and metric descriptions.
 */

import type { BadgeDefinition } from './trust.types';

export const CANONICAL_BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  // Fact badges (evaluated dynamically from verified records or live status; read-only definition)
  {
    badgeType: 'VERIFIED',
    kind: 'FACT',
    nameEn: 'Verified',
    nameUr: 'تصدیق شدہ',
    descriptionEn: 'Identity and documents verified by Kaam Karo.',
    descriptionUr: 'کام کرو کی طرف سے شناختی کارڈ اور دستاویزات تصدیق شدہ ہیں۔',
    explanationEn:
      'Awarded when provider verification level is Verified, Business Verified, or Specialized Verified.',
    explanationUr: 'جب کاریگر کی تصدیق کا درجہ تصدیق شدہ یا کاروباری تصدیق ہو تو یہ بیج ملتا ہے۔',
    iconName: 'shield-check',
  },
  {
    badgeType: 'EMERGENCY_AVAILABLE',
    kind: 'FACT',
    nameEn: 'Emergency Available',
    nameUr: 'ہنگامی دستیابی',
    descriptionEn: 'Currently available for immediate emergency service dispatch.',
    descriptionUr: 'فوری ہنگامی کام کے لیے ابھی دستیاب ہیں۔',
    explanationEn:
      'Shown while the provider has active emergency availability enabled in their profile.',
    explanationUr: 'جب کاریگر کی پروفائل میں ہنگامی سروس کا آپشن آن ہو تو ظاہر ہوتا ہے۔',
    iconName: 'alert-decagram',
  },
  {
    badgeType: 'AVAILABLE_TODAY',
    kind: 'FACT',
    nameEn: 'Available Today',
    nameUr: 'آج دستیاب',
    descriptionEn: 'Has open schedule slots available today.',
    descriptionUr: 'آج کے دن کے لیے بکنگ کے اوقات دستیاب ہیں۔',
    explanationEn:
      'Shown when the provider has an open availability slot on the current calendar day.',
    explanationUr: 'جب کاریگر کے شیڈول میں آج کے دن کوئی سلاٹ دستیاب ہو تو ظاہر ہوتا ہے۔',
    iconName: 'calendar-today',
  },
  {
    badgeType: 'AVAILABLE_NOW',
    kind: 'FACT',
    nameEn: 'Available Now',
    nameUr: 'ابھی دستیاب',
    descriptionEn: 'Online and ready to take on requests right now.',
    descriptionUr: 'ابھی آن لائن اور فوری کام قبول کرنے کے لیے تیار ہیں۔',
    explanationEn:
      'Shown while status is Online/Available and the provider is under active job capacity.',
    explanationUr: 'جب کاریگر آن لائن ہو اور اس کے پاس مزید کام کی گنجائش ہو تو ظاہر ہوتا ہے۔',
    iconName: 'clock-check-outline',
  },

  // Rule badges (awarded based on measurable facts and configured rules; while rule is null, nobody gets it)
  {
    badgeType: 'HIGHLY_RATED',
    kind: 'RULE',
    nameEn: 'Highly Rated',
    nameUr: 'اعلیٰ ریٹنگ',
    descriptionEn: 'Consistently maintains high ratings from satisfied customers.',
    descriptionUr: 'گاہکوں کی طرف سے مستقل اعلیٰ ریٹنگ حاصل کی ہے۔',
    explanationEn:
      'Awarded to providers maintaining a public average rating of at least 4.8 from at least 20 visible reviews.',
    explanationUr:
      'کم از کم 20 ریویوز سے 4.8 یا اس سے زیادہ اوسط ریٹنگ رکھنے والے کاریگروں کو دیا جاتا ہے۔',
    iconName: 'star-circle',
  },
  {
    badgeType: 'EXPERIENCED',
    kind: 'RULE',
    nameEn: 'Experienced',
    nameUr: 'تجربہ کار',
    descriptionEn: 'Successfully completed a high volume of jobs on the platform.',
    descriptionUr: 'پلیٹ فارم پر بڑی تعداد میں کام کامیابی سے مکمل کیے۔',
    explanationEn:
      'Awarded to providers who have completed at least 50 verified jobs on the platform.',
    explanationUr: 'پلیٹ فارم پر کم از کم 50 تصدیق شدہ کام مکمل کرنے والے کاریگروں کو دیا جاتا ہے۔',
    iconName: 'briefcase-check',
  },
  {
    badgeType: 'CUSTOMER_FAVORITE',
    kind: 'RULE',
    nameEn: 'Customer Favorite',
    nameUr: 'پسندیدہ کاریگر',
    descriptionEn: 'Frequently saved and rebooked by customers across the community.',
    descriptionUr: 'گاہکوں کی طرف سے کثرت سے پسندیدہ منتخب اور دوبارہ بک کیا گیا۔',
    explanationEn:
      'Platform award based on community favorites volume and job track record (distinct from individual customer favorite action).',
    explanationUr:
      'کمیونٹی کی طرف سے کثرت سے پسندیدہ فہرست میں شامل کیے جانے پر پلیٹ فارم کی طرف سے دیا جانے والا بیج۔',
    iconName: 'heart-circle',
  },
  {
    badgeType: 'FAST_RESPONSE',
    kind: 'RULE',
    nameEn: 'Fast Response',
    nameUr: 'تیز جواب دہندہ',
    descriptionEn: 'Responds to customer requests and quotes quickly.',
    descriptionUr: 'گاہکوں کی درخواستوں اور کوٹس پر تیزی سے جواب دیتے ہیں۔',
    explanationEn:
      'Awarded to providers with an average response time of 5 minutes or less on incoming requests.',
    explanationUr:
      'درخواستوں پر اوسطاً 5 منٹ یا اس سے کم وقت میں جواب دینے والے کاریگروں کو دیا جاتا ہے۔',
    iconName: 'lightning-bolt',
  },
  {
    badgeType: 'FAST_SERVICE',
    kind: 'RULE',
    nameEn: 'Fast Service',
    nameUr: 'تیز سروس',
    descriptionEn: 'Consistently completes jobs on time within expected duration.',
    descriptionUr: 'مقررہ وقت کے اندر معیاری کام مکمل کرتے ہیں۔',
    explanationEn:
      'Awarded to providers arriving within scheduled window on at least 95% of bookings.',
    explanationUr:
      '95 فیصد یا اس سے زائد بکنگز پر مقررہ وقت کے اندر پہنچنے والے کاریگروں کو دیا جاتا ہے۔',
    iconName: 'timer-check-outline',
  },
  {
    badgeType: 'RELIABLE',
    kind: 'RULE',
    nameEn: 'Reliable',
    nameUr: 'قابل اعتماد',
    descriptionEn: 'Zero unexcused cancellations or no-shows.',
    descriptionUr: 'بغیر وجہ منسوخی یا غیر حاضری کے بغیر قابل اعتماد سروس۔',
    explanationEn:
      'Awarded to providers with zero unexcused cancellations or no-shows in the last 90 days.',
    explanationUr:
      'گزشتہ 90 دنوں میں بغیر عذر کسی منسوخی یا غیر حاضری کے بغیر کام کرنے والے کاریگروں کا بیج۔',
    iconName: 'check-decagram',
  },
  {
    badgeType: 'REPEAT_CUSTOMER_FAVORITE',
    kind: 'RULE',
    nameEn: 'Repeat Customer Favorite',
    nameUr: 'بار بار منتخب',
    descriptionEn: 'High rate of repeat re-hires by previous customers.',
    descriptionUr: 'سابقہ گاہک بار بار انہی سے کام کروانا پسند کرتے ہیں۔',
    explanationEn: 'Awarded when repeat customer re-hire rate is at least 25%.',
    explanationUr: 'جب سابقہ گاہکوں کی طرف سے دوبارہ بلانے کی شرح کم از کم 25 فیصد ہو۔',
    iconName: 'account-multiple-check',
  },
  {
    badgeType: 'TOP_SPECIALIST',
    kind: 'RULE',
    nameEn: 'Top Specialist',
    nameUr: 'ماہر کاریگر',
    descriptionEn: 'Top-tier completed job volume and expertise in this service.',
    descriptionUr: 'اس مخصوص سروس میں نمایاں تجربہ اور سب سے زیادہ کام۔',
    explanationEn:
      'Awarded per service to providers in the top 10th percentile of completed volume.',
    explanationUr:
      'کسی سروس میں سب سے زیادہ کام کرنے والے چوٹی کے 10 فیصد کاریگروں کو دیا جاتا ہے۔',
    iconName: 'medal-outline',
  },
  {
    badgeType: 'RECENTLY_JOINED',
    kind: 'RULE',
    nameEn: 'Recently Joined',
    nameUr: 'نیا شامل شدہ',
    descriptionEn: 'New verified professional recently welcomed to Kaam Karo.',
    descriptionUr: 'کام کرو پر حال ہی میں تصدیق شدہ نئے ماہر کاریگر۔',
    explanationEn: 'Awarded during the first 30 days after registration and verification approval.',
    explanationUr:
      'رجسٹریشن اور تصدیق کی منظوری کے بعد پہلے 30 دنوں کے لیے دیا جانے والا تعارفی بیج۔',
    iconName: 'account-plus',
  },
  {
    badgeType: 'LARGE_TEAM',
    kind: 'RULE',
    nameEn: 'Large Team',
    nameUr: 'بڑی ٹیم / کمپنی',
    descriptionEn: 'Operates with verified multi-worker crew capacity.',
    descriptionUr: 'مصدقہ ٹیم اور عملے کے ساتھ بڑے کام کرنے کی صلاحیت۔',
    explanationEn:
      'Awarded to contractors with verified crew capacity of at least 3 workers or Business Verified standing.',
    explanationUr: 'کم از کم 3 افراد کی ٹیم رکھنے والے یا کاروباری تصدیق شدہ کنٹریکٹرز کا بیج۔',
    iconName: 'account-group',
  },
];
