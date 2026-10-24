/**
 * BP §63 catalog seed data (T2.6, owner A03). One line per BP §63 item, in BP order.
 * SCOPE-CAT-001 (BP §1.4, §63, §65): exactly the BP §63 tree; nothing else, no excluded area.
 * SCOPE-CAT-002 (BP §6, §64; D-024): every service is seeded without any activation of its own;
 *   the 10 BP §6 / D-024 day-one families are flagged `launchFamily` and are activated for Lahore
 *   only (cities.data.ts / run.ts). Every other family stays inactive.
 * CAT-SVC-012 (BP §64): a family is a category, an item is a service (customer task).
 * Counting rule: an item listed under two families in BP §63 (e.g. "Water tank cleaning" in
 *   Plumbing & Water and in Cleaning & Hygiene) is seeded once per family, exactly as BP lists it,
 *   so the seed count equals the BP §63 item count (351). Codes are unique per family.
 * Urdu names (I18N-006, BP §78): written by A03, to be reviewed by A14 (RQ in REQUESTS.md).
 * Drift guard: __tests__/catalog-seed.spec.ts parses docs/BLUEPRINT.md §63 and compares every line.
 * Pure data (no imports) so it runs under Node type stripping and in Vitest.
 */

export interface SeedService {
  /** Exact BP §63 item text; also the English name. */
  readonly en: string;
  /** Urdu name (BP §78; I18N-006). */
  readonly ur: string;
}

export interface SeedFamily {
  /** Stable category code (BP §63, §64; SCOPE-CAT-001). */
  readonly code: string;
  /** Exact BP §63 heading; also the English name. */
  readonly en: string;
  readonly ur: string;
  /** BP §6 launch candidate = D-024 day-one family in Lahore (SCOPE-CAT-002). */
  readonly launchFamily: boolean;
  readonly services: readonly SeedService[];
}

// One line per BP §63 item, each with its family comment: keep Prettier off this array.
// prettier-ignore
export const CATALOG_FAMILIES: readonly SeedFamily[] = [
  {
    // BP §63 family: Plumbing & Water  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'plumbing_water',
    en: 'Plumbing & Water',
    ur: 'پلمبنگ اور پانی',
    launchFamily: true,
    services: [
      { en: 'Tap repair', ur: 'نل کی مرمت' }, // §63 Plumbing & Water
      { en: 'Tap replacement', ur: 'نل کی تبدیلی' }, // §63 Plumbing & Water
      { en: 'Pipe leakage repair', ur: 'پائپ لیکیج کی مرمت' }, // §63 Plumbing & Water
      { en: 'Water leakage detection', ur: 'پانی کی لیکیج کی تلاش' }, // §63 Plumbing & Water
      { en: 'Drain blockage', ur: 'بند نالی کھولنا' }, // §63 Plumbing & Water
      { en: 'Kitchen sink repair', ur: 'کچن سنک کی مرمت' }, // §63 Plumbing & Water
      { en: 'Bathroom sink repair', ur: 'باتھ روم سنک کی مرمت' }, // §63 Plumbing & Water
      { en: 'Toilet repair', ur: 'ٹوائلٹ کی مرمت' }, // §63 Plumbing & Water
      { en: 'Flush repair', ur: 'فلش کی مرمت' }, // §63 Plumbing & Water
      { en: 'Water tank cleaning', ur: 'پانی کی ٹنکی کی صفائی' }, // §63 Plumbing & Water
      { en: 'Water tank installation', ur: 'پانی کی ٹنکی کی تنصیب' }, // §63 Plumbing & Water
      { en: 'Water pump repair', ur: 'واٹر پمپ کی مرمت' }, // §63 Plumbing & Water
      { en: 'Booster pump installation', ur: 'بوسٹر پمپ کی تنصیب' }, // §63 Plumbing & Water
      { en: 'Pressure issue diagnosis', ur: 'پانی کے پریشر کے مسئلے کی جانچ' }, // §63 Plumbing & Water
      { en: 'Shower installation', ur: 'شاور کی تنصیب' }, // §63 Plumbing & Water
      { en: 'Mixer installation', ur: 'مکسر کی تنصیب' }, // §63 Plumbing & Water
      { en: 'Bidet spray installation', ur: 'مسلم شاور کی تنصیب' }, // §63 Plumbing & Water
      { en: 'Water heater plumbing', ur: 'واٹر ہیٹر کی پلمبنگ' }, // §63 Plumbing & Water
      { en: 'Gas/water line plumbing where legally allowed', ur: 'گیس/پانی کی لائن کی پلمبنگ (جہاں قانوناً اجازت ہو)' }, // §63 Plumbing & Water
      { en: 'Sewer line inspection', ur: 'سیوریج لائن کا معائنہ' }, // §63 Plumbing & Water
      { en: 'Drain cleaning', ur: 'نالی کی صفائی' }, // §63 Plumbing & Water
      { en: 'Emergency plumber', ur: 'ایمرجنسی پلمبر' }, // §63 Plumbing & Water
    ],
  },
  {
    // BP §63 family: Electrical & Power  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'electrical_power',
    en: 'Electrical & Power',
    ur: 'بجلی اور پاور',
    launchFamily: true,
    services: [
      { en: 'Switch replacement', ur: 'سوئچ کی تبدیلی' }, // §63 Electrical & Power
      { en: 'Socket replacement', ur: 'ساکٹ کی تبدیلی' }, // §63 Electrical & Power
      { en: 'Light fitting', ur: 'لائٹ کی فٹنگ' }, // §63 Electrical & Power
      { en: 'LED installation', ur: 'ایل ای ڈی لائٹ کی تنصیب' }, // §63 Electrical & Power
      { en: 'Ceiling fan installation', ur: 'چھت کے پنکھے کی تنصیب' }, // §63 Electrical & Power
      { en: 'Fan repair', ur: 'پنکھے کی مرمت' }, // §63 Electrical & Power
      { en: 'Exhaust fan installation', ur: 'ایگزاسٹ فین کی تنصیب' }, // §63 Electrical & Power
      { en: 'Breaker replacement', ur: 'بریکر کی تبدیلی' }, // §63 Electrical & Power
      { en: 'MCB troubleshooting', ur: 'ایم سی بی کے مسئلے کا حل' }, // §63 Electrical & Power
      { en: 'Fuse issue', ur: 'فیوز کا مسئلہ' }, // §63 Electrical & Power
      { en: 'Wiring repair', ur: 'وائرنگ کی مرمت' }, // §63 Electrical & Power
      { en: 'Partial rewiring', ur: 'جزوی نئی وائرنگ' }, // §63 Electrical & Power
      { en: 'Short-circuit diagnosis', ur: 'شارٹ سرکٹ کی جانچ' }, // §63 Electrical & Power
      { en: 'Power trip diagnosis', ur: 'بجلی ٹرپ ہونے کی جانچ' }, // §63 Electrical & Power
      { en: 'Earthing check', ur: 'ارتھنگ کی جانچ' }, // §63 Electrical & Power
      { en: 'Doorbell installation', ur: 'ڈور بیل کی تنصیب' }, // §63 Electrical & Power
      { en: 'Dimmer installation', ur: 'ڈمر کی تنصیب' }, // §63 Electrical & Power
      { en: 'Chandelier installation', ur: 'فانوس کی تنصیب' }, // §63 Electrical & Power
      { en: 'Emergency electrician', ur: 'ایمرجنسی الیکٹریشن' }, // §63 Electrical & Power
      { en: 'UPS wiring', ur: 'یو پی ایس وائرنگ' }, // §63 Electrical & Power
      { en: 'Inverter wiring', ur: 'انورٹر وائرنگ' }, // §63 Electrical & Power
      { en: 'Generator connection support where permitted', ur: 'جنریٹر کنکشن میں مدد (جہاں اجازت ہو)' }, // §63 Electrical & Power
    ],
  },
  {
    // BP §63 family: AC, Cooling & Heating  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'ac_cooling_heating',
    en: 'AC, Cooling & Heating',
    ur: 'اے سی، کولنگ اور ہیٹنگ',
    launchFamily: true,
    services: [
      { en: 'AC general service', ur: 'اے سی جنرل سروس' }, // §63 AC, Cooling & Heating
      { en: 'AC deep cleaning', ur: 'اے سی کی گہری صفائی' }, // §63 AC, Cooling & Heating
      { en: 'AC installation', ur: 'اے سی کی تنصیب' }, // §63 AC, Cooling & Heating
      { en: 'AC removal', ur: 'اے سی اتارنا' }, // §63 AC, Cooling & Heating
      { en: 'AC relocation', ur: 'اے سی کی منتقلی' }, // §63 AC, Cooling & Heating
      { en: 'AC gas/refrigerant service', ur: 'اے سی گیس/ریفریجرنٹ سروس' }, // §63 AC, Cooling & Heating
      { en: 'AC leakage diagnosis', ur: 'اے سی لیکیج کی جانچ' }, // §63 AC, Cooling & Heating
      { en: 'AC drain cleaning', ur: 'اے سی ڈرین کی صفائی' }, // §63 AC, Cooling & Heating
      { en: 'AC water dripping repair', ur: 'اے سی سے پانی ٹپکنے کی مرمت' }, // §63 AC, Cooling & Heating
      { en: 'AC cooling issue diagnosis', ur: 'اے سی کولنگ کے مسئلے کی جانچ' }, // §63 AC, Cooling & Heating
      { en: 'AC electrical fault diagnosis', ur: 'اے سی کے بجلی کے نقص کی جانچ' }, // §63 AC, Cooling & Heating
      { en: 'AC PCB diagnosis', ur: 'اے سی پی سی بی کی جانچ' }, // §63 AC, Cooling & Heating
      { en: 'AC compressor diagnosis', ur: 'اے سی کمپریسر کی جانچ' }, // §63 AC, Cooling & Heating
      { en: 'Thermostat issue', ur: 'تھرموسٹیٹ کا مسئلہ' }, // §63 AC, Cooling & Heating
      { en: 'Outdoor unit cleaning', ur: 'آؤٹ ڈور یونٹ کی صفائی' }, // §63 AC, Cooling & Heating
      { en: 'Indoor unit cleaning', ur: 'اِن ڈور یونٹ کی صفائی' }, // §63 AC, Cooling & Heating
      { en: 'Window AC service', ur: 'ونڈو اے سی سروس' }, // §63 AC, Cooling & Heating
      { en: 'Inverter AC service', ur: 'انورٹر اے سی سروس' }, // §63 AC, Cooling & Heating
      { en: 'Cooler service', ur: 'کولر سروس' }, // §63 AC, Cooling & Heating
      { en: 'Heater service', ur: 'ہیٹر سروس' }, // §63 AC, Cooling & Heating
      { en: 'Emergency AC visit', ur: 'ایمرجنسی اے سی وزٹ' }, // §63 AC, Cooling & Heating
    ],
  },
  {
    // BP §63 family: Home Appliances  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'home_appliances',
    en: 'Home Appliances',
    ur: 'گھریلو آلات',
    launchFamily: true,
    services: [
      { en: 'Refrigerator inspection', ur: 'فریج کا معائنہ' }, // §63 Home Appliances
      { en: 'Refrigerator repair', ur: 'فریج کی مرمت' }, // §63 Home Appliances
      { en: 'Freezer repair', ur: 'فریزر کی مرمت' }, // §63 Home Appliances
      { en: 'Washing machine repair', ur: 'واشنگ مشین کی مرمت' }, // §63 Home Appliances
      { en: 'Dryer repair', ur: 'ڈرائر کی مرمت' }, // §63 Home Appliances
      { en: 'Dishwasher repair', ur: 'ڈش واشر کی مرمت' }, // §63 Home Appliances
      { en: 'Microwave repair', ur: 'مائیکروویو کی مرمت' }, // §63 Home Appliances
      { en: 'Oven repair', ur: 'اوون کی مرمت' }, // §63 Home Appliances
      { en: 'Cooking range repair', ur: 'کوکنگ رینج کی مرمت' }, // §63 Home Appliances
      { en: 'Stove/cooker repair', ur: 'چولہے/کوکر کی مرمت' }, // §63 Home Appliances
      { en: 'Water dispenser repair', ur: 'واٹر ڈسپنسر کی مرمت' }, // §63 Home Appliances
      { en: 'Water purifier service', ur: 'واٹر فلٹر (پیوریفائر) سروس' }, // §63 Home Appliances
      { en: 'Electric geyser repair', ur: 'بجلی کے گیزر کی مرمت' }, // §63 Home Appliances
      { en: 'Gas geyser service', ur: 'گیس گیزر سروس' }, // §63 Home Appliances
      { en: 'Juicer/blender repair', ur: 'جوسر/بلینڈر کی مرمت' }, // §63 Home Appliances
      { en: 'Iron repair', ur: 'استری کی مرمت' }, // §63 Home Appliances
      { en: 'Small appliance diagnosis', ur: 'چھوٹے آلات کی جانچ' }, // §63 Home Appliances
      { en: 'Appliance installation', ur: 'آلات کی تنصیب' }, // §63 Home Appliances
      { en: 'Appliance relocation', ur: 'آلات کی منتقلی' }, // §63 Home Appliances
      { en: 'Appliance cleaning', ur: 'آلات کی صفائی' }, // §63 Home Appliances
    ],
  },
  {
    // BP §63 family: Internet, Wi-Fi & Networking  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'internet_wifi_networking',
    en: 'Internet, Wi-Fi & Networking',
    ur: 'انٹرنیٹ، وائی فائی اور نیٹ ورکنگ',
    launchFamily: true,
    services: [
      { en: 'New router setup', ur: 'نئے راؤٹر کا سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Router configuration', ur: 'راؤٹر کنفیگریشن' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Wi-Fi troubleshooting', ur: 'وائی فائی کے مسائل کا حل' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Weak Wi-Fi diagnosis', ur: 'کمزور وائی فائی کی جانچ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Mesh Wi-Fi installation', ur: 'میش وائی فائی کی تنصیب' }, // §63 Internet, Wi-Fi & Networking
      { en: 'LAN cable installation', ur: 'لین کیبل کی تنصیب' }, // §63 Internet, Wi-Fi & Networking
      { en: 'LAN port repair', ur: 'لین پورٹ کی مرمت' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Home network setup', ur: 'گھر کے نیٹ ورک کا سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Office network setup', ur: 'دفتر کے نیٹ ورک کا سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Internet speed troubleshooting', ur: 'انٹرنیٹ اسپیڈ کے مسائل کا حل' }, // §63 Internet, Wi-Fi & Networking
      { en: 'ISP connection assistance', ur: 'انٹرنیٹ کمپنی (آئی ایس پی) کنکشن میں مدد' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Modem replacement setup', ur: 'موڈیم کی تبدیلی اور سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Repeater/extender setup', ur: 'ریپیٹر/ایکسٹینڈر سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Printer network setup', ur: 'پرنٹر نیٹ ورک سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Smart device network setup', ur: 'اسمارٹ ڈیوائس نیٹ ورک سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Parental-control setup', ur: 'پیرنٹل کنٹرول سیٹ اپ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Network security/basic hardening', ur: 'نیٹ ورک سیکیورٹی/بنیادی حفاظت' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Cabling tidy-up', ur: 'کیبلز کی ترتیب' }, // §63 Internet, Wi-Fi & Networking
      { en: 'Network testing', ur: 'نیٹ ورک ٹیسٹنگ' }, // §63 Internet, Wi-Fi & Networking
      { en: 'On-site IT support', ur: 'موقع پر آئی ٹی سپورٹ' }, // §63 Internet, Wi-Fi & Networking
    ],
  },
  {
    // BP §63 family: TV, Satellite & Home Entertainment  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'tv_satellite_entertainment',
    en: 'TV, Satellite & Home Entertainment',
    ur: 'ٹی وی، سیٹلائٹ اور ہوم انٹرٹینمنٹ',
    launchFamily: true,
    services: [
      { en: 'TV installation', ur: 'ٹی وی کی تنصیب' }, // §63 TV, Satellite & Home Entertainment
      { en: 'TV wall mounting', ur: 'ٹی وی دیوار پر لگانا' }, // §63 TV, Satellite & Home Entertainment
      { en: 'TV unmounting', ur: 'ٹی وی دیوار سے اتارنا' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Smart TV setup', ur: 'اسمارٹ ٹی وی سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Streaming device setup', ur: 'اسٹریمنگ ڈیوائس سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Android box setup', ur: 'اینڈرائیڈ باکس سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Soundbar setup', ur: 'ساؤنڈ بار سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Home theater setup', ur: 'ہوم تھیٹر سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Speaker installation', ur: 'اسپیکر کی تنصیب' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Cable troubleshooting', ur: 'کیبل کے مسائل کا حل' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Satellite dish alignment', ur: 'ڈش انٹینا کی سمت درست کرنا' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Satellite receiver setup', ur: 'سیٹلائٹ ریسیور سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Dish installation', ur: 'ڈش کی تنصیب' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Dish relocation', ur: 'ڈش کی منتقلی' }, // §63 TV, Satellite & Home Entertainment
      { en: 'TV signal troubleshooting', ur: 'ٹی وی سگنل کے مسائل کا حل' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Remote pairing/setup', ur: 'ریموٹ پیئرنگ/سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Screen/cable connection troubleshooting', ur: 'اسکرین/کیبل کنکشن کے مسائل کا حل' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Gaming console setup', ur: 'گیمنگ کنسول سیٹ اپ' }, // §63 TV, Satellite & Home Entertainment
      { en: 'Home entertainment wiring', ur: 'ہوم انٹرٹینمنٹ وائرنگ' }, // §63 TV, Satellite & Home Entertainment
    ],
  },
  {
    // BP §63 family: CCTV, Security & Access  —  inactive (D-024)
    code: 'cctv_security_access',
    en: 'CCTV, Security & Access',
    ur: 'سی سی ٹی وی، سیکیورٹی اور رسائی',
    launchFamily: false,
    services: [
      { en: 'CCTV installation', ur: 'سی سی ٹی وی کی تنصیب' }, // §63 CCTV, Security & Access
      { en: 'CCTV camera replacement', ur: 'سی سی ٹی وی کیمرے کی تبدیلی' }, // §63 CCTV, Security & Access
      { en: 'DVR setup', ur: 'ڈی وی آر سیٹ اپ' }, // §63 CCTV, Security & Access
      { en: 'NVR setup', ur: 'این وی آر سیٹ اپ' }, // §63 CCTV, Security & Access
      { en: 'Remote viewing setup', ur: 'ریموٹ ویونگ سیٹ اپ' }, // §63 CCTV, Security & Access
      { en: 'CCTV troubleshooting', ur: 'سی سی ٹی وی کے مسائل کا حل' }, // §63 CCTV, Security & Access
      { en: 'Storage/HDD replacement', ur: 'اسٹوریج/ہارڈ ڈسک کی تبدیلی' }, // §63 CCTV, Security & Access
      { en: 'Doorbell camera installation', ur: 'ڈور بیل کیمرے کی تنصیب' }, // §63 CCTV, Security & Access
      { en: 'Video doorbell setup', ur: 'ویڈیو ڈور بیل سیٹ اپ' }, // §63 CCTV, Security & Access
      { en: 'Smart lock installation', ur: 'اسمارٹ لاک کی تنصیب' }, // §63 CCTV, Security & Access
      { en: 'Access control setup', ur: 'ایکسیس کنٹرول سیٹ اپ' }, // §63 CCTV, Security & Access
      { en: 'Intercom installation', ur: 'انٹرکام کی تنصیب' }, // §63 CCTV, Security & Access
      { en: 'Door access troubleshooting', ur: 'دروازے کی رسائی کے مسائل کا حل' }, // §63 CCTV, Security & Access
      { en: 'Basic alarm installation', ur: 'بنیادی الارم کی تنصیب' }, // §63 CCTV, Security & Access
      { en: 'Security sensor setup', ur: 'سیکیورٹی سینسر سیٹ اپ' }, // §63 CCTV, Security & Access
      { en: 'CCTV maintenance', ur: 'سی سی ٹی وی کی دیکھ بھال' }, // §63 CCTV, Security & Access
    ],
  },
  {
    // BP §63 family: Solar, UPS & Backup Power  —  inactive (D-024)
    code: 'solar_ups_backup_power',
    en: 'Solar, UPS & Backup Power',
    ur: 'سولر، یو پی ایس اور بیک اپ پاور',
    launchFamily: false,
    services: [
      { en: 'Solar panel cleaning', ur: 'سولر پینل کی صفائی' }, // §63 Solar, UPS & Backup Power
      { en: 'Solar inspection', ur: 'سولر سسٹم کا معائنہ' }, // §63 Solar, UPS & Backup Power
      { en: 'Inverter setup', ur: 'انورٹر سیٹ اپ' }, // §63 Solar, UPS & Backup Power
      { en: 'Inverter troubleshooting', ur: 'انورٹر کے مسائل کا حل' }, // §63 Solar, UPS & Backup Power
      { en: 'UPS installation', ur: 'یو پی ایس کی تنصیب' }, // §63 Solar, UPS & Backup Power
      { en: 'UPS repair', ur: 'یو پی ایس کی مرمت' }, // §63 Solar, UPS & Backup Power
      { en: 'Battery inspection', ur: 'بیٹری کا معائنہ' }, // §63 Solar, UPS & Backup Power
      { en: 'Battery replacement', ur: 'بیٹری کی تبدیلی' }, // §63 Solar, UPS & Backup Power
      { en: 'Solar wiring support', ur: 'سولر وائرنگ میں مدد' }, // §63 Solar, UPS & Backup Power
      { en: 'Solar monitoring setup', ur: 'سولر مانیٹرنگ سیٹ اپ' }, // §63 Solar, UPS & Backup Power
      { en: 'Energy backup assessment', ur: 'بیک اپ بجلی کی ضرورت کا جائزہ' }, // §63 Solar, UPS & Backup Power
      { en: 'Small solar system installation support', ur: 'چھوٹے سولر سسٹم کی تنصیب میں مدد' }, // §63 Solar, UPS & Backup Power
      { en: 'Battery cable repair', ur: 'بیٹری کیبل کی مرمت' }, // §63 Solar, UPS & Backup Power
      { en: 'Backup power troubleshooting', ur: 'بیک اپ پاور کے مسائل کا حل' }, // §63 Solar, UPS & Backup Power
    ],
  },
  {
    // BP §63 family: Generators  —  inactive (D-024)
    code: 'generators',
    en: 'Generators',
    ur: 'جنریٹر',
    launchFamily: false,
    services: [
      { en: 'Generator inspection', ur: 'جنریٹر کا معائنہ' }, // §63 Generators
      { en: 'Generator service', ur: 'جنریٹر سروس' }, // §63 Generators
      { en: 'Generator oil/filter service', ur: 'جنریٹر آئل/فلٹر سروس' }, // §63 Generators
      { en: 'Generator battery replacement', ur: 'جنریٹر بیٹری کی تبدیلی' }, // §63 Generators
      { en: 'Generator starter diagnosis', ur: 'جنریٹر اسٹارٹر کی جانچ' }, // §63 Generators
      { en: 'Generator wiring support', ur: 'جنریٹر وائرنگ میں مدد' }, // §63 Generators
      { en: 'Generator installation support', ur: 'جنریٹر کی تنصیب میں مدد' }, // §63 Generators
      { en: 'Generator relocation', ur: 'جنریٹر کی منتقلی' }, // §63 Generators
      { en: 'Generator noise/basic inspection', ur: 'جنریٹر کے شور/بنیادی معائنہ' }, // §63 Generators
      { en: 'Generator emergency call-out', ur: 'جنریٹر ایمرجنسی کال آؤٹ' }, // §63 Generators
    ],
  },
  {
    // BP §63 family: Carpentry & Furniture  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'carpentry_furniture',
    en: 'Carpentry & Furniture',
    ur: 'بڑھئی کا کام اور فرنیچر',
    launchFamily: true,
    services: [
      { en: 'Door repair', ur: 'دروازے کی مرمت' }, // §63 Carpentry & Furniture
      { en: 'Door hinge replacement', ur: 'دروازے کے قبضے کی تبدیلی' }, // §63 Carpentry & Furniture
      { en: 'Door lock fitting', ur: 'دروازے کا تالا لگانا' }, // §63 Carpentry & Furniture
      { en: 'Cabinet repair', ur: 'کیبنٹ کی مرمت' }, // §63 Carpentry & Furniture
      { en: 'Cabinet installation', ur: 'کیبنٹ کی تنصیب' }, // §63 Carpentry & Furniture
      { en: 'Shelf installation', ur: 'شیلف کی تنصیب' }, // §63 Carpentry & Furniture
      { en: 'Wall shelf mounting', ur: 'دیوار پر شیلف لگانا' }, // §63 Carpentry & Furniture
      { en: 'Wardrobe repair', ur: 'وارڈروب کی مرمت' }, // §63 Carpentry & Furniture
      { en: 'Wardrobe installation', ur: 'وارڈروب کی تنصیب' }, // §63 Carpentry & Furniture
      { en: 'Table repair', ur: 'میز کی مرمت' }, // §63 Carpentry & Furniture
      { en: 'Chair repair', ur: 'کرسی کی مرمت' }, // §63 Carpentry & Furniture
      { en: 'Bed repair', ur: 'بیڈ کی مرمت' }, // §63 Carpentry & Furniture
      { en: 'Bed assembly', ur: 'بیڈ جوڑنا' }, // §63 Carpentry & Furniture
      { en: 'Furniture assembly', ur: 'فرنیچر جوڑنا' }, // §63 Carpentry & Furniture
      { en: 'Furniture disassembly', ur: 'فرنیچر کھولنا' }, // §63 Carpentry & Furniture
      { en: 'Furniture polishing', ur: 'فرنیچر پالش' }, // §63 Carpentry & Furniture
      { en: 'Wood repair', ur: 'لکڑی کی مرمت' }, // §63 Carpentry & Furniture
      { en: 'Wood cutting/service', ur: 'لکڑی کی کٹائی/سروس' }, // §63 Carpentry & Furniture
      { en: 'Kitchen cabinet adjustment', ur: 'کچن کیبنٹ کی درستی' }, // §63 Carpentry & Furniture
      { en: 'Office furniture assembly', ur: 'دفتری فرنیچر جوڑنا' }, // §63 Carpentry & Furniture
    ],
  },
  {
    // BP §63 family: Painting & Wall Finishing  —  inactive (D-024)
    code: 'painting_wall_finishing',
    en: 'Painting & Wall Finishing',
    ur: 'رنگ و روغن اور دیوار کی فنشنگ',
    launchFamily: false,
    services: [
      { en: 'Room painting', ur: 'کمرے کا رنگ' }, // §63 Painting & Wall Finishing
      { en: 'Wall repainting', ur: 'دیوار کا دوبارہ رنگ' }, // §63 Painting & Wall Finishing
      { en: 'Ceiling painting', ur: 'چھت کا رنگ' }, // §63 Painting & Wall Finishing
      { en: 'Touch-up painting', ur: 'ٹچ اپ پینٹ' }, // §63 Painting & Wall Finishing
      { en: 'Texture finish', ur: 'ٹیکسچر فنش' }, // §63 Painting & Wall Finishing
      { en: 'Wallpaper installation', ur: 'وال پیپر لگانا' }, // §63 Painting & Wall Finishing
      { en: 'Wallpaper removal', ur: 'وال پیپر اتارنا' }, // §63 Painting & Wall Finishing
      { en: 'Wall crack filling', ur: 'دیوار کی دراڑ بھرنا' }, // §63 Painting & Wall Finishing
      { en: 'Damp patch treatment', ur: 'سیلن کے دھبوں کا علاج' }, // §63 Painting & Wall Finishing
      { en: 'Putty work', ur: 'پٹی کا کام' }, // §63 Painting & Wall Finishing
      { en: 'Color consultation/basic matching', ur: 'رنگ کا مشورہ/بنیادی میچنگ' }, // §63 Painting & Wall Finishing
      { en: 'Exterior touch-up', ur: 'بیرونی دیوار کا ٹچ اپ' }, // §63 Painting & Wall Finishing
      { en: 'Door painting', ur: 'دروازے کا رنگ' }, // §63 Painting & Wall Finishing
      { en: 'Metal grille painting', ur: 'لوہے کی گرل کا رنگ' }, // §63 Painting & Wall Finishing
      { en: 'Move-in repaint', ur: 'منتقلی سے پہلے دوبارہ رنگ' }, // §63 Painting & Wall Finishing
      { en: 'Move-out repaint', ur: 'گھر چھوڑنے پر دوبارہ رنگ' }, // §63 Painting & Wall Finishing
    ],
  },
  {
    // BP §63 family: Construction & Home Improvement  —  inactive (D-024)
    code: 'construction_home_improvement',
    en: 'Construction & Home Improvement',
    ur: 'تعمیر اور گھر کی بہتری',
    launchFamily: false,
    services: [
      { en: 'Minor masonry repair', ur: 'معمولی چنائی کی مرمت' }, // §63 Construction & Home Improvement
      { en: 'Tile replacement', ur: 'ٹائل کی تبدیلی' }, // §63 Construction & Home Improvement
      { en: 'Tile installation', ur: 'ٹائل لگانا' }, // §63 Construction & Home Improvement
      { en: 'Grouting', ur: 'گراؤٹنگ (ٹائل کے جوڑ بھرنا)' }, // §63 Construction & Home Improvement
      { en: 'Silicone/sealant work', ur: 'سلیکون/سیلنٹ کا کام' }, // §63 Construction & Home Improvement
      { en: 'Cement patching', ur: 'سیمنٹ کی پیوند کاری' }, // §63 Construction & Home Improvement
      { en: 'Brick repair', ur: 'اینٹوں کی مرمت' }, // §63 Construction & Home Improvement
      { en: 'Partition adjustment', ur: 'پارٹیشن کی درستی' }, // §63 Construction & Home Improvement
      { en: 'Bathroom repair work', ur: 'باتھ روم کی مرمت کا کام' }, // §63 Construction & Home Improvement
      { en: 'Kitchen repair work', ur: 'کچن کی مرمت کا کام' }, // §63 Construction & Home Improvement
      { en: 'Countertop minor repair', ur: 'کاؤنٹر ٹاپ کی معمولی مرمت' }, // §63 Construction & Home Improvement
      { en: 'Concrete patch repair', ur: 'کنکریٹ کی پیوند کاری' }, // §63 Construction & Home Improvement
      { en: 'Small renovation jobs', ur: 'چھوٹے تزئین و آرائش کے کام' }, // §63 Construction & Home Improvement
      { en: 'Drilling/core hole work where appropriate', ur: 'ڈرلنگ/کور ہول کا کام (جہاں مناسب ہو)' }, // §63 Construction & Home Improvement
      { en: 'Fixture installation', ur: 'فکسچر کی تنصیب' }, // §63 Construction & Home Improvement
      { en: 'Basic handyman renovation support', ur: 'بنیادی مرمتی کام میں مدد' }, // §63 Construction & Home Improvement
    ],
  },
  {
    // BP §63 family: Glass, Aluminum & Metal  —  inactive (D-024)
    code: 'glass_aluminum_metal',
    en: 'Glass, Aluminum & Metal',
    ur: 'شیشہ، ایلومینیم اور دھات',
    launchFamily: false,
    services: [
      { en: 'Window glass replacement', ur: 'کھڑکی کے شیشے کی تبدیلی' }, // §63 Glass, Aluminum & Metal
      { en: 'Door glass replacement', ur: 'دروازے کے شیشے کی تبدیلی' }, // §63 Glass, Aluminum & Metal
      { en: 'Mirror installation', ur: 'آئینہ لگانا' }, // §63 Glass, Aluminum & Metal
      { en: 'Mirror replacement', ur: 'آئینے کی تبدیلی' }, // §63 Glass, Aluminum & Metal
      { en: 'Aluminum window repair', ur: 'ایلومینیم کھڑکی کی مرمت' }, // §63 Glass, Aluminum & Metal
      { en: 'Aluminum door repair', ur: 'ایلومینیم دروازے کی مرمت' }, // §63 Glass, Aluminum & Metal
      { en: 'Sliding window repair', ur: 'سلائیڈنگ کھڑکی کی مرمت' }, // §63 Glass, Aluminum & Metal
      { en: 'Sliding door repair', ur: 'سلائیڈنگ دروازے کی مرمت' }, // §63 Glass, Aluminum & Metal
      { en: 'Mosquito net installation', ur: 'مچھر جالی کی تنصیب' }, // §63 Glass, Aluminum & Metal
      { en: 'Metal grille repair', ur: 'لوہے کی گرل کی مرمت' }, // §63 Glass, Aluminum & Metal
      { en: 'Small welding jobs', ur: 'چھوٹے ویلڈنگ کے کام' }, // §63 Glass, Aluminum & Metal
      { en: 'Railing repair', ur: 'ریلنگ کی مرمت' }, // §63 Glass, Aluminum & Metal
      { en: 'Glass shelf installation', ur: 'شیشے کے شیلف کی تنصیب' }, // §63 Glass, Aluminum & Metal
      { en: 'Shower glass fitting', ur: 'شاور گلاس کی فٹنگ' }, // §63 Glass, Aluminum & Metal
      { en: 'Silicone glass sealing', ur: 'شیشے کی سلیکون سیلنگ' }, // §63 Glass, Aluminum & Metal
    ],
  },
  {
    // BP §63 family: Cleaning & Hygiene  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'cleaning_hygiene',
    en: 'Cleaning & Hygiene',
    ur: 'صفائی ستھرائی',
    launchFamily: true,
    services: [
      { en: 'Home general cleaning', ur: 'گھر کی عام صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Deep home cleaning', ur: 'گھر کی گہری صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Kitchen deep cleaning', ur: 'کچن کی گہری صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Bathroom deep cleaning', ur: 'باتھ روم کی گہری صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Move-in cleaning', ur: 'منتقلی سے پہلے صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Move-out cleaning', ur: 'گھر چھوڑنے پر صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Sofa cleaning', ur: 'صوفے کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Mattress cleaning', ur: 'گدے کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Carpet cleaning', ur: 'قالین کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Rug cleaning', ur: 'دری کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Curtain cleaning', ur: 'پردوں کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Window cleaning', ur: 'کھڑکیوں کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Glass cleaning', ur: 'شیشوں کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Water tank cleaning', ur: 'پانی کی ٹنکی کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Balcony cleaning', ur: 'بالکونی کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Post-construction cleaning', ur: 'تعمیر کے بعد صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Office cleaning', ur: 'دفتر کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Shop cleaning', ur: 'دکان کی صفائی' }, // §63 Cleaning & Hygiene
      { en: 'Appliance exterior cleaning', ur: 'آلات کی بیرونی صفائی' }, // §63 Cleaning & Hygiene
    ],
  },
  {
    // BP §63 family: Laundry & Fabric Care  —  inactive (D-024)
    code: 'laundry_fabric_care',
    en: 'Laundry & Fabric Care',
    ur: 'لانڈری اور کپڑوں کی دیکھ بھال',
    launchFamily: false,
    services: [
      { en: 'Laundry pickup/drop', ur: 'لانڈری پک اپ/ڈراپ' }, // §63 Laundry & Fabric Care
      { en: 'Wash and fold', ur: 'دھلائی اور تہہ' }, // §63 Laundry & Fabric Care
      { en: 'Dry cleaning coordination', ur: 'ڈرائی کلیننگ کا انتظام' }, // §63 Laundry & Fabric Care
      { en: 'Ironing', ur: 'استری' }, // §63 Laundry & Fabric Care
      { en: 'Curtain cleaning coordination', ur: 'پردوں کی دھلائی کا انتظام' }, // §63 Laundry & Fabric Care
      { en: 'Carpet/rug laundry', ur: 'قالین/دری کی دھلائی' }, // §63 Laundry & Fabric Care
      { en: 'Sofa cover cleaning', ur: 'صوفہ کور کی دھلائی' }, // §63 Laundry & Fabric Care
      { en: 'Bedsheet washing', ur: 'بیڈ شیٹ کی دھلائی' }, // §63 Laundry & Fabric Care
      { en: 'Blanket washing', ur: 'کمبل کی دھلائی' }, // §63 Laundry & Fabric Care
      { en: 'Special garment care', ur: 'خاص کپڑوں کی دیکھ بھال' }, // §63 Laundry & Fabric Care
    ],
  },
  {
    // BP §63 family: Pest Control  —  inactive (D-024)
    code: 'pest_control',
    en: 'Pest Control',
    ur: 'کیڑے مار سروس',
    launchFamily: false,
    services: [
      { en: 'Cockroach treatment', ur: 'لال بیگ کا خاتمہ' }, // §63 Pest Control
      { en: 'Ant treatment', ur: 'چیونٹیوں کا خاتمہ' }, // §63 Pest Control
      { en: 'Mosquito control', ur: 'مچھروں پر قابو' }, // §63 Pest Control
      { en: 'Fly control', ur: 'مکھیوں پر قابو' }, // §63 Pest Control
      { en: 'Bed bug treatment', ur: 'کھٹملوں کا خاتمہ' }, // §63 Pest Control
      { en: 'Termite inspection', ur: 'دیمک کا معائنہ' }, // §63 Pest Control
      { en: 'Termite treatment', ur: 'دیمک کا علاج' }, // §63 Pest Control
      { en: 'Rodent control', ur: 'چوہوں پر قابو' }, // §63 Pest Control
      { en: 'Lizard/pest treatment', ur: 'چھپکلی/کیڑوں کا علاج' }, // §63 Pest Control
      { en: 'General pest treatment', ur: 'کیڑوں کا عمومی علاج' }, // §63 Pest Control
      { en: 'Preventive pest treatment', ur: 'کیڑوں سے بچاؤ کا علاج' }, // §63 Pest Control
    ],
  },
  {
    // BP §63 family: Locksmith & Access  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'locksmith_access',
    en: 'Locksmith & Access',
    ur: 'تالے اور رسائی',
    launchFamily: true,
    services: [
      { en: 'Door lock replacement', ur: 'دروازے کے تالے کی تبدیلی' }, // §63 Locksmith & Access
      { en: 'Lock repair', ur: 'تالے کی مرمت' }, // §63 Locksmith & Access
      { en: 'Duplicate key service where lawful', ur: 'ڈپلیکیٹ چابی (جہاں قانونی ہو)' }, // §63 Locksmith & Access
      { en: 'Emergency lockout assistance', ur: 'ایمرجنسی میں بند دروازہ کھولنے میں مدد' }, // §63 Locksmith & Access
      { en: 'Padlock replacement', ur: 'پیڈ لاک کی تبدیلی' }, // §63 Locksmith & Access
      { en: 'Cabinet lock repair', ur: 'الماری کے تالے کی مرمت' }, // §63 Locksmith & Access
      { en: 'Mailbox/locker lock service', ur: 'میل باکس/لاکر کے تالے کی سروس' }, // §63 Locksmith & Access
      { en: 'Smart lock setup', ur: 'اسمارٹ لاک سیٹ اپ' }, // §63 Locksmith & Access
      { en: 'Door alignment related to locking', ur: 'تالا لگنے کے لیے دروازے کی سیدھ درست کرنا' }, // §63 Locksmith & Access
      { en: 'Lock maintenance', ur: 'تالوں کی دیکھ بھال' }, // §63 Locksmith & Access
    ],
  },
  {
    // BP §63 family: Moving, Shifting & Delivery  —  inactive (D-024)
    code: 'moving_shifting_delivery',
    en: 'Moving, Shifting & Delivery',
    ur: 'سامان کی منتقلی اور ڈیلیوری',
    launchFamily: false,
    services: [
      { en: 'Home shifting', ur: 'گھر کی شفٹنگ' }, // §63 Moving, Shifting & Delivery
      { en: 'Room shifting', ur: 'کمرے کی شفٹنگ' }, // §63 Moving, Shifting & Delivery
      { en: 'Office shifting', ur: 'دفتر کی شفٹنگ' }, // §63 Moving, Shifting & Delivery
      { en: 'Single-item moving', ur: 'ایک چیز کی منتقلی' }, // §63 Moving, Shifting & Delivery
      { en: 'Furniture transport', ur: 'فرنیچر کی ترسیل' }, // §63 Moving, Shifting & Delivery
      { en: 'Appliance transport', ur: 'آلات کی ترسیل' }, // §63 Moving, Shifting & Delivery
      { en: 'Packing service', ur: 'پیکنگ سروس' }, // §63 Moving, Shifting & Delivery
      { en: 'Unpacking service', ur: 'سامان کھولنے کی سروس' }, // §63 Moving, Shifting & Delivery
      { en: 'Loading/unloading', ur: 'لوڈنگ/ان لوڈنگ' }, // §63 Moving, Shifting & Delivery
      { en: 'Small goods delivery', ur: 'چھوٹے سامان کی ڈیلیوری' }, // §63 Moving, Shifting & Delivery
      { en: 'Local pickup/drop', ur: 'مقامی پک اپ/ڈراپ' }, // §63 Moving, Shifting & Delivery
      { en: 'Moving labor only', ur: 'صرف شفٹنگ مزدور' }, // §63 Moving, Shifting & Delivery
      { en: 'Storage moving assistance', ur: 'اسٹوریج تک سامان منتقلی میں مدد' }, // §63 Moving, Shifting & Delivery
    ],
  },
  {
    // BP §63 family: Gardening & Outdoor  —  inactive (D-024)
    code: 'gardening_outdoor',
    en: 'Gardening & Outdoor',
    ur: 'باغبانی اور بیرونی کام',
    launchFamily: false,
    services: [
      { en: 'Lawn trimming', ur: 'لان کی کٹائی' }, // §63 Gardening & Outdoor
      { en: 'Gardening maintenance', ur: 'باغ کی دیکھ بھال' }, // §63 Gardening & Outdoor
      { en: 'Planting assistance', ur: 'پودے لگانے میں مدد' }, // §63 Gardening & Outdoor
      { en: 'Pruning', ur: 'پودوں کی کانٹ چھانٹ' }, // §63 Gardening & Outdoor
      { en: 'Potting', ur: 'گملوں میں پودے لگانا' }, // §63 Gardening & Outdoor
      { en: 'Terrace garden maintenance', ur: 'چھت کے باغ کی دیکھ بھال' }, // §63 Gardening & Outdoor
      { en: 'Balcony garden setup', ur: 'بالکونی گارڈن سیٹ اپ' }, // §63 Gardening & Outdoor
      { en: 'Soil replacement', ur: 'مٹی کی تبدیلی' }, // §63 Gardening & Outdoor
      { en: 'Plant relocation', ur: 'پودوں کی منتقلی' }, // §63 Gardening & Outdoor
      { en: 'Garden cleanup', ur: 'باغ کی صفائی' }, // §63 Gardening & Outdoor
      { en: 'Basic irrigation setup', ur: 'بنیادی آبپاشی کا سیٹ اپ' }, // §63 Gardening & Outdoor
      { en: 'Outdoor pressure washing', ur: 'بیرونی پریشر واشنگ' }, // §63 Gardening & Outdoor
    ],
  },
  {
    // BP §63 family: Car & Two-Wheeler Everyday Care  —  BP §6 launch family, active in Lahore day one (D-024)
    code: 'car_two_wheeler_care',
    en: 'Car & Two-Wheeler Everyday Care',
    ur: 'گاڑی اور موٹر سائیکل کی روزمرہ دیکھ بھال',
    launchFamily: true,
    services: [
      { en: 'Car wash', ur: 'گاڑی کی دھلائی' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Interior cleaning', ur: 'گاڑی کے اندر کی صفائی' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Car detailing', ur: 'کار ڈیٹیلنگ' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Oil change coordination', ur: 'آئل تبدیلی کا انتظام' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Battery jump-start', ur: 'بیٹری جمپ اسٹارٹ' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Battery replacement assistance', ur: 'بیٹری تبدیلی میں مدد' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Tyre change assistance', ur: 'ٹائر تبدیلی میں مدد' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Tyre puncture assistance', ur: 'ٹائر پنکچر میں مدد' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Basic vehicle inspection', ur: 'گاڑی کا بنیادی معائنہ' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'AC cabin filter replacement', ur: 'اے سی کیبن فلٹر کی تبدیلی' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Wiper replacement', ur: 'وائپر کی تبدیلی' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Headlight bulb replacement', ur: 'ہیڈ لائٹ بلب کی تبدیلی' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Bike wash', ur: 'موٹر سائیکل کی دھلائی' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Bike chain service', ur: 'موٹر سائیکل چین سروس' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Bike puncture assistance', ur: 'موٹر سائیکل پنکچر میں مدد' }, // §63 Car & Two-Wheeler Everyday Care
      { en: 'Vehicle pickup/drop for workshop where offered', ur: 'ورکشاپ کے لیے گاڑی پک اپ/ڈراپ (جہاں دستیاب ہو)' }, // §63 Car & Two-Wheeler Everyday Care
    ],
  },
  {
    // BP §63 family: Home & Office Setup  —  inactive (D-024)
    code: 'home_office_setup',
    en: 'Home & Office Setup',
    ur: 'گھر اور دفتر کا سیٹ اپ',
    launchFamily: false,
    services: [
      { en: 'Curtain rod installation', ur: 'پردے کی راڈ لگانا' }, // §63 Home & Office Setup
      { en: 'Picture/frame hanging', ur: 'تصویر/فریم لٹکانا' }, // §63 Home & Office Setup
      { en: 'TV bracket installation', ur: 'ٹی وی بریکٹ کی تنصیب' }, // §63 Home & Office Setup
      { en: 'Furniture assembly', ur: 'فرنیچر جوڑنا' }, // §63 Home & Office Setup
      { en: 'Baby furniture assembly', ur: 'بچوں کا فرنیچر جوڑنا' }, // §63 Home & Office Setup
      { en: 'Desk setup', ur: 'ڈیسک سیٹ اپ' }, // §63 Home & Office Setup
      { en: 'Office workstation setup', ur: 'دفتری ورک اسٹیشن سیٹ اپ' }, // §63 Home & Office Setup
      { en: 'Printer setup', ur: 'پرنٹر سیٹ اپ' }, // §63 Home & Office Setup
      { en: 'Wi-Fi setup', ur: 'وائی فائی سیٹ اپ' }, // §63 Home & Office Setup
      { en: 'Wall mounting', ur: 'دیوار پر لگانا' }, // §63 Home & Office Setup
      { en: 'Mirror hanging', ur: 'آئینہ لٹکانا' }, // §63 Home & Office Setup
      { en: 'Ceiling fixture installation', ur: 'چھت کے فکسچر کی تنصیب' }, // §63 Home & Office Setup
      { en: 'Shelving setup', ur: 'شیلفنگ سیٹ اپ' }, // §63 Home & Office Setup
      { en: 'Basic smart-home setup', ur: 'بنیادی اسمارٹ ہوم سیٹ اپ' }, // §63 Home & Office Setup
      { en: 'Router placement optimization', ur: 'راؤٹر کی بہترین جگہ کا تعین' }, // §63 Home & Office Setup
    ],
  },
  {
    // BP §63 family: General Handyman  —  inactive (D-024)
    code: 'general_handyman',
    en: 'General Handyman',
    ur: 'عام مرمتی کام (ہینڈی مین)',
    launchFamily: false,
    services: [
      { en: 'Drilling', ur: 'ڈرلنگ' }, // §63 General Handyman
      { en: 'Wall mounting', ur: 'دیوار پر لگانا' }, // §63 General Handyman
      { en: 'Furniture adjustment', ur: 'فرنیچر کی درستی' }, // §63 General Handyman
      { en: 'Minor repairs', ur: 'چھوٹی موٹی مرمت' }, // §63 General Handyman
      { en: 'Fixture installation', ur: 'فکسچر کی تنصیب' }, // §63 General Handyman
      { en: 'Curtain installation', ur: 'پردے لگانا' }, // §63 General Handyman
      { en: 'Shelf installation', ur: 'شیلف کی تنصیب' }, // §63 General Handyman
      { en: 'Picture hanging', ur: 'تصویر لٹکانا' }, // §63 General Handyman
      { en: 'Loose-hardware repair', ur: 'ڈھیلے ہارڈویئر کی مرمت' }, // §63 General Handyman
      { en: 'Silicone/sealant application', ur: 'سلیکون/سیلنٹ لگانا' }, // §63 General Handyman
      { en: 'Minor patching', ur: 'معمولی پیوند کاری' }, // §63 General Handyman
      { en: 'Assembly/disassembly', ur: 'جوڑنا/کھولنا' }, // §63 General Handyman
      { en: 'General household inspection', ur: 'گھر کا عمومی معائنہ' }, // §63 General Handyman
      { en: 'Small maintenance visit', ur: 'چھوٹا مرمتی وزٹ' }, // §63 General Handyman
    ],
  },
];

/** Service code = `<family code>.<slug of the BP item>` (stable while the BP text is stable). */
export function serviceCode(familyCode: string, itemEn: string): string {
  const slug = itemEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${familyCode}.${slug}`;
}
