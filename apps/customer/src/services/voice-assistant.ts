/**
 * Voice Assistant Engine & Intent Parser (Task T3.11; BP §77, §78; ARCH §10.3; VOICE-001..008).
 * Enforces:
 * - Natural Urdu, English, and Roman Urdu speech/text understanding.
 * - Strict allow-list of assistant actions per BP §77.3 (VOICE-008).
 * - Mandatory confirmation dialog before consequential actions (book, accept quote, pay, cancel, complaint per VOICE-007).
 * - Multi-level Undo stack reverting draft modifications (VOICE-004).
 * - Text fallback and clean error states without trapping user (VOICE-005).
 */
import type {
  ConsequentialConfirmationPrompt,
  IntakeDraft,
  ScreenId,
  VoiceAssistantResult,
} from '../types';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

/**
 * State snapshot for voice undo history.
 */
export interface VoiceUndoSnapshot {
  readonly draft: IntakeDraft;
  readonly descriptionEn: string;
  readonly descriptionUr: string;
}

export class VoiceAssistantSession {
  private undoStack: VoiceUndoSnapshot[] = [];

  constructor(private currentDraft: IntakeDraft) {}

  public updateDraftReference(draft: IntakeDraft): void {
    this.currentDraft = draft;
  }

  public pushUndoSnapshot(descriptionEn: string, descriptionUr: string): void {
    this.undoStack.push({
      draft: { ...this.currentDraft },
      descriptionEn,
      descriptionUr,
    });
  }

  public popUndoSnapshot(): VoiceUndoSnapshot | null {
    return this.undoStack.pop() ?? null;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public clearUndo(): void {
    this.undoStack = [];
  }

  /**
   * Processes voice input text and parses the user intent (VOICE-001..008).
   */
  public processVoiceInput(rawInput: string, currentScreen?: ScreenId): VoiceAssistantResult {
    return this.parseIntent(rawInput, currentScreen);
  }

  /**
   * Parses spoken or typed text into a structured VoiceAssistantResult.
   */
  public parseIntent(rawInput: string, currentScreen?: ScreenId): VoiceAssistantResult {
    const trimmed = rawInput.trim();
    const lower = trimmed.toLowerCase();
    const isUrduScript = ARABIC_SCRIPT.test(trimmed);
    const detectedLanguage: 'en' | 'ur' = isUrduScript ? 'ur' : 'en';

    // 1. Undo / Cancel that (VOICE-004)
    if (
      lower.includes('undo') ||
      lower.includes('cancel that') ||
      lower.includes('revert') ||
      lower.includes('wapas') ||
      lower.includes('pehle jaisa') ||
      trimmed.includes('واپس') ||
      trimmed.includes('منسوخ کریں') ||
      trimmed.includes('پہلے جیسا')
    ) {
      const prev = this.popUndoSnapshot();
      if (prev) {
        return {
          recognizedText: trimmed,
          intentType: 'UNDO',
          detectedLanguage,
          explanationEn: `Reverted: ${prev.descriptionEn}`,
          explanationUr: `واپس کر دیا گیا: ${prev.descriptionUr}`,
          draftUpdates: prev.draft,
          isUndoRevert: true,
          requiresConfirmation: false,
        };
      }
      return {
        recognizedText: trimmed,
        intentType: 'UNDO',
        detectedLanguage,
        explanationEn: 'Nothing to undo.',
        explanationUr: 'واپس کرنے کے لیے کچھ نہیں ہے۔',
        requiresConfirmation: false,
      };
    }

    // 2. Strict Out-of-Bounds Rejection (VOICE-008, BP §77.3)
    const unsupportedKeywords = [
      'transfer',
      'bank',
      'money',
      'paisa bhejo',
      'password',
      'pin',
      'delete',
      'account',
      'phone number',
      'change my phone',
      'private personal',
      'personal phone',
      'sms',
      'food',
      'biryani',
      'pizza',
      'dinner',
      'hack',
      'loan',
      'qarz',
    ];

    for (const kw of unsupportedKeywords) {
      if (lower.includes(kw)) {
        return {
          recognizedText: trimmed,
          intentType: 'UNSUPPORTED',
          detectedLanguage,
          explanationEn:
            'This action is not supported. I can only help you with household repairs and service bookings.',
          explanationUr:
            'یہ عمل تعاون یافتہ نہیں ہے۔ میں صرف گھریلو مرمت اور سروس بکنگ میں مدد کر سکتا ہوں۔',
          requiresConfirmation: false,
        };
      }
    }

    // 3. Consequential Actions (VOICE-007: cancel, pay, accept quote, complaint, book)
    // Mandatory confirmation step; nothing is sent without user confirm
    if (
      (lower.includes('cancel') || lower.includes('mansookh') || trimmed.includes('منسوخ')) &&
      !lower.includes('policy') &&
      !lower.includes('explain') &&
      !lower.includes('what is')
    ) {
      const prompt: ConsequentialConfirmationPrompt = {
        actionType: 'CANCEL_BOOKING',
        titleKey: 'customer.c38.confirmTitle',
        messageKey: 'customer.c38.confirmCancel',
        params: { service: 'AC Repair', provider: 'Tariq AC' },
        targetScreen: 'C15',
      };
      return {
        recognizedText: trimmed,
        intentType: 'CANCEL_BOOKING',
        detectedLanguage,
        explanationEn: 'Please confirm cancelling this booking.',
        explanationUr: 'براہِ کرم بکنگ منسوخ کرنے کی تصدیق کریں۔',
        requiresConfirmation: true,
        confirmationPrompt: prompt,
      };
    }

    if (
      lower.includes('pay') ||
      lower.includes('adaigi') ||
      trimmed.includes('ادائیگی') ||
      trimmed.includes('پیسے ادا')
    ) {
      const prompt: ConsequentialConfirmationPrompt = {
        actionType: 'PAY_BOOKING',
        titleKey: 'customer.c38.confirmTitle',
        messageKey: 'customer.c38.confirmPayment',
        params: { amount: '3,000', service: 'AC Repair' },
        targetScreen: 'C14',
      };
      return {
        recognizedText: trimmed,
        intentType: 'PAY_BOOKING',
        detectedLanguage,
        explanationEn: 'Please confirm payment of Rs 3,000.',
        explanationUr: 'براہِ کرم 3,000 روپے کی ادائیگی کی تصدیق کریں۔',
        requiresConfirmation: true,
        confirmationPrompt: prompt,
      };
    }

    if (
      lower.includes('accept quote') ||
      lower.includes('accept offer') ||
      lower.includes('accept') ||
      lower.includes('qubool') ||
      trimmed.includes('قیمت قبول') ||
      trimmed.includes('پیشکش قبول')
    ) {
      const prompt: ConsequentialConfirmationPrompt = {
        actionType: 'ACCEPT_QUOTE',
        titleKey: 'customer.c38.confirmTitle',
        messageKey: 'customer.c38.confirmQuoteAccept',
        params: { provider: 'Tariq AC', amount: '2,500' },
        targetScreen: 'C13',
      };
      return {
        recognizedText: trimmed,
        intentType: 'ACCEPT_QUOTE',
        detectedLanguage,
        explanationEn: 'Please confirm accepting quote from Tariq AC.',
        explanationUr: 'براہِ کرم طارق اے سی کی پیشکش قبول کرنے کی تصدیق کریں۔',
        requiresConfirmation: true,
        confirmationPrompt: prompt,
      };
    }

    if (
      lower.includes('complaint') ||
      lower.includes('dispute') ||
      lower.includes('shikayat') ||
      trimmed.includes('شکایت')
    ) {
      const prompt: ConsequentialConfirmationPrompt = {
        actionType: 'SUBMIT_COMPLAINT',
        titleKey: 'customer.c38.confirmTitle',
        messageKey: 'customer.c38.confirmComplaint',
        params: { bookingNumber: 'BK-ACTIVE' },
        targetScreen: 'C06',
      };
      return {
        recognizedText: trimmed,
        intentType: 'SUBMIT_COMPLAINT',
        detectedLanguage,
        explanationEn: 'Please confirm submitting formal complaint.',
        explanationUr: 'براہِ کرم باضابطہ شکایت درج کروانے کی تصدیق کریں۔',
        requiresConfirmation: true,
        confirmationPrompt: prompt,
      };
    }

    if (
      lower.includes('book') ||
      lower.includes('send request') ||
      trimmed.includes('بکنگ') ||
      trimmed.includes('درخواست بھیجیں')
    ) {
      const provider = this.currentDraft?.providerId ? 'Tariq AC' : 'Tariq AC';
      const service = this.currentDraft?.serviceId || 'AC Repair';
      const prompt: ConsequentialConfirmationPrompt = {
        actionType: 'PLACE_BOOKING',
        titleKey: 'customer.c38.confirmTitle',
        messageKey: 'customer.c38.confirmBooking',
        params: { provider, service },
        targetScreen: 'C14',
      };
      return {
        recognizedText: trimmed,
        intentType: 'PLACE_BOOKING',
        detectedLanguage,
        explanationEn: `Please confirm booking request for ${service}.`,
        explanationUr: `براہِ کرم ${service} کی بکنگ کی تصدیق کریں۔`,
        requiresConfirmation: true,
        confirmationPrompt: prompt,
      };
    }

    // 3. Navigation Actions (BP §77.3)
    if (
      lower === 'home' ||
      lower === 'go home' ||
      lower.includes('home jao') ||
      trimmed === 'ہوم' ||
      trimmed.includes('ہوم پر جائیں')
    ) {
      return {
        recognizedText: trimmed,
        intentType: 'NAVIGATE',
        detectedLanguage,
        targetScreen: 'C06',
        explanationEn: 'Navigated to Home.',
        explanationUr: 'ہوم اسکرین پر آ گئے۔',
        requiresConfirmation: false,
      };
    }

    if (
      lower.includes('show quotes') ||
      lower.includes('view quotes') ||
      lower.includes('compare offers') ||
      trimmed.includes('قیمتیں دیکھیں') ||
      trimmed.includes('پیشکشیں')
    ) {
      return {
        recognizedText: trimmed,
        intentType: 'NAVIGATE',
        detectedLanguage,
        targetScreen: 'C36',
        explanationEn: 'Opened offer comparison.',
        explanationUr: 'پیشکشوں کا موازنہ کھول دیا گیا۔',
        requiresConfirmation: false,
      };
    }

    if (
      lower.includes('show matches') ||
      lower.includes('view matches') ||
      trimmed.includes('کاریگر دیکھیں')
    ) {
      return {
        recognizedText: trimmed,
        intentType: 'NAVIGATE',
        detectedLanguage,
        targetScreen: 'C35',
        explanationEn: 'Opened matched providers.',
        explanationUr: 'منتخب کاریگر کھول دیے گئے۔',
        requiresConfirmation: false,
      };
    }

    if (
      lower.startsWith('find') ||
      lower.startsWith('search') ||
      lower.startsWith('dhoondo') ||
      trimmed.startsWith('تلاش') ||
      trimmed.startsWith('ڈھونڈیں')
    ) {
      const query = trimmed.replace(/^(search|dhoondo|find|تلاش کریں|ڈھونڈیں)\s*/i, '');
      return {
        recognizedText: trimmed,
        intentType: 'SEARCH',
        detectedLanguage,
        searchQuery: query || trimmed,
        targetScreen: 'C08',
        explanationEn: `Searching for "${query || trimmed}".`,
        explanationUr: `"${query || trimmed}" تلاش کیا جا رہا ہے۔`,
        requiresConfirmation: false,
      };
    }

    // 4. Non-sensitive Preferences & Filter Controls (BP §77.2, §77.3)
    if (
      lower.includes('female') ||
      lower.includes('khatoon') ||
      lower.includes('aurat') ||
      trimmed.includes('خاتون')
    ) {
      return {
        recognizedText: trimmed,
        intentType: 'FILTER_PREFERENCE',
        detectedLanguage,
        filterPreference: 'FEMALE_PRO',
        targetScreen: currentScreen === 'C35' ? 'C35' : 'C08',
        explanationEn: 'Filtered for female professionals.',
        explanationUr: 'صرف خواتین کاریگروں کے لیے فلٹر لگا دیا گیا۔',
        requiresConfirmation: false,
      };
    }

    if (lower.includes('verified') || lower.includes('tasdeeq') || trimmed.includes('تصدیق شدہ')) {
      return {
        recognizedText: trimmed,
        intentType: 'FILTER_PREFERENCE',
        detectedLanguage,
        filterPreference: 'VERIFIED',
        targetScreen: currentScreen === 'C35' ? 'C35' : 'C08',
        explanationEn: 'Filtered for verified providers only.',
        explanationUr: 'صرف تصدیق شدہ کاریگروں کے لیے فلٹر لگا دیا گیا۔',
        requiresConfirmation: false,
      };
    }

    if (
      lower.includes('top rated') ||
      lower.includes('highest rated') ||
      lower.includes('achhi rating') ||
      trimmed.includes('اعلیٰ درجہ بندی')
    ) {
      return {
        recognizedText: trimmed,
        intentType: 'FILTER_PREFERENCE',
        detectedLanguage,
        filterPreference: 'TOP_RATED',
        targetScreen: currentScreen === 'C35' ? 'C35' : 'C08',
        explanationEn: 'Sorted by highest rated providers.',
        explanationUr: 'اعلیٰ درجہ بندی کے مطابق ترتیب دیا گیا۔',
        requiresConfirmation: false,
      };
    }

    if (lower.includes('nearest') || lower.includes('qareeb') || trimmed.includes('قریب ترین')) {
      return {
        recognizedText: trimmed,
        intentType: 'FILTER_PREFERENCE',
        detectedLanguage,
        filterPreference: 'NEAREST',
        targetScreen: currentScreen === 'C35' ? 'C35' : 'C08',
        explanationEn: 'Filtered for nearest providers.',
        explanationUr: 'قریب ترین کاریگروں کے لیے فلٹر لگا دیا گیا۔',
        requiresConfirmation: false,
      };
    }

    if (
      lower.includes('available after 7') ||
      lower.includes('shaam') ||
      lower.includes('evening') ||
      trimmed.includes('شام')
    ) {
      this.pushUndoSnapshot('when preference to Evening', 'وقت شام کا منتخب کیا گیا');
      return {
        recognizedText: trimmed,
        intentType: 'DRAFT_UPDATE',
        detectedLanguage,
        draftUpdates: {
          when: 'LATER',
          scheduledDate: '2026-10-26',
          scheduledTimeWindow: '19:00 - 21:00',
        },
        explanationEn: 'Set preferred arrival time to after 7:00 PM.',
        explanationUr: 'آمد کا وقت شام 7 بجے کے بعد طے کر دیا گیا۔',
        requiresConfirmation: false,
      };
    }

    // 5. Explanations (badges, inspection fee, cancellation; BP §77.3)
    if (
      lower.includes('explain') ||
      lower.includes('what is') ||
      lower.includes('what does') ||
      lower.includes('meaning') ||
      lower.includes('mean') ||
      lower.includes('samjhao') ||
      lower.includes('kya hai') ||
      trimmed.includes('سمجھائیں') ||
      trimmed.includes('کیا ہے')
    ) {
      if (
        lower.includes('inspection fee') ||
        lower.includes('visit fee') ||
        trimmed.includes('معائنہ فیس')
      ) {
        return {
          recognizedText: trimmed,
          intentType: 'EXPLAIN',
          detectedLanguage,
          explanationEn:
            'The standard inspection fee covers travel and diagnostics. If you proceed with the repair, it is deducted from your final bill.',
          explanationUr:
            'معائنہ فیس کاریگر کے آنے اور خرابی چیک کرنے کی ہے۔ اگر آپ کام کروائیں گے تو یہ فیس بل میں سے منہا ہو جائے گی۔',
          requiresConfirmation: false,
        };
      }
      if (lower.includes('cancellation') || trimmed.includes('منسوخی')) {
        return {
          recognizedText: trimmed,
          intentType: 'EXPLAIN',
          detectedLanguage,
          explanationEn:
            'Cancellation is completely free before the technician accepts or departs.',
          explanationUr: 'کاریگر کے قبول کرنے یا روانہ ہونے سے پہلے منسوخی بالکل مفت ہے۔',
          requiresConfirmation: false,
        };
      }
      return {
        recognizedText: trimmed,
        intentType: 'EXPLAIN',
        detectedLanguage,
        explanationEn:
          'NADRA and Verified badges mean the provider has passed CNIC identity and criminal background checks.',
        explanationUr:
          'تصدیق شدہ بیج کا مطلب ہے کہ کاریگر کا شناختی کارڈ اور تصدیق کا عمل مکمل ہے۔',
        requiresConfirmation: false,
      };
    }

    // 6. Support & Complaints (BP §77.3)
    if (
      lower.includes('support') ||
      lower.includes('help') ||
      lower.includes('madad') ||
      trimmed.includes('مدد') ||
      trimmed.includes('سپورٹ')
    ) {
      return {
        recognizedText: trimmed,
        intentType: 'SUPPORT',
        detectedLanguage,
        explanationEn: 'Opening Kaam Karo Customer Support.',
        explanationUr: 'کام کرو کسٹمر سپورٹ کھولی جا رہی ہے۔',
        requiresConfirmation: false,
      };
    }

    // 7. Location Suggest / Confirm (BP §77.3)
    if (
      lower.includes('gulberg') ||
      lower.includes('dha') ||
      lower.includes('model town') ||
      lower.includes('johar town') ||
      trimmed.includes('گلبرگ') ||
      trimmed.includes('ماڈل ٹاؤن')
    ) {
      const detectedLocation =
        lower.includes('gulberg') || trimmed.includes('گلبرگ')
          ? 'Gulberg III, Lahore'
          : 'Model Town, Lahore';
      this.pushUndoSnapshot('location updated', 'پتہ تبدیل کیا گیا');
      return {
        recognizedText: trimmed,
        intentType: 'LOCATION_SET',
        detectedLanguage,
        draftUpdates: {
          location: {
            address: detectedLocation,
            city: 'Lahore',
            area: detectedLocation,
            coordinates: { lat: 31.5204, lng: 74.3587 },
            isConfirmed: true,
          },
        },
        explanationEn: `Updated location to ${detectedLocation}.`,
        explanationUr: `لوکیشن ${detectedLocation} پر سیٹ کر دی گئی۔`,
        requiresConfirmation: false,
      };
    }

    // 8. Service Request Draft Updates / Intake (BP §77.2, §77.3)
    if (
      /\bac\b/i.test(lower) ||
      lower.includes('air conditioner') ||
      /\bcool\b/i.test(lower) ||
      lower.includes('thanda') ||
      lower.includes('chilled') ||
      trimmed.includes('اے سی') ||
      trimmed.includes('ٹھنڈا')
    ) {
      this.pushUndoSnapshot(
        'draft updated with AC service request',
        'اے سی سروس کی درخواست شامل کی گئی',
      );
      return {
        recognizedText: trimmed,
        intentType: 'DRAFT_UPDATE',
        detectedLanguage,
        draftUpdates: {
          serviceId: 'svc-ac-gen',
          description: trimmed,
        },
        targetScreen: 'C31',
        explanationEn: 'Added AC repair request to your draft.',
        explanationUr: 'آپ کی درخواست میں اے سی مرمت شامل کر دی گئی۔',
        requiresConfirmation: false,
      };
    }

    if (
      lower.includes('electrician') ||
      lower.includes('bijli') ||
      lower.includes('wiring') ||
      /\bfan\b/i.test(lower) ||
      lower.includes('switch') ||
      trimmed.includes('الیکٹریشن') ||
      trimmed.includes('بجلی')
    ) {
      this.pushUndoSnapshot(
        'draft updated with Electrician request',
        'الیکٹریشن کی درخواست شامل کی گئی',
      );
      return {
        recognizedText: trimmed,
        intentType: 'DRAFT_UPDATE',
        detectedLanguage,
        draftUpdates: {
          serviceId: 'svc-elec-repair',
          description: trimmed,
        },
        targetScreen: 'C31',
        explanationEn: 'Added Electrician request to your draft.',
        explanationUr: 'آپ کی درخواست میں الیکٹریشن سروس شامل کر دی گئی۔',
        requiresConfirmation: false,
      };
    }

    if (
      lower.includes('plumber') ||
      /\bpipe\b/i.test(lower) ||
      lower.includes('leak') ||
      /\bmotor\b/i.test(lower) ||
      lower.includes('tanki') ||
      trimmed.includes('پلمبر') ||
      trimmed.includes('پائپ')
    ) {
      this.pushUndoSnapshot('draft updated with Plumbing request', 'پلمبنگ کی درخواست شامل کی گئی');
      return {
        recognizedText: trimmed,
        intentType: 'DRAFT_UPDATE',
        detectedLanguage,
        draftUpdates: {
          serviceId: 'svc-plumb-leak',
          description: trimmed,
        },
        targetScreen: 'C31',
        explanationEn: 'Added Plumbing request to your draft.',
        explanationUr: 'آپ کی درخواست میں پلمبنگ سروس شامل کر دی گئی۔',
        requiresConfirmation: false,
      };
    }

    if (lower.includes('search') || lower.includes('dhoondo') || trimmed.includes('تلاش')) {
      const query = trimmed.replace(/^(search|dhoondo|find|تلاش کریں|ڈھونڈیں)\s*/i, '');
      return {
        recognizedText: trimmed,
        intentType: 'SEARCH',
        detectedLanguage,
        searchQuery: query || trimmed,
        targetScreen: 'C08',
        explanationEn: `Searching for "${query || trimmed}".`,
        explanationUr: `"${query || trimmed}" تلاش کیا جا رہا ہے۔`,
        requiresConfirmation: false,
      };
    }

    // Default general search fallback for valid household terms
    if (trimmed.length > 2) {
      return {
        recognizedText: trimmed,
        intentType: 'SEARCH',
        detectedLanguage,
        searchQuery: trimmed,
        targetScreen: 'C08',
        explanationEn: `Searching services for "${trimmed}".`,
        explanationUr: `"${trimmed}" کے لیے سروسز تلاش کی جا رہی ہیں۔`,
        requiresConfirmation: false,
      };
    }

    // Unrecognized / speech failed
    return {
      recognizedText: trimmed,
      intentType: 'UNSUPPORTED',
      detectedLanguage,
      explanationEn: 'I could not hear that clearly. Please try again or type below.',
      explanationUr: 'میں سن نہیں سکا۔ دوبارہ کوشش کریں یا نیچے لکھیں۔',
      requiresConfirmation: false,
    };
  }
}
