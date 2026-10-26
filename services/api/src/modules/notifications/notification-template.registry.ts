/**
 * Bilingual Notification Template Registry (ARCH §7; BP §24, §80; CFG-RULE-011; NOTIF-001..008).
 * Defines English and Urdu copy for all ARCH §7 domain events across Customer, Provider, and Admin roles.
 */
import {
  NotificationCategory,
  NotificationPriority,
  type NotificationTemplateDefinition,
} from './notifications.types';

export const ARCH_SEVEN_TEMPLATES: readonly NotificationTemplateDefinition[] = [
  // 1. request.submitted (NOTIF-002)
  {
    eventType: 'request.submitted',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Request Received',
      body: 'Your request for {serviceName} in {area} has been received. Matching nearby providers.',
    },
    ur: {
      title: 'درخواست موصول ہو گئی',
      body: '{area} میں {serviceName} کے لیے آپ کی درخواست موصول ہو گئی ہے۔ قریبی ورکرز تلاش کیے جا رہے ہیں۔',
    },
  },
  {
    eventType: 'request.submitted',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'New Job Alert',
      body: 'New request for {serviceName} in {area} ({distanceKm} km away). Tap to review and accept.',
    },
    ur: {
      title: 'نئے کام کی اطلاع',
      body: '{area} میں {serviceName} کا نیا کام ({distanceKm} کلومیٹر دور)۔ تفصیلات دیکھنے کے لیے ٹیپ کریں۔',
    },
  },
  {
    eventType: 'request.submitted',
    audienceRole: 'ADMIN',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'New Request Logged',
      body: 'Request #{requestId} submitted for service {serviceName} in {area}.',
    },
    ur: {
      title: 'نئی درخواست کا اندراج',
      body: 'سروس {serviceName} کے لیے درخواست #{requestId} درج کر لی گئی ہے۔',
    },
  },

  // 2. quote.received (NOTIF-002)
  {
    eventType: 'quote.received',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'New Quote Received',
      body: '{providerName} sent a quote of Rs. {totalPrice} for your booking. Tap to review breakdown.',
    },
    ur: {
      title: 'کوٹیشن موصول ہوا',
      body: '{providerName} نے {totalPrice} روپے کا کوٹیشن بھیجا ہے۔ تفصیل دیکھنے کے لیے ٹیپ کریں۔',
    },
  },
  {
    eventType: 'quote.received',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'Quote Sent Successfully',
      body: 'Your quote for booking #{bookingId} has been sent to the customer.',
    },
    ur: {
      title: 'کوٹیشن کامیابی سے بھیج دی گئی',
      body: 'بکنگ #{bookingId} کے لیے آپ کا کوٹیشن کسٹمر کو بھیج دیا گیا ہے۔',
    },
  },

  // 3. booking.accepted (NOTIF-003)
  {
    eventType: 'booking.accepted',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Booking Confirmed!',
      body: '{providerName} accepted your booking for {scheduledTime}. Crew: {crewSize}.',
    },
    ur: {
      title: 'بکنگ کی تصدیق!',
      body: '{providerName} نے {scheduledTime} کے لیے آپ کی بکنگ قبول کر لی ہے۔ عملہ: {crewSize}۔',
    },
  },
  {
    eventType: 'booking.accepted',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Job Accepted',
      body: 'You are booked for {serviceName} on {scheduledTime}. Remember to arrive on time.',
    },
    ur: {
      title: 'کام قبول کر لیا گیا',
      body: 'آپ کی {scheduledTime} پر {serviceName} کے کام کی تصدیق ہو گئی ہے۔ وقت پر پہنچیں۔',
    },
  },

  // 4. booking.reminder (NOTIF-003)
  {
    eventType: 'booking.reminder',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'Upcoming Service Reminder',
      body: 'Reminder: Your {serviceName} appointment with {providerName} is scheduled for {scheduledTime}.',
    },
    ur: {
      title: 'آنے والے کام کی یاد دہانی',
      body: 'یاد دہانی: {providerName} کے ساتھ آپ کا {serviceName} کا وقت {scheduledTime} پر مقرر ہے۔',
    },
  },
  {
    eventType: 'booking.reminder',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'Upcoming Job Reminder',
      body: 'Reminder: Scheduled job for {serviceName} in {area} starts at {scheduledTime}.',
    },
    ur: {
      title: 'کام کی یاد دہانی',
      body: 'یاد دہانی: {area} میں {serviceName} کا کام {scheduledTime} پر شروع ہوگا۔',
    },
  },

  // 5. provider.en_route (NOTIF-004)
  {
    eventType: 'provider.en_route',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Provider is On The Way',
      body: '{providerName} is heading towards your location. Estimated arrival in {etaMinutes} mins.',
    },
    ur: {
      title: 'ورکر راستے میں ہیں',
      body: '{providerName} آپ کی طرف روانہ ہو چکے ہیں۔ متوقع آمد: {etaMinutes} منٹ۔',
    },
  },
  {
    eventType: 'provider.en_route',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'En Route Active',
      body: 'Navigation active to customer location in {area}. Location is being shared.',
    },
    ur: {
      title: 'روانگی فعال ہے',
      body: '{area} میں کسٹمر کی لوکیشن کی نیویگیشن فعال ہے۔ لوکیشن شیئر ہو رہی ہے۔',
    },
  },

  // 6. job.status_changed (NOTIF-004)
  {
    eventType: 'job.status_changed',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Job Status Updated',
      body: 'Your service #{bookingId} status is now: {status}.',
    },
    ur: {
      title: 'کام کی صورتحال اپڈیٹ',
      body: 'آپ کی سروس #{bookingId} کی صورتحال: {status}۔',
    },
  },
  {
    eventType: 'job.status_changed',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.JOBS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Booking Status Updated',
      body: 'Booking #{bookingId} transitioned to {status}.',
    },
    ur: {
      title: 'بکنگ کی حالت تبدیل',
      body: 'بکنگ #{bookingId} اب {status} حالت میں ہے۔',
    },
  },

  // 7. charge.proposed (NOTIF-005)
  {
    eventType: 'charge.proposed',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Approval Required: Extra Charge',
      body: '{providerName} proposed an additional charge of Rs. {amount} for {reason}. Tap to review on screen C37.',
    },
    ur: {
      title: 'منظوری درکار: اضافی چارج',
      body: '{providerName} نے {reason} کی مد میں {amount} روپے کا اضافی چارج تجویز کیا ہے۔ منظوری کے لیے ٹیپ کریں۔',
    },
  },

  // 8. payment.succeeded (NOTIF-006)
  {
    eventType: 'payment.succeeded',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Payment Confirmed',
      body: 'Payment of Rs. {amount} received for booking #{bookingId}. Receipt is ready.',
    },
    ur: {
      title: 'ادائیگی کی تصدیق',
      body: 'بکنگ #{bookingId} کے لیے {amount} روپے کی ادائیگی موصول ہو گئی ہے۔ رسید تیار ہے۔',
    },
  },
  {
    eventType: 'payment.succeeded',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Payment Credited',
      body: 'Digital payment of Rs. {amount} settled. Your share of Rs. {providerShare} has been credited.',
    },
    ur: {
      title: 'ادائیگی جمع ہوگئی',
      body: '{amount} روپے کی ڈیجیٹل ادائیگی مکمل۔ آپ کا حصہ {providerShare} روپے اکاؤنٹ میں جمع ہو چکا ہے۔',
    },
  },
  {
    eventType: 'payment.succeeded',
    audienceRole: 'ADMIN',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'Payment Succeeded',
      body: 'Booking #{bookingId}: Paid Rs. {amount} via {channel}. Commission Rs. {commissionAmount}.',
    },
    ur: {
      title: 'ادائیگی موصول ہوئی',
      body: 'بکنگ #{bookingId}: {amount} روپے موصول ہوئے۔ کمیشن: {commissionAmount} روپے',
    },
  },

  // 9. payment.failed (NOTIF-006)
  {
    eventType: 'payment.failed',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Payment Failed',
      body: 'Digital payment of Rs. {amount} could not be completed ({reason}). Please retry on screen C16.',
    },
    ur: {
      title: 'ادائیگی نامکمل',
      body: '{amount} روپے کی ادائیگی مکمل نہیں ہو سکی ({reason})۔ براہ کرم دوبارہ کوشش کریں۔',
    },
  },
  {
    eventType: 'payment.failed',
    audienceRole: 'ADMIN',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'Payment Exception',
      body: 'Payment attempt failed on booking #{bookingId} ({reason}). Review in A09 Exceptions.',
    },
    ur: {
      title: 'ادائیگی کی خرابی',
      body: 'بکنگ #{bookingId} پر ادائیگی ناکام ہوئی ({reason})۔',
    },
  },

  // 10. refund.issued (NOTIF-006)
  {
    eventType: 'refund.issued',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Refund Processed',
      body: 'A refund of Rs. {amount} has been issued for booking #{bookingId}. It will reflect in 3-5 days.',
    },
    ur: {
      title: 'ریفنڈ جاری کر دیا گیا',
      body: 'بکنگ #{bookingId} کے لیے {amount} روپے کا ریفنڈ بھیج دیا گیا ہے۔ رقم 3-5 دنوں میں واپس آ جائے گی۔',
    },
  },
  {
    eventType: 'refund.issued',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Refund Ledger Adjustment',
      body: 'Booking #{bookingId} was refunded. Your earnings ledger was adjusted by Rs. {providerShare}.',
    },
    ur: {
      title: 'ریفنڈ اکاؤنٹ ایڈجسٹمنٹ',
      body: 'بکنگ #{bookingId} پر ریفنڈ جاری ہوا۔ آپ کے کھاتے سے {providerShare} روپے کی تفریق کی گئی۔',
    },
  },
  {
    eventType: 'refund.issued',
    audienceRole: 'ADMIN',
    category: NotificationCategory.PAYMENTS,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'Refund Executed',
      body: 'Refund #{refundRef} of Rs. {amount} executed for booking #{bookingId}.',
    },
    ur: {
      title: 'ریفنڈ کی تکمیل',
      body: 'بکنگ #{bookingId} پر {amount} روپے کا ریفنڈ مکمل کر دیا گیا۔',
    },
  },

  // 11. message.new (NOTIF-007)
  {
    eventType: 'message.new',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.MESSAGES,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'New Message',
      body: '{senderName}: {messagePreview}',
    },
    ur: {
      title: 'نیا پیغام',
      body: '{senderName}: {messagePreview}',
    },
  },
  {
    eventType: 'message.new',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.MESSAGES,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'New Message',
      body: '{senderName}: {messagePreview}',
    },
    ur: {
      title: 'نیا پیغام',
      body: '{senderName}: {messagePreview}',
    },
  },

  // 12. dispute.opened (NOTIF-007)
  {
    eventType: 'dispute.opened',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.SUPPORT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Dispute Case Opened',
      body: 'Dispute case #{disputeId} regarding booking #{bookingId} has been registered with support.',
    },
    ur: {
      title: 'شکایت درج ہو گئی',
      body: 'بکنگ #{bookingId} کے متعلق شکایت کیس #{disputeId} سپورٹ ٹیم کو موصول ہو گیا ہے۔',
    },
  },
  {
    eventType: 'dispute.opened',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.SUPPORT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Dispute Notice',
      body: 'A dispute #{disputeId} was reported on booking #{bookingId}. Please check support in P20.',
    },
    ur: {
      title: 'شکایت کی اطلاع',
      body: 'بکنگ #{bookingId} پر شکایت #{disputeId} موصول ہوئی۔ براہ کرم تفصیل دیکھیں۔',
    },
  },
  {
    eventType: 'dispute.opened',
    audienceRole: 'ADMIN',
    category: NotificationCategory.SUPPORT,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'New Dispute Case',
      body: 'Dispute #{disputeId} opened for booking #{bookingId}. Severity: {severity}.',
    },
    ur: {
      title: 'نئی شکایت کا اندراج',
      body: 'بکنگ #{bookingId} پر نیا تنازعہ #{disputeId} درج ہوا۔',
    },
  },

  // 13. dispute.updated (NOTIF-007)
  {
    eventType: 'dispute.updated',
    audienceRole: 'CUSTOMER',
    category: NotificationCategory.SUPPORT,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'Dispute Update',
      body: 'Support update on case #{disputeId}: {updateNote}',
    },
    ur: {
      title: 'شکایت کی اپڈیٹ',
      body: 'کیس #{disputeId} پر نئی پیش رفت: {updateNote}',
    },
  },
  {
    eventType: 'dispute.updated',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.SUPPORT,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'Dispute Update',
      body: 'Support update on case #{disputeId}: {updateNote}',
    },
    ur: {
      title: 'شکایت کی اپڈیٹ',
      body: 'کیس #{disputeId} پر نئی پیش رفت: {updateNote}',
    },
  },

  // 14. provider.rating_warning (NOTIF-008, D-014)
  {
    eventType: 'provider.rating_warning',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Rating Alert: Warning {warningNumber}',
      body: 'Your average rating is {averageRating}, which is below required standard (2.0). Complete high-quality jobs to restore.',
    },
    ur: {
      title: 'ریٹنگ انتباہ: وارننگ نمبر {warningNumber}',
      body: 'آپ کی اوسط ریٹنگ {averageRating} معیار (2.0) سے کم ہے۔ براہ کرم سروس کا معیار بہتر کریں۔',
    },
  },
  {
    eventType: 'provider.rating_warning',
    audienceRole: 'ADMIN',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'Provider Low Rating Warning',
      body: 'Provider {providerId} issued rating warning {warningNumber} (Rating: {averageRating}).',
    },
    ur: {
      title: 'پرووائیڈر ریٹنگ وارننگ',
      body: 'پرووائیڈر {providerId} کو وارننگ {warningNumber} بھیجی گئی (ریٹنگ: {averageRating})۔',
    },
  },

  // 15. provider.blocked_low_rating (NOTIF-008, D-014)
  {
    eventType: 'provider.blocked_low_rating',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Account Blocked: Low Rating',
      body: 'Your provider account has been blocked due to persistent low ratings ({averageRating}). Contact support to appeal.',
    },
    ur: {
      title: 'اکاؤنٹ بلاک: کم ریٹنگ',
      body: 'مسلسل کم ریٹنگ ({averageRating}) کی وجہ سے آپ کا اکاؤنٹ بلاک کر دیا گیا ہے۔ سپورٹ سے رابطہ کریں۔',
    },
  },
  {
    eventType: 'provider.blocked_low_rating',
    audienceRole: 'ADMIN',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'Provider Suspended (Low Rating)',
      body: 'Provider {providerId} blocked automatically after repeated low rating warnings.',
    },
    ur: {
      title: 'پرووائیڈر معطلی (کم ریٹنگ)',
      body: 'کم ریٹنگ کے باعث پرووائیڈر {providerId} کا اکاؤنٹ بلاک ہو گیا۔',
    },
  },

  // 16. provider.commission_debited (NOTIF-008, D-016)
  {
    eventType: 'provider.commission_debited',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.MEDIUM,
    isCritical: false,
    en: {
      title: 'Commission Debited',
      body: 'Rs. {amount} commission (30% of labor) debited for cash booking #{bookingId}. Balance: Rs. {balance}.',
    },
    ur: {
      title: 'کمیشن کا کٹاؤ',
      body: 'کیش بکنگ #{bookingId} پر {amount} روپے کمیشن کٹ گیا۔ موجودہ بیلنس: {balance} روپے۔',
    },
  },

  // 17. provider.balance_negative (NOTIF-008, D-016, D-020)
  {
    eventType: 'provider.balance_negative',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Hiring Blocked: Unpaid Commission',
      body: 'You owe Rs. {amountOwed} in company commission. Pay the company to resume receiving new jobs.',
    },
    ur: {
      title: 'نئے کام پر پابندی: واجب الادا کمیشن',
      body: 'آپ پر {amountOwed} روپے کا کمیشن واجب الادا ہے۔ نئے کام حاصل کرنے کے لیے کمپنی کو ادائیگی کریں۔',
    },
  },
  {
    eventType: 'provider.balance_negative',
    audienceRole: 'ADMIN',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'Provider Negative Balance Queue',
      body: 'Provider {providerId} entered negative balance (Rs. {amountOwed} owed).',
    },
    ur: {
      title: 'منفی بیلنس پرووائیڈر',
      body: 'پرووائیڈر {providerId} پر {amountOwed} روپے کا کمیشن واجب الادا ہے۔',
    },
  },

  // 18. provider.commission_payment_submitted (NOTIF-008, D-021)
  {
    eventType: 'provider.commission_payment_submitted',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Payment Submitted for Verification',
      body: 'Your payment of Rs. {amount} (Tx: {transactionRef}) was submitted. Finance will verify shortly.',
    },
    ur: {
      title: 'ادائیگی تصدیق کے لیے جمع',
      body: '{amount} روپے کی ادائیگی (ٹرانزیکشن: {transactionRef}) جمع ہو گئی ہے۔ فنانس ٹیم جلد تصدیق کرے گی۔',
    },
  },
  {
    eventType: 'provider.commission_payment_submitted',
    audienceRole: 'ADMIN',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: false,
    en: {
      title: 'Commission Verification Queue',
      body: 'Provider {providerId} submitted Rs. {amount} for verification (Ref: {transactionRef}).',
    },
    ur: {
      title: 'کمیشن کی تصدیق کی قطار',
      body: 'پرووائیڈر {providerId} نے {amount} روپے تصدیق کے لیے جمع کرائے۔',
    },
  },

  // 19. provider.commission_payment_rejected (NOTIF-008, D-021)
  {
    eventType: 'provider.commission_payment_rejected',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Payment Verification Failed',
      body: 'Your submitted payment of Rs. {amount} was rejected: {reason}. Please re-submit valid proof.',
    },
    ur: {
      title: 'ادائیگی کی تصدیق مسترد',
      body: '{amount} روپے کی ادائیگی مسترد کر دی گئی: {reason}۔ براہ کرم درست ثبوت دوبارہ جمع کریں۔',
    },
  },

  // 20. provider.balance_cleared (NOTIF-008, D-020)
  {
    eventType: 'provider.balance_cleared',
    audienceRole: 'PROVIDER',
    category: NotificationCategory.ACCOUNT,
    priority: NotificationPriority.HIGH,
    isCritical: true,
    en: {
      title: 'Balance Cleared — Hiring Restored!',
      body: 'Your commission payment was approved. You can now receive and accept new customer bookings.',
    },
    ur: {
      title: 'بقایا جات کلیئر — کام بحال!',
      body: 'کمیشن کی ادائیگی منظور ہو گئی۔ اب آپ نئے کام وصول اور قبول کر سکتے ہیں۔',
    },
  },
];

/**
 * Replaces placeholders like `{bookingId}` with payload values.
 */
export function interpolateTemplate(
  template: string,
  variables: Readonly<Record<string, unknown>>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return '';
    }
    return String(val);
  });
}
